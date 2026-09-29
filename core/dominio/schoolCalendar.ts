// Il calendario scolastico ufficiale del cantone (`core/dati/schoolCalendarTicino.ts`,
// generato) a confronto con l'anno del registro: voce per voce, che cosa manca,
// che cosa è cambiato, che cosa è a posto.
//
// In un anno esistente si sceglie che cosa importare (una sede può avere
// giornate sue); un anno nuovo prende tutto (`bozzaDaAnnoUfficiale`). Una pausa
// importata ha un id derivato dal calendario (`idCollegato`), così si riconosce
// anche se le date ufficiali cambiano.
//
// Un anno può anche seguire il calendario (`AnnoScolastico.calendarioUfficiale`,
// ADR-51): allora inizio, fine e chiusure collegate sono del calendario, e
// `motivoCalendarioToccato` rifiuta chi le cambia a mano.

import type { AnnoScolastico, CalendarioDellAnno, Iso, Sospensione } from './models.js'
import { etichettaAnno } from './dates.js'
import { normalizzaTesto } from './text.js'
import { testi } from './schoolCalendar.testi.js'
import { CALENDARI_UFFICIALI as CALENDARI } from '../dati/schoolCalendars.js'
export { calendarioUfficialePerCantone, cantoniUfficialiDisponibili, CALENDARI_UFFICIALI } from '../dati/schoolCalendars.js'

/** Che genere di chiusura dice il calendario. */
type TipoPeriodoUfficiale = 'vacanza' | 'festivo' | 'giorno_di_vacanza'

/** Una chiusura del calendario ufficiale: date comprese tutte e due. */
interface PeriodoUfficiale {
  id: string
  nome: string
  tipo: TipoPeriodoUfficiale
  inizio: Iso
  fine: Iso
  /** Non scritto nel PDF ma ricavato: le vacanze estive, fra un anno e l'altro. */
  derivato?: boolean
}

/** Un anno scolastico del calendario ufficiale. */
export interface AnnoUfficiale {
  /** «2026/2027», come `etichettaAnno`. */
  annoScolastico: string
  inizioAnno: Iso | null
  fineAnno: Iso | null
  fonte: string
  periodi: PeriodoUfficiale[]
}

/** Il calendario di un cantone, come lo scrive `tools/calendario/`. */
export interface CalendarioUfficiale {
  cantone: string
  cantoneNome: string
  fonte: string
  estrattoIl: Iso
  anni: AnnoUfficiale[]
}

/** L'anno del calendario che corrisponde a un anno che comincia in quel giorno. */
export function annoUfficiale (calendario: CalendarioUfficiale, inizio: Iso): AnnoUfficiale | null {
  const etichetta = etichettaAnno(inizio)
  return calendario.anni.find((anno) => anno.annoScolastico === etichetta) ?? null
}

/**
 * Le chiusure importabili di un anno, ciascuna con il suo id di collegamento.
 * Fuori le vacanze estive (dopo l'ultimo giorno, non salterebbero niente).
 * L'id nasce da cantone, anno e nome, non dalle date che possono cambiare; un
 * nome ripetuto nello stesso anno prende un numero in coda.
 */
export function periodiImportabili (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
): Array<PeriodoUfficiale & { collegamento: string }> {
  const visti = new Map<string, number>()
  return anno.periodi
    .filter((periodo) => !periodo.derivato)
    .sort((a, b) => a.inizio.localeCompare(b.inizio))
    .map((periodo) => {
      const base = normalizzaTesto(periodo.nome).replace(/ /g, '-') || 'chiusura'
      const volte = (visti.get(base) ?? 0) + 1
      visti.set(base, volte)
      const nome = volte === 1 ? base : `${base}-${volte}`
      return { ...periodo, collegamento: idCollegato(calendario, anno, nome) }
    })
}

/**
 * Gli anni del calendario da proporre per un anno nuovo: quello di `oggi` e i
 * successivi, con inizio e fine scritti.
 */
