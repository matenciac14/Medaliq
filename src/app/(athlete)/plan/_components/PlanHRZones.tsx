'use client'

import { cn } from '@/lib/utils'

type HRZoneData = { z1: { min: number; max: number }; z2: { min: number; max: number }; z3: { min: number; max: number }; z4: { min: number; max: number }; z5: { min: number; max: number } }

export default function PlanHRZones({ hrZones }: { hrZones: HRZoneData | null | undefined }) {
  const defaultColors = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#dc2626']
  const zones = hrZones
    ? [
        { label: 'Z1', range: `${hrZones.z1.min}-${hrZones.z1.max}`, color: '#3b82f6' },
        { label: 'Z2', range: `${hrZones.z2.min}-${hrZones.z2.max}`, color: '#22c55e' },
        { label: 'Z3', range: `${hrZones.z3.min}-${hrZones.z3.max}`, color: '#f97316' },
        { label: 'Z4', range: `${hrZones.z4.min}-${hrZones.z4.max}`, color: '#ef4444' },
        { label: 'Z5', range: `${hrZones.z5.min}+`, color: '#dc2626' },
      ]
    : ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'].map((l, i) => ({ label: l, range: '— bpm', color: defaultColors[i] }))

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-sm font-bold text-gray-900 block mb-3">Zonas FC</span>
      {!hrZones && <p className="text-[10px] text-gray-300 -mt-1 mb-2">Completa tu perfil con FC máx para calcular tus zonas</p>}
      <div className="flex gap-2">
        {zones.map(z => (
          <div key={z.label} className="flex-1 text-center">
            <div className={cn('w-2.5 h-2.5 rounded-full mx-auto mb-1.5', !hrZones && 'opacity-30')} style={{ backgroundColor: z.color }} />
            <span className="text-xs font-bold text-gray-900 block">{z.label}</span>
            <span className={cn('text-[10px]', hrZones ? 'text-gray-400' : 'text-gray-300')}>{z.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
