'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardData = {
  // Paso 1
  goalType: 'RACE' | 'BODY' | 'FITNESS' | null
  // Paso 2
  raceDistance: 'RACE_5K' | 'RACE_10K' | 'RACE_HALF_MARATHON' | 'RACE_MARATHON' | 'RACE_TRIATHLON' | 'RACE_CYCLING' | null
  bodyGoal: 'FAT_LOSS' | 'MUSCLE_GAIN' | 'RECOMPOSITION' | null
  // Paso 3
  raceDate: string | null
  targetTime: string | null
  weightGoalKg: number | null
  // Paso 4
  age: number | null
  heightCm: number | null
  weightKg: number | null
  hrResting: number | null
  hrMax: number | null
  // Paso 5
  recentBest5k: string | null
  recentBest10k: string | null
  recentBestHalf: string | null
  lastRaceMonthsAgo: number | null
  arrivedTrained: boolean | null
  // Paso 6
  injuries: string[]
  conditions: string[]
  sleepHoursAvg: number | null
  // Paso 7
  daysPerWeek: number
  hoursPerSession: number
  city: string
  equipment: string[]
  // Paso 8
  nutritionCommitment: 'strict' | 'moderate' | 'flexible' | null
  hrTestAvailable: boolean | null
}

const INITIAL_DATA: WizardData = {
  goalType: null,
  raceDistance: null,
  bodyGoal: null,
  raceDate: null,
  targetTime: null,
  weightGoalKg: null,
  age: null,
  heightCm: null,
  weightKg: null,
  hrResting: null,
  hrMax: null,
  recentBest5k: null,
  recentBest10k: null,
  recentBestHalf: null,
  lastRaceMonthsAgo: null,
  arrivedTrained: null,
  injuries: [],
  conditions: [],
  sleepHoursAvg: 7,
  daysPerWeek: 4,
  hoursPerSession: 1,
  city: '',
  equipment: [],
  nutritionCommitment: null,
  hrTestAvailable: null,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SelectCard({
  selected,
  onClick,
  icon,
  label,
  subtext,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  label: string
  subtext?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-150 flex items-start gap-4',
        selected
          ? 'border-[#f97316] bg-[#f97316]/8'
          : 'border-gray-200 bg-white hover:border-[#1e3a5f]/40'
      )}
    >
      <span className="text-2xl leading-none mt-0.5">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span
          className={cn(
            'font-semibold text-base',
            selected ? 'text-[#f97316]' : 'text-[#1e3a5f]'
          )}
        >
          {label}
        </span>
        {subtext && <span className="text-sm text-gray-500">{subtext}</span>}
      </span>
      <span
        className={cn(
          'ml-auto w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors',
          selected ? 'border-[#f97316] bg-[#f97316]' : 'border-gray-300'
        )}
      >
        {selected && (
          <svg viewBox="0 0 20 20" fill="white" className="w-full h-full p-0.5">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
    </button>
  )
}

function CheckCard({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all duration-150',
        selected
          ? 'border-[#f97316] bg-[#f97316]/8 text-[#f97316]'
          : 'border-gray-200 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/40'
      )}
    >
      {label}
    </button>
  )
}

function ToggleBtn({
  selected,
  onClick,
  label,
}: {
  selected: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-150',
        selected
          ? 'border-[#f97316] bg-[#f97316] text-white'
          : 'border-gray-200 bg-white text-[#1e3a5f] hover:border-[#1e3a5f]/40'
      )}
    >
      {label}
    </button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-[#1e3a5f] mb-1.5">{children}</p>
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-[#1e3a5f] transition-colors bg-white"
    />
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">{children}</h2>
  )
}

function StepSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-500 text-sm mb-6">{children}</p>
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function Step1({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <StepTitle>¿Cuál es tu objetivo?</StepTitle>
      <StepSubtitle>Elige el que mejor describe lo que buscas lograr.</StepSubtitle>
      <SelectCard
        selected={data.goalType === 'RACE'}
        onClick={() => update({ goalType: 'RACE' })}
        icon="🏃"
        label="Tengo una carrera"
        subtext="Running, ciclismo, triatlón..."
      />
      <SelectCard
        selected={data.goalType === 'BODY'}
        onClick={() => update({ goalType: 'BODY' })}
        icon="💪"
        label="Quiero cambiar mi cuerpo"
        subtext="Bajar grasa, ganar músculo o ambos"
      />
      <SelectCard
        selected={data.goalType === 'FITNESS'}
        onClick={() => update({ goalType: 'FITNESS' })}
        icon="⚡"
        label="Mejorar mi condición"
        subtext="Fitness general sin meta específica"
      />
    </div>
  )
}

function Step2({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  if (data.goalType === 'RACE') {
    const distances = [
      { value: 'RACE_5K', label: '5K' },
      { value: 'RACE_10K', label: '10K' },
      { value: 'RACE_HALF_MARATHON', label: 'Media maratón' },
      { value: 'RACE_MARATHON', label: 'Maratón' },
      { value: 'RACE_TRIATHLON', label: 'Triatlón' },
      { value: 'RACE_CYCLING', label: 'Ciclismo' },
    ] as const

    return (
      <div className="flex flex-col gap-3">
        <StepTitle>¿Qué distancia?</StepTitle>
        <StepSubtitle>Selecciona la modalidad de tu evento.</StepSubtitle>
        {distances.map((d) => (
          <SelectCard
            key={d.value}
            selected={data.raceDistance === d.value}
            onClick={() => update({ raceDistance: d.value })}
            icon="🏅"
            label={d.label}
          />
        ))}
      </div>
    )
  }

  if (data.goalType === 'BODY') {
    return (
      <div className="flex flex-col gap-3">
        <StepTitle>¿Qué tipo de cambio?</StepTitle>
        <StepSubtitle>Sé específico para que el plan sea más preciso.</StepSubtitle>
        <SelectCard
          selected={data.bodyGoal === 'FAT_LOSS'}
          onClick={() => update({ bodyGoal: 'FAT_LOSS' })}
          icon="🔥"
          label="Bajar grasa"
          subtext="Reducir % de grasa corporal"
        />
        <SelectCard
          selected={data.bodyGoal === 'MUSCLE_GAIN'}
          onClick={() => update({ bodyGoal: 'MUSCLE_GAIN' })}
          icon="💪"
          label="Ganar músculo"
          subtext="Aumentar masa muscular"
        />
        <SelectCard
          selected={data.bodyGoal === 'RECOMPOSITION'}
          onClick={() => update({ bodyGoal: 'RECOMPOSITION' })}
          icon="⚖️"
          label="Los dos (recomposición)"
          subtext="Bajar grasa y ganar músculo simultáneamente"
        />
      </div>
    )
  }

  return null
}

function Step3({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  if (data.goalType === 'RACE') {
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Tu fecha y tiempo objetivo</StepTitle>
        <StepSubtitle>Esto define la periodización completa de tu plan.</StepSubtitle>
        <div>
          <Label>Fecha de la carrera</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
        <div>
          <Label>Tiempo objetivo (HH:MM:SS) — opcional</Label>
          <Input
            type="text"
            placeholder="01:45:00"
            value={data.targetTime ?? ''}
            onChange={(e) => update({ targetTime: e.target.value || null })}
          />
          <p className="text-xs text-gray-400 mt-1">Déjalo vacío si no tienes un tiempo específico.</p>
        </div>
      </div>
    )
  }

  if (data.goalType === 'BODY') {
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Tu meta de peso</StepTitle>
        <StepSubtitle>Nos ayuda a calibrar la velocidad de cambio saludable.</StepSubtitle>
        <div>
          <Label>Peso objetivo (kg)</Label>
          <Input
            type="number"
            placeholder="70"
            value={data.weightGoalKg ?? ''}
            onChange={(e) =>
              update({ weightGoalKg: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div>
          <Label>Fecha aproximada para alcanzarlo</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  if (data.goalType === 'FITNESS') {
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>¿Qué quieres lograr?</StepTitle>
        <StepSubtitle>Descríbelo con tus palabras.</StepSubtitle>
        <div>
          <Label>Describe tu objetivo de condición física</Label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-[#1e3a5f] transition-colors bg-white resize-none"
            rows={4}
            placeholder="Ej: quiero poder correr 5K sin parar, mejorar mi energía diaria, sentirme más ágil..."
            value={data.targetTime ?? ''}
            onChange={(e) => update({ targetTime: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  return null
}

function Step4({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Tus datos físicos</StepTitle>
      <StepSubtitle>Necesitamos esto para calcular tus zonas de entrenamiento y TDEE.</StepSubtitle>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Edad (años)</Label>
          <Input
            type="number"
            placeholder="32"
            value={data.age ?? ''}
            onChange={(e) => update({ age: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label>Talla (cm)</Label>
          <Input
            type="number"
            placeholder="170"
            value={data.heightCm ?? ''}
            onChange={(e) => update({ heightCm: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>
      <div>
        <Label>Peso actual (kg)</Label>
        <Input
          type="number"
          placeholder="68"
          value={data.weightKg ?? ''}
          onChange={(e) => update({ weightKg: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <div>
        <Label>FC en reposo (bpm) — ¿Tienes reloj deportivo?</Label>
        <Input
          type="number"
          placeholder="58"
          value={data.hrResting ?? ''}
          onChange={(e) => update({ hrResting: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <div>
        <Label>FC máxima (bpm) — Opcional, si no la conoces la calculamos</Label>
        <Input
          type="number"
          placeholder="185"
          value={data.hrMax ?? ''}
          onChange={(e) => update({ hrMax: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
    </div>
  )
}

function Step5({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const lastRaceOptions = [
    { label: 'Este mes', value: 0 },
    { label: '1–3 meses', value: 2 },
    { label: '3–6 meses', value: 4 },
    { label: 'Más de 6 meses', value: 7 },
    { label: 'Nunca', value: 99 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Tu historial deportivo</StepTitle>
      <StepSubtitle>Opcional — pero nos ayuda a calibrar mejor el punto de partida.</StepSubtitle>
      <div>
        <Label>Mejor tiempo reciente en 5K (MM:SS)</Label>
        <Input
          type="text"
          placeholder="28:30"
          value={data.recentBest5k ?? ''}
          onChange={(e) => update({ recentBest5k: e.target.value || null })}
        />
      </div>
      <div>
        <Label>Mejor tiempo reciente en 10K (MM:SS)</Label>
        <Input
          type="text"
          placeholder="58:00"
          value={data.recentBest10k ?? ''}
          onChange={(e) => update({ recentBest10k: e.target.value || null })}
        />
      </div>
      <div>
        <Label>¿Cuándo fue tu última carrera o competencia?</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {lastRaceOptions.map((opt) => (
            <ToggleBtn
              key={opt.value}
              selected={data.lastRaceMonthsAgo === opt.value}
              onClick={() => update({ lastRaceMonthsAgo: opt.value })}
              label={opt.label}
            />
          ))}
        </div>
      </div>
      {data.lastRaceMonthsAgo !== null && data.lastRaceMonthsAgo !== 99 && (
        <div>
          <Label>¿Llegaste entrenado o improvisado a esa carrera?</Label>
          <div className="flex gap-3 mt-1">
            <ToggleBtn
              selected={data.arrivedTrained === true}
              onClick={() => update({ arrivedTrained: true })}
              label="Entrenado"
            />
            <ToggleBtn
              selected={data.arrivedTrained === false}
              onClick={() => update({ arrivedTrained: false })}
              label="Improvisado"
            />
          </div>
        </div>
      )}
    </div>
  )
}

const INJURY_OPTIONS = ['Rodilla', 'Tobillo', 'Cadera', 'Hombro', 'Espalda', 'Ninguna']
const CONDITION_OPTIONS = ['Hipertensión', 'Diabetes', 'Problemas cardíacos', 'Tiroides', 'Ninguna']

function Step6({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  function toggleInjury(item: string) {
    if (item === 'Ninguna') {
      update({ injuries: data.injuries.includes('Ninguna') ? [] : ['Ninguna'] })
      return
    }
    const next = data.injuries.includes(item)
      ? data.injuries.filter((i) => i !== item)
      : [...data.injuries.filter((i) => i !== 'Ninguna'), item]
    update({ injuries: next })
  }

  function toggleCondition(item: string) {
    if (item === 'Ninguna') {
      update({ conditions: data.conditions.includes('Ninguna') ? [] : ['Ninguna'] })
      return
    }
    const next = data.conditions.includes(item)
      ? data.conditions.filter((c) => c !== item)
      : [...data.conditions.filter((c) => c !== 'Ninguna'), item]
    update({ conditions: next })
  }

  const hasCardiacRisk = data.conditions.includes('Problemas cardíacos')

  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Tu salud</StepTitle>
      <StepSubtitle>Esta información es confidencial y solo se usa para ajustar tu plan.</StepSubtitle>

      <div>
        <Label>Lesiones o molestias actuales (selección múltiple)</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {INJURY_OPTIONS.map((item) => (
            <CheckCard
              key={item}
              selected={data.injuries.includes(item)}
              onClick={() => toggleInjury(item)}
              label={item}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Condiciones médicas relevantes (selección múltiple)</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {CONDITION_OPTIONS.map((item) => (
            <CheckCard
              key={item}
              selected={data.conditions.includes(item)}
              onClick={() => toggleCondition(item)}
              label={item}
            />
          ))}
        </div>
      </div>

      {hasCardiacRisk && (
        <div className="px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm">
          ⚠️ Recomendamos consultar con tu médico antes de iniciar. Puedes continuar — nuestro plan incluirá una nota al respecto.
        </div>
      )}

      <div>
        <Label>Promedio de horas de sueño por noche: {data.sleepHoursAvg}h</Label>
        <input
          type="range"
          min={4}
          max={10}
          step={0.5}
          value={data.sleepHoursAvg ?? 7}
          onChange={(e) => update({ sleepHoursAvg: Number(e.target.value) })}
          className="w-full accent-[#f97316] mt-1"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>4h</span>
          <span>10h</span>
        </div>
      </div>
    </div>
  )
}

const EQUIPMENT_OPTIONS = [
  'Pista atlética',
  'Cicla/rodillo',
  'Piscina',
  'Gimnasio',
  'Solo calle/parque',
]

function Step7({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  function toggleEquipment(item: string) {
    const next = data.equipment.includes(item)
      ? data.equipment.filter((e) => e !== item)
      : [...data.equipment, item]
    update({ equipment: next })
  }

  const daysOptions = [3, 4, 5, 6]
  const hoursOptions = [
    { label: '45 min', value: 0.75 },
    { label: '1h', value: 1 },
    { label: '1h 30', value: 1.5 },
    { label: '2h', value: 2 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Tu logística</StepTitle>
      <StepSubtitle>Define cuánto tiempo y recursos tienes disponibles.</StepSubtitle>

      <div>
        <Label>Días disponibles para entrenar por semana</Label>
        <div className="flex gap-2 mt-1">
          {daysOptions.map((d) => (
            <ToggleBtn
              key={d}
              selected={data.daysPerWeek === d}
              onClick={() => update({ daysPerWeek: d })}
              label={`${d} días`}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Horas por sesión</Label>
        <div className="flex gap-2 flex-wrap mt-1">
          {hoursOptions.map((h) => (
            <ToggleBtn
              key={h.value}
              selected={data.hoursPerSession === h.value}
              onClick={() => update({ hoursPerSession: h.value })}
              label={h.label}
            />
          ))}
        </div>
      </div>

      <div>
        <Label>Ciudad donde entrenas</Label>
        <Input
          type="text"
          placeholder="Bogotá, Medellín, Ciudad de México..."
          value={data.city}
          onChange={(e) => update({ city: e.target.value })}
        />
        <p className="text-xs text-gray-400 mt-1">La altitud afecta el entrenamiento aeróbico.</p>
      </div>

      <div>
        <Label>Equipamiento disponible (selección múltiple)</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {EQUIPMENT_OPTIONS.map((item) => (
            <CheckCard
              key={item}
              selected={data.equipment.includes(item)}
              onClick={() => toggleEquipment(item)}
              label={item}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Step8({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <StepTitle>Tu compromiso</StepTitle>
      <StepSubtitle>Dos preguntas finales para afinar las recomendaciones.</StepSubtitle>

      <div className="flex flex-col gap-3">
        <p className="font-semibold text-[#1e3a5f] text-sm">
          ¿Qué tan dispuesto estás a ajustar tu alimentación?
        </p>
        <SelectCard
          selected={data.nutritionCommitment === 'strict'}
          onClick={() => update({ nutritionCommitment: 'strict' })}
          icon="🎯"
          label="Total"
          subtext="Puedo seguir un plan estricto"
        />
        <SelectCard
          selected={data.nutritionCommitment === 'moderate'}
          onClick={() => update({ nutritionCommitment: 'moderate' })}
          icon="👍"
          label="Moderado"
          subtext="Puedo hacer algunos ajustes"
        />
        <SelectCard
          selected={data.nutritionCommitment === 'flexible'}
          onClick={() => update({ nutritionCommitment: 'flexible' })}
          icon="🙌"
          label="Flexible"
          subtext="Prefiero solo recomendaciones generales"
        />
      </div>

      {data.goalType === 'RACE' && (
        <div className="flex flex-col gap-3">
          <p className="font-semibold text-[#1e3a5f] text-sm">
            ¿Puedes hacer un test de FC máxima esta semana?
          </p>
          <SelectCard
            selected={data.hrTestAvailable === true}
            onClick={() => update({ hrTestAvailable: true })}
            icon="✅"
            label="Sí, lo hago"
            subtext="Tendré datos precisos de mis zonas"
          />
          <SelectCard
            selected={data.hrTestAvailable === false}
            onClick={() => update({ hrTestAvailable: false })}
            icon="📅"
            label="Lo haré después"
            subtext="Lo agrego cuando pueda"
          />
          <SelectCard
            selected={data.hrTestAvailable === null && data.nutritionCommitment !== null ? false : false}
            onClick={() => update({ hrTestAvailable: null })}
            icon="🧮"
            label="Prefiero usar la fórmula"
            subtext="Usamos 211 - 0.64 × edad"
          />
        </div>
      )}
    </div>
  )
}

// Paso 9 — Generando plan
function Step9({ data }: { data: WizardData }) {
  const messages = [
    'Analizando tu perfil...',
    'Calculando zonas de entrenamiento...',
    'Personalizando tu plan...',
  ]

  const [msgIndex] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#1e3a5f]/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#f97316] animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🏅</span>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[#1e3a5f]">{messages[msgIndex]}</p>
        <p className="text-sm text-gray-400 mt-1">Esto solo toma unos segundos</p>
      </div>
      {/* Suppress unused var warning */}
      <span className="hidden">{JSON.stringify(data).length}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Wizard controller
// ---------------------------------------------------------------------------

function getStepCount(data: WizardData) {
  // FITNESS skips step 2 and step 3 is different (textarea)
  return 9
}

function getStepLabel(step: number) {
  const labels = [
    'Objetivo',
    'Meta específica',
    'Detalles',
    'Datos físicos',
    'Historial',
    'Salud',
    'Logística',
    'Compromiso',
    'Generando plan',
  ]
  return labels[step - 1] ?? ''
}

function isStepValid(step: number, data: WizardData): boolean {
  switch (step) {
    case 1:
      return data.goalType !== null
    case 2:
      if (data.goalType === 'RACE') return data.raceDistance !== null
      if (data.goalType === 'BODY') return data.bodyGoal !== null
      return true // FITNESS skips
    case 3:
      if (data.goalType === 'RACE') return !!data.raceDate
      if (data.goalType === 'BODY') return !!data.weightGoalKg
      return true
    case 4:
      return !!(data.age && data.heightCm && data.weightKg)
    case 5:
      return true // all optional
    case 6:
      return data.sleepHoursAvg !== null
    case 7:
      return !!data.city && data.equipment.length > 0
    case 8:
      return data.nutritionCommitment !== null
    default:
      return true
  }
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSteps = getStepCount(data)

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  function nextStep() {
    if (!isStepValid(step, data)) return
    // FITNESS skips step 2
    if (step === 1 && data.goalType === 'FITNESS') {
      setStep(3)
      return
    }
    if (step >= 8) {
      handleGenerate()
      return
    }
    setStep((s) => s + 1)
  }

  function prevStep() {
    if (step === 1) return
    // FITNESS reverses skip
    if (step === 3 && data.goalType === 'FITNESS') {
      setStep(1)
      return
    }
    setStep((s) => s - 1)
  }

  async function handleGenerate() {
    setStep(9)
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/onboarding/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Error generando el plan')

      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStep(8)
    } finally {
      setIsGenerating(false)
    }
  }

  const stepContent: Record<number, React.ReactNode> = {
    1: <Step1 data={data} update={update} />,
    2: <Step2 data={data} update={update} />,
    3: <Step3 data={data} update={update} />,
    4: <Step4 data={data} update={update} />,
    5: <Step5 data={data} update={update} />,
    6: <Step6 data={data} update={update} />,
    7: <Step7 data={data} update={update} />,
    8: <Step8 data={data} update={update} />,
    9: <Step9 data={data} />,
  }

  // Effective step for progress bar (FITNESS skips step 2)
  const effectiveStep = step === 3 && data.goalType === 'FITNESS' ? 2 : step
  const effectiveTotal = data.goalType === 'FITNESS' ? 8 : 9
  const progressPct = Math.min((effectiveStep / effectiveTotal) * 100, 100)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header fijo */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-[#1e3a5f]">Medaliq</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 text-sm flex-1">
            Paso {effectiveStep} de {effectiveTotal} — {getStepLabel(step)}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Salir
          </button>
        </div>
        {/* Barra de progreso */}
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-1 bg-[#f97316] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Contenido del paso */}
      <main className="flex-1 max-w-[600px] w-full mx-auto px-4 py-8 pb-32">
        <div
          key={step}
          className="animate-in fade-in slide-in-from-right-4 duration-200"
        >
          {stepContent[step]}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Footer fijo — navegación */}
      {step !== 9 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-[600px] mx-auto px-4 py-4 flex gap-3">
            {step > 1 && (
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isGenerating}
                className="flex-1 border-2 border-gray-200 text-[#1e3a5f] font-semibold py-3 rounded-xl"
              >
                ← Atrás
              </Button>
            )}
            <Button
              onClick={nextStep}
              disabled={!isStepValid(step, data) || isGenerating}
              className={`flex-1 bg-[#f97316] hover:bg-[#ea6c0e] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${step === 1 ? 'w-full' : ''}`}
            >
              {step === 8 ? 'Generar mi plan →' : 'Siguiente →'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
