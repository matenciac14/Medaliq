'use client'

export default function PlanWeekStatus({ checkInData }: {
  checkInData: { energyLevel: number | null; sleepHours: number | null; stressLevel: number | null; motivationLevel: number | null } | null
}) {
  const { energyLevel, sleepHours, stressLevel, motivationLevel } = checkInData ?? {}

  const items = [
    { label: 'Energía', value: energyLevel ? `${energyLevel}/5` : '—', icon: '⚡' },
    { label: 'Sueño', value: sleepHours ? `${sleepHours}h` : '—', icon: '😴' },
    { label: 'Estrés', value: stressLevel ? `${stressLevel}/5` : '—', icon: '😤' },
    { label: 'Motiv.', value: motivationLevel ? `${motivationLevel}/5` : '—', icon: '💪' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <span className="text-sm font-bold text-gray-900 block mb-3">Tu estado esta semana</span>
      <div className="flex gap-3">
        {items.map(i => (
          <div key={i.label} className="flex-1 text-center">
            <span className="text-base block mb-1">{i.icon}</span>
            <span className="text-sm font-bold text-gray-900 block">{i.value}</span>
            <span className="text-[10px] text-gray-400">{i.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
