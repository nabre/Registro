// I mattoni della pagina Documenti: un foglio, la sua riga, i suoi gesti.
//
// Qui sta quel che ogni riquadro rifà uguale — trovare il file nella cartella,
// dire se c'è, aprirlo, rifarlo, buttarlo via, spuntarlo — e il registro delle
// righe disegnate, da cui escono le tre cose che riguardano più righe insieme:
// il conto in testa a ogni scheda, la casella che le spunta tutte, e l'ordine
// in cui l'anteprima le scorre.
//
// Chi disegna i riquadri sta in `cards.ts` e non sa niente di tutto questo:
// dichiara un nome, un foglio e l'azione che lo rifà.

import {
  collocazioneDi,
  percorsoDi,
  radiceDi,
  type ContestoRapporto,
  type GenereRapporto,
} from '../../../domain/locations.js'
import { dataDalNome, formattaData } from '../../../domain/dates.js'
import { pulsante, quantoMisura, scheda } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { h, type Figlio } from '../../dom.js'
import { azione } from '../../bridge.js'
import type { Azione } from '../../../protocol.js'
import { aggiorna, sceltiPresenti, stato } from '../../state.js'

/**
 * Un documento come lo vede questa pagina: dove dovrebbe stare, e che cosa c'è
 * davvero in quel posto.
 *
 * Il percorso atteso lo dice il dominio, che è anche quel che lo scrive: qui
 * non si compone nessun nome, si guarda l'inventario che arriva con lo stato.
 */
export interface Foglio {
  /** Il file trovato nella cartella, o `null` se quel foglio non c'è. */
  trovato: string | null
  misura: number
  /**
   * Quante volte l'host lo ha riscritto da quando l'anno è aperto.
   *
   * Serve alla cornice: un rapporto rifatto sta allo stesso percorso di prima,
   * e senza un numero che cambia il lettore di PDF mostrerebbe la copia che ha
   * già in memoria.
   */
  revisione: number
}

const MANCA: Foglio = { trovato: null, misura: 0, revisione: 0 }

/** Il foglio che sta a un percorso preciso, o `MANCA` se là non c'è niente. */
export function fileEsportato (percorso: string): Foglio {
  const voce = stato.esportati.find((e) => e.percorso === percorso)
  return voce ? { trovato: voce.percorso, misura: voce.misura, revisione: voce.revisione } : MANCA
}

/**
 * Una riga che la pagina ha appena disegnato: il suo foglio e i suoi gesti.
 *
 * Da qui si ricavano tutte e tre le cose che riguardano più righe insieme: il
 * conto in testa a ogni scheda («18 di 24 nella cartella»), la casella che le
 * spunta tutte, e l'ordine in cui l'anteprima scorre i documenti. Erano tre
 * elenchi dichiarati a parte, ognuno ricalcolato per conto suo, e bastava che
 * una scheda cambiasse contenuto perché uno dei tre dicesse un'altra cosa.
 */
export interface Riga {
  foglio: Foglio
  /** Come si chiama il foglio quando lo si nomina: «la scheda di Rossi Mario». */
  nome: string
  /** L'azione che lo rifà, o `null` per un foglio che nessuno sa più rifare. */
  rifai: Azione | null
  /** Perché adesso non si può rifare, o `null` se si può. */
  bloccato: string | null
  /**
   * Come si butta via, quando togliere il file non basta: se ne va con la riga
   * perché il cestino non sta solo lì — c'è anche quello in testa alla cornice,
   * e una composizione buttata via da lì deve perdere anche la sua ricetta.
   */
  butta: (() => Promise<void> | void) | null
}

/**
 * Le righe disegnate in questo giro, nell'ordine in cui compaiono.
 *
 * Si riempie mentre la vista si disegna — ogni riga e ogni cella ci si
 * annuncia — e si svuota all'inizio di ogni ridisegno.
 */
let disegnate: Riga[] = []

/** Dimentica le righe del giro di prima: la pagina lo fa prima di disegnare. */
export function azzeraRighe (): void {
  disegnate = []
}

/**
 * Quelle che si possono aprire nella cornice: è l'elenco che l'anteprima
 * scorre con le frecce.
 *
 * Ci stanno i PDF e i CSV — i primi nel lettore di Chromium, i secondi come
 * tabella disegnata dalla pagina — e non ci stanno i fogli ancora da fare: si
 * scorre quel che si può guardare, non quel che si potrebbe fare.
 */
