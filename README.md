# Ajedrez Porteño

Seis piezas de ajedrez imprimibles inspiradas en íconos de Buenos Aires y una
galería 3D en español. Los dos bandos usan los mismos STL impresos en colores
distintos.

| Pieza | Ícono | Altura | Base | Cantidad por color |
| --- | --- | ---: | ---: | ---: |
| Rey | Cabildo | 95 mm | Ø 38 mm | 1 |
| Reina | Teatro Colón | 88 mm | Ø 36 mm | 1 |
| Alfil | Obelisco | 78 mm | Ø 34 mm | 2 |
| Caballo | Monumento a San Martín | 72 mm | Ø 34 mm | 2 |
| Torre | Torre Monumental | 65 mm | Ø 34 mm | 2 |
| Peón | Buzón porteño | 50 mm | Ø 28 mm | 8 |

Para un juego completo hay que imprimir esa lista dos veces: 16 piezas en
marfil y 16 en bordó, o en los dos colores que se prefieran.

## Impresión

Los modelos están orientados con la base en `Z = 0`, son una sola pieza sólida
y no requieren soportes. La geometría combina rasgos reconocibles de cada
referencia —arquerías, frontones, relojes, linternas, relieves y silueta
ecuestre— con refuerzos pensados para FDM.

Configuración recomendada:

- PLA con boquilla de 0,4 mm y capa de 0,2 mm.
- 3 perímetros.
- 4 capas superiores e inferiores.
- 15–20 % de relleno.
- Brim solamente si la adhesión de la impresora lo requiere.

El detalle positivo más pequeño es de al menos 1,2 mm. Los cambios de sección
son progresivos y los elementos delicados —la cruz, el jinete, las columnas y
la tapa del buzón— están unidos o reforzados.

## Archivos

- `public/stl/`: seis STL binarios en milímetros.
- `public/downloads/ajedrez-porteno-stl.zip`: colección completa.
- `models/manifold.ts`: fuente paramétrica canónica y salida manifold para impresión.
- `models/jscad.ts`: prototipos paramétricos JSCAD de las seis siluetas.
- `src/catalog.ts`: catálogo tipado compartido por modelos, interfaz y pruebas.
- `src/`: galería Vite + TypeScript + Three.js.

La colección final se construye con primitivas, perfiles, envolventes y
operaciones booleanas paramétricas sobre el núcleo Manifold. El generador solo
escribe fronteras orientadas y cerradas. El validador comprueba aristas,
triángulos, medidas, base plana y cantidad de envolventes; JSCAD conserva una
implementación liviana para experimentar con las proporciones generales.

## Desarrollo

Requiere Node.js 22 o posterior:

```bash
npm ci
npm run validate:jscad
npm run generate
npm run validate:stl
npm run validate:assimp
npm run package:stl
npm test
npm run dev
```

El build estático se genera con:

```bash
npm run build
```

`VITE_BASE` controla el prefijo público. Su valor predeterminado es
`/ajedrez-porteno/`; para servir el build desde la raíz:

```bash
VITE_BASE=/ npm run build
```

## Publicación

El archivo `.github/pages-workflow.yml.example` contiene un workflow listo para
copiar a `.github/workflows/pages.yml` si se prefiere despliegue automático. La
publicación inicial usa una rama `gh-pages` para no requerir permisos OAuth de
administración de workflows.

## Licencia

Código y modelos bajo licencia MIT.
