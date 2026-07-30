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

const architecturalStem = (
  diameter: number,
  topZ: number,
  lowerRadius: number,
  upperRadius: number,
): Solid => unite(
  classicBaseSolid(diameter),
  cone(lowerRadius, upperRadius, topZ - 19, [0, 0, 15 + (topZ - 19) / 2]),
  cyl(lowerRadius + 0.8, 2.2, [0, 0, 16.1]),
  ellip([upperRadius + 3.4, upperRadius + 3.4, 2.8], [0, 0, topZ - 2.4]),
  cyl(upperRadius + 4.2, 2.2, [0, 0, topZ - 0.7]),
)

const cross = (topZ: number): Solid =>
  unite(
    box([2.4, 2.4, 10], [0, 0, topZ - 5]),
    box([7, 2.4, 2.4], [0, 0, topZ - 3.5]),
  )

const buildCabildo = (): Solid => {
  const bays = [-13.2, -6.6, 0, 6.6, 13.2]
  let facade = unite(
    box([34, 8, 10], [0, 0, 75]),
    box([35, 9, 1.6], [0, 0, 70.7]),
  )
  for (const x of bays) {
    facade = facade.subtract(archedOpeningFront(x, -4.15, 70.7, 73.8, 1.8, 1.7))
    facade = facade.subtract(archedOpeningFront(x, -4.15, 76.1, 78, 1.35, 1.5))
  }

  const lowerFrames = bays.map((x) => archFrameFront(x, -4.25, 73.8, 1.8, 70.8, 0.48))
  const upperFrames = bays.map((x) => archFrameFront(x, -4.2, 78, 1.35, 76.2, 0.44))
  const balconyPosts = [-15, -12, -9, -6, -3, 0, 3, 6, 9, 12, 15].map((x) =>
    box([0.48, 0.7, 1.7], [x, -4.85, 76.1]),
  )
  const towerBody = box([10.5, 7.5, 8.5], [0, 0, 83])
    .subtract(archedOpeningFront(0, -3.85, 82.5, 84.6, 1.35, 1.5))
  const clock = unite(
    discY(1.7, 1.25, [0, -4, 82]),
    discY(1.25, 1.35, [0, -4.65, 82]),
    box([0.4, 0.8, 1.7], [0, -5.2, 82]),
    box([1.15, 0.8, 0.4], [0.35, -5.2, 82]),
  )
  const parts = [
    architecturalStem(38, 71, 8.4, 5.2),
    box([27, 9.5, 1.6], [0, 0, 69.7]),
    facade,
    ...lowerFrames,
    ...upperFrames,
    box([34, 9, 1.1], [0, 0, 75.2]),
    box([33, 0.9, 0.55], [0, -4.7, 76.9]),
    ...balconyPosts,
    towerBody,
    box([12, 9, 1.25], [0, 0, 79.3]),
    box([12, 8.7, 1.2], [0, 0, 87]),
    clock,
    prismX([[-6, 0], [6, 0], [0, 3.8]], 7.6, [0, 0, 86.8]),
    ball(0.9, [-4.2, 0, 88]),
    ball(0.9, [4.2, 0, 88]),
    cyl(3.3, 1.5, [0, 0, 88.2]),
    ellip([3.5, 3.2, 2.5], [0, 0, 90]),
    cone(2.5, 0.65, 3.6, [0, 0, 92.6]),
    ball(0.75, [0, 0, 94]),
    cyl(0.72, 2.8, [0, 0, 94]),
    cross(95),
  ]
  return Manifold.union(parts)
}

const buildColon = (): Solid => {
  const lowerBays = [-14, -9.35, -4.7, 0, 4.7, 9.35, 14]
  let body = box([34, 10, 12.5], [0, 0, 75])
  for (const x of lowerBays) {
    body = body.subtract(archedOpeningFront(x, -5.15, 68.9, 72.2, 1.35, 1.5))
    body = body.subtract(archedOpeningFront(x, -5.15, 76.1, 79, 1.25, 1.5))
  }
  const columns = [-12.2, -8.1, -4.05, 0, 4.05, 8.1, 12.2].map((x) =>
    unite(
      cyl(0.66, 5.4, [x, -5.35, 78], 20),
      box([1.8, 1.4, 0.8], [x, -5.3, 75.2]),
      box([1.9, 1.4, 0.8], [x, -5.3, 80.8]),
    ),
  )
  const pedimentOrnaments = [-15.3, -10.8, -7.4, 7.4, 10.8, 15.3].map((x) =>
    unite(cyl(0.5, 1.6, [x, 0, 84]), ball(0.72, [x, 0, 85])),
  )
  return unite(
    architecturalStem(36, 69, 8, 5),
    box([27, 10.5, 1.6], [0, 0, 67.7]),
    box([35, 11, 1.8], [0, 0, 69]),
    body,
    box([35, 11, 1.1], [0, 0, 74.4]),
    box([35, 11, 1.2], [0, 0, 81.2]),
    ...columns,
    prismX([[-8.5, 0], [8.5, 0], [0, 5]], 10, [0, 0, 81]),
    prismX([[-4, 0], [4, 0], [0, 3.4]], 10, [-13, 0, 81]),
    prismX([[-4, 0], [4, 0], [0, 3.4]], 10, [13, 0, 81]),
    discY(1.35, 1.1, [0, -5.6, 83.1]),
    box([35, 10.5, 1,], [0, 0, 84]),
    ...pedimentOrnaments,
    cyl(0.62, 5, [0, 0, 86]),
    box([4.5, 1.1, 2.2], [2.2, 0, 87]),
    ball(0.8, [0, 0, 88]),
  )
}