export function apribili (righe: Riga[] = disegnate): Riga[] {
  return righe.filter((riga) => riga.foglio.trovato !== null && guardabile(riga.foglio.trovato))
}

/**
 * Se un documento si può guardare nella cornice.
 *
 * Le due estensioni non si guardano allo stesso modo — un PDF si inquadra, un
 * CSV si legge e si disegna — ma la domanda è una sola, e la fanno in quattro:
 * l'elenco che le frecce scorrono, la lente, quel che succede dopo aver rifatto
 * un foglio, e la cornice che deve scegliere che cosa mettere dentro.
 */
export function guardabile (percorso: string): boolean {
  return percorso.endsWith('.pdf') || percorso.endsWith('.csv')
}

/**
 * Quelli che si possono mettere in una composizione: i PDF, e basta.
 *
 * Non è lo stesso elenco di `apribili`, e da quando anche i CSV si guardano qui
 * dentro la differenza si vede: una composizione è un PDF con dentro le pagine
 * degli altri, e un foglio di calcolo non ha pagine da metterci. La casella
 * «tutti» in testa a una scheda e il Maiusc+clic che spunta un intervallo
 * leggono questo, o spunterebbero fogli che l'host scarta in silenzio — e
 * «combina i 5 scelti» ne combinerebbe tre.
 */
function combinabili (righe: Riga[] = disegnate): Riga[] {
  return apribili(righe).filter((riga) => riga.foglio.trovato?.endsWith('.pdf'))
}

/**
 * I documenti spuntati nell'ordine in cui vanno in fila dentro una composizione.
 *
 * È l'ordine in cui la pagina li elenca, non quello in cui si sono cliccati.
 * La differenza si vede una volta su due: si spunta la scheda in fondo, poi una
 * in mezzo, e la composizione usciva con quella in fondo per prima. Chi la
 * consegna si aspetta l'ordine che ha davanti agli occhi — che per le schede
 * di una classe è l'ordine alfabetico, e per i verbali quello delle date.
 *
 * Le spunte attraversano le tre schede della pagina, e di quelle che stanno
 * altrove qui non si conosce la riga: restano in coda, nell'ordine in cui sono
 * state scelte. È l'unico ordine che si può sapere di un foglio che non si sta
 * guardando, e la modale mostra l'elenco intero prima di comporre — così quel
 * che esce non è mai una sorpresa.
 */
export function sceltiInOrdine (): Array<{ percorso: string, nome: string }> {
  const scelti = sceltiPresenti()
  const inPagina = new Map<string, string>()
  for (const riga of apribili()) {
    const percorso = riga.foglio.trovato as string
    if (!inPagina.has(percorso) && scelti.includes(percorso)) inPagina.set(percorso, riga.nome)
  }
  return [
    ...[...inPagina].map(([percorso, nome]) => ({ percorso, nome })),
    ...scelti
      .filter((percorso) => !inPagina.has(percorso))
      .map((percorso) => ({ percorso, nome: nomeDelFile(percorso) })),
  ]
}

/** Come si chiama un foglio di cui si ha solo il percorso: il nome del file. */
function nomeDelFile (percorso: string): string {
  return (percorso.split('/').pop() ?? percorso).replace(/\.pdf$/i, '')
}


/**
 * Cerca nella cartella il documento di un rapporto.
 *
 * Due modi di cercare, e la differenza la dichiara il dominio. Quasi tutti i
 * documenti hanno un nome che sta fermo — il periodo, la data della lezione —
 * e si cercano per nome esatto. Fascicolo e parete di ritratti portano invece
 * nel nome il giorno in cui sono stati fatti: quello di ieri esiste con un
 * altro nome, e cercarlo per nome esatto direbbe che non c'è. Per quelli si
 * guarda il prefisso e si prende l'ultimo, che in un nome `aammgg` è anche il
 * più recente.
 */
