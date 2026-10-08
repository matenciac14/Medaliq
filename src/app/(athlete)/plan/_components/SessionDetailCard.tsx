'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { PlanWeekSession as PlanClientWeekSession } from '../_lib/plan.types'
import EditModal from './EditModal'
import LogModal from './LogModal'

const INTENSITY_BADGE: Record<string, { bg: string; label: string }> = {
  HIGH:     { bg: 'bg-orange-50 text-orange-600 border-orange-100', label: '🔥 ALTA intensidad' },
  MODERATE: { bg: 'bg-amber-50 text-amber-600 border-amber-100',    label: '💪 MODERADA'        },
  LOW:      { bg: 'bg-green-50 text-green-700 border-green-100',    label: '🌿 BAJA intensidad' },
  REST:     { bg: 'bg-gray-100 text-gray-500 border-gray-200',      label: '😴 Descanso'        },
}

const ZONE_COLORS: Record<string, string> = {
  Z1: '#22c55e', Z2: '#3b82f6', Z3: '#eab308', Z4: '#ea580c', Z5: '#ef4444',
}

// ── Helpers ───────────────────────────────────────────────────────────

function getIntensityKey(type: string, intensityField: string | null): string {
  if (intensityField) return intensityField
  if (['INTERVALOS', 'TIRADA_LARGA', 'SIMULACRO', 'TEST'].includes(type)) return 'HIGH'
  if (['TEMPO', 'FARTLEK', 'CICLA', 'NATACION', 'FUERZA', 'OTRO'].includes(type)) return 'MODERATE'
  if (type === 'RODAJE_Z2') return 'LOW'
  if (type === 'DESCANSO') return 'REST'
  return 'MODERATE'
}

function parseStructureBlock(line: string): { zone: string | null; color: string; durationMin: number | null; text: string } {
  const parts = line.split('|')
  if (parts.length === 3) {
    const zone = parts[0].trim().toUpperCase()
    const durationMin = parseInt(parts[1].trim(), 10) || null
    const text = parts[2].trim()
    return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin, text }
  }
  const match = line.match(/\b(Z[1-5])\b/i)
  if (!match) return { zone: null, color: '#d1d5db', durationMin: null, text: line }
  const zone = match[1].toUpperCase()
  return { zone, color: ZONE_COLORS[zone] ?? '#9ca3af', durationMin: null, text: line }
}

// ── Component ─────────────────────────────────────────────────────────

export default function SessionDetailCard({ session, isToday, isLogged, onLogged, onEdited }: {
  session: PlanClientWeekSession
  isToday: boolean
  isLogged: boolean
  onLogged: () => void
  onEdited: (updates: Partial<PlanClientWeekSession>) => void
}) {
  const router = useRouter()
  const [logDone, setLogDone] = useState(session.done || isLogged)
  const [showModal, setShowModal] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // Sync if parent's optimistic state arrives after mount
  useEffect(() => {
    if (!logDone && isLogged) setLogDone(true)
  }, [isLogged])

  if (session.type === 'DESCANSO') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center gap-4">
        <span className="text-4xl">😴</span>
        <div>
          <p className="text-lg font-bold text-gray-700">Día de descanso</p>
          <p className="text-xs text-gray-400 mt-0.5">Aprovecha para recuperar bien hoy</p>
        </div>
      </div>
    )
  }

  const intensityKey = getIntensityKey(session.type, session.intensity)
  const badge = INTENSITY_BADGE[intensityKey] ?? INTENSITY_BADGE.MODERATE
  const isGym = session.type === 'FUERZA'
  const accentColor = isToday
    ? 'bg-[#ea580c]'
    : logDone ? 'bg-green-400'
    : isGym ? 'bg-purple-500'
    : 'bg-[#1e3a5f]'
  const showZone = session.zoneTarget && session.zoneTarget !== '—' && session.zoneTarget !== '' && session.zoneTarget !== 'N/A'
  const structureLines = (session.structure || session.detailText)
    ? (session.structure ?? session.detailText!).split('\n').filter(Boolean)
    : []

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex">
        <div className={cn('w-1.5 shrink-0', accentColor)} />
        <div className="flex-1 p-6 space-y-4">

          {/* Title */}
          <div className="flex items-center gap-3">
            <span className="text-xl">{SESSION_ICONS[session.type] ?? '🏅'}</span>
            <h3 className="text-xl font-black text-gray-900 leading-tight">
              {session.label || SESSION_NAMES[session.type] || session.type}
            </h3>
            {isToday && (
              <span className="text-[10px] font-bold bg-[#ea580c] text-white px-2 py-0.5 rounded-full">
                HOY
              </span>
            )}
            {logDone && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600">
                <CheckCircle2 size={11} /> Completada
              </span>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full">
              {session.durationMin} min
            </span>
            {showZone && !isGym && (
              <span className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">
                Zona {session.zoneTarget}
              </span>
            )}
            <span className={cn('text-xs font-semibold px-3 py-1.5 rounded-full border', badge.bg)}>
              {badge.label}
            </span>
          </div>

          {/* Structure / Exercises */}
          {structureLines.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {isGym ? 'Ejercicios' : 'Estructura'}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {structureLines.map((line, idx) => {
                  const { zone, color, durationMin, text } = parseStructureBlock(line)
                  return (
                    <div key={idx} className="flex items-start gap-2.5">
                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold w-5 leading-none" style={{ color }}>
                          {zone ?? ''}
                        </span>
                      </div>
                      {durationMin != null && (
                        <span className="text-xs font-bold text-gray-800 shrink-0 w-12 pt-px">
                          {durationMin} min
                        </span>
                      )}
                      <p className="text-xs text-gray-600 leading-relaxed flex-1">{text}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Coach note */}
          {session.coachNote && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">💬 Nota de tu coach</p>
              <p className="text-xs text-blue-800 leading-relaxed">{session.coachNote}</p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
            {logDone ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2 size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-700">Completada</span>
                </div>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Editar sesión ✏️
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#ea580c] hover:opacity-90 text-white text-sm font-bold px-4 py-3 rounded-xl transition-opacity whitespace-nowrap"
                >
                  Registrar sesión →
                </button>
                <button
                  onClick={() => setShowEdit(true)}
                  className="px-4 py-3 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
                >
                  Editar sesión ✏️
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {showModal && (
      <LogModal
        session={session}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          setShowModal(false)
          setLogDone(true)
          onLogged()
          router.refresh()
        }}
      />
    )}
    {showEdit && (
      <EditModal
        session={session}
        onClose={() => setShowEdit(false)}
        onSaved={(updates) => {
          setShowEdit(false)
          onEdited(updates)
          router.refresh()
        }}
      />
    )}
    </>
  )
}
