import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { pieces } from '../src/catalog'
import { inspectBinaryStl } from '../scripts/stl-utils'

describe('entregables STL', () => {
  for (const piece of pieces) {
    it(`${piece.role} es un sólido cerrado con las medidas declaradas`, async () => {
      const file = join(process.cwd(), 'public', 'stl', piece.stlFile)
      await access(file)
      const stats = await inspectBinaryStl(file)
      expect(stats.height).toBeCloseTo(piece.heightMm, 1)
      expect(stats.diameter).toBeCloseTo(piece.baseDiameterMm, 1)
      expect(stats.min[2]).toBeCloseTo(0, 2)
      expect(stats.nonFiniteValues).toBe(0)
      expect(stats.degenerateFaces).toBe(0)
      expect(stats.boundaryEdges).toBe(0)
      expect(stats.nonManifoldEdges).toBe(0)
      expect(stats.shells).toBe(1)
    })
  }
})
