// Lo smistamento: un PDF unico per la classe (pagelle, certificati, moduli
// scansionati di seguito) che si divide e va nella consegna di ciascuno.
//
// Modulo puro: taglio, lettura del testo e OCR stanno in `data/pdf.ts` e
// `data/ocr.ts`; qui arriva il testo pagina per pagina, e la regola si prova
// con `node --test`.
//
// Il taglio si dichiara (`Divisione` in `models.ts`):
//
//   `nomi`   una pagina che nomina qualcuno apre il suo blocco, le seguenti
//            senza nome ci si attaccano; una pagina anonima senza niente
//            prima va in quarantena;
//   `passo`  un documento ogni N pagine (scanner a foglio doppio), il nome è
//            solo una proposta;
//   `mano`   nessun taglio: le pagine le sceglie chi guarda.
//
// Dopo il taglio tutto è uguale: riconoscimento, regole su chi ha già
// consegnato o è fuori elenco, conferma a mano.

import { elenco } from '../i18n/index.js'
import { contieneParola, normalizzaTesto } from './text.js'
import { testi } from './sorting.testi.js'
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
 * Quanto deve staccare il primo dal secondo perché la pagina non sia ambigua:
 * difende dal caso dei fratelli con lo stesso cognome.
 */
const STACCO_MINIMO = 0.2

/**
 * Il testo ridotto per il confronto: minuscolo, senza accenti né
 * punteggiatura, spazi normalizzati. Gli accenti via da tutte e due le parti,
 * perché la segreteria stampa «Muller» per «Müller».
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
 * L'indice con cui si cercano gli allievi nel testo di una pagina. Chiavi di
 * valore decrescente: nome e cognome (nei due ordini), cognome, nome. Le ultime
 * due solo se in classe nessun altro le porta.
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
  // Le chiavi lunghe per prime: «rossi mario» batte «rossi».
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
    // Per parola intera: «Conti» non sta in «acconti», «Rossi» non sta in
    // «Grossi». Un cognome da solo basta ad assegnare, quindi niente sottostringhe.
    if (!contieneParola(pagina, chiave.testo)) continue
    const gia = migliori.get(chiave.allievoId)
    if (!gia || gia.fiducia < chiave.fiducia) {
      migliori.set(chiave.allievoId, { fiducia: chiave.fiducia, trovato: chiave.testo })
    }
  }

  // A parità di fiducia decide l'id, non l'ordine della `Map`: la proposta
  // mostrata deve essere sempre la stessa (`ambiguo` chiede comunque conferma,
  // vedi `absences.ts`).
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
 * Dove sta sulla pagina il nome che ha deciso: il pezzo di testo con la parola
 * trovata più i pezzi accanto sulla stessa riga con le altre parole del nome
 * (un PDF spezza spesso «Rossi» e «Mario»). Niente se non si ritrova, come per
 * i testi dell'OCR senza posizione: il riquadro lo mette chi ha letto.
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

  // Stessa riga: le cime stanno dentro l'altezza di un carattere (un PDF spezza
  // la riga quando cambia carattere o spaziatura).
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
 * Le pagine raggruppate secondo la regola dei nomi: una pagina che riconosce
 * qualcuno apre un blocco (o continua quello della stessa persona); una che
 * non riconosce nessuno si attacca al precedente; senza precedente resta sola.
 */
