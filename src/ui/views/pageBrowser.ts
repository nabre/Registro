// Lo sfoglio di un PDF da dividere: le sue pagine, una per una, da prendere
// con il mouse e lasciar cadere su chi sono.
//
// Smistare è sempre stato un lavoro da due campi numerici: «dalla pagina» e
// «alla pagina», con accanto una tendina di venticinque nomi. Per compilarli
// bisogna sapere che cosa c'è sulla pagina 7, e per saperlo bisogna guardarla
// altrove — il lettore del sistema, un'anteprima grande come un francobollo —
// e poi tornare indietro a scrivere due numeri. Il gesto vero, quello che si
// farebbe con i fogli sul tavolo, è un altro: si guarda il mucchio, si prende
// quel che è di Rossi, e lo si mette nella sua pila.
//
// Qui il mucchio c'è davvero. Le pagine si vedono, si scelgono — una, tre,
// anche non consecutive — e si trascinano sulla casella che incrocia la riga di
// una persona con la colonna di un documento. Quel che cade lì viene ritagliato
// e archiviato: è la stessa archiviazione della divisione a mano, con lo stesso
// rifiuto se quella casella è già piena.
//
// **Quando il PDF sa già a quale documento appartiene, basta la riga.** La
// casella dice due cose — chi, e quale documento — ma la seconda è scritta sul
// file che si sta guardando, e continuare a farla mirare significa chiedere due
// volte la stessa risposta. Il bersaglio diventa allora il nome della persona,
// alto quanto la riga e largo quanto la tabella, e la casella che prenderà le
// pagine si accende da sé per dire dove finiranno. La casella resta mirabile,
// ed è l'unica via per archiviare in una colonna diversa da quella del PDF: in
// un file solo capita che stiano due pratiche.
//
// **Le pagine scelte stanno nello stato e non nel DOM.** Il pannello ridisegna
// la vista a ogni battito dell'orologio, e una scelta fatta con il mouse che
// svanisse mentre si punta la casella sarebbe peggio dei due campi numerici.
//
// Le fotografie delle pagine le fa `components/thumbnails.ts`, che è dove sta
// pdfjs e il motivo per cui non serve un worker.

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
  TipoRapporto,
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

/**
 * Il tipo con cui le pagine viaggiano nel trascinamento.
 *
 * Un tipo nostro e non `text/plain`: le caselle della matrice devono poter
 * dire, mentre il puntatore ci passa sopra, se quel che arriva sono pagine da
 * archiviare o un file trascinato dal gestore file — e il contenuto di un
 * trascinamento non si legge finché non lo si lascia cadere, mentre l'elenco
 * dei tipi sì.
 */
const TIPO_PAGINE = 'application/x-registro-pagine'

/** Quel che viaggia: di quale PDF sono, e quali pagine. */
interface PagineTrascinate {
  smistamentoId: string
  pagine: number[]
}

/** La classe che il corpo della pagina porta mentre delle pagine sono in volo. */
const CORPO_IN_VOLO = 'trascino-pagine'

/** La classe della casella sotto il puntatore, mentre ci si passa sopra. */
const CASELLA_BERSAGLIO = 'cella-documento--bersaglio'

/** La classe della riga che sta per prendersi le pagine. */
const RIGA_BERSAGLIO = 'tabella__riga--bersaglio'

/**
 * Il volo in corso: quali pagine, e se sono atterrate da qualche parte.
 *
 * Serve a dire qualcosa quando non atterrano. Un trascinamento mancato di tre
 * pixel non produce nessun evento — il browser lo annulla e basta — e prima
 * finiva così: le pagine restavano scelte, la matrice immobile, e non c'era
 * modo di capire se l'archiviazione fosse fallita o se non fosse mai partita.
 *
 * Vivono qui e non nello stato perché non cambiano niente di quel che si vede:
 * sono memoria del gesto, come l'ancora dello Shift.
 */
let inVolo: number[] | null = null
let inVoloDa: string | null = null
let atterrate = false
let rinunciato = false

/**
 * Esc mentre si trascina: chi rinuncia lo sa già, e non va avvisato di niente.
 *
 * Senza questa distinzione l'avviso del rilascio mancato partirebbe anche qui,
 * e un avviso che compare quando si è fatto apposta insegna a ignorarli tutti.
 */
document.addEventListener('keydown', (evento: KeyboardEvent) => {
  if (inVolo && evento.key === 'Escape') rinunciato = true
})

/**
 * La pulizia di fine trascinamento, dichiarata una volta sola.
 *
 * Un trascinamento può finire dove nessuno lo aspetta — fuori dalla finestra,
 * su Esc, sul bordo di una casella che non ha mai visto uscire il puntatore —
 * e una casella rimasta accesa non sarebbe soltanto brutta: mentre lo è, quel
 * che ha dentro non si può premere. Qui finisce comunque.
 */
document.addEventListener('dragend', () => {
  document.body.classList.remove(CORPO_IN_VOLO)
  for (const acceso of document.querySelectorAll(`.${CASELLA_BERSAGLIO}, .${RIGA_BERSAGLIO}`)) {
    acceso.classList.remove(CASELLA_BERSAGLIO, RIGA_BERSAGLIO)
  }
  if (inVolo && !atterrate && !rinunciato) {
    notifica(
      `${dicePagine(inVolo)}: lasciate fuori dalla matrice, e quindi non archiviate. ` +
        'Il bersaglio è la casella che incrocia la riga della persona con la colonna del ' +
        'documento — mentre trascini si accendono tutte.',
      'avviso',
    )
  }
  inVolo = null
  inVoloDa = null
  atterrate = false
  rinunciato = false
})

/**
 * Da quale pagina è partita l'ultima scelta: serve allo Shift.
 *
 * Vive qui e non nello stato perché non cambia niente di quel che si vede: è
 * memoria del gesto, come il punto da cui si è cominciato a selezionare del
 * testo.
 *
 * Si porta dietro il documento, e non è un dettaglio: è un numero di pagina, e
 * un numero di pagina da solo vale in qualunque PDF. Senza, aprendo un altro
 * foglio il primo Maiusc+clic apriva un tratto che partiva da dove si era
 * rimasti nel PDF di prima — pagine che in questo non esistono comprese.
 */
let ancora: { smistamentoId: string, pagina: number } | null = null

/** Le pagine scelte adesso in questo PDF; vuoto se la scelta è di un altro. */
export function pagineScelte (smistamentoId: string): number[] {
  const scelta = stato.pagineScelte
  return scelta && scelta.smistamentoId === smistamentoId ? scelta.pagine : []
}

