'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  WizardData,
  INITIAL_DATA,
  getSteps,
  StepId,
  Sport,
} from './_types'

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

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
        <span className={cn('font-semibold text-base', selected ? 'text-[#f97316]' : 'text-[#1e3a5f]')}>
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

function CheckCard({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
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

function ToggleBtn({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
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
  return <h2 className="text-2xl font-bold text-[#1e3a5f] mb-1">{children}</h2>
}

function StepSubtitle({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-500 text-sm mb-6">{children}</p>
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepMainGoal({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <StepTitle>¿Cuál es tu objetivo?</StepTitle>
      <StepSubtitle>Esto define el tipo de plan que vamos a construir para ti.</StepSubtitle>
      <SelectCard
        selected={data.mainGoal === 'SPORT'}
        onClick={() => update({ mainGoal: 'SPORT', bodyGoal: null })}
        icon="🏅"
        label="Mejorar en un deporte"
        subtext="Running, ciclismo, natación, triatlón, fútbol o fuerza"
      />
      <SelectCard
        selected={data.mainGoal === 'BODY'}
        onClick={() => update({ mainGoal: 'BODY', sport: null })}
        icon="💪"
        label="Cambiar mi cuerpo"
        subtext="Bajar grasa, ganar músculo o recomposición"
      />
    </div>
  )
}

function StepSportSelect({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const sports: { value: Sport; icon: string; label: string; subtext: string }[] = [
    { value: 'RUNNING', icon: '🏃', label: 'Running', subtext: '5K, 10K, media maratón, maratón' },
    { value: 'CYCLING', icon: '🚴', label: 'Ciclismo', subtext: 'Ruta o MTB' },
    { value: 'SWIMMING', icon: '🏊', label: 'Natación', subtext: 'Competencia o fitness' },
    { value: 'TRIATHLON', icon: '🏆', label: 'Triatlón', subtext: 'Sprint, olímpico, medio o full' },
    { value: 'FOOTBALL', icon: '⚽', label: 'Fútbol', subtext: 'Amateur, semipro o recreativo' },
    { value: 'STRENGTH', icon: '🏋️', label: 'Fuerza', subtext: 'Powerlifting, hipertrofia o funcional' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <StepTitle>¿Qué deporte practicas?</StepTitle>
      <StepSubtitle>Selecciona tu deporte principal.</StepSubtitle>
      {sports.map((s) => (
        <SelectCard
          key={s.value}
          selected={data.sport === s.value}
          onClick={() => update({ sport: s.value })}
          icon={s.icon}
          label={s.label}
          subtext={s.subtext}
        />
      ))}
    </div>
  )
}

function StepBodyGoal({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
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
        icon="📈"
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

function StepSportDetails({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const sport = data.mainGoal === 'SPORT' ? data.sport : null

  // RUNNING
  if (sport === 'RUNNING') {
    const distances = [
      { value: 'RACE_5K' as const, label: '5K' },
      { value: 'RACE_10K' as const, label: '10K' },
      { value: 'RACE_HALF_MARATHON' as const, label: 'Media maratón' },
      { value: 'RACE_MARATHON' as const, label: 'Maratón' },
    ]
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de running</StepTitle>
        <StepSubtitle>Cuéntanos sobre tu meta de carrera.</StepSubtitle>
        <div>
          <Label>Distancia objetivo</Label>
          <div className="flex flex-col gap-2 mt-1">
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
        </div>
        <div>
          <Label>Fecha de la carrera (opcional)</Label>
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
        </div>
        <div>
          <Label>Mejor tiempo reciente en esa distancia — opcional</Label>
          <Input
            type="text"
            placeholder="28:30"
            value={data.recentBestTime ?? ''}
            onChange={(e) => update({ recentBestTime: e.target.value || null })}
          />
          <p className="text-xs text-gray-400 mt-1">Formato MM:SS o HH:MM:SS</p>
        </div>
      </div>
    )
  }

  // CYCLING
  if (sport === 'CYCLING') {
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de ciclismo</StepTitle>
        <StepSubtitle>Para calibrar tu plan según tu modalidad y equipo.</StepSubtitle>
        <div>
          <Label>Modalidad</Label>
          <div className="flex gap-3 mt-1">
            <ToggleBtn
              selected={data.cyclingModality === 'ROAD'}
              onClick={() => update({ cyclingModality: 'ROAD' })}
              label="Ruta"
            />
            <ToggleBtn
              selected={data.cyclingModality === 'MTB'}
              onClick={() => update({ cyclingModality: 'MTB' })}
              label="MTB"
            />
          </div>
        </div>
        <div>
          <Label>¿Tienes medidor de potencia?</Label>
          <div className="flex gap-3 mt-1">
            <ToggleBtn
              selected={data.hasPowerMeter === true}
              onClick={() => update({ hasPowerMeter: true })}
              label="Sí"
            />
            <ToggleBtn
              selected={data.hasPowerMeter === false}
              onClick={() => update({ hasPowerMeter: false })}
              label="No"
            />
          </div>
        </div>
        {data.hasPowerMeter && (
          <div>
            <Label>FTP actual (watts) — opcional</Label>
            <Input
              type="number"
              placeholder="220"
              value={data.ftp ?? ''}
              onChange={(e) => update({ ftp: e.target.value ? Number(e.target.value) : null })}
            />
            <p className="text-xs text-gray-400 mt-1">Functional Threshold Power — puedes dejarlo en blanco si no lo conoces.</p>
          </div>
        )}
        <div>
          <Label>Fecha del próximo evento (opcional)</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  // SWIMMING
  if (sport === 'SWIMMING') {
    const strokes = [
      { value: 'FREESTYLE' as const, label: 'Libre' },
      { value: 'BACKSTROKE' as const, label: 'Espalda' },
      { value: 'BREASTSTROKE' as const, label: 'Pecho' },
      { value: 'BUTTERFLY' as const, label: 'Mariposa' },
      { value: 'MIXED' as const, label: 'Mixto / 4 estilos' },
    ]
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de natación</StepTitle>
        <StepSubtitle>Tu estilo y marcas recientes.</StepSubtitle>
        <div>
          <Label>Estilo principal</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {strokes.map((s) => (
              <ToggleBtn
                key={s.value}
                selected={data.swimStroke === s.value}
                onClick={() => update({ swimStroke: s.value })}
                label={s.label}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Mejor tiempo en 100m (MM:SS) — opcional</Label>
          <Input
            type="text"
            placeholder="01:20"
            value={data.recentSwimTime ?? ''}
            onChange={(e) => update({ recentSwimTime: e.target.value || null })}
          />
        </div>
        <div>
          <Label>Fecha del próximo evento (opcional)</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  // TRIATHLON
  if (sport === 'TRIATHLON') {
    const distances = [
      { value: 'SPRINT' as const, label: 'Sprint', subtext: '750m · 20km · 5km' },
      { value: 'OLYMPIC' as const, label: 'Olímpico', subtext: '1.5km · 40km · 10km' },
      { value: 'HALF' as const, label: 'Medio (70.3)', subtext: '1.9km · 90km · 21km' },
      { value: 'FULL' as const, label: 'Full (140.6)', subtext: '3.8km · 180km · 42km' },
    ]
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de triatlón</StepTitle>
        <StepSubtitle>Distancia objetivo y tu segmento más débil.</StepSubtitle>
        <div>
          <Label>Distancia objetivo</Label>
          <div className="flex flex-col gap-2 mt-1">
            {distances.map((d) => (
              <SelectCard
                key={d.value}
                selected={data.triathlonDistance === d.value}
                onClick={() => update({ triathlonDistance: d.value })}
                icon="🏆"
                label={d.label}
                subtext={d.subtext}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Segmento más débil</Label>
          <div className="flex gap-3 mt-1">
            {(['SWIM', 'BIKE', 'RUN'] as const).map((s) => (
              <ToggleBtn
                key={s}
                selected={data.weakestSegment === s}
                onClick={() => update({ weakestSegment: s })}
                label={s === 'SWIM' ? 'Natación' : s === 'BIKE' ? 'Ciclismo' : 'Running'}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Fecha del evento (opcional)</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  // FOOTBALL
  if (sport === 'FOOTBALL') {
    const positions = [
      { value: 'GOALKEEPER' as const, label: 'Portero' },
      { value: 'DEFENDER' as const, label: 'Defensa' },
      { value: 'MIDFIELDER' as const, label: 'Mediocampista' },
      { value: 'FORWARD' as const, label: 'Delantero' },
    ]
    const levels = [
      { value: 'RECREATIONAL' as const, label: 'Recreativo' },
      { value: 'AMATEUR' as const, label: 'Amateur' },
      { value: 'SEMIPRO' as const, label: 'Semipro' },
    ]
    const phases = [
      { value: 'PRESEASON' as const, label: 'Pretemporada' },
      { value: 'INSEASON' as const, label: 'En temporada' },
      { value: 'OFFSEASON' as const, label: 'Fuera de temporada' },
    ]
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de fútbol</StepTitle>
        <StepSubtitle>Posición, nivel y momento de la temporada.</StepSubtitle>
        <div>
          <Label>Posición</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {positions.map((p) => (
              <ToggleBtn
                key={p.value}
                selected={data.footballPosition === p.value}
                onClick={() => update({ footballPosition: p.value })}
                label={p.label}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Nivel de competencia</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {levels.map((l) => (
              <ToggleBtn
                key={l.value}
                selected={data.competitionLevel === l.value}
                onClick={() => update({ competitionLevel: l.value })}
                label={l.label}
              />
            ))}
          </div>
        </div>
        <div>
          <Label>Fase de temporada</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {phases.map((ph) => (
              <ToggleBtn
                key={ph.value}
                selected={data.seasonPhase === ph.value}
                onClick={() => update({ seasonPhase: ph.value })}
                label={ph.label}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // STRENGTH
  if (sport === 'STRENGTH') {
    const styles = [
      { value: 'POWERLIFTING' as const, icon: '🏋️', label: 'Powerlifting', subtext: 'Sentadilla, press banca, peso muerto' },
      { value: 'HYPERTROPHY' as const, icon: '💪', label: 'Hipertrofia', subtext: 'Ganar tamaño muscular' },
      { value: 'FUNCTIONAL' as const, icon: '⚡', label: 'Funcional', subtext: 'Crossfit, calistenia, fuerza general' },
    ]
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Detalles de fuerza</StepTitle>
        <StepSubtitle>¿Cuál es tu enfoque de entrenamiento?</StepSubtitle>
        {styles.map((s) => (
          <SelectCard
            key={s.value}
            selected={data.strengthStyle === s.value}
            onClick={() => update({ strengthStyle: s.value })}
            icon={s.icon}
            label={s.label}
            subtext={s.subtext}
          />
        ))}
      </div>
    )
  }

  // BODY goal (no sport)
  if (data.mainGoal === 'BODY') {
    return (
      <div className="flex flex-col gap-5">
        <StepTitle>Tu meta de composición corporal</StepTitle>
        <StepSubtitle>Estos datos nos ayudan a calcular la velocidad de cambio saludable.</StepSubtitle>
        <div>
          <Label>Peso objetivo (kg)</Label>
          <Input
            type="number"
            placeholder="68"
            value={data.weightGoalKg ?? ''}
            onChange={(e) => update({ weightGoalKg: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label>Fecha aproximada para alcanzarlo (opcional)</Label>
          <Input
            type="date"
            value={data.raceDate ?? ''}
            onChange={(e) => update({ raceDate: e.target.value || null })}
          />
        </div>
      </div>
    )
  }

  return null
}

function StepPhysical({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
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
        <Label>Género</Label>
        <div className="flex gap-3 mt-1">
          <ToggleBtn
            selected={data.gender === 'male'}
            onClick={() => update({ gender: 'male' })}
            label="Hombre"
          />
          <ToggleBtn
            selected={data.gender === 'female'}
            onClick={() => update({ gender: 'female' })}
            label="Mujer"
          />
        </div>
      </div>
      {data.mainGoal === 'BODY' && (
        <div>
          <Label>Peso objetivo (kg) — opcional si ya lo ingresaste</Label>
          <Input
            type="number"
            placeholder="65"
            value={data.weightGoalKg ?? ''}
            onChange={(e) => update({ weightGoalKg: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      )}
    </div>
  )
}

function StepHRFitness({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const showHR = data.mainGoal === 'SPORT' && data.sport !== 'STRENGTH'

  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Condición física</StepTitle>
      <StepSubtitle>Datos para personalizar las zonas e intensidades del plan.</StepSubtitle>

      <div>
        <Label>Nivel de experiencia</Label>
        <div className="flex flex-col gap-2 mt-1">
          <SelectCard
            selected={data.experienceLevel === 'BEGINNER'}
            onClick={() => update({ experienceLevel: 'BEGINNER' })}
            icon="🌱"
            label="Principiante"
            subtext="Menos de 1 año entrenando este deporte"
          />
          <SelectCard
            selected={data.experienceLevel === 'INTERMEDIATE'}
            onClick={() => update({ experienceLevel: 'INTERMEDIATE' })}
            icon="📈"
            label="Intermedio"
            subtext="1–3 años con entrenamiento regular"
          />
          <SelectCard
            selected={data.experienceLevel === 'ADVANCED'}
            onClick={() => update({ experienceLevel: 'ADVANCED' })}
            icon="🏆"
            label="Avanzado"
            subtext="Más de 3 años y experiencia en competencias"
          />
        </div>
      </div>

      {showHR && (
        <>
          <div>
            <Label>FC máxima (bpm)</Label>
            <div className="flex gap-3 mt-1 mb-3">
              <ToggleBtn
                selected={data.hrSource === 'known'}
                onClick={() => update({ hrSource: 'known' })}
                label="La conozco"
              />
              <ToggleBtn
                selected={data.hrSource === 'estimated'}
                onClick={() => update({ hrSource: 'estimated', hrMax: null })}
                label="Que la estime el sistema"
              />
            </div>
            {data.hrSource === 'known' && (
              <Input
                type="number"
                placeholder="185"
                value={data.hrMax ?? ''}
                onChange={(e) => update({ hrMax: e.target.value ? Number(e.target.value) : null })}
              />
            )}
            {data.hrSource === 'estimated' && data.age && (
              <p className="text-xs text-gray-400 mt-1">
                Estimaremos: 211 − 0.64 × {data.age} = <strong>{Math.round(211 - 0.64 * data.age)} bpm</strong>
              </p>
            )}
          </div>
          <div>
            <Label>FC en reposo (bpm) — opcional</Label>
            <Input
              type="number"
              placeholder="58"
              value={data.hrResting ?? ''}
              onChange={(e) => update({ hrResting: e.target.value ? Number(e.target.value) : null })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Si tienes reloj deportivo o pulsómetro, agrega este dato para mayor precisión.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function StepSchedule({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
  const daysOptions = [3, 4, 5, 6]
  const hoursOptions = [
    { label: '45 min', value: 0.75 },
    { label: '1h', value: 1 },
    { label: '1h 30', value: 1.5 },
    { label: '2h', value: 2 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <StepTitle>Tu disponibilidad</StepTitle>
      <StepSubtitle>El plan se adapta a tu tiempo real disponible.</StepSubtitle>
      <div>
        <Label>Días disponibles para entrenar por semana</Label>
        <div className="flex gap-2 mt-1 flex-wrap">
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
        <Label>Duración por sesión</Label>
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
    </div>
  )
}

const INJURY_OPTIONS = ['Rodilla', 'Tobillo', 'Cadera', 'Hombro', 'Espalda/lumbar', 'Fascitis plantar', 'Ninguna']
const CONDITION_OPTIONS = ['Hipertensión', 'Diabetes', 'Problemas cardíacos', 'Asma', 'Tiroides', 'Ninguna']

function StepHealth({ data, update }: { data: WizardData; update: (d: Partial<WizardData>) => void }) {
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
      <StepTitle>Salud y compromiso</StepTitle>
      <StepSubtitle>Información confidencial — solo se usa para ajustar el plan de forma segura.</StepSubtitle>

      <div>
        <Label>Lesiones o molestias actuales</Label>
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
        <Label>Condiciones médicas relevantes</Label>
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
          ⚠️ Recomendamos consultar con tu médico antes de iniciar. Puedes continuar — el plan incluirá una nota al respecto.
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="font-semibold text-[#1e3a5f] text-sm">¿Qué tan dispuesto estás a ajustar tu alimentación?</p>
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
    </div>
  )
}

function StepGenerating() {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-[#1e3a5f]/10" />
        <div className="absolute inset-0 rounded-full border-4 border-t-[#f97316] animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-2xl">🏅</span>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-[#1e3a5f]">Generando tu plan personalizado...</p>
        <p className="text-sm text-gray-400 mt-1">Consultando especialistas y calculando zonas</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step validation
// ---------------------------------------------------------------------------

function isStepValid(stepId: StepId, data: WizardData): boolean {
  switch (stepId) {
    case 'main-goal':
      return data.mainGoal !== null
    case 'sport-select':
      return data.sport !== null
    case 'body-goal':
      return data.bodyGoal !== null
    case 'sport-details': {
      if (data.mainGoal === 'SPORT') {
        if (data.sport === 'RUNNING') return data.raceDistance !== null
        if (data.sport === 'CYCLING') return data.cyclingModality !== null
        if (data.sport === 'SWIMMING') return data.swimStroke !== null
        if (data.sport === 'TRIATHLON') return data.triathlonDistance !== null && data.weakestSegment !== null
        if (data.sport === 'FOOTBALL') return data.footballPosition !== null && data.competitionLevel !== null
        if (data.sport === 'STRENGTH') return data.strengthStyle !== null
      }
      return true
    }
    case 'physical':
      return !!(data.age && data.heightCm && data.weightKg && data.gender)
    case 'hr-fitness':
      if (!data.experienceLevel) return false
      if (data.mainGoal === 'SPORT' && data.sport !== 'STRENGTH') {
        return data.hrSource !== null && (data.hrSource === 'estimated' || !!data.hrMax)
      }
      return true
    case 'schedule':
      return true
    case 'health':
      return data.nutritionCommitment !== null
    case 'generating':
      return true
  }
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<StepId, string> = {
  'main-goal': 'Objetivo',
  'sport-select': 'Deporte',
  'body-goal': 'Meta corporal',
  'sport-details': 'Detalles',
  physical: 'Perfil físico',
  'hr-fitness': 'Condición',
  schedule: 'Disponibilidad',
  health: 'Salud',
  generating: 'Generando',
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter()
  const { update: refreshSession } = useSession()
  const [data, setData] = useState<WizardData>(INITIAL_DATA)
  const [stepIndex, setStepIndex] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  const steps = getSteps(data)
  const currentStepId = steps[stepIndex]
  const totalSteps = steps.length
  const progressPct = Math.min(((stepIndex + 1) / totalSteps) * 100, 100)
  const isLastDataStep = stepIndex === steps.length - 2 // one before 'generating'

  function nextStep() {
    if (!isStepValid(currentStepId, data)) return

    if (isLastDataStep) {
      handleGenerate()
      return
    }

    // Recalculate steps after update in case sport/mainGoal changed
    const updatedSteps = getSteps(data)
    if (stepIndex < updatedSteps.length - 1) {
      setStepIndex(stepIndex + 1)
    }
  }

  function prevStep() {
    if (stepIndex === 0) return
    setStepIndex(stepIndex - 1)
  }

  async function handleGenerate() {
    setStepIndex(steps.indexOf('generating') >= 0 ? steps.indexOf('generating') : steps.length - 1)
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

      await refreshSession({ onboardingCompleted: true })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      // Go back to last data step
      const generatingIdx = steps.indexOf('generating')
      setStepIndex(generatingIdx > 0 ? generatingIdx - 1 : 0)
    } finally {
      setIsGenerating(false)
    }
  }

  const stepContent: Record<StepId, React.ReactNode> = {
    'main-goal': <StepMainGoal data={data} update={update} />,
    'sport-select': <StepSportSelect data={data} update={update} />,
    'body-goal': <StepBodyGoal data={data} update={update} />,
    'sport-details': <StepSportDetails data={data} update={update} />,
    physical: <StepPhysical data={data} update={update} />,
    'hr-fitness': <StepHRFitness data={data} update={update} />,
    schedule: <StepSchedule data={data} update={update} />,
    health: <StepHealth data={data} update={update} />,
    generating: <StepGenerating />,
  }

  const isGeneratingStep = currentStepId === 'generating'
  const stepLabel = STEP_LABELS[currentStepId] ?? ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[600px] mx-auto px-4 py-3 flex items-center gap-3">
          <span className="text-xl font-bold text-[#1e3a5f]">Medaliq</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500 text-sm flex-1">
            Paso {stepIndex + 1} de {totalSteps} — {stepLabel}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Salir
          </button>
        </div>
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-1 bg-[#f97316] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-[600px] w-full mx-auto px-4 py-8 pb-32">
        <div key={currentStepId} className="animate-in fade-in slide-in-from-right-4 duration-200">
          {stepContent[currentStepId]}
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
      </main>

      {/* Footer nav */}
      {!isGeneratingStep && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-[600px] mx-auto px-4 py-4 flex gap-3">
            {stepIndex > 0 && (
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
              disabled={!isStepValid(currentStepId, data) || isGenerating}
              className={`flex-1 bg-[#f97316] hover:bg-[#ea6c0e] text-white font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${stepIndex === 0 ? 'w-full' : ''}`}
            >
              {isLastDataStep ? 'Generar mi plan →' : 'Siguiente →'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
