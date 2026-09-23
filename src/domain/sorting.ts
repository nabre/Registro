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
// stanno fuori — `data/pdf.ts`, `data/ocr.ts` — e qui arriva soltanto quel che
// si è letto, pagina per pagina. Così la regola con cui si decide a chi va una
// pagina si prova con `node --test`, senza un PDF vero in giro.
//
// La regola predefinita è una sola, ed è quella che rispecchia come i documenti
// sono fatti: una pagina che nomina qualcuno apre il suo blocco, le pagine che
// seguono senza nominare nessuno appartengono allo stesso blocco. Un documento
// di tre pagine col nome solo in testa si tiene insieme; una pagina che non
// nomina nessuno e non ha nessuno prima non si sa di chi sia, e va in
// quarantena.
//
// Ma quella regola vale se i nomi sulle pagine si leggono, e non sempre si
// leggono: uno scanner a foglio doppio sputa un PDF in cui l'unica cosa certa
// è che ogni documento è di due pagine, e nessun OCR cambierà quel fatto. Per
// questo il taglio si può dichiarare — `Divisione` in `modelli.ts` — e i modi
// sono tre:
//
//   `nomi`   quel che si è sempre fatto: taglia dove cambia il nome;
//   `passo`  un documento ogni N pagine, e il nome semmai è una proposta;
//   `mano`   non taglia niente: le pagine le sceglie chi guarda.
//
// Il modo non cambia che cosa succede *dopo* il taglio: il riconoscimento, le
// regole su chi ha già consegnato e su chi è fuori elenco, la conferma a mano.
// Cambia soltanto dove cadono le forbici, che è la sola cosa che il registro
// non può indovinare da solo su una scansione muta.

import { contieneParola, normalizzaTesto } from './text.js'
import type {
  Allievo,
  BloccoDaSmistare,
  Classe,
  Consegna,
  Divisione,
  MotivoQuarantena,
  Smistamento,
} from './models.js'

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

interface IndiceNomi {
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

interface Riconoscimento {
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

