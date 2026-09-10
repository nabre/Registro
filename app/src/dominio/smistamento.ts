// Lo smistamento: un PDF unico per la classe che si divide da solo e va a
// finire nella consegna di ciascuno.
//
// Il documento che arriva dalla segreteria è quasi sempre uno: le pagelle di
// tutta la classe in un file, i certificati stampati in blocco, i moduli
// firmati scansionati di seguito. Chi insegna li riceve così e li deve spezzare
// a mano — aprire, ritagliare, salvare col nome giusto, venticinque volte. Qui
// quel lavoro lo fa il registro: legge il testo di ogni pagina, cerca chi ci è
// nominato, e taglia.
//
// Il modulo è puro apposta. Il taglio del PDF, la lettura del testo e l'OCR
// stanno fuori — `dati/pdf.ts`, `dati/ocr.ts` — e qui arriva soltanto quel che
// si è letto, pagina per pagina. Così la regola con cui si decide a chi va una
// pagina si prova con `node --test`, senza un PDF vero in giro.
//
// La regola è una sola, ed è quella che rispecchia come i documenti sono fatti:
// una pagina che nomina qualcuno apre il suo blocco, le pagine che seguono
// senza nominare nessuno appartengono allo stesso blocco. Un documento di tre
// pagine col nome solo in testa si tiene insieme; una pagina che non nomina
// nessuno e non ha nessuno prima non si sa di chi sia, e va in quarantena.

import { nomeCompleto } from './calcoli.js'
import { PIF } from './lessico.js'
import { contieneParola, normalizzaTesto } from './testo.js'
import type {
  Allievo,
  BloccoDaSmistare,
  Classe,
  Consegna,
  MotivoQuarantena,
  Smistamento,
} from './modelli.js'

/** Da quanto in su una proposta diventa un'assegnazione fatta senza chiedere. */
export const FIDUCIA_SUFFICIENTE = 0.7

/**
 * Quanto deve staccare il primo dal secondo perché la pagina non sia ambigua.
 * Due fratelli con lo stesso cognome in classe sono il caso da cui questa
 * soglia difende: il cognome li trova tutti e due, e tirare a indovinare
 * vorrebbe dire mettere la pagella di uno nel fascicolo dell'altro.
 */
const STACCO_MINIMO = 0.2

/**
 * Il testo ridotto a quel che serve per confrontarlo: minuscolo, senza accenti,
 * senza punteggiatura, con gli spazi normalizzati.
 *
 * Gli accenti se ne vanno da tutte e due le parti — dal testo del PDF e dai nomi
 * in anagrafica — perché la segreteria stampa «Muller» dove il registro scrive
 * «Müller» abbastanza spesso da non poterci contare.
 */
export function normalizzaPerRicerca (testo: string): string {
  return normalizzaTesto(testo)
}

/** Una chiave da cercare nel testo di una pagina, con quanto vale trovarla. */
interface Chiave {
  testo: string
  allievoId: string
  fiducia: number
}

export interface IndiceNomi {
  chiavi: Chiave[]
}

/**
 * L'indice con cui si cercano gli allievi nel testo di una pagina.
 *
 * Le chiavi sono tre, di valore decrescente: nome e cognome insieme — nei due
 * ordini, perché nessuno sa in che ordine li stampi il gestionale della
 * segreteria — poi il cognome da solo, poi il nome da solo. Le ultime due
 * valgono soltanto se in classe non c'è nessun altro a portarle: «Rossi» in una
 * classe con due Rossi non identifica nessuno, e va tolto invece di lasciarlo
 * decidere al caso.
 */
export function indiceNomi (allievi: Allievo[]): IndiceNomi {
  const attivi = allievi.filter((a) => a.attivo)
  const conta = (estrai: (a: Allievo) => string) => {
    const conteggio = new Map<string, number>()
    for (const allievo of attivi) {
      const chiave = normalizzaPerRicerca(estrai(allievo))
      if (chiave) conteggio.set(chiave, (conteggio.get(chiave) ?? 0) + 1)
    }
    return conteggio
  }
  const cognomi = conta((a) => a.cognome)
  const nomi = conta((a) => a.nome)

  const chiavi: Chiave[] = []
  for (const allievo of attivi) {
    const cognome = normalizzaPerRicerca(allievo.cognome)
    const nome = normalizzaPerRicerca(allievo.nome)
    if (cognome && nome) {
      chiavi.push({ testo: `${cognome} ${nome}`, allievoId: allievo.id, fiducia: 1 })
      chiavi.push({ testo: `${nome} ${cognome}`, allievoId: allievo.id, fiducia: 1 })
    }
    if (cognome && cognomi.get(cognome) === 1) {
      chiavi.push({ testo: cognome, allievoId: allievo.id, fiducia: 0.8 })
    }
    if (nome && nomi.get(nome) === 1) {
      chiavi.push({ testo: nome, allievoId: allievo.id, fiducia: 0.5 })
    }
  }
  // Le chiavi lunghe per prime: «rossi mario» vale più di «rossi», e su una
  // pagina che contiene tutte e due deve vincere la prima.
  chiavi.sort((a, b) => b.testo.length - a.testo.length)
  return { chiavi }
}

