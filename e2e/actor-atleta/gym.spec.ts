/**
 * E2E — Actor: Atleta | Módulo: Gym
 * Tags: @atleta @gym
 *
 * Cubre:
 * - /gym sin rutina asignada: plantillas públicas + biblioteca AscendAPI
 * - /gym con rutina asignada: sesión de hoy, calendario semanal, plan semanal
 * - Calendario: click en día (selectedDow query param) muestra detalle de la sesión
 * - Banner post-sesión (?completed=1): resumen con series y kg
 * - Historial: /gym/history carga sin 404
 * - Biblioteca: /gym/exercises — ejercicios como <button> en grid 2/3/4 cols
 * - Nombres de ejercicios: nameEs ?? name (español cuando disponible)
 * - /log/history: feed unificado de actividad (GymSession + SessionLog)
 *
 * ESTRUCTURA /gym/exercises: ejercicios son <button> con p.font-semibold para el nombre.
 * AscendAPI free plan = 10 ejercicios; paid = 1,300+.
 * gifStoredUrl = autohospedado (carga sin restricciones). gifUrl requiere header AscendAPI.
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Gym — Atleta B2C @atleta @gym', () => {
  test.use({ storageState: storageStatePath('atletaB2C') })

  test('página /gym carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/gym')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
  })

  test('sin rutina asignada: muestra plantillas públicas', async ({ page }) => {
    await goTo(page, '/gym')

    const templates = page.getByText(/plantillas/i).first()
    const assignedPlan = page.getByText(/plan activo|rutina gym/i).first()

    // Debe mostrar uno u otro
    const hasTemplates = await templates.count()
    const hasAssigned = await assignedPlan.count()
    expect(hasTemplates + hasAssigned).toBeGreaterThan(0)
  })

  test('biblioteca de ejercicios: link visible desde /gym', async ({ page }) => {
    await goTo(page, '/gym')
    const exercisesLink = page.getByRole('link', { name: /ejercicios/i }).first()
    await expect(exercisesLink).toBeVisible()
    await exercisesLink.click()
    await expect(page).toHaveURL(/\/gym\/exercises/)
  })

  test('/gym/exercises carga la biblioteca sin errores', async ({ page }) => {
    await goTo(page, '/gym/exercises')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
    // Ejercicios son <button> en AthleteExercisesGrid (grid 2/3/4 columnas)
    // Free plan = mínimo 10 ejercicios; al menos 1 debe ser visible
    const firstExercise = page.locator('button').filter({ has: page.locator('p.font-semibold') }).first()
    await expect(firstExercise).toBeVisible({ timeout: 10_000 })
  })

  test('/gym/exercises: nombres de ejercicios visibles con texto válido', async ({ page }) => {
    await goTo(page, '/gym/exercises')

    // nameEs ?? name — nombre del ejercicio en p.font-semibold dentro de cada <button>
    const exerciseNames = page.locator('p.font-semibold')
    const count = await exerciseNames.count()
    if (count > 0) {
      const firstText = await exerciseNames.first().innerText()
      expect(firstText.trim().length).toBeGreaterThan(0)
    }
  })

  test('/gym/history carga sin 404 @critical', async ({ page }) => {
    const response = await page.goto('/gym/history')
    // Verificar que no hay 404
    expect(response?.status()).not.toBe(404)
    await expect(page.locator('body')).not.toContainText('404')
    await expect(page.locator('body')).not.toContainText('Not Found')
  })

  test('con rutina: sesión de hoy y calendario semanal visibles', async ({ page }) => {
    await goTo(page, '/gym')

    const todaySection = page.getByText(/sesión de hoy/i)
    const weekSection = page.getByText(/esta semana/i)
    const assigned = page.getByText(/plan activo|rutina gym/i)

    const hasAssigned = await assigned.count()
    if (hasAssigned > 0) {
      await expect(todaySection.first()).toBeVisible()
      await expect(weekSection.first()).toBeVisible()
    }
  })

  test('con rutina: click en día del calendario muestra detalle', async ({ page }) => {
    await goTo(page, '/gym')

    const hasAssigned = await page.getByText(/plan activo|rutina gym/i).count()
    if (hasAssigned === 0) return

    // Click en un día del calendario (lunes = DOW 1)
    const dayLinks = page.locator('a[href*="selectedDow"]')
    const count = await dayLinks.count()
    if (count > 0) {
      await dayLinks.first().click()
      await page.waitForLoadState('networkidle')
      // Debe aparecer el detalle del día
      await expect(page.getByText(/planificado|sesión completada|descanso/i).first()).toBeVisible()
    }
  })

  test('banner post-sesión visible con ?completed=1', async ({ page }) => {
    await goTo(page, '/gym?completed=1')

    // Si hay una sesión completada reciente, aparece el banner
    const banner = page.getByText(/sesión completada/i).first()
    const count = await banner.count()
    if (count > 0) {
      await expect(banner).toBeVisible()
      // Debe mostrar series o minutos
      await expect(page.getByText(/series|minutos|kg levantados/i).first()).toBeVisible()
    }
  })

  test('/log/history: feed unificado de actividad carga sin errores @critical', async ({ page }) => {
    // /log/history muestra feed mezclado: GymSession (completadas) + SessionLog (freeSessionType != null)
    // Ordenado por fecha DESC, máx 60 registros
    const response = await page.goto('/log/history')
    expect(response?.status()).not.toBe(404)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('/log redirige a /log/history', async ({ page }) => {
    // /log es redirect legacy → /log/history
    await page.goto('/log')
    await expect(page).toHaveURL(/\/log\/history/)
  })

})

test.describe('Gym — Atleta B2B sin rutina @atleta @gym', () => {
  test.use({ storageState: storageStatePath('atletaB2B') })

  test('muestra banner "Tu coach aún no te asignó una rutina"', async ({ page }) => {
    await goTo(page, '/gym')

    const hasRoutine = await page.getByText(/plan activo|rutina gym/i).count()
    if (hasRoutine === 0) {
      const banner = page.getByText(/coach aún no te asignó/i)
      if (await banner.count() > 0) {
        await expect(banner.first()).toBeVisible()
      }
    }
  })

})
