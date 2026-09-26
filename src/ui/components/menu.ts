// Il menu del tasto destro e le tendine: agire dove si guarda (nel calendario
// un blocco è piccolo e le azioni sono molte). Vive fuori dal ridisegno, come
// le modali: nasce al clic, sta dove l'ha chiamato il puntatore e se ne va al
// primo gesto che non lo riguarda.

import { h, rifocalizza, type Figlio } from '../dom.js'
import { dentroIBordi } from './hint.js'
import { icona, type NomeIcona } from './icons.js'

interface VoceMenu {
  testo: string
  descrizione?: string
  simbolo?: NomeIcona
  /**
   * Che cosa fa la voce premuta. Può tornare una promessa, e il tipo lo dice:
   * nessuno la aspetta (il menu si chiude subito), quindi chi la scrive gestisce
   * i propri errori.
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
   * Una voce che sta dentro quella di sopra: rientra di un'icona (le tendine
   * dentro il loro gruppo nel menu del contesto dell'assistente).
   */
  rientro?: boolean
  /**
   * Una voce che qui non ha niente da dire: si vede e si preme ma non tira
   * l'occhio. Né nascosta né disabilitata, per ritrovarla quando serve.
   */
  smorzato?: boolean
  /** Il tasto scritto in coda, come in ogni menu. */
  scorciatoia?: string
  /**
   * Il menu del tasto destro sopra la voce (i recenti del menu «File»: preferito,
   * togli dall'elenco). Si apre accanto, dove sta il puntatore.
   */
  menuDestro?: () => ElementoMenu[]
  /**
   * Il nome con cui ritrovare la riga in un menu rifatto (`menuSotto`), per
   * rimettere il fuoco su di lei.
   */
  chiave?: string
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

let apertoOra: (() => void) | null = null
/** Il pulsante a cui è appeso il menu aperto, se è una tendina: vedi `alternaMenuSotto`. */
let ancoraOra: HTMLElement | null = null

/** Quanto il menu resta lontano dai bordi della finestra. */
const MARGINE_MENU = 8

/**
 * Se la tendina aperta pende dal pulsante con questo nome di fuoco: il menu
 * sopravvive al ridisegno, il pulsante no, e quello nuovo deve nascere con
 * `aria-expanded` giusto.
 */
export function tendinaAperta (fuoco: string): boolean {
  return apertoOra !== null && ancoraOra?.dataset.fuoco === fuoco
}

/**
 * Il nodo che fa le veci di `nodo`: lui se è ancora nella pagina, se no quello
 * nuovo con lo stesso nome di fuoco (dopo un ridisegno `===` fallisce).
 */
function sostitutoDi (nodo: HTMLElement | null | undefined): HTMLElement | null {
  if (!nodo) return null
  if (nodo.isConnected) return nodo
  const chiave = nodo.dataset.fuoco
  return chiave ? document.querySelector<HTMLElement>(`[data-fuoco="${CSS.escape(chiave)}"]`) : null
}

/** Se due pulsanti sono lo stesso, anche quando uno dei due è stato ridisegnato. */
function stessoPulsante (a: HTMLElement, b: HTMLElement): boolean {
  if (a === b) return true
  const chiave = a.dataset.fuoco
  return Boolean(chiave) && chiave === b.dataset.fuoco
}

/**
 * Apre il menu dove sta il puntatore. Il menu si chiude prima di eseguire la
 * voce: una conferma aperta sopra un menu aperto ruberebbe Escape al primo strato.
 */
export function menuContestuale (
  evento: MouseEvent,
  elementi: ElementoMenu[],
  origine?: HTMLElement,
): void {
  evento.preventDefault()
  evento.stopPropagation()
  apriMenu(elementi, origine, null, (menu) => collocaMenu(menu, evento.clientX, evento.clientY))
}

/**
 * Il corpo comune del menu contestuale e della tendina. `ancora` è il pulsante
 * della tendina: premerlo non conta come gesto fuori, così lo stesso pulsante
 * lo richiude. `fuocoSu` è la `chiave` della riga che prende il fuoco.
 */
function apriMenu (
  elementi: ElementoMenu[],
  origine: HTMLElement | undefined,
  ancora: HTMLElement | null,
  colloca: (menu: HTMLElement) => void,
  fuocoSu?: string,
): void {
  apertoOra?.()

  const voci = elementi.filter(
    (e): e is VoceMenu => e !== 'separatore' && !èTitolo(e),
  )
  if (voci.length === 0) return
  const fuocoPrima = origine ?? document.activeElement as HTMLElement | null
  origine?.setAttribute('aria-expanded', 'true')

  const menu = h('div', { class: 'menu', attr: { role: 'menu' } })

  // Tutti gli ascoltatori su un filo solo: chiudendo si taglia quello.
  const ascolto = new AbortController()
  const { signal } = ascolto

  /**
   * Il riquadro del tasto destro sopra una voce, accanto al menu, che resta
   * aperto sotto. Uno alla volta: si apre col tasto destro o con →, si chiude con
   * Esc, ←, un clic altrove nel menu, lo scorrimento, o scegliendo una voce.
   */
  let figlio: HTMLElement | null = null
  let voceDelFiglio: HTMLElement | null = null
  const chiudiFiglio = () => {
    figlio?.remove()
    figlio = null
    voceDelFiglio?.classList.remove('menu__voce--aperta')
    voceDelFiglio?.setAttribute('aria-expanded', 'false')
    voceDelFiglio = null
  }

  let chiuso = false
  const chiudi = () => {
    if (chiuso) return
    chiuso = true
    apertoOra = null
    ancoraOra = null
    chiudiFiglio()
    menu.remove()
    origine?.setAttribute('aria-expanded', 'false')
    // Anche sul pulsante che ha preso il posto dell'ancora in un ridisegno.
    sostitutoDi(ancora)?.setAttribute('aria-expanded', 'false')
    ascolto.abort()
  }

  const apriFiglio = (elementiFiglio: ElementoMenu[], voce: HTMLElement) => {
    chiudiFiglio()
    // Il riquadro prende il nome del suo titolo, o della voce da cui nasce.
    const titolo = elementiFiglio.find(èTitolo)?.titolo ?? voce.textContent ?? null
    const nuovo = h('div', {
      class: 'menu menu--figlio',
      attr: { role: 'menu', 'aria-label': titolo },
    })
    riempi(nuovo, elementiFiglio, {
      premi: (elemento) => {
        chiudiFiglio()
        voce.focus()
        void elemento.al()
      },
    })
    if (!nuovo.querySelector('.menu__voce')) return
    document.body.appendChild(nuovo)
    // Accanto al menu, all'altezza della voce: a destra se ci sta, se no a
    // sinistra; in verticale lo tiene dentro `dentroIBordi`.
    const bordo = menu.getBoundingClientRect()
    const riga = voce.getBoundingClientRect()
    const aDestra = bordo.right + 2 + nuovo.offsetWidth <= window.innerWidth - MARGINE_MENU
    const sinistra = aDestra ? bordo.right + 2 : bordo.left - 2 - nuovo.offsetWidth
    nuovo.style.left = `${Math.max(MARGINE_MENU, sinistra)}px` // testo-fisso: misura CSS
    nuovo.style.top = `${dentroIBordi(riga.top - 5, nuovo.offsetHeight, window.innerHeight)}px` // testo-fisso: misura CSS
    figlio = nuovo
    voceDelFiglio = voce
    voce.classList.add('menu__voce--aperta')
    voce.setAttribute('aria-expanded', 'true')
    nuovo.querySelector<HTMLButtonElement>('.menu__voce:not([disabled])')?.focus()
  }

  const allaPressione = (e: PointerEvent) => {
    const dove = e.target as Node | null
    if (figlio?.contains(dove)) return
    if (menu.contains(dove)) {
      // Un clic altrove nel menu chiude il riquadro; il tasto destro su un'altra
      // voce ne apre uno suo.
      if (e.button !== 2) chiudiFiglio()
      return
    }
    if (ancora && sostitutoDi(ancora)?.contains(dove)) return
    chiudi()
    // La pressione che chiude il menu si ferma qui (su una colonna del calendario
    // in modifica farebbe nascere un'ora); il clic che segue arriva lo stesso.
    e.stopPropagation()
  }
  const allaTastiera = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      chiudi()
      rifocalizza(fuocoPrima)
      return
    }
    if (figlio && (e.key === 'Escape' || e.key === 'ArrowLeft')) {
      e.preventDefault()
      e.stopImmediatePropagation()
      const voce = voceDelFiglio
      chiudiFiglio()
      voce?.focus()
      return
    }
    // → su una riga col suo riquadro lo apre, come un sottomenu.
    if (!figlio && e.key === 'ArrowRight') {
      const attiva = document.activeElement as HTMLElement | null
      const elemento = attiva ? vociDelMenu.get(attiva) : undefined
      if (attiva && elemento?.menuDestro) {
        e.preventDefault()
        e.stopImmediatePropagation()
        apriFiglio(elemento.menuDestro(), attiva)
        return
      }
    }
    const pulsanti = [...(figlio ?? menu).querySelectorAll<HTMLButtonElement>('.menu__voce:not([disabled])')]
    const indice = pulsanti.indexOf(document.activeElement as HTMLButtonElement)
    let prossimo: number | undefined
    // Con il fuoco fuori dalle voci (`indice` -1) le frecce vanno ai capi:
    // giù alla prima, su all'ultima — non alla penultima, come dava il conto.
    if (e.key === 'ArrowDown') prossimo = (indice + 1) % pulsanti.length
    if (e.key === 'ArrowUp') {
      prossimo = indice < 0 ? pulsanti.length - 1 : (indice - 1 + pulsanti.length) % pulsanti.length
    }
    if (e.key === 'Home') prossimo = 0
    if (e.key === 'End') prossimo = pulsanti.length - 1
    if (prossimo !== undefined) {
      e.preventDefault()
      e.stopImmediatePropagation()
      pulsanti[prossimo]?.focus()
      return
    }
    if (e.key !== 'Escape') return
    // `Immediate`: fumetti e palette in ascolto sul `document` non devono sentire
    // lo stesso Esc.
    e.stopImmediatePropagation()
    e.preventDefault()
    chiudi()
    rifocalizza(fuocoPrima)
  }
  /**
   * Dove stavano le scatole che scorrono all'apertura: il ridisegno le rimette
   * al loro posto (`ripristinaScorrimenti`) e il browser lo vede come uno
   * scorrimento. Una scatola tornata dov'era non ha mosso niente, e il menu resta.
   */
  const posizioni = new Map<string, { alto: number, sinistra: number }>()
  for (const scatola of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    const chiave = scatola.dataset.scorrimento
    if (chiave) posizioni.set(chiave, { alto: scatola.scrollTop, sinistra: scatola.scrollLeft })
  }
  const fermaDovEra = (scatola: EventTarget | null): boolean => {
    if (!(scatola instanceof HTMLElement)) return false
    const chiave = scatola.dataset.scorrimento
    const dove = chiave ? posizioni.get(chiave) : undefined
    return dove !== undefined &&
      dove.alto === scatola.scrollTop &&
      dove.sinistra === scatola.scrollLeft
  }

  const alloScroll = (e: Event) => {
    const dove = e.target as Node | null
    if (figlio?.contains(dove)) return
    // Il menu che scorre dentro di sé si porta via la riga del riquadro: si chiude.
    if (menu.contains(dove)) {
      chiudiFiglio()
      return
    }
    if (fermaDovEra(dove)) return
    // Una tendina si chiude solo se scorre qualcosa che si porta dietro il suo pulsante.
    const perno = sostitutoDi(ancora)
    if (perno && dove && !dove.contains(perno)) return
    chiudi()
  }

  const vociDelMenu = riempi(menu, elementi, {
    premi: (elemento) => {
      chiudi()
      rifocalizza(fuocoPrima)
      // `void` voluto: il menu è già chiuso e non aspetta la voce.
      void elemento.al()
    },
    // Il tasto destro su una riga senza riquadro chiude quello aperto.
    destro: (elemento, voce) => {
      if (elemento.menuDestro) apriFiglio(elemento.menuDestro(), voce)
      else chiudiFiglio()
    },
  })

  document.body.appendChild(menu)
  colloca(menu)

  const pronte = [...menu.querySelectorAll<HTMLButtonElement>('.menu__voce:not([disabled])')]
  const scelta = fuocoSu === undefined
    ? undefined
    : pronte.find((voce) => voce.dataset.voce === fuocoSu)
  ;(scelta ?? pronte[0])?.focus()

  apertoOra = chiudi
  ancoraOra = ancora
  document.addEventListener('pointerdown', allaPressione, { capture: true, signal })
  document.addEventListener('keydown', allaTastiera, { capture: true, signal })
  window.addEventListener('resize', chiudi, { signal })
  window.addEventListener('blur', chiudi, { signal })
  // In cattura: il calendario scorre dentro un suo contenitore, non nella pagina.
  document.addEventListener('scroll', alloScroll, { capture: true, signal })
}

