import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pieces } from '../src/catalog.ts'
import { buildClosedPiece } from '../models/manifold.ts'
import { solidToBinaryStl } from './manifold-mesh.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'public', 'stl')

await mkdir(output, { recursive: true })

for (const piece of pieces) {
  const geometry = buildClosedPiece(piece)
  const result = solidToBinaryStl(geometry)
  geometry.delete()
  await writeFile(join(output, piece.stlFile), result.bytes)
  console.log(
    `${piece.role.padEnd(8)} ${piece.stlFile.padEnd(30)} ` +
    `${(result.bytes.length / 1024).toFixed(1)} KiB · ${result.triangles} tri · ${result.shells} sólido`,
  )
}