const buildObelisco = (): Solid => {
  const windows = [0, 90, 180, 270].map((angle) =>
    unite(
      box([1.55, 1.2, 2.8], [0, -2.45, 68]),
      box([2.2, 1.05, 0.6], [0, -2.85, 66.3]),
    ).rotate([0, 0, angle]),
  )
  const doors = [0, 90, 180, 270].map((angle) =>
    unite(
      box([2.2, 1.2, 3.8], [0, -4.05, 24]),
      box([3, 1.05, 0.65], [0, -4.45, 26.2]),
    ).rotate([0, 0, angle]),
  )
  return unite(
    classicBaseSolid(34),
    box([15, 15, 2.4], [0, 0, 15.8]),
    box([11.5, 11.5, 3], [0, 0, 18.3]),
    box([9, 9, 3], [0, 0, 21]),
    cone(4, 2.35, 47, [0, 0, 44.5], 4),
    cone(2.35, 0, 10, [0, 0, 73], 4),
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
      discY(2.75, 1.25, [0, -6.65, 47.5]),
      discY(2.1, 1.35, [0, -7.25, 47.5]),
      box([0.45, 0.8, 2.8], [0, -7.75, 47.5]),
      box([1.6, 0.8, 0.45], [0.5, -7.75, 47.5]),
    ).rotate([0, 0, angle]),
  )
  const quoins = [25, 29, 33, 37, 41].flatMap((z, row) =>
    [[-5.55, -5.55], [-5.55, 5.55], [5.55, -5.55], [5.55, 5.55]].map(([x, y]) =>
      box([1.45 + (row % 2) * 0.35, 1.45 + (row % 2) * 0.35, 1.1], [x, y, z]),
    ),
  )
  const shaftWindows = [29, 36.5].flatMap((z) => [0, 90, 180, 270].map((angle) =>
    unite(
      shallowWindow(0, -5.9, z, 2.3, 3.6, 1.2),
      box([3.2, 0.9, 0.55], [0, -6.5, z + 2]),
    ).rotate([0, 0, angle]),
  ))
  const lantern = unite(
    box([10.5, 10.5, 1.2], [0, 0, 52.5]),
    box([10.5, 10.5, 1.2], [0, 0, 57.5]),
    ...[[-4.25, -4.25], [-4.25, 4.25], [4.25, -4.25], [4.25, 4.25]].map(
      ([x, y]) => box([2, 2, 5.8], [x, y, 55]),
    ),
  )
  return unite(
    classicBaseSolid(34),
    box([17, 17, 2.5], [0, 0, 15.7]),
    box([14, 14, 3.5], [0, 0, 18]),
    box([11, 11, 24], [0, 0, 31.2]),
    ...quoins,
    ...shaftWindows,
    box([13, 13, 1.8], [0, 0, 43.5]),
    box([13, 13, 7], [0, 0, 47.5]),
    ...clocks,
    box([14.5, 14.5, 1.5], [0, 0, 51.5]),
    lantern,
    box([11.5, 11.5, 1.5], [0, 0, 58.3]),
    cone(5.5, 4, 2.5, [0, 0, 60], 4),
    ellip([4.1, 4.1, 2.4], [0, 0, 61.7]),
    cone(2.5, 0.5, 2.8, [0, 0, 63.2]),
    cyl(0.5, 2.5, [0, 0, 64]),
    ball(0.7, [0, 0, 65]),
  )
}

const buildBuzon = (): Solid => {
  let body = unite(
    classicBaseSolid(28, 14),
    cone(8.5, 6.7, 4, [0, 0, 15]),
    cyl(6.7, 26.5, [0, 0, 29.5]),
    cyl(7.6, 1.8, [0, 0, 17]),
    cyl(7.6, 1.8, [0, 0, 41]),
    cyl(8.2, 2.2, [0, 0, 43]),
    ellip([8, 8, 4.2], [0, 0, 46]),
    cyl(0.9, 1.4, [0, 0, 49.3]),
  )
  body = body.subtract(box([6.2, 2, 1.35], [0, -6.65, 37]))
  return unite(
    body,
    archFrameFront(0, -6.85, 30.2, 3.45, 21.4, 0.52, 1.2),
    box([7, 1.1, 0.6], [0, -7.25, 21.5]),
    box([7, 1.1, 0.6], [0, -7.25, 30.2]),
    discY(1, 1, [2.1, -7.35, 25]),
    box([7.5, 1.25, 0.95], [0, -7.05, 38.1]),
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
