'use client'

import { useState } from 'react'
import { MedaliqLogo } from '@/components/brand/MedaliqLogo'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Pencil, Copy } from 'lucide-react'
import { getInitialWeekIdx } from '@/lib/core/week_number'

// ── Types ────────────────────────────────────────────────────────────────────

type GymExercisePreview = { name: string; sets: number; repsScheme: string }

type GymTemplateDay = {
  id: string
  label: string
  muscleGroups: string[]
  exercises: GymExercisePreview[]
}

type GymTemplate = {
  id: string
  name: string
  days: GymTemplateDay[]
}

type BuilderSession = {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  zoneTarget: string | null
  detailText: string | null
  sportLabel: string | null
  workoutDayId: string | null
  workoutDay: { id: string; label: string; exercises: GymExercisePreview[] } | null
}

type BuilderWeek = {
  id: string
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  volumeKm: number | null
  startDate: string
  endDate: string
  sessions: BuilderSession[]
}

type BuilderPlan = {
  id: string
  name: string
  totalWeeks: number
  startDate: string
  weeks: BuilderWeek[]
}

type ModalState = {
  weekId: string
  dayOfWeek: number
  session?: BuilderSession
  preselectedType?: string
}

type WeekEditState = {
  weekId: string
  phase: string
  focusDescription: string
  isRecoveryWeek: boolean
  volumeKm: number | null
}

type CopyModalState = {
  sessionId: string
  sessionLabel: string
}

type NutritionPlanData = {
  targetKcalHard: number
  targetKcalEasy: number
  targetKcalRest: number
  proteinG: number
  carbsHardG: number
  carbsEasyG: number
  fatG: number
}

type AssignedRoutineDay = {
  id: string
  dayOfWeek: number
  label: string
  muscleGroups: string[]
  exerciseCount: number
}

type AssignedRoutine = {
  id: string
  name: string
  daysPerWeek: number
  days: AssignedRoutineDay[]
}

type Props = {
  athleteId: string
  athleteName: string
  initialPlan: BuilderPlan | null
  gymTemplates: GymTemplate[]
  nutritionPlan: NutritionPlanData | null
  assignedRoutine: AssignedRoutine | null
  coachNutritionTemplates: { id: string; name: string }[]
  linkedNutritionTemplateId: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { type: 'RODAJE_Z2',    label: 'Rodaje Z2',    color: '#16a34a', sub: null },
  { type: 'FARTLEK',      label: 'Fartlek',      color: '#ea580c', sub: null },
  { type: 'TEMPO',        label: 'Tempo',        color: '#dc2626', sub: null },
  { type: 'TIRADA_LARGA', label: 'Tirada larga', color: '#3b82f6', sub: null },
  { type: 'INTERVALOS',   label: 'Intervalos',   color: '#ef4444', sub: null },
  { type: 'FUERZA',       label: 'Fuerza',       color: '#7c3aed', sub: 'Complementario' },
  { type: 'CICLA',        label: 'Ciclismo',     color: '#d97706', sub: null },
  { type: 'NATACION',     label: 'Natación',     color: '#0891b2', sub: null },
  { type: 'DESCANSO',     label: 'Descanso',     color: '#9ca3af', sub: null },
  { type: 'TEST',         label: 'Test',         color: '#6366f1', sub: null },
]

type Discipline = 'Todas' | 'Running' | 'Fuerza'

const DISCIPLINE_RUNNING = new Set(['RODAJE_Z2', 'FARTLEK', 'TEMPO', 'TIRADA_LARGA', 'INTERVALOS', 'TEST'])
const DISCIPLINE_FUERZA  = new Set(['FUERZA'])

const INTENSITY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  RODAJE_Z2:    { label: 'MOD',  color: '#ea580c', bg: '#ea580c1a' },
  TEMPO:        { label: 'MOD',  color: '#ea580c', bg: '#ea580c1a' },
  TIRADA_LARGA: { label: 'MOD',  color: '#ea580c', bg: '#ea580c1a' },
  FARTLEK:      { label: 'HIGH', color: '#dc2626', bg: '#dc26261a' },
  INTERVALOS:   { label: 'HIGH', color: '#dc2626', bg: '#dc26261a' },
  FUERZA:       { label: 'HIGH', color: '#dc2626', bg: '#dc26261a' },
  DESCANSO:     { label: 'REST', color: '#9ca3af', bg: '#9ca3af1a' },
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function getSessionConfig(type: string) {
  return SESSION_TYPES.find((s) => s.type === type) ?? { type, label: type, color: '#9ca3af' }
}

/** Calcula target nutricional del día según intensidad (mirror de daily-target.ts, client-side) */
function getDayNutrition(intensity: string, plan: NutritionPlanData) {
  switch (intensity) {
    case 'HIGH':
      return { kcal: plan.targetKcalHard, label: 'Duro', color: '#dc2626' }
    case 'MODERATE':
      return { kcal: plan.targetKcalEasy, label: 'Mod', color: '#ea580c' }
    case 'LOW':
      return { kcal: Math.round(plan.targetKcalEasy * 0.88), label: 'Suave', color: '#3b82f6' }
    default:
      return { kcal: plan.targetKcalRest, label: 'Rest', color: '#9ca3af' }
  }
}