export function anniDaProporre (calendario: CalendarioUfficiale, oggi: Iso): AnnoUfficiale[] {
  const corrente = etichettaAnno(oggi)
  return calendario.anni
    .filter((anno) => anno.inizioAnno && anno.fineAnno && anno.annoScolastico >= corrente)
    .sort((a, b) => a.annoScolastico.localeCompare(b.annoScolastico))
}

/** Le chiusure di un anno del calendario, già pronte per l'anno del registro e collegate. */
export function chiusureUfficiali (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
): Sospensione[] {
  return periodiImportabili(calendario, anno).map((periodo) => ({
    id: periodo.collegamento,
    etichetta: periodo.nome,
    dal: periodo.inizio,
    al: periodo.fine,
  }))
}

/** L'id di una pausa collegata al calendario: `sos-ti-2026-2027-vacanze-di-natale`. */
function idCollegato (calendario: CalendarioUfficiale, anno: AnnoUfficiale, nome: string): string {
  const cantone = calendario.cantone.toLowerCase()
  // testo-fisso: identificatore della pausa, salvato nel documento
  return `sos-${cantone}-${anno.annoScolastico.replace('/', '-')}-${nome}`.slice(0, 64)
}

/**
 * Come sta una voce del calendario rispetto all'anno:
 * - `mancante`: l'anno non ne ha traccia;
 * - `diversa`: c'è — collegata, o con lo stesso nome — ma con altre date;
 * - `da-collegare`: le date ci sono già, in una pausa scritta a mano;
 * - `allineata`: collegata e con le date giuste. Non c'è niente da fare.
 */
type StatoVoceUfficiale = 'mancante' | 'diversa' | 'da-collegare' | 'allineata'

/** Una cosa che il calendario ufficiale propone all'anno. */
export interface VoceUfficiale {
  /** Unica nell'elenco: `inizio`, `fine`, o l'id di collegamento della pausa. */
  chiave: string
  genere: 'inizio' | 'fine' | 'pausa'
  etichetta: string
  tipo?: TipoPeriodoUfficiale
  dal: Iso
  al: Iso
  stato: StatoVoceUfficiale
  /** Com'è oggi nell'anno, se c'è: per dire «ora dal… al…». */
  attuale: { dal: Iso, al: Iso, etichetta: string } | null
}

/** Quel che serve dell'anno per confrontarlo: vale anche per un anno non ancora nato. */
export interface BozzaAnno {
  inizio: Iso
  fine: Iso
  sospensioni: Sospensione[]
}

/**
 * Le voci del calendario per l'anno che comincia in `bozza.inizio`, ciascuna
 * con il suo stato; `null` se il calendario non ha quell'anno.
 *
 * Una pausa si riconosce, nell'ordine, dall'id di collegamento, dalle stesse
 * date, dallo stesso nome. Ogni pausa dell'anno serve a una voce sola.
 */
