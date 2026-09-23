// Il menu del tasto destro.
//
// Nel calendario un blocco è piccolo e le cose da farci sopra sono otto: aprire,
// modificare, segnare svolta, annullare, duplicare, esportare, eliminare.
// Metterle tutte dentro il blocco è impossibile, e costringere ad aprire la
// lezione per ognuna è il giro lungo — quel che si vuole, guardando la
// settimana, è agire lì dove si sta guardando.
//
// Il menu vive fuori dal ciclo di ridisegno, come le finestre modali: nasce al
// clic, sta dove l'ha chiamato il puntatore e se ne va al primo gesto che non
// lo riguarda. Un aggiornamento dello stato che arriva mentre è aperto non lo
// tocca — e comunque quasi tutte le sue voci lo chiudono per prime.

import { h, type Figlio } from '../dom.js'
import { icona, type NomeIcona } from './icons.js'

interface VoceMenu {
  testo: string
  descrizione?: string
  simbolo?: NomeIcona
  /**
   * Che cosa fa la voce quando la si preme.
   *
   * Può tornare una promessa, e quasi sempre lo fa: quel che una voce di menu
   * fa davvero — salvare, chiedere conferma, spedire — passa dal registro ed è
   * asincrono. Il tipo lo dice invece di lasciarlo capire: dichiarata `() =>
   * void` e passata una funzione `async`, la promessa non la aspettava nessuno
   * e un errore dentro non arrivava da nessuna parte — nessun avviso, nessun
   * messaggio, la voce premuta che sembra non aver fatto niente.
   *
   * Chi la invoca non l'aspetta comunque: un menu si chiude subito e il lavoro
   * va avanti per conto suo. Ma è una promessa *dichiarata* lasciata andare, e
   * chi la scrive sa di doversi prendere i propri errori.
   */
  al: () => void | Promise<void>
  /** Rossa: è quella da cui non si torna indietro. */
  pericolo?: boolean
  disabilitato?: boolean
  /** Perché è disabilitata, o che cosa fa: si legge fermandosi sopra. */
  titolo?: string
  /** La voce di dove si sta adesso: porta il segno di spunta. */
  accesa?: boolean
  /**
   * Una voce che sta **dentro** quella di sopra: rientra di un'icona.
   *
   * Serve al menu del contesto dell'assistente, dove le tendine stanno dentro
   * il loro gruppo: elencate allo stesso margine erano un secondo elenco che
   * ripeteva parole simili, e nessuno poteva sapere guardando che spegnere il
   * gruppo se le porta via tutte.
   */
  rientro?: boolean
  /**
   * Una voce che qui non ha niente da dire: si vede, si preme, ma non tira
   * l'occhio.
   *
   * Non si nasconde e non si disabilita: un interruttore che compare e sparisce
   * a seconda della pagina è un interruttore che non si ritrova il giorno in
   * cui serve, e uno disabilitato non si potrebbe più preparare per la pagina
   * dopo. Smorzato dice la cosa giusta — c'è, ma adesso non cambia niente.
   */
  smorzato?: boolean
  /** Il tasto scritto in coda, come in ogni menu. */
  scorciatoia?: string
}

/** Il titolo di un gruppo di voci: non si preme, dice di che cosa parlano. */
interface TitoloMenu {
  titolo: string
}

/** Una riga di menu, il titolo di un gruppo, o la linea che separa due gruppi. */
export type ElementoMenu = VoceMenu | TitoloMenu | 'separatore'

function èTitolo (elemento: ElementoMenu): elemento is TitoloMenu {
  return elemento !== 'separatore' && 'titolo' in elemento && !('al' in elemento)
}

/** Quanto stare lontani dal bordo della finestra quando il menu ci sbatte contro. */
const MARGINE = 8

let apertoOra: (() => void) | null = null

/**
 * Apre il menu dove sta il puntatore.
 *
 * Le voci ricevono già il loro gesto: il menu non sa che cosa fanno, si chiude
 * e le lascia lavorare. Chiudere prima di eseguire non è un dettaglio — una
 * voce che apre una finestra di conferma lascerebbe altrimenti due strati
 * sovrapposti, e il secondo ruberebbe il tasto Escape al primo.
 */
