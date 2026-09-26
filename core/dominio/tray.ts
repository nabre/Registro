// Che cosa scrivere nel menu dell'icona accanto all'orologio: anno in testa,
// corsi in mezzo, ore dentro.
//
// Niente Electron né orologio: registro, giorno e ora entrano, un albero di
// stringhe esce, e si prova con `node --test`. Il menu nativo lo costruisce
// `environment/tray.ts`.
//
// Ogni fase ha un segno fisso in prima colonna (`SEGNO_FASE`), uguale per corso
// e ore. Un'ora da chiudere dice anche perché («senza appello», «non segnata
// svolta»): sono buchi diversi che si chiudono in posti diversi.

import { fineLezione, inizioLezione } from './calculations.js'
import { classeDelCorso, corsiDellAnno, materiaDelCorso, titoloCorso } from './courses.js'
import {
  cosaManca,
  diagnosiLezione,
  indiceDiagnosi,
  oraCoperta,
  oraDaCompilare,
  raggruppaOre,
  type FaseOra,
  type IndiceDiagnosi,
  type OreRaggruppate,
} from './dashboard.js'
import { formattaData, sommaGiorni } from './dates.js'
import { Uno } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { confrontaNomi } from './text.js'
import { testi } from './tray.testi.js'
import type { Corso, Iso, Lezione, Ora, Registro } from './models.js'

/** Il segno in prima colonna: uno per fase, ovunque la fase compaia. */
export const SEGNO_FASE: Readonly<Record<FaseOra, string>> = {
  'in-corso': '▶',
  'da-chiudere': '⚠',
  'da-preparare': '○',
  futura: '·',
  svolta: '✓',
  annullata: '×',
}

/** Il nome del programma, in testa al menu e al suggerimento. */
const MARCHIO = 'Regiclass' // testo-fisso: il marchio non si traduce

/**
 * I mucchi in cui le ore di un corso si presentano, nell'ordine del menu.
 * «prossime» unisce le future con e senza piano; la differenza sta nel segno.
 */
type MucchioChiave = 'in-corso' | 'da-chiudere' | 'prossime' | 'svolte' | 'annullate'

const MUCCHI: ReadonlyArray<{
  /** È anche la chiave del titolo nel catalogo. */
  chiave: MucchioChiave
  /** Quante se ne mostrano prima di dire «e altre N». */
  quante: number
  prendi: (mucchi: OreRaggruppate) => Lezione[]
}> = [
  { chiave: 'in-corso', quante: 4, prendi: (m) => m.inCorso },
  { chiave: 'da-chiudere', quante: 8, prendi: (m) => m.daChiudere },
  { chiave: 'prossime', quante: 5, prendi: (m) => m.prossime },
  { chiave: 'svolte', quante: 5, prendi: (m) => m.svolte },
  { chiave: 'annullate', quante: 3, prendi: (m) => m.annullate },
]

/**
 * L'ordine in cui una fase chiede attenzione: decide il segno del corso (il
 * buco prima delle svolte). Senza niente di aperto, vale l'ora più prossima.
 */
const PER_URGENZA: readonly FaseOra[] = [
  'in-corso',
  'da-chiudere',
  'da-preparare',
  'futura',
  'svolta',
  'annullata',
]

/** Un'ora come si legge in una riga di menu. */
interface VoceOraVassoio {
  lezioneId: string
  fase: FaseOra
  /** «⚠ lun 12 · 08:20–09:05 · senza appello» */
  etichetta: string
}

interface MucchioVassoio {
  chiave: MucchioChiave
  /** «Da chiudere (3)»: il numero è quello vero, anche se le righe sono meno. */
  titolo: string
  ore: VoceOraVassoio[]
  /** Quante non ci stanno nel menu. Zero quando ci stanno tutte. */
  altre: number
}

export interface CorsoVassoio {
  corsoId: string
  /** «⚠ I MEC A — Matematica» */
  etichetta: string
  /** La fase più urgente fra le sue ore: è quella del segno qui sopra. */
  fase: FaseOra
  /** «1 in corso · 2 da chiudere · 12 svolte»: la riga spenta in cima al sottomenu. */
  riepilogo: string
  mucchi: MucchioVassoio[]
}

