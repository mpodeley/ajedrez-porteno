import { readFile } from 'node:fs/promises'

export interface StlStats {
  triangles: number
  min: [number, number, number]
  max: [number, number, number]
  diameter: number
  height: number
  degenerateFaces: number
  nonFiniteValues: number
  boundaryEdges: number
  nonManifoldEdges: number
  shells: number
}

type Vertex = [number, number, number]

const vertexKey = (vertex: Vertex): string =>
  vertex.map((value) => Math.round(value * 100_000)).join(',')

export const inspectBinaryStl = async (file: string): Promise<StlStats> => {
  const data = await readFile(file)
  if (data.length < 84) throw new Error('STL demasiado corto')
  const triangleCount = data.readUInt32LE(80)
  if (data.length !== 84 + triangleCount * 50) {
    throw new Error(`Longitud STL inválida: ${data.length} bytes para ${triangleCount} triángulos`)
  }

  const min: Vertex = [Infinity, Infinity, Infinity]
  const max: Vertex = [-Infinity, -Infinity, -Infinity]
  const edgeCount = new Map<string, number>()
  const vertexToTriangles = new Map<string, number[]>()
  const triangleVertices: string[][] = []
  let degenerateFaces = 0
  let nonFiniteValues = 0

  for (let face = 0; face < triangleCount; face += 1) {
    const offset = 84 + face * 50
    const vertices: Vertex[] = []
    for (let vertexIndex = 0; vertexIndex < 3; vertexIndex += 1) {
      const vertexOffset = offset + 12 + vertexIndex * 12
      const vertex: Vertex = [
        data.readFloatLE(vertexOffset),
        data.readFloatLE(vertexOffset + 4),
        data.readFloatLE(vertexOffset + 8),
      ]
      vertices.push(vertex)
      for (let axis = 0; axis < 3; axis += 1) {
        if (!Number.isFinite(vertex[axis])) nonFiniteValues += 1
        min[axis] = Math.min(min[axis], vertex[axis])
        max[axis] = Math.max(max[axis], vertex[axis])
      }
    }

    const ab = vertices[1].map((v, i) => v - vertices[0][i]) as Vertex
    const ac = vertices[2].map((v, i) => v - vertices[0][i]) as Vertex
    const cross: Vertex = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    if (Math.hypot(...cross) < 1e-10) degenerateFaces += 1

    const keys = vertices.map(vertexKey)
    triangleVertices.push(keys)
    for (const key of keys) {
      const faces = vertexToTriangles.get(key) ?? []
      faces.push(face)
      vertexToTriangles.set(key, faces)
    }
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const edge = [keys[a], keys[b]].sort().join('|')
      edgeCount.set(edge, (edgeCount.get(edge) ?? 0) + 1)
    }
  }

  const visited = new Set<number>()
  let shells = 0
  for (let start = 0; start < triangleCount; start += 1) {
    if (visited.has(start)) continue
    shells += 1
    const queue = [start]
    visited.add(start)
    while (queue.length) {
      const face = queue.pop()!
      for (const vertex of triangleVertices[face]) {
        for (const neighbor of vertexToTriangles.get(vertex) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }
    }
  }

  return {
    triangles: triangleCount,
    min,
    max,
    diameter: Math.max(max[0] - min[0], max[1] - min[1]),
    height: max[2] - min[2],
    degenerateFaces,
    nonFiniteValues,
    boundaryEdges: [...edgeCount.values()].filter((count) => count === 1).length,
    nonManifoldEdges: [...edgeCount.values()].filter((count) => count > 2).length,
    shells,
  }
}