export interface Riconoscimento {
  allievoId: string | null
  fiducia: number
  /** Vero quando due allievi diversi se la giocano: meglio chiedere. */
  ambiguo: boolean
  /** Il pezzo di testo che ha deciso, per chi deve controllare a mano. */
  trovato: string
}

const NESSUNO: Riconoscimento = { allievoId: null, fiducia: 0, ambiguo: false, trovato: '' }

/** Chi è nominato in questo testo, e quanto ci si può contare. */
export function riconosci (testo: string, indice: IndiceNomi): Riconoscimento {
  const pagina = normalizzaPerRicerca(testo)
  if (!pagina) return { ...NESSUNO }

  const migliori = new Map<string, { fiducia: number, trovato: string }>()
  for (const chiave of indice.chiavi) {
    // Per parola intera, non per sottostringa: «Conti» non sta dentro
    // «acconti» e «Rossi» non sta dentro «Grossi». Un cognome da solo vale
    // abbastanza da assegnare senza chiedere, e un pezzo di un'altra parola
    // manderebbe le assenze di uno all'azienda di un altro.
    if (!contieneParola(pagina, chiave.testo)) continue
    const gia = migliori.get(chiave.allievoId)
    if (!gia || gia.fiducia < chiave.fiducia) {
      migliori.set(chiave.allievoId, { fiducia: chiave.fiducia, trovato: chiave.testo })
    }
  }

  const classifica = [...migliori.entries()].sort((a, b) => b[1].fiducia - a[1].fiducia)
  const primo = classifica[0]
  if (!primo) return { ...NESSUNO }
  const secondo = classifica[1]
  const ambiguo = secondo !== undefined && primo[1].fiducia - secondo[1].fiducia < STACCO_MINIMO

  return {
    allievoId: primo[0],
    fiducia: ambiguo ? Math.min(primo[1].fiducia, FIDUCIA_SUFFICIENTE - 0.01) : primo[1].fiducia,
    ambiguo,
    trovato: primo[1].trovato,
  }
}

/** Come si è letta una pagina: dal testo del PDF, dall'OCR, o non si è letta. */
export type Lettura = 'testo' | 'ocr' | 'niente'

export interface PaginaLetta {
  /** Il numero della pagina come si conta guardandola: la prima è 1. */
  numero: number
  testo: string
  lettura: Lettura
}

/** Un pezzo di PDF con un destinatario deciso: quel che diventerà un file. */
export interface Assegnazione {
  allievoId: string
  da: number
  a: number
  fiducia: number
  /** Il testo su cui si è deciso: lo si mostra a chi deve confermare. */
  estratto: string
  lettura: Lettura
}

export interface PianoSmistamento {
  assegnazioni: Assegnazione[]
  /** Quel che va guardato a mano: pagine senza un destinatario sicuro. */
  blocchi: Array<Omit<BloccoDaSmistare, 'id'>>
}

/** Un blocco di pagine consecutive con la stessa sorte. */
interface Gruppo {
  da: number
  a: number
  allievoId: string | null
  fiducia: number
  motivo: MotivoQuarantena | null
  estratto: string
  lettura: Lettura
}

/** Quanto testo si tiene per far capire a mano che cosa c'era sulla pagina. */
const ESTRATTO_MASSIMO = 160

function estrattoDi (testo: string): string {
  const pulito = testo.replace(/\s+/g, ' ').trim()
  return pulito.length > ESTRATTO_MASSIMO ? `${pulito.slice(0, ESTRATTO_MASSIMO)}…` : pulito
}

/**
 * Le pagine raggruppate secondo la regola del nome che apre il blocco.
 *
 * Una pagina che riconosce qualcuno apre un blocco suo — o continua quello di
 * prima, se è la stessa persona. Una pagina che non riconosce nessuno si
 * attacca al blocco precedente: è la seconda facciata del documento di chi è
 * stato nominato una pagina fa. Se prima non c'era niente resta da sola: è la
 * copertina, o la prima pagina di un documento in cui il nome non si legge.
 */