function scegli (smistamentoId: string, pagine: number[]): void {
  const ordinate = [...new Set(pagine)].sort((x, y) => x - y)
  aggiorna({ pagineScelte: ordinate.length > 0 ? { smistamentoId, pagine: ordinate } : null })
}

/**
 * Il clic su una pagina, con i tre modi di sempre.
 *
 * Sono quelli di ogni elenco a scelta multipla — semplice sceglie solo questa,
 * Ctrl aggiunge o toglie, Shift prende il tratto — e non si inventa niente:
 * chi smista venticinque pagine lo fa con le dita che ha già.
 */
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
    // Le pagine già archiviate restano fuori dal tratto. Con l'interruttore
    // spento non si vedono nemmeno, e prenderle vorrebbe dire ritagliare una
    // seconda volta un foglio che sta già nel fascicolo di qualcuno — cioè lo
    // stesso documento addosso a due persone, che è il guasto peggiore che
    // questa pagina possa fare.
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
  // Ripremere l'unica pagina scelta la lascia andare: è il modo di annullare
  // senza cercare un pulsante, e senza restare con una pagina accesa che non
  // si voleva più.
  scegli(smistamento.id, adesso.length === 1 && adesso[0] === pagina ? [] : [pagina])
}

/** Di chi sono già le pagine archiviate di questo PDF: pagina → nome. */
function giaArchiviate (smistamento: Smistamento, allievi: Allievo[]): Map<number, string> {
  const perId = new Map(allievi.map((a) => [a.id, a]))
  const chi = new Map<number, string>()
  for (const fetta of smistamento.assegnate) {
    const suo = perId.get(fetta.allievoId)
    // Il foglio firme non è di nessuno: è la prova che riguarda tutta la
    // colonna, e scrivere «qualcuno» sarebbe dire che non si sa di chi sia.
    const chiEra = fetta.firme
      ? 'Foglio firme'
      : suo
        ? // Nella matrice delle assenze la stessa persona ha quattro caselle: il
      // nome da solo non direbbe in quale di quelle è finita la pagina.
        fetta.assenze
          ? `${nomeCompleto(suo)} · ${etichettaFoglio(fetta.assenze.tipo, fetta.assenze.firmato)}`
          : nomeCompleto(suo)
        : 'qualcuno'
    for (let n = fetta.da; n <= fetta.a; n += 1) chi.set(n, chiEra)
  }
  return chi
}

/**
 * Le fotografie che l'host si è già tirato fuori dalla scansione: pagina →
 * indirizzo.
 *
 * Non sostituiscono il disegno di pdfjs — sono l'immagine grezza dentro il
 * PDF, senza quel che il PDF ci scrive sopra — ma arrivano subito, perché sono
 * già dei file. Valgono come prima risposta mentre la pagina vera si disegna.
 */
function anteprimeDellHost (smistamento: Smistamento): Map<number, string> {
  const fotografie = new Map<number, string>()
  for (const lettura of smistamento.letture) {
    const indirizzo = lettura.anteprima ? uriDato(lettura.anteprima) : null
    if (indirizzo) fotografie.set(lettura.numero, indirizzo)
  }
  return fotografie
}

/**
 * Che cosa sta succedendo alle pagine di questo PDF nella coda di lettura.
 *
 * La coda è fatta di pagine, ed è qui che si vede: sul riquadro della pagina
 * che si sta leggendo, non in una barra lontana che dice un numero. Chi guarda
 * lo sfoglio mentre l'OCR macina vuole sapere una cosa sola — questa pagina,
 * quando parla?
 */
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
 * Il nome letto su una pagina, con tutto quel che serve per crederci o no.
 *
 * Tre cose insieme, perché è così che si controlla una proposta: *chi* —
 * cioè la persona a cui la bozza manda queste pagine — *dove* sul foglio il
 * nome è comparso, e *chi l'ha letto*. L'ultima non è un dettaglio tecnico:
 * un nome preso dal testo del PDF sta esattamente dove il rettangolo lo
 * segna, mentre uno letto dall'OCR sta da qualche parte dentro una striscia,
 * e le due cose si controllano con occhi diversi.
 */
interface NomeLetto {
  nome: string
  riquadro: RiquadroPagina
  /** `testo` sono le coordinate vere del PDF, `ocr` la striscia guardata. */
  fonte: 'testo' | 'ocr'
}

/**
 * I nomi letti, pagina per pagina: solo dove c'è sia una proposta sia il punto
 * in cui il nome è stato letto.
 *
 * Senza il punto non si disegna niente, ed è giusto così: un rettangolo messo
 * a caso su una scansione è peggio di nessun rettangolo — dice «guarda qui» a
 * chi guarderebbe meglio da solo.
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
 * Quanto prima di entrare in vista una pagina si comincia a disegnare.
 *
 * Disegnarle tutte insieme vorrebbe dire un'interfaccia ferma per qualche
 * secondo su un PDF di trenta pagine; disegnarle solo quando si vedono vuol
 * dire scorrere dentro dei rettangoli vuoti. Uno schermo di anticipo è la via
 * di mezzo: quel che arriva sotto le dita è già pronto.
 */
const ANTICIPO = '800px'

