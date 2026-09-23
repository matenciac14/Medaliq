import Link from 'next/link'
import type { MappedAthlete } from '@/infrastructure/db/coach_athlete.mapper'
import { TRIGGER_LABEL } from '@/domain/coach_dashboard/get_coach_dashboard.use_case'

interface Props {
  athletesWithAlerts: MappedAthlete[]
  totalAlerts: number
}

export function CoachAlertsList({ athletesWithAlerts, totalAlerts }: Props) {
  return (
    <div className="grid grid-cols-[1fr_160px] sm:grid-cols-[1fr_220px] md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_430px] gap-3 mb-5">

      {/* Requieren atencion */}
      <div className="bg-white rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <h2 className="text-sm font-semibold" style={{ color: '#1f3b5e' }}>● Requieren atención</h2>
          {totalAlerts > 0 && (
            <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ea580c' }}>
              {totalAlerts} alertas
            </span>
          )}
          <Link href="/coach/athletes?filter=alerts" className="ml-auto text-xs font-medium" style={{ color: '#ea580c' }}>
            Ver todos →
          </Link>
        </div>
        {athletesWithAlerts.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-xs" style={{ color: '#808c99' }}>Todos tus atletas están al día</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50 max-h-[250px] overflow-y-auto">
            {athletesWithAlerts.slice(0, 5).map((a) => {
              const alerts = buildAlertTags(a)
              return (
                <li key={a.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: '#1f3b5e' }}
                  >
                    {a.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold" style={{ color: '#1f3b5e' }}>{a.name}</p>
                      {alerts.map((al, i) => (
                        <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: '#f7f2eb', color: al.color }}>
                          {al.msg}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: '#8c99a6' }}>
                    hace {a.lastCheckInDaysAgo >= 999 ? '?' : a.lastCheckInDaysAgo}d
                  </span>
                  <a
                    href={`/coach/athletes/${a.id}`}
                    className="shrink-0 text-[10px] font-semibold text-white px-2.5 py-1 rounded-md"
                    style={{ backgroundColor: '#1f3b5e' }}
                  >
                    Ver →
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Acciones rapidas */}
      <div className="bg-white rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#1f3b5e' }}>Acciones rápidas</h2>
        <div className="space-y-2">
          {QUICK_ACTIONS.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: action.color + '1f', color: action.color }}
              >
                {action.letter}
              </div>
              <div className="flex-1 min-w-0 hidden md:block">
                <p className="text-xs font-semibold truncate" style={{ color: '#1f3b5e' }}>{action.label}</p>
                <p className="text-[10px] truncate" style={{ color: '#808c99' }}>{action.sub}</p>
              </div>
              <span className="text-sm hidden lg:block" style={{ color: '#b2b8bf' }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

const QUICK_ACTIONS = [
  { letter: 'G', color: '#22c35d', label: 'Nueva rutina',        sub: 'Crear plantilla gym',      href: '/coach/gym/routines/new' },
  { letter: 'R', color: '#ea580c', label: 'Crear sesión running', sub: 'Asignar a atleta',         href: '/coach/athletes' },
  { letter: 'N', color: '#1f3b5e', label: 'Plantilla nutrición',  sub: 'Macro targets',            href: '/coach/nutrition' },
  { letter: '+', color: '#6b7280', label: 'Agregar asesorado',    sub: 'Invitar o crear',          href: '/coach/clients/new' },
]

function buildAlertTags(a: MappedAthlete): { msg: string; color: string }[] {
  const alerts: { msg: string; color: string }[] = []
  if (a.alertFlags.noCheckin) alerts.push({ msg: 'Sin check-in >7d', color: '#8c6633' })
  const triggerAlerts = (a.alertFlags.adjustments ?? [])
    .map((t: string) => TRIGGER_LABEL[t])
    .filter(Boolean) as { msg: string; color: string }[]
  if (triggerAlerts.length > 0) {
    alerts.push(...triggerAlerts)
  } else if (a.alertFlags.highRpe) {
    alerts.push({ msg: 'Carga alta', color: '#8c6633' })
  }
  if (a.alertFlags.weightDrop) alerts.push({ msg: `−${a.alertFlags.weightDropKg.toFixed(1)}kg`, color: '#8c6633' })
  return alerts
}
