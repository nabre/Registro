// Le scorciatoie da tastiera della finestra: ascolta la tastiera e trova il
// comando che dichiara quel tasto. La tabella è una sola: la `scorciatoia` di
// ogni comando in `COMANDI_UI`.

import { COMANDI_UI, comandoPerId, eseguiComando } from './commands.js'
import { dentroUnCampo } from './dom.js'
import { avanti, indietro } from './history.js'
import { gruppiDiPagine, vaiA } from './pages.js'

/**
 * Consegna quel che si sta scrivendo prima di un comando da tastiera. I campi
 * salvano su `change`, e una scorciatoia non fa uscire dal campo: `blur()`
 * lancia `change` in modo sincrono, così il salvataggio parte prima del
 * comando; poi il fuoco torna, col cursore dov'era.
 */
function consegnaIlCampo (): void {
  const attivo = document.activeElement
  if (!(attivo instanceof HTMLInputElement || attivo instanceof HTMLTextAreaElement)) return
  const { selectionStart: inizio, selectionEnd: fine } = attivo
  attivo.blur()
  attivo.focus()
  try {
    if (inizio !== null) attivo.setSelectionRange(inizio, fine ?? inizio)
  } catch {
    // Date, numeri, colori: campi che una selezione non ce l'hanno.
  }
}

/**
 * Ctrl+Z, Ctrl+Y e Ctrl+Maiusc+Z: annulla e ripristina del registro. Dentro un
 * campo di testo il tasto è del campo (lo annulla Chromium). Torna vero se il
 * tasto era suo, eseguito o lasciato al campo.
 */
function tastoDellaStoria (evento: KeyboardEvent, tasto: string): boolean {
  if (evento.altKey || (tasto !== 'z' && tasto !== 'y')) return false
  // Ctrl+Maiusc+Y non è niente: si lascia passare.
  if (tasto === 'y' && evento.shiftKey) return false
  if (scriveTesto(evento.target)) return true
  const id = tasto === 'y' || evento.shiftKey ? 'modifica.ripristina' : 'modifica.annulla'
  const comando = comandoPerId(id)
  if (!comando) return false
  evento.preventDefault()
  void eseguiComando(comando)
  return true
}

/**
 * Vero se il bersaglio è un posto in cui si scrive testo. Non è `dentroUnCampo`:
 * su una casella appena spuntata Ctrl+Z deve togliere la spunta.
 */
function scriveTesto (bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false
  if (bersaglio.isContentEditable || bersaglio instanceof HTMLTextAreaElement) return true
  if (!(bersaglio instanceof HTMLInputElement)) return false
  return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file']
    .includes(bersaglio.type)
}

/**
 * Se sopra la pagina c'è una modale o la palette: cambiare pagina lì sotto la
 * lascerebbe appesa. Stessa regola di `eseguiNavigazione` in `main.ts`.
 */
function coperta (): boolean {
  return document.querySelector('.modale, .palette__velo') !== null
}

/**
 * Alt+← e Alt+→: indietro e avanti fra i posti visitati. Non dentro un campo di
 * testo, dove la freccia è di chi scrive (su Mac Opzione+← salta la parola).
 */
function tastoDelCammino (evento: KeyboardEvent): boolean {
  if (!evento.altKey || evento.ctrlKey || evento.metaKey || evento.shiftKey) return false
  if (evento.key !== 'ArrowLeft' && evento.key !== 'ArrowRight') return false
  if (coperta() || scriveTesto(evento.target)) return false
  evento.preventDefault()
  if (evento.key === 'ArrowLeft') indietro()
  else avanti()
  return true
}

/**
 * Ctrl+1…9: le prime nove voci della barra laterale, come le numera
 * `suggerimentoDi` in `sidebar.ts`. Si legge il tasto fisico (`code`), perché
 * sulla tastiera francese la fila dei numeri scrive altro; senza Alt, perché
 * Ctrl+Alt è AltGr. Vale anche dentro un campo, dopo averlo consegnato.
 */
function tastoDellaPagina (evento: KeyboardEvent): boolean {
  if (evento.altKey || evento.shiftKey) return false
  const cifra = /^(?:Digit|Numpad)([1-9])$/.exec(evento.code)?.[1]
  if (!cifra) return false
  const pagina = gruppiDiPagine().flatMap((gruppo) => gruppo.pagine)[Number(cifra) - 1]
  if (!pagina) return false
  evento.preventDefault()
  consegnaIlCampo()
  vaiA(pagina)
  return true
}

/**
 * I tasti che valgono in tutta la finestra, letti dalla scorciatoia dichiarata
 * dal comando. Non dentro una modale, dove Invio ed Escape sono del modulo; sì
 * nei campi di testo (Ctrl+S a metà di un consuntivo).
 */
export function installaScorciatoie (opzioni: {
  comandi: () => void
  palette: () => void
}): void {
  document.addEventListener('keydown', (evento: KeyboardEvent) => {
    if (tastoDelCammino(evento)) return
    if (!evento.ctrlKey && !evento.metaKey) return
    if (document.querySelector('.modale')) return

    const tasto = evento.key.toLowerCase()
    const conAlt = evento.altKey

    // I due gesti del telaio, che non sono comandi: Ctrl+B nasconde le azioni
    // della barra dei comandi (non la barra laterale), Ctrl+K apre la palette.
    if (!conAlt && !evento.shiftKey && tasto === 'b') {
      // Non dentro un campo: lì Ctrl+B è il grassetto.
      if (dentroUnCampo(evento.target)) return
      evento.preventDefault()
      opzioni.comandi()
      return
    }
    if (!conAlt && !evento.shiftKey && tasto === 'k') {
      evento.preventDefault()
      opzioni.palette()
      return
    }

    // Annulla e ripristina prima del giro generale: dentro un campo il tasto è del campo.
    if (tastoDellaStoria(evento, tasto)) return
    if (!coperta() && tastoDellaPagina(evento)) return

    for (const comando of COMANDI_UI) {
      if (!comando.scorciatoia || comando.dalMenu) continue
      const pezzi = comando.scorciatoia.toLowerCase().split('+')
      if (pezzi.includes('alt') !== conAlt) continue
      if (pezzi.includes('shift') !== evento.shiftKey) continue
      if (pezzi[pezzi.length - 1] !== tasto) continue
      evento.preventDefault()
      consegnaIlCampo()
      // Il comando parte e la tastiera torna subito a chi scrive.
      void eseguiComando(comando)
      return
    }
  })

  // I tasti laterali del mouse (3 indietro, 4 avanti), sul rilascio come in
  // Chromium. Si ferma il comportamento di serie, che porterebbe fuori dal registro.
  document.addEventListener('mouseup', (evento: MouseEvent) => {
    if (evento.button !== 3 && evento.button !== 4) return
    evento.preventDefault()
    if (coperta()) return
    if (evento.button === 3) indietro()
    else avanti()
  })
}
