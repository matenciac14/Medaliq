'use client'

import { useState, useEffect } from 'react'

type CoachProfile = {
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

type Props = {
  initialProfile: CoachProfile | null
}

type SpecialtyOption = { value: string; label: string; icon?: string }

const FIXED_SPECIALTIES: SpecialtyOption[] = [
  { value: 'NUTRITION', label: 'Nutricion', icon: '🥗' },
]

export default function ProfileForm({ initialProfile }: Props) {
  const [specialtyOptions, setSpecialtyOptions] = useState<SpecialtyOption[]>([
    { value: 'RUNNING', label: 'Running' },
    { value: 'GYM', label: 'Entrenamiento / Fuerza' },
    { value: 'FUNCTIONAL', label: 'Funcional' },
    { value: 'NUTRITION', label: 'Nutricion' },
  ])

  useEffect(() => {
    fetch('/api/disciplines')
      .then(r => r.json())
      .then((disciplines: { slug: string; nameEs: string; icon: string }[]) => {
        const disciplineOptions: SpecialtyOption[] = disciplines.map(d => ({
          value: d.slug.toUpperCase(),
          label: `${d.icon} ${d.nameEs}`,
        }))
        setSpecialtyOptions([...disciplineOptions, ...FIXED_SPECIALTIES])
      })
      .catch(() => { /* keep fallback options */ })
  }, [])
  const [slug, setSlug] = useState(initialProfile?.slug ?? '')
  const [headline, setHeadline] = useState(initialProfile?.headline ?? '')
  const [bio, setBio] = useState(initialProfile?.bio ?? '')
  const [city, setCity] = useState(initialProfile?.city ?? '')
  const [country, setCountry] = useState(initialProfile?.country ?? 'CO')
  const [yearsExp, setYearsExp] = useState(initialProfile?.yearsExp?.toString() ?? '')
  const [whatsapp, setWhatsapp] = useState(initialProfile?.whatsapp ?? '')
  const [instagram, setInstagram] = useState(initialProfile?.instagram ?? '')
  const [specialties, setSpecialties] = useState<string[]>(initialProfile?.specialties ?? [])
  const [certInput, setCertInput] = useState('')
  const [certifications, setCertifications] = useState<string[]>(initialProfile?.certifications ?? [])
  const [isPublic, setIsPublic] = useState(initialProfile?.isPublic ?? false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  function toggleSpecialty(value: string) {
    setSpecialties(prev =>
      prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]
    )
  }

  function addCertification() {
    const trimmed = certInput.trim()
    if (trimmed && !certifications.includes(trimmed)) {
      setCertifications(prev => [...prev, trimmed])
      setCertInput('')
    }
  }

  function removeCertification(cert: string) {
    setCertifications(prev => prev.filter(c => c !== cert))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/coach/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          headline,
          bio,
          city,
          country,
          yearsExp: yearsExp || null,
          whatsapp,
          instagram,
          specialties,
          certifications,
          isPublic,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar.')
        return
      }
      setSuccess(true)
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL de tu perfil
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 whitespace-nowrap">medaliq.com/p/</span>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="tu-nombre"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        {slug && (
          <p className="text-xs text-gray-400 mt-1">
            Vista previa: <span className="text-[#1e3a5f] font-medium">medaliq.com/p/{slug}</span>
          </p>
        )}
      </div>

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titular
        </label>
        <input
          type="text"
          value={headline}
          onChange={e => setHeadline(e.target.value)}
          placeholder="Ej: Especialista en media maratón y recomposición corporal"
          maxLength={120}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          placeholder="Cuéntale a los atletas quién eres y cómo los puedes ayudar..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
        />
      </div>

      {/* Especialidades — fuente canónica que controla panel + perfil público */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Especialidades
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Define qué herramientas ves en tu panel y qué disciplinas puedes asignar. Sin selección = acceso completo.
        </p>
        <div className="flex flex-wrap gap-2">
          {specialtyOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={specialties.includes(value)}
                onChange={() => toggleSpecialty(value)}
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ciudad y país */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
          <input
            type="text"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Bogotá"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
          <input
            type="text"
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="CO"
            maxLength={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
      </div>

      {/* Años de experiencia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Años de experiencia
        </label>
        <input
          type="number"
          value={yearsExp}
          onChange={e => setYearsExp(e.target.value)}
          min={0}
          max={50}
          placeholder="5"
          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>

      {/* WhatsApp e Instagram */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
          <input
            type="text"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="+57 300 000 0000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
          <input
            type="text"
            value={instagram}
            onChange={e => setInstagram(e.target.value)}
            placeholder="@tuusuario"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
      </div>

      {/* Certificaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Certificaciones
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={certInput}
            onChange={e => setCertInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCertification() } }}
            placeholder="Ej: NASM-CPT, RunCoach Level 2..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
          <button
            type="button"
            onClick={addCertification}
            className="px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            Agregar
          </button>
        </div>
        {certifications.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {certifications.map(cert => (
              <span
                key={cert}
                className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-3 py-1.5 rounded-full"
              >
                {cert}
                <button
                  type="button"
                  onClick={() => removeCertification(cert)}
                  className="text-gray-400 hover:text-gray-600 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Perfil público toggle */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-medium text-gray-700">Perfil público</p>
          <p className="text-xs text-gray-400">Los atletas podrán encontrarte en el directorio</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={e => setIsPublic(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ea580c]"></div>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          Perfil guardado correctamente.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#ea580c' }}
      >
        {loading ? 'Guardando...' : 'Guardar perfil'}
      </button>
    </form>
  )
}
