import { describe, expect, it } from 'vitest'
import { pieceById, pieces } from '../src/catalog'

describe('catálogo', () => {
  it('define las seis piezas y sus cantidades reglamentarias', () => {
    expect(pieces).toHaveLength(6)
    expect(pieces.reduce((total, piece) => total + piece.quantityPerSide, 0)).toBe(16)
    expect(Object.fromEntries(pieces.map((piece) => [piece.id, piece.quantityPerSide]))).toEqual({
      rey: 1,
      reina: 1,
      alfil: 2,
      caballo: 2,
      torre: 2,
      peon: 8,
    })
  })

  it('mantiene identificadores y archivos únicos', () => {
    expect(new Set(pieces.map((piece) => piece.id)).size).toBe(6)
    expect(new Set(pieces.map((piece) => piece.stlFile)).size).toBe(6)
    expect(pieces.every((piece) => piece.stlFile.endsWith('.stl'))).toBe(true)
  })

  it('expone medidas y encuadres válidos', () => {
    for (const piece of pieces) {
      expect(piece.heightMm).toBeGreaterThan(piece.baseDiameterMm)
      expect(piece.baseDiameterMm).toBeGreaterThanOrEqual(28)
      expect(piece.camera.distance).toBeGreaterThan(piece.heightMm)
    }
    expect(pieceById('alfil').landmark).toContain('Obelisco')
  })
})