function raggruppa (pagine: PaginaLetta[], indice: IndiceNomi): Gruppo[] {
  const gruppi: Gruppo[] = []

  for (const pagina of pagine) {
    const esito =
      pagina.lettura === 'niente' ? { ...NESSUNO } : riconosci(pagina.testo, indice)
    const ultimo = gruppi[gruppi.length - 1]

    // Le pagine già assegnate spariscono dall'elenco, e quel che resta ha dei
    // buchi: la 3 e la 7 non sono lo stesso documento solo perché si trovano
    // una accanto all'altra in un elenco accorciato.
    const contiguo = ultimo !== undefined && pagina.numero === ultimo.a + 1

    // Stessa persona della pagina prima: è lo stesso documento, non un altro.
    if (esito.allievoId && contiguo && ultimo && ultimo.allievoId === esito.allievoId) {
      ultimo.a = pagina.numero
      ultimo.fiducia = Math.max(ultimo.fiducia, esito.fiducia)
      if (esito.ambiguo === false && ultimo.motivo === 'ambiguo') ultimo.motivo = null
      continue
    }

    // Nessun nome: continua quel che c'era prima, se c'era qualcosa. Una pagina
    // che non si è nemmeno riusciti a leggere no: quella è un problema suo, e
    // attaccarla al documento di prima vorrebbe dire archiviare senza sapere.
    if (!esito.allievoId && pagina.lettura !== 'niente' && contiguo && ultimo && ultimo.allievoId) {
      ultimo.a = pagina.numero
      continue
    }

    gruppi.push({
      da: pagina.numero,
      a: pagina.numero,
      allievoId: esito.allievoId,
      fiducia: esito.fiducia,
      motivo: esito.allievoId
        ? esito.ambiguo
          ? 'ambiguo'
          : null
        : pagina.lettura === 'niente'
          ? 'senza-testo'
          : 'senza-nome',
      estratto: estrattoDi(pagina.testo),
      lettura: pagina.lettura,
    })
  }

  return gruppi
}

/**
 * Che cosa fare di un PDF appena arrivato: che cosa si assegna da solo, e che
 * cosa va guardato a mano.
 *
 * Non basta riconoscere il nome. Una pagina finisce comunque in quarantena se
 * chi ci è nominato non era fra quelli a cui la consegna è stata chiesta — di
 * solito vuol dire che il PDF è di un'altra classe — o se quella persona ha già
 * consegnato: sovrascrivere in silenzio un documento arrivato prima è il modo
 * più rapido di perderne uno.
 */
export function pianoSmistamento (
  pagine: PaginaLetta[],
  consegna: Consegna | null,
  classe: Classe | null,
  destinatari: string[],
  giaConsegnati: Set<string> = new Set(),
): PianoSmistamento {
  const indice = indiceNomi(classe?.allievi ?? [])
  const piano: PianoSmistamento = { assegnazioni: [], blocchi: [] }
  if (pagine.length === 0) return piano

  const attesi = new Set(destinatari)
  const presi = new Set<string>()

  for (const gruppo of raggruppa(pagine, indice)) {
    const inQuarantena = (motivo: MotivoQuarantena) => {
      piano.blocchi.push({
        da: gruppo.da,
        a: gruppo.a,
        allievoId: gruppo.allievoId,
        motivo,
        estratto: gruppo.estratto,
        fiducia: gruppo.fiducia,
        lettura: gruppo.lettura,
      })
    }

    if (!consegna) {
      inQuarantena('senza-consegna')
      continue
    }
    if (!gruppo.allievoId) {
      inQuarantena(gruppo.motivo ?? 'senza-nome')
      continue
    }
    if (gruppo.motivo === 'ambiguo' || gruppo.fiducia < FIDUCIA_SUFFICIENTE) {
      inQuarantena('ambiguo')
      continue
    }
    if (!attesi.has(gruppo.allievoId)) {
      inQuarantena('fuori-elenco')
      continue
    }
    if (giaConsegnati.has(gruppo.allievoId) || presi.has(gruppo.allievoId)) {
      inQuarantena('gia-consegnato')
      continue
    }

    presi.add(gruppo.allievoId)
    piano.assegnazioni.push({
      allievoId: gruppo.allievoId,
      da: gruppo.da,
      a: gruppo.a,
      fiducia: gruppo.fiducia,
      estratto: gruppo.estratto,
      lettura: gruppo.lettura,
    })
  }

  return piano
}

/**
 * La bozza di smistamento: un elenco solo di blocchi, proposte comprese.
 *
 * Il registro non archivia niente da solo. Riconoscere un nome su una pagina è
 * un'ipotesi — buona, ma un'ipotesi — e archiviare un documento nel fascicolo
 * sbagliato è un errore che nessuno scopre finché non serve quel documento. Qui
 * quel che si è capito diventa una riga con scritto «forse è di Rossi Mario»,
 * e la conferma è un gesto di chi guarda.
 *
 * È la stessa cosa che decide `pianoSmistamento`, detta in un'altra forma:
 * quelle che sarebbero state assegnazioni diventano blocchi «da confermare»,
 * e stanno in fila con gli altri nell'ordine delle pagine — perché chi
 * conferma legge il documento dall'inizio alla fine, non per categorie.
 */
