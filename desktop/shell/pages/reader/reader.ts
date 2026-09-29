// Il lettore: mette nella cornice il PDF nominato dalla query, e ne porta il
// nome nel titolo della finestra e della sua barra.
//
// Senza preload (`shell/windows/reader.ts`): la pagina non parla col main
// process, e per questo non usa `shared/page.ts`.

import '../shared/titleBar.js'

import './reader.css'

const segni = new URLSearchParams(location.search)
const titolo = segni.get('titolo')
if (titolo) document.title = titolo

const cornice = document.getElementById('documento') as HTMLIFrameElement
if (titolo) cornice.title = titolo
const file = segni.get('file') ?? ''
// Solo i file dell'anno: la CSP lo direbbe comunque, qui si evita di provarci.
if (file.startsWith('registro://dati/')) {
  cornice.src = file
  // Il fuoco al PDF: la rotella, le frecce, Ctrl+F e Ctrl+P vanno al lettore.
  cornice.addEventListener('load', () => cornice.focus(), { once: true })
}