/**
 * La fotografia di una pagina, o il posto in cui comparirà.
 *
 * Il posto non è mai vuoto: finché il disegno non c'è, dentro il riquadro sta
 * scritto che si sta disegnando. Un rettangolo vuoto con un numero in mezzo si
 * legge come una pagina bianca — e su una scansione di certificati una pagina
 * bianca è una cosa che può succedere davvero: non si deve poter confondere
 * «non è ancora arrivata» con «non c'è niente sopra».
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

  /**
   * Il rettangolo sul punto in cui il nome è stato letto, con il nome scritto
   * sopra.
   *
   * È la metà che mancava a una proposta: il registro dice «qui c'è Rossi», e
   * questo dice *dove* l'ha letto. Il nome sta attaccato al rettangolo e non
   * soltanto sotto la pagina, perché è lì che si controlla: si guarda quel che
   * c'è scritto sul foglio e, un centimetro accanto, quel che il registro ci
   * ha letto. Prima i due erano ai due capi del riquadro e confrontarli voleva
   * dire tenerne uno a memoria.
   *
   * Il segno dice anche *chi* ha letto, e non per pignoleria: un nome preso dal
   * testo del PDF sta esattamente lì — contorno pieno — mentre uno letto
   * dall'OCR sta da qualche parte dentro la striscia guardata, e il
   * tratteggio è la promessa più onesta che si possa fare.
   *
   * L'etichetta va sotto il rettangolo, e sopra quando il rettangolo è in
   * fondo alla pagina: la fotografia ritaglia quel che esce dai suoi bordi, e
   * un nome tagliato a metà si legge come un nome sbagliato.
   */
  const segno = (): Figlio => {
    if (!letto) return null
    const { riquadro, fonte, nome } = letto
    const inFondo = riquadro.y + riquadro.altezza > 0.82
    // L'etichetta si appende dal bordo del riquadro che è più lontano da quello
    // della pagina: la fotografia ritaglia quel che esce, e un nome appeso a
    // sinistra di un riquadro già a destra si perderebbe proprio dove serve.
    const aDestra = riquadro.x + riquadro.larghezza / 2 > 0.5
    return h(
      'span',
      {
        class: [
          'pagina-sfoglio__nome',
          `pagina-sfoglio__nome--${fonte}`,
          inFondo && 'pagina-sfoglio__nome--sopra',
          aDestra && 'pagina-sfoglio__nome--destra',
        ],
        attr: {
          title:
            fonte === 'ocr'
              ? `«${nome}» letto dentro questa striscia, dalla lettura automatica delle scansioni`
              : `«${nome}» letto qui, nel testo del PDF`,
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
      // La pagina non si è potuta disegnare: lo si dice, invece di lasciare un
      // rettangolo che non si sa come leggere. Trascinarla si può lo stesso.
      posto.replaceChildren(
        h('span', { class: 'pagina-sfoglio__attesa' }, `Pagina ${pagina}`),
        h('span', { class: 'testo-quieto pagina-sfoglio__nota' }, 'non si riesce a disegnarla'),
      )
      return
    }
    const sopra = segno()
    posto.replaceChildren(
      h('img', { attr: { src: immagine, alt: `Pagina ${pagina}`, draggable: 'false' } }),
    )
    if (sopra instanceof Node) posto.appendChild(sopra)
  }

  // Quella giusta c'è già: si mette e basta.
  const esatta = miniaturaAllaMisura(chiave, pagina, larghezza)
  if (esatta) {
    mostra(esatta, true)
    return posto
  }

  // Altrimenti si mostra quel che c'è — la stessa pagina disegnata a un'altra
  // misura, o la fotografia che l'host si era già tirato fuori dalla scansione:
  // sgranate, ma vere — e si chiede comunque quella giusta. Ingrandendo lo
  // sfoglio si vede subito qualcosa, e un istante dopo si vede nitido.
  const ripiego = miniaturaPronta(chiave, pagina, larghezza) ?? ripiegoScritto
  if (ripiego) {
    mostra(ripiego, false)
  } else {
    posto.appendChild(h('span', { class: 'pagina-sfoglio__attesa' }, String(pagina)))
    posto.appendChild(h('span', { class: 'testo-quieto pagina-sfoglio__nota' }, 'la sto disegnando…'))
  }

  // Una vedetta sola per tutte le pagine, non una per riquadro: vedi
  // `guardaQuando`.
  guardaQuando(posto, () => {
    // Il riquadro può non essere più in pagina quando la fotografia arriva —
    // un ridisegno lo ha sostituito con un altro uguale — e riempirlo allora
    // sarebbe disegnare nel vuoto. La fotografia però resta in memoria: il
    // riquadro nuovo la trova già pronta.
    void miniatura(indirizzo, chiave, pagina, larghezza).then((immagine) => {
      if (posto.isConnected) mostra(immagine, true)
    })
  })
  return posto
}

/**
 * Chi guarda quando un riquadro entra in vista, per tutti i riquadri insieme.
 *
 * Prima ogni pagina si costruiva il suo `IntersectionObserver`, e lo
 * disconnetteva solo quando scattava: un ridisegno dello sfoglio — e se ne fa
 * uno a ogni cambio di filtro — lasciava dietro decine di osservatori vivi,
 * ognuno con il suo riquadro in mano. Uno solo per tutti non si perde: quando
 * una pagina entra in vista si esegue il suo compito e la si smette di
 * guardare.
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
 * Lascia andare tutto quel che si stava guardando: all'inizio di ogni disegno.
 *
 * Una vedetta sola non basta a non lasciare niente dietro. `IntersectionObserver`
 * tiene stretti i nodi che osserva, e le schede di un disegno le porta via il
 * disegno dopo senza dirglielo: la vedetta restava con in mano quelle vecchie
 * — fuori dal documento e vive — e ogni ridisegno ne aggiungeva altre. Su una
 * scansione da cento pagine, un pomeriggio di smistamento ne lasciava dietro
 * migliaia. Quel che conta è ancora in pagina lo si ritorna a guardare subito
 * dopo, riquadro per riquadro. `daGuardare` è una mappa debole e si svuota da
 * sé appena la vedetta molla la presa.
 */
function smettiDiGuardare (): void {
  vedetta?.disconnect()
}

/**
 * L'immagine che segue il puntatore mentre si trascina.
 *
 * Il browser, lasciato a sé, fotografa il rettangolo intero — bordo, numero,
 * pastiglia del nome — e per metà è roba dell'elenco, non del documento. Qui
 * sotto il puntatore ci va la pagina, con in un angolo quante ne stanno
 * arrivando: è quel che serve sapere mentre si mira una casella.
 *
 * L'elemento dev'essere nel documento nel momento in cui lo si consegna al
 * trascinamento, e deve sparire subito dopo: il browser se ne fa una copia.
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
  // Tolta al primo giro di eventi: più presto è troppo presto — il browser
  // deve avere il tempo di fotografarla — e più tardi sarebbe un rettangolo
  // appeso in un angolo della pagina.
  setTimeout(() => copia.remove(), 0)
}

/**
 * Quel che si sa di una pagina, detto sotto la sua fotografia.
 *
 * Una sola pastiglia, perché una pagina si trova in un solo stato per volta, e
 * l'ordine è quello in cui i fatti si sovrascrivono: archiviata batte tutto —
 * il lavoro su quella pagina è finito — poi viene quel che la macchina sta
 * facendo adesso, poi quel che ha letto.
 *
 * Le ultime due righe sono l'aggiunta che mancava, e sono la differenza fra due
 * pagine che prima si somigliavano: una scansione muta che nessuno ha ancora
 * letto — dove c'è un gesto da fare, «Leggi le scansioni» — e una pagina letta
 * in cui nessun nome della classe è comparso, dove il gesto è guardarla. Senza
 * pastiglia erano tutt'e due un riquadro con niente sotto.
 */
function etichettaPagina (quel: {
  archiviata: string | undefined
  lettura: 'in-coda' | 'in-corso' | undefined
  letto: NomeLetto | undefined
  proposta: string | undefined
  letta: PaginaSmistamento | undefined
}): Figlio {
  if (quel.archiviata) return pastiglia(quel.archiviata, 'positivo', 'spunta')
  if (quel.lettura === 'in-corso') return pastiglia('la sto leggendo', 'informativo', 'ricarica')
  if (quel.lettura === 'in-coda') return pastiglia('in coda', 'neutro', 'ricarica')
  // Il simbolo dice da dove viene il nome: la lente è la lettura automatica, il
  // foglio è il testo che nel PDF c'era già. Chi controlla venti pagine impara
  // in fretta che le prime vanno guardate e le seconde quasi mai.
  //
  // Nessun simbolo dove il nome non è stato letto su questa pagina ma dedotto
  // dal taglio — «due pagine a testa» — perché lì non c'è niente da guardare:
  // è una regola dichiarata, non una lettura, e prometterne una sarebbe falso.
  if (quel.proposta) {
    const fonte = quel.letto?.fonte
    const simbolo = fonte === 'ocr' ? 'lente' : fonte === 'testo' ? 'documento' : undefined
    return pastiglia(quel.proposta, 'informativo', simbolo)
  }
  if (quel.letta?.lettura === 'niente') return pastiglia('da leggere', 'attenzione', 'avviso')
  return pastiglia('nessun nome', 'quiete')
}

/**
 * La riga che si legge fermandosi sulla pagina: di chi è, e come si è saputo.
 *
 * Dice più della pastiglia perché ha lo spazio per farlo — da dove viene il
 * nome, e le prime parole di quel che c'è scritto sul foglio — ed è la
 * risposta rapida a «questa proposta sta in piedi?» senza ingrandire niente.
 */
function spiegaPagina (
  pagina: number,
  quel: {
    archiviata: string | undefined
    letto: NomeLetto | undefined
    proposta: string | undefined
    letta: PaginaSmistamento | undefined
  },
): string {
  if (quel.archiviata) return `Pagina ${pagina}: già archiviata per ${quel.archiviata}`

  const righe = [`Pagina ${pagina}`]
  if (quel.proposta) {
    const come =
      quel.letto?.fonte === 'ocr'
        ? 'letto dalla lettura automatica'
        : quel.letto
          ? 'letto nel testo del PDF'
          : 'dedotto dal taglio'
    righe.push(`il registro ci legge ${quel.proposta} — ${come}`)
  } else if (quel.letta?.lettura === 'niente') {
    righe.push('scansione senza testo, ancora da leggere')
  } else {
    righe.push('nessun nome della classe riconosciuto')
  }

  const testo = (quel.letta?.testo ?? '').replace(/\s+/g, ' ').trim()
  if (testo) righe.push(`«${testo.slice(0, 120)}${testo.length > 120 ? '…' : ''}»`)
  righe.push('Trascinala sulla casella di chi è.')
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
      // Una pagina già archiviata non si prende: quel documento è nel
      // fascicolo di qualcuno, e ritagliarlo una seconda volta lo
      // metterebbe due volte.
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
    // Trascinare una pagina che non era fra le scelte porta quella e basta: è
    // quel che fa ogni elenco, ed è l'unico modo di non archiviare, con un
    // gesto solo, delle pagine scelte dieci minuti prima.
    //
    // La scelta non si tocca qui, e non è una dimenticanza: cambiarla vorrebbe
    // dire ridisegnare la vista — cioè togliere dal documento, mentre il
    // trascinamento è appena partito, proprio l'elemento che si sta
    // trascinando. Chromium a quel punto lascia cadere tutto.
    const scelte = pagineScelte(smistamento.id)
    const scelteInVolo = scelte.includes(pagina) ? scelte : [pagina]
    inVolo = scelteInVolo
    inVoloDa = smistamento.id
    atterrate = false
    rinunciato = false

    const carico: PagineTrascinate = { smistamentoId: smistamento.id, pagine: scelteInVolo }
    evento.dataTransfer?.setData(TIPO_PAGINE, JSON.stringify(carico))
    // Sotto il puntatore va la pagina che si sta portando, non il rettangolo
    // con il suo numero e la sua pastiglia: mentre si attraversa la matrice si
    // guarda la casella, e quel che passa sopra le righe deve dire a colpo
    // d'occhio *che cosa* si sta per lasciare lì.
    fantasma(evento, riquadro, scelteInVolo.length)
    // Anche in `text/plain`, che è quel che finisce in un campo di testo se le
    // pagine vengono lasciate cadere fuori bersaglio: meglio una frase che dice
    // che cosa si stava trascinando che un rifiuto muto.
    evento.dataTransfer?.setData('text/plain', `${smistamento.nome}: ${dicePagine(scelteInVolo)}`)
    if (evento.dataTransfer) evento.dataTransfer.effectAllowed = 'copy'
    document.body.classList.add(CORPO_IN_VOLO)
  })
  riquadro.addEventListener('dragend', () => document.body.classList.remove(CORPO_IN_VOLO))
  return riquadro
}

