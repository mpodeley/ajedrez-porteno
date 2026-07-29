import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import type { PieceDefinition } from './catalog'
import type { ViewerStatus } from './viewer-state'
import { loadingProgress, readableLoadError } from './viewer-state'

export type MaterialTone = 'marfil' | 'bordo'

const tones: Record<MaterialTone, THREE.MeshPhysicalMaterialParameters> = {
  marfil: {
    color: 0xeee1ca,
    roughness: 0.38,
    metalness: 0.03,
    clearcoat: 0.16,
    clearcoatRoughness: 0.6,
  },
  bordo: {
    color: 0x8f2638,
    roughness: 0.34,
    metalness: 0.05,
    clearcoat: 0.22,
    clearcoatRoughness: 0.48,
  },
}

export class PieceViewer {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(31, 1, 0.1, 1000)
  private readonly renderer: THREE.WebGLRenderer
  private readonly controls: OrbitControls
  private readonly loader = new STLLoader()
  private mesh?: THREE.Mesh
  private frame = 0
  private loadToken = 0
  private autoRotate = true
  private tone: MaterialTone = 'marfil'
  private readonly resizeObserver: ResizeObserver

  constructor(
    private readonly host: HTMLElement,
    private readonly onStatus: (status: ViewerStatus) => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.host.append(this.renderer.domElement)

    this.camera.position.set(78, 64, -96)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.07
    this.controls.minDistance = 54
    this.controls.maxDistance = 210
    this.controls.maxPolarAngle = Math.PI * 0.52
    this.controls.minPolarAngle = Math.PI * 0.17
    this.controls.target.set(0, 38, 0)

    this.addLighting()
    this.addFloor()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.resize()
    this.render()
  }

  private addLighting(): void {
    this.scene.add(new THREE.HemisphereLight(0xe8f0ee, 0x17202a, 1.55))
    const key = new THREE.SpotLight(0xffd8a8, 1450, 320, Math.PI / 5, 0.55, 1.35)
    key.position.set(-62, 125, -72)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    this.scene.add(key)

    const fill = new THREE.DirectionalLight(0xa6c6d4, 2.1)
    fill.position.set(80, 70, 25)
    this.scene.add(fill)

    const rim = new THREE.PointLight(0xa23a44, 120, 180, 1.6)
    rim.position.set(10, 64, 75)
    this.scene.add(rim)
  }

  private addFloor(): void {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(44, 64),
      new THREE.MeshStandardMaterial({
        color: 0x0b2030,
        roughness: 0.92,
        metalness: 0.02,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.receiveShadow = true
    floor.position.z = -0.25
    this.scene.add(floor)

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(43.5, 44.1, 64),
      new THREE.MeshBasicMaterial({ color: 0xd4ac72, transparent: true, opacity: 0.34 }),
    )
    halo.rotation.x = -Math.PI / 2
    halo.position.z = -0.2
    this.scene.add(halo)
  }

  async load(url: string, piece: PieceDefinition): Promise<void> {
    const token = ++this.loadToken
    this.onStatus({ kind: 'loading', progress: 0 })
    try {
      const geometry = await this.loader.loadAsync(url, (event) => {
        if (token === this.loadToken) {
          this.onStatus(loadingProgress(event.loaded, event.total))
        }
      })
      if (token !== this.loadToken) {
        geometry.dispose()
        return
      }
      geometry.computeVertexNormals()
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox
      if (!bounds) throw new Error('El STL no contiene una geometría válida.')
      const center = new THREE.Vector3()
      bounds.getCenter(center)
      geometry.translate(-center.x, -center.y, -bounds.min.z)

      if (this.mesh) {
        this.scene.remove(this.mesh)
        this.mesh.geometry.dispose()
        ;(this.mesh.material as THREE.Material).dispose()
      }
      this.mesh = new THREE.Mesh(geometry, this.createMaterial())
      this.mesh.rotation.x = -Math.PI / 2
      this.mesh.rotation.z = Math.PI
      this.mesh.castShadow = true
      this.mesh.receiveShadow = true
      this.scene.add(this.mesh)

      this.controls.target.set(0, piece.camera.targetHeight, 0)
      this.camera.position.set(
        piece.camera.distance * 0.58,
        piece.camera.targetHeight + piece.camera.distance * 0.42,
        -piece.camera.distance * 0.74,
      )
      this.controls.update()
      this.onStatus({ kind: 'ready' })
    } catch (error) {
      if (token === this.loadToken) this.onStatus(readableLoadError(error))
    }
  }

  private createMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial(tones[this.tone])
  }

  setTone(tone: MaterialTone): void {
    this.tone = tone
    if (!this.mesh) return
    const previous = this.mesh.material as THREE.Material
    this.mesh.material = this.createMaterial()
    previous.dispose()
  }

  setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled
  }

  resetView(): void {
    if (!this.mesh) return
    this.mesh.rotation.z = Math.PI
  }

  private resize(): void {
    const width = Math.max(1, this.host.clientWidth)
    const height = Math.max(1, this.host.clientHeight)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private render = (): void => {
    this.frame = requestAnimationFrame(this.render)
    if (this.mesh && this.autoRotate) this.mesh.rotation.z += 0.0032
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
  }
}
