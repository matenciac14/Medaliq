import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Mocks ---
vi.mock('@/lib/rate_limit', () => ({
  rateLimitAsync: vi.fn().mockResolvedValue({ allowed: true }),
}))
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/auth/mobile_auth', () => ({
  getMobileUser: vi.fn(),
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    coachAthlete: { findFirst: vi.fn() },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))
vi.mock('@/lib/push/expo_push', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/infrastructure/db/notification', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

import { auth } from '@/auth'
import { getMobileUser } from '@/lib/auth/mobile_auth'
import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'
import { createNotification } from '@/infrastructure/db/notification'

// Route imports
import { GET as webGET, POST as webPOST } from './route'
import { PATCH as webReadPATCH } from './read/route'
import { GET as webUnreadGET } from './unread-count/route'
import { GET as webMeGET } from './me/route'
import { GET as mobileGET, POST as mobilePOST } from '../mobile/messages/route'
import { PATCH as mobileReadPATCH } from '../mobile/messages/read/route'
import { GET as mobileUnreadGET } from '../mobile/messages/unread-count/route'
import { GET as mobileMeGET } from '../mobile/messages/me/route'

// --- Helpers ---
const WEB_SESSION = { user: { id: 'coach-1', name: 'Coach Test' } }
const MOBILE_USER = { id: 'athlete-1', name: 'Atleta Test' }

function webReq(method: string, url: string, body?: object) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function mobileReq(method: string, url: string, body?: object) {
  return new NextRequest(new URL(url, 'http://localhost'), {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fake-jwt' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue(WEB_SESSION as any)
  vi.mocked(getMobileUser).mockResolvedValue(MOBILE_USER as any)
})

// =====================================================================
// WEB — POST /api/messages
// =====================================================================
describe('POST /api/messages (web)', () => {
  it('201 — crea mensaje con relación ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'athlete-1', name: 'Atleta', pushToken: 'token' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    const created = { id: 'msg-1', fromId: 'coach-1', toId: 'athlete-1', content: 'Hola', readAt: null, createdAt: new Date() }
    vi.mocked(prisma.message.create).mockResolvedValue(created as any)

    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'athlete-1', content: 'Hola' }))
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.message.id).toBe('msg-1')
    expect(body.message.content).toBe('Hola')

    // Verifica que se busca relación con status ACTIVE
    expect(prisma.coachAthlete.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    )
  })

  it('403 — sin relación coach-atleta', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'athlete-1' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)

    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'athlete-1', content: 'Hola' }))
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.error).toContain('Sin relación coach-atleta')
  })

  it('403 — relación PAUSED no permite enviar (status ACTIVE required)', async () => {
    // La query filtra por status: 'ACTIVE', así que si la relación es PAUSED,
    // findFirst retorna null → 403
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'athlete-1' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null) // PAUSED no matchea

    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'athlete-1', content: 'Test' }))
    expect(res.status).toBe(403)
  })

  it('404 — destinatario no encontrado', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)

    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'ghost-1', content: 'Hola' }))
    expect(res.status).toBe(404)

    const body = await res.json()
    expect(body.error).toContain('Destinatario no encontrado')
  })

  it('400 — sin toId o content', async () => {
    const res = await webPOST(webReq('POST', '/api/messages', { toId: '', content: '' }))
    expect(res.status).toBe(400)
  })

  it('400 — no puedes enviarte mensajes a ti mismo', async () => {
    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'coach-1', content: 'Hola' }))
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toContain('No puedes enviarte mensajes a ti mismo')
  })

  it('401 — sin sesión', async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    const res = await webPOST(webReq('POST', '/api/messages', { toId: 'athlete-1', content: 'Hola' }))
    expect(res.status).toBe(401)
  })

  it('envía push notification y crea notificación in-app', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'athlete-1', name: 'Atleta', pushToken: 'expo-token' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    vi.mocked(prisma.message.create).mockResolvedValue({ id: 'msg-1', fromId: 'coach-1', toId: 'athlete-1', content: 'Entrena hoy', readAt: null, createdAt: new Date() } as any)

    await webPOST(webReq('POST', '/api/messages', { toId: 'athlete-1', content: 'Entrena hoy' }))

    expect(sendPushNotification).toHaveBeenCalledWith('expo-token', 'Mensaje de Coach Test', 'Entrena hoy', { screen: 'messages' })
    expect(createNotification).toHaveBeenCalledWith(
      'athlete-1',
      'MENSAJE_COACH',
      'Mensaje de Coach Test',
      'Entrena hoy',
      { push: false, metadata: { fromId: 'coach-1' } },
    )
  })
})

