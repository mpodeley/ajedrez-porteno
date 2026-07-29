import { describe, expect, it } from 'vitest'
import { loadingProgress, readableLoadError } from '../src/viewer-state'

describe('estados del visor', () => {
  it('calcula y limita el progreso', () => {
    expect(loadingProgress(25, 100)).toEqual({ kind: 'loading', progress: 25 })
    expect(loadingProgress(110, 100)).toEqual({ kind: 'loading', progress: 100 })
    expect(loadingProgress(5, 0)).toEqual({ kind: 'loading', progress: 0 })
  })

  it('convierte fallos conocidos y desconocidos en mensajes legibles', () => {
    expect(readableLoadError(new Error('404')).message).toBe('404')
    expect(readableLoadError('fallo').message).toContain('descarga directa')
  })
})
