/**
 * AI configuration — leída desde variables de entorno con defaults.
 * Para cambiar en producción: actualizar env vars en Vercel y redeploy.
 */

export type AIConfig = {
  chatModel: string         // modelo para el chat del atleta
  planModel: string         // modelo para generación de planes
  monthlyLimitPro: number   // mensajes/mes para usuarios Pro (default 100)
  monthlyLimitFree: number  // mensajes/mes para usuarios Free (default 0)
  systemPromptExtra: string // instrucciones adicionales al sistema prompt base
  maxTokensChat: number     // tokens máximos por respuesta de chat (default 800)
  temperature: number       // temperatura del modelo (default 0.7)
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  chatModel: 'claude-haiku-4-5-20251001',
  planModel: 'claude-haiku-4-5-20251001',
  monthlyLimitPro: 100,
  monthlyLimitFree: 0,
  systemPromptExtra: '',
  maxTokensChat: 800,
  temperature: 0.7,
}

export function getAIConfig(): AIConfig {
  return {
    chatModel: process.env.AI_CHAT_MODEL ?? DEFAULT_AI_CONFIG.chatModel,
    planModel: process.env.AI_PLAN_MODEL ?? DEFAULT_AI_CONFIG.planModel,
    monthlyLimitPro: Number(process.env.AI_MONTHLY_LIMIT_PRO ?? DEFAULT_AI_CONFIG.monthlyLimitPro),
    monthlyLimitFree: Number(process.env.AI_MONTHLY_LIMIT_FREE ?? DEFAULT_AI_CONFIG.monthlyLimitFree),
    systemPromptExtra: process.env.AI_SYSTEM_PROMPT_EXTRA ?? DEFAULT_AI_CONFIG.systemPromptExtra,
    maxTokensChat: Number(process.env.AI_MAX_TOKENS_CHAT ?? DEFAULT_AI_CONFIG.maxTokensChat),
    temperature: Number(process.env.AI_TEMPERATURE ?? DEFAULT_AI_CONFIG.temperature),
  }
}
