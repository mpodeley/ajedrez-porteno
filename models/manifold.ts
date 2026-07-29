import Module from 'manifold-3d'
import type { PieceDefinition, PieceId } from '../src/catalog.ts'

const wasm = await Module()
wasm.setup()

const { CrossSection, Manifold } = wasm
type Solid = InstanceType<typeof Manifold>
type Vec3 = [number, number, number]

const unite = (...solids: Solid[]): Solid => Manifold.union(solids)
const box = (size: Vec3, center: Vec3): Solid =>
  Manifold.cube(size).translate([
    center[0] - size[0] / 2,
    center[1] - size[1] / 2,
    center[2] - size[2] / 2,
  ])
const cyl = (radius: number, height: number, center: Vec3, segments = 48): Solid =>
  Manifold.cylinder(height, radius, radius, segments, true).translate(center)
const cone = (
  radiusStart: number,
  radiusEnd: number,
  height: number,
  center: Vec3,
  segments = 48,
): Solid => Manifold.cylinder(height, radiusStart, radiusEnd, segments, true).translate(center)
const ball = (radius: number, center: Vec3): Solid =>
  Manifold.sphere(radius, 32).translate(center)
const ellip = (radii: Vec3, center: Vec3): Solid =>
  Manifold.sphere(1, 32).scale(radii).translate(center)
const beam = (start: Vec3, end: Vec3, radius: number): Solid =>
  Manifold.hull([ball(radius, start), ball(radius, end)])
const discY = (radius: number, depth: number, center: Vec3, segments = 32): Solid =>
  Manifold.cylinder(depth, radius, radius, segments, true).rotate([90, 0, 0]).translate(center)
const prismX = (points: [number, number][], depth: number, center: Vec3): Solid =>
  new CrossSection([points])
    .extrude(depth, 0, 0, [1, 1], true)
    .rotate([90, 0, 0])
    .translate(center)

const archedOpeningFront = (
  x: number,
  frontY: number,
  bottom: number,
  spring: number,
  radius: number,
  depth = 2,
): Solid => unite(
  box([radius * 2, depth, spring - bottom], [x, frontY, bottom + (spring - bottom) / 2]),
  discY(radius, depth, [x, frontY, spring]),
)

const archFrameFront = (
  x: number,
  frontY: number,
  spring: number,
  radius: number,
  legBottom: number,
  thickness = 0.65,
  depth = 1.3,
): Solid => {
  const points = Array.from({ length: 9 }, (_, index) => {
    const angle = Math.PI - (Math.PI * index) / 8
    return [x + radius * Math.cos(angle), frontY, spring + radius * Math.sin(angle)] as Vec3
  })
  return unite(
    box([thickness * 1.8, depth, spring - legBottom], [x - radius, frontY, legBottom + (spring - legBottom) / 2]),
    box([thickness * 1.8, depth, spring - legBottom], [x + radius, frontY, legBottom + (spring - legBottom) / 2]),
    ...points.slice(1).map((point, index) => beam(points[index], point, thickness)),
  )
}

const shallowWindow = (
  x: number,
  frontY: number,
  z: number,
  width: number,
  height: number,
  depth = 1.5,
): Solid => box([width, depth, height], [x, frontY, z])

export const classicBaseSolid = (diameter: number, topZ = 15): Solid => {
  const r = diameter / 2
  const profile: [number, number][] = [
    [0, 0],
    [r, 0],
    [r, 2.8],
    [r * 0.97, 4.2],
    [r * 0.88, 5.8],
    [r * 0.79, 7.1],
    [r * 0.73, 9.2],
    [r * 0.61, 10.8],
    [r * 0.54, 13.2],
    [r * 0.48, topZ],
    [0, topZ],
  ]
  return new CrossSection([profile]).revolve(48)
}

const cross = (topZ: number): Solid =>
  unite(
    box([2.4, 2.4, 10], [0, 0, topZ - 5]),
    box([7, 2.4, 2.4], [0, 0, topZ - 3.5]),
  )

