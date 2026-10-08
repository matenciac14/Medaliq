import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { z } from 'zod'
import { nameSchema, emailSchema } from '@/lib/validation'
import { getCoachLimits, type CoachTier } from '@/domain/subscription/tier_features'
import type { PrismaClient } from '../../generated/prisma/client'

// ── Schema ───────────────────────────────────────────────────────────────────

export const createAthleteSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  sport: z.string().max(50).nullable().optional(),
  goal: z.string().max(100).nullable().optional(),
  heightCm:        z.number().min(50).max(280).optional(),
  weightKg:        z.number().min(20).max(400).optional(),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender:          z.enum(['male', 'female']).optional(),
  experienceLevel: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
})

export type CreateAthleteInput = z.infer<typeof createAthleteSchema>

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateTempPassword(length = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function generateResetLink(athleteId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)
  const token = await new SignJWT({ sub: athleteId, purpose: 'set-password' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://medaliq.com'}/set-password?token=${token}`
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function createAthleteUseCase(
  input: CreateAthleteInput,
  coachId: string,
  profileComplete: boolean,
  db: PrismaClient,
): Promise<{ athleteId: string; athleteName: string; email: string; resetLink: string }> {
  const { name, email, sport = null, goal = null, heightCm, weightKg, dateOfBirth, gender, experienceLevel } = input

  // Block if coach identity is incomplete
  if (!profileComplete) {
    const coachUser = await db.user.findUnique({
      where: { id: coachId },
      select: { identification: true, phoneWa: true },
    })
    if (!coachUser?.identification || !coachUser?.phoneWa) {
      throw { status: 403, message: 'Completa tu cédula y número de WhatsApp en tu perfil antes de invitar asesorados.', code: 'PROFILE_INCOMPLETE' }
    }
  }

  // Enforce coach tier athlete limit
  const [activeCount, coachSub] = await Promise.all([
    db.coachAthlete.count({ where: { coachId, status: 'ACTIVE' } }),
    db.userSubscription.findUnique({
      where: { userId: coachId },
      select: { coachTier: true },
    }),
  ])
  const coachTier = (coachSub?.coachTier ?? 'STARTER') as CoachTier
  const { maxAthletes } = getCoachLimits(coachTier)
  if (activeCount >= maxAthletes) {
    throw {
      status: 402,
      message: `Alcanzaste el límite de tu plan (${maxAthletes} asesorados). Actualiza a un plan superior para agregar más.`,
      code: 'COACH_LIMIT_REACHED',
      limit: maxAthletes,
      current: activeCount,
    }
  }

  // Check email not already registered
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw { status: 409, message: 'Ya existe una cuenta con ese correo.' }
  }

  const tempPassword = generateTempPassword()
  const hashedPassword = await bcrypt.hash(tempPassword, 12)

  // Create athlete + link atomically
  const athlete = await db.$transaction(async (tx) => {
    const newAthlete = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'ATHLETE',
        featurePlan:      false,
        featureCheckin:   false,
        featureNutrition: false,
        featureProgress:  false,
        featureLog:       false,
        featureCoach:     false,
        featureGym:       false,
        onboardingCompleted: false,
      },
    })
    await tx.coachAthlete.create({
      data: { coachId, athleteId: newAthlete.id },
    })

    // Pre-fill HealthProfile if coach provided physical data
    if (heightCm && weightKg) {
      const dob = dateOfBirth ? new Date(dateOfBirth) : null
      const age = dob
        ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0
      await tx.healthProfile.create({
        data: {
          userId:          newAthlete.id,
          age,
          heightCm,
          weightKg,
          gender:          gender ?? null,
          dateOfBirth:     dob,
          experienceLevel: experienceLevel ?? null,
          sport:           sport ?? null,
          sportGoal:       goal ?? null,
        },
      })
    }

    return newAthlete
  })

  const resetLink = await generateResetLink(athlete.id)

  return {
    athleteId: athlete.id,
    athleteName: athlete.name!,
    email: athlete.email!,
    resetLink,
  }
}