export function bozzaSmistamento (
  pagine: PaginaLetta[],
  consegna: Consegna | null,
  classe: Classe | null,
  destinatari: string[],
  giaPresi: Set<string> = new Set(),
): Array<Omit<BloccoDaSmistare, 'id'>> {
  const piano = pianoSmistamento(pagine, consegna, classe, destinatari, giaPresi)
  const proposte: Array<Omit<BloccoDaSmistare, 'id'>> = piano.assegnazioni.map((a) => ({
    da: a.da,
    a: a.a,
    allievoId: a.allievoId,
    motivo: 'da-confermare' as const,
    estratto: a.estratto,
    fiducia: a.fiducia,
    lettura: a.lettura,
  }))
  return [...proposte, ...piano.blocchi].sort((x, y) => x.da - y.da)
}

/** Chi ha già un documento archiviato in questa richiesta. */
export function giaConsegnati (consegna: Consegna): Set<string> {
  return new Set((consegna.documenti ?? []).map((d) => d.allievoId))
}

/**
 * Vero quando non resta niente da decidere a mano: lo smistamento può sparire.
 * Un PDF che non si è nemmeno riusciti ad aprire non è esaurito: non ha
 * blocchi perché non ha pagine lette, e deve restare in vista finché qualcuno
 * non decide che cosa farne.
 */
export function smistamentoEsaurito (smistamento: Smistamento): boolean {
  return smistamento.blocchi.length === 0 && !smistamento.errore
}

/** Gli smistamenti che aspettano una mano, dal più vecchio. */
export function smistamentiInQuarantena (smistamenti: Smistamento[]): Smistamento[] {
  return smistamenti
    .filter((s) => !smistamentoEsaurito(s))
    .sort((a, b) => a.arrivatoIl.localeCompare(b.arrivatoIl))
}

/** Quelli di una consegna sola: è così che li guarda chi sta ritirando quel documento. */
export function smistamentiDellaConsegna (
  smistamenti: Smistamento[],
  consegnaId: string,
): Smistamento[] {
  return smistamentiInQuarantena(smistamenti).filter((s) => s.consegnaId === consegnaId)
}

/**
 * Quelli di una classe, compresi quelli che non si è saputo agganciare a una
 * consegna ma che parlano di lei. Serve al pannello del docente di classe, che
 * è il posto in cui la quarantena si guarda.
 */
export function smistamentiDellaClasse (
  smistamenti: Smistamento[],
  classeId: string,
  consegneIds: string[],
): Smistamento[] {
  const sue = new Set(consegneIds)
  return smistamentiInQuarantena(smistamenti).filter(
    (s) => (s.consegnaId !== null && sue.has(s.consegnaId)) || s.classeId === classeId,
  )
}

/** Quante pagine restano da sistemare in tutto: il numero che si mostra da fuori. */
export function pagineDaSmistare (smistamenti: Smistamento[]): number {
  return smistamentiInQuarantena(smistamenti).reduce(
    (totale, s) => totale + s.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0),
    0,
  )
}

/** Come si racconta un motivo di quarantena a chi deve porre rimedio. */
export function spiegaMotivo (motivo: MotivoQuarantena): string {
  switch (motivo) {
    case 'senza-nome':
      return `Nessuna ${PIF.singolare} nominata in queste pagine.`
    case 'senza-testo':
      return 'Pagine senza testo: è una scansione, va letta.'
    case 'ambiguo':
      return `Più ${PIF.plurale} possibili: nessuna abbastanza sicura.`
    case 'gia-consegnato':
      return 'Ha già consegnato: il file di prima resta.'
    case 'fuori-elenco':
      return 'Riconosciuto, ma non è fra quelli a cui è stato chiesto.'
    case 'senza-consegna':
      return 'Non si sa a quale richiesta appartenga questo PDF.'
    case 'da-confermare':
      return 'Letto dalla scansione: manca la conferma.'
  }
}

/**
 * Il nome dell'allievo proposto da un blocco, per l'elenco della quarantena.
 * Vuoto se il blocco non propone nessuno.
 */
export function nomeProposto (blocco: BloccoDaSmistare, classe: Classe | null): string {
  const allievo = classe?.allievi.find((a) => a.id === blocco.allievoId)
  return allievo ? nomeCompleto(allievo) : ''
}
