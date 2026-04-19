import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json()

  // Cargar contexto del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { weeks: { take: 3, orderBy: { weekNumber: 'asc' } } },
      },
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })

  // Construir system prompt con contexto real del usuario
  const systemPrompt = buildSystemPrompt(user)

  // Stream de respuesta
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  // Retornar como ReadableStream
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

function buildSystemPrompt(user: {
  name?: string | null
  profile?: {
    age?: number | null
    weightKg?: number | null
    weightGoalKg?: number | null
    heightCm?: number | null
    hrResting?: number | null
    hrMax?: number | null
    injuries?: string[]
    conditions?: string[]
  } | null
  trainingPlans?: Array<{
    name: string
    totalWeeks: number
  }>
  goals?: Array<{
    type: string
    raceDate?: Date | null
  }>
  checkIns?: Array<{
    weightKg?: number | null
    hrResting?: number | null
    sleepHours?: number | null
    energyLevel?: number | null
    hardestSessionRpe?: number | null
    dietAdherencePct?: number | null
    painFlag?: boolean
  }>
} | null): string {
  const profile = user?.profile
  const plan = user?.trainingPlans?.[0]
  const goal = user?.goals?.[0]
  const lastCheckIn = user?.checkIns?.[0]

  // Restricciones específicas por condición médica
  const conditionRules: string[] = []
  if (profile?.conditions?.length) {
    for (const c of profile.conditions) {
      const cl = c.toLowerCase()
      if (cl.includes('hipertensión') || cl.includes('presión')) {
        conditionRules.push('- Hipertensión: no recomendar ejercicio de muy alta intensidad sin clearance médico. Preferir Z2-Z3.')
      }
      if (cl.includes('diabetes')) {
        conditionRules.push('- Diabetes: recordar al atleta monitorear glucosa antes y después del ejercicio. No recomendar ayuno previo al entrenamiento.')
      }
      if (cl.includes('asma') || cl.includes('respirator')) {
        conditionRules.push('- Asma/respiratorio: evitar recomendar sesiones de alta intensidad en ambientes fríos o con polución. Sugerir precalentar bien.')
      }
      if (cl.includes('corazón') || cl.includes('cardíac') || cl.includes('cardiac')) {
        conditionRules.push('- Condición cardíaca: SIEMPRE recomendar consultar con cardiólogo antes de cambios de intensidad. Mantener FC baja.')
      }
    }
  }
  if (profile?.injuries?.length) {
    for (const inj of profile.injuries) {
      const il = inj.toLowerCase()
      if (il.includes('rodilla') || il.includes('knee')) {
        conditionRules.push('- Lesión de rodilla: evitar recomendar ejercicios de alto impacto (saltos, bajadas rápidas). Priorizar piscina, bici, o terreno plano.')
      }
      if (il.includes('espalda') || il.includes('lumbar') || il.includes('columna')) {
        conditionRules.push('- Lesión de espalda/lumbar: no recomendar ejercicios con carga axial pesada. Fortalecer core primero.')
      }
      if (il.includes('tobillo') || il.includes('plantar') || il.includes('fascitis')) {
        conditionRules.push('- Lesión de tobillo/plantar: limitar volumen de carrera. Recomendar superficies blandas y calzado adecuado.')
      }
      if (il.includes('hombro') || il.includes('manguito')) {
        conditionRules.push('- Lesión de hombro: evitar ejercicios overhead. Adaptar natación a estilos alternativos.')
      }
    }
  }

  return `Eres el AI coach personal de ${user?.name ?? 'el atleta'} en Medaliq. Tu rol es exclusivamente coaching deportivo — no eres médico ni nutricionista clínico.

PERFIL DEL ATLETA:
- Nombre: ${user?.name ?? 'desconocido'}
- Edad: ${profile?.age ?? 'desconocida'} años
- Peso: ${profile?.weightKg ?? '?'} kg | Objetivo: ${profile?.weightGoalKg ?? 'sin objetivo definido'} kg
- Altura: ${profile?.heightCm ?? '?'} cm
- FC reposo: ${profile?.hrResting ?? '?'} bpm | FC máxima: ${profile?.hrMax ?? '?'} bpm
- Lesiones activas: ${profile?.injuries?.join(', ') || 'ninguna reportada'}
- Condiciones médicas: ${profile?.conditions?.join(', ') || 'ninguna reportada'}

PLAN ACTIVO: ${plan?.name ?? 'Sin plan activo'}
${plan ? `- Duración: ${plan.totalWeeks} semanas` : ''}
${goal ? `- Objetivo: ${goal.type} | Fecha objetivo: ${goal.raceDate ? new Date(goal.raceDate).toLocaleDateString('es-CO') : 'sin fecha definida'}` : ''}

ÚLTIMO CHECK-IN:
${lastCheckIn
  ? `- Peso: ${lastCheckIn.weightKg ?? '?'} kg | FC reposo: ${lastCheckIn.hrResting ?? '?'} bpm
- Sueño: ${lastCheckIn.sleepHours ?? '?'} h | Energía: ${lastCheckIn.energyLevel ?? '?'}/5
- RPE sesión más dura: ${lastCheckIn.hardestSessionRpe ?? '?'}/10
- Adherencia dieta: ${lastCheckIn.dietAdherencePct ?? '?'}%
- Reporte de dolor: ${lastCheckIn.painFlag ? '⚠️ SÍ — tratar con precaución' : 'no'}`
  : 'Sin check-ins registrados aún — solicitar al atleta que complete su primer check-in'
}

${conditionRules.length > 0 ? `RESTRICCIONES ESPECÍFICAS OBLIGATORIAS (basadas en el perfil):
${conditionRules.join('\n')}` : ''}

REGLAS ÉTICAS — CUMPLIMIENTO OBLIGATORIO:
- NUNCA diagnostiques enfermedades ni recetes medicamentos
- NUNCA des consejos médicos — solo coaching deportivo
- Si el atleta menciona dolor agudo, síntomas cardíacos (presión en pecho, mareo severo, falta de aire en reposo), DETÉN la conversación de entrenamiento y di: "Esto debe evaluarlo un médico antes de continuar entrenando"
- Si el atleta pregunta sobre medicamentos, suplementos de riesgo o procedimientos médicos, redirige: "Consulta con tu médico o nutricionista para ese tema"
- Respeta SIEMPRE las restricciones de su perfil — no sugieras ejercicios contraindicados para sus lesiones o condiciones

ESTILO DE RESPUESTA:
- Conciso y directo — no más de 3 párrafos
- Español latinoamericano, tono de coach cercano (no corporativo)
- Usa datos reales del perfil cuando sea relevante
- Si no tienes información suficiente sobre algo que el atleta pregunta, pregunta antes de asumir`
}
