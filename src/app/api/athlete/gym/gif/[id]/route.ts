/**
 * GET /api/athlete/gym/gif/[id]
 *
 * Proxy público para GIFs de ejercicio de WorkoutX.
 *
 * Problema: WorkoutX exige el header X-WorkoutX-Key en cada request.
 * Los componentes <Image>/<img> no pueden inyectar headers custom, por lo que
 * el GIF nunca carga si se apunta directo al CDN de WorkoutX.
 *
 * Solución: este endpoint hace el fetch server-side con el header, y retorna
 * los bytes al cliente con Cache-Control agresivo (7 días).
 * Vercel Edge cachea la respuesta → WorkoutX solo recibe 1 hit por ejercicio/semana.
 *
 * Seguridad: endpoint público (no requiere JWT) pero valida que el ejercicio
 * exista en nuestra DB antes de hacer cualquier request externo.
 * Rate limit por IP: 200 req/min.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAsync } from '@/lib/rate_limit'

const SEVEN_DAYS = 60 * 60 * 24 * 7

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Rate limit por IP — 200 req/min
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = await rateLimitAsync(`gif-proxy:${ip}`, { limit: 200, windowMs: 60_000 })
  if (!allowed) return new NextResponse('Too Many Requests', { status: 429 })

  // Validar que el ejercicio existe y tiene GIF
  const exercise = await prisma.exercise.findUnique({
    where: { id },
    select: { gifStoredUrl: true, gifUrl: true },
  })

  if (!exercise) return new NextResponse('Not Found', { status: 404 })

  // Si ya tenemos el GIF en storage propio → redirigir directo (sin proxy)
  if (exercise.gifStoredUrl) {
    return NextResponse.redirect(exercise.gifStoredUrl, { status: 302 })
  }

  if (!exercise.gifUrl) return new NextResponse('Not Found', { status: 404 })

  const apiKey = process.env.WORKOUTX_API_KEY
  if (!apiKey) {
    console.error('[gif-proxy] WORKOUTX_API_KEY no configurada')
    return new NextResponse('Service Unavailable', { status: 503 })
  }

  // Fetch desde WorkoutX con la API key server-side
  let upstream: Response
  try {
    upstream = await fetch(exercise.gifUrl, {
      headers: { 'X-WorkoutX-Key': apiKey },
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    console.error('[gif-proxy] fetch error:', err)
    return new NextResponse('Bad Gateway', { status: 502 })
  }

  if (!upstream.ok) {
    // 401 = cuota agotada, 403/404 = no existe en CDN
    // Todos devuelven 404 para que el browser no reintente en loop
    const graceful = [401, 403, 404].includes(upstream.status)
    if (!graceful) console.error(`[gif-proxy] WorkoutX ${upstream.status} para ejercicio ${id}`)
    return new NextResponse('Not Found', { status: graceful ? 404 : 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/gif'
  const body = await upstream.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      // Cache 7 días en browser y en Vercel Edge CDN
      'Cache-Control': `public, max-age=${SEVEN_DAYS}, s-maxage=${SEVEN_DAYS}, stale-while-revalidate=86400`,
      'Vary': 'Accept-Encoding',
    },
  })
}
