export type ViewerStatus =
  | { kind: 'idle' }
  | { kind: 'loading'; progress: number }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }

export const loadingProgress = (loaded: number, total: number): ViewerStatus => ({
  kind: 'loading',
  progress: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
})

export const readableLoadError = (value: unknown): Extract<ViewerStatus, { kind: 'error' }> => ({
  kind: 'error',
  message: value instanceof Error
    ? value.message
    : 'No pudimos abrir el modelo. Probá la descarga directa.',
})
