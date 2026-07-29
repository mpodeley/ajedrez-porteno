import './style.css'
import { pieces, setZipFile, type PieceDefinition, type PieceId } from './catalog'
import { stlAssetUrl, zipAssetUrl } from './paths'
import { PieceViewer, type MaterialTone } from './viewer'
import type { ViewerStatus } from './viewer-state'

const base = import.meta.env.BASE_URL
let selected = pieces[0]

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('No se encontró el contenedor de la aplicación.')

app.innerHTML = `
  <header class="masthead">
    <a class="brand" href="${base}" aria-label="Ajedrez Porteño, inicio">
      <span class="brand-mark" aria-hidden="true">AP</span>
      <span>Ajedrez Porteño<small>Colección 3D · Buenos Aires</small></span>
    </a>
    <a class="header-download" href="${zipAssetUrl(base, setZipFile)}" download>
      <span>Descargar colección</span>
      <span aria-hidden="true">↓</span>
    </a>
  </header>

  <main>
    <section class="intro" aria-labelledby="page-title">
      <div>
        <p class="eyebrow">Arquitectura para jugar</p>
        <h1 id="page-title">La ciudad<br><em>sobre el tablero.</em></h1>
      </div>
      <p class="lede">
        Seis íconos porteños convertidos en piezas de ajedrez listas para imprimir.
        Una colección sólida, paramétrica y sin soportes.
      </p>
      <span class="edition">Edición<br><strong>01—06</strong></span>
    </section>

    <section class="collection" aria-label="Explorador de la colección">
      <nav class="piece-nav" aria-label="Elegir pieza">
        ${pieces.map((piece, index) => `
          <button class="piece-tab${index === 0 ? ' is-active' : ''}" data-piece="${piece.id}" aria-pressed="${index === 0}">
            <span class="tab-number">0${index + 1}</span>
            <span><strong>${piece.role}</strong><small>${piece.shortLandmark}</small></span>
            <span class="tab-arrow" aria-hidden="true">↗</span>
          </button>
        `).join('')}
      </nav>

      <div class="viewer-column">
        <div class="viewer-shell">
          <div class="viewer-grid" aria-hidden="true"></div>
          <div id="viewer" aria-label="Modelo tridimensional interactivo"></div>
          <div id="viewer-status" class="viewer-status" role="status" aria-live="polite">
            Preparando la sala…
          </div>
          <div class="viewer-badge"><span></span> Modelo imprimible</div>
          <div class="view-controls">
            <button id="rotate-toggle" class="icon-control is-active" type="button" aria-pressed="true">
              <span aria-hidden="true">↻</span> Giro
            </button>
            <button id="reset-view" class="icon-control" type="button">
              <span aria-hidden="true">⌖</span> Centrar
            </button>
          </div>
          <div class="tone-switch" aria-label="Color de previsualización">
            <button data-tone="marfil" class="tone is-active" aria-pressed="true">
              <span class="swatch ivory"></span> Marfil
            </button>
            <button data-tone="bordo" class="tone" aria-pressed="false">
              <span class="swatch wine"></span> Bordó
            </button>
          </div>
        </div>
        <p class="interaction-hint"><span>Arrastrá para rotar</span><span>Rueda o pellizco para acercar</span></p>
      </div>

      <aside class="piece-card" aria-live="polite">
        <p class="piece-kicker">Pieza <span id="piece-index">01</span></p>
        <h2 id="piece-role">${selected.role}</h2>
        <p id="piece-landmark" class="landmark">${selected.landmark}</p>
        <p id="piece-story" class="piece-story">${selected.story}</p>
        <dl class="measurements">
          <div><dt>Altura</dt><dd id="piece-height">${selected.heightMm}<small>mm</small></dd></div>
          <div><dt>Base</dt><dd id="piece-base">Ø ${selected.baseDiameterMm}<small>mm</small></dd></div>
          <div><dt>Por color</dt><dd id="piece-quantity">${selected.quantityPerSide}<small>u.</small></dd></div>
        </dl>
        <p id="piece-notes" class="model-notes">${selected.modelNotes}</p>
        <a id="piece-download" class="primary-download" href="${stlAssetUrl(base, selected.stlFile)}" download>
          <span><small>Archivo STL</small>Descargar ${selected.role}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </aside>
    </section>

    <section class="print-note" aria-labelledby="print-title">
      <p class="eyebrow">Del museo a la mesa</p>
      <div>
        <h2 id="print-title">Diseñadas para una<br>impresión tranquila.</h2>
        <p>PLA · boquilla 0,4 mm · capa 0,2 mm · 3 perímetros · 15–20 % de relleno</p>
      </div>
      <div class="print-stat"><strong>0</strong><span>soportes<br>necesarios</span></div>
    </section>
  </main>

  <footer>
    <p>Ajedrez Porteño <span>—</span> Una colección abierta y reproducible.</p>
    <span>Lista para GitHub Pages</span>
  </footer>
`

