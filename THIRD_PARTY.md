# Fuentes y herramientas de terceros

El código del proyecto sigue bajo MIT. Los checkpoints y materiales de
referencia conservan sus licencias originales y no se redistribuyen en este
repositorio.

| Recurso | Uso | Licencia / origen |
| --- | --- | --- |
| ComfyUI | Interfaz y orquestación local | GPL-3.0, Comfy-Org |
| Hunyuan3D 2 / 2.1 | Generación image-to-3D local | Tencent Hunyuan Community License |
| PyTorch ROCm (TheRock) | Aceleración AMD `gfx1151` | Licencias del proyecto PyTorch/ROCm |
| Open3D, laspy, trimesh, Manifold | LiDAR y reparación geométrica | Licencias de sus respectivos proyectos |
| Cabildo, Edificios públicos 3D | Nube de puntos de referencia | CC BY 2.5 AR, Gobierno de la Ciudad de Buenos Aires |
| Fotos de San Martín | Referencias multivista | Licencia individual en Wikimedia Commons; ver manifiesto local |
| Cabildo, Teatro Colón, Obelisco, Torre Monumental y buzón | Control de proporciones y silueta | Categorías de Wikimedia Commons; autor y licencia individual en el manifiesto local |

`ai3d/fetch_sources.py` guarda URL, autor, licencia y SHA-256 en
`.experiments/ai3d/manifests/sources.json`. Las fotografías sin permiso de
descarga y los modelos de Sketchfab no descargables quedan expresamente fuera
del flujo.
