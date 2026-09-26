// Indietro e avanti fra le pagine del registro, come in un browser: Alt+← / Alt+→
// e i tasti laterali del mouse (`shortcuts.ts`) percorrono la fila dei posti.
// Ascolta lo stato con `iscriviti` e non passa da `aggiorna`: ogni strada che
// cambia pagina finisce in fila senza saperlo.

import { ricordaScorrimenti } from './dom.js'
import { aggiorna, iscriviti, lezionePerId, riconvalidaRicordati, stato } from './state.js'

type Scorrimenti = ReturnType<typeof ricordaScorrimenti>

/**
 * Quel che basta rimettere nello stato per ritrovarsi in un posto. Include il
 * filtro per classe perché le pagine del corso filtrano per corso e classe
 * insieme (come `vaiAlCorso` in `pages.ts`).
 */
type Posto = Pick<
  typeof stato,
  | 'vista'
  | 'paginaId'
  | 'schedaDocente'
  | 'allievoId'
  | 'classeId'
  | 'corsoId'
  | 'lezioneId'
  | 'filtroClasseId'
>

interface Voce {
  chiave: string
  posto: Posto
  /** Dov'era arrivato l'occhio quando ce ne siamo andati. */
  scorrimenti: Scorrimenti
}

/** Quante voci si tengono: nessuno torna indietro di cinquanta passi. */
const MASSIMO = 50

const fila: Voce[] = []
/** Dove si è nella fila: l'ultima voce, salvo dopo un «indietro». */
let indice = -1
/** Il documento a cui la fila appartiene. `undefined`: nessuno ancora. */
let documento: string | null | undefined
/** Una registrazione già chiesta per la fine del gesto in corso. */
let registrazioneInCoda = false
/** Gli scorrimenti da rimettere al prossimo disegno, dopo un passo nella fila. */
let daRitrovare: Scorrimenti | null = null

/**
 * Che cosa si sta guardando: la stessa chiave di `data-scorrimento`
 * (`chiaveDellaPagina` in `shell.ts`), così tornando si ritrova lo scorrimento
 * salvato sotto quella chiave. In più la scheda del docente di classe, perché
 * le sue schede sono destinazioni distinte della barra laterale.
 */
function chiaveDi (posto: Posto): string {
  const soggetto = [posto.allievoId, posto.classeId, posto.corsoId, posto.lezioneId]
  const scheda = posto.vista === 'docenteClasse' ? posto.schedaDocente : ''
  return [posto.vista, posto.paginaId ?? '', scheda, ...soggetto.map((id) => id ?? '')].join(':')
}

function postoCorrente (): Posto {
  return {
    vista: stato.vista,
    paginaId: stato.paginaId,
    schedaDocente: stato.schedaDocente,
    allievoId: stato.allievoId,
    classeId: stato.classeId,
    corsoId: stato.corsoId,
    lezioneId: stato.lezioneId,
    filtroClasseId: stato.filtroClasseId,
  }
}

/**
 * Se il posto esiste ancora. Solo lezione e allievo ne hanno bisogno: sono la
 * scheda di quell'elemento, le altre viste reggono un id sparito da sé.
 */
function esiste (posto: Posto): boolean {
  if (posto.vista === 'lezione') return lezionePerId(posto.lezioneId) !== null
  if (posto.vista === 'allievo') {
    return stato.registro.classi.some((c) => c.allievi.some((a) => a.id === posto.allievoId))
  }
  return true
}

/**
 * Mette in fila il posto in cui si è, se è nuovo. Gira in un microtask a fine
 * gesto: aprire una pagina passa spesso da due `aggiorna` (vista, poi
 * destinazione) e registrare a ogni chiamata metterebbe in fila un posto a metà.
 * Il microtask parte prima del disegno, quindi lo scorrimento della pagina di
 * prima si legge ancora dal DOM.
 */
function registra (): void {
  registrazioneInCoda = false
  if (!stato.caricato) return
  const posto = postoCorrente()
  const chiave = chiaveDi(posto)
  const qui = fila[indice]
  if (qui?.chiave === chiave) {
    qui.posto = posto
    return
  }
  // La pagina di prima è ancora disegnata: il suo scorrimento si legge adesso.
  if (qui) qui.scorrimenti = ricordaScorrimenti()
  // Andando altrove da un posto raggiunto con «indietro», l'«avanti» si perde.
  fila.splice(indice + 1)
  fila.push({ chiave, posto, scorrimenti: new Map() })
  if (fila.length > MASSIMO) fila.splice(0, fila.length - MASSIMO)
  indice = fila.length - 1
}

function allAggiornamento (): void {
  if (!stato.caricato) return
  // Un altro documento: i posti di prima puntano a id che qui non esistono.
  const corrente = stato.documenti.corrente
  if (corrente !== documento) {
    documento = corrente
    fila.length = 0
    indice = -1
  }
  // Restando nello stesso posto la voce si aggiorna subito (es. il corso cambiato
  // nella barra in cima), così il gesto che poi porta altrove non la sporca.
  const qui = fila[indice]
  if (qui && qui.chiave === chiaveDi(postoCorrente())) {
    qui.posto = postoCorrente()
    return
  }
  if (registrazioneInCoda) return
  registrazioneInCoda = true
  queueMicrotask(registra)
}

/** Aggancia la fila allo stato. Una volta, all'avvio del pannello. */
export function installaCammino (): void {
  iscriviti(allAggiornamento)
}

/**
 * Un passo nella fila: -1 indietro, +1 avanti. Vero se si è mossa. I posti che
 * non esistono più si saltano; il cambio di stato che segue non mette in fila
 * niente perché `registra` trova la stessa chiave e la rinfresca.
 */
function passo (verso: -1 | 1): boolean {
  // Un gesto in coda si chiude prima: se no il posto lasciato entrerebbe in fila
  // dopo il passo, al posto sbagliato.
  if (registrazioneInCoda) registra()
  const qui = fila[indice]
  if (!qui) return false
  let arrivo = indice + verso
  while (fila[arrivo] && !esiste(fila[arrivo].posto)) arrivo += verso
  const voce = fila[arrivo]
  if (!voce) return false
  qui.scorrimenti = ricordaScorrimenti()
  indice = arrivo
  daRitrovare = voce.scorrimenti
  aggiorna({ ...voce.posto, schedaComandi: 'pagina' })
  // Una classe o un corso cancellati intanto restano nel posto ricordato.
  riconvalidaRicordati()
  return true
}

export function indietro (): boolean {
  return passo(-1)
}

export function avanti (): boolean {
  return passo(1)
}

/**
 * Aggiunge agli scorrimenti del ridisegno quelli del posto a cui si torna. Va
 * chiamata prima di `rimpiazza`, vale una volta e solo dopo un passo nella
 * fila: altrimenti una pagina si apre dall'alto (`tests/ui/scroll.py`). Rimette
 * solo le scatole che la pagina di adesso non ha: la barra laterale non
 * appartiene al posto e non deve saltare.
 */
export function conGliScorrimentiDelRitorno (scorrimenti: Scorrimenti): Scorrimenti {
  const ritorno = daRitrovare
  daRitrovare = null
  if (!ritorno || ritorno.size === 0) return scorrimenti
  const presenti = new Set<string>()
  for (const elemento of document.querySelectorAll<HTMLElement>('[data-scorrimento]')) {
    if (elemento.dataset.scorrimento) presenti.add(elemento.dataset.scorrimento)
  }
  const unione = new Map(scorrimenti)
  for (const [chiave, dove] of ritorno) {
    if (!presenti.has(chiave)) unione.set(chiave, dove)
  }
  return unione
}
