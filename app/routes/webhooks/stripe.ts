import { Hono } from 'hono'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { verifyStripeSignature } from '../../services/stripe'
import type { Env, Plan } from '../../types'
import type { StripeEvent, StripeCheckoutSession, StripeSubscription } from '../../services/stripe'

const stripeWebhooks = new Hono<{ Bindings: Env }>()

stripeWebhooks.post('/', async (c) => {
  const sig = c.req.header('stripe-signature') ?? null
  const body = await c.req.text()

  if (!await verifyStripeSignature(body, sig, c.env.STRIPE_WEBHOOK_SECRET)) {
    return c.json({ error: 'invalid signature' }, 400)
  }

  const event = JSON.parse(body) as StripeEvent
  const db = getDb(c.env.DB)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeCheckoutSession
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan as Plan | undefined
        if (!userId || !plan) break

        await db.update(users).set({
          plan,
          stripeCustomerId: session.customer ?? undefined,
          stripeSubscriptionId: session.subscription ?? undefined,
        }).where(eq(users.id, userId))
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as StripeSubscription
        const user = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, sub.customer))
          .get()
        if (!user) break

        const priceId = sub.items.data[0]?.price.id
        const active = sub.status === 'active' || sub.status === 'trialing'
        const plan: Plan = !active
          ? 'free'
          : priceId === c.env.STRIPE_PRO_PRICE_ID
          ? 'pro'
          : priceId === c.env.STRIPE_TEAM_PRICE_ID
          ? 'team'
          : 'free'

        await db.update(users).set({ plan }).where(eq(users.id, user.id))
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSubscription
        const user = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, sub.customer))
          .get()
        if (!user) break

        await db.update(users)
          .set({ plan: 'free', stripeSubscriptionId: null })
          .where(eq(users.id, user.id))
        break
      }
    }
  } catch (err) {
    console.error('Stripe webhook error:', err)
    return c.json({ error: 'handler failed' }, 500)
  }

  return c.json({ received: true })
})

export { stripeWebhooks }
