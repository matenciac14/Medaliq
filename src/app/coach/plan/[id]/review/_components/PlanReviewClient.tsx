'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionData = {
  id: string
  dayOfWeek: number
  type: string
  durationMin: number
  detailText: string | null
  zoneTarget: string | null
  coachNote: string | null
}

export type WeekData = {
  id: string
  weekNumber: number
  phase: string
  focusDescription: string | null
  isRecoveryWeek: boolean
  volumeKm: number | null
  sessions: SessionData[]
}

export type PlanData = {
  id: string
  name: string
  totalWeeks: number
  startDate: string
  endDate: string
  status: string
  generatedBy: string
  weeks: WeekData[]
  user: { id: string; name: string | null; email: string }
}

// ─── Lookup maps ──────────────────────────────────────────────────────────────

const DAY_ABBR: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
}

const SESSION_TYPES = [
  { value: 'RODAJE_Z2',    label: 'Rodaje Z2' },
  { value: 'FARTLEK',      label: 'Fartlek' },
  { value: 'TEMPO',        label: 'Tempo' },
  { value: 'INTERVALOS',   label: 'Intervalos' },
  { value: 'TIRADA_LARGA', label: 'Tirada larga' },
  { value: 'FUERZA',       label: 'Fuerza' },
  { value: 'CICLA',        label: 'Ciclismo' },
  { value: 'NATACION',     label: 'Natación' },
  { value: 'DESCANSO',     label: 'Descanso' },
  { value: 'TEST',         label: 'Test' },
  { value: 'SIMULACRO',    label: 'Simulacro' },
  { value: 'OTRO',         label: 'Otro' },
]

const SESSION_LABEL: Record<string, string> = Object.fromEntries(
  SESSION_TYPES.map((t) => [t.value, t.label])
)

const SESSION_BADGE: Record<string, { bg: string; text: string }> = {
  RODAJE_Z2:    { bg: '#dbeafe', text: '#1d4ed8' },
  FARTLEK:      { bg: '#f3e8ff', text: '#7e22ce' },
  TEMPO:        { bg: '#ffedd5', text: '#c2410c' },
  INTERVALOS:   { bg: '#fee2e2', text: '#b91c1c' },
  TIRADA_LARGA: { bg: '#e0e7ff', text: '#3730a3' },
  FUERZA:       { bg: '#fef3c7', text: '#92400e' },
  DESCANSO:     { bg: '#f3f4f6', text: '#4b5563' },
  TEST:         { bg: '#fce7f3', text: '#9d174d' },
  SIMULACRO:    { bg: '#ccfbf1', text: '#0f766e' },
  CICLA:        { bg: '#dcfce7', text: '#15803d' },
  NATACION:     { bg: '#cffafe', text: '#0e7490' },
  OTRO:         { bg: '#f3f4f6', text: '#4b5563' },
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', PAUSED: 'Pausado', COMPLETED: 'Completado', ABANDONED: 'Abandonado',
}