export function vociUfficiali (
  calendario: CalendarioUfficiale,
  bozza: BozzaAnno,
): { anno: AnnoUfficiale, voci: VoceUfficiale[] } | null {
  const anno = annoUfficiale(calendario, bozza.inizio)
  if (!anno) return null

  const voci: VoceUfficiale[] = []
  const data = (chiave: 'inizio' | 'fine', etichetta: string, ufficiale: Iso | null, attuale: Iso) => {
    if (!ufficiale) return
    voci.push({
      chiave,
      genere: chiave,
      etichetta,
      dal: ufficiale,
      al: ufficiale,
      stato: ufficiale === attuale ? 'allineata' : 'diversa',
      attuale: { dal: attuale, al: attuale, etichetta },
    })
  }
  const t = testi()
  data('inizio', t.inizioLezioni, anno.inizioAnno, bozza.inizio)
  data('fine', t.fineLezioni, anno.fineAnno, bozza.fine)

  const usate = new Set<string>()
  const trova = (prova: (s: Sospensione) => boolean): Sospensione | null => {
    const trovata = bozza.sospensioni.find((s) => !usate.has(s.id) && prova(s)) ?? null
    if (trovata) usate.add(trovata.id)
    return trovata
  }

  const periodi = periodiImportabili(calendario, anno)
  // Prima i collegati: una pausa collegata non va presa per date da una voce
  // che viene prima.
  const collegate = new Map(
    periodi.map((p) => [p.collegamento, trova((s) => s.id === p.collegamento)]),
  )
  for (const periodo of periodi) {
    const nome = normalizzaTesto(periodo.nome)
    const collegata = collegate.get(periodo.collegamento) ?? null
    const stesseDate = collegata
      ? null
      : trova((s) => s.dal === periodo.inizio && s.al === periodo.fine)
    const stessoNome = collegata || stesseDate
      ? null
      : trova((s) => normalizzaTesto(s.etichetta) === nome)
    const trovata = collegata ?? stesseDate ?? stessoNome
    const date = trovata !== null && trovata.dal === periodo.inizio && trovata.al === periodo.fine
    voci.push({
      chiave: periodo.collegamento,
      genere: 'pausa',
      etichetta: periodo.nome,
      tipo: periodo.tipo,
      dal: periodo.inizio,
      al: periodo.fine,
      stato: !trovata ? 'mancante' : !date ? 'diversa' : collegata ? 'allineata' : 'da-collegare',
      attuale: trovata ? { dal: trovata.dal, al: trovata.al, etichetta: trovata.etichetta } : null,
    })
  }
  return { anno, voci }
}

/** Le voci su cui c'è qualcosa da fare. */
export function vociDaImportare (voci: readonly VoceUfficiale[]): VoceUfficiale[] {
  return voci.filter((voce) => voce.stato !== 'allineata')
}

/**
 * L'anno con le voci scelte portate dentro. Inizio e fine riscrivono le date;
 * una pausa mancante nasce collegata; una trovata prende date e id del
 * calendario ma tiene il suo nome. Le altre pause restano come sono.
 */
export function applicaVoci (
  calendario: CalendarioUfficiale,
  bozza: BozzaAnno,
  scelte: readonly string[],
): BozzaAnno {
  const confronto = vociUfficiali(calendario, bozza)
  if (!confronto) return bozza
  const volute = new Set(scelte)
  const daFare = confronto.voci.filter((voce) => volute.has(voce.chiave) && voce.stato !== 'allineata')

  let { inizio, fine } = bozza
  let sospensioni = bozza.sospensioni.map((s) => ({ ...s }))
  for (const voce of daFare) {
    if (voce.genere === 'inizio') inizio = voce.dal
    else if (voce.genere === 'fine') fine = voce.dal
    else if (voce.attuale) {
      const vecchia = voce.attuale
      const indice = sospensioni.findIndex((s) =>
        s.id === voce.chiave ||
        (s.dal === vecchia.dal && s.al === vecchia.al && s.etichetta === vecchia.etichetta),
      )
      if (indice >= 0) {
        const aggiornata = { ...sospensioni[indice], id: voce.chiave, dal: voce.dal, al: voce.al }
        sospensioni[indice] = aggiornata
        continue
      }
      sospensioni.push({ id: voce.chiave, etichetta: voce.etichetta, dal: voce.dal, al: voce.al })
    } else {
      sospensioni.push({ id: voce.chiave, etichetta: voce.etichetta, dal: voce.dal, al: voce.al })
    }
  }
  sospensioni = sospensioni.sort((a, b) => a.dal.localeCompare(b.dal))
  return { inizio, fine, sospensioni }
}

/**
 * Un anno che nasce da un anno del calendario, con tutte le chiusure
 * collegate. Via le pause collegate a un altro anno dello stesso calendario;
 * quelle scritte a mano restano, e si collegano se coincidono con una voce.
 */
