'use client'

export default function CheckInBanner({ recordedAt }: { recordedAt: string | null }) {
  if (!recordedAt) {
    return (
      <a href="/checkin" className="flex items-center gap-2 text-xs text-gray-300 hover:text-gray-500 transition-colors mt-2">
        <span>📊</span>
        <span>Sin check-ins registrados · Haz tu primer check-in semanal</span>
      </a>
    )
  }
  const d = new Date(recordedAt)
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`
  return (
    <a href="/checkin" className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2">
      <span>📊</span>
      <span>Último check-in: {label} · Datos del check-in semanal</span>
    </a>
  )
}