// -------------------------------------------------------- il tasto destro

/**
 * Su quali pagine agisce un gesto fatto su questa: la scelta, o questa da sola.
 *
 * È la regola di ogni elenco: quel che si fa su una riga scelta si fa su tutte
 * quelle scelte, e quel che si fa su una riga fuori dalla scelta riguarda lei
 * sola. Senza, un «butta via» premuto su una pagina qualunque porterebbe con sé
 * tre pagine scelte dieci minuti prima.
 */
function suQuali (smistamento: Smistamento, pagina: number): number[] {
  const scelte = pagineScelte(smistamento.id)
  return scelte.includes(pagina) ? scelte : [pagina]
}

/**
 * Chiede a chi vanno queste pagine, e dentro quale documento.
 *
 * È la via che non passa dal trascinamento, e serve a due categorie di persone:
 * chi il mouse lo usa poco, e chi ha la matrice fuori schermo perché sta
 * guardando la pagina quaranta di una scansione lunga.
 */
function assegnaChiedendo (
  smistamento: Smistamento,
  pagine: number[],
  allievi: Allievo[],
  richieste: Consegna[],
): void {
  if (allievi.length === 0 || richieste.length === 0) {
    notifica(
      allievi.length === 0
        ? 'In questa classe non c’è nessuno a cui assegnarle.'
        : 'Non c’è nessun documento aperto in cui archiviarle.',
      'avviso',
    )
    return
  }

  apriModale({
    titolo: `A chi vanno ${dicePagine(pagine)}?`,
    sottotitolo: smistamento.nome,
    larghezza: 'stretta',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'allievoId',
          etichetta: 'Persona',
          tipo: 'select',
          valore: allievi[0]?.id ?? '',
          opzioni: allievi.map((allievo) => ({ valore: allievo.id, testo: nomeCompleto(allievo) })),
        }),
        campo({
          nome: 'consegnaId',
          etichetta: 'Documento',
          tipo: 'select',
          valore: smistamento.consegnaId ?? richieste[0]?.id ?? '',
          opzioni: richieste.map((consegna) => ({ valore: consegna.id, testo: consegna.testo })),
        }),
      ),
    testoSalva: 'Archivia',
    alSalva: (valori, contesto) => {
      const allievoId = String(valori.allievoId ?? '')
      const consegnaId = String(valori.consegnaId ?? '')
      if (!allievoId || !consegnaId) {
        notifica('Servono la persona e il documento.', 'avviso')
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
 * Il menu del tasto destro su una pagina.
 *
 * Il trascinamento risponde alla domanda normale — questa pagina è di Rossi — e
 * qui c’è tutto il resto, cioè quel che si fa quando qualcosa non torna:
 * rileggere una scansione che il registro ha letto male, guardarla in grande
 * nel lettore del sistema, buttarla via perché non è di nessuno. Su una pagina
 * già archiviata il menu è un altro, ed è il rimedio all’errore che conta:
 * riprenderla, perché era finita nel fascicolo sbagliato.
 */
/**
 * Butta via le pagine scelte, dopo averlo chiesto.
 *
 * Si chiede, e prima non si chiedeva: ne' dal cestino della barra ne' dalla
 * voce «Butta via» del menu contestuale. Quel che succede non e' reversibile —
 * `smistamento.scartaPagine` toglie le pagine dalle letture, e se non resta
 * piu' niente da dividere `chiudiSeFinito` manda nel cestino di sistema il PDF
 * di partenza e le sue anteprime — e non esiste un «riprendi»: quello recupera
 * le pagine **assegnate**, non le scartate. La scelta e' multipla con Ctrl e
 * Maiusc, quindi un tratto preso male sono venti certificati firmati.
 *
 * E' la stessa domanda che `views/archive.ts` fa sempre prima di buttare un
 * foglio, con la stessa ragione: e' spesso l'unica copia che esiste. Nella
 * stessa pagina si conferma perfino una rilettura OCR, che non perde niente.
 */
async function scartaChiedendo (smistamento: Smistamento, pagine: number[]): Promise<void> {
  const sicuro = await conferma({
    titolo: `Buttare via ${dicePagine(pagine)}?`,
    testo:
      `${dicePagine(pagine)} di «${smistamento.nome}» escono da quel che resta da ` +
      'smistare, e non si riprendono. Se non resta altro da dividere, il PDF di partenza va ' +
      'nel cestino del sistema.',
    testoConferma: 'Butta via',
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

  if (archiviata) {
    menuContestuale(evento, [
      { titolo: `Pagina ${pagina} · archiviata per ${archiviata}` },
      {
        testo: 'Riprendila',
        simbolo: 'ricarica',
        titolo:
          'Il documento esce dal fascicolo e le sue pagine tornano fra quelle da smistare: ' +
          'è il modo di rimediare a una pagina lasciata sulla riga sbagliata.',
        al: () =>
          void azione({
            tipo: 'smistamento.riprendiPagine',
            smistamentoId: smistamento.id,
            pagine: [pagina],
          }),
      },
      'separatore',
      {
        testo: 'Aprila nel lettore',
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
    { titolo: dicePagine(pagine) + (proposta ? ` · il registro ci legge ${proposta}` : '') },
    // «Assegna a…» chiede in quale documento archiviare, e senza documenti
    // aperti non ha niente da chiedere: è il caso della matrice delle assenze,
    // dove le pagine non vanno in un documento ma in una casella, e quale lo
    // dice il posto in cui si lasciano cadere. Offrire lì una voce che risponde
    // sempre «non c'è nessun documento» è peggio che non offrirla: al suo posto
    // si dice come si fa.
    ...(contesto.richieste.length > 0
      ? [
          {
            testo: 'Assegna a…',
            simbolo: 'utente' as const,
            titolo: 'Archivia queste pagine dicendo a chi vanno e dentro quale documento',
            al: () => assegnaChiedendo(smistamento, pagine, contesto.allievi, contesto.richieste),
          },
        ]
      : [{ titolo: 'Per archiviarle, trascinale sulla casella della persona' }]),
    stato.ocrAttivo
      ? {
          testo: pagine.length === 1 ? 'Rileggi la scansione' : `Rileggi le ${pagine.length} pagine`,
          simbolo: 'ricarica',
          titolo: 'Rimette in coda la lettura: qualche decina di secondi per pagina',
          al: () =>
            void azione({
              tipo: 'smistamento.leggiPagine',
              smistamentoId: smistamento.id,
              pagine,
            }),
        }
      : {
          testo: 'Lettura scansioni: spenta',
          simbolo: 'impostazioni',
          titolo: 'Apre le impostazioni su «registroDocenti.ocr.attivo»',
          al: () => void azione({ tipo: 'smistamento.impostazioni' }),
        },
    {
      testo: 'Apri nel lettore',
      simbolo: 'esporta',
      titolo: 'Apre solo queste pagine nel programma del sistema',
      al: () =>
        void azione({ tipo: 'smistamento.apriPagine', smistamentoId: smistamento.id, pagine }),
    },
    'separatore',
    {
      testo: 'Butta via',
      simbolo: 'cestino',
      pericolo: true,
      titolo: 'Queste pagine non sono di nessuno: fuori da quel che resta da smistare',
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
    : MISURE_SFOGLIO.find((misura) => misura >= chiesta) ?? MISURE_SFOGLIO[MISURE_SFOGLIO.length - 1]
}

/** Le colonne della griglia a quella misura: quante ce ne stanno, ce ne stanno. */
function colonneDi (misura: number): string {
  return `repeat(auto-fill, minmax(${misura}px, 1fr))`
}

/**
 * Il cursore che ingrandisce le pagine.
 *
 * Una pagina piccola risponde a «quante ne ho», una grande a «che cosa c'è
 * scritto», e smistando si passa dall'una all'altra di continuo: un modulo di
 * segreteria si riconosce dal colpo d'occhio, ma il cognome scritto a penna in
 * testa va letto. Senza un modo di ingrandire restava una sola risposta, e per
 * l'altra bisognava aprire il lettore e perdere le pagine.
 *
 * Mentre lo si trascina cambia solo la griglia, senza rifare la vista: le
 * fotografie già disegnate si allargano — sgranate per un istante — e la
 * misura nuova si scrive nello stato quando si lascia il cursore, che è il
 * momento in cui le pagine si ridisegnano nitide.
 */
function cursoreZoom (griglia: HTMLElement): Figlio {
  const indice = Math.max(0, MISURE_SFOGLIO.indexOf(misuraZoom()))

  const cursore = h('input', {
    class: 'sfoglio__zoom',
    dataset: { fuoco: 'sfoglio-zoom' },
    attr: {
      type: 'range',
      min: '0',
      max: String(MISURE_SFOGLIO.length - 1),
      step: '1',
      value: String(indice),
      title: 'Quanto grandi si vedono le pagine',
      'aria-label': 'Misura delle pagine',
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
    { class: 'sfoglio__zoom-gruppo', attr: { title: 'Quanto grandi si vedono le pagine' } },
    icona('lente', 'icona--minuta'),
    cursore,
  )
}

/**
 * Lo sfoglio: la testata con quel che si è preso, e sotto tutte le pagine.
 *
 * Le pagine ci sono tutte, comprese quelle già archiviate: sono spente e non si
 * prendono, ma restano al posto loro. Toglierle vorrebbe dire che la pagina 7
 * del PDF non è la settima dell'elenco, e chi controlla una scansione conta.
 */
export function sfoglioSmistamento (opzioni: {
  smistamento: Smistamento
  allievi: Allievo[]
  richieste: Consegna[]
  indirizzo: string
  chiave: string
  /**
   * La coda di lettura, disegnata da chi sa di code.
   *
   * Sta qui dentro e non in un riquadro lontano: la coda è fatta di pagine, e
   * il posto in cui guardarla è quello in cui le pagine si vedono. Arriva
   * già pronta perché questo modulo non sa niente di OCR — sa di pagine, di
   * scelte e di trascinamenti.
   */
  coda?: Figlio
}): Figlio {
  const { smistamento, allievi, richieste, indirizzo, chiave } = opzioni
  // I caratteri standard stanno accanto ai bundle: si dice a ogni ridisegno
  // perché è una riga, e perché l'indirizzo arriva con lo stato — cioè può non
  // esserci ancora al primo disegno della vista.
  if (stato.radiceApp) impostaCaratteri(stato.radiceApp)
  // Prima di costruire i riquadri nuovi: quelli di adesso stanno per uscire
  // dal documento, e la vedetta è l'unica cosa che li tratterrebbe in vita.
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

  // Le pagine archiviate se ne vanno dall'elenco: non sono più lavoro da fare,
  // e lasciarle in mezzo vorrebbe dire cercare ogni volta quali restano. Non
  // sparisce il fatto che ci sono — l'interruttore le rimette in fila, ed è da
  // lì che si riprende quella lasciata cadere sulla riga sbagliata.
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
      // Resta dov'era fra un ridisegno e l'altro. Archiviare delle pagine
      // trascinandole, o anche solo sceglierne una con un clic, ridisegna la
      // vista: senza questa riga la colonna tornava in cima a ogni gesto, e su
      // una scansione di trenta pagine bisognava riscorrere fin lì ogni volta.
      //
      // La chiave porta l'id del PDF: guardandone un altro non c'è niente da
      // ritrovare e si riparte dall'alto, che è quel che si vuole.
      dataset: { scorrimento: `sfoglio:${smistamento.id}` },
      attr: { role: 'listbox', 'aria-multiselectable': 'true' },
    },
    ...pagine,
  )

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
              'trascinale sulla casella di chi sono: la riga della persona, la colonna del documento.',
            ),
          )
        : h(
            'span',
            { class: 'testo-quieto' },
            'Premi una pagina per sceglierla — Ctrl per aggiungerne, Maiusc per un tratto — ' +
              'poi trascinala sulla casella di chi è.',
          ),
      scelte.length > 0
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo:
              `Butta via ${dicePagine(scelte)}: non sono di nessuno — la copertina dello ` +
              'scanner, un foglio bianco in mezzo al mucchio',
            al: () => void scartaChiedendo(smistamento, scelte),
          })
        : null,
      scelte.length > 0
        ? pulsante({
            testo: 'Lascia',
            simbolo: 'chiudi',
            variante: 'fantasma',
            titolo: 'Lascia andare le pagine scelte',
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
            ? 'Tutte le pagine di questo PDF sono archiviate.'
            : 'Non resta nessuna pagina da smistare.',
        )
      : null,
    griglia,
  )
}

/**
 * L'interruttore delle pagine archiviate.
 *
 * Non compare finché non ce n'è nessuna: un interruttore che accende il nulla è
 * una domanda senza risposta. Il conto sta scritto sopra, perché è quel che
 * dice se vale la pena di premerlo.
 */
function interruttoreArchiviate (quante: number): Figlio {
  if (quante === 0) return null
  return pulsante({
    testo: stato.mostraArchiviate
      ? quante === 1
        ? 'Nascondi l’archiviata'
        : `Nascondi le ${quante} archiviate`
      : `Archiviate (${quante})`,
    simbolo: stato.mostraArchiviate ? 'chiudi' : 'spunta',
    variante: stato.mostraArchiviate ? 'sottile' : 'fantasma',
    titolo: stato.mostraArchiviate
      ? 'Torna alle sole pagine che restano da smistare'
      : 'Rimette in fila anche le pagine già finite nel fascicolo di qualcuno: da lì si riprendono',
    al: () => aggiorna({ mostraArchiviate: !stato.mostraArchiviate }),
  })
}

// ------------------------------------------------------------- il bersaglio

/** Le pagine che stanno arrivando, se quel che arriva sono pagine. */
function carico (evento: DragEvent): PagineTrascinate | null {
  const grezzo = evento.dataTransfer?.getData(TIPO_PAGINE)
  if (!grezzo) return null
  try {
    const letto = JSON.parse(grezzo) as PagineTrascinate
    if (!letto?.smistamentoId || !Array.isArray(letto.pagine) || letto.pagine.length === 0) {
      return null
    }
    return letto
  } catch {
    return null
  }
}

/** Vero se in questo trascinamento ci sono pagine da archiviare. */
export function portaPagine (evento: DragEvent): boolean {
  return [...(evento.dataTransfer?.types ?? [])].includes(TIPO_PAGINE)
}

/**
 * In quale colonna finiscono le pagine lasciate su una riga: quella del PDF da
 * cui vengono.
 *
 * Un PDF da dividere è agganciato a una richiesta — «le autocertificazioni di
 * gennaio» — e allora la colonna non è una scelta da fare: è già scritta sul
 * file che si sta guardando. Quel che resta da dire è di chi sono quelle pagine,
 * ed è esattamente quel che dice la riga su cui si lasciano cadere.
 *
 * Senza aggancio torna null, e la riga non prende niente: l’unica risposta
 * onesta è far mirare la colonna, perché sceglierla al posto di chi trascina
 * vorrebbe dire archiviare mezza segreteria sotto la pratica sbagliata.
 */
function colonnaDi (smistamentoId: string | null): Consegna | null {
  if (!smistamentoId) return null
  const suo = stato.registro.smistamenti.find((s) => s.id === smistamentoId)
  if (!suo?.consegnaId) return null
  return stato.registro.consegne.find((c) => c.id === suo.consegnaId) ?? null
}

/**
 * A chi vanno le pagine lasciate su una riga: a una persona, o al foglio firme
 * della colonna.
 *
 * Due righe di natura diversa nella stessa matrice — venticinque di persone e
 * una, in cima, che è la prova di aver distribuito — e lo stesso gesto le
 * serve tutt'e due.
 */
type DestinazioneRiga =
  | { tipo: 'persona', allievoId: string, chi: string }
  | { tipo: 'firme' }

/**
 * Fa di una riga della matrice un posto dove lasciar cadere delle pagine.
 *
 * È la metà che mancava al bersaglio: la casella dice due cose — chi, e quale
 * documento — ma quando il PDF è già agganciato a una richiesta la seconda la
 * sa già il file, e continuare a farla mirare vuol dire chiedere due volte la
 * stessa risposta. Chi trascina guarda l’altra metà dello schermo, e centrare
 * un incrocio in una griglia di venticinque righe per venti colonne è il gesto
 * che sbagliava. Sulla riga il bersaglio è alto come il nome e largo quanto la
 * tabella, e la domanda torna a essere una sola: di chi sono queste pagine?
 *
 * La casella resta il bersaglio più forte — ferma l’evento, e vince — perché
 * è l’unica via per archiviare in una colonna che non è quella del PDF: un file
 * solo in cui stanno due pratiche diverse è più comune di quanto sembri.
 *
 * Il conto degli ingressi e delle uscite non è un vezzo: `dragleave` scatta
 * anche passando sopra una cella figlia, e una riga che si spegne e si riaccende
 * mentre la si attraversa fa lasciare le pagine un istante prima, fuori
 * bersaglio.
 */
export function accettaPagineSullaRiga (riga: HTMLElement, destinazione: DestinazioneRiga): void {
  /**
   * La colonna buona per questa riga, o null se le pagine qui non cadono.
   *
   * Sulla riga delle firme non basta che il PDF sia agganciato a una richiesta:
   * quella richiesta deve anche chiedere un foglio firme. Le altre colonne, in
   * quella riga, sono caselle vuote — e una riga che prende pagine per portarle
   * in una casella che non esiste è peggio di una riga che non le prende.
   */
  const dove = (): Consegna | null => {
    const consegna = colonnaDi(inVoloDa)
    if (!consegna) return null
    if (destinazione.tipo === 'persona') {
      // La richiesta deve riguardare *questa* persona. Se non la riguarda, la
      // matrice le disegna una casella vuota senza `data-consegna`: la riga si
      // accendeva lo stesso e le pagine ci finivano dentro, archiviate su una
      // consegna che a quella persona non era mai stata chiesta.
      const sua =
        consegna.a === 'classe' || consegna.allieviIds.includes(destinazione.allievoId)
      return sua ? consegna : null
    }
    return consegna.verso === 'consegno' && consegna.firmeRichieste ? consegna : null
  }

  /** La casella che prenderà davvero le pagine: si accende con la riga. */
  const casella = (consegna: Consegna | null): HTMLElement | null =>
    consegna
      ? riga.querySelector<HTMLElement>(`[data-consegna="${CSS.escape(consegna.id)}"]`)
      : null

  const acceso = (attivo: boolean, consegna: Consegna | null) => {
    riga.classList.toggle(RIGA_BERSAGLIO, attivo)
    casella(consegna)?.classList.toggle(CASELLA_BERSAGLIO, attivo)
  }

  riga.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    const consegna = dove()
    // Senza colonna non si prende: il cursore resta quello del divieto, ed è il
    // modo in cui la riga dice «qui no, mira la casella» prima del rilascio e
    // non dopo.
    if (!consegna) return
    evento.preventDefault()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true, consegna)
  })
  // Si spegne quando il puntatore esce davvero dalla riga, e non ogni volta che
  // passa da una cella all'altra: `dragleave` scatta anche entrando in un
  // figlio, e una riga che lampeggia mentre la si attraversa fa lasciare le
  // pagine un istante prima, fuori bersaglio. Chi arriva lo dice
  // `relatedTarget`, ed è più solido di un contatore — un contatore che perde
  // un'uscita resta sbilanciato per sempre.
  riga.addEventListener('dragleave', (evento: DragEvent) => {
    const verso = evento.relatedTarget
    if (verso instanceof Node && riga.contains(verso)) return
    acceso(false, dove())
  })
  riga.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    const consegna = dove()
    if (!consegna) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false, consegna)
    atterrate = true
    document.body.classList.remove(CORPO_IN_VOLO)

    const chi = destinazione.tipo === 'persona' ? destinazione.chi : 'Foglio firme'
    notifica(`${dicePagine(pagine.pagine)} → ${chi} · ${consegna.testo}: sto ritagliando…`, 'info')
    void azione(
      destinazione.tipo === 'persona'
        ? {
            tipo: 'smistamento.assegnaPagine',
            smistamentoId: pagine.smistamentoId,
            consegnaId: consegna.id,
            allievoId: destinazione.allievoId,
            pagine: pagine.pagine,
          }
        : {
            tipo: 'smistamento.assegnaFirme',
            smistamentoId: pagine.smistamentoId,
            consegnaId: consegna.id,
            pagine: pagine.pagine,
          },
    ).then((risposta) => {
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}

/**
 * Fa di una casella della matrice un posto dove lasciar cadere delle pagine.
 *
 * Il bersaglio è la cella intera della tabella e non i due pulsantini dentro:
 * si punta con il mouse un quadratino di due centimetri, e mancarlo di tre
 * pixel non deve voler dire ricominciare — erano proprio i margini della cella
 * a mangiarsi i rilasci. Quel che non porta pagine passa oltre senza che la
 * casella si accenda — un PDF trascinato dal gestore file va alla scheda «Da
 * smistare», non qui.
 *
 * Ferma l'evento, e così vince sulla riga che la contiene: mirare la casella è
 * il modo di dire «questa colonna e non quella del PDF», ed è una cosa che si
 * vuole poter dire.
 */
/**
 * Fa della casella delle firme un posto dove lasciar cadere delle pagine.
 *
 * La casella delle firme sta in cima alla matrice, sopra i nomi, e non è di
 * nessuno: è la prova di aver distribuito quel documento, e riguarda tutta la
 * colonna. Prende pagine per la stessa ragione per cui le prendono le altre
 * caselle — il foglio firme arriva nella stessa scansione di classe, spesso è
 * il primo del mucchio — e farlo passare da un dialogo mentre le sue pagine
 * sono lì da prendere voleva dire ritagliarlo altrove per rimetterlo dentro da
 * fuori.
 *
 * Ferma l'evento come le altre caselle: la riga sotto non deve prendersi delle
 * pagine che erano mirate qui.
 */
export function accettaPagineFirme (
  elemento: HTMLElement,
  destinazione: { consegnaId: string, etichetta: string },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
    spegniRiga(elemento)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    atterrate = true
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(`${dicePagine(pagine.pagine)} → ${destinazione.etichetta}: sto ritagliando…`, 'info')
    void azione({
      tipo: 'smistamento.assegnaFirme',
      smistamentoId: pagine.smistamentoId,
      consegnaId: destinazione.consegnaId,
      pagine: pagine.pagine,
    }).then((risposta) => {
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}

/**
 * Spegne il bersaglio di riga intorno a una casella che sta prendendo il
 * comando: sotto il puntatore c'è lei, ed è lei che riceverà le pagine.
 *
 * Serve perché la riga non vede passare il puntatore sopra le sue celle — la
 * cella ferma l'evento — e senza questo resterebbe accesa insieme alla casella
 * che si era scelta da sé, in una colonna che non è quella mirata.
 */
function spegniRiga (casella: HTMLElement): void {
  const riga = casella.closest('tr')
  if (!riga) return
  riga.classList.remove(RIGA_BERSAGLIO)
  for (const acceso of riga.querySelectorAll(`.${CASELLA_BERSAGLIO}`)) {
    if (acceso !== casella) acceso.classList.remove(CASELLA_BERSAGLIO)
  }
}

/**
 * Fa di una casella della matrice delle assenze un posto dove lasciar cadere
 * delle pagine.
 *
 * L'altra matrice del docente di classe, e lo stesso gesto: la scuola stampa i
 * rapporti di tutta la classe in un PDF solo, e le pagine si prendono e si
 * posano sulla casella di chi sono. La casella dice anche *che cosa* sono —
 * assenze o ritardi, vergini o firmati — e nessuno lo indovina al posto suo:
 * i due rapporti si somigliano riga per riga, e sbagliarli vorrebbe dire
 * mandare all'azienda il foglio dell'altra colonna.
 *
 * Ferma l'evento come le sue sorelle dell'archivio: quel che è mirato qui non
 * deve finire alla pagina, che è il bersaglio dei file trascinati da fuori.
 */
export function accettaPagineAssenze (
  elemento: HTMLElement,
  destinazione: {
    classeId: string
    bloccoId: string
    allievoId: string
    genere: TipoRapporto
    firmato: boolean
    etichetta: string
  },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    atterrate = true
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(`${dicePagine(pagine.pagine)} → ${destinazione.etichetta}: sto ritagliando…`, 'info')
    void azione({
      tipo: 'smistamento.assegnaAssenze',
      smistamentoId: pagine.smistamentoId,
      classeId: destinazione.classeId,
      bloccoId: destinazione.bloccoId,
      allievoId: destinazione.allievoId,
      genere: destinazione.genere,
      firmato: destinazione.firmato,
      pagine: pagine.pagine,
    }).then((risposta) => {
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}

export function accettaPagine (
  elemento: HTMLElement,
  destinazione: { consegnaId: string, allievoId: string, etichetta: string },
): void {
  const acceso = (attivo: boolean) => elemento.classList.toggle(CASELLA_BERSAGLIO, attivo)

  elemento.addEventListener('dragover', (evento: DragEvent) => {
    if (!portaPagine(evento)) return
    evento.preventDefault()
    evento.stopPropagation()
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy'
    acceso(true)
    // Sotto il puntatore c'è una casella, e comanda lei: la riga che la contiene
    // si spegne, insieme alla casella che la riga aveva acceso. Due bersagli
    // accesi in due colonne diverse direbbero due cose, e una sarebbe falsa.
    spegniRiga(elemento)
  })
  elemento.addEventListener('dragleave', () => acceso(false))
  elemento.addEventListener('drop', (evento: DragEvent) => {
    const pagine = carico(evento)
    if (!pagine) return
    evento.preventDefault()
    evento.stopPropagation()
    acceso(false)
    atterrate = true
    document.body.classList.remove(CORPO_IN_VOLO)

    notifica(`${dicePagine(pagine.pagine)} → ${destinazione.etichetta}: sto ritagliando…`, 'info')
    void azione({
      tipo: 'smistamento.assegnaPagine',
      smistamentoId: pagine.smistamentoId,
      consegnaId: destinazione.consegnaId,
      allievoId: destinazione.allievoId,
      pagine: pagine.pagine,
    }).then((risposta) => {
      // Le pagine archiviate non sono più da scegliere: lasciarle accese
      // vorrebbe dire ritrovarsele nel prossimo trascinamento, e archiviarle
      // due volte. Quel che non è riuscito resta scelto, così si riprova
      // altrove senza doverle ripescare.
      if (risposta.ok) aggiorna({ pagineScelte: null })
    })
  })
}
