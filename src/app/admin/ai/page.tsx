import { getAIConfig } from '@/lib/ai/config'
import { prisma } from '@/lib/db/prisma'
import { parseAIProfile } from '@/lib/ai/profile'
import AIProfileEditor from './_components/AIProfileEditor'

export default async function AdminAIPage() {
  const config = getAIConfig()
  const sysConfig = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const aiProfile = parseAIProfile(sysConfig?.aiProfile)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>Configuración IA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Perfil y parámetros del AI coach. El perfil define cómo la AI genera planes y responde a atletas.
        </p>
      </div>

      <div className="space-y-6">

        {/* AI Profile — editable desde DB */}
        <AIProfileEditor initialProfile={aiProfile} />

        {/* Modelo — read only */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Modelo de IA</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configurado via variables de entorno en Vercel</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Chat del atleta</p>
                <p className="text-xs text-gray-400 mt-0.5">AI_CHAT_MODEL</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">{config.chatModel}</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Generación de planes</p>
                <p className="text-xs text-gray-400 mt-0.5">AI_PLAN_MODEL</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">{config.planModel}</span>
            </div>
          </div>
        </div>

        {/* Límites */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Límites de mensajes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Límite mensual — Pro</p>
                <p className="text-xs text-gray-400 mt-0.5">AI_MONTHLY_LIMIT_PRO</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">{config.monthlyLimitPro} msgs/mes</span>
            </div>
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">Límite mensual — Free</p>
                <p className="text-xs text-gray-400 mt-0.5">AI_MONTHLY_LIMIT_FREE</p>
              </div>
              <span className="text-sm font-mono bg-gray-50 px-3 py-1 rounded-lg border border-gray-200 text-gray-700">{config.monthlyLimitFree} msgs/mes</span>
            </div>
          </div>
        </div>

        {/* Costos */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Estimación de costos</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Costo por mensaje (Haiku)</p>
                <p className="text-xl font-bold" style={{ color: '#1e3a5f' }}>~$0.0009</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">100 usuarios Pro · 50 msgs/mes</p>
                <p className="text-xl font-bold text-green-600">~$4.50/mes</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">1,000 usuarios Pro · 50 msgs/mes</p>
                <p className="text-xl font-bold text-green-600">~$45/mes</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
