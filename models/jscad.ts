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

const architecturalStem = (
  diameter: number,
  topZ: number,
  lowerRadius: number,
  upperRadius: number,
): Geom3 => union(
  classicBase(diameter),
  cone(lowerRadius, upperRadius, topZ - 19, [0, 0, 15 + (topZ - 19) / 2]),
  cyl(lowerRadius + 0.8, 2.2, [0, 0, 16.1]),
  ellip([upperRadius + 3.4, upperRadius + 3.4, 2.8], [0, 0, topZ - 2.4]),
  cyl(upperRadius + 4.2, 2.2, [0, 0, topZ - 0.7]),
)

const cross = (z: number): Geom3 =>
  union(
    box([2.4, 2.4, 8], [0, 0, z - 4], 0.35),
    box([7, 2.4, 2.4], [0, 0, z - 3], 0.35),
  )

const cabildo = (): Geom3 => {
  const facade = box([34, 8, 10], [0, 0, 75], 0.35)
  const arcade = [-13.2, -6.6, 0, 6.6, 13.2].map((x) => [
    box([0.8, 1.2, 3.3], [x - 1.8, -4.5, 72.3], 0.2),
    box([0.8, 1.2, 3.3], [x + 1.8, -4.5, 72.3], 0.2),
    beam([x - 1.8, -4.5, 73.8], [x, -4.5, 75.1], 0.45),
    beam([x, -4.5, 75.1], [x + 1.8, -4.5, 73.8], 0.45),
  ]).flat()
  const upper = box([10.5, 7.5, 8.5], [0, 0, 83], 0.3)
  const ledges = [
    box([12, 9, 1.25], [0, 0, 79.3], 0.2),
    box([12, 8.7, 1.2], [0, 0, 87], 0.2),
  ]
  const clock = [
    cyl(1.7, 1.2, [0, -4, 82], 32),
    box([0.4, 0.8, 1.7], [0, -4.8, 82], 0.15),
    box([1.15, 0.8, 0.4], [0.35, -4.8, 82], 0.15),
  ]
  const dome = union(
    cyl(3.3, 1.5, [0, 0, 88.2]),
    ellip([3.5, 3.2, 2.5], [0, 0, 90]),
    cone(2.5, 0.65, 3.6, [0, 0, 92.6]),
    ball(0.75, [0, 0, 94]),
    cyl(0.72, 2.8, [0, 0, 94]),
  )
  return union(
    architecturalStem(38, 71, 8.4, 5.2),
    box([27, 9.5, 1.6], [0, 0, 69.7], 0.2),
    box([35, 9, 1.6], [0, 0, 70.7], 0.2),
    facade,
    ...arcade,
    upper,
    ...ledges,
    ...clock,
    dome,
    cross(95),
  )
}

const teatroColon = (): Geom3 => {
  const body = box([34, 10, 12.5], [0, 0, 75], 0.35)
  const columns = [-12.2, -8.1, -4.05, 0, 4.05, 8.1, 12.2].map((x) =>
    cyl(0.66, 5.4, [x, -5.35, 78], 20),
  )
  const capitals = [-12.2, -8.1, -4.05, 0, 4.05, 8.1, 12.2].flatMap((x) => [
    box([1.8, 1.4, 0.8], [x, -5.3, 75.2], 0.15),
    box([1.9, 1.4, 0.8], [x, -5.3, 80.8], 0.15),
  ])
  const ornaments = [-15.3, -10.8, -7.4, 7.4, 10.8, 15.3].map((x) =>
    union(cyl(0.5, 1.6, [x, 0, 84]), ball(0.72, [x, 0, 85])),
  )
  return union(
    architecturalStem(36, 69, 8, 5),
    box([27, 10.5, 1.6], [0, 0, 67.7], 0.2),
    box([35, 11, 1.8], [0, 0, 69], 0.2),
    body,
    box([35, 11, 1.1], [0, 0, 74.4], 0.15),
    box([35, 11, 1.2], [0, 0, 81.2], 0.15),
    ...columns,
    ...capitals,
    prismX([[-8.5, 0], [8.5, 0], [0, 5]], 10, [0, 0, 81]),
    prismX([[-4, 0], [4, 0], [0, 3.4]], 10, [-13, 0, 81]),
    prismX([[-4, 0], [4, 0], [0, 3.4]], 10, [13, 0, 81]),
    ...ornaments,
    cyl(0.62, 5, [0, 0, 86]),
    box([4.5, 1.1, 2.2], [2.2, 0, 87], 0.15),
    ball(0.8, [0, 0, 88]),
  )
}

const obelisco = (): Geom3 => {
  const plinth = union(
    box([15, 15, 2.4], [0, 0, 15.8], 0.35),
    box([11.5, 11.5, 3], [0, 0, 18.3], 0.3),
    box([9, 9, 3], [0, 0, 21], 0.25),
  )
  const shaft = cone(4, 2.35, 47, [0, 0, 44.5], 4)
  const point = cone(2.35, 0, 10, [0, 0, 73], 4)
  const windows = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => {
    const relief = box([1.55, 1.2, 2.8], [0, -2.45, 68], 0.2)
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
    box([17, 17, 2.5], [0, 0, 15.7], 0.35),
    box([14, 14, 3.5], [0, 0, 18], 0.3),
  )
  const body = union(
    box([11, 11, 24], [0, 0, 31.2], 0.45),
    box([13, 13, 1.8], [0, 0, 43.5], 0.25),
    box([13, 13, 7], [0, 0, 47.5], 0.3),
  )
  const clocks = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) =>
    rotateZ(angle, union(
      cyl(2.75, 1.25, [0, -6.65, 47.5], 32),
      box([0.45, 0.8, 2.8], [0, -7.4, 47.5], 0.15),
      box([1.6, 0.8, 0.45], [0.5, -7.4, 47.5], 0.15),
    )),
  )
  const roof = union(
    box([14.5, 14.5, 1.5], [0, 0, 51.5], 0.2),
    box([10.5, 10.5, 6], [0, 0, 55], 0.25),
    box([11.5, 11.5, 1.5], [0, 0, 58.3], 0.2),
    cone(5.5, 4, 2.5, [0, 0, 60], 4),
    ellip([4.1, 4.1, 2.4], [0, 0, 61.7]),
    cone(2.5, 0.5, 2.8, [0, 0, 63.2], 4),
    cyl(0.5, 2.5, [0, 0, 64]),
    ball(0.7, [0, 0, 65]),
  )
  return union(classicBase(34), plinth, body, ...clocks, roof)
}

const buzon = (): Geom3 => {
  const body = union(
    cyl(6.7, 26.5, [0, 0, 29.5]),
    cone(8.5, 6.7, 4, [0, 0, 15]),
    cyl(7.6, 1.8, [0, 0, 17]),
    cyl(7.6, 1.8, [0, 0, 41]),
    cyl(8.2, 2.2, [0, 0, 43]),
    ellip([8, 8, 4.2], [0, 0, 46]),
    cyl(0.9, 1.4, [0, 0, 49.3]),
  )
  const front = union(
    box([7.5, 1.25, 0.95], [0, -7.05, 38.1], 0.2),
    box([7, 1.2, 9], [0, -6.85, 25.8], 0.35),
    box([5.5, 1.1, 0.8], [0, -7.45, 28], 0.15),
    ball(0.75, [2.1, -7.4, 24.5]),
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
