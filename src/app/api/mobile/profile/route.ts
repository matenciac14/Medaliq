import { NextRequest, NextResponse } from 'next/server'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { rateLimitAsync } from '@/lib/rate_limit'
import { prisma } from '@/lib/db/prisma'
import { ok, unauthorized, serverError, badRequest } from '@/lib/api/responses'
import { estimateHRMax } from '@/domain/plan/formulas'
import { z } from 'zod'

function calcAge(dob: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

const profilePatchSchema = z.object({
  dateOfBirth:     z.string().optional(),
  weightKg:        z.number().min(10).max(500).optional(),
  weightGoalKg:    z.number().min(10).max(500).optional(),
  heightCm:        z.number().min(50).max(300).optional(),
  hrResting:       z.number().min(0).max(250).optional(),
  hrMax:           z.number().min(0).max(250).optional(),
  sleepHoursAvg:   z.number().min(0).max(24).optional(),
  gender:          z.enum(['male', 'female']).optional(),
  sport:           z.enum(['RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'TRIATHLON', 'FOOTBALL']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  injuries:        z.array(z.string().max(100)).max(20).optional(),
  conditions:      z.array(z.string().max(100)).max(20).optional(),
})

export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:profile-get`, { limit: 300, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  try {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId: mobile.id },
      select: {
        age: true, dateOfBirth: true,
        weightKg: true, weightGoalKg: true, heightCm: true,
        hrResting: true, hrMax: true,
        sleepHoursAvg: true,
        gender: true,
        sport: true, experienceLevel: true,
        injuries: true, conditions: true,
      },
    })
    return ok({ profile: profile ?? null })
  } catch {
    return serverError()
  }
}

export async function PATCH(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return unauthorized()
  const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:profile-patch`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const raw = await req.json()
  const parsed = profilePatchSchema.safeParse(raw)
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? 'Datos inválidos.')

  const body = parsed.data
  const data: Record<string, unknown> = {}

  if (body.dateOfBirth) {
    const dob = new Date(body.dateOfBirth)
    data.dateOfBirth = dob
    data.age = calcAge(dob)
    if (!body.hrMax) data.hrMax = estimateHRMax(data.age as number)
  }
  if (body.weightKg    !== undefined) data.weightKg    = body.weightKg
  if (body.weightGoalKg !== undefined) data.weightGoalKg = body.weightGoalKg
  if (body.heightCm    !== undefined) data.heightCm    = body.heightCm
  if (body.hrResting       !== undefined) data.hrResting       = body.hrResting
  if (body.hrMax           !== undefined) data.hrMax           = body.hrMax
  if (body.sleepHoursAvg   !== undefined) data.sleepHoursAvg   = body.sleepHoursAvg
  if (body.gender          !== undefined) data.gender          = body.gender
  if (body.sport           !== undefined) data.sport           = body.sport
  if (body.experienceLevel !== undefined) data.experienceLevel = body.experienceLevel
  if (body.injuries        !== undefined) data.injuries        = body.injuries
  if (body.conditions      !== undefined) data.conditions      = body.conditions

  if (Object.keys(data).length === 0) return badRequest('Nada que actualizar.')

  try {
    const profile = await prisma.healthProfile.upsert({
      where: { userId: mobile.id },
      update: data,
      create: { userId: mobile.id, age: 0, heightCm: 0, weightKg: 0, ...data },
      select: {
        age: true, dateOfBirth: true,
        weightKg: true, weightGoalKg: true, heightCm: true,
        hrResting: true, hrMax: true,
        sleepHoursAvg: true,
        gender: true,
        sport: true, experienceLevel: true,
        injuries: true, conditions: true,
      },
    })
    return ok({ profile })
  } catch {
    return serverError()
  }
}