const buildCabildo = (): Solid => {
  const bays = [-12, -6, 0, 6, 12]
  let facade = unite(
    box([31, 12, 29], [0, 0, 29.5]),
    box([33, 14, 2.2], [0, 0, 16]),
  )
  for (const x of bays) {
    facade = facade.subtract(archedOpeningFront(x, -6.15, 16.4, 25, 2.25, 2.2))
    facade = facade.subtract(archedOpeningFront(x, -6.15, 32.7, 38.5, 1.75, 1.8))
  }

  const lowerFrames = bays.map((x) => archFrameFront(x, -6.25, 25, 2.25, 16.5, 0.52))
  const upperFrames = bays.map((x) => archFrameFront(x, -6.2, 38.5, 1.75, 32.8, 0.48))
  const balconyPosts = [-15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15].map((x) =>
    box([0.55, 0.85, 2.8], [x, -6.9, 34.2]),
  )
  const towerBody = box([11.5, 10.5, 24], [0, 0, 54])
    .subtract(archedOpeningFront(0, -5.4, 56, 61, 2.2, 1.7))
  const clock = unite(
    discY(2.55, 1.5, [0, -5.75, 49]),
    discY(1.95, 1.65, [0, -6.45, 49]),
    box([0.5, 1.2, 3.1], [0, -7.2, 49]),
    box([1.7, 1.2, 0.5], [0.5, -7.2, 49]),
  )
  const parts = [
    classicBaseSolid(38),
    facade,
    ...lowerFrames,
    ...upperFrames,
    box([32, 14, 1.2], [0, 0, 31.8]),
    box([31, 1.1, 0.65], [0, -6.9, 35.5]),
    ...balconyPosts,
    towerBody,
    box([13.5, 12.5, 1.5], [0, 0, 43.2]),
    box([13.5, 12.5, 1.6], [0, 0, 65.5]),
    clock,
    prismX([[-7, 0], [7, 0], [0, 7]], 10.8, [0, 0, 65]),
    ball(1.45, [-5.1, 0, 69]),
    ball(1.45, [5.1, 0, 69]),
    cyl(3.8, 3.2, [0, 0, 71.2]),
    ellip([4.3, 4.3, 3.8], [0, 0, 74.2]),
    cone(3.1, 0.75, 6.5, [0, 0, 79]),
    ball(1.15, [0, 0, 82.5]),
    cyl(0.9, 9.5, [0, 0, 87]),
    cross(95),
  ]
  return Manifold.union(parts)
}

const buildColon = (): Solid => {
  const lowerBays = [-14, -9.35, -4.7, 0, 4.7, 9.35, 14]
  let body = box([34, 13, 37], [0, 0, 34])
  for (const x of lowerBays) {
    body = body.subtract(archedOpeningFront(x, -6.65, 17, 26, 1.55, 1.7))
    body = body.subtract(archedOpeningFront(x, -6.65, 35, 43.5, 1.65, 1.7))
  }
  const columns = [-12.2, -8.1, -4.05, 0, 4.05, 8.1, 12.2].map((x) =>
    unite(
      cyl(0.82, 13.5, [x, -7, 42], 20),
      box([2.3, 2, 1.3], [x, -6.95, 35.2]),
      box([2.4, 2, 1.5], [x, -6.95, 49]),
    ),
  )
  const pedimentOrnaments = [-16, -12, -8.5, 8.5, 12, 16].map((x) =>
    unite(cyl(0.75, 2.8, [x, 0, 57]), ball(1.15, [x, 0, 58.6])),
  )
  const flag = unite(
    cyl(0.8, 27, [0, 0, 73.5]),
    box([6.2, 1.25, 3.2], [3.1, 0, 81.5]),
    ball(1.15, [0, 0, 87]),
  )
  return unite(
    classicBaseSolid(36),
    box([35, 15, 2.3], [0, 0, 16]),
    body,
    box([35, 15, 1.5], [0, 0, 31.8]),
    box([35, 15, 2], [0, 0, 51.8]),
    ...columns,
    prismX([[-10, 0], [10, 0], [0, 10]], 13.5, [0, 0, 51]),
    prismX([[-5, 0], [5, 0], [0, 5]], 13.5, [-12.8, 0, 51]),
    prismX([[-5, 0], [5, 0], [0, 5]], 13.5, [12.8, 0, 51]),
    discY(2, 1.3, [0, -7.2, 55]),
    box([35, 14.5, 1.2], [0, 0, 58]),
    ...pedimentOrnaments,
    flag,
  )
}

