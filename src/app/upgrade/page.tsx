import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ATHLETE_PRO_PRICE_USD, ATHLETE_PRO_ANNUAL_PRICE_USD, usdToCopDisplay } from '@/domain/billing/billing.types'
import { getTrmWithMeta } from '@/infrastructure/billing/trm'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import UpgradeClient from './_components/UpgradeClient'

export const metadata = { title: 'Elige tu plan — MedalIQ' }

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/dashboard')

  const params = await searchParams
  const billingStatus = params.billing ?? null
  const userId = session.user.id

  const [sub, { coachRelation }, trmMeta] = await Promise.all([
    prisma.userSubscription.findUnique({
      where: { userId },
      select: { tier: true },
    }),
    loadAthleteData(userId, ['coachRelation']),
    getTrmWithMeta(),
  ])

  // PRO o B2B activo — no necesita upgrade
  const tier = (sub?.tier === 'PRO' ? 'PRO' : 'FREE') as 'FREE' | 'PRO'
  if (tier === 'PRO') redirect('/dashboard')
  if (coachRelation) redirect('/dashboard')

  const priceCOP = usdToCopDisplay(ATHLETE_PRO_PRICE_USD, trmMeta.value)
  const annualPriceCOP = usdToCopDisplay(ATHLETE_PRO_ANNUAL_PRICE_USD, trmMeta.value)

  return (
    <UpgradeClient
      priceCOP={priceCOP}
      priceUSD={ATHLETE_PRO_PRICE_USD}
      annualPriceCOP={annualPriceCOP}
      annualPriceUSD={ATHLETE_PRO_ANNUAL_PRICE_USD}
      trmDate={trmMeta.date}
      billingStatus={billingStatus}
    />
  )
}