export function foglio (
  genere: GenereRapporto,
  id: string,
  contesto: ContestoRapporto = {},
  estensione = 'pdf',
): Foglio {
  const dove = collocazioneDi(stato.registro, genere, id, {
    semestreId: stato.semestreId,
    ...contesto,
  })
  if (!dove) return MANCA

  if (!dove.datato) return fileEsportato(percorsoDi(dove, estensione))

  const radice = radiceDi(dove)
  const suoi = stato.esportati
    .filter((e) => e.percorso.startsWith(radice) && e.percorso.endsWith(`.${estensione}`))
    .sort((a, b) => a.percorso.localeCompare(b.percorso))
  const ultimo = suoi[suoi.length - 1]
  return ultimo
    ? { trovato: ultimo.percorso, misura: ultimo.misura, revisione: ultimo.revisione }
    : MANCA
}

/**
 * Il giorno che un documento datato porta nel nome, scritto come tutte le date
 * del registro.
 *
 * Solo il fascicolo e la parete di ritratti ce l'hanno: sono i due fogli che si
 * rifanno con un nome nuovo invece di coprire quello di prima, e la loro riga
 * dice di quando è la copia che sta nella cartella — che per quei due è più
 * utile di quanto misurano.
 */
export function quandoFattoIl (percorso: string): string | null {
  const giorno = dataDalNome(percorso)
  return giorno ? formattaData(giorno) : null
}

/**
 * Guarda un documento: nella cornice qui accanto, o con il programma del
 * sistema quando la cornice non lo saprebbe mostrare.
 *
 * Un documento guardato qui non porta da nessuna parte, e il gesto si fa venti
 * volte di fila — «questa scheda è quella che voglio dare?»: ogni volta che
 * portava fuori dal registro, o anche solo in un'altra finestra, si perdeva il
 * filo di dov'era arrivati.
 *
 * Vale per i PDF e per i CSV. I secondi ci sono arrivati dopo, e non perché
 * siano diventati inquadrabili — il lettore di PDF non saprebbe che farne — ma
 * perché la pagina li sa leggere e disegnare come tabella. Per *lavorarci*
 * resta il foglio di calcolo, che si apre dal pulsante in testa alla cornice.
 */
function guarda (percorso: string | null): Promise<unknown> | void {
  if (!percorso) return
  if (guardabile(percorso)) {
    aggiorna({ anteprima: percorso })
    return
  }
  return azione({ tipo: 'esportazione.apri', percorso })
}

/**
 * Rifà un documento e lo fa vedere.
 *
 * Sono lo stesso gesto: si rifà un foglio perché il registro è cambiato, e la
 * domanda subito dopo è «com'è venuto». Prima l'host apriva il programma del
 * sistema — una finestra per foglio, e la cornice della pagina restava ferma su
 * quello di prima proprio mentre lo si stava rifacendo.
 *
 * Il percorso lo dice l'host: il nome di un rapporto porta dentro il periodo o
 * il giorno, e ricomporlo qui sarebbe la stessa regola scritta due volte. Quel
 * che la cornice non sa mostrare — un verbale in testo, un allegato qualunque —
 * resta com'era: lo apre il programma in cui si legge davvero.
 */
export async function rifaiEGuarda (comando: Azione): Promise<void> {
  const risposta = await azione(comando)
  const fatto = risposta.documento
  if (!risposta.ok || !fatto || !guardabile(fatto)) return
  aggiorna({ anteprima: fatto })
}

/**
 * Che cosa si fa a un documento: guardarlo, rifarlo, buttarlo via.
 *
 * Tre gesti perché sono tre domande diverse. **Guarda** è di chi controlla che
 * cosa consegnerà — e apre il file che sta nella cartella, non quello che il
 * registro comporrebbe adesso, che è proprio la differenza che si vuole vedere.
 * **Rifai** è di chi sa che il registro è cambiato. **Butta via** è di chi
 * tiene in ordine una cartella che si consegna: la scheda di chi ha lasciato la
 * classe, le presenze di un periodo rinominato.
 *
 * Stanno a sé perché li portano due forme: le file di documenti — una riga per
 * foglio — e la matrice delle lezioni, dove la stessa terna sta in una cella.
 */