const GENERATED_BY_LABEL: Record<string, { label: string; bg: string; text: string; border: string }> = {
  AI:                { label: 'Generado por AI',    bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  COACH:             { label: 'Creado por coach',   bg: '#f0fdf4', text: '#14532d', border: '#bbf7d0' },
  AI_COACH_APPROVED: { label: 'Aprobado por coach', bg: '#f0fdf4', text: '#14532d', border: '#86efac' },
}

const PHASES = ['BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO']

// ─── Session editor state ─────────────────────────────────────────────────────

type SessionEdit = {
  type: string
  durationMin: number
  detailText: string
  zoneTarget: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanReviewClient({ plan, athleteId }: { plan: PlanData; athleteId: string }) {
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({})

  // Notes state
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    plan.weeks.forEach((w) => w.sessions.forEach((s) => { if (s.coachNote) init[s.id] = s.coachNote }))
    return init
  })
  const [savingNote, setSavingNote] = useState<Record<string, boolean>>({})
  const [savedNote, setSavedNote]   = useState<Record<string, boolean>>({})

  // Session inline edit state
  const [editingSession, setEditingSession] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<SessionEdit | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [sessionData, setSessionData] = useState<Record<string, SessionData>>(() => {
    const map: Record<string, SessionData> = {}
    plan.weeks.forEach((w) => w.sessions.forEach((s) => { map[s.id] = s }))
    return map
  })

  // Approve state
  const [approving, setApproving]   = useState(false)
  const [approved, setApproved]     = useState(plan.generatedBy === 'AI_COACH_APPROVED')
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showAdjustForm, setShowAdjustForm] = useState(false)
  const [adjustComment, setAdjustComment]   = useState('')

  const weeksByPhase = PHASES
    .map((phase) => ({ phase, weeks: plan.weeks.filter((w) => w.phase === phase) }))
    .filter((g) => g.weeks.length > 0)

  function togglePhase(phase: string) {
    setCollapsedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }))
  }

  function startEditing(session: SessionData) {
    setEditingSession(session.id)
    setEditDraft({
      type:        session.type,
      durationMin: session.durationMin,
      detailText:  session.detailText ?? '',
      zoneTarget:  session.zoneTarget ?? '',
    })
  }

  function cancelEditing() {
    setEditingSession(null)
    setEditDraft(null)
  }

  async function handleSaveEdit(sessionId: string) {
    if (!editDraft) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/coach/sessions/${sessionId}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        editDraft.type,
          durationMin: editDraft.durationMin,
          detailText:  editDraft.detailText,
          zoneTarget:  editDraft.zoneTarget,
        }),
      })
      if (res.ok) {
        setSessionData((prev) => ({
          ...prev,
          [sessionId]: {
            ...prev[sessionId],
            type:        editDraft.type,
            durationMin: editDraft.durationMin,
            detailText:  editDraft.detailText || null,
            zoneTarget:  editDraft.zoneTarget || null,
          },
        }))
        setEditingSession(null)
        setEditDraft(null)
      }
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleSaveNote(sessionId: string) {
    setSavingNote((prev) => ({ ...prev, [sessionId]: true }))
    try {
      await fetch(`/api/coach/sessions/${sessionId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: notes[sessionId] ?? '' }),
      })
      setSavedNote((prev) => ({ ...prev, [sessionId]: true }))
    } finally {
      setSavingNote((prev) => ({ ...prev, [sessionId]: false }))
    }
  }

  async function handleApprove() {
    setApproving(true); setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/approve`, { method: 'PATCH' })
      const data = await res.json() as { ok: boolean }
      if (res.ok && data.ok) {
        setApproved(true)
        setFeedback({ type: 'success', message: 'Plan aprobado. El atleta puede verlo en su dashboard.' })
      } else {
        setFeedback({ type: 'error', message: 'Error al aprobar. Intenta de nuevo.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión.' })
    } finally {
      setApproving(false)
    }
  }

  async function handleRequestAdjustment() {
    if (!adjustComment.trim()) return
    setApproving(true); setFeedback(null)
    try {
      const res = await fetch(`/api/coach/plan/${plan.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_adjustment', comment: adjustComment }),
      })
      const data = await res.json() as { ok: boolean }
      if (res.ok && data.ok) {
        setShowAdjustForm(false); setAdjustComment('')
        setFeedback({ type: 'success', message: 'Solicitud de ajuste registrada.' })
      } else {
        setFeedback({ type: 'error', message: 'Error al enviar la solicitud.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de conexión.' })
    } finally {
      setApproving(false)
    }
  }

  const athleteName = plan.user.name ?? plan.user.email
  const initials    = athleteName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const statusCfg   = GENERATED_BY_LABEL[approved ? 'AI_COACH_APPROVED' : plan.generatedBy] ?? GENERATED_BY_LABEL.AI
  const startDate   = new Date(plan.startDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
  const endDate     = new Date(plan.endDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-50 pb-32">

      {/* ── Sticky header ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href={`/coach/athlete/${athleteId}`} className="flex-shrink-0 text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← Volver
            </Link>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: '#1e3a5f' }}>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{athleteName}</p>
                <p className="text-xs text-gray-500 truncate">{plan.name}</p>
              </div>
            </div>
          </div>
          <span className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border" style={{ backgroundColor: statusCfg.bg, color: statusCfg.text, borderColor: statusCfg.border }}>
            {statusCfg.label}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6">

        {/* Plan meta */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-400 mb-0.5">Total semanas</p><p className="font-semibold text-gray-800">{plan.totalWeeks}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Inicio</p><p className="font-semibold text-gray-800">{startDate}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Fin</p><p className="font-semibold text-gray-800">{endDate}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Estado</p><p className="font-semibold text-gray-800">{PLAN_STATUS_LABEL[plan.status] ?? plan.status}</p></div>
          </div>
        </div>

        {/* Feedback banner */}
        {feedback && (
          <div className="mb-6 px-4 py-3 rounded-lg text-sm font-medium" style={{ backgroundColor: feedback.type === 'success' ? '#dcfce7' : '#fee2e2', color: feedback.type === 'success' ? '#14532d' : '#7f1d1d' }}>
            {feedback.message}
          </div>
        )}

        {/* ── Phases + weeks ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {weeksByPhase.map(({ phase, weeks }) => {
            const collapsed = collapsedPhases[phase]
            return (
              <div key={phase} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => togglePhase(phase)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f97316' }} />
                    <span className="font-semibold text-gray-900">{phase}</span>
                    <span className="text-xs text-gray-400">{weeks.length} semana{weeks.length !== 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{collapsed ? '▼ Expandir' : '▲ Colapsar'}</span>
                </button>

                {!collapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {weeks.map((week) => (
                      <div key={week.id} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-semibold" style={{ color: '#1e3a5f' }}>Semana {week.weekNumber}</span>
                          {week.isRecoveryWeek && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Descarga</span>}
                          {week.volumeKm != null && <span className="text-xs text-gray-400 ml-auto">{week.volumeKm} km</span>}
                        </div>
                        {week.focusDescription && <p className="text-xs text-gray-500 mb-3">{week.focusDescription}</p>}

                        <div className="space-y-5">
                          {week.sessions.map((rawSession) => {
                            const session   = sessionData[rawSession.id] ?? rawSession
                            const badge     = SESSION_BADGE[session.type] ?? SESSION_BADGE.OTRO
                            const label     = SESSION_LABEL[session.type] ?? session.type
                            const isEditing = editingSession === session.id
                            const isSaving  = savingNote[session.id]
                            const isSaved   = savedNote[session.id]

                            return (
                              <div key={session.id} className="border-l-2 pl-4" style={{ borderColor: '#f97316' }}>

                                {/* ── View mode header ── */}
                                {!isEditing && (
                                  <>
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-xs font-semibold text-gray-400 uppercase w-8 flex-shrink-0">
                                        {DAY_ABBR[session.dayOfWeek] ?? `D${session.dayOfWeek}`}
                                      </span>
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.text }}>
                                        {label}
                                      </span>
                                      <span className="text-xs text-gray-400">{session.durationMin} min</span>
                                      {session.zoneTarget && <span className="text-xs text-blue-500">{session.zoneTarget}</span>}
                                      <button
                                        onClick={() => startEditing(session)}
                                        className="ml-auto text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
                                      >
                                        ✏️ Editar sesión
                                      </button>
                                    </div>
                                    {session.detailText && (
                                      <p className="text-xs text-gray-500 mb-2 ml-10">{session.detailText}</p>
                                    )}
                                  </>
                                )}

                                {/* ── Edit mode ── */}
                                {isEditing && editDraft && (
                                  <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3 border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Editar sesión — {DAY_ABBR[session.dayOfWeek]}</p>

                                    <div className="grid grid-cols-2 gap-3">
                                      {/* Type */}
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                                        <select
                                          value={editDraft.type}
                                          onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}
                                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
                                        >
                                          {SESSION_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Duration */}
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1">Duración (min)</label>
                                        <input
                                          type="number"
                                          min={5}
                                          max={300}
                                          value={editDraft.durationMin}
                                          onChange={(e) => setEditDraft({ ...editDraft, durationMin: Number(e.target.value) })}
                                          className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                                        />
                                      </div>
                                    </div>

                                    {/* Zone target */}
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Zona objetivo</label>
                                      <input
                                        type="text"
                                        placeholder="ej. Z2, Z3, Z2-Z3"
                                        value={editDraft.zoneTarget}
                                        onChange={(e) => setEditDraft({ ...editDraft, zoneTarget: e.target.value })}
                                        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
                                      />
                                    </div>

                                    {/* Detail text */}
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Descripción de la sesión</label>
                                      <textarea
                                        rows={3}
                                        placeholder="Describe la sesión..."
                                        value={editDraft.detailText}
                                        onChange={(e) => setEditDraft({ ...editDraft, detailText: e.target.value })}
                                        className="w-full text-xs border border-gray-300 rounded-lg px-2 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
                                      />
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        onClick={cancelEditing}
                                        className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSaveEdit(session.id)}
                                        disabled={savingEdit}
                                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-opacity disabled:opacity-60"
                                        style={{ backgroundColor: '#1e3a5f' }}
                                      >
                                        {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Coach note (always visible) */}
                                <div className="flex gap-2 items-start ml-10">
                                  <textarea
                                    rows={2}
                                    placeholder="Nota del coach..."
                                    value={notes[session.id] ?? ''}
                                    onChange={(e) => {
                                      setNotes((prev) => ({ ...prev, [session.id]: e.target.value }))
                                      setSavedNote((prev) => ({ ...prev, [session.id]: false }))
                                    }}
                                    className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300 text-gray-700 placeholder-gray-300"
                                  />
                                  <button
                                    onClick={() => handleSaveNote(session.id)}
                                    disabled={isSaving}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-60"
                                    style={{ backgroundColor: isSaved ? '#16a34a' : '#1e3a5f' }}
                                  >
                                    {isSaving ? '...' : isSaved ? '✓' : 'Guardar'}
                                  </button>
                                </div>

                              </div>
                            )
                          })}
                          {week.sessions.length === 0 && (
                            <p className="text-xs text-gray-400">Sin sesiones planificadas.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {weeksByPhase.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
              <p className="text-gray-400 text-sm">Este plan no tiene semanas generadas aún.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky footer — oculto mientras se edita una sesión ───────────────── */}
      {!editingSession && <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4">
          {showAdjustForm ? (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Comentario para el atleta</label>
              <textarea
                rows={2}
                placeholder="Describe los ajustes necesarios..."
                value={adjustComment}
                onChange={(e) => setAdjustComment(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 text-gray-700 placeholder-gray-400"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowAdjustForm(false); setAdjustComment('') }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleRequestAdjustment} disabled={approving || !adjustComment.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50" style={{ backgroundColor: '#dc2626' }}>
                  {approving ? 'Enviando...' : 'Enviar solicitud'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setShowAdjustForm(true)} disabled={approving || approved} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors disabled:opacity-40" style={{ borderColor: '#dc2626', color: '#dc2626' }}>
                Solicitar ajuste
              </button>
              <button onClick={handleApprove} disabled={approving || approved} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40" style={{ backgroundColor: approved ? '#16a34a' : '#1e3a5f' }}>
                {approving ? 'Aprobando...' : approved ? '✓ Plan aprobado' : 'Aprobar plan'}
              </button>
            </div>
          )}
        </div>
      </div>}
    </div>
  )
}