/** L'ora su cui andare adesso: un buco vecchio, o il prossimo appuntamento. */
interface OraDaFareVassoio {
  lezioneId: string
  etichetta: string
  /** Vero se è un buco rimasto indietro, falso se è soltanto la prossima. */
  manca: boolean
}

export interface AlberoVassoio {
  /** La riga spenta in testa al menu: «Regiclass — 2 ore da chiudere». */
  intestazione: string
  /** Il testo che compare fermandosi sopra l'icona, su due o tre righe. */
  suggerimento: string
  /** Quante ore dell'anno hanno un buco aperto. */
  daChiudere: number
  /** L'ora che si sta facendo proprio adesso, se ce n'è una. */
  inCorso: VoceOraVassoio | null
  daFare: OraDaFareVassoio | null
  corsi: CorsoVassoio[]
}

// ------------------------------------------------------------------ le parole

/** «oggi», «ieri», «domani», o «lun 12»: quel che si direbbe a voce. */
function quando (data: Iso, oggi: Iso): string {
  const t = testi()
  if (data === oggi) return t.oggi
  if (data === sommaGiorni(oggi, -1)) return t.ieri
  if (data === sommaGiorni(oggi, 1)) return t.domani
  return formattaData(data, 'giorno')
}

/** «08:20–09:05», o quel che c'è. Vuoto se l'ora non ha slot. */
function orario (lezione: Lezione): string {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (inizio && fine) return `${inizio}–${fine}`
  return inizio ?? ''
}

/**
 * Perché quest'ora sta in questo mucchio: due ore da chiudere possono chiedere
 * cose diverse (appello, spunta di «svolta»).
 */
function motivoDellOra (
  registro: Registro,
  lezione: Lezione,
  fase: FaseOra,
  oggi: Iso,
  ora: Ora,
  indice: IndiceDiagnosi,
): string {
  const t = testi()
  const diagnosi = diagnosiLezione(registro, lezione, 0, oggi, ora, indice)
  const pezzi: string[] = []

  switch (fase) {
    case 'in-corso': {
      const fine = fineLezione(lezione)
      pezzi.push(fine ? t.finoAlle(fine) : t.inCorso)
      break
    }
    case 'da-chiudere':
      pezzi.push(...cosaManca(diagnosi))
      break
    case 'svolta':
      pezzi.push(diagnosi.assenti > 0 ? t.assenti(diagnosi.assenti) : t.tuttiPresenti)
      if (diagnosi.osservazioni > 0) pezzi.push(t.osservazioni(diagnosi.osservazioni))
      break
    // Due rimedi diversi: il piano mancante si sceglie, la scaletta corta si allunga.
    case 'da-preparare':
      pezzi.push(lezione.pianoId ? t.scalettaCorta : t.senzaPiano)
      break
    case 'futura':
      pezzi.push(t.pianoCompleto)
      break
    case 'annullata':
      pezzi.push(t.annullata)
      break
  }

  // La verifica si dice sempre: cambia come si prepara e si chiude l'ora.
  if (diagnosi.segni.includes('valutazione')) pezzi.push(t.verifica)
  // L'aula solo per le ore che devono ancora venire.
  const daVenire = fase === 'in-corso' || fase === 'da-preparare' || fase === 'futura'
  if (daVenire && lezione.aula) pezzi.push(lezione.aula)

  return pezzi.join(', ')
}

function voceOra (
  registro: Registro,
  lezione: Lezione,
  fase: FaseOra,
  oggi: Iso,
  ora: Ora,
  indice: IndiceDiagnosi,
): VoceOraVassoio {
  const parti = [
    quando(lezione.data, oggi),
    orario(lezione),
    motivoDellOra(registro, lezione, fase, oggi, ora, indice),
  ].filter((pezzo) => pezzo.length > 0)
  return { lezioneId: lezione.id, fase, etichetta: `${SEGNO_FASE[fase]} ${parti.join(' · ')}` }
}

// ------------------------------------------------------------------- i corsi

/**
 * Come si chiama un corso nel vassoio: «I MEC A — Matematica», sempre dalla
 * catena classe → materia e non da `corso.titolo` (campo libero), così dieci
 * corsi si leggono allo stesso modo e quelli di una classe stanno vicini.
 */
