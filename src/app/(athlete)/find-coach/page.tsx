import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'

async function getCoaches() {
  return prisma.coachProfile.findMany({
    where: { isPublic: true },
    include: {
      coach: { select: { name: true } },
      programs: { where: { isActive: true }, select: { priceMonth: true, sport: true } },
    },
  })
}

async function getAthleteCounts(profileIds: string[]) {
  const profiles = await prisma.coachProfile.findMany({
    where: { id: { in: profileIds } },
    select: { id: true, coachId: true },
  })
  const coachIds = profiles.map((p) => p.coachId)
  const counts = await prisma.coachAthlete.groupBy({
    by: ['coachId'],
    where: { coachId: { in: coachIds } },
    _count: { _all: true },
  })
  const countMap: Record<string, number> = {}
  for (const c of counts) countMap[c.coachId] = c._count._all
  const result: Record<string, number> = {}
  for (const p of profiles) result[p.id] = countMap[p.coachId] ?? 0
  return result
}

const SPORTS = ['Todos', 'Running', 'Entrenamiento', 'Funcional'] as const
const SPORT_MAP: Record<string, string> = {
  Running: 'RUNNING',
  Entrenamiento: 'GYM',
  Funcional: 'FUNCTIONAL',
}

function minPrice(programs: { priceMonth: number | null }[]): number | null {
  const prices = programs.map((p) => p.priceMonth).filter((p): p is number => p !== null)
  return prices.length ? Math.min(...prices) : null
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function sportLabel(s: string): string {
  const map: Record<string, string> = { RUNNING: 'Running', GYM: 'Entrenamiento', FUNCTIONAL: 'Funcional' }
  return map[s] ?? s
}

export default async function FindCoachPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const activeSport = params.sport ?? 'Todos'

  const allCoaches = await getCoaches()
  const athleteCounts = await getAthleteCounts(allCoaches.map((c) => c.id))

  const filtered =
    activeSport === 'Todos'
      ? allCoaches
      : allCoaches.filter((c) => c.specialties.includes(SPORT_MAP[activeSport] ?? activeSport))

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0f1e30]">Buscar entrenador</h1>
        <p className="text-sm text-gray-400 mt-0.5">Coaches especializados en running y gym para LatAm</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SPORTS.map((s) => (
          <Link
            key={s}
            href={s === 'Todos' ? '/find-coach' : `/find-coach?sport=${s}`}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSport === s
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((coach) => {
          const price = minPrice(coach.programs)
          const athletes = athleteCounts[coach.id] ?? 0
          return (
            <div
              key={coach.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                {coach.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coach.avatarUrl}
                    alt={coach.coach.name ?? ''}
                    className="w-12 h-12 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-base shrink-0">
                    {initials(coach.coach.name)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[#1e3a5f] text-sm leading-tight">{coach.coach.name}</div>
                  {coach.headline && (
                    <div className="text-gray-500 text-xs leading-snug">{coach.headline}</div>
                  )}
                </div>
              </div>

              {coach.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {coach.specialties.map((s) => (
                    <span key={s} className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                      {sportLabel(s)}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-3 text-xs text-gray-400 mb-4">
                {coach.city && <span>{coach.city}</span>}
                {coach.yearsExp && <span>{coach.yearsExp} años exp.</span>}
                <span>{athletes} atletas</span>
              </div>

              <div className="mt-auto flex items-center justify-between">
                {price !== null ? (
                  <span className="text-gray-500 text-sm">
                    Desde <span className="text-[#1e3a5f] font-bold">${price}</span>/mes
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">Precio a consultar</span>
                )}
                <Link href={`/p/${coach.slug}`}>
                  <span className="bg-[#ea580c] hover:bg-[#ea6c0a] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors">
                    Ver perfil
                  </span>
                </Link>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400">
            <p className="text-base font-medium mb-1">No hay coaches en esta categoría aún.</p>
            <p className="text-sm">Pronto habrá coaches disponibles aquí.</p>
          </div>
        )}
      </div>
    </div>
  )
}
