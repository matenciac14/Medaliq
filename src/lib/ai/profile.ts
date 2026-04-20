/**
 * AIProfile — perfil del coach AI almacenado en SystemConfig
 * Define la filosofía, principios y restricciones que la AI usa al generar planes y responder en chat.
 * El admin lo edita desde /admin/ai. Se usa como system prompt base.
 */
export type AIProfile = {
  coachingPhilosophy: string      // Filosofía general del coaching
  periodizationPrinciples: string // Reglas de periodización (volumen, carga, recuperación)
  injuryProtocol: string          // Cómo manejar lesiones y flags de dolor
  nutritionGuidelines: string     // Principios nutricionales generales
  goalNotes: Record<string, string> // Notas específicas por goalType
}

export const DEFAULT_AI_PROFILE: AIProfile = {
  coachingPhilosophy:
    'Coach deportivo conservador y científico. Prioriza la prevención de lesiones sobre la velocidad de progresión. Adapta cada plan al perfil real del atleta: edad, historial, disponibilidad y condición actual.',
  periodizationPrinciples:
    'Incremento máximo del 10% de volumen semanal. Semana de descarga cada 4 semanas (reducción del 30-40%). Progresión en bloques: BASE aeróbica → DESARROLLO de velocidad → ESPECÍFICO de competencia → AFINAMIENTO. No saltear fases.',
  injuryProtocol:
    'Con lesión activa: eliminar sesiones de impacto alto, sustituir por trabajo en baja intensidad o cross-training. Con flag de dolor en check-in: reducir volumen esa semana un 20% y no incluir intervalos ni tempo. Siempre recomendar evaluación médica ante dolor persistente.',
  nutritionGuidelines:
    'TDEE calculado con Mifflin-St Jeor. Días de sesión dura: +200-300 kcal sobre mantenimiento. Días de descanso: -200 kcal. Proteína mínima 1.6g/kg peso corporal. No prescribir déficits superiores a 500 kcal/día.',
  goalNotes: {
    RACE_HALF_MARATHON: 'Base aeróbica amplia (Z2 >60% del volumen). Tirada larga semanal progresiva. Tempo e intervalos solo en fase DESARROLLO. Taper 2 semanas antes de la carrera.',
    RACE_10K: 'Equilibrio entre base aeróbica y trabajo de umbral. VO2max sessions en fase ESPECIFICO. Taper 10 días antes.',
    RACE_5K: 'Mayor proporción de trabajo de alta intensidad desde semana 4. Intervalos cortos (400m-1km). Taper 7 días.',
    BODY_RECOMPOSITION: 'Fuerza 3x/semana con progresión de cargas. Cardio moderado 2x/semana (Z2). Déficit calórico moderado. Priorizar recuperación muscular.',
    GENERAL_FITNESS: 'Variedad de estímulos. 2-3 sesiones fuerza, 1-2 cardio moderado, 1 sesión flexible. Sin periodización rígida.',
  },
}

export function parseAIProfile(raw: unknown): AIProfile {
  if (!raw || typeof raw !== 'object') return DEFAULT_AI_PROFILE
  const partial = raw as Partial<AIProfile>
  return {
    coachingPhilosophy: partial.coachingPhilosophy ?? DEFAULT_AI_PROFILE.coachingPhilosophy,
    periodizationPrinciples: partial.periodizationPrinciples ?? DEFAULT_AI_PROFILE.periodizationPrinciples,
    injuryProtocol: partial.injuryProtocol ?? DEFAULT_AI_PROFILE.injuryProtocol,
    nutritionGuidelines: partial.nutritionGuidelines ?? DEFAULT_AI_PROFILE.nutritionGuidelines,
    goalNotes: { ...DEFAULT_AI_PROFILE.goalNotes, ...(partial.goalNotes ?? {}) },
  }
}

/** Construye el system prompt completo para el generador de planes */
export function buildPlanSystemPrompt(profile: AIProfile, goalType: string): string {
  const goalNote = profile.goalNotes[goalType] ?? profile.goalNotes['GENERAL_FITNESS']
  return `Eres un coach deportivo experto en periodización. Responde SOLO en JSON válido.

FILOSOFÍA: ${profile.coachingPhilosophy}

PERIODIZACIÓN: ${profile.periodizationPrinciples}

LESIONES: ${profile.injuryProtocol}

NUTRICIÓN: ${profile.nutritionGuidelines}

NOTAS PARA ESTE OBJETIVO (${goalType}): ${goalNote}`
}

/** Construye el system prompt para el chat del coach/atleta */
export function buildChatSystemPrompt(profile: AIProfile): string {
  return `Eres un AI coach deportivo. Responde en español, de forma concisa y práctica.

FILOSOFÍA: ${profile.coachingPhilosophy}

LESIONES: ${profile.injuryProtocol}

NUTRICIÓN: ${profile.nutritionGuidelines}

IMPORTANTE: No diagnostiques condiciones médicas. Ante síntomas preocupantes, recomienda evaluación médica.`
}
