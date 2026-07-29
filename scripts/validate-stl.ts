import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pieces } from '../src/catalog.ts'
import { inspectBinaryStl } from './stl-utils.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
let failed = false

for (const piece of pieces) {
  const path = join(root, 'public', 'stl', piece.stlFile)
  const stats = await inspectBinaryStl(path)
  const problems: string[] = []
  if (Math.abs(stats.height - piece.heightMm) > 0.05) problems.push(`altura ${stats.height.toFixed(2)} mm`)
  if (Math.abs(stats.diameter - piece.baseDiameterMm) > 0.05) problems.push(`diámetro ${stats.diameter.toFixed(2)} mm`)
  if (Math.abs(stats.min[2]) > 0.01) problems.push(`base en Z=${stats.min[2].toFixed(3)}`)
  if (stats.degenerateFaces) problems.push(`${stats.degenerateFaces} caras degeneradas`)
  if (stats.nonFiniteValues) problems.push(`${stats.nonFiniteValues} valores no finitos`)
  if (stats.boundaryEdges) problems.push(`${stats.boundaryEdges} aristas abiertas`)
  if (stats.nonManifoldEdges) problems.push(`${stats.nonManifoldEdges} aristas no manifold`)
  if (stats.shells !== 1) problems.push(`${stats.shells} envolventes`)
  if (stats.triangles < 100) problems.push('malla demasiado simple')

  const status = problems.length ? 'ERROR' : 'OK'
  console.log(
    `${status.padEnd(5)} ${piece.role.padEnd(8)} ` +
    `${stats.height.toFixed(2)} × Ø${stats.diameter.toFixed(2)} mm · ` +
    `${stats.triangles.toLocaleString('es-AR')} tri · ${stats.shells} sólido`,
  )
  if (problems.length) {
    failed = true
    console.error(`      ${problems.join('; ')}`)
  }
}

if (failed) process.exitCode = 1