const buildObelisco = (): Solid => {
  const windows = [0, 90, 180, 270].map((angle) =>
    unite(
      box([2.15, 1.3, 3.4], [0, -4, 60]),
      box([3.2, 1.1, 0.65], [0, -4.5, 57.9]),
    ).rotate([0, 0, angle]),
  )
  const doors = [0, 90, 180, 270].map((angle) =>
    unite(
      box([3.2, 1.35, 5], [0, -7.05, 22.5]),
      box([4.3, 1.2, 0.7], [0, -7.55, 25.2]),
    ).rotate([0, 0, angle]),
  )
  return unite(
    classicBaseSolid(34),
    box([18, 18, 3], [0, 0, 15.8]),
    box([15, 15, 5], [0, 0, 19]),
    cone(7, 4.1, 42, [0, 0, 42], 4),
    cone(4.1, 0, 13, [0, 0, 69.5], 4),
    ...doors,
    ...windows,
  )
}

const buildSanMartin = (): Solid => {
  const horse = unite(
    Manifold.hull([
      ellip([7, 3.7, 4.5], [-1, 0, 42]),
      ellip([4.8, 3.4, 4.2], [4.6, 0, 43]),
    ]),
    beam([4.3, 0, 44], [7.2, 0, 51], 2.8),
    ellip([3.6, 2.55, 2.6], [8.3, 0, 52]),
    beam([9.3, 0, 51.4], [11.2, 0, 49.2], 1.75),
    cone(1, 0.18, 3.8, [7.1, -1.4, 55.5], 16),
    cone(1, 0.18, 3.8, [7.1, 1.4, 55.5], 16),
    beam([-4.8, -2, 40], [-5.2, -2, 29.5], 1.55),
    beam([-2.2, 2, 39.5], [-2.6, 2, 29.5], 1.55),
    beam([4.3, -2, 44], [9.7, -2, 50.5], 1.3),
    beam([4.2, 2, 43.5], [8.2, 2, 48], 1.3),
    beam([8.2, 2, 48], [10.2, 2, 45], 1.2),
    beam([-6, 0, 43.5], [-10.2, 0, 36], 1.4),
    beam([-10.2, 0, 36], [-8.2, 0, 29.5], 1.3),
  )
  const rider = unite(
    beam([-0.5, 0, 47], [0, 0, 57], 2.7),
    ball(2.6, [0.2, 0, 60.5]),
    cone(2.7, 1, 3.2, [0.2, 0, 64], 24),
    beam([0.4, -1.5, 56], [2, -1.5, 64], 1.25),
    beam([2, -1.5, 64], [4.2, -1.5, 70.5], 1.1),
    ball(1.25, [4.35, -1.5, 71.2]),
    beam([0.3, 1.4, 55], [6.8, 1.4, 50.5], 1.2),
    beam([-1, -1.7, 48], [1.8, -2.1, 41], 1.35),
    beam([-1, 1.7, 48], [1.8, 2.1, 41], 1.35),
    Manifold.hull([
      box([4.6, 2, 8], [-2.3, 2.4, 53]),
      box([3.4, 2, 13], [-4.2, 2.4, 44]),
    ]),
  )
  return unite(
    classicBaseSolid(34),
    box([18, 15, 3], [0, 0, 15.5]),
    box([14, 12, 11], [0, 0, 22]),
    box([16, 14, 2.2], [0, 0, 28.5]),
    box([8, 1.2, 5], [0, -6.35, 22]),
    horse,
    rider,
  )
}