export function menuContestuale (evento: MouseEvent, elementi: ElementoMenu[], origine?: HTMLElement): void {
  evento.preventDefault()
  evento.stopPropagation()
  apertoOra?.()

  const voci = elementi.filter(
    (e): e is VoceMenu => e !== 'separatore' && !èTitolo(e),
  )
  if (voci.length === 0) return
  const fuocoPrima = origine ?? document.activeElement as HTMLElement | null
  origine?.setAttribute('aria-expanded', 'true')

  const menu = h('div', { class: 'menu', attr: { role: 'menu' } })

  let chiuso = false
  const chiudi = () => {
    if (chiuso) return
    chiuso = true
    apertoOra = null
    menu.remove()
    origine?.setAttribute('aria-expanded', 'false')
    document.removeEventListener('pointerdown', allaPressione, true)
    document.removeEventListener('keydown', allaTastiera, true)
    window.removeEventListener('resize', chiudi)
    window.removeEventListener('blur', chiudi)
    document.removeEventListener('scroll', alloScroll, true)
  }

  const allaPressione = (e: PointerEvent) => {
    if (!menu.contains(e.target as Node | null)) chiudi()
  }
  const allaTastiera = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      chiudi()
      fuocoPrima?.focus()
      return
    }
    const pulsanti = [...menu.querySelectorAll<HTMLButtonElement>('.menu__voce:not([disabled])')]
    const indice = pulsanti.indexOf(document.activeElement as HTMLButtonElement)
    let prossimo: number | undefined
    if (e.key === 'ArrowDown') prossimo = (indice + 1) % pulsanti.length
    if (e.key === 'ArrowUp') prossimo = (indice - 1 + pulsanti.length) % pulsanti.length
    if (e.key === 'Home') prossimo = 0
    if (e.key === 'End') prossimo = pulsanti.length - 1
    if (prossimo !== undefined) {
      e.preventDefault()
      e.stopPropagation()
      pulsanti[prossimo]?.focus()
      return
    }
    if (e.key !== 'Escape') return
    e.stopPropagation()
    e.preventDefault()
    chiudi()
    fuocoPrima?.focus()
  }
  const alloScroll = (e: Event) => {
    if (!menu.contains(e.target as Node)) chiudi()
  }

  for (const elemento of elementi) {
    if (elemento === 'separatore') {
      // Un separatore in cima o in fondo non separa niente: si salta, così chi
      // costruisce il menu può metterli senza contare le voci che ha escluso.
      if (menu.lastElementChild && !menu.lastElementChild.classList.contains('menu__linea')) {
        menu.appendChild(h('div', { class: 'menu__linea' }))
      }
      continue
    }

    if (èTitolo(elemento)) {
      menu.appendChild(h('div', { class: 'menu__titolo' }, elemento.titolo))
      continue
    }

    menu.appendChild(
      h(
        'button',
        {
          class: [
            'menu__voce',
            elemento.pericolo && 'menu__voce--pericolo',
            elemento.accesa && 'menu__voce--accesa',
            elemento.rientro && 'menu__voce--rientrata',
            elemento.smorzato && 'menu__voce--smorzata',
          ],
          type: 'button',
          disabled: Boolean(elemento.disabilitato),
          attr: {
            role: 'menuitem',
            title: elemento.titolo ?? null,
            'aria-current': elemento.accesa ? 'page' : null,
          },
          onclick: () => {
            chiudi()
            fuocoPrima?.focus()
            // `void`: la voce può essere asincrona, e il menu non l'aspetta —
            // si è già chiuso. Scritto per esteso perché si veda che è una
            // scelta e non una promessa dimenticata.
            void elemento.al()
          },
        },
        elemento.simbolo ? icona(elemento.simbolo) : h('span', { class: 'menu__vuoto' }),
        h('span', { class: 'menu__testo' }, elemento.testo as Figlio,
          elemento.descrizione ? h('small', { class: 'menu__descrizione' }, elemento.descrizione) : null),
        elemento.scorciatoia ? h('kbd', null, elemento.scorciatoia) : null,
      ),
    )
  }

  // L'ultima riga non separa più niente da niente.
  if (menu.lastElementChild?.classList.contains('menu__linea')) menu.lastElementChild.remove()

  document.body.appendChild(menu)
  collocaMenu(menu, evento.clientX, evento.clientY)

  menu.querySelector<HTMLButtonElement>('.menu__voce:not([disabled])')?.focus()

  apertoOra = chiudi
  document.addEventListener('pointerdown', allaPressione, true)
  document.addEventListener('keydown', allaTastiera, true)
  window.addEventListener('resize', chiudi)
  window.addEventListener('blur', chiudi)
  // In cattura: il calendario scorre dentro un suo contenitore, non nella
  // pagina, e un menu che resta appeso all'aria mentre il contenuto scivola via
  // è peggio di nessun menu.
  document.addEventListener('scroll', alloScroll, true)
}

/**
 * Mette il menu dove ci sta.
 *
 * Prima si misura, poi si sposta: contro il bordo destro il menu si apre a
 * sinistra del punto chiesto, contro quello basso verso l'alto — che è quel che
 * fa ogni menu di sistema, e nessuno se ne accorge finché non manca.
 */
function collocaMenu (menu: HTMLElement, sinistra: number, alto: number): void {
  const larghezza = menu.offsetWidth
  const altezza = menu.offsetHeight
  const x = Math.min(sinistra, window.innerWidth - larghezza - MARGINE)
  const y = Math.min(alto, window.innerHeight - altezza - MARGINE)
  menu.style.left = `${Math.max(MARGINE, x)}px`
  menu.style.top = `${Math.max(MARGINE, y)}px`
}

/**
 * Il menu appeso a un pulsante: si apre sotto di lui, allineato al suo bordo
 * sinistro.
 *
 * È il gesto delle tendine della barra — «dove vado», «che cosa faccio al
 * registro» — e non quello del tasto destro: un menu che nascesse dove sta il
 * puntatore comparirebbe ogni volta in un punto diverso dello stesso pulsante,
 * e l'occhio dovrebbe ritrovarlo.
 */
export function menuSotto (bottone: HTMLElement, elementi: ElementoMenu[]): void {
  const dove = bottone.getBoundingClientRect()
  // Un evento finto con dentro l'angolo del pulsante: il menu si apre come
  // sempre — stessa chiusura, stessa tastiera, stesso rientro nei bordi — e
  // ricopiarne il corpo per cambiare due coordinate sarebbe due menu da tenere
  // d'accordo.
  menuContestuale(
    new MouseEvent('click', { clientX: dove.left, clientY: dove.bottom + 2 }),
    elementi,
    bottone,
  )
}