export function bozzaDaAnnoUfficiale (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
  bozza: BozzaAnno,
): BozzaAnno {
  // testo-fisso: prefisso d'identificatore
  const cantone = `sos-${calendario.cantone.toLowerCase()}-`
  const suo = idCollegato(calendario, anno, '')
  const pulita: BozzaAnno = {
    inizio: anno.inizioAnno ?? bozza.inizio,
    fine: anno.fineAnno ?? bozza.fine,
    sospensioni: bozza.sospensioni.filter((s) => !s.id.startsWith(cantone) || s.id.startsWith(suo)),
  }
  const confronto = vociUfficiali(calendario, pulita)
  if (!confronto) return pulita
  return applicaVoci(calendario, pulita, confronto.voci.map((voce) => voce.chiave))
}

/**
 * L'anno sincronizzato con un anno del calendario: date ufficiali, ogni
 * chiusura collegata con nome e date del calendario, e le chiusure proprie
 * come sono. Una chiusura con l'id di quest'anno che il calendario non ha più
 * se ne va: nel calendario di oggi non c'è.
 */
export function bozzaSincronizzata (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
  bozza: BozzaAnno,
): BozzaAnno {
  const unita = bozzaDaAnnoUfficiale(calendario, anno, bozza)
  const ufficiali = new Map(chiusureUfficiali(calendario, anno).map((s) => [s.id, s]))
  const prefisso = prefissoCollegato(marcatoreDi(calendario, anno))
  return {
    ...unita,
    sospensioni: unita.sospensioni
      .filter((s) => !s.id.startsWith(prefisso) || ufficiali.has(s.id))
      .map((s) => ({ ...(ufficiali.get(s.id) ?? s) })),
  }
}

/** Il marcatore che un anno sincronizzato con `anno` si porta dietro. */
export function marcatoreDi (
  calendario: CalendarioUfficiale,
  anno: AnnoUfficiale,
): CalendarioDellAnno {
  return { cantone: calendario.cantone.toUpperCase(), annoScolastico: anno.annoScolastico }
}

/** Il prefisso degli id collegati a quell'anno del calendario: `sos-ti-2026-2027-`. */
export function prefissoCollegato (marcatore: CalendarioDellAnno): string {
  // testo-fisso: prefisso d'identificatore, come `idCollegato`
  return `sos-${marcatore.cantone.toLowerCase()}-${marcatore.annoScolastico.replace('/', '-')}-`
}

/**
 * Vero se la chiusura viene dal calendario che l'anno segue: marcatore
 * presente e id collegato a quell'anno. Senza marcatore niente è collegato,
 * anche un id importato: è una chiusura come le altre.
 */
export function èCollegata (
  anno: Pick<AnnoScolastico, 'calendarioUfficiale'>,
  sospensione: Pick<Sospensione, 'id'>,
): boolean {
  const marcatore = anno.calendarioUfficiale
  return marcatore !== undefined && sospensione.id.startsWith(prefissoCollegato(marcatore))
}

/** Stesso calendario e stesso anno, o tutti e due assenti. */
function stessoCalendario (
  a: CalendarioDellAnno | undefined,
  b: CalendarioDellAnno | undefined,
): boolean {
  if (!a || !b) return !a && !b
  return a.cantone.toUpperCase() === b.cantone.toUpperCase() &&
    a.annoScolastico === b.annoScolastico
}

/** Il calendario di un marcatore, fra quelli che il registro porta con sé. */
export function calendarioDi (marcatore: CalendarioDellAnno): CalendarioUfficiale | null {
  const cantone = marcatore.cantone.toUpperCase()
  return CALENDARI.find((c) => c.cantone.toUpperCase() === cantone) ?? null
}

/** L'anno del calendario che un marcatore nomina, se il calendario ce l'ha. */
function annoDelMarcatore (
  calendario: CalendarioUfficiale | null,
  marcatore: CalendarioDellAnno,
): AnnoUfficiale | null {
  if (!calendario) return null
  if (calendario.cantone.toUpperCase() !== marcatore.cantone.toUpperCase()) return null
  return calendario.anni.find((a) => a.annoScolastico === marcatore.annoScolastico) ?? null
}

