import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json()

  // Cargar contexto del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { weeks: { take: 3, orderBy: { weekNumber: 'asc' } } },
      },
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })

  // Construir system prompt con contexto real del usuario
  const systemPrompt = buildSystemPrompt(user)

  // Stream de respuesta
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  // Retornar como ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function buildSystemPrompt(user: {
  name?: string | null
  profile?: {
    age?: number | null
    weightKg?: number | null
    weightGoalKg?: number | null
    heightCm?: number | null
    hrResting?: number | null
    hrMax?: number | null
    injuries?: string[]
    conditions?: string[]
  } | null
  trainingPlans?: Array<{
    name: string
    totalWeeks: number
  }>
  goals?: Array<{
    type: string
    raceDate?: Date | null
  }>
  checkIns?: Array<{
    weightKg?: number | null
    hrResting?: number | null
    sleepHours?: number | null
    energyLevel?: number | null
    hardestSessionRpe?: number | null
    dietAdherencePct?: number | null
    painFlag?: boolean
  }>
} | null): string {
  const profile = user?.profile
  const plan = user?.trainingPlans?.[0]
  const goal = user?.goals?.[0]
  const lastCheckIn = user?.checkIns?.[0]

  return `Eres el AI coach personal de ${user?.name ?? 'el atleta'} en Medaliq.

PERFIL DEL ATLETA:
- Edad: ${profile?.age ?? 'desconocida'} años
- Peso: ${profile?.weightKg ?? '?'} kg | Objetivo: ${profile?.weightGoalKg ?? '?'} kg
- Altura: ${profile?.heightCm ?? '?'} cm
- FC reposo: ${profile?.hrResting ?? '?'} bpm | FC máx: ${profile?.hrMax ?? '?'} bpm
- Lesiones: ${profile?.injuries?.join(', ') || 'ninguna'}
- Condiciones médicas: ${profile?.conditions?.join(', ') || 'ninguna'}

PLAN ACTIVO: ${plan?.name ?? 'Sin plan activo'}
${plan ? `- Semanas totales: ${plan.totalWeeks}` : ''}
${goal ? `- Objetivo: ${goal.type} | Fecha carrera: ${goal.raceDate ? new Date(goal.raceDate).toLocaleDateString('es') : 'sin fecha'}` : ''}

ÚLTIMO CHECK-IN:
${
  lastCheckIn
    ? `- Peso: ${lastCheckIn.weightKg ?? '?'} kg | FC reposo: ${lastCheckIn.hrResting ?? '?'} bpm
- Sueño: ${lastCheckIn.sleepHours ?? '?'} h | Energía: ${lastCheckIn.energyLevel ?? '?'}/5
- RPE sesión más dura: ${lastCheckIn.hardestSessionRpe ?? '?'}/10
- Adherencia dieta: ${lastCheckIn.dietAdherencePct ?? '?'}%
- Dolor/lesión: ${lastCheckIn.painFlag ? 'SÍ' : 'no'}`
    : 'Sin check-ins registrados aún'
}

REGLAS ÉTICAS OBLIGATORIAS:
- NO puedes diagnosticar enfermedades ni recetar medicamentos
- NO puedes dar consejos médicos — solo coaching deportivo
- Si hay banderas rojas médicas (dolor agudo, síntomas cardíacos, mareo severo), SIEMPRE escala: "esto lo debe evaluar un médico"
- Eres coach deportivo, no médico ni nutricionista clínico

ESTILO DE RESPUESTA:
- Conciso y directo — no más de 3 párrafos por respuesta
- Habla en español latinoamericano
- Usa datos reales del perfil cuando sea relevante
- Si no tienes info suficiente, pregunta antes de asumir`
}