/**
 * Mette dentro un menu le sue righe (voci, titoli, linee), per il menu e per il
 * riquadro accanto. Torna ogni pulsante con la sua voce, perché → ritrovi il
 * riquadro dal pulsante col fuoco.
 */
function riempi (
  menu: HTMLElement,
  elementi: ElementoMenu[],
  gesti: {
    premi: (elemento: VoceMenu) => void
    destro?: (elemento: VoceMenu, voce: HTMLElement) => void
  },
): Map<HTMLElement, VoceMenu> {
  const voci = new Map<HTMLElement, VoceMenu>()
  for (const elemento of elementi) {
    if (elemento === 'separatore') {
      // Un separatore in cima o dopo un altro non separa niente: si salta.
      if (menu.lastElementChild && !menu.lastElementChild.classList.contains('menu__linea')) {
        menu.appendChild(h('div', { class: 'menu__linea' }))
      }
      continue
    }

    if (èTitolo(elemento)) {
      menu.appendChild(h('div', { class: 'menu__titolo' }, elemento.titolo))
      continue
    }

    const pulsante = menu.appendChild(
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
          dataset: { voce: elemento.chiave },
          disabled: Boolean(elemento.disabilitato),
          attr: {
            role: 'menuitem',
            title: elemento.titolo ?? null,
            'aria-current': elemento.accesa ? 'page' : null,
            'aria-haspopup': elemento.menuDestro && gesti.destro ? 'menu' : null,
          },
          onclick: () => gesti.premi(elemento),
          // Tasto destro, tasto menu o Maiusc+F10: il riquadro si apre accanto alla
          // voce; anche sulle righe senza riquadro, per chiudere quello aperto.
          oncontextmenu: (evento: MouseEvent) => {
            evento.preventDefault()
            evento.stopPropagation()
            gesti.destro?.(elemento, evento.currentTarget as HTMLElement)
          },
        },
        elemento.simbolo ? icona(elemento.simbolo) : h('span', { class: 'menu__vuoto' }),
        h('span', { class: 'menu__testo' }, elemento.testo as Figlio,
          elemento.descrizione ? h('small', { class: 'menu__descrizione' }, elemento.descrizione) : null),
        elemento.scorciatoia ? h('kbd', null, elemento.scorciatoia) : null,
      ),
    )
    voci.set(pulsante, elemento)
  }

  // L'ultima riga non separa più niente da niente.
  if (menu.lastElementChild?.classList.contains('menu__linea')) menu.lastElementChild.remove()
  return voci
}

