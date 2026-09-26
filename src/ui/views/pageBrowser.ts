// Lo sfoglio di un PDF da dividere: le pagine si scelgono (anche non
// consecutive) e si trascinano sulla casella persona × documento, che le
// ritaglia e archivia come la divisione a mano, rifiutando una casella piena.
// Se il PDF sa già a quale documento appartiene basta la riga della persona;
// la casella resta mirabile per archiviare in un'altra colonna.
// Le pagine scelte stanno nello stato e non nel DOM perché la vista si
// ridisegna a ogni battito. Le miniature le fa `components/thumbnails.ts`.

import { etichettaFoglio } from '../../domain/absences.js'
import { nomeCompleto } from '../../domain/calculations.js'
import { dicePagine } from '../../domain/sorting.js'
import { conferma } from '../components/modal.js'
import type {
  Allievo,
  Consegna,
  PaginaSmistamento,
  RiquadroPagina,
  Smistamento,
} from '../../domain/models.js'
import { campo, pastiglia, pulsante } from '../components/base.js'
import { icona } from '../components/icons.js'
import { menuContestuale, type ElementoMenu } from '../components/menu.js'
import { apriModale } from '../components/modal.js'
import {
  impostaCaratteri,
  miniatura,
  miniaturaAllaMisura,
  miniaturaPronta,
} from '../components/thumbnails.js'
import { notifica } from '../components/notifications.js'
import { h, type Figlio } from '../dom.js'
import { azione } from '../bridge.js'
import { MISURE_SFOGLIO, ZOOM_PREDEFINITO, aggiorna, stato, uriDato } from '../state.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { Uno } from '../../domain/lexicon.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './pageBrowser.testi.js'

/**
 * Il tipo con cui le pagine viaggiano nel trascinamento. Un tipo proprio e non
 * `text/plain` perché durante il passaggio si legge solo l'elenco dei tipi, e
 * le caselle devono distinguere pagine da file del gestore file.
 */
export const TIPO_PAGINE = 'application/x-registro-pagine'

/** Quel che viaggia: di quale PDF sono, e quali pagine. */
export interface PagineTrascinate {
  smistamentoId: string
  pagine: number[]
}

/** La classe che il corpo della pagina porta mentre delle pagine sono in volo. */
export const CORPO_IN_VOLO = 'trascino-pagine'

/** La classe della casella sotto il puntatore, mentre ci si passa sopra. */
export const CASELLA_BERSAGLIO = 'cella-documento--bersaglio'

/** La classe della riga che sta per prendersi le pagine. */
export const RIGA_BERSAGLIO = 'tabella__riga--bersaglio'

/**
 * Il volo in corso: quali pagine, e se sono atterrate. Serve ad avvisare di un
 * rilascio mancato, che il browser annulla senza eventi. Sta fuori dallo stato
 * perché non cambia niente di quel che si vede.
 */
let inVolo: number[] | null = null
let inVoloDa: string | null = null
let atterrate = false
let rinunciato = false

/** Da quale PDF vengono le pagine in volo: i bersagli di `pageDrop.ts` lo chiedono qui. */
export function daDoveVola (): string | null {
  return inVoloDa
}

/** Le pagine in volo sono atterrate su un bersaglio: il rilascio non è mancato. */
export function segnaAtterrate (): void {
  atterrate = true
}

/** Esc mentre si trascina: rinuncia voluta, niente avviso di rilascio mancato. */
document.addEventListener('keydown', (evento: KeyboardEvent) => {
  if (inVolo && evento.key === 'Escape') rinunciato = true
})

/**
 * Pulizia di fine trascinamento, comunque finisca (fuori finestra, Esc…): una
 * casella rimasta accesa non si lascia premere.
 */
document.addEventListener('dragend', () => {
  document.body.classList.remove(CORPO_IN_VOLO)
  for (const acceso of document.querySelectorAll(`.${CASELLA_BERSAGLIO}, .${RIGA_BERSAGLIO}`)) {
    acceso.classList.remove(CASELLA_BERSAGLIO, RIGA_BERSAGLIO)
  }
  if (inVolo && !atterrate && !rinunciato) {
    notifica(testi().mancate(dicePagine(inVolo)), 'avviso')
  }
  inVolo = null
  inVoloDa = null
  atterrate = false
  rinunciato = false
})

/**
 * Da quale pagina è partita l'ultima scelta, per lo Shift; fuori dallo stato
 * perché non si vede. Porta l'id del PDF perché un numero di pagina da solo
 * varrebbe anche in un altro PDF.
 */
