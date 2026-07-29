import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Zip, ZipDeflate } from 'fflate'
import { pieces, setZipFile } from '../src/catalog.ts'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outputDirectory = join(root, 'public', 'downloads')
await mkdir(outputDirectory, { recursive: true })

const archive = await new Promise<Uint8Array>((resolve, reject) => {
  const chunks: Uint8Array[] = []
  const zip = new Zip((error, chunk, final) => {
    if (error) return reject(error)
    chunks.push(chunk)
    if (final) {
      const total = chunks.reduce((sum, part) => sum + part.length, 0)
      const result = new Uint8Array(total)
      let offset = 0
      for (const part of chunks) {
        result.set(part, offset)
        offset += part.length
      }
      resolve(result)
    }
  })

  void Promise.all(pieces.map(async (piece) => {
    const entry = new ZipDeflate(piece.stlFile, { level: 6 })
    zip.add(entry)
    entry.push(await readFile(join(root, 'public', 'stl', piece.stlFile)), true)
  })).then(() => zip.end(), reject)
})

const target = join(outputDirectory, setZipFile)
await writeFile(target, archive)
console.log(`${setZipFile} · ${(archive.length / 1024 / 1024).toFixed(2)} MiB · ${pieces.length} STL`)
