'use client'

import { useState } from 'react'

type Props = {
  onCreated: () => void
}

const SPORTS = [
  { value: 'RUNNING', label: 'Running' },
  { value: 'GYM', label: 'Entrenamiento / Fuerza' },
  { value: 'FUNCTIONAL', label: 'Funcional' },
]

const LEVELS = [
  { value: 'BEGINNER', label: 'Principiante' },
  { value: 'INTERMEDIATE', label: 'Intermedio' },
  { value: 'ADVANCED', label: 'Avanzado' },
]

export default function ProgramForm({ onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sport, setSport] = useState('RUNNING')
  const [level, setLevel] = useState('INTERMEDIATE')
  const [durationWeeks, setDurationWeeks] = useState('')
  const [priceMonth, setPriceMonth] = useState('')
  const [includeInput, setIncludeInput] = useState('')
  const [includes, setIncludes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function addInclude() {
    const trimmed = includeInput.trim()
    if (trimmed) {
      setIncludes(prev => [...prev, trimmed])
      setIncludeInput('')
    }
  }

  function removeInclude(index: number) {
    setIncludes(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coach/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          sport,
          level,
          durationWeeks: durationWeeks || null,
          priceMonth: priceMonth || null,
          includes,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al crear el programa.')
        return
      }

      // Reset form
      setName('')
      setDescription('')
      setSport('RUNNING')
      setLevel('INTERMEDIATE')
      setDurationWeeks('')
      setPriceMonth('')
      setIncludes([])
      onCreated()
    } catch {
      setError('Error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del programa <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ej: Plan Media Maratón — 18 semanas"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe qué incluye el programa y a quién está dirigido..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deporte <span className="text-red-500">*</span>
          </label>
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white"
          >
            {SPORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nivel <span className="text-red-500">*</span>
          </label>
          <select
            value={level}
            onChange={e => setLevel(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 bg-white"
          >
            {LEVELS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duración (semanas)
          </label>
          <input
            type="number"
            value={durationWeeks}
            onChange={e => setDurationWeeks(e.target.value)}
            min={1}
            max={52}
            placeholder="18"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio / mes (USD)
          </label>
          <input
            type="number"
            value={priceMonth}
            onChange={e => setPriceMonth(e.target.value)}
            min={0}
            step={0.01}
            placeholder="50"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
        </div>
      </div>

      {/* Includes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ¿Qué incluye?
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={includeInput}
            onChange={e => setIncludeInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInclude() } }}
            placeholder="Ej: Plan personalizado, Check-in semanal..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
          />
          <button
            type="button"
            onClick={addInclude}
            className="px-3 py-2 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            +
          </button>
        </div>
        {includes.length > 0 && (
          <ul className="space-y-1">
            {includes.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
                <span>✓ {item}</span>
                <button
                  type="button"
                  onClick={() => removeInclude(i)}
                  className="text-gray-400 hover:text-red-500 text-xs"
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
        style={{ backgroundColor: '#ea580c' }}
      >
        {loading ? 'Creando...' : 'Crear programa'}
      </button>
    </form>
  )
}