function nomeDelCorso (registro: Registro, corso: Corso): string {
  const classe = classeDelCorso(registro, corso)
  const materia = materiaDelCorso(registro, corso)
  // Non i ripieghi di `titoloCorso` («classe», «Materia»), che servono al
  // titolo memorizzato: qui si mostra, e il ripiego giusto è `corso.titolo`.
  if (!classe || !materia) return corso.titolo.trim() || titoloCorso(classe, materia)
  return titoloCorso(classe, materia)
}

/** La fase di un'ora già smistata: si ricava dal mucchio, senza rifare il conto. */
function faseDelMucchio (
  registro: Registro,
  chiave: MucchioChiave,
  lezione: Lezione,
  indice: IndiceDiagnosi,
): FaseOra {
  switch (chiave) {
    case 'in-corso':
      return 'in-corso'
    case 'da-chiudere':
      return 'da-chiudere'
    case 'svolte':
      return 'svolta'
    case 'annullate':
      return 'annullata'
    // Le prossime si ridistinguono qui, nel segno. Preparata vuol dire scaletta
    // che arriva in fondo all'ora (vedi `oraCoperta`).
    default:
      return oraCoperta(registro, lezione, indice) ? 'futura' : 'da-preparare'
  }
}

/** «1 in corso · 2 da chiudere · 12 svolte»: solo i mucchi che hanno qualcosa. */
function riepilogoCorso (mucchi: OreRaggruppate): string {
  const t = testi()
  const pezzi: string[] = []
  if (mucchi.inCorso.length > 0) pezzi.push(t.riepilogo.inCorso(mucchi.inCorso.length))
  if (mucchi.daChiudere.length > 0) pezzi.push(t.riepilogo.daChiudere(mucchi.daChiudere.length))
  if (mucchi.prossime.length > 0) pezzi.push(t.riepilogo.prossime(mucchi.prossime.length))
  if (mucchi.svolte.length > 0) pezzi.push(t.riepilogo.svolte(mucchi.svolte.length))
  if (mucchi.annullate.length > 0) pezzi.push(t.riepilogo.annullate(mucchi.annullate.length))
  return pezzi.length > 0 ? pezzi.join(' · ') : t.nessunaOra
}

function faseDelCorso (
  registro: Registro,
  mucchi: OreRaggruppate,
  indice: IndiceDiagnosi,
): FaseOra {
  const presenti = new Set<FaseOra>()
  if (mucchi.inCorso.length > 0) presenti.add('in-corso')
  if (mucchi.daChiudere.length > 0) presenti.add('da-chiudere')
  for (const lezione of mucchi.prossime) {
    presenti.add(oraCoperta(registro, lezione, indice) ? 'futura' : 'da-preparare')
  }
  if (mucchi.svolte.length > 0) presenti.add('svolta')
  if (mucchi.annullate.length > 0) presenti.add('annullata')
  return PER_URGENZA.find((fase) => presenti.has(fase)) ?? 'futura'
}

function corsoDelVassoio (
  registro: Registro,
  corso: Corso,
  lezioni: Lezione[],
  oggi: Iso,
  ora: Ora,
  indice: IndiceDiagnosi,
): CorsoVassoio {
  const raggruppate = raggruppaOre(registro, lezioni, oggi, ora, indice)
  const fase = faseDelCorso(registro, raggruppate, indice)
  const titoli = testi().mucchi

  const mucchi = MUCCHI.map((mucchio) => {
    const ore = mucchio.prendi(raggruppate)
    return {
      chiave: mucchio.chiave,
      titolo: `${titoli[mucchio.chiave]} (${ore.length})`,
      ore: ore
        .slice(0, mucchio.quante)
        .map((lezione) =>
          voceOra(
            registro,
            lezione,
            faseDelMucchio(registro, mucchio.chiave, lezione, indice),
            oggi,
            ora,
            indice,
          ),
        ),
      altre: Math.max(0, ore.length - mucchio.quante),
    }
  }).filter((mucchio) => mucchio.ore.length > 0)

  return {
    corsoId: corso.id,
    etichetta: `${SEGNO_FASE[fase]} ${nomeDelCorso(registro, corso)}`,
    fase,
    riepilogo: riepilogoCorso(raggruppate),
    mucchi,
  }
}