let ancora: { smistamentoId: string, pagina: number } | null = null

/** Le pagine scelte adesso in questo PDF; vuoto se la scelta è di un altro. */
function pagineScelte (smistamentoId: string): number[] {
  const scelta = stato.pagineScelte
  return scelta && scelta.smistamentoId === smistamentoId ? scelta.pagine : []
}

function scegli (smistamentoId: string, pagine: number[]): void {
  const ordinate = [...new Set(pagine)].sort((x, y) => x - y)
  aggiorna({ pagineScelte: ordinate.length > 0 ? { smistamentoId, pagine: ordinate } : null })
}

/** Il clic su una pagina: semplice sceglie questa, Ctrl aggiunge o toglie, Shift prende il tratto. */
function alClic (
  smistamento: Smistamento,
  pagina: number,
  evento: MouseEvent,
  archiviate: Map<number, string>,
): void {
  const adesso = pagineScelte(smistamento.id)

  if (evento.shiftKey && ancora !== null && ancora.smistamentoId === smistamento.id) {
    const da = Math.min(ancora.pagina, pagina)
    const a = Math.max(ancora.pagina, pagina)
    const tratto: number[] = []
    // Le pagine già archiviate restano fuori dal tratto: ritagliarle di nuovo
    // metterebbe lo stesso documento addosso a due persone.
    for (let n = da; n <= a; n += 1) {
      if (!archiviate.has(n)) tratto.push(n)
    }
    scegli(smistamento.id, evento.ctrlKey || evento.metaKey ? [...adesso, ...tratto] : tratto)
    return
  }

  ancora = { smistamentoId: smistamento.id, pagina }
  if (evento.ctrlKey || evento.metaKey) {
    scegli(
      smistamento.id,
      adesso.includes(pagina) ? adesso.filter((n) => n !== pagina) : [...adesso, pagina],
    )
    return
  }
  // Ripremere l'unica pagina scelta la lascia andare.
  scegli(smistamento.id, adesso.length === 1 && adesso[0] === pagina ? [] : [pagina])
}

/** Di chi sono già le pagine archiviate di questo PDF: pagina → nome. */
function giaArchiviate (smistamento: Smistamento, allievi: Allievo[]): Map<number, string> {
  const perId = new Map(allievi.map((a) => [a.id, a]))
  const chi = new Map<number, string>()
  const t = testi()
  for (const fetta of smistamento.assegnate) {
    const suo = perId.get(fetta.allievoId)
    // Il foglio firme riguarda tutta la colonna, non una persona.
    const chiEra = fetta.firme
      ? t.foglioFirme
      : suo
        ? // Per le assenze anche la casella: la stessa persona ne ha quattro.
        fetta.assenze
          ? `${nomeCompleto(suo)} · ${etichettaFoglio(fetta.assenze.tipo, fetta.assenze.firmato)}`
          : nomeCompleto(suo)
        : t.qualcuno
    for (let n = fetta.da; n <= fetta.a; n += 1) chi.set(n, chiEra)
  }
  return chi
}

/**
 * Le immagini che l'host ha già estratto dalla scansione: pagina → indirizzo.
 * Grezze (senza quel che il PDF ci disegna sopra) ma subito pronte: fanno da
 * prima risposta mentre pdfjs disegna la pagina vera.
 */
function anteprimeDellHost (smistamento: Smistamento): Map<number, string> {
  const fotografie = new Map<number, string>()
  for (const lettura of smistamento.letture) {
    const indirizzo = lettura.anteprima ? uriDato(lettura.anteprima) : null
    if (indirizzo) fotografie.set(lettura.numero, indirizzo)
  }
  return fotografie
}

/** Lo stato di ogni pagina di questo PDF nella coda di lettura, mostrato sul suo riquadro. */
function stanoLeggendo (smistamento: Smistamento): Map<number, 'in-coda' | 'in-corso'> {
  const stati = new Map<number, 'in-coda' | 'in-corso'>()
  for (const voce of stato.lavoro.coda) {
    if (voce.smistamentoId === smistamento.id) stati.set(voce.pagina, 'in-coda')
  }
  const corrente = stato.lavoro.corrente
  if (corrente && corrente.smistamentoId === smistamento.id) {
    stati.set(corrente.pagina, 'in-corso')
  }
  return stati
}

/** Com'è stata letta ogni pagina ancora attiva: pagina → la sua lettura. */
function letture (smistamento: Smistamento): Map<number, PaginaSmistamento> {
  return new Map(smistamento.letture.map((lettura) => [lettura.numero, lettura]))
}

