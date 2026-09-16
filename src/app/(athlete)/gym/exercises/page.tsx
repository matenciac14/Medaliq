import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { BODY_PART_LABELS, translateBodyPart } from '@/lib/gym/labels'
import { resolveExerciseGifUrl } from '@/lib/gym/gif_url'
import AthleteExercisesGrid from './_components/AthleteExercisesGrid'

interface Props {
  searchParams: Promise<{ bodyPart?: string; q?: string; page?: string }>
}

const PAGE_SIZE = 48

export default async function AthleteExercisesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { bodyPart, q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const conditions: object[] = [{ coachId: null }] // solo librería global
  if (bodyPart) conditions.push({ bodyPart: { equals: bodyPart, mode: 'insensitive' as const } })
  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { nameEs: { contains: q, mode: 'insensitive' as const } },
      ],
    })
  }
  const where = { AND: conditions }

  const [exercises, total] = await Promise.all([
    prisma.exercise.findMany({
      where,
      orderBy: [
        { gifStoredUrl: { sort: 'asc', nulls: 'last' } },
        { popularityRank: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
      ],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        nameEs: true,
        bodyPart: true,
        target: true,
        equipment: true,
        gifUrl: true,
        gifStoredUrl: true,
      },
    }),
    prisma.exercise.count({ where }),
  ])

  const bodyPartKeys = Object.keys(BODY_PART_LABELS)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function paginationUrl(targetPage: number) {
    const p = new URLSearchParams()
    if (bodyPart) p.set('bodyPart', bodyPart)
    if (q) p.set('q', q)
    if (targetPage > 1) p.set('page', String(targetPage))
    return `/gym/exercises${p.toString() ? `?${p.toString()}` : ''}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <Link href="/gym" className="text-xs font-medium text-gray-400 hover:text-gray-600 mb-1 inline-block">
              ← Entreno
            </Link>
            <h1 className="text-2xl font-black" style={{ color: '#1e3a5f' }}>Biblioteca de ejercicios</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} ejercicios con instrucciones y demos</p>
          </div>
        </div>

        {/* Search */}
        <form method="GET" action="/gym/exercises" className="mb-4">
          {bodyPart && <input type="hidden" name="bodyPart" value={bodyPart} />}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Buscar ejercicio..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#ea580c' }}
            >
              Buscar
            </button>
          </div>
        </form>

        {/* Body part chips */}
        <div className="flex gap-2 flex-wrap mb-6">
          <Link
            href={paginationUrl(1).replace(`bodyPart=${bodyPart}&`, '').replace(`&bodyPart=${bodyPart}`, '').replace(`bodyPart=${bodyPart}`, '')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!bodyPart ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
            style={!bodyPart ? { backgroundColor: '#1e3a5f' } : undefined}
          >
            Todos
          </Link>
          {bodyPartKeys.map(bp => {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            params.set('bodyPart', bp)
            return (
              <Link
                key={bp}
                href={`/gym/exercises?${params.toString()}`}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${bodyPart === bp ? 'text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}
                style={bodyPart === bp ? { backgroundColor: '#1e3a5f' } : undefined}
              >
                {translateBodyPart(bp)}
              </Link>
            )
          })}
        </div>

        {/* Grid */}
        {exercises.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-semibold">Sin resultados</p>
            <p className="text-sm mt-1">Intenta con otros términos de búsqueda</p>
          </div>
        ) : (
          <AthleteExercisesGrid exercises={exercises.map(ex => ({ ...ex, gif: resolveExerciseGifUrl(ex.id, ex.gifStoredUrl, ex.gifUrl) }))} />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={paginationUrl(page - 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
              >
                ← Anterior
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Pág. {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={paginationUrl(page + 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-white transition-colors"
              >
                Siguiente →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
