// L'ora che si sta tenendo, come la si tiene dal desktop.
//
// È la terza scheda della striscia, ed è l'unica che scrive. Le altre due
// rispondono a «dove devo essere» e «sono indietro?»; questa risponde a
// «adesso»: chi c'è, che cosa si sta facendo, e le due cose che chiudono
// un'ora — l'appello e l'argomento. Sono anche le due che si perdono per sempre
// se non si fanno mentre la classe è lì davanti, ed è per questo che vale la
// pena di poterle fare senza aprire il registro.
//
// Quel che la scheda mostra sta qui; la scrittura passa dalle azioni di
// sempre — `actions/hours.ts`, le stesse che usa il registro — perché l'appello ha
// regole che non si vedono nei tipi (le righe si allungano quando l'ora cambia,
// chi si iscrive a metà anno compare, i minuti pendono da un ritardo) e due
// posti che le scrivono a modo loro sono due registri diversi.
//
// Come il resto dell'agenda: nessun orologio, nessun DOM. Entrano il registro,
// il giorno e l'ora, esce quel che c'è da disegnare.

import { annoDellAgenda } from './agenda.js'
import {
  allieviAttivi,
  confrontaLezioni,
  contaUd,
  fineLezione,
  inizioLezione,
  momentoLezione,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  statiAllineati,
  statoDellOra,
} from './calculations.js'
import { classeDelCorso, corsoPerId, materiaDelCorso, siglaMateria } from './courses.js'
import { cosaManca, diagnosiLezione, faseDellOra, type FaseOra } from './dashboard.js'
import { GIORNI_BREVI, giornoDelMese, giornoSettimana } from './dates.js'
import type { Iso, Lezione, Ora, Registro, StatoLezione, StatoPresenza } from './models.js'

/** Una riga dell'appello: una persona, e com'è messa in quest'ora. */
interface RigaAppelloAgenda {
  allievoId: string
  /** 'Rossi Maria': il nome per esteso, che finisce nel suggerimento. */
  nome: string
  /** 'Rossi M.': quel che sta in una striscia larga come una colonna di icone. */
  breve: string
  /** Il riassunto della riga, che è quel che il bottone mostra. */
  stato: StatoPresenza
  /** Le caselle una per unità didattica: servono a sapere se la riga è mista. */
  stati: StatoPresenza[]
  /** Vero quando le unità non dicono tutte la stessa cosa: entrato dopo, uscito prima. */
  mista: boolean
  minuti: number | null
  nota: string | null
}

/** Come l'ora è finita sotto gli occhi: la scheda lo dice, e cambia il tono. */
type SceltaOra =
  /** Sta succedendo adesso. */
  | 'in-corso'
  /** È passata e il suo registro è rimasto aperto. */
  | 'aperta'
  /** Deve ancora cominciare. */
  | 'prossima'
  /** L'ha scelta chi guarda, scorrendo con le frecce. */
  | 'fissata'

interface LezioneAgenda {
  lezioneId: string
  data: Iso
  /** 'ven 12', come in testa a una colonna del registro. */
  quando: string
  inizio: Ora | null
  fine: Ora | null
  classe: string
  materia: string
  aula: string | null
  fase: FaseOra
  stato: StatoLezione
  scelta: SceltaOra
  /** Quante unità didattiche ha: l'appello si scrive per riga, ma il conto è questo. */
  ud: number
  argomenti: string
  appello: RigaAppelloAgenda[]
  presenti: number
  assenti: number
  /** Di quante persone non si è ancora detto niente: è il lavoro che resta. */
  senzaAppello: number
  /** Che cosa manca perché l'ora sia chiusa. Vuoto quando è a posto. */
  manca: string[]
  /** Le ore attorno, per le frecce: `null` dove non c'è più niente. */
  precedente: string | null
  successiva: string | null
}

/** 'Rossi M.': il cognome intero e l'iniziale, che è come si chiama una classe. */
function nomeBreve (cognome: string, nome: string): string {
  const iniziale = nome.trim().slice(0, 1)
  return iniziale ? `${cognome} ${iniziale}.` : cognome
}

/** Le ore dell'anno in uso, in ordine di calendario: l'elenco su cui si scorre. */
function oreDellAnno (registro: Registro): Lezione[] {
  const anno = annoDellAgenda(registro)
  if (!anno) return []
  const classi = new Set(
    registro.classi.filter((classe) => classe.annoId === anno.id).map((classe) => classe.id),
  )
  const corsi = new Set(
    registro.corsi.filter((corso) => classi.has(corso.classeId)).map((corso) => corso.id),
  )
  return registro.lezioni.filter((lezione) => corsi.has(lezione.corsoId)).sort(confrontaLezioni)
}

/**
 * Quale ora tenere sotto gli occhi, quando nessuno l'ha scelta.
 *
 * Tre risposte in ordine, e l'ordine è tutto:
 *
 *   **Quella in corso**, perché è la ragione per cui la scheda esiste: la
 *   classe è lì, e l'appello va fatto adesso.
 *
 *   **Il buco più vecchio**, perché un'ora passata senza appello non si chiude
 *   da sé e diventa più difficile ogni giorno; mostrare subito «la prossima è
 *   giovedì» la farebbe dimenticare per sempre.
 *
 *   **La prossima**, che è quel che resta da dire quando non manca niente.
 *
 * È lo stesso ordine di `oraDaCompilare`, con l'ora in corso davanti: là si
 * risponde a «dove vado a lavorare», qui a «che cosa sto facendo».
 */
