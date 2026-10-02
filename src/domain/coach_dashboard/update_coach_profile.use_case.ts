import type { PrismaClient } from '../../generated/prisma/client'

// ── Types ────────────────────────────────────────────────────────────────────

export interface UpdateCoachProfileInput {
  slug?: string
  bio?: string
  headline?: string
  city?: string
  country?: string
  whatsapp?: string
  instagram?: string
  yearsExp?: string | number
  specialties?: string[]
  certifications?: string[]
  isPublic?: boolean
  avatarUrl?: string
  identification?: string
  phoneWa?: string
}

// ── Use case ─────────────────────────────────────────────────────────────────

export async function updateCoachProfileUseCase(
  input: UpdateCoachProfileInput,
  coachId: string,
  db: PrismaClient,
) {
  const {
    slug, bio, headline, city, country, whatsapp, instagram,
    yearsExp, specialties, certifications, isPublic, avatarUrl,
    identification, phoneWa,
  } = input

  // Validate slug
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    throw { status: 400, message: 'El slug solo puede contener letras minúsculas, números y guiones.' }
  }

  // Validate identification
  if (identification !== undefined) {
    const trimmed = (identification ?? '').trim()
    if (trimmed.length < 5 || trimmed.length > 30) {
      throw { status: 400, message: 'La identificación debe tener entre 5 y 30 caracteres.' }
    }
  }

  // Validate phoneWa
  if (phoneWa !== undefined && !/^\+[1-9]\d{7,14}$/.test(phoneWa ?? '')) {
    throw { status: 400, message: 'El número de WhatsApp debe estar en formato internacional (ej: +573001234567).' }
  }

  // Uniqueness checks in parallel
  const [slugConflict, idConflict, phoneConflict] = await Promise.all([
    slug
      ? db.coachProfile.findUnique({ where: { slug } })
      : Promise.resolve(null),
    identification !== undefined
      ? db.user.findFirst({
          where: { identification: identification.trim(), role: 'COACH', NOT: { id: coachId } },
          select: { id: true },
        })
      : Promise.resolve(null),
    phoneWa !== undefined
      ? db.user.findFirst({
          where: { phoneWa, role: 'COACH', NOT: { id: coachId } },
          select: { id: true },
        })
      : Promise.resolve(null),
  ])

  if (slugConflict && slugConflict.coachId !== coachId) {
    throw { status: 409, message: 'Ese slug ya está en uso.' }
  }
  if (idConflict) {
    throw { status: 409, message: 'Ya existe un coach registrado con esa identificación.' }
  }
  if (phoneConflict) {
    throw { status: 409, message: 'Ya existe un coach registrado con ese número de WhatsApp.' }
  }

  // Persist identification + phoneWa in User
  if (identification !== undefined || phoneWa !== undefined) {
    await db.user.update({
      where: { id: coachId },
      data: {
        ...(identification !== undefined && { identification: identification.trim() }),
        ...(phoneWa !== undefined && { phoneWa }),
      },
    })
  }

  try {
    const profile = await db.coachProfile.upsert({
      where: { coachId },
      create: {
        coachId,
        slug: slug ?? coachId,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
        headline: headline ?? null,
        specialties: specialties ?? [],
        city: city ?? null,
        country: country ?? 'CO',
        whatsapp: whatsapp ?? null,
        instagram: instagram ?? null,
        yearsExp: yearsExp ? parseInt(String(yearsExp)) : null,
        certifications: certifications ?? [],
        isPublic: isPublic ?? false,
      },
      update: {
        ...(slug !== undefined && { slug }),
        ...(bio !== undefined && { bio }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(headline !== undefined && { headline }),
        ...(specialties !== undefined && { specialties }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(whatsapp !== undefined && { whatsapp }),
        ...(instagram !== undefined && { instagram }),
        ...(yearsExp !== undefined && { yearsExp: yearsExp ? parseInt(String(yearsExp)) : null }),
        ...(certifications !== undefined && { certifications }),
        ...(isPublic !== undefined && { isPublic }),
      },
    })
    return profile
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code === 'P2002') {
      throw { status: 409, message: 'Ese slug ya está en uso.' }
    }
    throw err
  }
}