/** Intensidad de una sesión para nutrición */
function sessionIntensity(type: string): string {
  const high = ['INTERVALOS', 'TEMPO', 'TIRADA_LARGA', 'FARTLEK', 'TEST']
  const mod = ['RODAJE_Z2', 'FUERZA', 'CICLA', 'NATACION']
  if (high.includes(type)) return 'HIGH'
  if (mod.includes(type)) return 'MODERATE'
  if (type === 'DESCANSO') return 'REST'
  return 'REST'
}

function dayDate(weekStartDate: string, dayOfWeek: number): Date {
  const d = new Date(weekStartDate)
  d.setDate(d.getDate() + dayOfWeek)
  return d
}

function formatWeekRange(startDate: string, endDate: string): string {
  const s = new Date(startDate)
  const e = new Date(endDate)
  return `${s.getDate()} al ${e.getDate()} ${MONTHS[e.getMonth()]}`
}

// ── Template metadata (client-only, no server imports) ────────────────────────

const TEMPLATE_META = [
  { id: 'RACE_5K',            label: '5K',            emoji: '🏃', weeks: 8,  sport: 'Running' },
  { id: 'RACE_10K',           label: '10K',           emoji: '🏅', weeks: 12, sport: 'Running' },
  { id: 'RACE_HALF_MARATHON', label: 'Media Maratón', emoji: '🏆', weeks: 18, sport: 'Running' },
  { id: 'BODY_RECOMPOSITION', label: 'Recomposición', emoji: '🔥', weeks: 12, sport: 'Fuerza + Cardio' },
  { id: 'STRENGTH_TRAINING',  label: 'Fuerza',        emoji: '🏋️', weeks: 12, sport: 'Fuerza' },
]

// ── Main component ───────────────────────────────────────────────────────────

// Values must match the Phase enum in schema.prisma
// COMPETICIÓN / RECUPERACIÓN are not yet valid Phase enum values — do not add them until the migration is run
const PHASES = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

const PHASE_LABELS: Record<string, string> = {
  BASE: 'BASE', DESARROLLO: 'DESARROLLO', ESPECIFICO: 'ESPECÍFICO', AFINAMIENTO: 'AFINAMIENTO',
}

const PHASE_COLORS: Record<string, string> = {
  BASE: '#1e3a5f', DESARROLLO: '#ea580c', ESPECIFICO: '#dc2626', AFINAMIENTO: '#7c3aed',
}

