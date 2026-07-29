import modeling from '@jscad/modeling'
import type { PieceDefinition, PieceId } from '../src/catalog.ts'

const { booleans, extrusions, hulls, measurements, modifiers, primitives, transforms } = modeling
type Geom3 = ReturnType<typeof primitives.cuboid>
type Vec3 = [number, number, number]

const { union } = booleans
const { extrudeLinear, extrudeRotate } = extrusions
const { hull } = hulls
const { cuboid, cylinder, cylinderElliptic, ellipsoid, polygon, roundedCuboid, sphere } = primitives
const { rotateX, rotateY, rotateZ, scale, translate } = transforms

const SEGMENTS = 48

const at = (shape: Geom3, position: Vec3): Geom3 => translate(position, shape)
const box = (size: Vec3, center: Vec3, radius = 0.6): Geom3 =>
  at(
    radius > 0 && Math.min(...size) > radius * 2
      ? roundedCuboid({ size, roundRadius: radius, segments: 12 })
      : cuboid({ size }),
    center,
  )

const cyl = (radius: number, height: number, center: Vec3, segments = SEGMENTS): Geom3 =>
  cylinder({ radius, height, center, segments })

const cone = (
  radiusStart: number,
  radiusEnd: number,
  height: number,
  center: Vec3,
  segments = SEGMENTS,
): Geom3 => cylinderElliptic({
  startRadius: [radiusStart, radiusStart],
  endRadius: [radiusEnd, radiusEnd],
  height,
  center,
  segments,
})

const ellip = (radii: Vec3, center: Vec3): Geom3 =>
  at(ellipsoid({ radius: radii, segments: 32 }), center)

const ball = (radius: number, center: Vec3): Geom3 =>
  at(sphere({ radius, segments: 32 }), center)

const beam = (start: Vec3, end: Vec3, radius: number): Geom3 =>
  hull(ball(radius, start), ball(radius, end))

const prismX = (points: [number, number][], depth: number, center: Vec3): Geom3 => {
  const face = polygon({ points })
  const solid = extrudeLinear({ height: depth }, face)
  return translate([center[0], center[1] + depth / 2, center[2]], rotateX(Math.PI / 2, solid))
}

export const classicBase = (diameter: number, topZ = 15): Geom3 => {
  const r = diameter / 2
  const profile = polygon({
    points: [
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
    ],
  })
  return extrudeRotate({ segments: SEGMENTS }, profile)
}

const cross = (z: number): Geom3 =>
  union(
    box([2.4, 2.4, 8], [0, 0, z - 4], 0.35),
    box([7, 2.4, 2.4], [0, 0, z - 3], 0.35),
  )

const cabildo = (): Geom3 => {
  const facade = box([28, 12, 16], [0, 0, 23], 0.8)
  const arcade = [-10, -5, 0, 5, 10].map((x) => [
    box([1.5, 2.2, 11], [x - 1.9, -7, 23], 0.3),
    box([1.5, 2.2, 11], [x + 1.9, -7, 23], 0.3),
    beam([x - 1.9, -7, 27.5], [x, -7, 30], 0.8),
    beam([x, -7, 30], [x + 1.9, -7, 27.5], 0.8),
  ]).flat()
  const upper = box([12.5, 11, 18], [0, 0, 38.5], 0.65)
  const ledges = [
    box([15, 13, 2], [0, 0, 30.5], 0.35),
    box([15, 13, 2], [0, 0, 47.5], 0.35),
  ]
  const clock = [
    cyl(3.2, 1.8, [0, -6.2, 41], 32),
    box([0.75, 1.3, 4.2], [0, -7.25, 41], 0.2),
    box([2.4, 1.3, 0.75], [0.7, -7.25, 41], 0.2),
  ]
  const dome = union(
    cone(7, 4.8, 9, [0, 0, 53]),
    ellip([5.4, 5.4, 8.5], [0, 0, 65]),
    cone(2.3, 0.8, 8, [0, 0, 76.5]),
    ball(1.5, [0, 0, 81.2]),
    cyl(1, 8, [0, 0, 85]),
  )
  return union(classicBase(38), facade, ...arcade, upper, ...ledges, ...clock, dome, cross(95))
}

const teatroColon = (): Geom3 => {
  const body = box([27, 13, 18], [0, 0.6, 24], 0.9)
  const steps = [
    box([30, 15, 2], [0, 0, 15.5], 0.35),
    box([28, 14, 2], [0, 0, 17.2], 0.35),
  ]
  const columns = [-10, -6, -2, 2, 6, 10].map((x) =>
    cyl(1.15, 16, [x, -6.75, 27], 20),
  )
  const capitals = [-10, -6, -2, 2, 6, 10].map((x) =>
    box([3, 2.5, 1.4], [x, -6.7, 35], 0.25),
  )
  const entablature = box([30, 15, 4], [0, 0, 38], 0.45)
  const pediment = prismX([[-15, 0], [15, 0], [0, 9]], 14, [0, 0, 40])
  const crown = union(
    box([16, 11, 6], [0, 1, 50], 0.6),
    cone(9, 6, 5, [0, 1, 55.5]),
    ellip([6, 5, 7], [0, 1, 63]),
    cone(3.2, 0.8, 8, [0, 1, 74]),
    ball(1.6, [0, 1, 78.5]),
    cross(88),
  )
  return union(classicBase(36), body, ...steps, ...columns, ...capitals, entablature, pediment, crown)
}

