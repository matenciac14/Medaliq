'use client'

import { useState } from 'react'

type AthleteUserType = 'B2C_FREE' | 'B2C_PRO' | 'B2B'

type FeatureConfig = {
  featurePlan:      boolean
  featureCheckin:   boolean
  featureNutrition: boolean
  featureProgress:  boolean
  featureLog:       boolean
  featureGym:       boolean
  updatedAt:        string
  updatedBy:        string | null
}

type Props = {
  initialConfigs: Record<AthleteUserType, FeatureConfig>
}

const USER_TYPE_LABELS: Record<AthleteUserType, { label: string; desc: string; color: string }> = {
  B2C_FREE: { label: 'B2C Free',  desc: 'Atleta autónomo sin pagar',          color: '#6b7280' },
  B2C_PRO:  { label: 'B2C Pro',   desc: 'Atleta autónomo con suscripción',    color: '#f97316' },
  B2B:      { label: 'B2B',       desc: 'Atleta de coach (incluido en plan)', color: '#1e3a5f' },
}

const FEATURES: { key: keyof FeatureConfig; label: string; desc: string }[] = [
  { key: 'featurePlan',      label: 'Plan',      desc: 'Plan de entrenamiento adaptativo' },
  { key: 'featureCheckin',   label: 'Check-in',  desc: 'Check-in semanal con ajustes automáticos' },
  { key: 'featureNutrition', label: 'Nutrición', desc: 'Registro y seguimiento nutricional' },
  { key: 'featureProgress',  label: 'Progreso',  desc: 'Métricas históricas de progreso' },
  { key: 'featureLog',       label: 'Log',       desc: 'Registro de sesiones de entrenamiento' },
  { key: 'featureGym',       label: 'Gym',       desc: 'Rutinas y registro de fuerza' },
]

const USER_TYPES: AthleteUserType[] = ['B2C_FREE', 'B2C_PRO', 'B2B']

export default function FeatureConfigClient({ initialConfigs }: Props) {
  const [configs, setConfigs] = useState(initialConfigs)
  const [saving, setSaving] = useState<string | null>(null) // 'B2C_FREE-featurePlan'
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleToggle(userType: AthleteUserType, feature: keyof FeatureConfig, value: boolean) {
    const key = `${userType}-${feature}`
    setSaving(key)
    setError(null)

    try {
      const res = await fetch('/api/admin/features', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType, feature, value }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Error al guardar')
      }

      setConfigs(prev => ({
        ...prev,
        [userType]: { ...prev[userType], [feature]: value },
      }))
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
        <strong>Nota:</strong> Cambiar la configuración aquí afecta únicamente las <em>activaciones futuras</em>.
        Los usuarios ya activados conservan sus features actuales hasta que el coach los pause y reactive.
      </div>

      {/* Grid responsivo — 1 col mobile, 3 col desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {USER_TYPES.map((userType) => {
          const meta = USER_TYPE_LABELS[userType]
          const config = configs[userType]
          return (
            <div key={userType} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{meta.desc}</p>
                {config?.updatedAt && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Actualizado {new Date(config.updatedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {/* Feature toggles */}
              <div className="divide-y divide-gray-50">
                {FEATURES.map(({ key, label, desc }) => {
                  const toggleKey = `${userType}-${key}`
                  const isOn = config?.[key] as boolean
                  const isSaving = saving === toggleKey
                  const isSaved = saved === toggleKey

                  return (
                    <div key={key} className="flex items-center justify-between px-5 py-3">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400 truncate">{desc}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isSaved && <span className="text-xs text-green-600">✓</span>}
                        <button
                          onClick={() => handleToggle(userType, key, !isOn)}
                          disabled={isSaving}
                          className="relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50"
                          style={{ backgroundColor: isOn ? '#1e3a5f' : '#d1d5db' }}
                          aria-label={`${isOn ? 'Desactivar' : 'Activar'} ${label} para ${meta.label}`}
                        >
                          <span
                            className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                            style={{ transform: isOn ? 'translateX(20px)' : 'translateX(0)' }}
                          />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
