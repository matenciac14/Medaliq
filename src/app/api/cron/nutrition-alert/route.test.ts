import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    coachAthlete: { findMany: vi.fn() },
    assignedNutritionPlan: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/push/expo_push', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/nutrition/get_intensity_for_date', () => ({
  getIntensityMapForDateRange: vi.fn().mockResolvedValue(new Map()),
}))
vi.mock('@/lib/nutrition/daily_target', () => ({
  getDailyNutritionTarget: vi.fn().mockReturnValue({ kcal: 2000, proteinG: 150, carbsG: 200, fatG: 70 }),
}))

import { prisma } from '@/lib/db/prisma'
import { sendPushNotification } from '@/lib/push/expo_push'

const CRON_SECRET = 'test-cron-secret'

function makeRequest(withAuth = true) {
  return new NextRequest('http://localhost/api/cron/nutrition-alert', {
    headers: withAuth ? { authorization: `Bearer ${CRON_SECRET}` } : {},
  })
}

const d1 = new Date(); d1.setDate(d1.getDate() - 1)
const d2 = new Date(); d2.setDate(d2.getDate() - 2)
const d3 = new Date(); d3.setDate(d3.getDate() - 3)

const nutritionPlan = {
  targetKcalHard: 2500,
  targetKcalEasy: 2000,
  targetKcalRest: 1800,
  proteinG: 150,
  carbsHardG: 250,
  carbsEasyG: 200,
  fatG: 70,
}

function makeLowFoodLogs() {
  // 500 kcalLogged = 25% of 2000 — well below 60%
  return [
    { date: d1, kcalLogged: 500, grams: 100, food: { kcalPer100g: 500 } },
    { date: d2, kcalLogged: 500, grams: 100, food: { kcalPer100g: 500 } },
    { date: d3, kcalLogged: 500, grams: 100, food: { kcalPer100g: 500 } },
  ]
}

function makeRelationship(overrides: {
  pushToken?: string | null
  nutritionPlan?: typeof nutritionPlan | null
  foodLogs?: ReturnType<typeof makeLowFoodLogs>
} = {}) {
  return {
    coach: { pushToken: overrides.pushToken !== undefined ? overrides.pushToken : 'ExponentPushToken[test]' },
    athlete: {
      id: 'athlete-1',
      name: 'Test Athlete',
      nutritionPlan: overrides.nutritionPlan !== undefined ? overrides.nutritionPlan : nutritionPlan,
      foodLogs: overrides.foodLogs ?? makeLowFoodLogs(),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = CRON_SECRET
  ;(prisma.assignedNutritionPlan.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
})

describe('GET /api/cron/nutrition-alert', () => {
  it('returns 401 without auth header', async () => {
    const res = await GET(makeRequest(false))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns { alerted: 0 } when no active relationships', async () => {
    ;(prisma.coachAthlete.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('sends push to coach when athlete has 3 days below 60% kcal', async () => {
    ;(prisma.coachAthlete.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([makeRelationship()])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(1)
    expect(sendPushNotification).toHaveBeenCalledWith(
      'ExponentPushToken[test]',
      'Nutrición baja 🥗',
      expect.stringContaining('Test Athlete'),
      expect.any(Object),
    )
  })

  it('does not alert when kcal >= 60% on at least one day', async () => {
    // 1500 kcal = 75% of 2000 — above threshold
    const foodLogs = [
      { date: d1, kcalLogged: 500, grams: 100, food: { kcalPer100g: 500 } },
      { date: d2, kcalLogged: 500, grams: 100, food: { kcalPer100g: 500 } },
      { date: d3, kcalLogged: 1500, grams: 100, food: { kcalPer100g: 500 } },
    ]
    ;(prisma.coachAthlete.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRelationship({ foodLogs }),
    ])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('does not alert when coach has no pushToken', async () => {
    ;(prisma.coachAthlete.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRelationship({ pushToken: null }),
    ])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })

  it('does not alert when athlete has no nutritionPlan and no assigned plan', async () => {
    ;(prisma.coachAthlete.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeRelationship({ nutritionPlan: null }),
    ])
    ;(prisma.assignedNutritionPlan.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.alerted).toBe(0)
    expect(sendPushNotification).not.toHaveBeenCalled()
  })
})