export function oraDaTenere (registro: Registro, oggi: Iso, ora: Ora): Lezione | null {
  const ore = oreDellAnno(registro)

  const inCorso = ore.find(
    (lezione) => lezione.stato !== 'annullata' && momentoLezione(lezione, oggi, ora) === 'in-corso',
  )
  if (inCorso) return inCorso

  const buco = ore.find(
    (lezione) =>
      lezione.data <= oggi && diagnosiLezione(registro, lezione, 0, oggi, ora).urgenza === 'manca',
  )
  if (buco) return buco

  return (
    ore.find(
      (lezione) => lezione.stato !== 'annullata' && momentoLezione(lezione, oggi, ora) !== 'passata',
    ) ?? null
  )
}

/** Perché quest'ora è quella mostrata: vedi `SceltaOra`. */
function sceltaDi (
  lezione: Lezione,
  oggi: Iso,
  ora: Ora,
  fissata: boolean,
): SceltaOra {
  if (fissata) return 'fissata'
  const momento = momentoLezione(lezione, oggi, ora)
  if (momento === 'in-corso') return 'in-corso'
  return momento === 'passata' ? 'aperta' : 'prossima'
}

/**
 * L'appello com'è adesso, una riga per persona che frequenta.
 *
 * Le righe si fanno qui e non si leggono da `lezione.presenze`: un'ora appena
 * aperta non ne ha nessuna, e una classe che si è allungata a metà anno ne ha
 * una in meno di quante ne servono. È la stessa regola di `actions/hours.ts`, che
 * è chi le scrive davvero — qui si guarda soltanto.
 */
function appelloDi (registro: Registro, lezione: Lezione): RigaAppelloAgenda[] {
  const classe = classeDelCorso(registro, corsoPerId(registro, lezione.corsoId))
  if (!classe) return []
  const ud = contaUd(lezione)
  const perId = new Map(lezione.presenze.map((presenza) => [presenza.allievoId, presenza]))

  return ordinaAllievi(allieviAttivi(classe)).map((allievo) => {
    const presenza = perId.get(allievo.id)
    const stati = statiAllineati(presenza, ud)
    const decisi = stati.filter((stato) => stato !== 'non-impostato')
    return {
      allievoId: allievo.id,
      nome: nomeCompleto(allievo),
      breve: nomeBreve(allievo.cognome, allievo.nome),
      stato: statoDellOra(stati),
      stati,
      mista: decisi.length > 0 && decisi.some((stato) => stato !== decisi[0]),
      minuti: presenza?.minuti ?? null,
      nota: presenza?.nota?.trim() || null,
    }
  })
}

/**
 * L'ora da tenere, tutta intera.
 *
 * `lezioneId` la fissa: sono le frecce della scheda, con cui si va indietro a
 * chiudere l'ora di ieri. Senza — o con un id che non c'è più, perché nel
 * frattempo l'ora è stata cancellata — si torna a quella di adesso: una scheda
 * che restasse vuota davanti a una classe sarebbe peggio di una che si è mossa
 * da sola.
 *
 * `null` quando non c'è proprio niente: nessun registro aperto, o un anno senza
 * ore.
 */
export function lezioneAgenda (
  registro: Registro,
  oggi: Iso,
  ora: Ora,
  lezioneId: string | null = null,
): LezioneAgenda | null {
  const ore = oreDellAnno(registro)
  const fissata = lezioneId ? (ore.find((lezione) => lezione.id === lezioneId) ?? null) : null
  const lezione = fissata ?? oraDaTenere(registro, oggi, ora)
  if (!lezione) return null

  const corso = corsoPerId(registro, lezione.corsoId)
  const appello = appelloDi(registro, lezione)
  const conti = riepilogaPresenze(lezione.presenze)
  const dove = ore.findIndex((altra) => altra.id === lezione.id)

  return {
    lezioneId: lezione.id,
    data: lezione.data,
    quando: `${GIORNI_BREVI[giornoSettimana(lezione.data) - 1]} ${giornoDelMese(lezione.data)}`,
    inizio: (inizioLezione(lezione)) ?? null,
    fine: (fineLezione(lezione)) ?? null,
    classe: classeDelCorso(registro, corso)?.nome ?? 'classe',
    materia: siglaMateria(materiaDelCorso(registro, corso)),
    aula: lezione.aula?.trim() || null,
    fase: faseDellOra(registro, lezione, oggi, ora),
    stato: lezione.stato,
    scelta: sceltaDi(lezione, oggi, ora, fissata !== null),
    ud: contaUd(lezione),
    argomenti: lezione.argomenti ?? '',
    appello,
    presenti: conti.presenti,
    assenti: conti.assenti + conti.parziali,
    // Chi non ha ancora una casella decisa: le righe che il registro non ha mai
    // avuto contano come mancanti, o un'ora mai aperta direbbe «appello a posto».
    senzaAppello: appello.filter((riga) => riga.stato === 'non-impostato').length,
    manca: cosaManca(diagnosiLezione(registro, lezione, 0, oggi, ora)),
    precedente: dove > 0 ? ore[dove - 1].id : null,
    successiva: dove >= 0 && dove < ore.length - 1 ? ore[dove + 1].id : null,
  }
}
