'use client'

import { useState } from 'react'

interface FeatureState {
  plan: boolean
  checkin: boolean
  nutrition: boolean
  progress: boolean
}

interface AthleteFeatureTogglesProps {
  athleteId: string
  initialFeatures: FeatureState
}

const FEATURE_LABELS: { key: keyof FeatureState; label: string }[] = [
  { key: 'plan', label: 'Plan de entrenamiento' },
  { key: 'checkin', label: 'Check-in semanal' },
  { key: 'nutrition', label: 'Plan nutricional' },
  { key: 'progress', label: 'Gráficas de progreso' },
]

export default function AthleteFeatureToggles({ athleteId, initialFeatures }: AthleteFeatureTogglesProps) {
  const [features, setFeatures] = useState<FeatureState>(initialFeatures)
  const [saving, setSaving] = useState<Partial<Record<keyof FeatureState, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<keyof FeatureState, string>>>({})

  async function toggleFeature(key: keyof FeatureState) {
    const newValue = !features[key]
    setFeatures((prev) => ({ ...prev, [key]: newValue }))
    setSaving((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))

    try {
      const res = await fetch(`/api/coach/athlete/${athleteId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features: { [key]: newValue } }),
      })
      if (!res.ok) {
        // Revert on error
        setFeatures((prev) => ({ ...prev, [key]: !newValue }))
        setErrors((prev) => ({ ...prev, [key]: 'Error al guardar' }))
      }
    } catch {
      setFeatures((prev) => ({ ...prev, [key]: !newValue }))
      setErrors((prev) => ({ ...prev, [key]: 'Error de conexión' }))
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Acceso del atleta</h2>
      <div className="space-y-3">
        {FEATURE_LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-700">{label}</span>
            <div className="flex items-center gap-2">
              {errors[key] && (
                <span className="text-xs text-red-500">{errors[key]}</span>
              )}
              <button
                onClick={() => toggleFeature(key)}
                disabled={saving[key]}
                aria-pressed={features[key]}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                  features[key] ? 'bg-[#1e3a5f]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    features[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
