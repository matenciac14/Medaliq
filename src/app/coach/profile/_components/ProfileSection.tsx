'use client'

import { useState } from 'react'
import Link from 'next/link'
import ProfileForm from './ProfileForm'
import ProgramForm from './ProgramForm'
import PostForm from './PostForm'

type CoachProfileData = {
  id: string
  slug: string
  bio: string | null
  headline: string | null
  specialties: string[]
  city: string | null
  country: string
  whatsapp: string | null
  instagram: string | null
  yearsExp: number | null
  certifications: string[]
  isPublic: boolean
}

type Program = {
  id: string
  name: string
  sport: string
  level: string
  durationWeeks: number | null
  priceMonth: number | null
  currency: string
  isActive: boolean
}

type Post = {
  id: string
  type: string
  title: string
  body: string
  tags: string[]
  isPublic: boolean
  createdAt: string
}

type Props = {
  initialProfile: CoachProfileData | null
  initialPrograms: Program[]
  initialPosts: Post[]
}

const POST_TYPE_LABELS: Record<string, string> = {
  TIP: '💡 Tip',
  ROUTINE_SHOWCASE: '🏋️ Rutina destacada',
  ACHIEVEMENT: '🏆 Logro de atleta',
  ANNOUNCEMENT: '📢 Anuncio',
}

const SPORT_LABELS: Record<string, string> = {
  RUNNING: 'Running',
  GYM: 'Entrenamiento',
  FUNCTIONAL: 'Funcional',
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Principiante',
  INTERMEDIATE: 'Intermedio',
  ADVANCED: 'Avanzado',
}

export default function ProfileSection({ initialProfile, initialPrograms, initialPosts }: Props) {
  const [programs, setPrograms] = useState<Program[]>(initialPrograms)
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [showProgramForm, setShowProgramForm] = useState(false)
  const [showPostForm, setShowPostForm] = useState(false)

  async function refreshPrograms() {
    const res = await fetch('/api/coach/programs')
    const data = await res.json()
    setPrograms(data.programs ?? [])
    setShowProgramForm(false)
  }

  async function refreshPosts() {
    const res = await fetch('/api/coach/posts')
    const data = await res.json()
    setPosts(data.posts ?? [])
    setShowPostForm(false)
  }

  return (
    <div className="space-y-8">
      {/* Suscripción */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Mi suscripción</p>
          <p className="text-xs text-gray-500 mt-0.5">Gestiona tu plan y límite de asesorados</p>
        </div>
        <Link
          href="/coach/settings/plan"
          className="px-4 py-2 text-sm font-semibold text-[#1e3a5f] border border-[#1e3a5f] rounded-xl hover:bg-[#1e3a5f] hover:text-white transition-colors"
        >
          Ver plan
        </Link>
      </section>

      {/* Perfil público */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Perfil público</h2>
        <ProfileForm initialProfile={initialProfile} />
      </section>

      {/* Mis programas */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Mis programas</h2>
          <button
            onClick={() => setShowProgramForm(v => !v)}
            className="text-sm font-medium text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {showProgramForm ? 'Cancelar' : '+ Agregar programa'}
          </button>
        </div>

        {showProgramForm && (
          <div className="mb-6 border-b border-gray-100 pb-6">
            <ProgramForm onCreated={refreshPrograms} />
          </div>
        )}

        {programs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Aún no tienes programas. Agrega uno para que los atletas puedan ver tu oferta.
          </p>
        ) : (
          <ul className="space-y-3">
            {programs.map(program => (
              <li
                key={program.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{program.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {SPORT_LABELS[program.sport] ?? program.sport} · {LEVEL_LABELS[program.level] ?? program.level}
                    {program.durationWeeks && ` · ${program.durationWeeks} semanas`}
                    {program.priceMonth && ` · $${program.priceMonth} ${program.currency}/mes`}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    program.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {program.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mis publicaciones */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Mis publicaciones</h2>
          <button
            onClick={() => setShowPostForm(v => !v)}
            className="text-sm font-medium text-white px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {showPostForm ? 'Cancelar' : '+ Nueva publicación'}
          </button>
        </div>

        {showPostForm && (
          <div className="mb-6 border-b border-gray-100 pb-6">
            <PostForm onCreated={refreshPosts} />
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            Aún no tienes publicaciones. Comparte tips, rutinas o logros de tus atletas.
          </p>
        ) : (
          <ul className="space-y-3">
            {posts.map(post => (
              <li key={post.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">
                        {POST_TYPE_LABELS[post.type] ?? post.type}
                      </span>
                      {!post.isPublic && (
                        <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                          Privado
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{post.body}</p>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {post.tags.map((tag, i) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
