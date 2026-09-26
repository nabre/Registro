// Il calendario scolastico ufficiale del cantone (`src/data/schoolCalendarTicino.ts`,
// generato) a confronto con l'anno del registro: voce per voce, che cosa manca,
// che cosa è cambiato, che cosa è a posto.
//
// In un anno esistente si sceglie che cosa importare (una sede può avere
// giornate sue); un anno nuovo prende tutto (`bozzaDaAnnoUfficiale`). Una pausa
// importata ha un id derivato dal calendario (`idCollegato`), così si riconosce
// anche se le date ufficiali cambiano.

import type { Iso, Sospensione } from './models.js'
import { etichettaAnno } from './dates.js'
import { normalizzaTesto } from './text.js'
import { testi } from './schoolCalendar.testi.js'

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
