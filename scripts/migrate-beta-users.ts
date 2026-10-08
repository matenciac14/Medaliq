/**
 * Script: migrate-beta-users
 *
 * Migrates all existing users to a TRIAL subscription (14 days from now).
 * Run this BEFORE enabling BILLING_ENABLED=true in production.
 *
 * Usage:
 *   DRY_RUN=true  pnpm tsx scripts/migrate-beta-users.ts   ← default, no writes
 *   DRY_RUN=false pnpm tsx scripts/migrate-beta-users.ts   ← applies changes
 *
 * What it does:
 *   - Finds all users WITHOUT a UserSubscription record
 *   - Creates a UserSubscription with tier=TRIAL and trialEndsAt=now+14d
 *   - Skips users already on any tier
 */

import { prisma } from '../src/lib/db/prisma'

const DRY_RUN = process.env.DRY_RUN !== 'false'
const TRIAL_DAYS = 14

async function main() {
  console.log(`[migrate-beta-users] DRY_RUN=${DRY_RUN}`)

  const now = new Date()
  const trialEndsAt = new Date(now)
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS)

  // Find users with no subscription yet
  const usersWithoutSub = await prisma.user.findMany({
    where: {
      role: 'ATHLETE',
      subscription: null,
    },
    select: { id: true, email: true, name: true },
  })

  console.log(`Found ${usersWithoutSub.length} athletes without a subscription.`)

  if (DRY_RUN) {
    console.log('[DRY RUN] Would create TRIAL subscriptions for:')
    for (const u of usersWithoutSub) {
      console.log(`  - ${u.email} (${u.name ?? 'no name'}) → TRIAL until ${trialEndsAt.toISOString()}`)
    }
    console.log('[DRY RUN] No changes written. Set DRY_RUN=false to apply.')
    return
  }

  let created = 0
  let errors = 0

  for (const u of usersWithoutSub) {
    try {
      await prisma.userSubscription.create({
        data: {
          userId: u.id,
          tier: 'TRIAL',
          trialEndsAt,
        },
      })
      console.log(`  ✓ ${u.email}`)
      created++
    } catch (err) {
      console.error(`  ✗ ${u.email}: ${err instanceof Error ? err.message : String(err)}`)
      errors++
    }
  }

  console.log(`\nDone. Created: ${created} | Errors: ${errors}`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
