import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '../../middleware/auth'
import { stripePost } from '../../services/stripe'
import type { AppEnv } from '../../types'
import type { StripeCheckoutSession, StripePortalSession } from '../../services/stripe'

const billingRouter = new Hono<AppEnv>()
billingRouter.use('/*', requireAuth)

// POST /api/billing/checkout — create a Stripe Checkout session
billingRouter.post('/checkout', async (c) => {
  const userId = c.get('userId')
  const { plan } = await c.req.json<{ plan: 'pro' | 'team' }>()

  if (!plan || (plan !== 'pro' && plan !== 'team')) {
    return c.json({ error: 'invalid plan' }, 400)
  }

  const db = getDb(c.env.DB)
  const user = await db
    .select({ email: users.email, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user) return c.json({ error: 'not found' }, 404)

  const priceId = plan === 'pro' ? c.env.STRIPE_PRO_PRICE_ID : c.env.STRIPE_TEAM_PRICE_ID

  const sessionData: Record<string, unknown> = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${c.env.APP_URL}/billing?success=1`,
    cancel_url: `${c.env.APP_URL}/billing`,
    metadata: { userId, plan },
    allow_promotion_codes: true,
  }

  if (user.stripeCustomerId) {
    sessionData.customer = user.stripeCustomerId
  } else {
    sessionData.customer_email = user.email
  }

  try {
    const session = await stripePost<StripeCheckoutSession>(
      'checkout/sessions',
      sessionData,
      c.env.STRIPE_SECRET_KEY
    )
    return c.json({ url: session.url })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'stripe error' }, 500)
  }
})

// POST /api/billing/portal — open the Stripe Customer Portal
billingRouter.post('/portal', async (c) => {
  const userId = c.get('userId')
  const db = getDb(c.env.DB)

  const user = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .get()

  if (!user?.stripeCustomerId) {
    return c.json({ error: 'no subscription found' }, 400)
  }

  try {
    const portal = await stripePost<StripePortalSession>(
      'billing_portal/sessions',
      { customer: user.stripeCustomerId, return_url: `${c.env.APP_URL}/billing` },
      c.env.STRIPE_SECRET_KEY
    )
    return c.json({ url: portal.url })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'stripe error' }, 500)
  }
})

export { billingRouter }