/** Di chi il registro *crede* che siano: pagina → nome proposto dalla bozza. */
function proposte (smistamento: Smistamento, allievi: Allievo[]): Map<number, string> {
  const perId = new Map(allievi.map((a) => [a.id, a]))
  const chi = new Map<number, string>()
  for (const blocco of smistamento.blocchi) {
    const suo = blocco.allievoId ? perId.get(blocco.allievoId) : undefined
    if (!suo) continue
    for (let n = blocco.da; n <= blocco.a; n += 1) chi.set(n, nomeCompleto(suo))
  }
  return chi
}

/**
 * Il nome letto su una pagina: a chi la bozza la manda, dove sul foglio il nome
 * compare, e chi l'ha letto (testo del PDF, preciso, o OCR, dentro una striscia).
 */
interface NomeLetto {
  nome: string
  riquadro: RiquadroPagina
  /** `testo` sono le coordinate vere del PDF, `ocr` la striscia guardata. */
  fonte: 'testo' | 'ocr'
}

/**
 * I nomi letti, pagina per pagina: solo dove ci sono sia la proposta sia il
 * punto in cui il nome è stato letto; senza il punto non si disegna niente.
 */
function nomiLetti (
  smistamento: Smistamento,
  proposte: Map<number, string>,
): Map<number, NomeLetto> {
  const letti = new Map<number, NomeLetto>()
  for (const lettura of smistamento.letture) {
    const nome = proposte.get(lettura.numero)
    if (!nome || !lettura.riquadroNome) continue
    letti.set(lettura.numero, {
      nome,
      riquadro: lettura.riquadroNome,
      fonte: lettura.lettura === 'ocr' ? 'ocr' : 'testo',
    })
  }
  return letti
}

/**
 * Quanto prima di entrare in vista una pagina si comincia a disegnare: uno
 * schermo di anticipo, fra disegnare tutto subito e scorrere su riquadri vuoti.
 */
const ANTICIPO = '800px'

/**
 * La fotografia di una pagina, o il posto in cui comparirà. Il posto dice che si
 * sta disegnando, perché un riquadro vuoto si confonde con una pagina bianca.
 */
function fotografia (
  indirizzo: string,
  chiave: string,
  pagina: number,
  larghezza: number,
  ripiegoScritto: string | null,
  letto: NomeLetto | null,
): HTMLElement {
  const posto = h('div', { class: 'pagina-sfoglio__foto' })
  const t = testi()

  /**
   * Il rettangolo sul punto in cui il nome è stato letto, con il nome accanto
   * per confrontarlo con il foglio. Contorno pieno per il testo del PDF,
   * tratteggio per l'OCR (posizione approssimata). L'etichetta va sotto, o
   * sopra se il rettangolo è in fondo: la fotografia ritaglia quel che esce.
   */
  const segno = (): Figlio => {
    if (!letto) return null
    const { riquadro, fonte, nome } = letto
    const inFondo = riquadro.y + riquadro.altezza > 0.82
    // L'etichetta si appende dal bordo lontano da quello della pagina, perché la
    // fotografia ritaglia quel che esce.
    const aDestra = riquadro.x + riquadro.larghezza / 2 > 0.5
    return h(
      'span',
      {
        // testo-fisso: classi CSS
        class: [
          'pagina-sfoglio__nome',
          `pagina-sfoglio__nome--${fonte}`,
          inFondo && 'pagina-sfoglio__nome--sopra',
          aDestra && 'pagina-sfoglio__nome--destra',
        ],
        attr: {
          title:
            fonte === 'ocr' ? t.lettoOcr(nome) : t.lettoTesto(nome),
        },
        style: {
          left: `${riquadro.x * 100}%`,
          top: `${riquadro.y * 100}%`,
          width: `${riquadro.larghezza * 100}%`,
          height: `${riquadro.altezza * 100}%`,
        },
      },
      h('span', { class: 'pagina-sfoglio__nome-testo' }, nome),
    )
  }

  const mostra = (immagine: string | null, nitida: boolean) => {
    if (!immagine) {
      if (!nitida) return
      // Disegno fallito: lo si dice. La pagina resta trascinabile.
      posto.replaceChildren(
        h('span', { class: 'pagina-sfoglio__attesa' }, t.pagina(pagina)),
        h('span', { class: 'testo-quieto pagina-sfoglio__nota' }, t.nonDisegnabile),
      )
      return
    }
    const sopra = segno()
    posto.replaceChildren(
      h('img', { attr: { src: immagine, alt: t.pagina(pagina), draggable: 'false' } }),
    )
    if (sopra instanceof Node) posto.appendChild(sopra)
  }

  // Quella giusta c'è già: si mette e basta.
  const esatta = miniaturaAllaMisura(chiave, pagina, larghezza)
  if (esatta) {
    mostra(esatta, true)
    return posto
  }

  // Altrimenti si mostra subito quel che c'è (la pagina a un'altra misura o
  // l'immagine dell'host, sgranate) e si chiede comunque quella giusta.
  const ripiego = miniaturaPronta(chiave, pagina, larghezza) ?? ripiegoScritto
  if (ripiego) {
    mostra(ripiego, false)
  } else {
    posto.appendChild(h('span', { class: 'pagina-sfoglio__attesa' }, String(pagina)))
    posto.appendChild(h('span', { class: 'testo-quieto pagina-sfoglio__nota' }, t.disegnando))
  }

  // Una vedetta sola per tutte le pagine, non una per riquadro: vedi
  // `guardaQuando`.
  guardaQuando(posto, () => {
    // Un ridisegno può aver già sostituito il riquadro: lo si riempie solo se è
    // ancora in pagina; la fotografia resta in memoria per il riquadro nuovo.
    void miniatura(indirizzo, chiave, pagina, larghezza).then((immagine) => {
      if (posto.isConnected) mostra(immagine, true)
    })
  })
  return posto
}

