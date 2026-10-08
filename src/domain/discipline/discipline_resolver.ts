/**
 * Discipline Resolver — cached lookup from legacy strings to disciplineId.
 *
 * Caches slug→id mapping in memory (refreshed per process restart).
 * Used by write paths to populate disciplineId alongside legacy fields.
 */

import { prisma } from '@/lib/db/prisma'

/** Maps legacy enum/string values to discipline slugs */
const LEGACY_TO_SLUG: Record<string, string> = {
  // SessionDiscipline enum values
  STRENGTH: 'strength',
  RUNNING: 'running',
  CYCLING: 'cycling',
  SWIMMING: 'swimming',
  OTHER: 'other',
  // Exercise.discipline string values (legacy)
  GYM: 'strength',
  CALISTHENICS: 'strength',
  MOBILITY: 'other',
  YOGA: 'other',
}

let slugToIdCache: Map<string, string> | null = null

async function loadCache(): Promise<Map<string, string>> {
  if (slugToIdCache) return slugToIdCache
  const disciplines = await prisma.discipline.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
  })
  slugToIdCache = new Map(disciplines.map(d => [d.slug, d.id]))
  return slugToIdCache
}

/**
 * Resolves a legacy discipline string (e.g. 'STRENGTH', 'GYM', 'RUNNING')
 * to its corresponding disciplineId from the Discipline table.
 * Returns null if the discipline is unknown or not active.
 */
export async function resolveDisciplineId(legacyValue: string | null | undefined): Promise<string | null> {
  if (!legacyValue) return null
  const slug = LEGACY_TO_SLUG[legacyValue] ?? legacyValue.toLowerCase()
  const cache = await loadCache()
  return cache.get(slug) ?? null
}

/**
 * Resolves a discipline slug directly to its ID.
 */
export async function resolveBySlug(slug: string): Promise<string | null> {
  const cache = await loadCache()
  return cache.get(slug) ?? null
}

/** Clear cache — for testing only */
export function __clearCache(): void {
  slugToIdCache = null
}

/** Exported for testing */
export { LEGACY_TO_SLUG }