// =====================================================================
// WEB — GET /api/messages
// =====================================================================
describe('GET /api/messages (web)', () => {
  it('retorna mensajes paginados', async () => {
    const msgs = [
      { id: 'msg-1', fromId: 'coach-1', toId: 'athlete-1', content: 'Hola', readAt: null, createdAt: new Date() },
      { id: 'msg-2', fromId: 'athlete-1', toId: 'coach-1', content: 'Hola coach', readAt: null, createdAt: new Date() },
    ]
    vi.mocked(prisma.message.findMany).mockResolvedValue(msgs as any)

    const res = await webGET(webReq('GET', '/api/messages?with=athlete-1'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.messages).toHaveLength(2)
  })

  it('soporta cursor pagination', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([] as any)

    await webGET(webReq('GET', '/api/messages?with=athlete-1&cursor=msg-5&take=20'))

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'msg-5' },
        skip: 1,
        take: 20,
      }),
    )
  })

  it('limita take a 100 máximo', async () => {
    vi.mocked(prisma.message.findMany).mockResolvedValue([] as any)

    await webGET(webReq('GET', '/api/messages?with=athlete-1&take=500'))

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    )
  })

  it('400 — sin param ?with=', async () => {
    const res = await webGET(webReq('GET', '/api/messages'))
    expect(res.status).toBe(400)
  })
})

// =====================================================================
// WEB — PATCH /api/messages/read
// =====================================================================
describe('PATCH /api/messages/read (web)', () => {
  it('marca mensajes como leídos', async () => {
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 3 } as any)

    const res = await webReadPATCH(webReq('PATCH', '/api/messages/read', { fromId: 'athlete-1' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.marked).toBe(3)

    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fromId: 'athlete-1', toId: 'coach-1', readAt: null },
        data: { readAt: expect.any(Date) },
      }),
    )
  })

  it('400 — sin fromId', async () => {
    const res = await webReadPATCH(webReq('PATCH', '/api/messages/read', {}))
    expect(res.status).toBe(400)
  })
})

// =====================================================================
// WEB — GET /api/messages/unread-count
// =====================================================================
describe('GET /api/messages/unread-count (web)', () => {
  it('retorna conteo correcto', async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(5 as any)

    const res = await webUnreadGET(webReq('GET', '/api/messages/unread-count'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.count).toBe(5)
  })

  it('retorna 0 si no hay mensajes sin leer', async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(0 as any)

    const res = await webUnreadGET(webReq('GET', '/api/messages/unread-count'))
    const body = await res.json()
    expect(body.count).toBe(0)
  })
})

// =====================================================================
// WEB — GET /api/messages/me
// =====================================================================
describe('GET /api/messages/me (web)', () => {
  it('retorna coachId y coachName si hay relación', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({
      coach: { id: 'coach-99', name: 'Coach Pro' },
    } as any)

    const res = await webMeGET(webReq('GET', '/api/messages/me'))
    const body = await res.json()

    expect(body.id).toBe('coach-1') // userId de la sesión
    expect(body.coachId).toBe('coach-99')
    expect(body.coachName).toBe('Coach Pro')
  })

  it('retorna null si no tiene coach', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)

    const res = await webMeGET(webReq('GET', '/api/messages/me'))
    const body = await res.json()

    expect(body.coachId).toBeNull()
    expect(body.coachName).toBeNull()
  })
})

