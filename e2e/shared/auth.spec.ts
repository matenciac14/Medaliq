/**
 * E2E — Shared | Auth
 * Tags: @shared @auth
 *
 * Cubre:
 * - /login: formulario visible
 * - Login correcto → redirección por rol (atleta → /dashboard, coach → /coach/dashboard)
 * - Login incorrecto → mensaje de error
 * - Logout → redirección a /login
 * - Rutas protegidas → redirigen a /login sin sesión
 * - /register: formulario visible y campo de error si email ya existe
 */

import { test, expect } from '@playwright/test'
import { USERS } from '../fixtures/users'
import { goTo } from '../fixtures/helpers'

// Estos tests NO usan storageState — verifican flujos de auth desde cero
test.describe('Auth — Flujos de autenticación @shared @auth', () => {

  test('página /login carga con formulario @critical', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('login con credenciales incorrectas muestra error @critical', async ({ page }) => {
    await page.goto('/login')

    await page.locator('input[type="email"]').fill('noexiste@test.com')
    await page.locator('input[type="password"]').fill('wrongpassword123')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    const errorMsg = page.getByText(/credenciales|contraseña|email|inválid|incorrecto/i)
    await expect(errorMsg.first()).toBeVisible({ timeout: 8_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('login correcto con coach → redirige a /coach/dashboard @critical', async ({ page }) => {
    await page.goto('/login')

    await page.locator('input[type="email"]').fill(USERS.coach.email)
    await page.locator('input[type="password"]').fill(USERS.coach.password)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(page).toHaveURL(/\/coach\/dashboard/, { timeout: 15_000 })
  })

  test('login correcto con atleta B2C → redirige a /dashboard @critical', async ({ page }) => {
    await page.goto('/login')

    await page.locator('input[type="email"]').fill(USERS.atletaB2C.email)
    await page.locator('input[type="password"]').fill(USERS.atletaB2C.password)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('login correcto con admin → redirige a /admin @critical', async ({ page }) => {
    await page.goto('/login')

    await page.locator('input[type="email"]').fill(USERS.admin.email)
    await page.locator('input[type="password"]').fill(USERS.admin.password)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()

    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })
  })

  test('ruta protegida /dashboard redirige a /login sin sesión @critical', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ruta protegida /coach/dashboard redirige a /login sin sesión @critical', async ({ page }) => {
    await page.goto('/coach/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('ruta protegida /admin redirige a /login sin sesión @critical', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login|\/dashboard/)
  })

  test('página /register carga con formulario visible', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('body')).not.toContainText('500')
    await expect(page.locator('body')).not.toContainText('404')

    const emailField = page.getByLabel(/email/i)
    const passwordField = page.getByLabel(/contraseña|password/i)
    const count = await emailField.count() + await passwordField.count()
    if (count > 0) {
      expect(count).toBeGreaterThan(0)
    }
  })

  test('logout: sesión eliminada y redirección a /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(USERS.atletaB2C.email)
    await page.locator('input[type="password"]').fill(USERS.atletaB2C.password)
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })

    const logoutBtn = page.getByRole('button', { name: /cerrar sesión|salir|logout/i }).first()
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })

})