export default function PlanBuilderClient({ athleteId, athleteName, initialPlan, gymTemplates, nutritionPlan, assignedRoutine, coachNutritionTemplates, linkedNutritionTemplateId }: Props) {
  const [plan, setPlan] = useState<BuilderPlan | null>(initialPlan)

  // ── Estado para crear plan ────────────────────────────────────────────────
  type CreateMode = 'initial' | 'blank-form' | 'template-form'
  const [createMode, setCreateMode]         = useState<CreateMode>('initial')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newName, setNewName]               = useState(`Plan ${athleteName.split(' ')[0]}`)
  const [newWeeks, setNewWeeks]             = useState(12)
  const [newStart, setNewStart]             = useState(() => new Date().toISOString().split('T')[0])
  const [createError, setCreateError]       = useState<string | null>(null)
  const [createLoading, setCreateLoading]   = useState(false)

  function openTemplateForm(templateId: string) {
    const meta = TEMPLATE_META.find((t) => t.id === templateId)!
    setSelectedTemplateId(templateId)
    setNewName(`Plan ${meta.label} — ${athleteName.split(' ')[0]}`)
    setNewWeeks(meta.weeks)
    setCreateMode('template-form')
    setCreateError(null)
  }

  function openBlankForm() {
    setSelectedTemplateId(null)
    setNewName(`Plan ${athleteName.split(' ')[0]}`)
    setNewWeeks(12)
    setCreateMode('blank-form')
    setCreateError(null)
  }

  async function handleCreateCustomPlan() {
    setCreateError(null)
    setCreateLoading(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/plan/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, totalWeeks: newWeeks, startDate: newStart }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el plan')
      setPlan(data.plan)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }

  async function handleCreateFromTemplate() {
    if (!selectedTemplateId) return
    setCreateError(null)
    setCreateLoading(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/plan/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId, name: newName, startDate: newStart }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el plan')
      setPlan(data.plan)
    } catch (err: any) {
      setCreateError(err.message)
    } finally {
      setCreateLoading(false)
    }
  }
  const [weekIdx, setWeekIdx] = useState(() => getInitialWeekIdx(initialPlan))
  const [modal, setModal] = useState<ModalState | null>(null)
  const [weekEdit, setWeekEdit] = useState<WeekEditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [copyModal, setCopyModal] = useState<CopyModalState | null>(null)
  const [discipline, setDiscipline] = useState<Discipline>('Todas')
  const [linkedTemplate, setLinkedTemplate] = useState<string | null>(linkedNutritionTemplateId)
  const [linkingTemplate, setLinkingTemplate] = useState(false)

  async function handleCopySession(targetWeekId: string, dayOfWeek: number) {
    if (!copyModal || !plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/sessions/${copyModal.sessionId}/copy-to`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetWeekId, dayOfWeek }),
      })
      if (!res.ok) throw new Error('Error copiando sesión')
      const { session: newSession } = await res.json()
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              weeks: prev.weeks.map((w) =>
                w.id === targetWeekId
                  ? {
                      ...w,
                      sessions: [...w.sessions, { ...newSession, workoutDay: null }].sort(
                        (a, b) => a.dayOfWeek - b.dayOfWeek
                      ),
                    }
                  : w
              ),
            }
          : prev
      )
      setCopyModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const week = plan?.weeks[weekIdx] ?? null

  function openAddModal(weekId: string, dayOfWeek: number, preselectedType?: string) {
    setModal({ weekId, dayOfWeek, preselectedType })
  }

  function openEditModal(session: BuilderSession, weekId: string) {
    setModal({ weekId, dayOfWeek: session.dayOfWeek, session })
  }

  async function handleSaveSession(data: {
    type: string
    durationMin: number
    zoneTarget: string
    detailText: string
    sportLabel: string
    workoutDayId: string | null
  }) {
    if (!modal || !plan) return
    setSaving(true)
    // Resolve workoutDay preview for optimistic update
    const allDays = gymTemplates.flatMap(t => t.days)
    const resolvedDay = data.workoutDayId ? (allDays.find(d => d.id === data.workoutDayId) ?? null) : null
    try {
      if (modal.session) {
        const res = await fetch(`/api/coach/sessions/${modal.session.id}/edit`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error('Error actualizando sesión')
        const { session: updated } = await res.json()
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                weeks: prev.weeks.map((w) => ({
                  ...w,
                  sessions: w.sessions.map((s) =>
                    s.id === modal.session!.id
                      ? { ...s, ...updated, workoutDayId: data.workoutDayId, workoutDay: resolvedDay ? { id: resolvedDay.id, label: resolvedDay.label, exercises: resolvedDay.exercises } : null }
                      : s
                  ),
                })),
              }
            : prev
        )
      } else {
        const res = await fetch(`/api/coach/plan/${plan.id}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weekId: modal.weekId, dayOfWeek: modal.dayOfWeek, ...data }),
        })
        if (!res.ok) throw new Error('Error creando sesión')
        const { session: created } = await res.json()
        const createdWithGym = {
          ...created,
          workoutDayId: data.workoutDayId,
          workoutDay: resolvedDay ? { id: resolvedDay.id, label: resolvedDay.label, exercises: resolvedDay.exercises } : null,
        }
        setPlan((prev) =>
          prev
            ? {
                ...prev,
                weeks: prev.weeks.map((w) =>
                  w.id === modal.weekId
                    ? {
                        ...w,
                        sessions: [...w.sessions, createdWithGym].sort(
                          (a, b) => a.dayOfWeek - b.dayOfWeek
                        ),
                      }
                    : w
                ),
              }
            : prev
        )
      }
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!plan) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/sessions/${sessionId}/edit`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error eliminando sesión')
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              weeks: prev.weeks.map((w) => ({
                ...w,
                sessions: w.sessions.filter((s) => s.id !== sessionId),
              })),
            }
          : prev
      )
      setModal(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkTemplate(templateId: string | null) {
    setLinkingTemplate(true)
    try {
      const res = await fetch(`/api/coach/athletes/${athleteId}/plan/nutrition-template`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nutritionTemplateId: templateId }),
      })
      if (!res.ok) throw new Error('Error al vincular template')
      setLinkedTemplate(templateId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setLinkingTemplate(false)
    }
  }

  async function handleCopyPrevWeek() {
    if (!plan || !week || weekIdx === 0) return
    if (!confirm(`¿Copiar todas las sesiones de Semana ${week.weekNumber - 1} a Semana ${week.weekNumber}? Esto reemplazará las sesiones actuales.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/week/${week.id}/copy-prev`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error copiando semana')
      }
      const { sessions } = await res.json()
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              weeks: prev.weeks.map((w) =>
                w.id === week.id ? { ...w, sessions } : w
              ),
            }
          : prev
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWeekMeta(data: { phase: string; focusDescription: string; isRecoveryWeek: boolean; volumeKm: number | null }) {
    if (!plan || !weekEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/week/${weekEdit.weekId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error actualizando semana')
      const { week: updated } = await res.json()
      setPlan((prev) =>
        prev
          ? { ...prev, weeks: prev.weeks.map((w) => w.id === weekEdit.weekId ? { ...w, ...updated } : w) }
          : prev
      )
      setWeekEdit(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  // ── No plan — selector de templates o formulario ─────────────────────────

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
        <BuilderHeader athleteId={athleteId} athleteName={athleteName} />
        <div className="flex-1 flex items-center justify-center p-6">

          {/* Vista inicial — grid de templates + botón en blanco */}
          {createMode === 'initial' && (
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <p className="text-5xl mb-4">📋</p>
                <h2 className="text-xl font-semibold text-gray-800 mb-1">Nuevo plan para {athleteName.split(' ')[0]}</h2>
                <p className="text-gray-400 text-sm">Elige un template o crea un plan en blanco</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {TEMPLATE_META.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTemplateForm(t.id)}
                    className="flex flex-col items-start gap-2 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1e3a5f]/20 transition-all text-left group"
                  >
                    <span className="text-3xl">{t.emoji}</span>
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-[#1e3a5f] transition-colors">
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.sport} · {t.weeks} semanas</p>
                    </div>
                    <span className="text-xs font-medium text-[#ea580c] mt-auto">
                      Usar template →
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-2">
                <button
                  onClick={openBlankForm}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  + Plan en blanco
                </button>
                <Link
                  href={`/coach/athletes/${athleteId}`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                >
                  ← Ir al panel del atleta
                </Link>
              </div>
            </div>
          )}

          {/* Vista template-form */}
          {createMode === 'template-form' && selectedTemplateId && (() => {
            const meta = TEMPLATE_META.find((t) => t.id === selectedTemplateId)!
            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md space-y-5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Template {meta.label}</h2>
                    <p className="text-sm text-gray-400">{meta.sport} · {meta.weeks} semanas pre-pobladas</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                  <input
                    type="date"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                  <div className="w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500">
                    {meta.weeks} semanas (fijo por template)
                  </div>
                </div>

                {createError && <p className="text-sm text-red-500">{createError}</p>}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setCreateMode('initial'); setCreateError(null) }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={handleCreateFromTemplate}
                    disabled={createLoading || !newName.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#1e3a5f' }}
                  >
                    {createLoading ? 'Creando...' : 'Crear plan →'}
                  </button>
                </div>
              </div>
            )
          })()}

          {/* Vista blank-form — formulario existente sin cambios */}
          {createMode === 'blank-form' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 w-full max-w-md space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Plan en blanco</h2>
                <p className="text-sm text-gray-400 mt-1">Se crearán las semanas vacías. Agrega las sesiones desde el builder.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del plan</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="ej. Plan Running Temporada 2026"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración</label>
                <select
                  value={newWeeks}
                  onChange={(e) => setNewWeeks(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                >
                  {[4, 6, 8, 10, 12, 16, 18, 20, 24].map((w) => (
                    <option key={w} value={w}>{w} semanas</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                />
              </div>

              {createError && <p className="text-sm text-red-500">{createError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setCreateMode('initial'); setCreateError(null) }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleCreateCustomPlan}
                  disabled={createLoading || !newName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#1e3a5f' }}
                >
                  {createLoading ? 'Creando...' : 'Crear plan →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }

  // ── Builder ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden">
      <BuilderHeader athleteId={athleteId} athleteName={athleteName} planName={plan.name} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-56 border-r border-gray-200 bg-white overflow-y-auto p-4 shrink-0 hidden lg:block">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tipos de sesión
          </p>

          {/* Discipline filter pills */}
          <div className="flex gap-0.5 mb-3 bg-gray-100 rounded-lg p-0.5">
            {(['Todas', 'Running', 'Fuerza'] as Discipline[]).map((d) => (
              <button
                key={d}
                onClick={() => setDiscipline(d)}
                className={`flex-1 text-[10px] font-semibold py-1 rounded-md transition-colors ${
                  discipline === d
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="space-y-0.5">
            {SESSION_TYPES.filter((st) =>
              discipline === 'Todas'
                ? true
                : discipline === 'Running'
                ? DISCIPLINE_RUNNING.has(st.type)
                : DISCIPLINE_FUERZA.has(st.type)
            ).map((st) => (
              <button
                key={st.type}
                onClick={() => week && openAddModal(week.id, 0, st.type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <div className="flex flex-col">
                  <span className="text-sm text-gray-600 group-hover:text-gray-900">{st.label}</span>
                  {st.sub && (
                    <span className="text-[10px] leading-tight" style={{ color: '#8c949e' }}>{st.sub}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* RESUMEN DEL PLAN */}
          {week && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#667382' }}>
                Resumen del plan
              </p>
              <div className="space-y-2.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px]" style={{ color: '#8c949e' }}>Semana</span>
                  <span className="text-xs font-bold" style={{ color: '#1f2938' }}>{week.weekNumber}/{plan.totalWeeks}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px]" style={{ color: '#8c949e' }}>Sesiones totales</span>
                  <span className="text-xs font-bold" style={{ color: '#1f2938' }}>{week.sessions.length}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-[10px]" style={{ color: '#8c949e' }}>Fase actual</span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: PHASE_COLORS[week.phase] ?? '#1f2938' }}
                  >
                    {PHASE_LABELS[week.phase] ?? week.phase}
                  </span>
                </div>
                {/* Progress bar */}
                <div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round((weekIdx + 1) / plan.totalWeeks * 100)}%`,
                        backgroundColor: '#1e3a5f',
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-medium mt-1" style={{ color: '#8c949e' }}>
                    {Math.round((weekIdx + 1) / plan.totalWeeks * 100)}% completado
                  </p>
                </div>
              </div>

              <button
                className="w-full mt-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1e3a5f' }}
              >
                Publicar semana →
              </button>
              <button
                className="w-full mt-1.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors hover:bg-gray-50"
                style={{ color: '#667382' }}
              >
                Notificar al atleta
              </button>
            </div>
          )}

          {/* BUILDER-02: Template nutricional vinculado */}
          {coachNutritionTemplates.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#667382' }}>
                Template nutricional
              </p>
              <select
                value={linkedTemplate ?? ''}
                onChange={(e) => handleLinkTemplate(e.target.value || null)}
                disabled={linkingTemplate}
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-50 bg-white"
                style={{ color: linkedTemplate ? '#1f2938' : '#8c949e' }}
              >
                <option value="">Sin template</option>
                {coachNutritionTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {linkedTemplate && (
                <p className="text-[10px] mt-1" style={{ color: '#16a34a' }}>
                  ✓ Vinculado
                </p>
              )}
            </div>
          )}
        </aside>

        {/* Week grid */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Week nav */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
              disabled={weekIdx === 0}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} /> Sem anterior
            </button>
            <div className="flex-1 text-center">
              <span className="font-semibold text-gray-900">Semana {week!.weekNumber}</span>
              <span className="text-gray-400 text-sm ml-2">
                — {formatWeekRange(week!.startDate, week!.endDate)}
              </span>
              {week!.isRecoveryWeek && (
                <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Recuperación
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {weekIdx > 0 && (
                <button
                  onClick={handleCopyPrevWeek}
                  disabled={saving}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#1e3a5f] border border-gray-200 hover:border-[#1e3a5f]/30 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-40"
                  title="Copiar sesiones de la semana anterior"
                >
                  Copiar sem. anterior
                </button>
              )}
              <button
                onClick={() => setWeekIdx((i) => Math.min(plan.weeks.length - 1, i + 1))}
                disabled={weekIdx === plan.weeks.length - 1}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Week mini-overview */}
          <WeekNav weeks={plan.weeks} activeIdx={weekIdx} onSelect={setWeekIdx} />

          {/* Phase label + edit */}
          <div className="mb-4 flex items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: PHASE_COLORS[week!.phase] ?? '#1e3a5f' }}
            >
              {PHASE_LABELS[week!.phase] ?? week!.phase}
            </span>
            {week!.focusDescription && (
              <span className="text-xs text-gray-400">· {week!.focusDescription}</span>
            )}
            {week!.isRecoveryWeek && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Recuperación
              </span>
            )}
            <button
              onClick={() => setWeekEdit({ weekId: week!.id, phase: week!.phase, focusDescription: week!.focusDescription ?? '', isRecoveryWeek: week!.isRecoveryWeek, volumeKm: week!.volumeKm ?? null })}
              className="text-gray-300 hover:text-gray-600 transition-colors ml-1"
              title="Editar metadatos de semana"
            >
              <Pencil size={12} />
            </button>
          </div>

          {/* Weekly summary bar */}
          {week && (() => {
            const totalSessions = week.sessions.length
            const totalMin = week.sessions.reduce((s, x) => s + x.durationMin, 0)
            const totalKm = week.volumeKm ?? 0
            const highCount = week.sessions.filter(s => {
              const i = INTENSITY_MAP[s.type]; return i?.label === 'HIGH'
            }).length
            const modCount = week.sessions.filter(s => {
              const i = INTENSITY_MAP[s.type]; return i?.label === 'MOD'
            }).length
            const restCount = week.sessions.filter(s => {
              const i = INTENSITY_MAP[s.type]; return i?.label === 'REST'
            }).length
            return (
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-xs font-medium" style={{ color: '#59616b' }}>
                  {totalSessions} sesiones · {totalMin} min{totalKm > 0 ? ` · ${totalKm} km` : ''}
                </span>
                <div className="flex items-center gap-2">
                  {highCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#dc2626' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                      {highCount} alta
                    </span>
                  )}
                  {modCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#ea580c' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#ea580c' }} />
                      {modCount} moderada
                    </span>
                  )}
                  {restCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#9ca3af' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#9ca3af' }} />
                      {restCount} descanso
                    </span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((dayName, dayIdx) => {
              const sessions = week!.sessions.filter((s) => s.dayOfWeek === dayIdx)
              const date = dayDate(week!.startDate, dayIdx)
              return (
                <div key={dayIdx} className="min-h-[260px] flex flex-col">
                  <div className="mb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">{dayName}</p>
                        <p className="text-xl font-bold text-gray-900 leading-tight">{date.getDate()}</p>
                      </div>
                      {sessions.length > 0 && (() => {
                        const mainType = sessions[0].type
                        const intensity = INTENSITY_MAP[mainType]
                        return intensity ? (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ color: intensity.color, backgroundColor: intensity.bg }}
                          >
                            {intensity.label}
                          </span>
                        ) : null
                      })()}
                    </div>
                    {/* Nutrition target for this day */}
                    {nutritionPlan && (() => {
                      const bestIntensity = sessions.length > 0
                        ? sessions.reduce((best, s) => {
                            const si = sessionIntensity(s.type)
                            const rank = si === 'HIGH' ? 3 : si === 'MODERATE' ? 2 : 1
                            return rank > (best === 'HIGH' ? 3 : best === 'MODERATE' ? 2 : 1) ? si : best
                          }, 'REST' as string)
                        : (assignedRoutine?.days.some(d => d.dayOfWeek === dayIdx + 1) ? 'MODERATE' : 'REST')
                      const nut = getDayNutrition(bestIntensity, nutritionPlan)
                      return (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: nut.color }} />
                          <span className="text-[10px] font-semibold" style={{ color: '#3b5e9e' }}>
                            {nut.kcal} kcal
                          </span>
                        </div>
                      )
                    })()}
                    <div className="h-px bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 space-y-2">
                    {sessions.map((s) => {
                      const cfg = getSessionConfig(s.type)
                      return (
                        <div key={s.id} className="relative group">
                          <button
                            onClick={() => openEditModal(s, week!.id)}
                            className="w-full text-left p-2.5 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div
                              className="h-0.5 rounded-full mb-1.5"
                              style={{ backgroundColor: cfg.color }}
                            />
                            <p className="text-xs font-semibold text-gray-900 leading-tight">
                              {cfg.label}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {s.durationMin} min{s.zoneTarget && s.zoneTarget !== 'N/A' && s.type !== 'FUERZA' ? ` · ${s.zoneTarget}` : ''}
                            </p>
                            {s.sportLabel && (
                              <p className="text-[10px] text-blue-500 mt-0.5 truncate font-medium">
                                {s.sportLabel}
                              </p>
                            )}
                            {s.detailText && (
                              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                                {s.detailText}
                              </p>
                            )}
                            {s.type === 'FUERZA' && s.workoutDay && (
                              <p className="text-[10px] text-purple-500 mt-0.5 truncate font-medium">
                                💪 {s.workoutDay.label}
                              </p>
                            )}
                          </button>
                          <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setCopyModal({ sessionId: s.id, sessionLabel: cfg.label })
                              }}
                              title="Copiar sesión a otra semana"
                              className="p-0.5 rounded bg-white text-gray-300 hover:text-gray-600"
                            >
                              <Copy size={10} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditModal(s, week!.id)
                              }}
                              title="Opciones"
                              className="p-0.5 rounded bg-white text-gray-300 hover:text-gray-600 text-xs leading-none"
                            >
                              ⋮
                            </button>
                          </div>
                        </div>
                      )
                    })}
                    <button
                      onClick={() => openAddModal(week!.id, dayIdx)}
                      className="w-full py-2 text-xs text-gray-300 hover:text-gray-500 hover:bg-white rounded-lg border border-dashed border-gray-200 transition-colors"
                    >
                      + Añadir sesión
                    </button>

                    {/* Gym routine for this day (from AssignedWorkout) */}
                    {assignedRoutine && (() => {
                      const gymDay = assignedRoutine.days.find(d => d.dayOfWeek === dayIdx + 1)
                      if (!gymDay) return null
                      const alreadyInPlan = sessions.some(s => s.type === 'FUERZA' && s.workoutDay)
                      if (alreadyInPlan) return null
                      return (
                        <div className="mt-auto pt-2 border-t border-dashed border-gray-100">
                          <div className="px-2 py-1.5 rounded-md" style={{ backgroundColor: '#7c3aed0d' }}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#7c3aed' }} />
                              <span className="text-[10px] font-semibold" style={{ color: '#7c3aed' }}>
                                {gymDay.label}
                              </span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: '#8c949e' }}>
                              {gymDay.exerciseCount} ejercicios · {gymDay.muscleGroups.slice(0, 2).join(', ')}
                            </p>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Nutrition summary for this day */}
                    {nutritionPlan && (() => {
                      const bestIntensity = sessions.length > 0
                        ? sessions.reduce((best, s) => {
                            const si = sessionIntensity(s.type)
                            const rank = si === 'HIGH' ? 3 : si === 'MODERATE' ? 2 : 1
                            return rank > (best === 'HIGH' ? 3 : best === 'MODERATE' ? 2 : 1) ? si : best
                          }, 'REST' as string)
                        : (assignedRoutine?.days.some(d => d.dayOfWeek === dayIdx + 1) ? 'MODERATE' : 'REST')
                      const nut = getDayNutrition(bestIntensity, nutritionPlan)
                      return (
                        <div className="mt-1 px-2 py-1.5 rounded-md" style={{ backgroundColor: '#f8f9fb' }}>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium" style={{ color: '#667382' }}>🍽️ Nutrición</span>
                            <span
                              className="text-[10px] font-semibold px-1 py-0.5 rounded"
                              style={{ color: nut.color, backgroundColor: nut.color + '15' }}
                            >
                              {nut.label}
                            </span>
                          </div>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: '#1f2938' }}>
                            {nut.kcal} kcal
                          </p>
                          <p className="text-[10px]" style={{ color: '#8c949e' }}>
                            P{nutritionPlan.proteinG}g · C{bestIntensity === 'HIGH' ? nutritionPlan.carbsHardG : nutritionPlan.carbsEasyG}g · F{nutritionPlan.fatG}g
                          </p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* WeekNav — mini-overview */}
          <div className="mt-8 border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Semanas del plan
            </p>
            <div className="flex flex-wrap gap-1.5">
              {plan.weeks.map((w, i) => {
                const sessionCount = w.sessions.length
                const phaseColor = PHASE_COLORS[w.phase] ?? '#9ca3af'
                const isActive = i === weekIdx
                return (
                  <button
                    key={w.id}
                    onClick={() => setWeekIdx(i)}
                    title={`Sem ${w.weekNumber} — ${w.phase}${w.isRecoveryWeek ? ' · Recuperación' : ''} · ${sessionCount} sesiones`}
                    className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all"
                    style={{
                      borderColor: isActive ? phaseColor : '#e5e7eb',
                      backgroundColor: isActive ? `${phaseColor}10` : 'white',
                      minWidth: 36,
                    }}
                  >
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{ color: isActive ? phaseColor : '#9ca3af' }}
                    >
                      {w.weekNumber}
                    </span>
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: sessionCount > 0 ? phaseColor : '#e5e7eb' }}
                    />
                    {w.isRecoveryWeek && (
                      <div className="w-1 h-1 rounded-full bg-amber-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Session modal */}
      {modal && (
        <SessionModal
          modal={modal}
          onSave={handleSaveSession}
          onDelete={modal.session ? () => handleDeleteSession(modal.session!.id) : undefined}
          onClose={() => setModal(null)}
          saving={saving}
          gymTemplates={gymTemplates}
        />
      )}

      {/* Week metadata modal */}
      {weekEdit && (
        <WeekEditModal
          state={weekEdit}
          onSave={handleSaveWeekMeta}
          onClose={() => setWeekEdit(null)}
          saving={saving}
        />
      )}

      {/* Copy session modal */}
      {copyModal && plan && (
        <CopySessionModal
          sessionLabel={copyModal.sessionLabel}
          weeks={plan.weeks}
          onCopy={handleCopySession}
          onClose={() => setCopyModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

function BuilderHeader({
  athleteId,
  athleteName,
  planName,
}: {
  athleteId: string
  athleteName: string
  planName?: string
}) {
  return (
    <header className="flex items-center justify-between px-6 h-16 border-b border-gray-200 bg-white shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href="/coach/athletes">
          <MedaliqLogo variant="light" size="sm" />
        </Link>
        <span className="text-gray-300">·</span>
        <span className="text-sm text-gray-400 shrink-0">Constructor de planes</span>
        <span className="text-gray-300">·</span>
        <span className="text-sm font-semibold text-gray-800 truncate">{athleteName}</span>
        {planName && (
          <>
            <span className="text-gray-300 shrink-0">·</span>
            <span className="text-sm text-gray-400 truncate">{planName}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {planName && (
          <a
            href={`/coach/athletes/${athleteId}/plan/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Vista atleta ↗
          </a>
        )}
        <Link
          href={`/coach/athletes/${athleteId}`}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft size={15} />
          Volver al panel
        </Link>
      </div>
    </header>
  )
}

// ── Session modal ─────────────────────────────────────────────────────────────

function SessionModal({
  modal,
  onSave,
  onDelete,
  onClose,
  saving,
  gymTemplates,
}: {
  modal: ModalState
  onSave: (data: { type: string; durationMin: number; zoneTarget: string; detailText: string; sportLabel: string; workoutDayId: string | null }) => void
  onDelete?: () => void
  onClose: () => void
  saving: boolean
  gymTemplates: GymTemplate[]
}) {
  const [type, setType] = useState(modal.session?.type ?? modal.preselectedType ?? 'RODAJE_Z2')
  const [durationMin, setDurationMin] = useState(modal.session?.durationMin ?? 45)
  const [zoneTarget, setZoneTarget] = useState(modal.session?.zoneTarget ?? '')
  const [detailText, setDetailText] = useState(modal.session?.detailText ?? '')
  const [sportLabel, setSportLabel] = useState(modal.session?.sportLabel ?? '')
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(modal.session?.workoutDayId ?? null)

  const allGymDays = gymTemplates.flatMap(t => t.days.map(d => ({ ...d, templateName: t.name })))
  const selectedGymDay = allGymDays.find(d => d.id === workoutDayId) ?? null
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isEdit = !!modal.session
  const dayName = DAY_NAMES[modal.dayOfWeek]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            {isEdit ? 'Editar sesión' : `Añadir sesión — ${dayName}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Type selector */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Tipo de sesión
            </p>
            <div className="grid grid-cols-2 gap-1">
              {SESSION_TYPES.map((st) => (
                <button
                  key={st.type}
                  onClick={() => setType(st.type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    type === st.type
                      ? 'bg-gray-100 font-semibold text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: st.color }}
                  />
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Duración (min)
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {[30, 45, 60, 75, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDurationMin(d)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                  style={
                    durationMin === d
                      ? { backgroundColor: '#1e3a5f', color: '#fff', fontWeight: 600 }
                      : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {d}
                </button>
              ))}
              <input
                type="number"
                min={5}
                max={300}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1"
                style={{ '--tw-ring-color': '#1e3a5f' } as React.CSSProperties}
              />
            </div>
          </div>

          {/* Zone */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Zona objetivo
            </p>
            <input
              type="text"
              value={zoneTarget}
              onChange={(e) => setZoneTarget(e.target.value)}
              placeholder="Ej: Z2, Umbral, 80-85% FCM"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* WorkoutDay picker — only when FUERZA */}
          {type === 'FUERZA' && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Rutina de gym
              </p>
              {allGymDays.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No hay rutinas creadas todavía. Crea una en Ejercicios → Rutinas.</p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  <button
                    onClick={() => setWorkoutDayId(null)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                    style={workoutDayId === null ? { backgroundColor: '#f3f4f6', fontWeight: 600, color: '#374151' } : { color: '#9ca3af' }}
                  >
                    Sin rutina asignada
                  </button>
                  {allGymDays.map(d => (
                    <button
                      key={d.id}
                      onClick={() => setWorkoutDayId(d.id)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                      style={workoutDayId === d.id ? { backgroundColor: '#f3e8ff', fontWeight: 600, color: '#7c3aed' } : { color: '#374151', backgroundColor: '#f9fafb' }}
                    >
                      <span className="font-medium">{d.label}</span>
                      <span className="text-xs text-gray-400 ml-1">— {d.templateName}</span>
                      {workoutDayId === d.id && (
                        <p className="text-xs text-purple-500 mt-0.5">
                          {d.exercises.map(e => `${e.name} ${e.sets}×${e.repsScheme}`).join(' · ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sport label — free-form tag visible on the card */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Etiqueta de deporte <span className="text-gray-300 font-normal normal-case">(opcional)</span>
            </p>
            <input
              type="text"
              value={sportLabel}
              onChange={(e) => setSportLabel(e.target.value)}
              placeholder="Ej: Sweet Spot 2×20min, CSS 400m × 8"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Descripción
            </p>
            <textarea
              value={detailText}
              onChange={(e) => setDetailText(e.target.value)}
              placeholder="Ej: 3×10min al umbral con 3min de recuperación"
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          {isEdit && onDelete && (
            <button
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className="text-sm font-medium transition-colors"
              style={{ color: confirmDelete ? '#dc2626' : '#9ca3af' }}
            >
              {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ type, durationMin, zoneTarget, detailText, sportLabel, workoutDayId: type === 'FUERZA' ? workoutDayId : null })}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {saving ? 'Guardando...' : isEdit ? 'Guardar' : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Week metadata modal ───────────────────────────────────────────────────────

function WeekEditModal({
  state,
  onSave,
  onClose,
  saving,
}: {
  state: WeekEditState
  onSave: (data: { phase: string; focusDescription: string; isRecoveryWeek: boolean; volumeKm: number | null }) => void
  onClose: () => void
  saving: boolean
}) {
  const [phase, setPhase] = useState(state.phase)
  const [focusDescription, setFocusDescription] = useState(state.focusDescription)
  const [isRecoveryWeek, setIsRecoveryWeek] = useState(state.isRecoveryWeek)
  const [volumeKmStr, setVolumeKmStr] = useState(state.volumeKm != null ? String(state.volumeKm) : '')

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Editar semana</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Phase */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Fase</p>
            <div className="grid grid-cols-2 gap-1">
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className="px-3 py-2 rounded-lg text-sm text-left transition-colors"
                  style={
                    phase === p
                      ? { backgroundColor: `${PHASE_COLORS[p]}15`, color: PHASE_COLORS[p], fontWeight: 600 }
                      : { backgroundColor: '#f9fafb', color: '#6b7280' }
                  }
                >
                  {PHASE_LABELS[p] ?? p}
                </button>
              ))}
            </div>
          </div>

          {/* Focus description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Descripción de enfoque
            </p>
            <input
              type="text"
              value={focusDescription}
              onChange={(e) => setFocusDescription(e.target.value)}
              placeholder="Ej: Construcción aeróbica + fuerza base"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Volume km */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Volumen objetivo (km)
            </p>
            <input
              type="number"
              min={0}
              step={1}
              value={volumeKmStr}
              onChange={(e) => setVolumeKmStr(e.target.value)}
              placeholder="Ej: 50"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          {/* Recovery week toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Semana de recuperación</span>
            <button
              onClick={() => setIsRecoveryWeek((v) => !v)}
              className="relative w-10 h-6 rounded-full transition-colors"
              style={{ backgroundColor: isRecoveryWeek ? '#ea580c' : '#d1d5db' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: isRecoveryWeek ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ phase, focusDescription, isRecoveryWeek, volumeKm: volumeKmStr ? Number(volumeKmStr) : null })}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Copy session modal ────────────────────────────────────────────────────────

function CopySessionModal({
  sessionLabel,
  weeks,
  onCopy,
  onClose,
  saving,
}: {
  sessionLabel: string
  weeks: BuilderWeek[]
  onCopy: (targetWeekId: string, dayOfWeek: number) => void
  onClose: () => void
  saving: boolean
}) {
  const [targetWeekId, setTargetWeekId] = useState(weeks[0]?.id ?? '')
  const [dayOfWeek, setDayOfWeek] = useState(1)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Copiar sesión</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-500">
            Copiando <span className="font-medium text-gray-800">{sessionLabel}</span> a:
          </p>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Semana destino
            </p>
            <select
              value={targetWeekId}
              onChange={(e) => setTargetWeekId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-200"
            >
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Semana {w.weekNumber} — {w.phase}
                  {w.isRecoveryWeek ? ' (recuperación)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Día
            </p>
            <div className="grid grid-cols-7 gap-1">
              {DAY_NAMES.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setDayOfWeek(i + 1)}
                  className="py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={
                    dayOfWeek === i + 1
                      ? { backgroundColor: '#1e3a5f', color: '#fff' }
                      : { backgroundColor: '#f3f4f6', color: '#374151' }
                  }
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onCopy(targetWeekId, dayOfWeek)}
            disabled={saving || !targetWeekId}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#1e3a5f' }}
          >
            {saving ? 'Copiando...' : 'Copiar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── WeekNav ───────────────────────────────────────────────────────────────────

function WeekNav({
  weeks,
  activeIdx,
  onSelect,
}: {
  weeks: BuilderWeek[]
  activeIdx: number
  onSelect: (idx: number) => void
}) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1 mb-4 px-1">
      {weeks.map((w, i) => {
        const isActive = i === activeIdx
        const color = PHASE_COLORS[w.phase] ?? '#1e3a5f'
        const count = w.sessions.length
        return (
          <button
            key={w.id}
            onClick={() => onSelect(i)}
            title={`Semana ${w.weekNumber} — ${w.phase}${w.isRecoveryWeek ? ' · Recuperación' : ''} · ${count} sesiones`}
            className="flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-lg transition-all shrink-0 min-w-[32px]"
            style={isActive ? { backgroundColor: color + '18', outline: `2px solid ${color}` } : { outline: '2px solid transparent' }}
          >
            <span className="text-[10px] font-bold text-gray-400 leading-none">S{w.weekNumber}</span>
            <span
              className="w-2 h-2 rounded-full transition-transform"
              style={{
                backgroundColor: count > 0 ? color : '#e5e7eb',
                transform: isActive ? 'scale(1.25)' : 'scale(1)',
              }}
            />
            {w.isRecoveryWeek && (
              <span className="w-1 h-1 rounded-full bg-amber-400 -mt-0.5" />
            )}
          </button>
        )
      })}
    </div>
  )
}
