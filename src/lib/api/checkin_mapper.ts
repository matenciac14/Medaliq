/**
 * checkin-mapper.ts — Fuente canónica del mapeo body → CheckInInput.
 *
 * Tres nombres para los mismos datos a lo largo del sistema:
 *
 *   body web          →  CheckInInput (dominio)   →  DB (Prisma)
 *   ─────────────────────────────────────────────────────────────
 *   hardestRpe        →  rpe                      →  hardestSessionRpe
 *   hrResting         →  heartRate                →  hrResting
 *   weightKg          →  weight                   →  weightKg
 *   motivationLevel   →  motivation               →  motivationLevel
 *   nutritionAdherencePct (0-100) → nutritionAdherence (1-10) → nutritionAdherencePct
 *
 *   body mobile (escala 1–10) → CheckInInput (escala 1–10)
 *   ──────────────────────────────────────────────────────
 *   muscleSoreness    →  rpe
 *   energyLevel       →  energyLevel
 *   stressLevel       →  stressLevel
 *
 * Al agregar un campo nuevo al check-in:
 *   1. Añadir al CheckInInput en domain/checkin/check_in.types.ts (nombre dominio)
 *   2. Añadir aquí en la función que corresponda (web y/o mobile)
 *   3. Añadir al check-in.repository.ts (nombre DB)
 */

import type { CheckInInput } from '@/domain/checkin/check_in.types'

// ── Web (escala 1–10 nativa) ──────────────────────────────────────────────────

export type WebCheckinBody = {
  hardestRpe?:          number   // → rpe (1–10)
  sleepHours?:          number   // → sleepHours
  sleepScore?:          number   // → sleepScore (0–10)
  energyLevel?:         number   // → energyLevel (1–10)
  stressLevel?:         number   // → stressLevel (0–10)
  weightKg?:            number   // → weight
  hrResting?:           number   // → heartRate
  painLevel?:           number   // → painLevel (0–10)
  nutritionAdherencePct?:number  // 0–100 → nutritionAdherence 1–10
  motivationLevel?:     number   // 0–10 → motivation
  notes?:               string
  painDescription?:     string
  waistCm?:             number
  armsCm?:              number
  hipsCm?:              number
  thighsCm?:            number
}

export function mapWebCheckinBody(body: WebCheckinBody): CheckInInput {
  return {
    rpe:                body.hardestRpe,
    sleepHours:         body.sleepHours,
    sleepScore:         body.sleepScore,
    energyLevel:        body.energyLevel,
    stressLevel:        body.stressLevel,
    weight:             body.weightKg,
    heartRate:          body.hrResting,
    painLevel:          body.painLevel,
    nutritionAdherence: body.nutritionAdherencePct !== undefined
                          ? Math.round(body.nutritionAdherencePct / 10)
                          : undefined,
    motivation:         body.motivationLevel,
    notes:              body.notes,
    painDescription:    body.painDescription,
    waistCm:            body.waistCm,
    armsCm:             body.armsCm,
    hipsCm:             body.hipsCm,
    thighsCm:           body.thighsCm,
  }
}

// ── Mobile (escala 1–10 nativa) ───────────────────────────────────────────────

export type MobileCheckinBody = {
  energyLevel:           number   // 1–10 → energyLevel 1–10
  muscleSoreness:        number   // 1–10 → rpe 1–10
  stressLevel?:          number   // 1–10 → stressLevel 1–10
  motivationLevel?:      number   // 0–10 (ya en escala dominio)
  sleepScore?:           number   // 0–10 (ya en escala dominio)
  painLevel?:            number   // 0–10 (ya en escala dominio)
  weightKg?:             number   // → weight
  hrResting?:            number   // → heartRate (bpm, no escala)
  sleepHours?:           number   // → sleepHours
  nutritionAdherencePct?:number   // 0–100 → nutritionAdherence 1–10
  notes?:                string
  waistCm?:              number
  armsCm?:               number
  hipsCm?:               number
  thighsCm?:             number
}

export function mapMobileCheckinBody(body: MobileCheckinBody): CheckInInput {
  return {
    rpe:                body.muscleSoreness,
    sleepHours:         body.sleepHours,
    sleepScore:         body.sleepScore,
    energyLevel:        body.energyLevel,
    stressLevel:        body.stressLevel,
    weight:             body.weightKg,
    heartRate:          body.hrResting,
    painLevel:          body.painLevel,
    motivation:         body.motivationLevel,
    nutritionAdherence: body.nutritionAdherencePct !== undefined
                          ? Math.round(body.nutritionAdherencePct / 10)
                          : undefined,
    notes:              body.notes,
    waistCm:            body.waistCm,
    armsCm:             body.armsCm,
    hipsCm:             body.hipsCm,
    thighsCm:           body.thighsCm,
  }
}