// ------------------------------------------------------------------ l'albero

/**
 * Il menu del vassoio, tutto intero. I corsi dell'anno in uso restano
 * nell'ordine del nome, non d'urgenza: un menu che si riordina da sé va riletto
 * ogni volta. L'urgenza la dicono il segno e le due righe in testa. Un corso
 * senza ore non compare.
 */
export function alberoVassoio (registro: Registro, oggi: Iso, ora: Ora = '23:59'): AlberoVassoio {
  // In ordine del nome mostrato, non del titolo nei dati.
  const corsi = corsiDellAnno(registro, registro.annoCorrenteId).sort((a, b) =>
    confrontaNomi(nomeDelCorso(registro, a), nomeDelCorso(registro, b)),
  )

  // Piani e valutazioni indicizzati una volta per tutto l'albero.
  const indice = indiceDiagnosi(registro)

  const perCorso = new Map<string, Lezione[]>()
  for (const lezione of registro.lezioni) {
    const suo = perCorso.get(lezione.corsoId)
    if (suo) suo.push(lezione)
    else perCorso.set(lezione.corsoId, [lezione])
  }

  const dellAnno: Lezione[] = []
  const voci: CorsoVassoio[] = []
  for (const corso of corsi) {
    const lezioni = perCorso.get(corso.id) ?? []
    if (lezioni.length === 0) continue
    dellAnno.push(...lezioni)
    voci.push(corsoDelVassoio(registro, corso, lezioni, oggi, ora, indice))
  }

  // Dal mucchio, non da un secondo giro: il conto in testa e quelli dei corsi
  // devono venire dalla stessa fonte.
  const daChiudere = voci.reduce((totale, corso) => {
    const mucchio = corso.mucchi.find((m) => m.chiave === 'da-chiudere')
    return totale + (mucchio ? mucchio.ore.length + mucchio.altre : 0)
  }, 0)

  const primaInCorso =
    voci
      .flatMap((corso) => corso.mucchi.filter((m) => m.chiave === 'in-corso'))
      .flatMap((mucchio) => mucchio.ore)
      .at(0) ?? null

  const trovata = oraDaCompilare(registro, dellAnno, oggi, ora, indice)
  const daFare: OraDaFareVassoio | null = trovata
    ? {
        lezioneId: trovata.lezione.id,
        etichetta: etichettaDaFare(registro, trovata.lezione, trovata.manca, oggi),
        manca: trovata.manca,
      }
    : null

  return {
    intestazione: intestazione(daChiudere),
    suggerimento: suggerimento(daChiudere, primaInCorso, daFare),
    daChiudere,
    inCorso: primaInCorso,
    daFare,
    corsi: voci,
  }
}

/** «⚠ Da compilare: I MEC A — Matematica · ieri · 08:20–09:05». */
function etichettaDaFare (registro: Registro, lezione: Lezione, manca: boolean, oggi: Iso): string {
  const t = testi()
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId)
  const parti = [
    corso ? nomeDelCorso(registro, corso) : Uno(lessico().lezione),
    quando(lezione.data, oggi),
    orario(lezione),
  ].filter((pezzo) => pezzo.length > 0)
  const segno = manca ? SEGNO_FASE['da-chiudere'] : SEGNO_FASE.futura
  return `${segno} ${manca ? t.daCompilare : t.prossima}: ${parti.join(' · ')}`
}

function intestazione (daChiudere: number): string {
  const t = testi()
  return `${MARCHIO} — ${daChiudere === 0 ? t.nienteDaChiudere : t.daChiudere(daChiudere)}`
}

/**
 * Il suggerimento sopra l'icona. Windows lo tronca oltre il centinaio di
 * caratteri senza dirlo: la seconda riga (ora in corso, o quel che resta da
 * fare) va tenuta corta.
 */
function suggerimento (
  daChiudere: number,
  inCorso: VoceOraVassoio | null,
  daFare: OraDaFareVassoio | null,
): string {
  const righe = [MARCHIO]
  if (inCorso) righe.push(inCorso.etichetta)
  else if (daFare) righe.push(daFare.etichetta)
  if (daChiudere > 0) righe.push(testi().daChiudere(daChiudere))
  return righe.join('\n')
}
