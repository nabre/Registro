// Che cosa scrivere nel menu dell'icona accanto all'orologio.
//
// Il vassoio è l'unico posto del registro che si guarda *senza* aprirlo: un
// tasto destro, e la risposta deve essere già lì. La domanda è sempre la
// stessa — «di questo corso, che cosa ho fatto, che cosa devo chiudere, che
// cosa viene adesso» — e il menu la risponde in tre livelli: l'anno in testa,
// i corsi in mezzo, le ore dentro.
//
// ## Perché sta nel dominio
//
// Qui non c'è Electron e non c'è un orologio: si passano il registro, il giorno
// e l'ora, e si ottiene un albero di stringhe. Vuol dire che «alle 08:30 il
// menu segna quell'ora come in corso» si prova con `node --test`, senza aprire
// un'applicazione e senza aspettare le 08:30. La traduzione in menu nativo la
// fa `ambiente/vassoio.ts`, che di lezioni non sa niente.
//
// ## I segni
//
// Sei fasi e sei segni, sempre gli stessi e sempre in prima colonna: un menu si
// scorre con la coda dell'occhio, e la parola arriva dopo il simbolo. Stanno in
// `SEGNO_FASE` e non sparsi nelle etichette perché la stessa fase compare in due
// punti — il corso e le sue ore — e due simboli diversi per la stessa cosa
// sarebbero due cose diverse per chi legge.
//
// La distinzione che costa di più è fra «svolta» e «da chiudere», ed è per
// questo che l'ora non porta solo il segno ma anche il *perché*: «senza
// appello» e «non segnata svolta» sono due buchi diversi, si chiudono in due
// posti diversi, e un menu che dicesse soltanto «da chiudere» costringerebbe ad
// aprire l'ora per sapere che cosa manca.

import { fineLezione, inizioLezione } from './calcoli.js'
import { classeDelCorso, corsiDellAnno, materiaDelCorso, titoloCorso } from './corsi.js'
import {
  diagnosiLezione,
  oraDaCompilare,
  raggruppaOre,
  type FaseOra,
  type OreRaggruppate,
} from './cruscotto.js'
import { formattaData, sommaGiorni } from './date.js'
import type { Corso, Iso, Lezione, Ora, Registro } from './modelli.js'

/** Il segno in prima colonna: uno per fase, ovunque la fase compaia. */
export const SEGNO_FASE: Readonly<Record<FaseOra, string>> = {
  'in-corso': '▶',
  'da-chiudere': '⚠',
  'da-preparare': '○',
  futura: '·',
  svolta: '✓',
  annullata: '×',
}

/** Come si chiama una fase parlando: va dentro le etichette, al singolare. */
export const NOME_FASE: Readonly<Record<FaseOra, string>> = {
  'in-corso': 'in corso',
  'da-chiudere': 'da chiudere',
  'da-preparare': 'da preparare',
  futura: 'in programma',
  svolta: 'svolta',
  annullata: 'annullata',
}

/**
 * I mucchi in cui le ore di un corso si presentano, nell'ordine del menu.
 *
 * «prossime» tiene insieme le future con e senza piano: sono la stessa cosa per
 * chi guarda — quel che viene — e distinguerle in due sottomenu vorrebbe dire
 * cercare la lezione di giovedì in due posti a seconda che sia preparata. La
 * differenza resta sull'ora, nel suo segno, che è dove serve.
 */
export type MucchioChiave = 'in-corso' | 'da-chiudere' | 'prossime' | 'svolte' | 'annullate'

const MUCCHI: ReadonlyArray<{
  chiave: MucchioChiave
  titolo: string
  /** Quante se ne mostrano prima di dire «e altre N». */
  quante: number
  prendi: (mucchi: OreRaggruppate) => Lezione[]
}> = [
  { chiave: 'in-corso', titolo: 'In corso', quante: 4, prendi: (m) => m.inCorso },
  { chiave: 'da-chiudere', titolo: 'Da chiudere', quante: 8, prendi: (m) => m.daChiudere },
  { chiave: 'prossime', titolo: 'Prossime', quante: 5, prendi: (m) => m.prossime },
  { chiave: 'svolte', titolo: 'Svolte', quante: 5, prendi: (m) => m.svolte },
  { chiave: 'annullate', titolo: 'Annullate', quante: 3, prendi: (m) => m.annullate },
]

/**
 * L'ordine in cui una fase chiede attenzione.
 *
 * Serve al segno del corso, che è uno solo per tutte le sue ore: fra dodici
 * svolte e un buco, quel che si deve vedere dal primo livello del menu è il
 * buco. Un corso senza niente di aperto si presenta con il segno della sua ora
 * più prossima, che è l'unica cosa che gli resta da dire.
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
export interface VoceOraVassoio {
  lezioneId: string
  fase: FaseOra
  /** «⚠ lun 12 · 08:20–09:05 · senza appello» */
  etichetta: string
}