const buildTorre = (): Solid => {
  const clocks = [0, 90, 180, 270].map((angle) =>
    unite(
      discY(3.55, 1.7, [0, -8.65, 50]),
      discY(2.75, 1.85, [0, -9.35, 50]),
      box([0.55, 1.1, 3.9], [0, -10.1, 50]),
      box([2.2, 1.1, 0.55], [0.65, -10.1, 50]),
    ).rotate([0, 0, angle]),
  )
  const quoins = [24, 28, 32, 36, 40, 44].flatMap((z, row) =>
    [[-7.3, -7.3], [-7.3, 7.3], [7.3, -7.3], [7.3, 7.3]].map(([x, y]) =>
      box([2.3 + (row % 2) * 0.5, 2.3 + (row % 2) * 0.5, 1.5], [x, y, z]),
    ),
  )
  const shaftWindows = [29, 37].flatMap((z) => [0, 90, 180, 270].map((angle) =>
    unite(
      shallowWindow(0, -7.45, z, 3, 4.5),
      box([4.2, 1.1, 0.65], [0, -8.1, z + 2.5]),
    ).rotate([0, 0, angle]),
  ))
  let lantern = box([13, 13, 9], [0, 0, 59])
    .subtract(box([9, 9, 10], [0, 0, 59]))
  for (const angle of [0, 90, 180, 270]) {
    lantern = lantern.subtract(
      archedOpeningFront(0, -6.5, 54.5, 59.5, 3.6, 4.4).rotate([0, 0, angle]),
    )
  }
  return unite(
    classicBaseSolid(34),
    box([22, 22, 3], [0, 0, 15.5]),
    box([18, 18, 5], [0, 0, 18.5]),
    box([14, 14, 27], [0, 0, 33]),
    ...quoins,
    ...shaftWindows,
    box([18, 18, 2.5], [0, 0, 46]),
    box([17, 17, 9], [0, 0, 50]),
    ...clocks,
    box([19, 19, 2], [0, 0, 54.5]),
    lantern,
    box([14, 14, 2], [0, 0, 63.5]),
    cone(7, 5, 3.5, [0, 0, 66], 4),
    ellip([5.2, 5.2, 3.2], [0, 0, 68.5]),
    cone(3.2, 0.55, 5.2, [0, 0, 72.5]),
    cyl(0.6, 5.5, [0, 0, 77]),
    ball(0.9, [0, 0, 80]),
  )
}

const buildBuzon = (): Solid => {
  let body = unite(
    classicBaseSolid(28, 14),
    cone(8.8, 7.35, 4, [0, 0, 15.5]),
    cyl(7.35, 25, [0, 0, 29]),
    cyl(8.25, 1.8, [0, 0, 18.8]),
    cyl(8.25, 1.8, [0, 0, 38.8]),
    cyl(8.7, 2.2, [0, 0, 41]),
    ellip([8.5, 8.5, 3.6], [0, 0, 43]),
    cyl(1.1, 1.5, [0, 0, 46.2]),
  )
  body = body.subtract(box([6.8, 2.2, 1.45], [0, -7.2, 35]))
  return unite(
    body,
    archFrameFront(0, -7.55, 29.7, 3.9, 21.2, 0.55, 1.35),
    box([7.8, 1.25, 0.65], [0, -8.1, 21.3]),
    box([7.8, 1.25, 0.65], [0, -8.1, 30]),
    discY(1.15, 1.1, [2.3, -8.25, 24.5]),
    box([8.6, 1.45, 1.05], [0, -7.85, 36.2]),
  )
}

const builders: Record<PieceId, () => Solid> = {
  rey: buildCabildo,
  reina: buildColon,
  alfil: buildObelisco,
  caballo: buildSanMartin,
  torre: buildTorre,
  peon: buildBuzon,
}

export const buildClosedPiece = (definition: PieceDefinition): Solid => {
  const raw = builders[definition.id]()
  const bounds = raw.boundingBox()
  const scaleZ = definition.heightMm / (bounds.max[2] - bounds.min[2])
  const normalized = raw.scale([1, 1, scaleZ]).translate([0, 0, -bounds.min[2] * scaleZ])
  raw.delete()
  const simplified = normalized.simplify(0.005)
  normalized.delete()
  const status = simplified.status()
  if (status !== 'NoError') throw new Error(`${definition.role}: ${status}`)
  return simplified
}
