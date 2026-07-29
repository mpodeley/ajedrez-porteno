import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pieces } from '../src/catalog.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
let failed = false

for (const piece of pieces) {
  const file = join(root, 'public', 'stl', piece.stlFile)
  const result = spawnSync('assimp', ['info', file], { encoding: 'utf8' })
  if (result.status === 0 && result.stdout.includes('Meshes:')) {
    console.log(`OK    ${piece.role.padEnd(8)} Assimp importó ${piece.stlFile}`)
  } else {
    failed = true
    console.error(`ERROR ${piece.role.padEnd(8)} ${result.stderr || result.stdout}`)
  }
}

if (failed) process.exitCode = 1
