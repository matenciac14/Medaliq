import { getAIConfig } from '@/lib/ai/config'

export default function AdminAIPage() {
  const config = getAIConfig()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Configuración IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Parámetros del AI coach. Cambios via variables de entorno en Vercel + redeploy.
        </p>
      </div>

      <div className="space-y-6">

        {/* Sección 1: Modelo de IA */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Modelo de IA</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Chat del atleta</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_CHAT_MODEL</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.chatModel}
              </span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Generación de planes</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_PLAN_MODEL</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.planModel}
              </span>
            </div>
          </div>
          <div className="px-6 py-3 bg-blue-50 border-t border-blue-100">
            <p className="text-xs text-blue-700">
              Haiku es ~10x más barato que Sonnet ($0.0009 vs $0.009 por mensaje aprox). Usa Sonnet solo si la calidad de respuesta es insuficiente para tus usuarios.
            </p>
          </div>
        </div>

        {/* Sección 2: Límites de mensajes */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Límites de mensajes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Límite mensual — Pro</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_MONTHLY_LIMIT_PRO</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.monthlyLimitPro} msgs/mes
              </span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Límite mensual — Free</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_MONTHLY_LIMIT_FREE</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.monthlyLimitFree} msgs/mes
              </span>
            </div>
          </div>
          <div className="px-6 py-3 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700">
              El contador se resetea el 1 de cada mes. Los usuarios Trial tienen límite 999999 (sin restricción efectiva). Al alcanzar el límite el usuario recibe un mensaje claro con la fecha de renovación, no un error genérico.
            </p>
          </div>
        </div>

        {/* Sección 3: Comportamiento del coach */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Comportamiento del coach AI</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Máximo de tokens por respuesta</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_MAX_TOKENS_CHAT</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.maxTokensChat} tokens
              </span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Temperatura</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_TEMPERATURE (0 = determinista, 1 = creativo)</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">
                {config.temperature}
              </span>
            </div>
            <div className="px-6 py-4">
              <div className="mb-2">
                <p className="text-sm font-medium text-gray-800">Instrucciones adicionales al sistema prompt</p>
                <p className="text-xs text-gray-400 mt-0.5">Variable: AI_SYSTEM_PROMPT_EXTRA — se añade al final del prompt base</p>
              </div>
              <textarea
                readOnly
                value={config.systemPromptExtra || '(vacío — sin instrucciones adicionales)'}
                rows={3}
                className="w-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                El sistema prompt base ya incluye: restricciones médicas, perfil del atleta (peso, FC, lesiones, condiciones), plan activo y último check-in. Este campo permite agregar instrucciones globales adicionales sin tocar el código.
              </p>
            </div>
          </div>
        </div>

        {/* Sección 4: Estimación de costos */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Estimación de costos</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Costo por mensaje (Haiku)</p>
                <p className="text-xl font-bold" style={{ color: '#1e3a5f' }}>~$0.0009</p>
                <p className="text-xs text-gray-400 mt-1">input + output estimado</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">100 usuarios Pro · 50 msgs/mes</p>
                <p className="text-xl font-bold text-green-600">~$4.50/mes</p>
                <p className="text-xs text-gray-400 mt-1">con Haiku</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">1,000 usuarios Pro · 50 msgs/mes</p>
                <p className="text-xl font-bold text-green-600">~$45/mes</p>
                <p className="text-xs text-gray-400 mt-1">con Haiku</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <p className="text-xs text-red-700">
                Con Sonnet sería ~10x más caro: $45/mes para 100 usuarios · $450/mes para 1,000 usuarios. El límite de 100 msgs/mes por usuario Pro actúa como techo de gasto por suscriptor.
              </p>
            </div>
          </div>
        </div>

        {/* Nota de configuración */}
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-4">
          <h2 className="font-semibold text-gray-800 mb-2">Cómo cambiar la configuración</h2>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Ir a Vercel → proyecto Medaliq → Settings → Environment Variables</li>
            <li>Agregar o editar la variable correspondiente (ej: <code className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">AI_CHAT_MODEL=claude-sonnet-4-6</code>)</li>
            <li>Hacer redeploy — los cambios toman efecto inmediatamente en el siguiente request</li>
          </ol>
          <p className="text-xs text-gray-400 mt-3">
            Los cambios a los límites mensuales aplican al siguiente mensaje enviado. Los contadores actuales en DB no se modifican retroactivamente.
          </p>
        </div>

      </div>
    </div>
  )
}
