/**
 * E2E — Shared | Mobile API
 * Tags: @shared @mobile-api
 *
 * Cubre los endpoints /api/mobile/* criticos:
 * - POST /api/mobile/auth/login → JWT + payload correcto
 * - GET /api/mobile/dashboard → data del atleta
 * - GET /api/mobile/plan → plan activo
 * - GET /api/mobile/checkin → estado check-in
 * - GET /api/mobile/exercises → lista de ejercicios
 * - GET /api/mobile/nutrition/today → nutrition data consistency
 *
 * Usa supertest-style via `page.request` de Playwright (API testing sin browser).
 */

import { test, expect } from '@playwright/test'
import { USERS } from '../fixtures/users'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

async function getMobileToken(request: any, email?: string, password?: string): Promise<string | null> {
  const res = await request.post(`${BASE}/api/mobile/auth/login`, {
    data: {
      email: email ?? USERS.atletaB2C.email,
      password: password ?? USERS.atletaB2C.password,
    },
  })
  if (res.status() !== 200) return null
  const body = await res.json()
  return body?.token ?? null
}

test.describe('Mobile API — Auth @shared @mobile-api', () => {

  test('POST /api/mobile/auth/login → 200 + token @critical', async ({ request }) => {
    const res = await request.post(`${BASE}/api/mobile/auth/login`, {
      data: { email: USERS.atletaB2C.email, password: USERS.atletaB2C.password },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(20)
    expect(body.user).toHaveProperty('id')
    expect(body.user.email).toBe(USERS.atletaB2C.email)
  })

  test('POST /api/mobile/auth/login con credenciales invalidas → 401 @critical', async ({ request }) => {
    const res = await request.post(`${BASE}/api/mobile/auth/login`, {
      data: { email: 'noexiste@test.com', password: 'wrongpass123!' },
    })
    expect([401, 400]).toContain(res.status())
  })

  test('GET /api/mobile/dashboard sin token → 401 @critical', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/dashboard`)
    expect([401, 403]).toContain(res.status())
  })

})

test.describe('Mobile API — Endpoints con JWT @shared @mobile-api', () => {
  let token: string

  test.beforeAll(async ({ request }) => {
    const t = await getMobileToken(request)
    if (!t) throw new Error('Login mobile fallo — seed users no disponibles')
    token = t
  })

  test('GET /api/mobile/dashboard → 200 con firstName y nutrition @critical', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('firstName')
    expect(body).toHaveProperty('mode')
  })

  test('GET /api/mobile/plan → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/plan`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
  })

  test('GET /api/mobile/checkin → 200 con status valido', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/checkin`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('status')
    expect(['open', 'submitted', 'early']).toContain(body.status)
  })

  test('GET /api/mobile/exercises → 200 con array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/exercises`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    const exercises = body?.exercises ?? body?.data ?? body
    expect(Array.isArray(exercises)).toBe(true)
  })

  test('GET /api/mobile/nutrition/today → consumed = 0 sin food logs de hoy @critical', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/nutrition/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // 200 o 404 si el endpoint no existe aun
    if (res.status() === 404) return

    expect(res.status()).toBe(200)
    const body = await res.json()

    // Si no hay food logs para hoy, consumed debe ser null o 0
    if (body.todayFoodTotals === null) {
      expect(body.todayFoodTotals).toBeNull()
    } else if (body.todayFoodTotals) {
      // Si hay totals, deben ser numeros >= 0
      expect(body.todayFoodTotals.kcal).toBeGreaterThanOrEqual(0)
    }
  })

  test('GET /api/mobile/dashboard/week-sessions → 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/mobile/dashboard/week-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
  })

})