// =====================================================================
// MOBILE — POST /api/mobile/messages
// =====================================================================
describe('POST /api/mobile/messages', () => {
  it('201 — crea mensaje con relación ACTIVE', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ pushToken: 'token', name: 'Coach' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    const created = { id: 'msg-m1', fromId: 'athlete-1', toId: 'coach-1', content: 'Listo coach', readAt: null, createdAt: new Date() }
    vi.mocked(prisma.message.create).mockResolvedValue(created as any)

    const res = await mobilePOST(mobileReq('POST', '/api/mobile/messages', { toId: 'coach-1', content: 'Listo coach' }))
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.message.id).toBe('msg-m1')

    // Verifica que la query filtra por status ACTIVE
    expect(prisma.coachAthlete.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'ACTIVE' }),
      }),
    )
  })

  it('403 — relación PAUSED no permite enviar (bug corregido)', async () => {
    // Antes del fix, mobile GET no filtraba por status ACTIVE.
    // POST sí filtra → PAUSED retorna null → 403
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ pushToken: null, name: 'Coach' } as any)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null) // PAUSED no matchea status: 'ACTIVE'

    const res = await mobilePOST(mobileReq('POST', '/api/mobile/messages', { toId: 'coach-1', content: 'Test' }))
    expect(res.status).toBe(403)

    const body = await res.json()
    expect(body.error).toContain('Sin relación coach-atleta')
  })

  it('403 — sin relación', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)

    const res = await mobilePOST(mobileReq('POST', '/api/mobile/messages', { toId: 'random-1', content: 'Hola' }))
    expect(res.status).toBe(403)
  })

  it('400 — sin content', async () => {
    const res = await mobilePOST(mobileReq('POST', '/api/mobile/messages', { toId: 'coach-1', content: '' }))
    expect(res.status).toBe(400)
  })

  it('401 — sin auth mobile', async () => {
    vi.mocked(getMobileUser).mockResolvedValue(null as any)
    const res = await mobilePOST(mobileReq('POST', '/api/mobile/messages', { toId: 'coach-1', content: 'Hola' }))
    expect(res.status).toBe(401)
  })
})

// =====================================================================
// MOBILE — GET /api/mobile/messages
// =====================================================================
describe('GET /api/mobile/messages', () => {
  it('retorna mensajes de la conversación', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({ id: 'rel-1' } as any)
    const msgs = [{ id: 'msg-1', fromId: 'athlete-1', toId: 'coach-1', content: 'Hola', readAt: null, createdAt: new Date() }]
    vi.mocked(prisma.message.findMany).mockResolvedValue(msgs as any)

    const res = await mobileGET(mobileReq('GET', '/api/mobile/messages?with=coach-1'))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.messages).toHaveLength(1)
  })

  it('403 — sin relación', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)

    const res = await mobileGET(mobileReq('GET', '/api/mobile/messages?with=random-1'))
    expect(res.status).toBe(403)
  })

  it('400 — sin param ?with=', async () => {
    const res = await mobileGET(mobileReq('GET', '/api/mobile/messages'))
    expect(res.status).toBe(400)
  })
})

// =====================================================================
// MOBILE — PATCH /api/mobile/messages/read
// =====================================================================
describe('PATCH /api/mobile/messages/read', () => {
  it('marca como leídos', async () => {
    vi.mocked(prisma.message.updateMany).mockResolvedValue({ count: 2 } as any)

    const res = await mobileReadPATCH(mobileReq('PATCH', '/api/mobile/messages/read', { fromId: 'coach-1' }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('400 — sin fromId', async () => {
    const res = await mobileReadPATCH(mobileReq('PATCH', '/api/mobile/messages/read', {}))
    expect(res.status).toBe(400)
  })
})

// =====================================================================
// MOBILE — GET /api/mobile/messages/unread-count
// =====================================================================
describe('GET /api/mobile/messages/unread-count', () => {
  it('retorna conteo correcto', async () => {
    vi.mocked(prisma.message.count).mockResolvedValue(7 as any)

    const res = await mobileUnreadGET(mobileReq('GET', '/api/mobile/messages/unread-count'))
    const body = await res.json()
    expect(body.count).toBe(7)
  })
})

// =====================================================================
// MOBILE — GET /api/mobile/messages/me
// =====================================================================
describe('GET /api/mobile/messages/me', () => {
  it('retorna coachId y coachName', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue({
      coach: { id: 'coach-5', name: 'Coach Maria' },
    } as any)

    const res = await mobileMeGET(mobileReq('GET', '/api/mobile/messages/me'))
    const body = await res.json()

    expect(body.id).toBe('athlete-1')
    expect(body.coachId).toBe('coach-5')
    expect(body.coachName).toBe('Coach Maria')
  })

  it('retorna null si no tiene coach', async () => {
    vi.mocked(prisma.coachAthlete.findFirst).mockResolvedValue(null)

    const res = await mobileMeGET(mobileReq('GET', '/api/mobile/messages/me'))
    const body = await res.json()

    expect(body.coachId).toBeNull()
    expect(body.coachName).toBeNull()
  })
})
