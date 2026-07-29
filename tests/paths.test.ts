import { describe, expect, it } from 'vitest'
import { normalizeBase, stlAssetUrl, zipAssetUrl } from '../src/paths'

describe('rutas publicables', () => {
  it('normaliza la base de GitHub Pages', () => {
    expect(normalizeBase('/ajedrez-porteno/')).toBe('/ajedrez-porteno/')
    expect(normalizeBase('demo')).toBe('/demo/')
  })

  it('construye rutas de STL y ZIP bajo la base', () => {
    expect(stlAssetUrl('/ajedrez-porteno/', 'rey-cabildo.stl'))
      .toBe('/ajedrez-porteno/stl/rey-cabildo.stl')
    expect(zipAssetUrl('/', 'colección.zip')).toBe('/downloads/colecci%C3%B3n.zip')
  })
})