/**
 * Un solo `IntersectionObserver` per tutti i riquadri: quando una pagina entra
 * in vista si esegue il suo compito e la si smette di guardare.
 */
const daGuardare = new WeakMap<Element, () => void>()
let vedetta: IntersectionObserver | null = null

function guardaQuando (elemento: Element, compito: () => void): void {
  vedetta ??= new IntersectionObserver(
    (voci) => {
      for (const voce of voci) {
        if (!voce.isIntersecting) continue
        const suo = daGuardare.get(voce.target)
        daGuardare.delete(voce.target)
        vedetta?.unobserve(voce.target)
        suo?.()
      }
    },
    { rootMargin: ANTICIPO },
  )
  daGuardare.set(elemento, compito)
  vedetta.observe(elemento)
}

/**
 * Lascia andare tutto quel che si stava guardando, all'inizio di ogni disegno.
 * `IntersectionObserver` trattiene i nodi osservati anche quando il ridisegno
 * li toglie dal documento; senza questo si accumulano. I riquadri ancora in
 * pagina si riguardano subito dopo; `daGuardare` è una mappa debole.
 */
function smettiDiGuardare (): void {
  vedetta?.disconnect()
}

/**
 * L'immagine che segue il puntatore mentre si trascina: la pagina con il numero
 * di quante ne arrivano, invece del riquadro intero. L'elemento dev'essere nel
 * documento quando lo si consegna, e poi sparire: il browser ne fa una copia.
 */
function fantasma (evento: DragEvent, riquadro: HTMLElement, quante: number): void {
  const foto = riquadro.querySelector('img')
  if (!foto || !evento.dataTransfer) return

  const copia = h(
    'div',
    { class: 'pagina-fantasma' },
    h('img', { attr: { src: foto.getAttribute('src') ?? '', alt: '' } }),
    quante > 1 ? h('span', { class: 'pagina-fantasma__conto' }, String(quante)) : null,
  )
  document.body.appendChild(copia)
  evento.dataTransfer.setDragImage(copia, 30, 20)
  // Tolta al primo giro di eventi: prima il browser deve averla fotografata.
  setTimeout(() => copia.remove(), 0)
}

/**
 * Quel che si sa di una pagina, in una sola pastiglia. Ordine di precedenza:
 * archiviata, poi quel che la macchina sta facendo, poi quel che ha letto;
 * distingue una scansione non ancora letta da una letta senza nomi trovati.
 */
function etichettaPagina (quel: {
  archiviata: string | undefined
  lettura: 'in-coda' | 'in-corso' | undefined
  letto: NomeLetto | undefined
  proposta: string | undefined
  letta: PaginaSmistamento | undefined
}): Figlio {
  const t = testi()
  if (quel.archiviata) return pastiglia(quel.archiviata, 'positivo', 'spunta')
  if (quel.lettura === 'in-corso') return pastiglia(t.leggendo, 'informativo', 'ricarica')
  if (quel.lettura === 'in-coda') return pastiglia(t.inCoda, 'neutro', 'ricarica')
  // Il simbolo dice da dove viene il nome: lente = lettura automatica, foglio =
  // testo del PDF. Nessun simbolo se il nome è dedotto dal taglio («due pagine a
  // testa»): lì non c'è una lettura da controllare.
  if (quel.proposta) {
    const fonte = quel.letto?.fonte
    const simbolo = fonte === 'ocr' ? 'lente' : fonte === 'testo' ? 'documento' : undefined
    return pastiglia(quel.proposta, 'informativo', simbolo)
  }
  if (quel.letta?.lettura === 'niente') return pastiglia(t.daLeggere, 'attenzione', 'avviso')
  return pastiglia(t.nessunNome, 'quiete')
}

