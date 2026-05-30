import type { FC } from 'hono/jsx'
import { AppShell } from '../layouts/AppShell'
import type { Plan } from '../../types'

interface Props {
  user: { name: string; image?: string | null }
  currentPlan: Plan
  projectCount: number
  hasSubscription: boolean
  success?: boolean
}

const PLANS: { id: Plan; name: string; price: string; features: string[] }[] = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    features: ['1 project', 'Public docs', 'docship.app subdomain', 'Full-text search', 'llms.txt'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€6/mo',
    features: ['Unlimited projects', 'Private docs', 'Custom domain', 'Analytics', 'OpenAPI reference'],
  },
  {
    id: 'team',
    name: 'Team',
    price: '€12/mo',
    features: ['Everything in Pro', 'Team members', 'SSO', 'Priority support'],
  },
]

const Billing: FC<Props> = ({ user, currentPlan, projectCount, hasSubscription, success }) => (
  <AppShell user={user}>
    <div class="mb-8">
      <a href="/dashboard" class="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-4">
        ← Dashboard
      </a>
      <h1 class="text-2xl font-bold">Billing</h1>
    </div>

    {success && (
      <div class="rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-6">
        Subscription activated. Welcome to {currentPlan === 'team' ? 'Team' : 'Pro'}!
      </div>
    )}

    {/* Current plan */}
    <div class="rounded-xl border border-border bg-card p-6 mb-6 max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">Current plan</p>
          <div class="flex items-center gap-2">
            <span class="text-xl font-bold capitalize">{currentPlan}</span>
            <span class={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              currentPlan === 'free'
                ? 'bg-muted/50 text-muted-foreground border-border'
                : 'bg-primary/10 text-primary border-primary/20'
            }`}>
              {currentPlan === 'free' ? 'Free' : 'Active'}
            </span>
          </div>
        </div>
        {hasSubscription && (
          <button
            id="manage-btn"
            type="button"
            class="h-9 px-4 rounded-md border border-border text-sm hover:bg-accent transition-colors cursor-pointer"
          >
            Manage subscription
          </button>
        )}
      </div>

      {/* Usage */}
      <div>
        <div class="flex items-center justify-between text-sm mb-1.5">
          <span class="text-muted-foreground">Projects</span>
          <span class="font-medium tabular-nums">
            {projectCount} / {currentPlan === 'free' ? '1' : '∞'}
          </span>
        </div>
        {currentPlan === 'free' && (
          <div class="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              class={`h-full rounded-full transition-all ${projectCount >= 1 ? 'bg-destructive' : 'bg-primary/50'}`}
              style={`width: ${Math.min(projectCount, 1) * 100}%`}
            />
          </div>
        )}
      </div>
    </div>

    {/* Upgrade plans */}
    {currentPlan !== 'team' && (
      <div class="max-w-2xl">
        <h2 class="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
          {currentPlan === 'free' ? 'Upgrade your plan' : 'Available upgrades'}
        </h2>
        <div class="grid sm:grid-cols-2 gap-4">
          {PLANS.filter((p) => p.id !== 'free' && p.id !== currentPlan).map((plan) => (
            <div class="rounded-xl border border-border bg-card p-5 flex flex-col">
              <div class="mb-3">
                <p class="text-xs text-muted-foreground font-medium mb-0.5">{plan.name}</p>
                <p class="text-2xl font-bold">{plan.price}</p>
              </div>
              <ul class="space-y-1.5 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li class="text-sm text-muted-foreground flex items-center gap-2">
                    <span class="text-emerald-400 shrink-0">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                data-plan={plan.id}
                class="upgrade-btn h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer w-full"
              >
                Upgrade to {plan.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    )}

    <script dangerouslySetInnerHTML={{ __html: `
      async function redirectToStripe(url) {
        window.location.href = url;
      }

      document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          this.textContent = 'Loading...';
          this.disabled = true;
          try {
            const res = await fetch('/api/billing/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ plan: this.dataset.plan }),
            });
            const { url, error } = await res.json();
            if (error) { alert(error); this.disabled = false; return; }
            redirectToStripe(url);
          } catch {
            this.disabled = false;
          }
        });
      });

      document.getElementById('manage-btn')?.addEventListener('click', async function() {
        this.textContent = 'Loading...';
        this.disabled = true;
        try {
          const res = await fetch('/api/billing/portal', { method: 'POST' });
          const { url, error } = await res.json();
          if (error) { alert(error); this.disabled = false; return; }
          window.location.href = url;
        } catch {
          this.disabled = false;
        }
      });
    `}} />
  </AppShell>
)

export default Billing
