import type { Child, FC } from 'hono/jsx'

type Variant = 'default' | 'secondary' | 'ghost' | 'destructive' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps {
  variant?: Variant
  size?: Size
  class?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  children?: Child
  [key: string]: unknown
}

const variants: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  outline:     'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
}

const sizes: Record<Size, string> = {
  sm:   'h-8 px-3 text-xs rounded-md',
  md:   'h-9 px-4 text-sm rounded-md',
  lg:   'h-10 px-6 text-sm rounded-md',
  icon: 'h-9 w-9 rounded-md',
}

const base = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer'

export const Button: FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  class: className = '',
  href,
  children,
  ...props
}) => {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`
  if (href) return <a href={href} class={cls}>{children}</a>
  return <button class={cls} {...props}>{children}</button>
}
