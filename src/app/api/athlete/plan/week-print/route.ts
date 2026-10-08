import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getPlanWeekNumber } from '@/lib/core/week_number'
import { rateLimitAsync } from '@/lib/rate_limit'

const SESSION_LABELS: Record<string, string> = {
  RODAJE_Z2: 'Rodaje Z2', FARTLEK: 'Fartlek', TIRADA_LARGA: 'Tirada Larga',
  TEMPO: 'Tempo', INTERVALOS: 'Intervalos', SIMULACRO: 'Simulacro', TEST: 'Test',
  CICLA: 'Cicla', NATACION: 'Natación', FUERZA: 'Fuerza', DESCANSO: 'Descanso', OTRO: 'Entrenamiento',
}

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const INTENSITY: Record<string, { label: string; bg: string; color: string }> = {
  HIGH:     { label: 'Intensidad Alta',  bg: '#fef3c7', color: '#92400e' },
  MODERATE: { label: 'Intensidad Media', bg: '#ede9fe', color: '#5b21b6' },
  LOW:      { label: 'Intensidad Baja',  bg: '#d1fae5', color: '#065f46' },
  REST:     { label: 'Descanso',         bg: '#e0f2fe', color: '#0c4a6e' },
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!session.user.features?.plan) {
    return NextResponse.json({ error: 'Función no disponible en tu plan actual.', upgrade: '/upgrade' }, { status: 402 })
  }

  const { allowed } = await rateLimitAsync(`web-${session.user.id}:plan-week-print`, { limit: 60, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  const userId = session.user.id
  const weekParam = req.nextUrl.searchParams.get('week')

  const activePlan = await prisma.trainingPlan.findFirst({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      weeks: {
        orderBy: { weekNumber: 'asc' },
        include: {
          sessions: { orderBy: { dayOfWeek: 'asc' } },
        },
      },
    },
  })

  if (!activePlan) {
    return new Response('No active plan', { status: 404 })
  }

  const currentWeek = getPlanWeekNumber(activePlan.startDate, activePlan.totalWeeks)
  const weekNum = Math.min(
    activePlan.totalWeeks,
    Math.max(1, parseInt(weekParam ?? String(currentWeek)))
  )

  const week = activePlan.weeks.find(w => w.weekNumber === weekNum)
  const sessions = week?.sessions ?? []

  const startDate = new Date(activePlan.startDate)
  const weekStart = new Date(startDate.getTime() + (weekNum - 1) * 7 * 86400000)
  const weekEnd   = new Date(weekStart.getTime() + 6 * 86400000)
  const dateRange = `${weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`

  const athleteName = session.user.name ?? 'Atleta'

  const sessionRows = sessions.map(s => {
    const isRest = s.type === 'DESCANSO'
    const intKey = s.intensity ?? (isRest ? 'REST' : 'MODERATE')
    const int    = INTENSITY[intKey] ?? INTENSITY.MODERATE
    return `
      <div class="session${isRest ? ' rest' : ''}">
        <div class="session-header">
          <span class="session-day">${DAY_NAMES[s.dayOfWeek] ?? `Día ${s.dayOfWeek}`}</span>
          ${!isRest ? `<span class="badge" style="background:${int.bg};color:${int.color}">${int.label}</span>` : ''}
        </div>
        <div class="session-type">${SESSION_LABELS[s.type] ?? s.type}</div>
        ${!isRest ? `
          <div class="meta-row">
            ${s.durationMin > 0 ? `<div class="meta-item"><strong>Duración:</strong> ${s.durationMin} min</div>` : ''}
            ${s.zoneTarget ? `<div class="meta-item zone">${s.zoneTarget}</div>` : ''}
          </div>
        ` : ''}
        ${s.detailText ? `<div class="detail">${s.detailText.replace(/\n/g, '<br>')}</div>` : ''}
      </div>`
  }).join('')

  const weekMeta = week ? `
    <div class="week-meta">
      <span class="meta-chip phase">${week.phase}</span>
      ${week.isRecoveryWeek ? '<span class="meta-chip recovery">Semana de recuperación</span>' : ''}
      ${(week.volumeKm ?? 0) > 0 ? `<span class="meta-chip">${week.volumeKm} km objetivo</span>` : ''}
      ${week.focusDescription ? `<span class="meta-chip focus">${week.focusDescription}</span>` : ''}
    </div>` : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Plan Semana ${weekNum} — ${athleteName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#111827}
    .page{max-width:720px;margin:0 auto;padding:40px 32px}
    .toolbar{display:flex;gap:10px;justify-content:flex-end;margin-bottom:24px}
    .toolbar a{font-size:13px;color:#6b7280;text-decoration:none;padding:8px 16px;border:1px solid #e5e7eb;border-radius:8px}
    .toolbar button{font-size:13px;font-weight:700;color:#fff;background:#1e3a5f;border:none;border-radius:8px;padding:8px 20px;cursor:pointer}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:16px;margin-bottom:20px}
    .header-title{font-size:22px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px}
    .header-sub{font-size:13px;color:#6b7280;margin-top:3px}
    .header-right{text-align:right;font-size:12px;color:#6b7280;line-height:1.7}
    .header-right strong{color:#374151}
    .week-meta{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap;align-items:center}
    .meta-chip{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:4px 10px;border-radius:20px;background:#f3f4f6;color:#374151}
    .meta-chip.phase{background:#1e3a5f;color:#fff}
    .meta-chip.recovery{background:#d1fae5;color:#065f46}
    .meta-chip.focus{background:none;color:#6b7280;font-weight:400;text-transform:none;letter-spacing:0;font-size:12px}
    .session{border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin-bottom:12px;page-break-inside:avoid}
    .session.rest{background:#f9fafb}
    .session-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .session-day{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#9ca3af}
    .badge{font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px}
    .session-type{font-size:16px;font-weight:900;color:#111827}
    .session.rest .session-type{color:#9ca3af}
    .meta-row{display:flex;gap:20px;margin-top:8px;flex-wrap:wrap}
    .meta-item{font-size:12px;color:#6b7280}
    .meta-item strong{color:#374151;font-weight:600}
    .meta-item.zone{color:#1e3a5f;font-weight:600}
    .detail{font-size:13px;color:#374151;line-height:1.6;margin-top:10px;border-left:3px solid #e5e7eb;padding-left:12px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af}
    @media print{
      @page{margin:16mm 14mm;size:A4}
      body{print-color-adjust:exact;-webkit-print-color-adjust:exact}
      .toolbar{display:none!important}
      .page{padding:0;max-width:100%}
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <a href="/plan">← Volver al plan</a>
      <button onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>
    <div class="header">
      <div>
        <div class="header-title">Plan Semanal · Semana ${weekNum}/${activePlan.totalWeeks}</div>
        <div class="header-sub">${activePlan.name}</div>
      </div>
      <div class="header-right">
        <strong>${athleteName}</strong><br>
        ${dateRange}<br>
        medaliq.com
      </div>
    </div>
    ${weekMeta}
    ${sessionRows || '<p style="text-align:center;padding:40px;color:#9ca3af;font-size:14px">No hay sesiones para esta semana.</p>'}
    <div class="footer">
      <span>Generado desde Medaliq · medaliq.com</span>
      <span>Semana ${weekNum} de ${activePlan.totalWeeks}</span>
    </div>
  </div>
  <script>
    // Auto-print when opened from the app
    if (window.opener) setTimeout(() => window.print(), 600)
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