function raggruppa (pagine: PaginaLetta[], indice: IndiceNomi): Gruppo[] {
  const gruppi: Gruppo[] = []

  for (const pagina of pagine) {
    const esito =
      pagina.lettura === 'niente' ? { ...NESSUNO } : riconosci(pagina.testo, indice)
    const ultimo = gruppi[gruppi.length - 1]

    // Le pagine già assegnate escono dall'elenco: la 3 e la 7 vicine in un
    // elenco accorciato non sono lo stesso documento.
    const contiguo = ultimo !== undefined && pagina.numero === ultimo.a + 1

    // Stessa persona della pagina prima: stesso documento.
    if (esito.allievoId && contiguo && ultimo && ultimo.allievoId === esito.allievoId) {
      ultimo.a = pagina.numero
      ultimo.fiducia = Math.max(ultimo.fiducia, esito.fiducia)
      if (esito.ambiguo === false && ultimo.motivo === 'ambiguo') ultimo.motivo = null
      continue
    }

    // Nessun nome: continua il blocco prima, se c'è. Una pagina illeggibile no:
    // resta un problema suo.
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

/** La divisione di uno smistamento che non ne dichiara una. */
const DIVISIONE_PREDEFINITA: Divisione = { modo: 'nomi' }

/** Come si divide questo PDF: quel che c'è scritto, o la regola dei nomi. */
export function divisioneDi (smistamento: { divisione?: Divisione }): Divisione {
  const sua = smistamento.divisione
  if (!sua) return DIVISIONE_PREDEFINITA
  if (sua.modo === 'passo') return { modo: 'passo', pagine: Math.max(1, Math.round(sua.pagine)) }
  return sua
}

/**
 * Le pagine spezzate in tratti continui: 1,2,3,7,8 diventa [1–3, 7–8]. I buchi
 * contano, come nel taglio dai nomi.
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
  // Il nome si cerca in tutte le pagine del pezzo: la prima può essere una
  // copertina. Decide la prima che riconosce qualcuno.
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
 * Il taglio a passo fisso: un documento ogni N pagine, per i PDF che nessun
 * OCR salva. Il nome è una proposta: se si legge la riga arriva compilata, se
 * no il pezzo aspetta un nome.
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
 * Nessun taglio: un pezzo per tratto continuo, per i PDF senza regola. Le
 * pagine si scelgono con «Dividi a mano».
 */
function aMano (pagine: PaginaLetta[], indice: IndiceNomi): Gruppo[] {
  return tratti(pagine).map((tratto) => gruppoDi(tratto, indice, 'a-mano'))
}

/**
 * Che cosa fare di un PDF appena arrivato: che cosa si assegna da solo e che
 * cosa va guardato a mano. Una pagina riconosciuta va comunque in quarantena
 * se la persona non era fra i destinatari della consegna (PDF di un'altra
 * classe) o ha già consegnato (non si sovrascrive in silenzio).
 *
 * Interna: da fuori si passa da `bozzaSmistamento`.
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
 * La bozza di smistamento: un elenco solo di blocchi, proposte comprese. Il
 * registro non archivia da solo: un nome riconosciuto è un'ipotesi, e diventa
 * una riga «forse è di Rossi Mario» da confermare. Stessa decisione di
 * `pianoSmistamento`, in ordine di pagina perché si conferma leggendo.
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
 * Vero quando non resta niente da decidere a mano. Un PDF che non si è
 * riusciti ad aprire non è esaurito: resta in vista finché qualcuno decide.
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
 * Gli smistamenti di una classe, compresi quelli non agganciati a una consegna
 * ma che parlano di lei: per il pannello del docente di classe.
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
 * Tutti i PDF che aspettano, divisi per classe, con in coda quelli di nessuno
 * (`classe: null`: un PDF della cartella osservata senza consegna né classe,
 * che altrimenti nessuno vedrebbe).
 *
 * Ogni PDF sta in un mucchio solo: se lo rivendicano due classi vince la prima
 * dell'elenco, così il totale torna. I mucchi vuoti non tornano.
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
 * Le pagine scelte a intervalli: `[2, 3, 7]` diventa `2–3` e `7`, in ordine e
 * senza ripetizioni.
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
 * Le pagine scelte dette a voce, «pagine 2–3 e 7»: la stessa frase per il
 * riquadro e per i messaggi dell'host.
 */
export function dicePagine (pagine: readonly number[]): string {
  const pezzi = intervalliDi(pagine).map((tratto) =>
    tratto.da === tratto.a ? String(tratto.da) : `${tratto.da}–${tratto.a}`,
  )
  const t = testi()
  if (pezzi.length === 0) return t.nessunaPagina
  // «2–3, 5 e 7»: la virgola e la congiunzione della lingua.
  const quali = elenco(pezzi)
  return pagine.length === 1 ? t.pagina(quali) : t.pagine(quali)
}

/** Quante pagine restano da sistemare in tutto: il numero che si mostra da fuori. */
export function pagineDaSmistare (smistamenti: Smistamento[]): number {
  return smistamentiInQuarantena(smistamenti).reduce(
    (totale, s) => totale + s.blocchi.reduce((n, b) => n + (b.a - b.da + 1), 0),
    0,
  )
}
