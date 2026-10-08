import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { ATHLETE_PRO_PRICE_USD, ATHLETE_PRO_ANNUAL_PRICE_USD, usdToCopDisplay } from '@/domain/billing/billing.types'
import { getTrmWithMeta } from '@/infrastructure/billing/trm'
import { loadAthleteData } from '@/infrastructure/db/athlete_loader'
import AthletePlanClient from './_components/AthletePlanClient'

export const metadata = { title: 'Mi Plan — MedalIQ' }

export default async function AthletePlanPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (session.user.role !== 'ATHLETE') redirect('/coach/dashboard')

  const params = await searchParams
  const billingStatus = params.billing ?? null
  const userId = session.user.id

  const [sub, { coachRelation }, trmMeta] = await Promise.all([
    prisma.userSubscription.findUnique({
      where: { userId },
      select: { tier: true, currentPeriodEnd: true },
    }),
    loadAthleteData(userId, ['coachRelation']),
    getTrmWithMeta(),
  ])

  const tier = (sub?.tier === 'PRO' ? 'PRO' : 'FREE') as 'FREE' | 'PRO'
  const currentPeriodEnd = sub?.currentPeriodEnd?.toISOString() ?? null
  const coachName = coachRelation?.coach.name ?? null

  const priceCOP = usdToCopDisplay(ATHLETE_PRO_PRICE_USD, trmMeta.value)
  const annualPriceCOP = usdToCopDisplay(ATHLETE_PRO_ANNUAL_PRICE_USD, trmMeta.value)

  return (
    <AthletePlanClient
      tier={tier}
      currentPeriodEnd={currentPeriodEnd}
      coachName={coachName}
      priceCOP={priceCOP}
      priceUSD={ATHLETE_PRO_PRICE_USD}
      annualPriceCOP={annualPriceCOP}
      annualPriceUSD={ATHLETE_PRO_ANNUAL_PRICE_USD}
      trmDate={trmMeta.date}
      billingStatus={billingStatus}
    />
  )
}