const statusElement = document.querySelector<HTMLDivElement>('#viewer-status')!
const viewer = new PieceViewer(document.querySelector<HTMLDivElement>('#viewer')!, renderStatus)

function renderStatus(status: ViewerStatus): void {
  statusElement.className = `viewer-status status-${status.kind}`
  if (status.kind === 'loading') {
    statusElement.textContent = status.progress ? `Cargando geometría · ${status.progress} %` : 'Cargando geometría…'
  } else if (status.kind === 'error') {
    statusElement.innerHTML = `<strong>No se pudo abrir la pieza.</strong><span>${status.message}</span>`
  } else if (status.kind === 'ready') {
    statusElement.textContent = ''
  } else {
    statusElement.textContent = 'Preparando la sala…'
  }
}

function updatePiece(piece: PieceDefinition): void {
  selected = piece
  const index = pieces.findIndex((item) => item.id === piece.id)
  document.querySelectorAll<HTMLButtonElement>('.piece-tab').forEach((button) => {
    const active = button.dataset.piece === piece.id
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  })
  document.querySelector('#piece-index')!.textContent = `0${index + 1}`
  document.querySelector('#piece-role')!.textContent = piece.role
  document.querySelector('#piece-landmark')!.textContent = piece.landmark
  document.querySelector('#piece-story')!.textContent = piece.story
  document.querySelector('#piece-height')!.innerHTML = `${piece.heightMm}<small>mm</small>`
  document.querySelector('#piece-base')!.innerHTML = `Ø ${piece.baseDiameterMm}<small>mm</small>`
  document.querySelector('#piece-quantity')!.innerHTML = `${piece.quantityPerSide}<small>u.</small>`
  document.querySelector('#piece-notes')!.textContent = piece.modelNotes
  const download = document.querySelector<HTMLAnchorElement>('#piece-download')!
  download.href = stlAssetUrl(base, piece.stlFile)
  download.querySelector('span')!.innerHTML = `<small>Archivo STL</small>Descargar ${piece.role}`
  void viewer.load(stlAssetUrl(base, piece.stlFile), piece)
}

document.querySelectorAll<HTMLButtonElement>('.piece-tab').forEach((button) => {
  button.addEventListener('click', () => {
    const piece = pieces.find((item) => item.id === button.dataset.piece as PieceId)
    if (piece) updatePiece(piece)
  })
})

document.querySelectorAll<HTMLButtonElement>('.tone').forEach((button) => {
  button.addEventListener('click', () => {
    const tone = button.dataset.tone as MaterialTone
    document.querySelectorAll<HTMLButtonElement>('.tone').forEach((candidate) => {
      const active = candidate === button
      candidate.classList.toggle('is-active', active)
      candidate.setAttribute('aria-pressed', String(active))
    })
    viewer.setTone(tone)
  })
})

const rotateToggle = document.querySelector<HTMLButtonElement>('#rotate-toggle')!
rotateToggle.addEventListener('click', () => {
  const enabled = rotateToggle.getAttribute('aria-pressed') !== 'true'
  rotateToggle.setAttribute('aria-pressed', String(enabled))
  rotateToggle.classList.toggle('is-active', enabled)
  viewer.setAutoRotate(enabled)
})

document.querySelector<HTMLButtonElement>('#reset-view')!.addEventListener('click', () => viewer.resetView())
window.addEventListener('beforeunload', () => viewer.dispose())
updatePiece(selected)
