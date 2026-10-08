/**
 * Backfill disciplineId en Exercise y SessionLog
 * basandose en los campos legacy (Exercise.discipline string, SessionLog.discipline enum).
 *
 * Idempotente — solo actualiza rows donde disciplineId IS NULL.
 * Uso: npx tsx scripts/backfill-discipline-ids.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

const DISCIPLINE_MAP: Record<string, string> = {
  // Exercise.discipline (String) → Discipline.slug
  GYM: 'strength',
  STRENGTH: 'strength',
  RUNNING: 'running',
  CYCLING: 'cycling',
  SWIMMING: 'swimming',
  CALISTHENICS: 'strength',
  MOBILITY: 'other',
  YOGA: 'other',
  OTHER: 'other',
}

async function main() {
  // 1. Load discipline IDs by slug
  const disciplines = await prisma.discipline.findMany()
  const slugToId = new Map(disciplines.map(d => [d.slug, d.id]))

  console.log(`📦 Disciplinas en DB: ${disciplines.map(d => `${d.slug}(${d.id.slice(0,8)})`).join(', ')}`)

  // 2. Backfill Exercise.disciplineId
  const exercises = await prisma.exercise.findMany({
    where: { disciplineId: null },
    select: { id: true, discipline: true },
  })

  let exUpdated = 0
  for (const ex of exercises) {
    const slug = DISCIPLINE_MAP[ex.discipline ?? 'GYM'] ?? 'other'
    const disciplineId = slugToId.get(slug)
    if (!disciplineId) continue

    await prisma.exercise.update({
      where: { id: ex.id },
      data: { disciplineId },
    })
    exUpdated++
  }
  console.log(`✅ Exercise: ${exUpdated}/${exercises.length} actualizados con disciplineId`)

  // 3. Backfill SessionLog.disciplineId
  const logs = await prisma.sessionLog.findMany({
    where: { disciplineId: null, discipline: { not: null } },
    select: { id: true, discipline: true },
  })

  let logUpdated = 0
  for (const log of logs) {
    const slug = DISCIPLINE_MAP[log.discipline ?? 'OTHER'] ?? 'other'
    const disciplineId = slugToId.get(slug)
    if (!disciplineId) continue

    await prisma.sessionLog.update({
      where: { id: log.id },
      data: { disciplineId },
    })
    logUpdated++
  }
  console.log(`✅ SessionLog: ${logUpdated}/${logs.length} actualizados con disciplineId`)

  console.log('\n🎉 Backfill completado.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
