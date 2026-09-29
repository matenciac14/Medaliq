/**
 * Usuarios de test E2E — MedalIQ
 *
 * Coinciden con el seed de desarrollo (prisma/seed.ts).
 * Para CI, el global.setup corre el seed antes de autenticar.
 */

export const USERS = {
  // Atleta B2C con plan activo + nutricion + gym (Miguel seed)
  atletaB2C: {
    email: 'miguel@medaliq.com',
    password: 'atleta123',
    name: 'Miguel',
  },

  // Atleta B2B conectada al coach Carlos (Ana seed)
  atletaB2B: {
    email: 'ana@medaliq.com',
    password: 'atleta123',
    name: 'Ana',
  },

  // Coach con atletas activos (Carlos seed)
  coach: {
    email: 'coach@medaliq.com',
    password: 'coach123',
    name: 'Carlos',
  },

  // Admin
  admin: {
    email: 'admin@medaliq.com',
    password: 'admin123!',
    name: 'Admin',
  },
} as const

export type UserKey = keyof typeof USERS
