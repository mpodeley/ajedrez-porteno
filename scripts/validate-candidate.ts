import { resolve } from 'node:path'
import { pieceById, type PieceId } from '../src/catalog.ts'
import { inspectBinaryStl } from './stl-utils.ts'

const [file, rawPiece = 'caballo'] = process.argv.slice(2)
if (!file) {
  throw new Error('Uso: npm run ai3d:validate -- <candidato.stl> [caballo|rey]')
}
if (!['caballo', 'rey'].includes(rawPiece)) {
  throw new Error(`Pieza no soportada: ${rawPiece}`)
}

const piece = pieceById(rawPiece as PieceId)
const stats = await inspectBinaryStl(resolve(file))
const problems: string[] = []
if (Math.abs(stats.height - piece.heightMm) > 0.05) problems.push(`altura ${stats.height.toFixed(3)} mm`)
if (Math.abs(stats.diameter - piece.baseDiameterMm) > 0.05) problems.push(`diámetro ${stats.diameter.toFixed(3)} mm`)
if (Math.abs(stats.min[2]) > 0.01) problems.push(`base Z=${stats.min[2].toFixed(3)}`)
if (stats.degenerateFaces) problems.push(`${stats.degenerateFaces} caras degeneradas`)
if (stats.nonFiniteValues) problems.push(`${stats.nonFiniteValues} valores no finitos`)
if (stats.boundaryEdges) problems.push(`${stats.boundaryEdges} aristas abiertas`)
if (stats.nonManifoldEdges) problems.push(`${stats.nonManifoldEdges} aristas no manifold`)
if (stats.shells !== 1) problems.push(`${stats.shells} envolventes`)

console.log(
  `${problems.length ? 'ERROR' : 'OK'} ${piece.role} · ` +
  `${stats.height.toFixed(2)} × Ø${stats.diameter.toFixed(2)} mm · ` +
  `${stats.triangles.toLocaleString('es-AR')} tri · ${stats.shells} sólido`,
)
if (problems.length) {
  console.error(problems.join('; '))
  process.exitCode = 1
}