export interface MucchioVassoio {
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
export interface OraDaFareVassoio {
  lezioneId: string
  etichetta: string
  /** Vero se è un buco rimasto indietro, falso se è soltanto la prossima. */
  manca: boolean
}

export interface AlberoVassoio {
  /** La riga spenta in testa al menu: «Registro docenti — 2 ore da chiudere». */
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
  if (data === oggi) return 'oggi'
  if (data === sommaGiorni(oggi, -1)) return 'ieri'
  if (data === sommaGiorni(oggi, 1)) return 'domani'
  return formattaData(data, 'giorno')
}

/** «08:20–09:05», o quel che c'è. Vuoto se l'ora non ha slot. */
function orario (lezione: Lezione): string {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  if (inizio && fine) return `${inizio}–${fine}`
  return inizio ?? ''
}

function plurale (quante: number, uno: string, tanti: string): string {
  return `${quante} ${quante === 1 ? uno : tanti}`
}

/**
 * Perché quest'ora sta in questo mucchio.
 *
 * È la parte minuziosa del menu, e la ragione per cui non basta il segno: due
 * ore da chiudere possono chiedere due cose diverse — una l'appello, l'altra
 * solo la spunta di «svolta» — e chi legge deve poter decidere quale aprire
 * senza aprirle tutte e due.
 */
function motivoDellOra (
  registro: Registro,
  lezione: Lezione,
  fase: FaseOra,
  oggi: Iso,
  ora: Ora,
): string {
  const diagnosi = diagnosiLezione(registro, lezione, 0, oggi, ora)
  const pezzi: string[] = []

  switch (fase) {
    case 'in-corso': {
      const fine = fineLezione(lezione)
      pezzi.push(fine ? `fino alle ${fine}` : NOME_FASE['in-corso'])
      break
    }
    case 'da-chiudere':
      if (diagnosi.segni.includes('senza-appello')) pezzi.push('senza appello')
      if (diagnosi.segni.includes('da-segnare')) pezzi.push('non segnata svolta')
      break
    case 'svolta':
      pezzi.push(
        diagnosi.assenti > 0 ? plurale(diagnosi.assenti, 'assente', 'assenti') : 'tutti presenti',
      )
      if (diagnosi.osservazioni > 0) {
        pezzi.push(plurale(diagnosi.osservazioni, 'osservazione', 'osservazioni'))
      }
      break
    case 'da-preparare':
      pezzi.push('senza piano')
      break
    case 'futura':
      pezzi.push('con piano')
      break
    case 'annullata':
      pezzi.push(NOME_FASE.annullata)
      break
  }

  // La verifica si dice sempre: è il fatto che cambia come si prepara l'ora e
  // come la si chiude, e vederlo qui evita di aprire il calendario per saperlo.
  if (diagnosi.segni.includes('valutazione')) pezzi.push('verifica')
  // L'aula solo dove serve: davanti a un'ora già fatta non ci si va più.
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
): VoceOraVassoio {
  const parti = [
    quando(lezione.data, oggi),
    orario(lezione),
    motivoDellOra(registro, lezione, fase, oggi, ora),
  ].filter((pezzo) => pezzo.length > 0)
  return { lezioneId: lezione.id, fase, etichetta: `${SEGNO_FASE[fase]} ${parti.join(' · ')}` }
}

// ------------------------------------------------------------------- i corsi

/**
 * Come si chiama un corso nel vassoio: «I MEC A — Matematica», sempre.
 *
 * Dalla catena classe → materia e non da `corso.titolo`, che è un campo libero:
 * lo si può rinominare «Mat 3A» o lasciarlo com'era prima di uno spostamento di
 * classe, e un menu che elenca dieci corsi ha bisogno che si leggano tutti allo
 * stesso modo. La classe davanti perché è quella che si cerca — prima si sa
 * dove si entra, poi che cosa ci si fa — ed è anche l'ordine con cui i corsi si
 * dispongono nel menu, che così tiene vicine le materie della stessa classe.
 */
function nomeDelCorso (registro: Registro, corso: Corso): string {
  return titoloCorso(classeDelCorso(registro, corso), materiaDelCorso(registro, corso))
}

/** La fase di un'ora già smistata: si ricava dal mucchio, senza rifare il conto. */
function faseDelMucchio (chiave: MucchioChiave, lezione: Lezione): FaseOra {
  switch (chiave) {
    case 'in-corso':
      return 'in-corso'
    case 'da-chiudere':
      return 'da-chiudere'
    case 'svolte':
      return 'svolta'
    case 'annullate':
      return 'annullata'
    // Le prossime sono due cose in un mucchio solo: qui si tornano a
    // distinguere, perché il segno dell'ora è dove la differenza si vede.
    default:
      return lezione.pianoId ? 'futura' : 'da-preparare'
  }
}

/** «1 in corso · 2 da chiudere · 12 svolte»: solo i mucchi che hanno qualcosa. */
function riepilogoCorso (mucchi: OreRaggruppate): string {
  const pezzi: string[] = []
  if (mucchi.inCorso.length > 0) pezzi.push(`${mucchi.inCorso.length} in corso`)
  if (mucchi.daChiudere.length > 0) pezzi.push(`${mucchi.daChiudere.length} da chiudere`)
  if (mucchi.prossime.length > 0) pezzi.push(`${mucchi.prossime.length} in programma`)
  if (mucchi.svolte.length > 0) pezzi.push(`${mucchi.svolte.length} svolte`)
  if (mucchi.annullate.length > 0) pezzi.push(`${mucchi.annullate.length} annullate`)
  return pezzi.length > 0 ? pezzi.join(' · ') : 'nessuna ora'
}

function faseDelCorso (mucchi: OreRaggruppate): FaseOra {
  const presenti = new Set<FaseOra>()
  if (mucchi.inCorso.length > 0) presenti.add('in-corso')
  if (mucchi.daChiudere.length > 0) presenti.add('da-chiudere')
  for (const lezione of mucchi.prossime) presenti.add(lezione.pianoId ? 'futura' : 'da-preparare')
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
): CorsoVassoio {
  const raggruppate = raggruppaOre(registro, lezioni, oggi, ora)
  const fase = faseDelCorso(raggruppate)

  const mucchi = MUCCHI.map((mucchio) => {
    const ore = mucchio.prendi(raggruppate)
    return {
      chiave: mucchio.chiave,
      titolo: `${mucchio.titolo} (${ore.length})`,
      ore: ore
        .slice(0, mucchio.quante)
        .map((lezione) =>
          voceOra(registro, lezione, faseDelMucchio(mucchio.chiave, lezione), oggi, ora),
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
 * Il menu del vassoio, tutto intero.
 *
 * I corsi sono quelli dell'anno in uso e restano nell'ordine del loro nome —
 * che comincia dalla classe — e non in ordine di urgenza: un menu che si
 * riordina da sé costringe a rileggerlo ogni volta, e la fretta con cui lo si
 * apre è proprio quella in cui non si rilegge niente. L'urgenza la dice il
 * segno davanti, e le due righe in testa portano dove serve andare subito.
 *
 * Un corso senza nemmeno un'ora non compare: non ha niente da dire, e occupa
 * una riga che i corsi veri userebbero meglio.
 */
export function alberoVassoio (registro: Registro, oggi: Iso, ora: Ora = '23:59'): AlberoVassoio {
  // In ordine del nome che si legge, non del titolo scritto nei dati: il menu
  // si ordina per quel che mostra, o due corsi vicini nell'elenco sembrerebbero
  // messi a caso.
  const corsi = corsiDellAnno(registro, registro.annoCorrenteId).sort((a, b) =>
    nomeDelCorso(registro, a).localeCompare(nomeDelCorso(registro, b), 'it'),
  )

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
    voci.push(corsoDelVassoio(registro, corso, lezioni, oggi, ora))
  }

  // Dal mucchio e non da un secondo giro sulle lezioni: il conto in testa al
  // menu e i numeri dentro i corsi devono venire dalla stessa riga, o il giorno
  // in cui non tornano non si sa quale dei due credere.
  const daChiudere = voci.reduce((totale, corso) => {
    const mucchio = corso.mucchi.find((m) => m.chiave === 'da-chiudere')
    return totale + (mucchio ? mucchio.ore.length + mucchio.altre : 0)
  }, 0)

  const primaInCorso =
    voci
      .flatMap((corso) => corso.mucchi.filter((m) => m.chiave === 'in-corso'))
      .flatMap((mucchio) => mucchio.ore)
      .at(0) ?? null

  const trovata = oraDaCompilare(registro, dellAnno, oggi, ora)
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
  const corso = registro.corsi.find((c) => c.id === lezione.corsoId)
  const parti = [
    corso ? nomeDelCorso(registro, corso) : 'Lezione',
    quando(lezione.data, oggi),
    orario(lezione),
  ].filter((pezzo) => pezzo.length > 0)
  const segno = manca ? SEGNO_FASE['da-chiudere'] : SEGNO_FASE.futura
  return `${segno} ${manca ? 'Da compilare' : 'Prossima'}: ${parti.join(' · ')}`
}

function intestazione (daChiudere: number): string {
  if (daChiudere === 0) return 'Registro docenti — niente da chiudere'
  return `Registro docenti — ${plurale(daChiudere, 'ora da chiudere', 'ore da chiudere')}`
}

/**
 * Il suggerimento sopra l'icona: poche righe, e la seconda è quella che conta.
 *
 * Windows lo tronca oltre il centinaio di caratteri e non dice di averlo fatto,
 * quindi la riga utile va tenuta corta: l'ora in corso se c'è, altrimenti quel
 * che resta da fare.
 */
function suggerimento (
  daChiudere: number,
  inCorso: VoceOraVassoio | null,
  daFare: OraDaFareVassoio | null,
): string {
  const righe = ['Registro docenti']
  if (inCorso) righe.push(inCorso.etichetta)
  else if (daFare) righe.push(daFare.etichetta)
  if (daChiudere > 0) righe.push(plurale(daChiudere, 'ora da chiudere', 'ore da chiudere'))
  return righe.join('\n')
}
