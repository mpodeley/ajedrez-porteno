export type PieceId = 'rey' | 'reina' | 'alfil' | 'caballo' | 'torre' | 'peon'

export interface PieceDefinition {
  id: PieceId
  role: string
  landmark: string
  shortLandmark: string
  heightMm: number
  baseDiameterMm: number
  quantityPerSide: number
  stlFile: string
  camera: {
    distance: number
    targetHeight: number
  }
  story: string
  modelNotes: string
}

export const pieces: readonly PieceDefinition[] = [
  {
    id: 'rey',
    role: 'Rey',
    landmark: 'Cabildo de Buenos Aires',
    shortLandmark: 'Cabildo',
    heightMm: 95,
    baseDiameterMm: 38,
    quantityPerSide: 1,
    stlFile: 'rey-cabildo.stl',
    camera: { distance: 132, targetHeight: 43 },
    story: 'Las dos recovas de cinco arcos, el balcón y la torre del Cabildo coronan la pieza principal.',
    modelNotes: 'Diez arcos calados, reloj, campanario, cúpula y cruz reforzada.',
  },
  {
    id: 'reina',
    role: 'Reina',
    landmark: 'Teatro Colón',
    shortLandmark: 'Teatro Colón',
    heightMm: 88,
    baseDiameterMm: 36,
    quantityPerSide: 1,
    stlFile: 'reina-teatro-colon.stl',
    camera: { distance: 126, targetHeight: 40 },
    story: 'La fachada Beaux-Arts del gran teatro se vuelve una corona de arcos, columnas y frontones.',
    modelNotes: 'Siete paños, tres frontones, columnata, remates y bandera reforzada.',
  },
  {
    id: 'alfil',
    role: 'Alfil',
    landmark: 'Obelisco de Buenos Aires',
    shortLandmark: 'Obelisco',
    heightMm: 78,
    baseDiameterMm: 34,
    quantityPerSide: 2,
    stlFile: 'alfil-obelisco.stl',
    camera: { distance: 116, targetHeight: 35 },
    story: 'La aguja de la Avenida 9 de Julio reemplaza la mitra con una silueta inmediata.',
    modelNotes: 'Fuste troncopiramidal, cuatro accesos y ventanas superiores en relieve.',
  },
  {
    id: 'caballo',
    role: 'Caballo',
    landmark: 'Monumento al General San Martín',
    shortLandmark: 'San Martín',
    heightMm: 72,
    baseDiameterMm: 34,
    quantityPerSide: 2,
    stlFile: 'caballo-san-martin.stl',
    camera: { distance: 112, targetHeight: 34 },
    story: 'El caballo encabritado y el brazo alzado del Libertador forman una silueta ecuestre inmediata.',
    modelNotes: 'Dos patas ancladas, cola de apoyo, jinete integrado y placa frontal.',
  },
  {
    id: 'torre',
    role: 'Torre',
    landmark: 'Torre Monumental',
    shortLandmark: 'Torre Monumental',
    heightMm: 65,
    baseDiameterMm: 34,
    quantityPerSide: 2,
    stlFile: 'torre-monumental.stl',
    camera: { distance: 104, targetHeight: 30 },
    story: 'El reloj de Retiro ocupa el cuerpo alto y remata en su linterna abierta y cúpula.',
    modelNotes: 'Cuatro relojes, sillares de esquina, arcos calados y aguja reforzada.',
  },
  {
    id: 'peon',
    role: 'Peón',
    landmark: 'Buzón porteño',
    shortLandmark: 'Buzón porteño',
    heightMm: 50,
    baseDiameterMm: 28,
    quantityPerSide: 8,
    stlFile: 'peon-buzon-porteno.stl',
    camera: { distance: 84, targetHeight: 23 },
    story: 'El clásico buzón urbano se convierte en el habitante cotidiano del tablero.',
    modelNotes: 'Tapa curva, ranura y puerta frontal resueltas como relieves imprimibles.',
  },
] as const

export const pieceById = (id: PieceId): PieceDefinition => {
  const piece = pieces.find((candidate) => candidate.id === id)
  if (!piece) throw new Error(`Pieza desconocida: ${id}`)
  return piece
}

export const setZipFile = 'ajedrez-porteno-stl.zip'