interface Gesti {
  foglio: Foglio
  /**
   * L'azione che rifà il documento, o niente quando non si può rifare.
   *
   * Manca per i PDF rimasti sotto `esportazioni/composizioni/` senza il loro
   * elenco: il file c'è, ma di che cosa fosse fatto non lo sa più nessuno, e un
   * pulsante «rifai» che rifarebbe un'altra cosa è peggio di un pulsante
   * spento. Si guardano e si buttano via, che è tutto quel che resta da fare.
   */
  rifai?: Azione
  /** Come si chiama il foglio quando lo si nomina: nei titoli e nella domanda. */
  nome: string
  /**
   * Perché adesso non si può rifare, o `null` se si può.
   *
   * Serve alle ore non ancora concluse: il verbale di un'ora che non si è
   * svolta esce vuoto — nessun appello, nessun consuntivo — e un foglio vuoto
   * nella cartella si consegna per sbaglio.
   */
  bloccato?: string | null
  /** Un gesto in più che vale solo per questo documento, in coda agli altri. */
  altro?: Figlio
  /**
   * Come si butta via, quando non basta togliere il file.
   *
   * Una composizione è due cose — il PDF e la ricetta che dice di che cosa è fatta
   * — e cancellarne una sola lascerebbe l'altra a dire il falso: un elenco che
   * nomina un PDF che non c'è, o un PDF che nessuno sa più rifare.
   */
  butta?: () => Promise<void> | void
}

/**
 * Butta via un documento, dopo averlo chiesto.
 *
 * Sta a sé perché lo chiedono in due: il cestino della riga e quello in testa
 * all'anteprima — si guarda un foglio, si vede che non ha più motivo di stare
 * lì, e lo si toglie da dove lo si sta guardando. La cornice si spegne se
 * stava mostrando proprio quello: una cornice puntata su un file appena
 * cancellato è peggio di una cornice vuota.
 */
export async function buttaVia (percorso: string | null, nome: string): Promise<void> {
  if (!percorso) return
  const sicuro = await conferma({
    titolo: `Buttare via ${nome}?`,
    testo:
      'Va via solo il file nella cartella delle esportazioni: i dati restano nel ' +
      'registro, e il documento si rifà quando serve.',
    testoConferma: 'Butta via',
    pericolo: true,
  })
  if (!sicuro) return
  const risposta = await azione({ tipo: 'esportazione.elimina', percorso })
  if (risposta.ok && stato.anteprima === percorso) aggiorna({ anteprima: null })
}

// ------------------------------------------------------------- la scelta

/**
 * L'ultimo documento spuntato: serve alla scelta a intervallo.
 *
 * Con Maiusc si sceglie da lì fino a dove si preme, come in ogni elenco di
 * file. Vive qui e non nello stato perché non è una cosa che si guarda — è il
 * ricordo di un gesto, e un ridisegno non deve farlo perdere.
 */
let ultimaScelta: string | null = null

function scelto (percorso: string | null): boolean {
  return percorso !== null && stato.documentiScelti.includes(percorso)
}

/** Spunta o toglie la spunta a un documento. */
function alterna (percorso: string): void {
  const scelti = scelto(percorso)
    ? stato.documentiScelti.filter((p) => p !== percorso)
    : [...stato.documentiScelti, percorso]
  ultimaScelta = scelti.includes(percorso) ? percorso : null
  aggiorna({ documentiScelti: scelti })
}

/**
 * Spunta tutto quel che sta fra l'ultimo scelto e questo, nell'ordine in cui la
 * pagina li elenca.
 *
 * Senza un ultimo scelto vale come una spunta normale: è il primo gesto, e non
 * c'è ancora nessun intervallo.
 */
function scegliFino (percorso: string): void {
  const elenco = combinabili()
  const da = ultimaScelta ? elenco.findIndex((r) => r.foglio.trovato === ultimaScelta) : -1
  const a = elenco.findIndex((r) => r.foglio.trovato === percorso)
  if (da < 0 || a < 0) {
    alterna(percorso)
    return
  }
  const dentro = elenco
    .slice(Math.min(da, a), Math.max(da, a) + 1)
    .map((r) => r.foglio.trovato as string)
  ultimaScelta = percorso
  aggiorna({ documentiScelti: [...new Set([...stato.documentiScelti, ...dentro])] })
}

/**
 * La casella con cui un documento entra in una composizione.
 *
 * Una casella e non un gesto nascosto dietro un tasto: unire venti schede è il
 * lavoro di fine semestre di chi non usa il registro tutti i giorni, e un
 * Ctrl+clic che nessuno ha mai visto è una funzione che non esiste. Il tasto
 * c'è lo stesso — Ctrl per una riga, Maiusc per un intervallo — per chi ne
 * spunta venticinque di fila.
 *
 * Dove non c'è niente da scegliere resta il suo posto vuoto: le caselle di una
 * colonna devono restare incolonnate, anche quando un foglio non c'è ancora.
 */
