/**
 * Infrastructure — Prisma implementation of IExerciseRepository.
 */
import type { IExerciseRepository } from '@/domain/exercise/ports/exercise.repository'
import type { Exercise, ExerciseFilters, UpsertExerciseData } from '@/domain/exercise/exercise.types'
import { prisma } from '@/lib/db/prisma'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'
import { resolveDisciplineId } from '@/domain/discipline/discipline_resolver'

const PAGE_SIZE_DEFAULT = 20
const PAGE_SIZE_MAX = 100

export class PrismaExerciseRepository implements IExerciseRepository {
  async findAll(filters: ExerciseFilters = {}): Promise<{ exercises: Exercise[]; total: number }> {
    const { bodyPart, target, equipment, q, page = 1, limit = PAGE_SIZE_DEFAULT, coachId } = filters
    const take = Math.min(limit, PAGE_SIZE_MAX)
    const skip = (page - 1) * take

    // AND[] evita colisión de múltiples OR en el mismo objeto de Prisma
    const conditions: object[] = [
      coachId ? { OR: [{ coachId }, { coachId: null }] } : { coachId: null },
    ]
    if (bodyPart) conditions.push({ bodyPart: { equals: bodyPart, mode: 'insensitive' as const } })
    if (target) conditions.push({ target: { equals: target, mode: 'insensitive' as const } })
    if (equipment) conditions.push({ equipment: { equals: equipment, mode: 'insensitive' as const } })
    if (q) {
      conditions.push({
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { nameEs: { contains: q, mode: 'insensitive' as const } },
        ],
      })
    }
    const where = { AND: conditions }

    const [rows, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        orderBy: [{ popularityRank: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      prisma.exercise.count({ where }),
    ])

    return {
      exercises: rows.map((r) => this.toEntity(r)),
      total,
    }
  }

  async findById(id: string): Promise<Exercise | null> {
    const row = await prisma.exercise.findUnique({ where: { id } })
    return row ? this.toEntity(row) : null
  }

  async findSimilar(id: string, limit = 6): Promise<Exercise[]> {
    const source = await prisma.exercise.findUnique({
      where: { id },
      select: { bodyPart: true, target: true },
    })
    if (!source) return []

    const rows = await prisma.exercise.findMany({
      where: {
        id: { not: id },
        bodyPart: source.bodyPart,
        target: source.target,
      },
      orderBy: [{ popularityRank: 'asc' }, { name: 'asc' }],
      take: limit,
    })

    return rows.map((r) => this.toEntity(r))
  }

  async upsertMany(exercises: UpsertExerciseData[]): Promise<{ synced: number }> {
    const BATCH_SIZE = 50
    let synced = 0
    const strengthDisciplineId = await resolveDisciplineId('STRENGTH')

    for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
      const batch = exercises.slice(i, i + BATCH_SIZE)
      await prisma.$transaction(
        async (tx) => {
          for (const ex of batch) {
            const data = {
              name: ex.name,
              nameEs: ex.nameEs ?? null,
              bodyPart: ex.bodyPart,
              target: ex.target,
              equipment: ex.equipment,
              difficulty: ex.difficulty ?? null,
              mechanic: ex.mechanic ?? null,
              force: ex.force ?? null,
              caloriesPerMinute: ex.caloriesPerMinute ?? null,
              met: ex.met ?? null,
              popularityRank: ex.popularityRank ?? null,
              isUnilateral: ex.isUnilateral,
              recommendedSets: ex.recommendedSets ?? null,
              recommendedReps: ex.recommendedReps ?? null,
              description: ex.description ?? null,
              secondaryMuscles: ex.secondaryMuscles,
              instructions: ex.instructions,
              instructionsEs: ex.instructionsEs ?? [],
              gifUrl: ex.gifUrl ?? null,
              gifStoredUrl: ex.gifStoredUrl ?? null,
              source: ex.source,
              syncedAt: ex.syncedAt,
              disciplineId: strengthDisciplineId,
            }
            await tx.exercise.upsert({ where: { id: ex.id }, create: { id: ex.id, ...data }, update: data })
          }
        },
        { timeout: 30_000 },
      )
      synced += batch.length
    }

    return { synced }
  }

  private toEntity(row: {
    id: string
    name: string
    nameEs: string | null
    bodyPart: string
    target: string
    equipment: string
    difficulty: string | null
    mechanic: string | null
    force: string | null
    caloriesPerMinute: number | null
    met: number | null
    popularityRank: number | null
    isUnilateral: boolean
    recommendedSets: string | null
    recommendedReps: string | null
    description: string | null
    secondaryMuscles: string[]
    instructions: string[]
    instructionsEs: string[]
    gifUrl: string | null
    gifStoredUrl: string | null
    source: string
    syncedAt: Date | null
  }): Exercise {
    return {
      id: row.id,
      name: row.name,
      nameEs: row.nameEs ?? undefined,
      bodyPart: row.bodyPart,
      target: row.target,
      equipment: row.equipment,
      difficulty: row.difficulty ?? undefined,
      mechanic: row.mechanic ?? undefined,
      force: row.force ?? undefined,
      caloriesPerMinute: row.caloriesPerMinute ?? undefined,
      met: row.met ?? undefined,
      popularityRank: row.popularityRank ?? undefined,
      isUnilateral: row.isUnilateral,
      recommendedSets: row.recommendedSets ?? undefined,
      recommendedReps: row.recommendedReps ?? undefined,
      description: row.description ?? undefined,
      secondaryMuscles: row.secondaryMuscles,
      instructions: row.instructions,
      instructionsEs: row.instructionsEs,
      gif: resolveExerciseGifUrl(row.id, row.gifStoredUrl, row.gifUrl) ?? '',
      source: row.source,
      syncedAt: row.syncedAt ?? undefined,
    }
  }
}
