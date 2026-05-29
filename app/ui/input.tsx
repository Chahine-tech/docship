import type { FC } from 'hono/jsx'

interface InputProps {
  label?: string
  error?: string
  name: string
  type?: string
  value?: string
  placeholder?: string
  required?: boolean
  class?: string
  [key: string]: unknown
}

export const Input: FC<InputProps> = ({ label, error, name, class: className = '', ...props }) => (
  <div class="flex flex-col gap-1.5">
    {label && (
      <label for={name} class="text-sm font-medium text-foreground">
        {label}
      </label>
    )}
    <input
      id={name}
      name={name}
      class={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-destructive' : ''} ${className}`}
      {...props}
    />
    {error && <p class="text-xs text-destructive">{error}</p>}
  </div>
)
