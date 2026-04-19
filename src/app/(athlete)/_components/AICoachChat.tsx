'use client'
import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  initialUsed?: number
  monthlyLimit?: number
  resetAt?: string
}

export default function AICoachChat({ initialUsed = 0, monthlyLimit = 0, resetAt = '' }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy tu AI coach. ¿En qué te puedo ayudar hoy? Puedo orientarte sobre tu plan, recuperación, nutrición o cualquier duda de entrenamiento.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [used, setUsed] = useState(initialUsed)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 999999 = trial / sin límite efectivo
  const isUnlimited = monthlyLimit === 999999 || monthlyLimit === 0
  const limitReached = !isUnlimited && used >= monthlyLimit
  const remaining = isUnlimited ? null : Math.max(0, monthlyLimit - used)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading || limitReached) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Añadir mensaje vacío del assistant para ir llenando
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      // Manejar respuesta de límite alcanzado (429 JSON)
      if (res.status === 429) {
        const data = await res.json()
        if (data.error === 'LIMIT_REACHED') {
          setMessages((prev) => prev.slice(0, -1)) // quitar mensaje vacío
          setUsed(monthlyLimit)
          setLoading(false)
          return
        }
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: data.error ?? 'Límite alcanzado. Intenta en un momento.' },
        ])
        setLoading(false)
        return
      }

      // Leer remaining del header
      const remainingHeader = res.headers.get('X-AI-Remaining')
      if (remainingHeader !== null) {
        const newRemaining = Number(remainingHeader)
        if (!isNaN(newRemaining) && monthlyLimit !== 999999) {
          setUsed(monthlyLimit - newRemaining)
        }
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: full },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content: 'Error al conectar con el AI coach. Intenta de nuevo.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ height: '420px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: '#1e3a5f' }}
        >
          AI
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">AI Coach</p>
          <p className="text-xs text-gray-400">Powered by Claude</p>
        </div>
        <span className="ml-auto w-2 h-2 rounded-full bg-green-400" />
      </div>

      {/* Banner de límite alcanzado */}
      {limitReached && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <p className="text-xs font-medium text-amber-800">
            Has alcanzado tu límite mensual de {monthlyLimit} mensajes.
            {resetAt ? ` Se renueva el ${resetAt}.` : ''}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                m.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
              style={m.role === 'user' ? { backgroundColor: '#1e3a5f' } : {}}
            >
              {m.content ||
                (loading && i === messages.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input + contador */}
      <div className="px-3 pb-3">
        {!isUnlimited && (
          <div className="flex justify-end mb-1.5">
            <span className={`text-[11px] font-medium ${remaining === 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {used} / {monthlyLimit} mensajes este mes
            </span>
          </div>
        )}
        <div className={`flex gap-2 border rounded-xl overflow-hidden transition-colors ${limitReached ? 'border-gray-200 opacity-60' : 'border-gray-200 focus-within:border-[#1e3a5f]'}`}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={limitReached ? 'Límite mensual alcanzado' : 'Pregunta algo sobre tu plan...'}
            className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent"
            disabled={loading || limitReached}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim() || limitReached}
            className="px-3 py-2 text-white text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#f97316' }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
