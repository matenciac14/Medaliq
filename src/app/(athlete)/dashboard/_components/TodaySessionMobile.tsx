import Link from 'next/link'
import { SESSION_ICONS, SESSION_NAMES } from '@/lib/constants/sessions'
import type { DashboardMode, TodaySessionData } from '../_lib/get_dashboard_data'

type RoutineDayConfig = { dow: number; activity: 'GYM' | 'RUN' | 'REST'; split?: string; runType?: string }

type CompletedPlanProps = {
  name: string
  totalWeeks: number
  sessionsLogged: number
  sessionsTotal: number
}

type Props = {
  dashboardMode: DashboardMode
  todaySession: TodaySessionData | null
  todayRoutineDay: RoutineDayConfig | null
  hasGymToday: boolean
  gymDoneToday: boolean
  assignedWorkoutName: string | null
  lastCompletedPlanInfo: CompletedPlanProps | null
  recoveryDaysSinceEnd: number | null
}

export default function TodaySessionMobile({
  dashboardMode, todaySession, todayRoutineDay, hasGymToday, gymDoneToday,
  assignedWorkoutName, lastCompletedPlanInfo, recoveryDaysSinceEnd,
}: Props) {
  return (
    <div className="sm:hidden">
      {todaySession ? (
        <PlannedSessionCard session={todaySession} />
      ) : dashboardMode === 'FREE' ? (
        <FreeModeTodayCard todayRoutineDay={todayRoutineDay} />
      ) : dashboardMode === 'RECOVERY' ? (
        <RecoveryCard planInfo={lastCompletedPlanInfo} recoveryDaysSinceEnd={recoveryDaysSinceEnd} />
      ) : hasGymToday ? (
        <GymTodayCard workoutName={assignedWorkoutName} gymDoneToday={gymDoneToday} />
      ) : (
        <RestDayCard />
      )}
    </div>
  )
}

// -- Shared "add activity" link -----------------------------------------------

function SecondaryLink() {
  return (
    <Link href="/log/run" className="block text-center text-xs font-medium text-gray-500">
      + Agregar otra actividad
    </Link>
  )
}

// -- Planned session (Training mode — running/session with plan) ---------------
// Figma: white card, navy accent bar, "HOY" left + zone/completed badge right,
// icon + duration large, session name bold, detail text gray,
// navy CTA "Iniciar →" or "Ver resumen →"

