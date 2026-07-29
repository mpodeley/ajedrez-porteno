import modeling from '@jscad/modeling'
import { buildPiece } from '../models/jscad.ts'
import { pieces } from '../src/catalog.ts'

const { measurements } = modeling
let failed = false

for (const piece of pieces) {
  const geometry = buildPiece(piece)
  const [min, max] = measurements.measureBoundingBox(geometry)
  const height = max[2] - min[2]
  const diameter = Math.max(max[0] - min[0], max[1] - min[1])
  const valid = (
    Math.abs(height - piece.heightMm) <= 0.05
    && Math.abs(diameter - piece.baseDiameterMm) <= 0.05
    && Math.abs(min[2]) <= 0.01
  )
  console.log(
    `${valid ? 'OK   ' : 'ERROR'} ${piece.role.padEnd(8)} ` +
    `${height.toFixed(2)} × Ø${diameter.toFixed(2)} mm`,
  )
  if (!valid) failed = true
}

if (failed) process.exitCode = 1