const obelisco = (): Geom3 => {
  const plinth = union(
    box([18, 18, 4], [0, 0, 16], 0.5),
    box([14, 14, 4], [0, 0, 19], 0.4),
  )
  const shaft = cone(7, 4.1, 43, [0, 0, 41.5], 4)
  const point = cone(4.1, 0, 13, [0, 0, 69.5], 4)
  const windows = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => {
    const relief = box([2.1, 1.3, 4.2], [0, -4.1, 60], 0.3)
    return rotateZ(angle, relief)
  })
  return union(classicBase(34), plinth, shaft, point, ...windows)
}

const sanMartin = (): Geom3 => {
  const pedestal = union(
    box([17, 14, 4], [0, 0, 16], 0.5),
    box([13, 11, 15], [0, 0, 24], 0.8),
    box([15, 13, 2.2], [0, 0, 32], 0.35),
  )
  const horseBody = hull(
    ellip([7, 3.8, 4.3], [-1, 0, 40]),
    ellip([5, 3.5, 4], [5, 0, 41.5]),
  )
  const legs = [
    beam([-5, -2.2, 38], [-4.5, -2.2, 31], 1.45),
    beam([-3, 2.2, 38], [-2.5, 2.2, 31], 1.45),
    beam([4, -2.1, 39], [5.2, -2.1, 31], 1.45),
    beam([5.5, 2.1, 40], [6.3, 2.1, 31], 1.45),
  ]
  const neck = beam([5, 0, 43], [8, 0, 51], 3)
  const head = ellip([4.6, 3, 2.8], [8, 0, 53])
  const muzzle = beam([9, 0, 52.5], [11.5, 0, 50.5], 2)
  const ears = [
    cone(1.1, 0.2, 4.5, [6.8, -1.6, 57], 16),
    cone(1.1, 0.2, 4.5, [6.8, 1.6, 57], 16),
  ]
  const rider = union(
    beam([0.5, 0, 44], [0, 0, 56], 3),
    ball(3.2, [0, 0, 60]),
    cone(3, 1.1, 3.5, [0, 0, 64], 24),
    beam([0.5, -1.5, 54], [6.5, -1.5, 49], 1.35),
    beam([0.5, 1.5, 54], [6.5, 1.5, 49], 1.35),
    beam([-1.2, -1.8, 47], [2.5, -2.2, 39], 1.4),
    beam([-1.2, 1.8, 47], [2.5, 2.2, 39], 1.4),
    hull(
      box([5.5, 1.8, 8], [-2.5, 2.6, 49], 0.6),
      box([3, 1.8, 14], [-4.5, 2.6, 40], 0.6),
    ),
  )
  const sword = beam([0, -2.5, 55], [-5.5, -2.5, 66.5], 0.75)
  const plume = beam([0, 0, 66], [-2.5, 0, 72], 0.9)
  return union(classicBase(34), pedestal, horseBody, ...legs, neck, head, muzzle, ...ears, rider, sword, plume)
}

const torreMonumental = (): Geom3 => {
  const plinth = union(
    box([21, 21, 4], [0, 0, 16], 0.45),
    box([17, 17, 4], [0, 0, 19], 0.4),
  )
  const body = union(
    box([14, 14, 25], [0, 0, 32.5], 0.75),
    box([16, 16, 3], [0, 0, 44], 0.35),
  )
  const clocks = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) =>
    rotateZ(angle, union(
      cyl(3.5, 1.4, [0, -7.3, 37], 32),
      box([0.6, 1.1, 4], [0, -8.2, 37], 0.2),
      box([2.2, 1.1, 0.6], [0.7, -8.2, 37], 0.2),
    )),
  )
  const roof = union(
    box([17, 17, 3], [0, 0, 47], 0.35),
    cone(9, 5.6, 8, [0, 0, 52.5], 4),
    box([7.5, 7.5, 4], [0, 0, 58], 0.4),
    cone(4.8, 0.6, 5, [0, 0, 62.5], 4),
  )
  return union(classicBase(34), plinth, body, ...clocks, roof)
}

const buzon = (): Geom3 => {
  const body = union(
    cyl(8.2, 25, [0, 0, 27.5]),
    cone(9, 8.2, 3, [0, 0, 16.5]),
    ellip([8.2, 8.2, 6], [0, 0, 40]),
    cone(3.4, 1, 6, [0, 0, 46]),
    ball(1.4, [0, 0, 48.5]),
  )
  const front = union(
    box([9, 1.5, 1.8], [0, -8.2, 35.2], 0.45),
    box([8.5, 1.4, 9.5], [0, -8.15, 27], 0.65),
    box([5.5, 1.2, 0.9], [0, -9, 29], 0.2),
    ball(0.85, [2.4, -8.9, 24.5]),
  )
  return union(classicBase(28, 14), body, front)
}

const generators: Record<PieceId, () => Geom3> = {
  rey: cabildo,
  reina: teatroColon,
  alfil: obelisco,
  caballo: sanMartin,
  torre: torreMonumental,
  peon: buzon,
}

export const buildPiece = (definition: PieceDefinition): Geom3 => {
  const raw = generators[definition.id]()
  const bounds = measurements.measureBoundingBox(raw) as [Vec3, Vec3]
  const currentHeight = bounds[1][2] - bounds[0][2]
  const heightScale = definition.heightMm / currentHeight
  const adjusted = scale([1, 1, heightScale], raw)
  const adjustedBounds = measurements.measureBoundingBox(adjusted) as [Vec3, Vec3]
  const generalize = modifiers.generalize as unknown as (
    options: { snap: boolean; simplify: boolean; triangulate: boolean },
    geometry: Geom3,
  ) => Geom3
  return generalize(
    { snap: true, simplify: true, triangulate: true },
    translate([0, 0, -adjustedBounds[0][2]], adjusted),
  )
}