function PlannedSessionCard({ session }: { session: TodaySessionData }) {
  const sessionName = SESSION_NAMES[session.type] ?? session.type.replace(/_/g, ' ')

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="h-[3px] bg-[#22c55e]" />
      <div className="px-4 pt-3.5 pb-3.5 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-semibold text-[#ea580c] tracking-widest uppercase">● HOY</span>
          {session.completed ? (
            <span className="bg-green-500 text-white text-xs font-semibold px-2.5 py-0.5 rounded-lg">Completada</span>
          ) : session.zoneTarget && session.zoneTarget !== 'N/A' ? (
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-lg">
              Zona {session.zoneTarget}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{session.completed ? '✓' : SESSION_ICONS[session.type] ?? '🏅'}</span>
          <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">{session.durationMin} min</span>
        </div>
        <p className="text-sm font-semibold text-gray-900">{sessionName}</p>
        {session.detailText && (
          <p className="text-xs text-gray-500">{session.detailText}</p>
        )}
        <div className="pt-2">
          {session.completed ? (
            <Link href={session.logType === 'gym' ? '/gym/history' : '/progress'}
              className="block bg-[#1e3a5f] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Ver resumen →
            </Link>
          ) : (
            <Link href={session.id === 'gym-today' ? '/gym/session' : `/log/run?sessionId=${session.id}&type=${session.type}&duration=${session.durationMin}&zone=${session.zoneTarget}`}
              className="block bg-[#1e3a5f] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              {session.id === 'gym-today' ? 'Ir al Gym →' : 'Iniciar →'}
            </Link>
          )}
        </div>
        <SecondaryLink />
      </div>
    </div>
  )
}

// -- Free mode (no plan) — GYM / RUN / REST / default -------------------------
// Figma GYM: white card, green accent bar, "HOY · DIA DE GYM" + "~45 min",
// icon + duration, split name bold, "Gym · Rutina asignada" gray, green CTA

function FreeModeTodayCard({ todayRoutineDay }: { todayRoutineDay: RoutineDayConfig | null }) {
  if (todayRoutineDay?.activity === 'GYM') {
    return (
      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="h-[3px] bg-[#22c55e]" />
        <div className="px-4 pt-3.5 pb-3.5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">
              Hoy · Dia de Gym
            </span>
            {todayRoutineDay.split && (
              <span className="text-xs text-gray-400">~45 min</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">💪</span>
            <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">
              {todayRoutineDay.split ? '~45 min' : 'Entreno hoy'}
            </span>
          </div>
          {todayRoutineDay.split && (
            <>
              <p className="text-sm font-semibold text-gray-900">{todayRoutineDay.split}</p>
              <p className="text-xs text-gray-500">Gym · Rutina asignada</p>
            </>
          )}
          <div className="pt-2">
            <Link href="/gym/session" className="block bg-[#22c55e] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Iniciar sesion →
            </Link>
          </div>
          <SecondaryLink />
        </div>
      </div>
    )
  }

  if (todayRoutineDay?.activity === 'RUN') {
    return (
      <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="h-[3px] bg-[#ea580c]" />
        <div className="px-4 pt-3.5 pb-3.5 space-y-2">
          <span className="text-[10px] font-semibold text-[#ea580c] tracking-widest uppercase">● HOY</span>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🏃</span>
            <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">Correr hoy</span>
          </div>
          <div className="pt-2">
            <Link href="/log/run" className="block bg-[#ea580c] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Registrar →
            </Link>
          </div>
          <SecondaryLink />
        </div>
      </div>
    )
  }

  if (todayRoutineDay?.activity === 'REST') {
    return (
      <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <span className="text-2xl">😴</span>
        <div>
          <p className="text-sm font-semibold text-gray-900">Descanso hoy segun tu rutina</p>
          <p className="text-sm text-gray-500 mt-0.5">Recupera bien — vuelves manana</p>
        </div>
      </div>
    )
  }

  // Default: no routine — Figma "Sin sesion" card
  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="h-[3px] bg-[#ea580c]" />
      <div className="px-4 pt-3.5 pb-3.5 space-y-2">
        <span className="text-[10px] font-semibold text-[#ea580c] tracking-widest uppercase">● HOY</span>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎯</span>
          <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">Sin sesion</span>
        </div>
        <p className="text-sm font-semibold text-gray-900">Sin sesion planificada</p>
        <p className="text-xs text-gray-500">Registra tu entrenamiento de hoy</p>
        <div className="pt-2">
          <Link href="/log/run" className="block bg-[#ea580c] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
            Registrar actividad →
          </Link>
        </div>
      </div>
    </div>
  )
}

// -- Recovery (plan just completed) -------------------------------------------
// Figma: white card, green accent bar, trophy badge, medal icon + "Completado!",
// plan name, stats pills, recovery countdown, blue/green CTA

function RecoveryCard({ planInfo, recoveryDaysSinceEnd }: {
  planInfo: CompletedPlanProps | null
  recoveryDaysSinceEnd: number | null
}) {
  const recoveryDaysLeft = recoveryDaysSinceEnd != null ? Math.max(14 - recoveryDaysSinceEnd, 0) : null

  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="h-[3px] bg-[#22c55e]" />
      <div className="px-4 pt-3.5 pb-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-widest">Temporada completada</span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🎖️</span>
          <span className="text-2xl font-black text-[#1e3a5f] leading-none">¡Completado!</span>
        </div>

        <p className="text-sm font-semibold text-gray-900">{planInfo?.name ?? 'Plan terminado'}</p>

        {planInfo && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">{planInfo.totalWeeks} semanas</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">{planInfo.sessionsLogged} sesiones</span>
          </div>
        )}

        {recoveryDaysLeft != null && recoveryDaysLeft > 0 && (
          <div className="flex items-center gap-2 bg-green-50 rounded-[10px] px-3 py-2">
            <span className="text-xs">⏱</span>
            <p className="text-xs font-semibold text-green-700">
              Semana de recuperacion activa — {recoveryDaysLeft} dias restantes
            </p>
          </div>
        )}

        <div className="pt-2">
          <Link href="/progress" className="block bg-[#22c55e] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
            Ver resumen de temporada →
          </Link>
        </div>
        <SecondaryLink />
      </div>
    </div>
  )
}

// -- Gym today (assigned workout, TRAINING/GYM mode) --------------------------
// Figma: white card, green accent bar, "HOY · DIA DE GYM", icon + workout name,
// green CTA "Iniciar sesion →" or navy "Ver resumen →"

function GymTodayCard({ workoutName, gymDoneToday }: { workoutName: string | null; gymDoneToday: boolean }) {
  return (
    <div className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="h-[3px] bg-[#22c55e]" />
      <div className="px-4 pt-3.5 pb-3.5 space-y-2">
        <span className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">
          Hoy · Dia de Gym
        </span>
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">💪</span>
          <span className="text-2xl font-black text-[#1e3a5f] tracking-tight leading-none">
            {workoutName ?? 'Entreno hoy'}
          </span>
        </div>
        <div className="pt-2">
          {gymDoneToday ? (
            <Link href="/gym/history" className="block bg-[#1e3a5f] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Ver resumen →
            </Link>
          ) : (
            <Link href="/gym/session" className="block bg-[#22c55e] text-white text-sm font-semibold text-center py-2.5 rounded-[10px]">
              Iniciar sesion →
            </Link>
          )}
        </div>
        <SecondaryLink />
      </div>
    </div>
  )
}

// -- Rest day -----------------------------------------------------------------

function RestDayCard() {
  return (
    <div className="bg-white rounded-[20px] p-[18px] flex items-center gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
      <span className="text-2xl">😴</span>
      <div>
        <p className="text-sm font-semibold text-gray-900">Dia de descanso</p>
        <p className="text-sm text-gray-500 mt-0.5">Recupera bien hoy</p>
      </div>
    </div>
  )
}
