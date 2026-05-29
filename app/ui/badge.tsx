import type { Child, FC } from 'hono/jsx'

type Variant = 'default' | 'secondary' | 'success' | 'destructive' | 'outline'

interface BadgeProps {
  variant?: Variant
  class?: string
  children?: Child
}

const variants: Record<Variant, string> = {
  default:     'bg-primary/10 text-primary border-primary/20',
  secondary:   'bg-secondary text-secondary-foreground border-border',
  success:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  outline:     'bg-transparent text-foreground border-border',
}

export const Badge: FC<BadgeProps> = ({ variant = 'default', class: className = '', children }) => (
  <span class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
    {children}
  </span>
)
