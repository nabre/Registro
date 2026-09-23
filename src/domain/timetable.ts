// L'orario: da come si ripete la settimana alle lezioni vere sul calendario.
//
// Un docente non inventa le proprie ore una per una — le ha fisse, e cambiano
// due volte l'anno. Il registro finora chiedeva di ribatterle trentacinque
// volte per corso; qui si dichiara lo stampo una volta e le lezioni nascono da
// sole, saltando vacanze e giorni di chiusura.
//
// La generazione non è mai distruttiva: guarda che cosa c'è già e aggiunge solo
// quel che manca. Si può rilanciare a ogni cambio d'orario senza pensarci, e
// una lezione spostata a mano resta dove l'ha messa chi la insegna.

import { inizioLezione, lezioniSovrapposte, unitaDidattiche } from './calculations.js'
import { aIso, daIso, giornoSettimana, nelPeriodo, sommaMinuti, udDaMinuti } from './dates.js'
import { creaLezione } from './factories.js'
import type {
  AnnoScolastico,
  Corso,
  Iso,
  Lezione,
  Registro,
  Ricorrenza,
  Sospensione,
} from './models.js'

/** Il periodo di sospensione che contiene una data, se ce n'è uno. */
export function sospensioneDi (anno: AnnoScolastico | null, data: Iso): Sospensione | null {
  if (!anno) return null
  return anno.sospensioni.find((s) => nelPeriodo(data, s.dal, s.al)) ?? null
}

/** Vero se in quel giorno non si fa lezione. */
export function sospeso (anno: AnnoScolastico | null, data: Iso): boolean {
  return sospensioneDi(anno, data) !== null
}

/** Se la ricorrenza vale in quella data: dentro i suoi estremi, quando li ha. */
function valeIl (ricorrenza: Ricorrenza, data: Iso): boolean {
  if (ricorrenza.dal && data < ricorrenza.dal) return false
  if (ricorrenza.al && data > ricorrenza.al) return false
  return true
}

