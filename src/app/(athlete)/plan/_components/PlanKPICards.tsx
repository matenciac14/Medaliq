'use client'

import { cn } from '@/lib/utils'

export default function KPICards({ completed, total, volumeLabel, adherencePct, isGym }: {
  completed: number; total: number; volumeLabel: string; adherencePct: number | null; isGym: boolean
}) {
  const belowTarget = adherencePct !== null && adherencePct < 80
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Completadas</p>
        <p className="text-xl font-black leading-none text-gray-900">{completed}/{total}</p>
        <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">sesiones</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Volumen</p>
        <p className="text-xl font-black leading-none text-gray-900">{volumeLabel}</p>
        <p className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">esta semana</p>
      </div>
      <div className={cn('bg-white rounded-xl shadow-sm p-3', belowTarget ? 'border-2 border-[#ea580c]/30' : 'border border-gray-100')}>
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 truncate">Adherencia</p>
        <p className="text-xl font-black leading-none text-[#ea580c]">
          {adherencePct !== null ? `${adherencePct}%` : '—'}
        </p>
        <p className={cn('text-[10px] mt-1 whitespace-nowrap', belowTarget ? 'text-red-500' : 'text-gray-400')}>
          {belowTarget ? '↓ meta 80%' : 'esta semana'}
        </p>
      </div>
    </div>
  )
}