/** La riga al passaggio del puntatore: di chi è la pagina, da dove viene il nome e le prime parole lette. */
function spiegaPagina (
  pagina: number,
  quel: {
    archiviata: string | undefined
    letto: NomeLetto | undefined
    proposta: string | undefined
    letta: PaginaSmistamento | undefined
  },
): string {
  const t = testi()
  if (quel.archiviata) return t.giaArchiviata(pagina, quel.archiviata)

  const righe = [t.pagina(pagina)]
  if (quel.proposta) {
    const come =
      quel.letto?.fonte === 'ocr'
        ? t.daOcr
        : quel.letto
          ? t.daTesto
          : t.dalTaglio
    righe.push(t.ciLegge(quel.proposta, come))
  } else if (quel.letta?.lettura === 'niente') {
    righe.push(t.senzaTesto)
  } else {
    righe.push(t.nessunNomeClasse)
  }

  const testo = (quel.letta?.testo ?? '').replace(/\s+/g, ' ').trim()
  if (testo) righe.push(`«${testo.slice(0, 120)}${testo.length > 120 ? '…' : ''}»`)
  righe.push(t.trascinala)
  return righe.join('\n')
}

/** Una pagina nello sfoglio: la sua fotografia, il suo numero, e quel che se ne sa. */
function riquadroPagina (
  smistamento: Smistamento,
  pagina: number,
  contesto: {
    indirizzo: string
    chiave: string
    scelte: number[]
    archiviate: Map<number, string>
    proposte: Map<number, string>
    anteprime: Map<number, string>
    nomi: Map<number, NomeLetto>
    lette: Map<number, PaginaSmistamento>
    lettura: Map<number, 'in-coda' | 'in-corso'>
    richieste: Consegna[]
    allievi: Allievo[]
    zoom: number
  },
): HTMLElement {
  const quel = {
    archiviata: contesto.archiviate.get(pagina),
    proposta: contesto.proposte.get(pagina),
    letto: contesto.nomi.get(pagina),
    letta: contesto.lette.get(pagina),
    lettura: contesto.lettura.get(pagina),
  }
  const { archiviata, lettura } = quel
  const presa = contesto.scelte.includes(pagina)

  const riquadro = h(
    'li',
    {
      class: [
        'pagina-sfoglio',
        presa && 'pagina-sfoglio--scelta',
        archiviata && 'pagina-sfoglio--archiviata',
        lettura === 'in-corso' && 'pagina-sfoglio--in-lettura',
      ],
      attr: {
        role: 'option',
        'aria-selected': String(presa),
        title: spiegaPagina(pagina, quel),
      },
      // Una pagina già archiviata non si prende: finirebbe due volte nel fascicolo.
      draggable: !archiviata,
    },
    fotografia(
      contesto.indirizzo,
      contesto.chiave,
      pagina,
      contesto.zoom,
      contesto.anteprime.get(pagina) ?? null,
      quel.letto ?? null,
    ),
    h(
      'div',
      { class: 'pagina-sfoglio__riga' },
      h('span', { class: 'pagina-sfoglio__numero' }, String(pagina)),
      etichettaPagina(quel),
    ),
    lettura === 'in-corso' ? h('div', { class: 'barra-lavoro' }, h('span', null)) : null,
  )

  riquadro.addEventListener('contextmenu', (evento: MouseEvent) =>
    menuDellaPagina(evento, smistamento, pagina, contesto),
  )

  if (archiviata) return riquadro

  riquadro.addEventListener('click', (evento) =>
    alClic(smistamento, pagina, evento, contesto.archiviate),
  )
  riquadro.addEventListener('dragstart', (evento: DragEvent) => {
    // Trascinare una pagina fuori dalla scelta porta solo quella, come in ogni elenco.
    // La scelta non si aggiorna qui: ridisegnerebbe la vista togliendo l'elemento
    // appena preso, e Chromium annullerebbe il trascinamento.
    const scelte = pagineScelte(smistamento.id)
    const scelteInVolo = scelte.includes(pagina) ? scelte : [pagina]
    inVolo = scelteInVolo
    inVoloDa = smistamento.id
    atterrate = false
    rinunciato = false

    const carico: PagineTrascinate = { smistamentoId: smistamento.id, pagine: scelteInVolo }
    evento.dataTransfer?.setData(TIPO_PAGINE, JSON.stringify(carico))
    // Sotto il puntatore va la pagina che si porta, non il riquadro.
    fantasma(evento, riquadro, scelteInVolo.length)
    // Anche in `text/plain`: rilasciate in un campo di testo, lasciano una frase leggibile.
    evento.dataTransfer?.setData('text/plain', `${smistamento.nome}: ${dicePagine(scelteInVolo)}`)
    if (evento.dataTransfer) evento.dataTransfer.effectAllowed = 'copy'
    document.body.classList.add(CORPO_IN_VOLO)
  })
  riquadro.addEventListener('dragend', () => document.body.classList.remove(CORPO_IN_VOLO))
  return riquadro
}

