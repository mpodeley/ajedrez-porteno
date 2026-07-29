import { defineConfig } from 'vite'

export const resolveBase = (value = process.env.VITE_BASE): string => {
  const base = value?.trim() || '/ajedrez-porteno/'
  return base.endsWith('/') ? base : `${base}/`
}

export default defineConfig({
  base: resolveBase(),
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