function spunta (foglio: Foglio, nome: string): Figlio {
  const percorso = foglio.trovato
  if (!percorso || !percorso.endsWith('.pdf')) {
    return h('span', { class: 'documenti__spunta documenti__spunta--vuota' })
  }
  return h('input', {
    class: 'documenti__spunta',
    type: 'checkbox',
    checked: scelto(percorso),
    attr: { title: `Metti ${nome} nella composizione da guardare unita` },
    onchange: () => alterna(percorso),
  })
}

/** Vero quando il file di questa riga è quello aperto nella cornice. */
function aperto (foglio: Foglio): boolean {
  return foglio.trovato !== null && foglio.trovato === stato.anteprima
}

/**
 * Segna una riga fra quelle che la pagina sta mostrando.
 *
 * Lo fanno le righe e le celle mentre si disegnano, tutte: anche quelle di un
 * foglio che non c'è ancora, perché è da lì che esce il «18 di 24» in testa
 * alla scheda.
 */
function annuncia (opzioni: Gesti): void {
  disegnate.push({
    foglio: opzioni.foglio,
    nome: opzioni.nome,
    rifai: opzioni.rifai ?? null,
    bloccato: opzioni.bloccato ?? null,
    butta: opzioni.butta ?? null,
  })
}

/** Lo stato del file e i tre pulsanti, nell'ordine in cui si usano. */
function gestiFoglio (opzioni: Gesti): Figlio[] {
  const { trovato, misura } = opzioni.foglio
  const giorno = trovato ? quandoFattoIl(trovato) : null
  annuncia(opzioni)

  return [
    // Lo stato del file prima dei pulsanti: un punto, non una parola.
    //
    // La pastiglia diceva «124 kB» o «da fare» in ogni riga, e in una colonna
    // di venticinque righe erano venticinque etichette da leggere per trovare
    // l'unica che conta. Un punto pieno e uno vuoto si contano con l'occhio
    // senza leggerli; la misura e il giorno restano nel titolo, e in testa alla
    // cornice per il foglio che si sta guardando.
    h('span', {
      class: ['documenti__punto', trovato ? 'documenti__punto--pronto' : 'documenti__punto--manca'],
      attr: {
        role: 'img',
        'aria-label': trovato
          ? `nella cartella, ${giorno ? `del ${giorno}` : quantoMisura(misura)}`
          : 'da fare',
        title: trovato
          ? `Nella cartella · ${giorno ? `del ${giorno}` : quantoMisura(misura)}`
          : 'Non è ancora nella cartella',
      },
    }),
    pulsante({
      simbolo: 'lente',
      variante: 'fantasma',
      // Il pulsante di quel che si sta già guardando resta acceso: in una
      // colonna di venticinque lenti uguali, è il segno che dice a quale riga
      // appartiene il foglio nella cornice.
      classe: aperto(opzioni.foglio) ? 'pulsante--minuto pulsante--acceso' : 'pulsante--minuto',
      titolo: !trovato
        ? `${opzioni.nome} non è ancora nella cartella: prima si aggiorna`
        : aperto(opzioni.foglio)
          ? `${opzioni.nome} è quello aperto qui accanto`
          : guardabile(trovato)
            ? `Guarda ${opzioni.nome} qui dentro, come sta nella cartella`
            : `Apre ${opzioni.nome} con il programma del sistema`,
      disabilitato: !trovato,
      al: () => guarda(trovato),
    }),
    pulsante({
      simbolo: trovato ? 'ricarica' : 'esporta',
      variante: 'fantasma',
      classe: 'pulsante--minuto',
      titolo:
        opzioni.bloccato ??
        (trovato
          ? `Rifà ${opzioni.nome} e mostra il foglio qui accanto`
          : `Fa ${opzioni.nome} e mostra il foglio qui accanto`),
      // Un documento che adesso non ha senso fare tiene il suo pulsante, spento,
      // e dice perché nel titolo: è la stessa regola della riga delle azioni —
      // nascondere il gesto non risponde mai alla domanda «perché non posso».
      disabilitato: Boolean(opzioni.bloccato) || !opzioni.rifai,
      al: () => (opzioni.rifai ? rifaiEGuarda(opzioni.rifai) : undefined),
    }),
    pulsante({
      simbolo: 'cestino',
      variante: 'fantasma',
      // Si vede quando la riga è sotto il puntatore o ha il fuoco: è il gesto
      // che in una colonna di venticinque righe si preme una volta l'anno, e
      // venticinque cestini accesi sono venticinque inviti a sbagliare.
      classe: 'pulsante--minuto documenti__gesto-raro',
      titolo: `Butta via ${opzioni.nome} dalla cartella`,
      disabilitato: !trovato && !opzioni.butta,
      al: () => opzioni.butta?.() ?? buttaVia(trovato, opzioni.nome),
    }),
    opzioni.altro ?? null,
  ]
}

