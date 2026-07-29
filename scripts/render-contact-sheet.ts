import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pieces } from '../src/catalog.ts'

type Vec3 = [number, number, number]
type ProjectedTriangle = { points: string; depth: number; shade: number }

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, '.validation')
await mkdir(output, { recursive: true })

const normalize = (vector: Vec3): Vec3 => {
  const length = Math.hypot(...vector)
  return vector.map((value) => value / length) as Vec3
}
const dot = (a: Vec3, b: Vec3): number => a.reduce((sum, value, index) => sum + value * b[index], 0)
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]

const view = normalize([1, -1.35, 0.72])
const right = normalize(cross(view, [0, 0, 1]))
const screenUp = normalize(cross(right, view))
const light = normalize([-0.7, -1, 1.5])

const cells: string[] = []
for (const [pieceIndex, piece] of pieces.entries()) {
  const data = await readFile(join(root, 'public', 'stl', piece.stlFile))
  const triangleCount = data.readUInt32LE(80)
  const triangles: ProjectedTriangle[] = []
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = 84 + triangle * 50 + 12
    const vertices = [0, 1, 2].map((corner) => [
      data.readFloatLE(offset + corner * 12),
      data.readFloatLE(offset + corner * 12 + 4),
      data.readFloatLE(offset + corner * 12 + 8),
    ] as Vec3)
    const projected = vertices.map((vertex) => [dot(vertex, right), dot(vertex, screenUp)])
    const ab = vertices[1].map((value, axis) => value - vertices[0][axis]) as Vec3
    const ac = vertices[2].map((value, axis) => value - vertices[0][axis]) as Vec3
    const normal = normalize(cross(ab, ac))
    triangles.push({
      points: projected.map(([x, y]) => `${x.toFixed(3)},${(-y).toFixed(3)}`).join(' '),
      depth: vertices.reduce((sum, vertex) => sum + dot(vertex, view), 0) / 3,
      shade: Math.max(0, dot(normal, light)),
    })
  }
  triangles.sort((a, b) => a.depth - b.depth)

  const column = pieceIndex % 3
  const row = Math.floor(pieceIndex / 3)
  const x = 35 + column * 340
  const y = 35 + row * 390
  const scale = 2.72
  const centerX = x + 145
  const baseY = y + 315
  cells.push(`
    <g>
      <rect x="${x}" y="${y}" width="300" height="350" rx="18" fill="#0b2232" stroke="#29404b"/>
      <g transform="translate(${centerX} ${baseY}) scale(${scale})">
        ${triangles.map((face) => {
          const intensity = Math.round(172 + face.shade * 70)
          return `<polygon points="${face.points}" fill="rgb(${intensity},${intensity - 9},${intensity - 25})"/>`
        }).join('')}
      </g>
      <text x="${x + 22}" y="${y + 29}" fill="#d1a96f" font-family="sans-serif" font-size="10" letter-spacing="2">0${pieceIndex + 1}</text>
      <text x="${x + 50}" y="${y + 30}" fill="#f3ead9" font-family="serif" font-size="18">${piece.role}</text>
      <text x="${x + 22}" y="${y + 336}" fill="#8da0a5" font-family="sans-serif" font-size="9">${piece.shortLandmark} · ${piece.heightMm} mm</text>
    </g>
  `)
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1060" height="810" viewBox="0 0 1060 810">
  <rect width="1060" height="810" fill="#071926"/>
  ${cells.join('')}
</svg>`
const target = join(output, 'contact-sheet.svg')
await writeFile(target, svg)
console.log(target)
