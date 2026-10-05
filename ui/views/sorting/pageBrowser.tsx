// Lo sfoglio di un PDF da dividere: le pagine si scelgono (anche non
// consecutive) e si trascinano sulla casella persona × documento, che le
// ritaglia e archivia come la divisione a mano, rifiutando una casella piena.
// Se il PDF sa già a quale documento appartiene basta la riga della persona;
// la casella resta mirabile per archiviare in un'altra colonna.
// Le pagine scelte stanno nello stato e non nel componente perché la vista si
// ridisegna a ogni battito. Le miniature le fa `components/thumbnails.tsx`.
//
// Lo sfoglio è un'isola (`island.tsx`): scegliere una pagina, cambiare lo zoom o
// una pagina letta dalla coda rifanno lei sola. I riquadri hanno per chiave la
// pagina: restano gli stessi elementi fra un disegno e l'altro, perché Chromium
// annulla il trascinamento di un elemento tolto dal documento.

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type DragEvent as EventoTrascina,
  type MouseEvent as EventoMouse,
  type ReactElement,
  type ReactNode,
} from 'react'

import { etichettaFoglio } from '#core/dominio/absences.js'
import { nomeCompleto } from '#core/dominio/calculations.js'
import { dicePagine } from '#core/dominio/sorting.js'
import type {
  Allievo,
  Consegna,
  PaginaSmistamento,
  RiquadroPagina,
  Smistamento,
} from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Campo, Pastiglia, Pulsante } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { Miniatura, impostaCaratteri } from '#ui/components/thumbnails.js'
import { menuContestuale, type ElementoMenu } from '#ui/components/menu.js'
import { notifica } from '#ui/components/notifications.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import { Isola } from '#ui/island.js'
import { ridisegnaIsola } from '#ui/islands.js'
import { MISURE_SFOGLIO, ZOOM_PREDEFINITO, aggiorna, ricorda, stato, uriDato } from '#ui/state.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { Uno } from '#core/dominio/lexicon.js'
import { parole } from '#core/dominio/words.testi.js'
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

/**
 * L'isola di quel che mostra la lettura delle scansioni (`stato.lavoro`): la
 * coda, i gesti sul PDF, i riquadri in lettura. `main.tsx` rifà lei sola a ogni
 * pagina letta, invece della pagina intera.
 */
export const ISOLA_LETTURA = 'coda-lettura'