/**
 * Mette il menu dove ci sta: contro il bordo destro si apre a sinistra, contro
 * quello basso verso l'alto.
 */
function collocaMenu (menu: HTMLElement, sinistra: number, alto: number): void {
  menu.style.left = `${dentroIBordi(sinistra, menu.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
  menu.style.top = `${dentroIBordi(alto, menu.offsetHeight, window.innerHeight)}px` // testo-fisso: misura CSS
}

/**
 * Il menu appeso a un pulsante, sotto di lui e allineato a sinistra: il gesto
 * delle tendine della barra. `fuocoSu` è la `chiave` della riga che prende il
 * fuoco, per chi riapre il menu dopo un gesto su una riga.
 */
export function menuSotto (bottone: HTMLElement, elementi: ElementoMenu[], fuocoSu?: string): void {
  apriMenu(
    elementi,
    bottone,
    bottone,
    (menu) => collocaSotto(menu, bottone.getBoundingClientRect()),
    fuocoSu,
  )
}

/**
 * La tendina che si apre e si chiude dallo stesso pulsante, riconosciuto anche
 * ridisegnato (`stessoPulsante`). `menuSotto` da solo la riaprirebbe, che è
 * quel che vuole chi rinfresca un menu aperto.
 */
export function alternaMenuSotto (bottone: HTMLElement, elementi: ElementoMenu[]): void {
  if (apertoOra && ancoraOra && stessoPulsante(ancoraOra, bottone)) {
    apertoOra()
    return
  }
  menuSotto(bottone, elementi)
}

/**
 * Mette la tendina sotto il suo pulsante e ce la tiene: se non ci sta si
 * accorcia e scorre, e va sopra solo se lì c'è più spazio. Non la si rientra
 * nei bordi come il menu contestuale, che coprirebbe il pulsante.
 */
function collocaSotto (menu: HTMLElement, dove: DOMRect): void {
  const sotto = window.innerHeight - dove.bottom - 2 - MARGINE_MENU
  const sopra = dove.top - 2 - MARGINE_MENU
  const alto = menu.offsetHeight
  const giu = alto <= sotto || sotto >= sopra
  const spazio = Math.max(0, giu ? sotto : sopra)
  if (alto > spazio) menu.style.maxHeight = `${spazio}px` // testo-fisso: misura CSS
  const occupa = Math.min(alto, spazio)
  menu.style.top = `${giu ? dove.bottom + 2 : dove.top - 2 - occupa}px` // testo-fisso: misura CSS
  menu.style.left = `${dentroIBordi(dove.left, menu.offsetWidth, window.innerWidth)}px` // testo-fisso: misura CSS
}
