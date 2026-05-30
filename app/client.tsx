import { createInertiaApp } from '@ts-76/inertia-hono-jsx'
import { router } from '@inertiajs/core'

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob('./pages/**/*.tsx', { eager: true })
    return pages[`./pages/${name}.tsx`] as never
  }
})

// Navigation progress bar
const bar = document.createElement('div')
bar.id = 'inertia-progress'
document.body.appendChild(bar)

router.on('start', () => bar.classList.add('loading'))
router.on('finish', () => bar.classList.remove('loading'))
