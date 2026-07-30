import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pieces } from '../src/catalog.ts'
import { buildClosedPiece } from '../models/manifold.ts'
import { solidToBinaryStl } from './manifold-mesh.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'public', 'stl')

await mkdir(output, { recursive: true })

for (const piece of pieces) {
  const curatedPath = join(root, 'models', 'curated', piece.stlFile)
  try {
    const curated = await readFile(curatedPath)
    await writeFile(join(output, piece.stlFile), curated)
    const triangles = curated.readUInt32LE(80)
    console.log(
      `${piece.role.padEnd(8)} ${piece.stlFile.padEnd(30)} ` +
      `${(curated.length / 1024).toFixed(1)} KiB · ${triangles} tri · curado`,
    )
    continue
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const geometry = buildClosedPiece(piece)
  const result = solidToBinaryStl(geometry)
  geometry.delete()
  await writeFile(join(output, piece.stlFile), result.bytes)
  console.log(
    `${piece.role.padEnd(8)} ${piece.stlFile.padEnd(30)} ` +
    `${(result.bytes.length / 1024).toFixed(1)} KiB · ${result.triangles} tri · ${result.shells} sólido`,
  )
}