  // A parità di fiducia decide l'identificativo, non l'ordine in cui i nomi
  // sono capitati nella `Map`. `ambiguo` dice già a chi legge che la scelta va
  // confermata — vedi `assenze.ts`, che in quel caso non assegna niente — ma
  // la proposta che si mostra dev'essere sempre la stessa: due letture dello
  // stesso foglio che propongono due allievi diversi sono un registro di cui
  // non ci si fida.
  const classifica = [...migliori.entries()].sort(
    (a, b) => b[1].fiducia - a[1].fiducia || a[0].localeCompare(b[0]),
  )
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

/** Un pezzo di testo e dove sta sulla pagina, in frazioni del foglio. */
interface PezzoDiPagina {
  testo: string
  x: number
  y: number
  larghezza: number
  altezza: number
}

/** Quanto si allarga il riquadro attorno al nome: un filo, perché si veda. */
const ARIA = 0.006

/**
 * Dove sta, sulla pagina, il nome che ha deciso: il riquadro da disegnare.
 *
 * Si cerca il pezzo di testo che contiene la parola trovata — un cognome, di
 * solito — e ci si aggiungono i pezzi che gli stanno accanto sulla stessa riga
 * e che portano le altre parole del nome: un PDF scrive «Rossi» e «Mario» come
 * due pezzi separati più spesso di quanto sembri.
 *
 * Torna niente quando il nome non si ritrova fra i pezzi: succede con i testi
 * letti dall'OCR, che sono parole senza posizione, e allora il riquadro lo
 * mette chi ha letto — grande quanto la striscia che ha guardato.
 */
export function riquadroDelNome (
  pezzi: readonly PezzoDiPagina[],
  trovato: string,
): { x: number, y: number, larghezza: number, altezza: number } | undefined {
  const parole = normalizzaPerRicerca(trovato)
    .split(' ')
    .filter((parola) => parola.length > 2)
  if (parole.length === 0 || pezzi.length === 0) return undefined

  const contiene = (pezzo: PezzoDiPagina, parola: string) =>
    contieneParola(normalizzaPerRicerca(pezzo.testo), parola)

  const primo = pezzi.find((pezzo) => parole.some((parola) => contiene(pezzo, parola)))
  if (!primo) return undefined

  // La stessa riga: due pezzi si dicono sulla stessa riga quando le loro cime
  // stanno dentro l'altezza di un carattere. È il modo in cui un PDF racconta
  // una riga di testo, spezzata in pezzi quando cambia il carattere o la
  // spaziatura.
  const stessaRiga = (pezzo: PezzoDiPagina) =>
    Math.abs(pezzo.y - primo.y) <= Math.max(primo.altezza, pezzo.altezza)

  const suoi = pezzi.filter(
    (pezzo) =>
      pezzo === primo ||
      (stessaRiga(pezzo) && parole.some((parola) => contiene(pezzo, parola))),
  )

  const sinistra = Math.min(...suoi.map((p) => p.x))
  const cima = Math.min(...suoi.map((p) => p.y))
  const destra = Math.max(...suoi.map((p) => p.x + p.larghezza))
  const fondo = Math.max(...suoi.map((p) => p.y + p.altezza))

  const x = Math.max(0, sinistra - ARIA)
  const y = Math.max(0, cima - ARIA)
  return {
    x,
    y,
    larghezza: Math.min(1 - x, destra - sinistra + ARIA * 2),
    altezza: Math.min(1 - y, fondo - cima + ARIA * 2),
  }
}

/** Come si è letta una pagina: dal testo del PDF, dall'OCR, o non si è letta. */
export type Lettura = 'testo' | 'ocr' | 'niente'

interface PaginaLetta {
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

interface PianoSmistamento {
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

/** Quanto vale la divisione di uno smistamento scritto prima che esistesse. */
const DIVISIONE_PREDEFINITA: Divisione = { modo: 'nomi' }

/** Come si divide questo PDF: quel che c'è scritto, o la regola dei nomi. */
export function divisioneDi (smistamento: { divisione?: Divisione }): Divisione {
  const sua = smistamento.divisione
  if (!sua) return DIVISIONE_PREDEFINITA
  if (sua.modo === 'passo') return { modo: 'passo', pagine: Math.max(1, Math.round(sua.pagine)) }
  return sua
}

/**
 * Le pagine spezzate in tratti continui: 1,2,3,7,8 diventa [1–3, 7–8].
 *
 * I buchi contano: le pagine già assegnate escono dalle letture, e la 3 e la 7
 * non sono lo stesso documento solo perché si trovano una accanto all'altra in
 * un elenco accorciato. È la stessa regola che segue il taglio dai nomi.
 */
function tratti (pagine: PaginaLetta[]): PaginaLetta[][] {
  const fuori: PaginaLetta[][] = []
  for (const pagina of pagine) {
    const ultimo = fuori[fuori.length - 1]
    const precedente = ultimo?.[ultimo.length - 1]
    if (ultimo && precedente && pagina.numero === precedente.numero + 1) ultimo.push(pagina)
    else fuori.push([pagina])
  }
  return fuori
}

/** Il gruppo che nasce da un mucchio di pagine già deciso: chi sia, si vede. */
function gruppoDi (pezzo: PaginaLetta[], indice: IndiceNomi, motivo: MotivoQuarantena): Gruppo {
  // Il nome si cerca in tutte le pagine del pezzo e non solo nella prima: con
  // un passo di due, il foglio davanti può essere una copertina e il nome
  // stare sul retro. La prima che riconosce qualcuno decide per il pezzo.
  for (const pagina of pezzo) {
    if (pagina.lettura === 'niente') continue
    const esito = riconosci(pagina.testo, indice)
    if (!esito.allievoId) continue
    return {
      da: pezzo[0].numero,
      a: pezzo[pezzo.length - 1].numero,
      allievoId: esito.allievoId,
      fiducia: esito.fiducia,
      motivo: esito.ambiguo ? 'ambiguo' : null,
      estratto: estrattoDi(pagina.testo),
      lettura: pagina.lettura,
    }
  }
  return {
    da: pezzo[0].numero,
    a: pezzo[pezzo.length - 1].numero,
    allievoId: null,
    fiducia: 0,
    motivo,
    estratto: estrattoDi(pezzo[0].testo),
    lettura: pezzo[0].lettura,
  }
}

/**
 * Il taglio a passo fisso: un documento ogni N pagine.
 *
 * È la risposta al PDF che nessun OCR salverà — lo scanner a foglio doppio,
 * le copie sbiadite — e insieme la più affidabile di tutte quando la regola
 * c'è davvero: chi la dichiara sa una cosa che il registro non può dedurre.
 * Il nome resta una proposta dentro ogni pezzo, non una condizione: se si
 * legge, la riga arriva già compilata; se non si legge, il pezzo c'è lo stesso
 * e aspetta un nome.
 */
function aPasso (pagine: PaginaLetta[], passo: number, indice: IndiceNomi): Gruppo[] {
  const misura = Math.max(1, Math.round(passo))
  const gruppi: Gruppo[] = []
  for (const tratto of tratti(pagine)) {
    for (let i = 0; i < tratto.length; i += misura) {
      gruppi.push(gruppoDi(tratto.slice(i, i + misura), indice, 'a-mano'))
    }
  }
  return gruppi
}

/**
 * Nessun taglio: quel che c'è resta in un pezzo solo, tratto per tratto.
 *
 * Serve al PDF che non segue nessuna regola — due pratiche diverse nello
 * stesso file, documenti di lunghezza diversa — e dove ogni taglio automatico
 * sarebbe un taglio da disfare. Le pagine si scelgono con «Dividi a mano», che
 * è il gesto che quel PDF chiedeva fin dall'inizio.
 */
function aMano (pagine: PaginaLetta[], indice: IndiceNomi): Gruppo[] {
  return tratti(pagine).map((tratto) => gruppoDi(tratto, indice, 'a-mano'))
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
 *
 * Interna: fuori di qui la decisione si chiede a `bozzaSmistamento`, che è la
 * forma in cui il pannello la mostra. Le due metà separate le guarda solo il
 * passo qui sotto, e tenerle esportate faceva credere che ci fosse una seconda
 * via d'ingresso allo smistamento.
 */
function pianoSmistamento (
  pagine: PaginaLetta[],
  consegna: Consegna | null,
  classe: Classe | null,
  destinatari: string[],
  giaConsegnati: Set<string> = new Set(),
  divisione: Divisione = DIVISIONE_PREDEFINITA,
): PianoSmistamento {
  const indice = indiceNomi(classe?.allievi ?? [])
  const piano: PianoSmistamento = { assegnazioni: [], blocchi: [] }
  if (pagine.length === 0) return piano

  const attesi = new Set(destinatari)
  const presi = new Set<string>()

  const gruppi =
    divisione.modo === 'passo'
      ? aPasso(pagine, divisione.pagine, indice)
      : divisione.modo === 'mano'
        ? aMano(pagine, indice)
        : raggruppa(pagine, indice)

  for (const gruppo of gruppi) {
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
  divisione: Divisione = DIVISIONE_PREDEFINITA,
): Array<Omit<BloccoDaSmistare, 'id'>> {
  const piano = pianoSmistamento(pagine, consegna, classe, destinatari, giaPresi, divisione)
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

/** Una classe con le sue consegne, come la conosce chi chiama da fuori. */
interface DocenzaDiClasse {
  classe: Classe
  /** Gli id delle consegne che quella classe sta ritirando. */
  consegneIds: string[]
}

/** Un mucchio di PDF in attesa, tutti della stessa classe — o di nessuna. */
export interface MucchioDaSmistare {
  /** La classe a cui appartengono, o `null` per quelli che non ne hanno una. */
  classe: Classe | null
  smistamenti: Smistamento[]
  /** Quante pagine restano da collocare, in tutto il mucchio. */
  pagine: number
}

/**
 * Tutti i PDF che aspettano, divisi per classe, con in coda quelli di nessuno.
 *
 * Nasce da un buco che si vedeva solo non vedendo niente. Fino a qui la
 * quarantena si leggeva in un modo solo — `smistamentiDellaClasse`, dentro il
 * fascicolo di *una* classe — e quindi si vedeva soltanto ciò che era già stato
 * attribuito a quella classe, e soltanto mentre la si stava guardando. Un PDF
 * entrato dalla cartella osservata, che non si è saputo agganciare a una
 * consegna e per cui `classeId` è rimasto nullo, non compariva **da nessuna
 * parte**: restava nel documento dell'anno, contato da `pagineDaSmistare()` e
 * mostrato a nessuno.
 *
 * Il mucchio con `classe: null` è quello: non è un caso limite da tollerare, è
 * la ragione per cui questa funzione esiste.
 *
 * Ogni PDF sta in un mucchio solo. Se ne rivendicassero due — la classe scritta
 * sul PDF e la consegna di un'altra — vince la prima docenza dell'elenco, che è
 * l'ordine in cui le classi arrivano: contarlo due volte vorrebbe dire un totale
 * che non torna con quel che si ha sotto gli occhi.
 *
 * I mucchi vuoti non tornano: chi li mostra non deve filtrarli, e un titolo di
 * classe seguito dal nulla è una riga che fa cercare quel che non c'è.
 */
export function daSmistarePerClasse (
  smistamenti: Smistamento[],
  docenze: DocenzaDiClasse[],
): MucchioDaSmistare[] {
  const inAttesa = smistamentiInQuarantena(smistamenti)
  const gia = new Set<string>()
  const mucchi: MucchioDaSmistare[] = []

  for (const { classe, consegneIds } of docenze) {
    const suoi = smistamentiDellaClasse(inAttesa, classe.id, consegneIds).filter(
      (s) => !gia.has(s.id),
    )
    for (const s of suoi) gia.add(s.id)
    if (suoi.length > 0) mucchi.push({ classe, smistamenti: suoi, pagine: pagineDaSmistare(suoi) })
  }

  const orfani = inAttesa.filter((s) => !gia.has(s.id))
  if (orfani.length > 0) {
    mucchi.push({ classe: null, smistamenti: orfani, pagine: pagineDaSmistare(orfani) })
  }
  return mucchi
}

/**
 * Le pagine scelte raccontate a intervalli: `[2, 3, 7]` diventa `2–3` e `7`.
 *
 * Chi sceglie delle pagine con il mouse non sceglie un intervallo — ne prende
 * tre qua e una là — ma tutto quel che sta intorno le racconta a intervalli:
 * il registro se le segna così fra le pagine già assegnate, e a chi guarda si
 * dice «pagine 2–3 e 7», non «tre pagine». Le pagine tornano in ordine e senza
 * ripetizioni, che è l'ordine in cui finiscono nel documento.
 */
export function intervalliDi (pagine: readonly number[]): Array<{ da: number, a: number }> {
  const ordinate = [...new Set(pagine.filter((n) => Number.isFinite(n)))].sort((x, y) => x - y)
  const intervalli: Array<{ da: number, a: number }> = []
  for (const numero of ordinate) {
    const ultimo = intervalli[intervalli.length - 1]
    if (ultimo && numero === ultimo.a + 1) ultimo.a = numero
    else intervalli.push({ da: numero, a: numero })
  }
  return intervalli
}

/**
 * Le pagine scelte dette come si dicono a voce: «pagine 2–3 e 7».
 *
 * Sta qui e non nella vista perché la stessa frase serve in due posti che non
 * si conoscono — il riquadro che le mostra e il messaggio che l'host manda
 * indietro quando l'archiviazione non riesce — e due frasi diverse per la
 * stessa cosa fanno dubitare che parlino delle stesse pagine.
 */
export function dicePagine (pagine: readonly number[]): string {
  const pezzi = intervalliDi(pagine).map((tratto) =>
    tratto.da === tratto.a ? String(tratto.da) : `${tratto.da}–${tratto.a}`,
  )
  if (pezzi.length === 0) return 'nessuna pagina'
  const testa = pezzi.slice(0, -1).join(', ')
  const coda = pezzi[pezzi.length - 1]
  const elenco = testa ? `${testa} e ${coda}` : coda
  return pagine.length === 1 ? `pagina ${elenco}` : `pagine ${elenco}`
}

/** Quante pagine restano da sistemare in tutto: il numero che si mostra da fuori. */
export function pagineDaSmistare (smistamenti: Smistamento[]): number {
  return smistamentiInQuarantena(smistamenti).reduce(
    (totale, s) => totale + s.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0),
    0,
  )
}
