// L'orario: dallo stampo settimanale alle lezioni sul calendario, saltando
// vacanze e chiusure.
//
// La generazione non è distruttiva: aggiunge solo quel che manca, si può
// rilanciare a ogni cambio d'orario, e una lezione spostata a mano resta dov'è.

import { inizioLezione, lezioniSovrapposte, unitaDidattiche } from './calculations.js'
import {
  giorniBrevi,
  siglaUd,
  aIso,
  daIso,
  giornoSettimana,
  nelPeriodo,
  udDaMinuti,
} from './dates.js'
import { fineNellaGiornata, lezioneNellaGiornata, oraFuoriDallePause } from './breaks.js'
import { creaLezione } from './factories.js'
import type {
  AnnoScolastico,
  Corso,
  Giornata,
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

/**
 * Se una lezione si può togliere senza perdere niente: pianificata, senza
 * appello, osservazioni, testi né piano, e nominata da nessuno (valutazione,
 * consegna, spunta).
 */
function lezioneIntatta (registro: Registro, lezione: Lezione): boolean {
  if (lezione.stato !== 'pianificata') return false
  if (lezione.pianoId || lezione.avanzamento.length) return false
  if (lezione.presenze.length || lezione.osservazioni.length) return false
  if (lezione.matrice?.length) return false
  const testi = [lezione.argomenti, lezione.materiali, lezione.consuntivo]
  if (testi.some((t) => t?.trim())) return false
  const id = lezione.id
  if (registro.valutazioni.some((v) => v.lezioneId === id)) return false
  const legataA = (c: { dataLezioneId?: string | null, scadenzaLezioneId?: string | null }) =>
    c.dataLezioneId === id || c.scadenzaLezioneId === id
  if (registro.consegne.some(legataA)) return false
  return !registro.check.some((c) => c.spunte.some((s) => s.lezioneId === id))
}

/**
 * Le lezioni dell'anno nei giorni che `dopo` chiude e `prima` no: quelle
 * intatte da togliere e quelle con dati. Solo i giorni chiusi adesso: una
 * lezione messa a mano in una vacanza già dichiarata è voluta.
 */
export function lezioniNeiGiorniChiusi (
  registro: Registro,
  prima: AnnoScolastico | null,
  dopo: AnnoScolastico,
): { intatte: Lezione[], conDati: Lezione[] } {
  const classi = new Set(registro.classi.filter((c) => c.annoId === dopo.id).map((c) => c.id))
  const corsi = new Set(registro.corsi.filter((c) => classi.has(c.classeId)).map((c) => c.id))
  const intatte: Lezione[] = []
  const conDati: Lezione[] = []
  for (const lezione of registro.lezioni) {
    if (!corsi.has(lezione.corsoId)) continue
    if (!sospeso(dopo, lezione.data) || sospeso(prima, lezione.data)) continue
    if (lezioneIntatta(registro, lezione)) intatte.push(lezione)
    else conDati.push(lezione)
  }
  return { intatte, conDati }
}

/**
 * Le lezioni dell'anno in un giorno di chiusura fra due date (messe a mano, o
 * precedenti alla chiusura). Chiusi sono solo gli intervalli dichiarati, non
 * il fine settimana.
 */
export function lezioniInChiusura (
  registro: Registro,
  anno: AnnoScolastico | null,
  dal: Iso,
  al: Iso,
): Lezione[] {
  if (!anno) return []
  const classi = new Set(registro.classi.filter((c) => c.annoId === anno.id).map((c) => c.id))
  const corsi = new Set(registro.corsi.filter((c) => classi.has(c.classeId)).map((c) => c.id))
  return registro.lezioni.filter((lezione) =>
    corsi.has(lezione.corsoId) && lezione.data >= dal && lezione.data <= al && sospeso(anno, lezione.data))
}

/** Se la ricorrenza vale in quella data: dentro i suoi estremi, quando li ha. */
function valeIl (ricorrenza: Ricorrenza, data: Iso): boolean {
  if (ricorrenza.dal && data < ricorrenza.dal) return false
  if (ricorrenza.al && data > ricorrenza.al) return false
  return true
}

/**
 * Una fascia dell'orario a parole: 'mar 08:20–09:50'. La fine è quella della
 * lezione che ne nasce, pause della giornata comprese.
 */
export function descriviRicorrenza (ricorrenza: Ricorrenza, giornata: Giornata): string {
  const fine = fineNellaGiornata(ricorrenza.inizio, ricorrenza.durataMin, giornata)
  const giorno = giorniBrevi()[ricorrenza.giorno - 1] ?? '?'
  const ud = udDaMinuti(ricorrenza.durataMin, giornata.minutiUd)
  return `${giorno} ${ricorrenza.inizio}–${fine} · ${ud} ${siglaUd()}${ricorrenza.aula ? ` · ${ricorrenza.aula}` : ''}`
}

/**
 * Le fasce incatenate: ognuna comincia dove finisce la precedente dello stesso
 * giorno (ordine dell'elenco, che si cambia trascinando). Solo la prima fascia
 * del giorno dichiara l'ora. Con le pause: dove finisce la lezione precedente,
 * o alla fine della pausa se lì ne comincia una.
 */
export function ricorrenzeIncatenate (orario: Ricorrenza[], giornata: Giornata): Ricorrenza[] {
  const esito: Ricorrenza[] = []
  for (const voce of orario) {
    const prima = esito.at(-1)
    const attaccata =
      prima && prima.giorno === voce.giorno
        ? {
            ...voce,
            inizio: oraFuoriDallePause(
              fineNellaGiornata(prima.inizio, prima.durataMin, giornata),
              giornata,
            ),
          }
        : { ...voce }
    esito.push(attaccata)
  }
  return esito
}

/** Le date in cui cade l'orario di un corso fra due estremi, dentro l'anno e fuori dalle chiusure. */
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
  // Si scorrono i giorni uno a uno: niente aritmetica che sbagli sull'ora legale.
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
   * Quante delle nuove si accavallano a un'ora di un altro corso: si aggiungono
   * lo stesso (l'orario è uno stampo), ma è quasi sempre un refuso da segnalare.
   */
  conflitti: number
}

/**
 * Le lezioni che mancano perché il calendario rispecchi l'orario, fra due date.
 * Identità: corso, giorno, ora d'inizio della lezione che ne nasce (non della
 * fascia: una fascia che comincia in pausa fa una lezione che comincia dopo).
 * Le lezioni esistenti non si toccano. Le UD si fermano alle pause della
 * giornata.
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
  const giornata = registro.impostazioni
  for (const { data, ricorrenza } of dateDellOrario(anno, corso, dal, al)) {
    const lezione =
      lezioneNellaGiornata(corso.id, data, ricorrenza.inizio, ricorrenza.durataMin, giornata)
    const chiave = `${data} ${inizioLezione(lezione) ?? ''}`
    if (gia.has(chiave)) {
      saltate += 1
      continue
    }
    // Nella stessa passata due ricorrenze non devono produrre la stessa ora.
    gia.add(chiave)
    if (ricorrenza.aula) lezione.aula = ricorrenza.aula
    if (lezioniSovrapposte(registro.lezioni, lezione).length > 0) conflitti += 1
    nuove.push(lezione)
  }
  return { nuove, saltate, conflitti }
}

/**
 * Le unità didattiche che l'orario del corso prevede fra due date: il cento
 * per cento delle presenze, cioè le ore dovute e non quelle già generate.
 * Chiusure escluse; un corso senza orario torna zero.
 *
 * Con `lezioni`, si tolgono anche le occorrenze occupate da un'ora annullata
 * (stesso giorno e ora d'inizio): nessuno poteva mancarci, e lasciarle
 * abbasserebbe la quota di assenza sotto la soglia.
 */
export function udPrevisteDaOrario (
  anno: AnnoScolastico | null,
  corso: Corso,
  dal: Iso,
  al: Iso,
  minutiUd: number,
  lezioni: readonly Lezione[] = [],
): number {
  const annullate = new Set(
    lezioni
      .filter((l) => l.corsoId === corso.id && l.stato === 'annullata')
      .map((l) => `${l.data} ${inizioLezione(l) ?? ''}`),
  )
  // Si costruisce l'ora che ne uscirebbe invece di dividere i minuti: lo stesso
  // conto di una lezione vera.
  return dateDellOrario(anno, corso, dal, al)
    .filter(({ data, ricorrenza }) => !annullate.has(`${data} ${ricorrenza.inizio}`))
    .reduce(
      (somma, { data, ricorrenza }) =>
        somma +
        unitaDidattiche(
          creaLezione(corso.id, data, ricorrenza.inizio, ricorrenza.durataMin),
          minutiUd,
        ).length,
      0,
    )
}

/**
 * I giorni della settimana che il calendario mostra, in ordine. Vuoto vuol dire
 * «non scelto»: lunedì–venerdì.
 */
export function giorniMostrati (registro: Registro): number[] {
  const scelti = registro.impostazioni.giorniVisibili
  return scelti.length > 0 ? [...scelti].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}
