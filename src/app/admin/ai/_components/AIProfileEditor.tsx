'use client'

import { useState } from 'react'
import type { AIProfile } from '@/lib/ai/profile'

const GOAL_LABELS: Record<string, string> = {
  RACE_HALF_MARATHON: 'Media maratón',
  RACE_10K: '10K',
  RACE_5K: '5K',
  BODY_RECOMPOSITION: 'Recomposición corporal',
  GENERAL_FITNESS: 'Fitness general',
}

export default function AIProfileEditor({ initialProfile }: { initialProfile: AIProfile }) {
  const [profile, setProfile] = useState<AIProfile>(initialProfile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function update(field: keyof AIProfile, value: string) {
    setProfile((p) => ({ ...p, [field]: value }))
    setSaved(false)
  }

  function updateGoalNote(goalType: string, value: string) {
    setProfile((p) => ({ ...p, goalNotes: { ...p.goalNotes, [goalType]: value } }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/ai-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">Perfil del Coach AI</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Define la filosofía y principios que la AI usa al generar planes y responder en chat. Se aplica a todos los usuarios.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: saved ? '#16a34a' : '#1e3a5f' }}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        <Field
          label="Filosofía de coaching"
          hint="Personalidad y enfoque general del coach AI"
          value={profile.coachingPhilosophy}
          onChange={(v) => update('coachingPhilosophy', v)}
          rows={3}
        />
        <Field
          label="Principios de periodización"
          hint="Reglas de volumen, carga, progresión y recuperación"
          value={profile.periodizationPrinciples}
          onChange={(v) => update('periodizationPrinciples', v)}
          rows={3}
        />
        <Field
          label="Protocolo de lesiones"
          hint="Cómo ajustar el plan ante lesiones o flags de dolor"
          value={profile.injuryProtocol}
          onChange={(v) => update('injuryProtocol', v)}
          rows={3}
        />
        <Field
          label="Lineamientos nutricionales"
          hint="Principios de TDEE, macros y ajustes por tipo de sesión"
          value={profile.nutritionGuidelines}
          onChange={(v) => update('nutritionGuidelines', v)}
          rows={3}
        />

        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-800 mb-1">Notas por objetivo</p>
          <p className="text-xs text-gray-400 mb-4">Instrucciones específicas para cada tipo de plan</p>
          <div className="space-y-4">
            {Object.entries(GOAL_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <textarea
                  rows={2}
                  value={profile.goalNotes[key] ?? ''}
                  onChange={(e) => updateGoalNote(key, e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label, hint, value, onChange, rows,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="px-6 py-4">
      <label className="block text-sm font-medium text-gray-800 mb-0.5">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <textarea
        rows={rows ?? 2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700"
      />
    </div>
  )
}