/** L'isola dello sfoglio di un PDF: testata con la scelta, e le pagine. */
function isolaSfoglio (smistamentoId: string): string {
  // testo-fisso: la chiave di un'isola
  return `sfoglio:${smistamentoId}`
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

/** Da quale PDF vengono le pagine in volo: i bersagli di `pageDrop.tsx` lo chiedono qui. */
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

/**
 * Cambia la scelta e rifà solo lo sfoglio. Diretta e non da `aggiorna`, come
 * `inverti` di `people.ts`: la scelta si vede solo qui, non si ricorda, e un
 * clic su una pagina non deve rifare la pagina intera. Scritta subito nello
 * stato, così un secondo clic nello stesso giro parte dalla scelta nuova.
 */
function scegli (smistamentoId: string, pagine: number[]): void {
  const ordinate = [...new Set(pagine)].sort((x, y) => x - y)
  stato.pagineScelte = ordinate.length > 0 ? { smistamentoId, pagine: ordinate } : null
  ridisegnaIsola(isolaSfoglio(smistamentoId))
}

/** Il clic su una pagina: semplice sceglie questa, Ctrl aggiunge o toglie, Shift prende il tratto. */
function alClic (
  smistamento: Smistamento,
  pagina: number,
  evento: { shiftKey: boolean, ctrlKey: boolean, metaKey: boolean },
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
 * Il rettangolo sul punto in cui il nome è stato letto, con il nome accanto
 * per confrontarlo con il foglio. Contorno pieno per il testo del PDF,
 * tratteggio per l'OCR (posizione approssimata). L'etichetta va sotto, o
 * sopra se il rettangolo è in fondo: la fotografia ritaglia quel che esce.
 */
function segnoDelNome (letto: NomeLetto | null): ReactNode {
  if (!letto) return null
  const t = testi()
  const { riquadro, fonte, nome } = letto
  const inFondo = riquadro.y + riquadro.altezza > 0.82
  // L'etichetta si appende dal bordo lontano da quello della pagina, perché la
  // fotografia ritaglia quel che esce.
  const aDestra = riquadro.x + riquadro.larghezza / 2 > 0.5
  const posto: CSSProperties = {
    left: `${riquadro.x * 100}%`,
    top: `${riquadro.y * 100}%`,
    width: `${riquadro.larghezza * 100}%`,
    height: `${riquadro.altezza * 100}%`,
  }
  return (
    <span
      // testo-fisso: classi CSS
      className={classi(
        'pagina-sfoglio__nome',
        `pagina-sfoglio__nome--${fonte}`,
        inFondo && 'pagina-sfoglio__nome--sopra',
        aDestra && 'pagina-sfoglio__nome--destra',
      )}
      title={fonte === 'ocr' ? t.lettoOcr(nome) : t.lettoTesto(nome)}
      style={posto}
    >
      <span className="pagina-sfoglio__nome-testo">{nome}</span>
    </span>
  )
}

/**
 * L'immagine che segue il puntatore mentre si trascina: la pagina con il numero
 * di quante ne arrivano, invece del riquadro intero. L'elemento dev'essere nel
 * documento quando lo si consegna, e poi sparire: il browser ne fa una copia.
 * Fuori da React: vive un giro di eventi, e nessun disegno lo riguarda.
 */
function fantasma (evento: EventoTrascina<HTMLElement>, quante: number): void {
  const foto = evento.currentTarget.querySelector('img')
  if (!foto) return

  const copia = document.createElement('div')
  copia.className = 'pagina-fantasma'
  const immagine = document.createElement('img')
  immagine.setAttribute('src', foto.getAttribute('src') ?? '')
  immagine.setAttribute('alt', '')
  copia.appendChild(immagine)
  if (quante > 1) {
    const conto = document.createElement('span')
    conto.className = 'pagina-fantasma__conto'
    conto.textContent = String(quante)
    copia.appendChild(conto)
  }
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
}): ReactElement {
  const t = testi()
  if (quel.archiviata) return <Pastiglia testo={quel.archiviata} tono="positivo" simbolo="spunta" />
  if (quel.lettura === 'in-corso') return <Pastiglia testo={t.leggendo} tono="informativo" simbolo="ricarica" />
  if (quel.lettura === 'in-coda') return <Pastiglia testo={t.inCoda} tono="neutro" simbolo="ricarica" />
  // Il simbolo dice da dove viene il nome: lente = lettura automatica, foglio =
  // testo del PDF. Nessun simbolo se il nome è dedotto dal taglio («due pagine a
  // testa»): lì non c'è una lettura da controllare.
  if (quel.proposta) {
    const fonte = quel.letto?.fonte
    const simbolo = fonte === 'ocr' ? 'lente' : fonte === 'testo' ? 'documento' : undefined
    return <Pastiglia testo={quel.proposta} tono="informativo" simbolo={simbolo} />
  }
  if (quel.letta?.lettura === 'niente') return <Pastiglia testo={t.daLeggere} tono="attenzione" simbolo="avviso" />
  return <Pastiglia testo={t.nessunNome} tono="quiete" />
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

/** Quel che lo sfoglio sa, calcolato una volta per disegno e letto da ogni riquadro. */
interface ContestoSfoglio {
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
}

/** Una pagina nello sfoglio: la sua fotografia, il suo numero, e quel che se ne sa. */
function riquadroPagina (
  smistamento: Smistamento,
  pagina: number,
  contesto: ContestoSfoglio,
): ReactElement {
  const quel = {
    archiviata: contesto.archiviate.get(pagina),
    proposta: contesto.proposte.get(pagina),
    letto: contesto.nomi.get(pagina),
    letta: contesto.lette.get(pagina),
    lettura: contesto.lettura.get(pagina),
  }
  const { archiviata, lettura } = quel
  const presa = contesto.scelte.includes(pagina)
  const smistamentoId = smistamento.id
  // La chiave tiene il riquadro fra un disegno e l'altro: la scelta, la lettura e
  // l'archiviazione cambiano solo classi, attributi e gestori. Con «mostra
  // archiviate» acceso, una chiave che cambiasse archiviando rifarebbe il
  // riquadro, e la miniatura lampeggerebbe ricaricandosi.
  // testo-fisso: la chiave del riquadro e del telaio
  const chiave = `pagina:${pagina}`

  const alTrascinare = (evento: EventoTrascina<HTMLLIElement>) => {
    // Trascinare una pagina fuori dalla scelta porta solo quella, come in ogni elenco.
    // La scelta non si aggiorna qui: ridisegnerebbe la vista mentre il browser
    // prende l'elemento, e Chromium annullerebbe il trascinamento.
    const scelte = pagineScelte(smistamentoId)
    const scelteInVolo = scelte.includes(pagina) ? scelte : [pagina]
    inVolo = scelteInVolo
    inVoloDa = smistamentoId
    atterrate = false
    rinunciato = false

    const carico: PagineTrascinate = { smistamentoId, pagine: scelteInVolo }
    evento.dataTransfer.setData(TIPO_PAGINE, JSON.stringify(carico))
    // Sotto il puntatore va la pagina che si porta, non il riquadro.
    fantasma(evento, scelteInVolo.length)
    // Anche in `text/plain`: rilasciate in un campo di testo, lasciano una frase leggibile.
    evento.dataTransfer.setData('text/plain', `${smistamento.nome}: ${dicePagine(scelteInVolo)}`)
    evento.dataTransfer.effectAllowed = 'copy'
    document.body.classList.add(CORPO_IN_VOLO)
  }

  return (
    <li
      key={chiave}
      className={classi(
        'pagina-sfoglio',
        presa && 'pagina-sfoglio--scelta',
        archiviata && 'pagina-sfoglio--archiviata',
        lettura === 'in-corso' && 'pagina-sfoglio--in-lettura',
      )}
      data-telaio={chiave}
      role="option"
      aria-selected={presa}
      title={spiegaPagina(pagina, quel)}
      // Una pagina già archiviata non si prende: finirebbe due volte nel fascicolo.
      draggable={!archiviata}
      onContextMenu={(evento) => menuDellaPagina(evento.nativeEvent, smistamento, pagina, contesto)}
      onClick={archiviata
        ? undefined
        : (evento: EventoMouse<HTMLLIElement>) => alClic(smistamento, pagina, evento, contesto.archiviate)}
      onDragStart={archiviata ? undefined : alTrascinare}
      // Sempre, anche da archiviata: la pagina portata può archiviarsi mentre vola,
      // e il corpo resterebbe segnato in volo.
      onDragEnd={() => document.body.classList.remove(CORPO_IN_VOLO)}
    >
      <Miniatura
        indirizzo={contesto.indirizzo}
        chiave={contesto.chiave}
        pagina={pagina}
        larghezza={contesto.zoom}
        ripiego={contesto.anteprime.get(pagina) ?? null}
      >
        {segnoDelNome(quel.letto ?? null)}
      </Miniatura>
      <div className="pagina-sfoglio__riga">
        <span className="pagina-sfoglio__numero">{String(pagina)}</span>
        {etichettaPagina(quel)}
      </div>
      {lettura === 'in-corso' ? <div className="barra-lavoro"><span /></div> : null}
    </li>
  )
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
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="allievoId"
          etichetta={t.persona}
          tipo="select"
          valore={allievi[0]?.id ?? ''}
          opzioni={allievi.map((allievo) => ({ valore: allievo.id, testo: nomeCompleto(allievo) }))}
        />
        <Campo
          nome="consegnaId"
          etichetta={Uno(lessico().documento)}
          tipo="select"
          valore={smistamento.consegnaId ?? richieste[0]?.id ?? ''}
          opzioni={richieste.map((consegna) => ({ valore: consegna.id, testo: consegna.testo }))}
        />
      </div>
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
 * griglia (le fotografie si allargano sgranate); al rilascio la misura va
 * nello stato e si ricorda, e si rifà lo sfoglio con le pagine nitide.
 */
function cursoreZoom (smistamentoId: string, griglia: { current: HTMLUListElement | null }): ReactElement {
  const indice = Math.max(0, MISURE_SFOGLIO.indexOf(misuraZoom()))
  const t = testi()

  return (
    <span className="sfoglio__zoom-gruppo" title={t.quantoGrandi}>
      <Icona nome="lente" classe="icona--minuta" />
      <Input
        className="sfoglio__zoom"
        data-fuoco="sfoglio-zoom"
        type="range"
        min="0"
        max={String(MISURE_SFOGLIO.length - 1)}
        step="1"
        valore={String(indice)}
        title={t.quantoGrandi}
        aria-label={t.misura}
        onInput={(evento) => {
          const misura = MISURE_SFOGLIO[Number(evento.currentTarget.value)]
          if (misura && griglia.current) griglia.current.style.gridTemplateColumns = colonneDi(misura)
        }}
        onCambio={(evento) => {
          const misura = MISURE_SFOGLIO[Number((evento.currentTarget as HTMLInputElement).value)]
          if (!misura || misura === stato.zoomSfoglio) return
          // Diretto e non da `aggiorna`, come la scelta: cambia solo lo sfoglio. È una
          // preferenza, quindi `ricorda`.
          stato.zoomSfoglio = misura
          ricorda()
          ridisegnaIsola(isolaSfoglio(smistamentoId))
        }}
      />
    </span>
  )
}

/** Quel che serve per disegnare lo sfoglio di un PDF. */
interface OpzioniSfoglio {
  smistamento: Smistamento
  allievi: Allievo[]
  richieste: Consegna[]
  indirizzo: string
  chiave: string
  /**
   * La coda di lettura, disegnata dal chiamante: questo modulo non sa di OCR.
   * Una funzione e non un nodo: l'isola la ridisegna ogni volta.
   */
  coda?: () => ReactNode
}

/**
 * Lo sfoglio: la testata con la scelta, e sotto le pagine. Le archiviate restano
 * al loro posto, spente, così la pagina 7 del PDF è la settima dell'elenco.
 * È un'isola: scelta e zoom rifanno lei sola. `display: contents` perché il
 * contenitore dell'isola non si metta fra lo sfoglio e la colonna della cornice.
 */
export function sfoglioSmistamento (opzioni: OpzioniSfoglio): ReactElement {
  return (
    <Isola
      chiave={isolaSfoglio(opzioni.smistamento.id)}
      // Un altro PDF è un altro sfoglio: riquadri e scorrimento ripartono da capo.
      disegna={() => <Sfoglio key={opzioni.smistamento.id} {...opzioni} />}
      style={{ display: 'contents' }}
      // testo-fisso: la chiave del telaio
      data-telaio="isola-sfoglio"
    />
  )
}

function Sfoglio (opzioni: OpzioniSfoglio): ReactElement {
  const { smistamento, allievi, richieste, indirizzo, chiave } = opzioni
  const griglia = useRef<HTMLUListElement | null>(null)
  // L'indirizzo dei caratteri standard arriva con lo stato, quindi può mancare al
  // primo disegno: lo si ridice a ogni disegno, prima che le miniature chiedano.
  useLayoutEffect(() => {
    if (stato.radiceApp) impostaCaratteri(stato.radiceApp)
  })

  const scelte = pagineScelte(smistamento.id)
  const zoom = misuraZoom()
  const suggerite = proposte(smistamento, allievi)
  const contesto: ContestoSfoglio = {
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
  const pagine: ReactElement[] = []
  for (let n = 1; n <= smistamento.pagine; n += 1) {
    if (contesto.archiviate.has(n) && !stato.mostraArchiviate) continue
    pagine.push(riquadroPagina(smistamento, n, contesto))
  }
  const t = testi()

  return (
    // testo-fisso: la chiave del telaio
    <div className="sfoglio" data-telaio="sfoglio">
      <div className="sfoglio__testa">
        {scelte.length > 0
          ? (
              <span className="sfoglio__scelte">
                <Pastiglia testo={dicePagine(scelte)} tono="informativo" simbolo="documento" />
                <span className="testo-quieto">{t.trascinaleScelte}</span>
              </span>
            )
          : <span className="testo-quieto">{t.premiPagina}</span>}
        {scelte.length > 0
          ? (
              <Pulsante
                simbolo="cestino"
                variante="fantasma"
                titolo={t.buttaScelte(dicePagine(scelte))}
                al={() => void scartaChiedendo(smistamento, scelte)}
              />
            )
          : null}
        {scelte.length > 0
          ? (
              <Pulsante
                testo={t.lascia}
                simbolo="chiudi"
                variante="fantasma"
                titolo={t.lasciaTitolo}
                al={() => scegli(smistamento.id, [])}
              />
            )
          : null}
        {interruttoreArchiviate(contesto.archiviate.size)}
        {cursoreZoom(smistamento.id, griglia)}
      </div>
      {opzioni.coda?.() ?? null}
      {pagine.length === 0
        ? (
            <p className="testo-quieto sfoglio__finito">
              {contesto.archiviate.size > 0 ? t.tutteArchiviate : t.nessunaDaSmistare}
            </p>
          )
        : null}
      <ul
        ref={griglia}
        className="sfoglio__pagine"
        style={{ gridTemplateColumns: colonneDi(zoom) }}
        // Lo scorrimento resta dov'era fra un disegno e l'altro; la chiave porta l'id
        // del PDF, così un altro PDF riparte dall'alto.
        // testo-fisso: la chiave dello scorrimento e del telaio
        data-scorrimento={`sfoglio:${smistamento.id}`}
        data-telaio="pagine"
        role="listbox"
        aria-multiselectable="true"
      >
        {pagine}
      </ul>
    </div>
  )
}

/** L'interruttore delle pagine archiviate, con il conto; assente se non ce n'è. */
function interruttoreArchiviate (quante: number): ReactNode {
  if (quante === 0) return null
  const t = testi()
  return (
    <Pulsante
      testo={stato.mostraArchiviate
        ? quante === 1
          ? t.nascondiArchiviata
          : t.nascondiArchiviate(quante)
        : t.archiviate(quante)}
      simbolo={stato.mostraArchiviate ? 'chiudi' : 'spunta'}
      variante={stato.mostraArchiviate ? 'sottile' : 'fantasma'}
      titolo={stato.mostraArchiviate ? t.tornaSole : t.rimetteInFila}
      al={() => aggiorna({ mostraArchiviate: !stato.mostraArchiviate })}
    />
  )
}