/** Una fascia dell'orario descritta a parole: 'mar 08:20–09:50'. */
const GIORNI = ['', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom']

export function descriviRicorrenza (ricorrenza: Ricorrenza): string {
  const fine = sommaMinuti(ricorrenza.inizio, ricorrenza.durataMin)
  const giorno = GIORNI[ricorrenza.giorno] ?? '?'
  const ud = udDaMinuti(ricorrenza.durataMin)
  return `${giorno} ${ricorrenza.inizio}–${fine} · ${ud} UD${ricorrenza.aula ? ` · ${ricorrenza.aula}` : ''}`
}

/**
 * Le fasce incatenate: ognuna comincia dove finisce la precedente del suo
 * giorno.
 *
 * L'orario di una giornata è un seguito, non un elenco di ore sparse: mercoledì
 * si fanno due ore e poi altre due, e la seconda fascia comincia quando finisce
 * la prima. L'ordine dentro il giorno è quello dell'elenco — si cambia
 * trascinando — e la prima fascia di ogni giorno è l'unica di cui si dichiari
 * l'ora: le altre la ereditano, e ribatterle a mano è solo un modo per farle
 * scivolare di cinque minuti senza accorgersene.
 */
export function ricorrenzeIncatenate (orario: Ricorrenza[]): Ricorrenza[] {
  const esito: Ricorrenza[] = []
  for (const voce of orario) {
    const prima = esito.at(-1)
    const attaccata =
      prima && prima.giorno === voce.giorno
        ? { ...voce, inizio: sommaMinuti(prima.inizio, prima.durataMin) }
        : { ...voce }
    esito.push(attaccata)
  }
  return esito
}

/**
 * Le date in cui l'orario di un corso cade, fra due estremi. Fuori dall'anno
 * non si esce, e i giorni sospesi non ci sono.
 */
export function dateDellOrario (
  anno: AnnoScolastico | null,
  corso: Corso,
  dal: Iso,
  al: Iso,
): Array<{ data: Iso; ricorrenza: Ricorrenza }> {
  if (corso.orario.length === 0) return []

  const inizio = anno && dal < anno.inizio ? anno.inizio : dal
  const fine = anno && al > anno.fine ? anno.fine : al
  if (inizio > fine) return []

  const esito: Array<{ data: Iso; ricorrenza: Ricorrenza }> = []
  const cursore = daIso(inizio)
  const ultimo = daIso(fine).getTime()
  // Un semestre sono un centinaio di giorni: si scorrono, senza aritmetica
  // furba che poi sbaglia sull'ora legale.
  let passi = 0
  while (cursore.getTime() <= ultimo && passi < 1200) {
    passi += 1
    const data = aIso(cursore)
    if (!sospeso(anno, data)) {
      const giorno = giornoSettimana(data)
      for (const ricorrenza of corso.orario) {
        if (ricorrenza.giorno === giorno && valeIl(ricorrenza, data)) {
          esito.push({ data, ricorrenza })
        }
      }
    }
    cursore.setUTCDate(cursore.getUTCDate() + 1)
  }
  return esito
}

interface EsitoGenerazione {
  /** Le lezioni da aggiungere: nuove di zecca, mai salvate. */
  nuove: Lezione[]
  /** Quante ne esistevano già in quel giorno e a quell'ora: si lasciano stare. */
  saltate: number
  /**
   * Quante delle nuove si accavallano a un'ora di un altro corso: si
   * aggiungono lo stesso — l'orario è uno stampo, non un vincolo — ma va
   * detto, perché due classi nella stessa ora sono quasi sempre un refuso
   * nell'orario di una delle due.
   */
  conflitti: number
}

/**
 * Le lezioni che mancano perché il calendario rispecchi l'orario, fra due date.
 *
 * Il confronto è su corso, giorno e ora d'inizio: è quel che identifica un'ora
 * di lezione per chi la insegna. Una lezione già lì — magari con l'appello
 * fatto e il consuntivo scritto — non viene toccata né duplicata.
 */
export function lezioniDaOrario (
  registro: Registro,
  corso: Corso,
  dal: Iso,
  al: Iso,
): EsitoGenerazione {
  const classe = registro.classi.find((c) => c.id === corso.classeId) ?? null
  const anno = classe ? registro.anni.find((a) => a.id === classe.annoId) ?? null : null

  const gia = new Set(
    registro.lezioni
      .filter((l) => l.corsoId === corso.id)
      .map((l) => `${l.data} ${inizioLezione(l) ?? ''}`),
  )

  const nuove: Lezione[] = []
  let saltate = 0
  let conflitti = 0
  for (const { data, ricorrenza } of dateDellOrario(anno, corso, dal, al)) {
    const chiave = `${data} ${ricorrenza.inizio}`
    if (gia.has(chiave)) {
      saltate += 1
      continue
    }
    // Nella stessa passata due ricorrenze non devono produrre la stessa ora.
    gia.add(chiave)
    const lezione = creaLezione(corso.id, data, ricorrenza.inizio, ricorrenza.durataMin)
    if (ricorrenza.aula) lezione.aula = ricorrenza.aula
    if (lezioniSovrapposte(registro.lezioni, lezione).length > 0) conflitti += 1
    nuove.push(lezione)
  }
  return { nuove, saltate, conflitti }
}

/**
 * Le unità didattiche che l'orario del corso prevede fra due date.
 *
 * È il cento per cento delle presenze: le ore che quel corso *deve* fare nel
 * periodo, non quelle che sono finite sul calendario. Le due cose non
 * coincidono quasi mai — a metà ottobre metà del semestre non è ancora stata
 * generata, e una percentuale contata sulle ore esistenti direbbe che tutti
 * hanno seguito tutto. Detta sul monte ore vero, dice quanto manca.
 *
 * Le sospensioni sono già fuori: `dateDellOrario` salta le vacanze, ed è la
 * ragione per cui le si dichiara. Un corso senza orario fisso non ha un monte
 * ore da cui partire e torna zero: chi chiama decide che cosa farne.
 *
 * **E le ore annullate sono fuori anche loro**, quando si passano le lezioni.
 * Una gita, un esame, un'ora saltata: l'orario la prevedeva, ma nessuno poteva
 * mancarci. Lasciarla nel monte ore abbassava la quota di tutti — nove martedì
 * da due UD, tre annullati e quattro UD perse si leggevano «22% su 18» invece
 * di «33% su 12», e con tre UD perse il 25% vero finiva sotto la soglia del
 * 20% senza avviso. Si toglie l'occorrenza dell'orario che l'ora annullata
 * occupava: stesso giorno, stessa ora d'inizio. Un'ora annullata fuori
 * dall'orario non toglie niente, perché nel monte ore non c'era.
 */
export function udPrevisteDaOrario (
  anno: AnnoScolastico | null,
  corso: Corso,
  dal: Iso,
  al: Iso,
  lezioni: readonly Lezione[] = [],
): number {
  const annullate = new Set(
    lezioni
      .filter((l) => l.corsoId === corso.id && l.stato === 'annullata')
      .map((l) => `${l.data} ${inizioLezione(l) ?? ''}`),
  )
  // Si conta costruendo l'ora che ne uscirebbe, invece di dividere i minuti
  // per quarantacinque: è lo stesso conto che fa una lezione vera, e due
  // aritmetiche diverse per la stessa domanda finiscono per dare due numeri.
  return dateDellOrario(anno, corso, dal, al)
    .filter(({ data, ricorrenza }) => !annullate.has(`${data} ${ricorrenza.inizio}`))
    .reduce(
      (somma, { data, ricorrenza }) =>
        somma + unitaDidattiche(creaLezione(corso.id, data, ricorrenza.inizio, ricorrenza.durataMin)).length,
      0,
    )
}

/**
 * I giorni della settimana che il calendario mostra, in ordine.
 *
 * Vuoto vuol dire «non scelto», non «nessun giorno»: si torna alla settimana
 * corta da lunedì a venerdì, che è la scuola di tutti i giorni.
 */
export function giorniMostrati (registro: Registro): number[] {
  const scelti = registro.impostazioni.giorniVisibili
  return scelti.length > 0 ? [...scelti].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}