/**
 * Il clic che apre il documento di una riga, ovunque lo si dia.
 *
 * Una riga è alta come una riga e la lente è larga due centimetri: mirarla
 * venticinque volte di fila è una fatica che non serve a niente, perché in
 * quella riga non c'è nient'altro da aprire. I pulsanti restano quel che sono —
 * un clic sopra uno di loro è suo, non della riga — e la lente resta il gesto
 * che i lettori di schermo annunciano.
 */
function alClicSullaRiga (opzioni: Gesti): (evento: MouseEvent) => void {
  return (evento) => {
    const percorso = opzioni.foglio.trovato
    if (!percorso) return
    const dentro = evento.target as HTMLElement | null
    if (dentro?.closest('button') || dentro?.closest('input')) return
    // Con Ctrl si spunta, con Maiusc si spunta fino a qui: sono i tasti di
    // tutti gli elenchi di file, e chi ne sceglie venticinque di fila li ha
    // già nelle mani.
    if (evento.shiftKey && percorso.endsWith('.pdf')) {
      // La selezione del testo che il Maiusc porta con sé: qui è solo rumore.
      document.getSelection()?.removeAllRanges()
      scegliFino(percorso)
      return
    }
    if ((evento.ctrlKey || evento.metaKey) && percorso.endsWith('.pdf')) {
      alterna(percorso)
      return
    }
    void guarda(percorso)
  }
}

/** Una riga di documento in una fila: il nome, come sta, i gesti. */
export function rigaFoglio (
  opzioni: Gesti & {
    etichetta: Figlio
    /** Pastiglie che riguardano il contenuto, non il file: «annullata», «nessun voto». */
    segni?: Figlio
  },
): HTMLElement {
  const gesti = gestiFoglio(opzioni)
  const suo = opzioni.foglio.trovato

  return h(
    'li',
    {
      class: [
        'documenti__riga',
        Boolean(suo) && 'documenti__riga--apribile',
        aperto(opzioni.foglio) && 'documenti__riga--aperta',
        scelto(suo) && 'documenti__riga--scelta',
      ],
      // Per chi naviga con la tastiera e per i lettori di schermo: la riga
      // aperta è quella corrente dell'elenco, come la pagina corrente di una
      // paginazione.
      attr: { 'aria-current': aperto(opzioni.foglio) ? 'true' : null },
      onclick: alClicSullaRiga(opzioni),
    },
    spunta(opzioni.foglio, opzioni.nome),
    opzioni.etichetta,
    opzioni.segni ?? null,
    ...gesti,
  )
}

/**
 * La stessa terna dentro una cella di matrice.
 *
 * Senza nome sopra: in una matrice la riga dice già di che ora si parla, e il
 * titolo del piano ripetuto in ogni cella allungava le righe senza aggiungere
 * niente a quel che si cerca qui, che è se il foglio c'è.
 */
export function cellaFoglio (opzioni: Gesti): HTMLElement {
  const gesti = gestiFoglio(opzioni)

  return h(
    'td',
    {
      class: [
        'documenti__cella',
        Boolean(opzioni.foglio.trovato) && 'documenti__cella--apribile',
        aperto(opzioni.foglio) && 'documenti__cella--aperta',
        scelto(opzioni.foglio.trovato) && 'documenti__cella--scelta',
      ],
      attr: { 'aria-current': aperto(opzioni.foglio) ? 'true' : null },
      onclick: alClicSullaRiga(opzioni),
    },
    h('div', { class: 'documenti__gesti' }, spunta(opzioni.foglio, opzioni.nome), ...gesti),
  )
}

