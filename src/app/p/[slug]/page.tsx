// Public coach profile page — /p/[slug] (short URL for SEO, like twitter.com/username)
import type { Metadata } from 'next'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/auth'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JoinProgramButton } from '@/app/p/_components/JoinProgramButton'
import { JsonLd } from '@/components/seo/json_ld'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const profile = await prisma.coachProfile.findFirst({
    where: { slug, isPublic: true },
    select: { headline: true, bio: true, coach: { select: { name: true } } },
  })
  if (!profile) return {}

  const name = profile.coach.name ?? 'Coach'
  const title = `${name} — Coach deportivo | Medaliq`
  const description =
    profile.headline ??
    (profile.bio ? profile.bio.slice(0, 160) : `Entrena con ${name} en Medaliq.`)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://medaliq.com/p/${slug}`,
      type: 'profile',
    },
    twitter: { title, description },
  }
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

function levelLabel(l: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Principiante',
    INTERMEDIATE: 'Intermedio',
    ADVANCED: 'Avanzado',
  }
  return map[l] ?? l
}

function postTypeLabel(t: string): string {
  const map: Record<string, string> = {
    TIP: 'Tip',
    ROUTINE_SHOWCASE: 'Rutina',
    ACHIEVEMENT: 'Logro',
    ANNOUNCEMENT: 'Anuncio',
  }
  return map[t] ?? t
}

function postTypeColor(t: string): string {
  const map: Record<string, string> = {
    TIP: 'bg-blue-50 text-blue-700',
    ROUTINE_SHOWCASE: 'bg-purple-50 text-purple-700',
    ACHIEVEMENT: 'bg-green-50 text-green-700',
    ANNOUNCEMENT: 'bg-orange-50 text-orange-700',
  }
  return map[t] ?? 'bg-gray-50 text-gray-700'
}

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const profile = await prisma.coachProfile.findFirst({
    where: { slug, isPublic: true },
    include: {
      coach: { select: { name: true, phoneWa: true, showPhoneWa: true } },
      programs: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      posts: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  })

  if (!profile) notFound()

  const athleteCount = await prisma.coachAthlete.count({
    where: { coachId: profile.coachId },
  })

  const session = await auth()
  const isLoggedIn = !!session?.user

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.coach.name,
        description: profile.headline ?? profile.bio ?? undefined,
        url: `https://medaliq.com/p/${slug}`,
        image: profile.avatarUrl ?? undefined,
        jobTitle: 'Coach deportivo',
        worksFor: { '@type': 'Organization', name: 'Medaliq', url: 'https://medaliq.com' },
      }} />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/"><MedaliqLogo variant="light" size="md" /></Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/coaches" className="hover:text-[#1e3a5f] transition-colors">Coaches</Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="hover:text-[#1e3a5f]">Mi panel</Link>
            ) : (
              <Link href="/login" className="hover:text-[#1e3a5f]">Iniciar sesión</Link>
            )}
          </div>
          <Link href="/onboarding">
            <span className="bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors">
              Empieza gratis
            </span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt={profile.coach.name ?? ''}
              className="w-24 h-24 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white font-bold text-2xl shrink-0">
              {initials(profile.coach.name)}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[#1e3a5f] mb-1">{profile.coach.name}</h1>
            {profile.headline && (
              <p className="text-gray-500 text-base mb-3">{profile.headline}</p>
            )}
            <div className="flex flex-wrap gap-2 text-sm text-gray-400 mb-3">
              {profile.city && (
                <span>
                  {profile.city}
                  {profile.country ? `, ${profile.country}` : ''}
                </span>
              )}
              {profile.yearsExp && <span>· {profile.yearsExp} años de experiencia</span>}
            </div>
            {profile.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.specialties.map((s) => (
                  <span key={s} className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                    {sportLabel(s)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-2">Sobre el coach</h2>
            <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{athleteCount}</div>
            <div className="text-xs text-gray-400 mt-1">Atletas activos</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{profile.yearsExp ?? '—'}</div>
            <div className="text-xs text-gray-400 mt-1">Años de exp.</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-[#1e3a5f]">{profile.programs.length}</div>
            <div className="text-xs text-gray-400 mt-1">Programas</div>
          </div>
        </div>

        {/* Programs */}
        {profile.programs.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Programas disponibles</h2>
            <div className="flex flex-col gap-4">
              {profile.programs.map((program) => (
                <div
                  key={program.id}
                  className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-[#1e3a5f] text-base mb-1">{program.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-orange-50 text-orange-700 text-xs rounded-full px-2 py-0.5">
                          {sportLabel(program.sport)}
                        </span>
                        <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                          {levelLabel(program.level)}
                        </span>
                        {program.durationWeeks && (
                          <span className="bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
                            {program.durationWeeks} semanas
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {program.priceMonth ? (
                        <>
                          <div className="text-2xl font-extrabold text-[#1e3a5f]">
                            ${program.priceMonth}
                          </div>
                          <div className="text-xs text-gray-400">{program.currency}/mes</div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">Precio a consultar</div>
                      )}
                    </div>
                  </div>
                  {program.description && (
                    <p className="text-gray-500 text-sm mb-3">{program.description}</p>
                  )}
                  {program.includes.length > 0 && (
                    <ul className="space-y-1 mb-4">
                      {program.includes.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="text-[#ea580c]">✓</span> {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isLoggedIn ? (
                    <JoinProgramButton profileId={profile.id} programId={program.id} />
                  ) : (
                    <Link href={`/register?coach=${slug}`}>
                      <span className="inline-block bg-[#ea580c] hover:bg-[#ea6c0a] text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors">
                        Unirme a este programa
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Posts */}
        {profile.posts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-4">Publicaciones recientes</h2>
            <div className="flex flex-col gap-3">
              {profile.posts.map((post) => (
                <div key={post.id} className="border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 font-medium ${postTypeColor(post.type)}`}
                    >
                      {postTypeLabel(post.type)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(post.createdAt).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[#1e3a5f] text-sm mb-1">{post.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {post.body.length > 150 ? post.body.slice(0, 150) + '…' : post.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {((profile.coach.showPhoneWa && profile.coach.phoneWa) || profile.whatsapp || profile.instagram) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[#1e3a5f] mb-3">Contacto</h2>
            <div className="flex flex-col gap-3">
              {profile.coach.showPhoneWa && profile.coach.phoneWa && (
                <a
                  href={`https://wa.me/${profile.coach.phoneWa.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, te encontré en Medaliq y me interesa tu asesoría')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold py-3 px-5 rounded-xl transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.552 4.113 1.518 5.842L0 24l6.335-1.47A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.817 9.817 0 01-4.997-1.364l-.358-.213-3.758.871.909-3.652-.234-.375A9.817 9.817 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
                  </svg>
                  Escribir por WhatsApp
                </a>
              )}
              {(profile.whatsapp || profile.instagram) && (
                <div className="flex flex-wrap gap-3">
                  {profile.whatsapp && (
                    <a
                      href={`https://wa.me/${profile.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-green-100 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                  {profile.instagram && (
                    <a
                      href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-pink-50 text-pink-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-pink-100 transition-colors"
                    >
                      Instagram
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bottom bar — non-authenticated only */}
      {!isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600 hidden sm:block">
              Listo para entrenar con {profile.coach.name}?
            </p>
            <Link href={`/register?coach=${slug}`}>
              <span className="bg-[#ea580c] hover:bg-[#ea6c0a] text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
                Crea tu cuenta gratis
              </span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
