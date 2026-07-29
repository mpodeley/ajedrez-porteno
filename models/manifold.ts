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
  const arcades = [-10, -5, 0, 5, 10].flatMap((x) => [
    box([1.6, 2.4, 11], [x - 1.9, -6, 23]),
    box([1.6, 2.4, 11], [x + 1.9, -6, 23]),
    beam([x - 1.9, -6, 27.4], [x, -6, 30], 0.95),
    beam([x, -6, 30], [x + 1.9, -6, 27.4], 0.95),
  ])
  const clock = unite(
    discY(3.2, 2, [0, -6.1, 41]),
    box([0.8, 1.5, 4.2], [0, -7, 41]),
    box([2.5, 1.5, 0.8], [0.7, -7, 41]),
  )
  return unite(
    classicBaseSolid(38),
    box([28, 12, 17], [0, 0, 23.5]),
    ...arcades,
    box([12.5, 11, 19], [0, 0, 39]),
    box([15, 13, 2], [0, 0, 30.5]),
    box([15, 13, 2], [0, 0, 48]),
    clock,
    cone(7, 4.8, 9, [0, 0, 53]),
    ellip([5.4, 5.4, 8.5], [0, 0, 65]),
    cone(2.3, 0.8, 8, [0, 0, 76.5]),
    ball(1.5, [0, 0, 81.2]),
    cyl(1, 10, [0, 0, 86]),
    cross(95),
  )
}

const buildColon = (): Solid => {
  const columns = [-10, -6, -2, 2, 6, 10].map((x) => cyl(1.2, 17, [x, -6.2, 27], 20))
  const capitals = [-10, -6, -2, 2, 6, 10].map((x) => box([3, 2.8, 2.8], [x, -6.1, 35.4]))
  return unite(
    classicBaseSolid(36),
    box([27, 13, 19], [0, 0, 24]),
    box([30, 15, 2], [0, 0, 15.7]),
    box([28, 14, 2], [0, 0, 17.3]),
    ...columns,
    ...capitals,
    box([30, 15, 4], [0, 0, 38]),
    prismX([[-15, 0], [15, 0], [0, 9]], 14, [0, 0, 39.5]),
    box([16, 11, 8], [0, 0, 50]),
    cone(9, 6, 5, [0, 0, 55.5]),
    ellip([6, 5, 7], [0, 0, 63]),
    cone(3.2, 0.8, 8, [0, 0, 73.7]),
    ball(1.6, [0, 0, 78.5]),
    cyl(1, 7, [0, 0, 82]),
    cross(88),
  )
}

const buildObelisco = (): Solid => {
  const windows = [0, 90, 180, 270].map((angle) =>
    box([2.1, 1.4, 4.2], [0, -4, 60]).rotate([0, 0, angle]),
  )
  return unite(
    classicBaseSolid(34),
    box([18, 18, 4], [0, 0, 16]),
    box([14, 14, 4], [0, 0, 19]),
    cone(7, 4.1, 43, [0, 0, 41.5], 4),
    cone(4.1, 0, 13, [0, 0, 69.5], 4),
    ...windows,
  )
}

const buildSanMartin = (): Solid => {
  const horse = unite(
    Manifold.hull([
      ellip([7, 3.8, 4.3], [-1, 0, 40]),
      ellip([5, 3.5, 4], [5, 0, 41.5]),
    ]),
    beam([5, 0, 43], [8, 0, 51], 3),
    ellip([4.6, 3, 2.8], [8, 0, 53]),
    beam([9, 0, 52.5], [11.5, 0, 50.5], 2),
    cone(1.1, 0.2, 4.5, [6.8, -1.6, 56.5], 16),
    cone(1.1, 0.2, 4.5, [6.8, 1.6, 56.5], 16),
    beam([-5, -2.2, 38], [-4.5, -2.2, 31], 1.5),
    beam([-3, 2.2, 38], [-2.5, 2.2, 31], 1.5),
    beam([4, -2.1, 39], [5.2, -2.1, 31], 1.5),
    beam([5.5, 2.1, 40], [6.3, 2.1, 31], 1.5),
  )
  const rider = unite(
    beam([0.5, 0, 44], [0, 0, 56], 3),
    ball(3.2, [0, 0, 60]),
    cone(3, 1.1, 3.5, [0, 0, 64], 24),
    beam([0.5, -1.5, 54], [6.5, -1.5, 49], 1.35),
    beam([0.5, 1.5, 54], [6.5, 1.5, 49], 1.35),
    beam([-1.2, -1.8, 47], [2.5, -2.2, 39], 1.4),
    beam([-1.2, 1.8, 47], [2.5, 2.2, 39], 1.4),
    Manifold.hull([
      box([5.5, 2, 8], [-2.5, 2.5, 49]),
      box([3, 2, 14], [-4.5, 2.5, 40]),
    ]),
    beam([0, -2.5, 55], [-5.5, -2.5, 66.5], 0.75),
    beam([0, 0, 65.5], [-2.5, 0, 71], 0.95),
  )
  return unite(
    classicBaseSolid(34),
    box([17, 14, 4], [0, 0, 16]),
    box([13, 11, 15], [0, 0, 24]),
    box([15, 13, 2.2], [0, 0, 32]),
    horse,
    rider,
  )
}

const buildTorre = (): Solid => {
  const clocks = [0, 90, 180, 270].map((angle) =>
    unite(
      discY(3.5, 1.6, [0, -7.2, 37]),
      box([0.7, 1.3, 4], [0, -8, 37]),
      box([2.2, 1.3, 0.7], [0.7, -8, 37]),
    ).rotate([0, 0, angle]),
  )
  return unite(
    classicBaseSolid(34),
    box([21, 21, 4], [0, 0, 16]),
    box([17, 17, 4], [0, 0, 19]),
    box([14, 14, 25], [0, 0, 32.5]),
    box([16, 16, 3], [0, 0, 44]),
    ...clocks,
    box([17, 17, 3], [0, 0, 47]),
    cone(9, 5.6, 8, [0, 0, 52.5], 4),
    box([7.5, 7.5, 4], [0, 0, 58]),
    cone(4.8, 0.6, 5, [0, 0, 62.5], 4),
  )
}

const buildBuzon = (): Solid =>
  unite(
    classicBaseSolid(28, 14),
    cone(9, 8.2, 4, [0, 0, 16]),
    cyl(8.2, 25, [0, 0, 27.5]),
    ellip([8.2, 8.2, 6], [0, 0, 40]),
    cone(3.4, 1, 6, [0, 0, 46]),
    ball(1.4, [0, 0, 48.5]),
    box([9, 1.8, 1.8], [0, -8.1, 35.2]),
    box([8.5, 1.7, 9.5], [0, -8.05, 27]),
    box([5.5, 1.5, 0.9], [0, -8.9, 29]),
    ball(0.85, [2.4, -8.7, 24.5]),
  )

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
  const simplified = normalized.simplify(0.02)
  normalized.delete()
  const status = simplified.status()
  if (status !== 'NoError') throw new Error(`${definition.role}: ${status}`)
  return simplified
}