/**
 * Come si chiama un documento, dentro la sua riga o la sua cella.
 *
 * Un testo e non un collegamento, ed è voluto: qui si gestiscono le
 * esportazioni e nient'altro. I nomi portavano alle pagine dell'oggetto — la
 * data all'ora, il nome alla scheda personale — e quel clic faceva uscire dalla
 * pagina proprio chi stava mettendo insieme una consegna di venti fogli, che è
 * il lavoro più facile da perdere a metà. Alle pagine si va dalla barra
 * laterale, che è dove si va a cercare quando si vuole andare da qualche parte.
 *
 * Premerlo però fa qualcosa, perché lo fa la riga intera: apre il documento
 * nella cornice accanto. È l'unica cosa che in quella riga si può aprire, e
 * mirare la lente venticinque volte di fila era una fatica che non pagava
 * niente.
 */
export function nome (testo: string): HTMLElement {
  return h('span', { class: 'documenti__nome' }, testo)
}

/**
 * Una scheda di documenti, con in testa quel che si fa ai suoi fogli insieme.
 *
 * Il contenuto arriva come funzione e non come valore, ed è il punto: è
 * disegnandolo che ogni riga si annuncia in `disegnate`, e solo dopo si sa
 * quali fogli sono di questa scheda — che è quel che serve al conto in testa e
 * alla casella «tutti». Passandolo già fatto, la testata parlerebbe sempre dei
 * fogli della scheda di prima.
 */
export function schedaDiFogli (opzioni: {
  titolo: string
  /**
   * Che cosa c'è in questa scheda, in una riga.
   *
   * È una funzione perché la risposta arriva dalle righe: il «18 di 24 nella
   * cartella» lo sanno loro, e le si conosce solo dopo averle disegnate.
   */
  sottotitolo?: (suoi: Riga[]) => string
  contenuto: () => Figlio
}): HTMLElement {
  const inizio = disegnate.length
  const contenuto = opzioni.contenuto()
  const suoi = disegnate.slice(inizio)

  return scheda({
    titolo: opzioni.titolo,
    sottotitolo: opzioni.sottotitolo?.(suoi),
    azioni: casellaDiScheda(suoi),
    contenuto,
  })
}

/**
 * La casella «tutti» in testa a una scheda.
 *
 * Sta qui e non nella riga delle azioni perché è qui che si sceglie: le caselle
 * sono nelle righe sotto, e quella che le spunta tutte deve stare incolonnata
 * con loro. Quel che poi si fa con le spunte — combinarle in una composizione — è
 * un comando, perché chiede un nome e vale per tutta la pagina: le spunte
 * attraversano le tre schede, e una composizione può mettere insieme il verbale di
 * un'ora e la scheda di una persona.
 */
function casellaDiScheda (suoi: Riga[]): Figlio {
  const percorsi = combinabili(suoi).map((riga) => riga.foglio.trovato as string)
  if (percorsi.length === 0) return null
  const quanti = percorsi.filter((percorso) => scelto(percorso)).length
  const tutti = quanti === percorsi.length

  return h('input', {
    class: 'documenti__spunta',
    type: 'checkbox',
    checked: tutti,
    // A metà strada la casella lo dice: tre su venticinque non è «nessuno» e
    // non è «tutti», e una casella vuota direbbe la prima cosa.
    indeterminate: quanti > 0 && !tutti,
    attr: {
      title: tutti
        ? 'Togli la spunta a tutti i fogli di questa scheda'
        : `Spunta i ${percorsi.length} fogli di questa scheda`,
    },
    onchange: () => {
      ultimaScelta = null
      aggiorna({
        documentiScelti: tutti
          ? stato.documentiScelti.filter((p) => !percorsi.includes(p))
          : [...new Set([...stato.documentiScelti, ...percorsi])],
      })
    },
  })
}

/**
 * Quanti fogli di una scheda stanno già nella cartella: il suo sottotitolo.
 *
 * Il conto viene dalle righe appena disegnate e non da un elenco rifatto a
 * parte: sono la stessa cosa, e contarla due volte vuol dire prima o poi
 * contarla in due modi.
 */
export function conto (cosa: string): (suoi: Riga[]) => string {
  return (suoi) => {
    if (suoi.length === 0) return cosa
    const pronti = suoi.filter((riga) => riga.foglio.trovato).length
    return `${cosa} · ${pronti} di ${suoi.length} nella cartella`
  }
}
