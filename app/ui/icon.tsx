import { createElement } from 'hono/jsx'
import type { FC, Child } from 'hono/jsx'

// Lucide core exports icons as arrays of [tagName, attrs, ...children] tuples
type LucideNode = [string, Record<string, unknown>, ...LucideNode[]]
export type LucideIcon = LucideNode[]

interface Props {
  icon: LucideIcon
  size?: number
  class?: string
  strokeWidth?: number
}

export const Icon: FC<Props> = ({ icon, size = 16, class: cls, strokeWidth = 2 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cls}
  >
    {icon.map((node, i) => renderNode(node, i))}
  </svg>
)

function renderNode(node: LucideNode, key: number): Child {
  const [tag, attrs, ...children] = node
  const props = { key, ...attrs }
  return createElement(
    tag,
    props,
    ...children.map((c, i) => renderNode(c, i))
  )
}