/** Nome e date uguali: l'id si confronta a parte. */
function stessaChiusura (a: Sospensione, b: Sospensione): boolean {
  return a.etichetta === b.etichetta && a.dal === b.dal && a.al === b.al
}

/**
 * Perché un anno che segue il calendario ufficiale non si può salvare così;
 * `null` se si può. `prima` è l'anno com'è nel documento, `null` per uno che
 * nasce. Il calendario è quello del marcatore (`calendarioDi`).
 *
 * Con il marcatore restano del calendario inizio, fine e le chiusure
 * collegate: si lasciano come sono o si portano ai valori ufficiali, non
 * altro. Il resto — chiusure proprie, confine e nomi dei semestri, note,
 * settimane — è libero. Il marcatore stesso non si mette né si toglie
 * salvando l'anno: lo fa `anno.calendario`, che sincronizza nello stesso gesto.
 */
export function motivoCalendarioToccato (
  calendario: CalendarioUfficiale | null,
  prima: AnnoScolastico | null,
  dopo: AnnoScolastico,
): string | null {
  const t = testi()
  if (prima && !stessoCalendario(prima.calendarioUfficiale, dopo.calendarioUfficiale)) {
    return t.marcatoreToccato
  }
  const marcatore = dopo.calendarioUfficiale
  if (!marcatore) return null

  const anno = annoDelMarcatore(calendario, marcatore)
  // Un anno che nasce collegato deve poterlo essere; uno già collegato a un
  // calendario che questo registro non ha tiene almeno quel che aveva.
  if (!anno && !prima) return t.calendarioSconosciuto(marcatore.cantone, marcatore.annoScolastico)
  const ufficiali = new Map(
    anno && calendario ? chiusureUfficiali(calendario, anno).map((s) => [s.id, s]) : [],
  )

  const data = (quale: 'inizio' | 'fine', ufficiale: Iso | null | undefined): string | null => {
    if (dopo[quale] === ufficiale) return null
    if (prima && dopo[quale] === prima[quale]) return null
    return t.dataBloccata(quale === 'inizio' ? t.inizioLezioni : t.fineLezioni)
  }
  const date = data('inizio', anno?.inizioAnno) ?? data('fine', anno?.fineAnno)
  if (date) return date

  const collegate = dopo.sospensioni.filter((s) => èCollegata(dopo, s))
  const dopoPerId = new Map(collegate.map((s) => [s.id, s]))
  const primaPerId = new Map(
    (prima?.sospensioni ?? []).filter((s) => èCollegata(dopo, s)).map((s) => [s.id, s]),
  )

  // Chi c'era resta, com'era o com'è nel calendario. Una chiusura che il
  // calendario di oggi non ha più può andarsene.
  for (const vecchia of primaPerId.values()) {
    const nuova = dopoPerId.get(vecchia.id)
    const ufficiale = ufficiali.get(vecchia.id)
    if (!nuova) {
      if (ufficiale || !anno) return t.chiusuraBloccata(vecchia.etichetta)
      continue
    }
    if (!stessaChiusura(nuova, vecchia) && !(ufficiale && stessaChiusura(nuova, ufficiale))) {
      return t.chiusuraBloccata(vecchia.etichetta)
    }
  }
  // Chi arriva è una chiusura del calendario, tale e quale.
  for (const nuova of collegate) {
    if (primaPerId.has(nuova.id)) continue
    const ufficiale = ufficiali.get(nuova.id)
    if (!ufficiale || !stessaChiusura(nuova, ufficiale)) return t.chiusuraInventata(nuova.etichetta)
  }
  // Un anno che nasce collegato le ha tutte.
  if (!prima) {
    const mancante = [...ufficiali.values()].find((s) => !dopoPerId.has(s.id))
    if (mancante) return t.chiusuraMancante(mancante.etichetta)
  }
  return null
}
