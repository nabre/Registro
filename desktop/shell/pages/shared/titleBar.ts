// La barra del titolo delle finestre del guscio (benvenuto, impostazioni,
// dialoghi, lettore): la stessa testata del pannello (`ui/pannello/titleBar.ts`),
// ridotta a quel che una finestra di servizio porta — il logo e il titolo.
//
// La finestra nasce con `cornicePropria()` (`desktop/apparato/theme.ts`) e lo
// dice nella query (`segniDellaCornice`): senza `cornice` la pagina ha la
// cornice di sistema (il foglio modale di macOS, lo splash) e qui non si fa
// niente. I pulsanti della finestra li mette il sistema, come nel pannello.
//
// Non passa dal ponte del preload: il lettore non ce l'ha. Si importa per
// l'effetto, subito dopo la lingua.

import './title-bar.css'

/** Il file del logo, lo stesso di `ui/pannello/components/logo.ts`. */
const LOGO = 'registro://app/resources/registro-app-piccola.svg'

function disegna (): void {
  const segni = new URLSearchParams(location.search)
  const sistema = segni.get('cornice')
  if (!sistema) return
  const radice = document.documentElement
  // `data-cornice` fa posto alla barra (`title-bar.css`); `data-sistema` sposta
  // il logo per i semafori di macOS, come nel pannello.
  radice.dataset.cornice = 'propria'
  radice.dataset.sistema = sistema

  // Decorativa per i lettori di schermo: il titolo lo dice già la finestra, e
  // ogni pagina ha il suo `h1`.
  const barra = document.createElement('div')
  barra.className = 'barra-titolo'
  barra.setAttribute('aria-hidden', 'true')

  const marchio = document.createElement('span')
  marchio.className = 'barra-titolo__marchio'
  const segno = document.createElement('img')
  segno.className = 'barra-titolo__marchio-segno'
  segno.src = LOGO
  segno.alt = ''
  segno.draggable = false
  marchio.append(segno)
  // Da sorgenti, il segno accanto al logo come nel pannello (`data-sviluppo` in
  // `desktop/pannelli/page.ts`): la finestra di prova non si scambia con quella installata.
  const modo = segni.get('sviluppo')
  if (modo === 'dev' || modo === 'start') {
    const sviluppo = document.createElement('span')
    sviluppo.className = `barra-titolo__sviluppo barra-titolo__sviluppo--${modo}`
    sviluppo.textContent = modo.toUpperCase()
    marchio.append(sviluppo)
  }

  const nome = document.createElement('span')
  nome.className = 'barra-titolo__nome'
  const scrivi = (): void => {
    nome.textContent = document.title
  }
  scrivi()
  // Il titolo può arrivare dopo (le impostazioni lo ricevono col primo messaggio):
  // la barra segue `document.title`, che è anche quello della finestra.
  const titolo = document.querySelector('title')
  if (titolo) new MutationObserver(scrivi).observe(titolo, { childList: true, characterData: true, subtree: true })

  barra.append(marchio, nome)
  document.body.prepend(barra)
}

disegna()
