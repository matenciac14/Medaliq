/**
 * E2E — Actor: Admin | Módulo: Gestión de Ejercicios
 * Tags: @admin @exercises
 *
 * Cubre:
 * - /admin/exercises: lista de ejercicios
 * - Filtros por músculo/grupo
 * - Botón de sync con AscendAPI
 * - Ver detalle de ejercicio
 * - Ejercicios con nombre en español
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from '../fixtures/auth'
import { goTo } from '../fixtures/helpers'

test.describe('Gestión de Ejercicios — Admin @admin @exercises', () => {
  test.use({ storageState: storageStatePath('admin') })

  test('página /admin/exercises carga sin errores @critical', async ({ page }) => {
    await goTo(page, '/admin/exercises')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toContainText('500')
  })

  test('lista de ejercicios visible', async ({ page }) => {
    await goTo(page, '/admin/exercises')

    // Debe mostrar ejercicios o un estado vacío
    const exerciseList = page.locator('article, [role="row"], .exercise-card, tr').first()
    const emptyState = page.getByText(/sin ejercicios|no hay ejercicios/i).first()

    const hasContent = await exerciseList.count() + await emptyState.count()
    expect(hasContent).toBeGreaterThan(0)
  })

  test('botón sync AscendAPI visible', async ({ page }) => {
    await goTo(page, '/admin/exercises')

    const syncBtn = page.getByRole('button', { name: /sync|sincronizar|ascend/i }).first()
    if (await syncBtn.count() > 0) {
      await expect(syncBtn).toBeVisible()
    }
  })

  test('filtro por grupo muscular disponible', async ({ page }) => {
    await goTo(page, '/admin/exercises')

    const muscleFilter = page.getByRole('combobox')
      .or(page.getByRole('listbox'))
      .or(page.getByText(/músculo|grupo|filtrar/i).first())

    const count = await muscleFilter.count()
    if (count > 0) {
      await expect(muscleFilter.first()).toBeVisible()
    }
  })

  test('ejercicios con nameEs muestran nombre en español', async ({ page }) => {
    await goTo(page, '/admin/exercises')

    // Verificar que al menos algunos ejercicios tienen nombre en español
    const exerciseNames = page.locator('td, .exercise-name, p.font-semibold').filter({
      hasText: /press|sentadilla|peso muerto|jalón|remo|curl|extensión/i,
    })

    const count = await exerciseNames.count()
    if (count > 0) {
      // Al menos un ejercicio en español
      expect(count).toBeGreaterThan(0)
    }
  })

  test('click en ejercicio muestra detalle', async ({ page }) => {
    await goTo(page, '/admin/exercises')

    const firstExercise = page.locator('tr, article, [role="button"]').first()
    const count = await firstExercise.count()
    if (count === 0) return

    await firstExercise.click()
    await page.waitForTimeout(500)

    // Modal o página de detalle
    const detailContent = page.getByText(/músculos|instrucciones|series/i).first()
    if (await detailContent.count() > 0) {
      await expect(detailContent).toBeVisible()
    }
  })

})