// -------------------------------------------------------- il tasto destro

/**
 * Su quali pagine agisce un gesto fatto su questa: la scelta se la contiene,
 * altrimenti questa da sola.
 */
function suQuali (smistamento: Smistamento, pagina: number): number[] {
  const scelte = pagineScelte(smistamento.id)
  return scelte.includes(pagina) ? scelte : [pagina]
}

/** Chiede a chi vanno queste pagine e in quale documento: la via senza trascinamento. */
function assegnaChiedendo (
  smistamento: Smistamento,
  pagine: number[],
  allievi: Allievo[],
  richieste: Consegna[],
): void {
  const t = testi()
  if (allievi.length === 0 || richieste.length === 0) {
    notifica(allievi.length === 0 ? t.nessunoInClasse : t.nessunDocumento, 'avviso')
    return
  }

  apriModale({
    titolo: t.aChi(dicePagine(pagine)),
    sottotitolo: smistamento.nome,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'allievoId',
          etichetta: t.persona,
          tipo: 'select',
          valore: allievi[0]?.id ?? '',
          opzioni: allievi.map((allievo) => ({ valore: allievo.id, testo: nomeCompleto(allievo) })),
        }),
        campo({
          nome: 'consegnaId',
          etichetta: Uno(lessico().documento),
          tipo: 'select',
          valore: smistamento.consegnaId ?? richieste[0]?.id ?? '',
          opzioni: richieste.map((consegna) => ({ valore: consegna.id, testo: consegna.testo })),
        }),
      ),
    testoSalva: t.archivia,
    alSalva: (valori, contesto) => {
      const allievoId = String(valori.allievoId ?? '')
      const consegnaId = String(valori.consegnaId ?? '')
      if (!allievoId || !consegnaId) {
        notifica(t.servono, 'avviso')
        return
      }
      contesto.chiudi()
      void azione({
        tipo: 'smistamento.assegnaPagine',
        smistamentoId: smistamento.id,
        consegnaId,
        allievoId,
        pagine,
      }).then((risposta) => {
        if (risposta.ok) aggiorna({ pagineScelte: null })
      })
    },
  })
}

/**
 * Butta via le pagine scelte, dopo averlo chiesto: non si torna indietro
 * (`smistamento.scartaPagine`, poi `chiudiSeFinito` può togliere il PDF) e
 * «riprendi» recupera solo le pagine assegnate.
 */
async function scartaChiedendo (smistamento: Smistamento, pagine: number[]): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.buttareTitolo(dicePagine(pagine)),
    testo: t.buttareTesto(dicePagine(pagine), smistamento.nome),
    testoConferma: parole().buttaVia,
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({
    tipo: 'smistamento.scartaPagine',
    smistamentoId: smistamento.id,
    pagine,
  })
  if (risposta.ok) aggiorna({ pagineScelte: null })
}

