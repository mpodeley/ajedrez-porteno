# Laboratorio AI 3D

Este directorio contiene solamente la automatización reproducible. Los modelos,
datasets, fotos y candidatos pesan varios GB y se guardan en
`.experiments/ai3d/`, ignorado por Git. El entorno Python y ComfyUI viven en
`../../terceros/`.

El laboratorio probado usa Python 3.12, PyTorch
`2.10.0+rocm7.13.0a20260513` de TheRock para `gfx1151`, ComfyUI `0.29.0` y los
paquetes fijados en `requirements.txt`. `npm run ai3d:doctor` verifica las
versiones, checkpoints, permisos y acceso real a la Radeon 8060S.

## Flujo

```bash
npm run ai3d:doctor
npm run ai3d:fetch
npm run ai3d:comfy
```

La interfaz queda disponible en `http://127.0.0.1:8188`. El preparador incluido
recorta y aísla tres vistas licenciadas de San Martín:

```bash
../../terceros/ai-3d-lab/.venv/bin/python ai3d/prepare_san_martin.py
```

Para generar el piloto, se aceptan imágenes llamadas `front`, `left`, `back` y
`right` en PNG, JPG o WebP. La frontal es obligatoria; Hunyuan admite vistas
opcionales cuando no existe una toma posterior confiable:

```bash
npm run ai3d:generate -- --piece caballo --input-dir .experiments/ai3d/views/san-martin
```

Se ejecutan por defecto las semillas 101, 211, 307 y 401. Los GLB quedan en
`.experiments/ai3d/raw/caballo/`; ningún candidato reemplaza automáticamente el
STL publicado.

Para preparar el LiDAR:

```bash
../../terceros/ai-3d-lab/.venv/bin/python ai3d/prepare_lidar.py
```

Para normalizar un GLB elegido, unirlo con una base clásica y validar la
envolvente:

```bash
npm run ai3d:repair -- .experiments/ai3d/raw/caballo/model.glb --piece caballo --up y
```

La integración final se hace sólo después de comparar renders, silueta,
fidelidad y condiciones FDM contra el modelo actual.

El caballo actualmente curado se obtuvo con la semilla `307`, reparación a
0,35 mm, dos apoyos de isla integrados, giro final de 150° y simplificación a
70.000 triángulos. El generador lo toma desde `models/curated/`, de modo que
`npm run generate` continúa siendo reproducible sin depender de que ComfyUI
esté encendido.

## Criterios de aprobación

- una sola envolvente cerrada, normales consistentes y base plana;
- altura y diámetro definidos en `pipeline.json`;
- rasgos de al menos 1,2 mm a la escala final;
- apoyos continuos y voladizos razonables para PLA sin soportes;
- atribución y licencia conservadas en los manifiestos de fuentes.
