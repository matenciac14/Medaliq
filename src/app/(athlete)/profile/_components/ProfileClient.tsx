'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { User, Scale, Heart, Moon, Zap, AlertTriangle, Target, ChevronDown, ChevronUp, Check, Pencil, X, ChevronRight, LogOut, HelpCircle, MessageCircle, Activity, Link2 } from 'lucide-react'

type DailyLog = {
  id: string
  date: string
  weightKg: number | null
  hrResting: number | null
  sleepHours: number | null
  energyLevel: number | null
  notes: string | null
}

type Props = {
  user: {
    name: string
    email: string
    userPlan: string
    hasCoach: boolean
    profile: {
      age: number
      dateOfBirth: string | null
      heightCm: number
      weightKg: number
      weightGoalKg: number | null
      hrResting: number | null
      hrMax: number | null
      injuries: string[]
      conditions: string[]
      sleepHoursAvg: number | null
      sport: string | null
      experienceLevel: string | null
      sportDetails: Record<string, string | number | null>
    } | null
    plan: { name: string; totalWeeks: number } | null
    dailyLogs: DailyLog[]
  }
}

function calcAge(dob: string): number {
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function estimateHrMax(age: number): number {
  return Math.round(211 - 0.64 * age) // Fox — fuente canónica del sistema
}

function calcBMI(weightKg: number, heightCm: number): string {
  const bmi = weightKg / Math.pow(heightCm / 100, 2)
  return bmi.toFixed(1)
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Bajo peso'
  if (bmi < 25)   return 'Normal'
  if (bmi < 30)   return 'Sobrepeso'
  return 'Obesidad'
}

const ENERGY_LABELS = ['', 'Muy baja', 'Baja', 'Normal', 'Buena', 'Excelente']
const ENERGY_COLORS = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-emerald-100 text-emerald-700']

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ProfileClient({ user }: Props) {
  const router = useRouter()
  const todayLog = user.dailyLogs.find(l => l.date === today()) ?? null

  const [form, setForm] = useState({
    date: today(),
    weightKg: todayLog?.weightKg?.toString() ?? '',
    hrResting: todayLog?.hrResting?.toString() ?? '',
    sleepHours: todayLog?.sleepHours?.toString() ?? '',
    energyLevel: todayLog?.energyLevel?.toString() ?? '',
    notes: todayLog?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Edición de perfil base
  const p = user.profile
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: p?.dateOfBirth?.slice(0, 10) ?? '',
    heightCm: p?.heightCm?.toString() ?? '',
    weightKg: p?.weightKg?.toString() ?? '',
    weightGoalKg: p?.weightGoalKg?.toString() ?? '',
    hrResting: p?.hrResting?.toString() ?? '',
    hrMax: p?.hrMax?.toString() ?? '',
    injuries: p?.injuries?.join(', ') ?? '',
    conditions: p?.conditions?.join(', ') ?? '',
  })

  // Valores calculados
  const computedAge = profileForm.dateOfBirth ? calcAge(profileForm.dateOfBirth) : p?.age ?? null
  const computedHrMax = profileForm.hrMax ? parseInt(profileForm.hrMax) : computedAge ? estimateHrMax(computedAge) : null
  // Para el modo display usa los datos del servidor (actualizados tras router.refresh), no el form
  const displayAge = p?.dateOfBirth ? calcAge(p.dateOfBirth) : p?.age ?? null
  const displayHrMax = p?.hrMax ?? (displayAge ? estimateHrMax(displayAge) : null)
  const bmi = p?.weightKg && p?.heightCm ? parseFloat(calcBMI(p.weightKg, p.heightCm)) : null
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await fetch('/api/athlete/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateOfBirth: profileForm.dateOfBirth || undefined,
          heightCm: profileForm.heightCm || undefined,
          weightKg: profileForm.weightKg || undefined,
          weightGoalKg: profileForm.weightGoalKg || undefined,
          hrResting: profileForm.hrResting || undefined,
          hrMax: profileForm.hrMax || undefined,
          injuries: profileForm.injuries ? profileForm.injuries.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
          conditions: profileForm.conditions ? profileForm.conditions.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        }),
      })
      setSavedProfile(true)
      setEditingProfile(false)
      router.refresh()
      setTimeout(() => setSavedProfile(false), 2500)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/athlete/metrics/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(form.weightKg && { weightKg: parseFloat(form.weightKg) }),
          ...(form.hrResting && { hrResting: parseInt(form.hrResting) }),
          ...(form.sleepHours && { sleepHours: parseFloat(form.sleepHours) }),
          ...(form.energyLevel && { energyLevel: parseInt(form.energyLevel) }),
          ...(form.notes && { notes: form.notes }),
        }),
      })
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  // Calcular completitud del perfil
  const profileFields = [
    { label: 'Edad', ok: !!p?.age },
    { label: 'Peso y altura', ok: !!p?.weightKg && !!p?.heightCm },
    { label: 'FC reposo y máx', ok: !!p?.hrResting && !!p?.hrMax },
    { label: 'Lesiones/condiciones', ok: true }, // always ok (puede ser vacío)
    { label: 'Plan activo', ok: !!user.plan },
  ]
  const completePct = Math.round((profileFields.filter(f => f.ok).length / profileFields.length) * 100)

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const planLabel = user.userPlan === 'PRO' ? 'Pro' : user.hasCoach ? 'B2B' : 'Gratis'
  const planBadgeBg = user.userPlan === 'PRO' ? 'bg-[#22c55e]' : 'bg-white/20'

  return (
    <>
      {/* ── Mobile profile view (< sm) — matches mobile app ── */}
      <div className="sm:hidden min-h-screen bg-[#f1f5f9]">
        {/* Gradient hero header */}
        <div className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5a8e] pt-[max(env(safe-area-inset-top,0px),44px)] pb-7 flex flex-col items-center">
          <div className="w-[76px] h-[76px] rounded-full bg-white/20 flex items-center justify-center mb-3">
            <div className="w-[68px] h-[68px] rounded-full bg-[#f97316] flex items-center justify-center">
              <span className="text-white text-2xl font-black">{initials}</span>
            </div>
          </div>
          <p className="text-xl font-bold text-white">{user.name}</p>
          <div className={`mt-2 px-3.5 py-1.5 rounded-full ${planBadgeBg}`}>
            <span className="text-xs font-semibold text-white">
              {user.userPlan === 'PRO' ? '✦ Pro' : user.hasCoach ? 'B2B' : 'Free'}
            </span>
          </div>
        </div>

        <div className="space-y-3.5 pb-8">
          {/* Cuenta */}
          <MobileMenuSection title="Cuenta">
            <MobileMenuItem icon="👤" label="Nombre" value={user.name.split(' ')[0]} />
            <MobileMenuDivider />
            <MobileMenuItem icon="✉️" label="Email" value={user.email} />
            <MobileMenuDivider />
            <MobileMenuLink icon="🏅" label="Mi suscripción" href="/settings/plan" />
          </MobileMenuSection>

          {/* Datos físicos */}
          <MobileMenuSection title="Datos físicos">
            <MobileMenuLink icon="🏋️" label="Perfil de salud" href="/profile#health" />
            <MobileMenuDivider />
            <MobileMenuLink icon="🔗" label="Integraciones" href="/settings/integrations" />
          </MobileMenuSection>

          {/* Coach / Mensajes */}
          <MobileMenuSection title={user.hasCoach ? 'Coach' : 'Coach'}>
            {user.hasCoach ? (
              <MobileMenuLink icon="💬" label="Mensajes" href="/messages" />
            ) : (
              <MobileMenuLink icon="🎯" label="Buscar coach" href="/find-coach" />
            )}
          </MobileMenuSection>

          {/* Soporte */}
          <MobileMenuSection title="Soporte">
            <MobileMenuLink icon="❓" label="Ayuda y FAQ" href="https://medaliq.com/help" external />
            <MobileMenuDivider />
            <MobileMenuLink icon="💬" label="Contactar soporte" href="mailto:hola@medaliq.com" external />
          </MobileMenuSection>

          {/* Cerrar sesión */}
          <div className="bg-white rounded-2xl mx-4 shadow-sm overflow-hidden">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-3.5 w-full px-4 py-4"
            >
              <div className="w-9 h-9 rounded-[10px] bg-red-50 flex items-center justify-center">
                <LogOut size={18} className="text-red-500" />
              </div>
              <span className="text-sm font-medium text-red-500">Cerrar sesión</span>
            </button>
          </div>

          <p className="text-center text-xs text-gray-300 px-4">
            Medaliq v1.0 · Hecho en Colombia 🇨🇴
          </p>
        </div>
      </div>

      {/* ── Desktop profile view (≥ sm) — existing layout ── */}
    <div className="hidden sm:block px-4 py-6 lg:px-8 lg:py-8 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {user.plan && (
            <p className="text-xs text-[#ea580c] font-medium mt-0.5">{user.plan.name} · {user.plan.totalWeeks} semanas</p>
          )}
        </div>
        <Link
          href="/settings/plan"
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors shrink-0"
        >
          <span className="text-base">🏅</span>
          <span>Mi suscripción</span>
          <ChevronRight size={14} className="text-gray-400" />
        </Link>
      </div>

      {/* Completitud del perfil */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Completitud del perfil</p>
          <span className="text-sm font-bold" style={{ color: completePct === 100 ? '#22c55e' : '#ea580c' }}>{completePct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${completePct}%`, backgroundColor: completePct === 100 ? '#22c55e' : '#ea580c' }} />
        </div>
        <div className="mt-3 space-y-1">
          {profileFields.map(f => (
            <div key={f.label} className="flex items-center gap-2 text-xs">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${f.ok ? 'bg-green-100' : 'bg-gray-100'}`}>
                {f.ok ? <Check size={10} className="text-green-600" /> : <span className="text-gray-400">·</span>}
              </div>
              <span className={f.ok ? 'text-gray-600' : 'text-gray-400'}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Datos del perfil de salud */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-[#1e3a5f]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Datos de salud</h2>
          </div>
          <button
            onClick={() => setEditingProfile(!editingProfile)}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#1e3a5f] transition-colors"
          >
            {editingProfile ? <><X size={14} /> Cancelar</> : <><Pencil size={14} /> Editar</>}
          </button>
        </div>

        {editingProfile ? (
          <div className="space-y-3">
            {/* Fecha de nacimiento → calcula edad y FC máx automáticamente */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha de nacimiento</label>
              <input
                type="date"
                value={profileForm.dateOfBirth}
                onChange={e => setProfileForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
              />
              {profileForm.dateOfBirth && (
                <p className="text-xs text-gray-400 mt-1">
                  Edad calculada: <span className="font-semibold text-[#1e3a5f]">{calcAge(profileForm.dateOfBirth)} años</span>
                  {' · '}FC máx estimada (Fox): <span className="font-semibold text-[#1e3a5f]">{estimateHrMax(calcAge(profileForm.dateOfBirth))} bpm</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Altura (cm)', key: 'heightCm', type: 'number', placeholder: '175' },
                { label: 'Peso actual (kg)', key: 'weightKg', type: 'number', placeholder: '75.0', step: '0.1' },
                { label: 'Peso objetivo (kg)', key: 'weightGoalKg', type: 'number', placeholder: '70.0', step: '0.1' },
                { label: 'FC reposo (bpm)', key: 'hrResting', type: 'number', placeholder: '55' },
              ].map(({ label, key, type, placeholder, step }) => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
                  <input
                    type={type}
                    step={step}
                    placeholder={placeholder}
                    value={profileForm[key as keyof typeof profileForm]}
                    onChange={e => setProfileForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">FC máxima real (bpm)</label>
                <input
                  type="number"
                  placeholder={computedHrMax?.toString() ?? '185'}
                  value={profileForm.hrMax}
                  onChange={e => setProfileForm(f => ({ ...f, hrMax: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Deja vacío para usar la estimada por Fox (211 − 0.64×edad)</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 -mt-1">
              El seguimiento semanal de peso y FC se hace en el{' '}
              <a href="/checkin" className="underline hover:text-gray-600 transition-colors">Check-in semanal</a>.
              Aquí actualiza solo si hubo un cambio permanente en tu perfil base.
            </p>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Lesiones (separadas por coma)</label>
              <input
                type="text"
                placeholder="Ej: rodilla derecha, fascitis plantar"
                value={profileForm.injuries}
                onChange={e => setProfileForm(f => ({ ...f, injuries: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Condiciones médicas (separadas por coma)</label>
              <input
                type="text"
                placeholder="Ej: hipertensión, diabetes"
                value={profileForm.conditions}
                onChange={e => setProfileForm(f => ({ ...f, conditions: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: savedProfile ? '#22c55e' : '#1e3a5f' }}
            >
              {savedProfile ? <><Check size={16} /> Guardado</> : savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
          </div>
        ) : p ? (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Fecha de nacimiento</span>
                <p className="font-semibold">{p.dateOfBirth ? new Date(p.dateOfBirth + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Edad</span>
                <p className="font-semibold">
                  {p.dateOfBirth ? calcAge(p.dateOfBirth) : p.age} años
                  {p.dateOfBirth && <span className="text-[10px] text-gray-400 ml-1">calculada</span>}
                </p>
              </div>
              <div><span className="text-gray-500 text-xs">Altura</span><p className="font-semibold">{p.heightCm} cm</p></div>
              <div>
                <span className="text-gray-500 text-xs">IMC</span>
                <p className="font-semibold">
                  {bmi ?? '—'}
                  {bmi && <span className="text-[10px] text-gray-400 ml-1">{bmiLabel(bmi)}</span>}
                </p>
              </div>
              <div><span className="text-gray-500 text-xs">Peso actual</span><p className="font-semibold">{p.weightKg} kg</p></div>
              <div><span className="text-gray-500 text-xs">Peso objetivo</span><p className="font-semibold">{p.weightGoalKg ?? '—'} kg</p></div>
              <div><span className="text-gray-500 text-xs">FC reposo</span><p className="font-semibold">{p.hrResting ?? '—'} bpm</p></div>
              <div>
                <span className="text-gray-500 text-xs">FC máxima</span>
                <p className="font-semibold">
                  {displayHrMax ?? '—'} bpm
                  {!p.hrMax && displayHrMax && <span className="text-[10px] text-gray-400 ml-1">estimada</span>}
                </p>
              </div>
            </div>
            {(p.sport || p.experienceLevel) && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Deporte</p>
                <div className="flex flex-wrap gap-2">
                  {p.sport && (
                    <span className="text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold px-2.5 py-1 rounded-full">
                      {({ RUNNING: 'Running', STRENGTH: 'Fuerza', BOTH: 'Running + Fuerza', GYM: 'Gym' } as Record<string, string>)[p.sport] ?? p.sport.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  )}
                  {p.experienceLevel && (
                    <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full capitalize">
                      {p.experienceLevel === 'BEGINNER' ? 'Principiante' : p.experienceLevel === 'INTERMEDIATE' ? 'Intermedio' : 'Avanzado'}
                    </span>
                  )}
                </div>
              </div>
            )}
            {(p.injuries.length > 0 || p.conditions.length > 0) && (
              <div className="pt-3 border-t border-gray-100 space-y-2">
                {p.injuries.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-orange-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Lesiones</p>
                      <p className="text-xs text-gray-500">{p.injuries.join(', ')}</p>
                    </div>
                  </div>
                )}
                {p.conditions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Condiciones médicas</p>
                      <p className="text-xs text-gray-500">{p.conditions.join(', ')}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">No hay datos de perfil. <button onClick={() => setEditingProfile(true)} className="text-[#ea580c] font-medium underline">Agregar datos →</button></p>
        )}
      </div>

      {/* Formulario de métricas diarias */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#ea580c]" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Registro diario</h2>
            {todayLog && (
              <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                Registrado hoy
              </span>
            )}
          </div>
          <a href="/checkin" className="text-xs text-gray-400 hover:text-[#ea580c] transition-colors py-2 -my-2 inline-block">
            Check-in semanal →
          </a>
        </div>
        <p className="text-xs text-gray-400 -mt-1">Métricas objetivas del día: peso, FC reposo y sueño. El <a href="/checkin" className="underline hover:text-gray-600">check-in semanal</a> complementa esto con tu percepción de carga — energía, estrés, RPE y motivación — y es lo que ajusta tu plan de entrenamiento.</p>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Scale size={12} /> Peso (kg)
            </label>
            <input
              type="number"
              step="0.1"
              placeholder={p?.weightKg?.toString() ?? '—'}
              value={form.weightKg}
              onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Heart size={12} /> FC reposo (bpm)
            </label>
            <input
              type="number"
              placeholder={p?.hrResting?.toString() ?? '—'}
              value={form.hrResting}
              onChange={e => setForm(f => ({ ...f, hrResting: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Moon size={12} /> Horas de sueño
            </label>
            <input
              type="number"
              step="0.5"
              placeholder="7.5"
              value={form.sleepHours}
              onChange={e => setForm(f => ({ ...f, sleepHours: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
              <Zap size={12} /> Energía (1-5)
            </label>
            <select
              value={form.energyLevel}
              onChange={e => setForm(f => ({ ...f, energyLevel: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f] bg-white"
            >
              <option value="">— selecciona</option>
              {[1,2,3,4,5].map(n => (
                <option key={n} value={n}>{n} — {ENERGY_LABELS[n]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Notas (opcional)</label>
          <textarea
            placeholder="Ej: dormí mal, pierna cansada..."
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1e3a5f] resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: saved ? '#22c55e' : '#ea580c' }}
        >
          {saved ? <><Check size={16} /> Guardado</> : saving ? 'Guardando...' : todayLog ? 'Actualizar registro de hoy' : 'Guardar métricas'}
        </button>
      </div>

      {/* Historial */}
      {user.dailyLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
          >
            <span>Historial de métricas ({user.dailyLogs.length} registros)</span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHistory && (
            <div className="divide-y divide-gray-100">
              {user.dailyLogs.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">{new Date(log.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <div className="flex flex-wrap gap-2">
                    {log.weightKg && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">⚖️ {log.weightKg} kg</span>}
                    {log.hrResting && <span className="text-xs bg-red-50 px-2 py-0.5 rounded-full">❤️ {log.hrResting} bpm</span>}
                    {log.sleepHours && <span className="text-xs bg-indigo-50 px-2 py-0.5 rounded-full">🌙 {log.sleepHours}h sueño</span>}
                    {log.energyLevel && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_COLORS[log.energyLevel]}`}>
                        ⚡ {ENERGY_LABELS[log.energyLevel]}
                      </span>
                    )}
                  </div>
                  {log.notes && <p className="text-xs text-gray-500 mt-1 italic">"{log.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  )
}

// ── Mobile menu helpers ──────────────────────────────────────────────────────

function MobileMenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3.5 pb-2">{title}</p>
      <div className="bg-white rounded-2xl mx-4 shadow-sm overflow-hidden">{children}</div>
    </div>
  )
}

function MobileMenuItem({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3.5 px-4 py-[15px]">
      <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-sm">{icon}</div>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      {value && <span className="text-sm text-gray-400">{value}</span>}
    </div>
  )
}

function MobileMenuLink({ icon, label, href, external }: { icon: string; label: string; href: string; external?: boolean }) {
  const inner = (
    <>
      <div className="w-9 h-9 rounded-[10px] bg-gray-100 flex items-center justify-center text-sm">{icon}</div>
      <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
      <ChevronRight size={16} className="text-gray-300" />
    </>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3.5 px-4 py-[15px]">
        {inner}
      </a>
    )
  }

  return (
    <Link href={href} className="flex items-center gap-3.5 px-4 py-[15px]">
      {inner}
    </Link>
  )
}

function MobileMenuDivider() {
  return <div className="h-px bg-[#f1f5f9] ml-[66px]" />
}