function menuDellaPagina (
  evento: MouseEvent,
  smistamento: Smistamento,
  pagina: number,
  contesto: {
    archiviate: Map<number, string>
    proposte: Map<number, string>
    richieste: Consegna[]
    allievi: Allievo[]
  },
): void {
  const archiviata = contesto.archiviate.get(pagina)
  const t = testi()

  if (archiviata) {
    menuContestuale(evento, [
      { titolo: t.archiviataPer(pagina, archiviata) },
      {
        testo: t.riprendila,
        simbolo: 'ricarica',
        titolo: t.riprendilaTitolo,
        al: () =>
          void azione({
            tipo: 'smistamento.riprendiPagine',
            smistamentoId: smistamento.id,
            pagine: [pagina],
          }),
      },
      'separatore',
      {
        testo: t.aprilaNelLettore,
        simbolo: 'esporta',
        al: () =>
          void azione({
            tipo: 'smistamento.apriPagine',
            smistamentoId: smistamento.id,
            pagine: [pagina],
          }),
      },
    ])
    return
  }

  const pagine = suQuali(smistamento, pagina)
  const proposta = contesto.proposte.get(pagina)

  const voci: ElementoMenu[] = [
    { titolo: dicePagine(pagine) + (proposta ? t.ciLeggeCoda(proposta) : '') },
    // «Assegna a…» serve solo con documenti aperti: nella matrice delle assenze la
    // casella la sceglie il rilascio, e al posto della voce si dice come si fa.
    ...(contesto.richieste.length > 0
      ? [
          {
            testo: t.assegnaA,
            simbolo: 'utente' as const,
            titolo: t.assegnaTitolo,
            al: () => assegnaChiedendo(smistamento, pagine, contesto.allievi, contesto.richieste),
          },
        ]
      : [{ titolo: t.perArchiviarle }]),
    stato.ocrAttivo
      ? {
          testo: pagine.length === 1 ? t.rileggiScansione : t.rileggiPagine(pagine.length),
          simbolo: 'ricarica',
          titolo: t.rileggiTitolo,
          al: () =>
            void azione({
              tipo: 'smistamento.leggiPagine',
              smistamentoId: smistamento.id,
              pagine,
            }),
        }
      : {
          testo: t.letturaSpenta,
          simbolo: 'impostazioni',
          titolo: t.apreImpostazioni('registroDocenti.ocr.attivo'),
          al: () => void azione({ tipo: 'smistamento.impostazioni' }),
        },
    {
      testo: t.apriNelLettore,
      simbolo: 'esporta',
      titolo: t.soloQueste,
      al: () =>
        void azione({ tipo: 'smistamento.apriPagine', smistamentoId: smistamento.id, pagine }),
    },
    'separatore',
    {
      testo: parole().buttaVia,
      simbolo: 'cestino',
      pericolo: true,
      titolo: t.diNessuno,
      al: () => void scartaChiedendo(smistamento, pagine),
    },
  ]

  menuContestuale(evento, voci)
}

// ----------------------------------------------------------------- lo zoom

/** La misura scelta adesso, riportata su uno degli scalini. */
function misuraZoom (): number {
  const chiesta = stato.zoomSfoglio || ZOOM_PREDEFINITO
  return MISURE_SFOGLIO.includes(chiesta)
    ? chiesta
    : MISURE_SFOGLIO.find((misura) => misura >= chiesta) ??
      MISURE_SFOGLIO[MISURE_SFOGLIO.length - 1]
}

/** Le colonne della griglia a quella misura: quante ce ne stanno, ce ne stanno. */
function colonneDi (misura: number): string {
  // testo-fisso: una regola della griglia CSS
  return `repeat(auto-fill, minmax(${misura}px, 1fr))`
}

/**
 * Il cursore che ingrandisce le pagine. Mentre lo si trascina cambia solo la
 * griglia (le fotografie si allargano sgranate); la misura va nello stato al
 * rilascio, che ridisegna le pagine nitide.
 */
function cursoreZoom (griglia: HTMLElement): Figlio {
  const indice = Math.max(0, MISURE_SFOGLIO.indexOf(misuraZoom()))
  const t = testi()

  const cursore = h('input', {
    class: 'sfoglio__zoom',
    dataset: { fuoco: 'sfoglio-zoom' },
    attr: {
      type: 'range',
      min: '0',
      max: String(MISURE_SFOGLIO.length - 1),
      step: '1',
      value: String(indice),
      title: t.quantoGrandi,
      'aria-label': t.misura,
    },
    oninput: (evento: Event) => {
      const misura = MISURE_SFOGLIO[Number((evento.currentTarget as HTMLInputElement).value)]
      if (misura) griglia.style.gridTemplateColumns = colonneDi(misura)
    },
    onchange: (evento: Event) => {
      const misura = MISURE_SFOGLIO[Number((evento.currentTarget as HTMLInputElement).value)]
      if (misura) aggiorna({ zoomSfoglio: misura })
    },
  })

  return h(
    'span',
    { class: 'sfoglio__zoom-gruppo', attr: { title: t.quantoGrandi } },
    icona('lente', 'icona--minuta'),
    cursore,
  )
}

