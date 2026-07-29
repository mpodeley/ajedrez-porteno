import Module from 'manifold-3d'

const wasm = await Module()
wasm.setup()

const { Manifold, Mesh } = wasm

export interface ManifoldResult {
  bytes: Buffer
  status: string
  shells: number
  volume: number
  triangles: number
}

const combine = (parts: ArrayBuffer[]): Buffer =>
  Buffer.concat(parts.map((part) => Buffer.from(part)))

const stlToMesh = (parts: ArrayBuffer[]) => {
  const input = combine(parts)
  const triangleCount = input.readUInt32LE(80)
  const positions = new Float32Array(triangleCount * 9)
  const indices = new Uint32Array(triangleCount * 3)
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const offset = 84 + triangle * 50 + 12
    for (let corner = 0; corner < 3; corner += 1) {
      const index = triangle * 3 + corner
      indices[index] = index
      positions[index * 3] = input.readFloatLE(offset + corner * 12)
      positions[index * 3 + 1] = input.readFloatLE(offset + corner * 12 + 4)
      positions[index * 3 + 2] = input.readFloatLE(offset + corner * 12 + 8)
    }
  }
  const mesh = new Mesh({
    numProp: 3,
    vertProperties: positions,
    triVerts: indices,
    tolerance: 0.0005,
  })
  mesh.merge()
  return mesh
}

export const meshToBinaryStl = (mesh: InstanceType<typeof Mesh>): Buffer => {
  const triangleCount = mesh.triVerts.length / 3
  const output = Buffer.alloc(84 + triangleCount * 50)
  output.fill(0x20, 0, 80)
  output.write('Ajedrez Porteno · manifold STL', 0, 'ascii')
  output.writeUInt32LE(triangleCount, 80)

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const outputOffset = 84 + triangle * 50
    const vertices = [0, 1, 2].map((corner) => {
      const index = mesh.triVerts[triangle * 3 + corner] * mesh.numProp
      return [
        mesh.vertProperties[index],
        mesh.vertProperties[index + 1],
        mesh.vertProperties[index + 2],
      ] as const
    })
    const ab = vertices[1].map((value, axis) => value - vertices[0][axis])
    const ac = vertices[2].map((value, axis) => value - vertices[0][axis])
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ]
    const length = Math.hypot(...normal) || 1
    for (let axis = 0; axis < 3; axis += 1) {
      output.writeFloatLE(normal[axis] / length, outputOffset + axis * 4)
    }
    for (let corner = 0; corner < 3; corner += 1) {
      for (let axis = 0; axis < 3; axis += 1) {
        output.writeFloatLE(vertices[corner][axis], outputOffset + 12 + corner * 12 + axis * 4)
      }
    }
  }
  return output
}

export const solidToBinaryStl = (solid: InstanceType<typeof Manifold>): ManifoldResult => {
  const status = solid.status()
  if (status !== 'NoError') throw new Error(`Sólido inválido: ${status}`)
  const components = solid.decompose()
  const shells = components.length
  for (const component of components) component.delete()
  const volume = solid.volume()
  const outputMesh = solid.getMesh()
  const bytes = meshToBinaryStl(outputMesh)
  const triangles = outputMesh.numTri
  return { bytes, status, shells, volume, triangles }
}

export const closeMesh = (serialized: ArrayBuffer[]): ManifoldResult => {
  const inputMesh = stlToMesh(serialized)
  const solid = new Manifold(inputMesh)
  const status = solid.status()
  if (status !== 'NoError') {
    solid.delete()
    throw new Error(`Manifold no pudo cerrar la malla: ${status}`)
  }
  const components = solid.decompose()
  const shells = components.length
  for (const component of components) component.delete()
  const volume = solid.volume()
  const outputMesh = solid.getMesh()
  const bytes = meshToBinaryStl(outputMesh)
  const triangles = outputMesh.numTri
  solid.delete()
  return { bytes, status, shells, volume, triangles }
}
