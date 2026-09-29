import { type Page, expect } from '@playwright/test'
import { USERS, type UserKey } from './users'

/**
 * Helpers de autenticación para tests E2E.
 *
 * loginAs() — hace login via UI y espera redirección al dashboard.
 * storageStatePath() — path al archivo de sesión persistida (una por usuario).
 *
 * Uso recomendado: en global.setup.ts crear una sesión por usuario y
 * reutilizarla en los tests via `storageState` en el proyecto de Playwright —
 * así evitamos hacer login en cada spec (más rápido, más estable).
 */

export function storageStatePath(key: UserKey): string {
  return `e2e/.auth/${key}.json`
}

export async function loginAs(page: Page, key: UserKey): Promise<void> {
  const user = USERS[key]

  await page.goto('/login')
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()

  // Esperar redirección post-login según el rol
  const targetUrls: Record<UserKey, RegExp> = {
    atletaB2C:   /\/(dashboard|checkin|plan)/,
    atletaB2B:   /\/(dashboard|pending)/,
    coach:       /\/coach\/dashboard/,
    admin:       /\/admin/,
  }

  await page.waitForURL(targetUrls[key], { timeout: 15_000 })
}

export async function logout(page: Page): Promise<void> {
  // Intentar via UI primero; si no, ir directo a /api/auth/signout
  try {
    await page.getByRole('button', { name: /salir|cerrar sesión|logout/i }).click({ timeout: 3_000 })
  } catch {
    await page.goto('/api/auth/signout')
    await page.getByRole('button', { name: /salir|sign out/i }).click()
  }
  await page.waitForURL(/\/login/, { timeout: 8_000 })
}

/**
 * Verifica que el usuario está autenticado comprobando que hay sesión activa.
 */
export async function expectAuthenticated(page: Page): Promise<void> {
  const response = await page.request.get('/api/auth/session')
  const session = await response.json()
  expect(session?.user?.id).toBeTruthy()
}
