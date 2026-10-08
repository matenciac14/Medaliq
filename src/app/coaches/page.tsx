import type { Metadata } from 'next'
import { prisma } from '@/lib/db/prisma'
import Link from 'next/link'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'

export const metadata: Metadata = {
  title: 'Entrenadores certificados | Medaliq',
  description: 'Encuentra tu entrenador ideal. Coaches certificados en running, fuerza y nutrición para LatAm.',
  openGraph: {
    title: 'Entrenadores certificados | Medaliq',
    description: 'Encuentra tu entrenador ideal. Coaches certificados en running, fuerza y nutrición para LatAm.',
    url: 'https://medaliq.com/coaches',
  },
  twitter: {
    title: 'Entrenadores certificados | Medaliq',
    description: 'Encuentra tu entrenador ideal. Coaches certificados en running, fuerza y nutrición para LatAm.',
  },
}

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
  // Count athletes via CoachAthlete join — keyed by coachId
  const profiles = await prisma.coachProfile.findMany({
    where: { id: { in: profileIds } },
    select: {
      id: true,
      coachId: true,
    },
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
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function sportLabel(s: string): string {
  const map: Record<string, string> = {
    RUNNING: 'Running',
    GYM: 'Entrenamiento',
    FUNCTIONAL: 'Funcional',
  }
  return map[s] ?? s
}

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>
}) {
  const params = await searchParams
  const activeSport = params.sport ?? 'Todos'

  const allCoaches = await getCoaches()
  const athleteCounts = await getAthleteCounts(allCoaches.map((c) => c.id))

  const filtered =
    activeSport === 'Todos'
      ? allCoaches
      : allCoaches.filter((c) =>
          c.specialties.includes(SPORT_MAP[activeSport] ?? activeSport)
        )

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><MedaliqLogo variant="light" size="md" /></Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="/#como-funciona" className="hover:text-[#1e3a5f] transition-colors">Cómo funciona</Link>
            <Link href="/#entrenadores" className="hover:text-[#1e3a5f] transition-colors">Para entrenadores</Link>
            <Link href="/coaches" className="text-[#1e3a5f] font-semibold">Coaches</Link>
            <Link href="/#precios" className="hover:text-[#1e3a5f] transition-colors">Precios</Link>
          </div>
          <Link href="/onboarding">
            <span className="bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
              Empieza gratis
            </span>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#0f2240] text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight mb-4">
            Encuentra tu coach ideal
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            Coaches especializados en running y gym.
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto">
          {SPORTS.map((s) => (
            <Link
              key={s}
              href={s === 'Todos' ? '/coaches' : `/coaches?sport=${s}`}
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
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Coach cards */}
          {filtered.map((coach) => {
            const price = minPrice(coach.programs)
            const athletes = athleteCounts[coach.id] ?? 0
            return (
              <div
                key={coach.id}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col"
              >
                <div className="flex items-center gap-4 mb-4">
                  {coach.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coach.avatarUrl}
                      alt={coach.coach.name ?? ''}
                      className="w-14 h-14 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {initials(coach.coach.name)}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-[#1e3a5f] text-base leading-tight">{coach.coach.name}</div>
                    {coach.headline && (
                      <div className="text-gray-500 text-sm leading-snug">{coach.headline}</div>
                    )}
                  </div>
                </div>

                {/* Specialties */}
                {coach.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {coach.specialties.map((s) => (
                      <span key={s} className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                        {sportLabel(s)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className="flex gap-4 text-xs text-gray-400 mb-4">
                  {coach.city && <span>{coach.city}</span>}
                  {coach.yearsExp && <span>{coach.yearsExp} años exp.</span>}
                  <span>{athletes} atletas</span>
                </div>

                <div className="mt-auto flex items-center justify-between">
                  {price !== null ? (
                    <span className="text-gray-500 text-sm">
                      Desde <span className="text-[#1e3a5f] font-bold text-base">${price}</span>/mes
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Precio a consultar</span>
                  )}
                  <Link href={`/p/${coach.slug}`}>
                    <span className="bg-[#ea580c] hover:bg-[#ea6c0a] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                      Ver perfil
                    </span>
                  </Link>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-gray-400">
              <p className="text-lg font-medium mb-2">No hay coaches en esta categoría aún.</p>
              <p className="text-sm">Pronto habrá coaches disponibles en esta categoría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
