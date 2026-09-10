// Il promemoria dell'ora che sta per cominciare: quale, e che cosa aspetta.
//
// È l'unica cosa del registro che parla senza essere interpellata, e questo
// cambia le regole. Una pagina che dice troppo la si scorre; una notifica che
// dice troppo la si spegne — e spegnendola si perde anche quella del martedì
// dopo, che serviva. Quindi: una sola notifica per ora, poche righe, e niente
// quando non c'è niente di nuovo da dire.
//
// Qui dentro non c'è Electron e non c'è un orologio: si passano il giorno e
// l'ora, e si ottiene che cosa scrivere. Vuol dire che «alle 08:15 il registro
// annuncia la lezione delle 08:20» si prova senza aspettare le 08:15.

import { consegneDellaLezione } from './consegne.js'
import { classeDellaLezione, materiaDellaLezione } from './corsi.js'
import { fineLezione, inizioLezione } from './calcoli.js'
import { minutiDaOra } from './date.js'
import type { Iso, Lezione, Ora, Registro } from './modelli.js'

/** Quel che si consegna al sistema operativo: un titolo, un corpo, e dove andare. */
export interface Promemoria {
  /** L'ora di cui si parla: chi preme la notifica va lì. */
  lezioneId: string
  titolo: string
  corpo: string
  /**
   * Quante cose aspettano quest'ora. Zero è una notifica che dice soltanto
   * «sta per cominciare», ed è comunque utile: è il momento in cui si prende
   * il computer in mano.
   */
  daFare: number
}

/**
 * Le ore che stanno per cominciare, e che quindi vale la pena annunciare.
 *
 * La finestra è `[adesso, adesso + anticipo]`: si guarda avanti di qualche
 * minuto e non indietro. Un'ora già cominciata non si annuncia — chi è in
 * classe lo sa di essere in classe — e un'ora di ieri men che meno.
 *
 * Le annullate restano fuori: non cominciano.
 */
export function oreCheCominciano (
  registro: Registro,
  giorno: Iso,
  ora: Ora,
  anticipoMinuti: number,
): Lezione[] {
  const adesso = minutiDaOra(ora)
  const limite = adesso + Math.max(0, anticipoMinuti)

  return registro.lezioni
    .filter((lezione) => lezione.data === giorno && lezione.stato !== 'annullata')
    .filter((lezione) => {
      const inizio = inizioLezione(lezione)
      if (!inizio) return false
      const minuti = minutiDaOra(inizio)
      return minuti >= adesso && minuti <= limite
    })
    .sort((a, b) => (inizioLezione(a) ?? '').localeCompare(inizioLezione(b) ?? ''))
}

/** «adesso», «fra 1 minuto», «fra 5 minuti»: quel che si direbbe a voce. */
function fraQuanto (inizio: Ora, ora: Ora): string {
  const mancano = minutiDaOra(inizio) - minutiDaOra(ora)
  if (mancano <= 0) return 'adesso'
  if (mancano === 1) return 'fra 1 minuto'
  return `fra ${mancano} minuti`
}

/**
 * Le cose aperte di quest'ora, dette in poche parole.
 *
 * Sono le stesse che il cruscotto segna con il pallino «todo» sulla prima ora
 * utile del corso: le consegne di quel corso che a quel giorno sono già state
 * date e non sono ancora chiuse. Non è il todo di tutta la classe — quello
 * riguarda anche le altre materie, e in aula di matematica non si può fare
 * niente per un documento di italiano.
 */
function coseAperte (registro: Registro, lezione: Lezione): { quante: number, detto: string } {
  const classe = classeDellaLezione(registro, lezione)
  const suoi = consegneDellaLezione(registro, lezione, classe)

  const pezzi: string[] = []
  if (suoi.arretrate.length > 0) pezzi.push(`${suoi.arretrate.length} in ritardo`)
  if (suoi.scadono.length > 0) pezzi.push(`${suoi.scadono.length} in scadenza`)
  if (suoi.aperte.length > 0) pezzi.push(`${suoi.aperte.length} da fare`)

  const quante = suoi.arretrate.length + suoi.scadono.length + suoi.aperte.length
  if (quante === 0) return { quante: 0, detto: '' }

  // I titoli delle prime, per non costringere ad aprire il registro solo per
  // sapere di che si tratta. Tre bastano: oltre, la notifica diventa un elenco
  // e il sistema la taglia comunque.
  const titoli = [...suoi.arretrate, ...suoi.scadono, ...suoi.aperte]
    .slice(0, 3)
    .map((consegna) => consegna.testo)
    .filter((testo) => testo.trim().length > 0)

  const testa = `${quante} ${quante === 1 ? 'cosa aperta' : 'cose aperte'} (${pezzi.join(', ')})`
  return { quante, detto: titoli.length > 0 ? `${testa}: ${titoli.join(' · ')}` : testa }
}

/**
 * Che cosa dire di un'ora che sta per cominciare.
 *
 * Il titolo è la classe e quanto manca, perché è quel che si legge di sfuggita
 * mentre la notifica passa. Il corpo è l'orario, l'aula, e quel che aspetta —
 * cioè quel che si vorrebbe sapere *prima* di entrare in classe, non dopo.
 */
export function promemoriaDellOra (
  registro: Registro,
  lezione: Lezione,
  ora: Ora,
): Promemoria {
  const classe = classeDellaLezione(registro, lezione)
  const materia = materiaDellaLezione(registro, lezione)?.nome ?? null
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)

  const nome = classe?.nome ?? 'Lezione'
  const titolo = inizio ? `${nome} ${fraQuanto(inizio, ora)}` : nome

  const righe: string[] = []
  const orario = inizio && fine ? `${inizio}–${fine}` : (inizio ?? '')
  const dove = [orario, materia, lezione.aula].filter(Boolean).join(' · ')
  if (dove) righe.push(dove)

  const aperte = coseAperte(registro, lezione)
  righe.push(aperte.quante > 0 ? aperte.detto : 'Niente in sospeso per questo corso.')

  return { lezioneId: lezione.id, titolo, corpo: righe.join('\n'), daFare: aperte.quante }
}