/**
 * Lo sfoglio: la testata con la scelta, e sotto le pagine. Le archiviate restano
 * al loro posto, spente, così la pagina 7 del PDF è la settima dell'elenco.
 */
export function sfoglioSmistamento (opzioni: {
  smistamento: Smistamento
  allievi: Allievo[]
  richieste: Consegna[]
  indirizzo: string
  chiave: string
  /**
   * La coda di lettura, disegnata dal chiamante: questo modulo non sa di OCR.
   */
  coda?: Figlio
}): Figlio {
  const { smistamento, allievi, richieste, indirizzo, chiave } = opzioni
  // L'indirizzo dei caratteri standard arriva con lo stato, quindi può mancare al
  // primo disegno: lo si ridice a ogni ridisegno.
  if (stato.radiceApp) impostaCaratteri(stato.radiceApp)
  // Prima di costruire i riquadri nuovi: la vedetta tratterrebbe in vita quelli vecchi.
  smettiDiGuardare()
  const scelte = pagineScelte(smistamento.id)
  const zoom = misuraZoom()
  const suggerite = proposte(smistamento, allievi)
  const contesto = {
    indirizzo,
    chiave,
    scelte,
    archiviate: giaArchiviate(smistamento, allievi),
    proposte: suggerite,
    anteprime: anteprimeDellHost(smistamento),
    nomi: nomiLetti(smistamento, suggerite),
    lette: letture(smistamento),
    lettura: stanoLeggendo(smistamento),
    richieste,
    allievi,
    zoom,
  }

  // Le pagine archiviate escono dall'elenco; l'interruttore le rimette in fila
  // per riprendere quella finita sulla riga sbagliata.
  const pagine: HTMLElement[] = []
  for (let n = 1; n <= smistamento.pagine; n += 1) {
    if (contesto.archiviate.has(n) && !stato.mostraArchiviate) continue
    pagine.push(riquadroPagina(smistamento, n, contesto))
  }

  const griglia = h(
    'ul',
    {
      class: 'sfoglio__pagine',
      style: { gridTemplateColumns: colonneDi(zoom) },
      // Lo scorrimento resta dov'era fra un ridisegno e l'altro; la chiave porta l'id
      // del PDF, così un altro PDF riparte dall'alto.
      // testo-fisso: la chiave dello scorrimento
      dataset: { scorrimento: `sfoglio:${smistamento.id}` },
      attr: { role: 'listbox', 'aria-multiselectable': 'true' },
    },
    ...pagine,
  )
  const t = testi()

  return h(
    'div',
    { class: 'sfoglio' },
    h(
      'div',
      { class: 'sfoglio__testa' },
      scelte.length > 0
        ? h(
            'span',
            { class: 'sfoglio__scelte' },
            pastiglia(dicePagine(scelte), 'informativo', 'documento'),
            h(
              'span',
              { class: 'testo-quieto' },
              t.trascinaleScelte,
            ),
          )
        : h(
            'span',
            { class: 'testo-quieto' },
            t.premiPagina,
          ),
      scelte.length > 0
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: t.buttaScelte(dicePagine(scelte)),
            al: () => void scartaChiedendo(smistamento, scelte),
          })
        : null,
      scelte.length > 0
        ? pulsante({
            testo: t.lascia,
            simbolo: 'chiudi',
            variante: 'fantasma',
            titolo: t.lasciaTitolo,
            al: () => aggiorna({ pagineScelte: null }),
          })
        : null,
      interruttoreArchiviate(contesto.archiviate.size),
      cursoreZoom(griglia),
    ),
    opzioni.coda ?? null,
    pagine.length === 0
      ? h(
          'p',
          { class: 'testo-quieto sfoglio__finito' },
          contesto.archiviate.size > 0
            ? t.tutteArchiviate
            : t.nessunaDaSmistare,
        )
      : null,
    griglia,
  )
}

/** L'interruttore delle pagine archiviate, con il conto; assente se non ce n'è. */
function interruttoreArchiviate (quante: number): Figlio {
  if (quante === 0) return null
  const t = testi()
  return pulsante({
    testo: stato.mostraArchiviate
      ? quante === 1
        ? t.nascondiArchiviata
        : t.nascondiArchiviate(quante)
      : t.archiviate(quante),
    simbolo: stato.mostraArchiviate ? 'chiudi' : 'spunta',
    variante: stato.mostraArchiviate ? 'sottile' : 'fantasma',
    titolo: stato.mostraArchiviate
      ? t.tornaSole
      : t.rimetteInFila,
    al: () => aggiorna({ mostraArchiviate: !stato.mostraArchiviate }),
  })
}
