// Su quale lezione cade un evento del calendario (vedi `calendar.ts`): trovato
// il corso (`calendarRules.ts`), la lezione di quel corso, quel giorno, con la
// sovrapposizione maggiore. Serve al calendario del pannello e al confronto.

import { fineLezione, inizioLezione } from './calculations.js'
import type { EventoCalendario } from './calendarIcs.js'
import {
  abbinatore,
  corsiConfrontabili,
  sovrappostiMinuti,
  type ViaAbbinamento,
} from './calendarRules.js'
import { inizioSettimana } from './dates.js'
import type { Corso, Iso, Lezione, RegolaCalendario, Registro } from './models.js'

// ------------------------------------------------------------------ collegamenti

/** Le lezioni dei corsi dati, per corso e giorno: `corsoId|data`. */
export function lezioniPerCorsoEGiorno (
  registro: Registro,
  corsi: readonly Corso[],
): Map<string, Lezione[]> {
  const ammessi = new Set(corsi.map((c) => c.id))
  const mappa = new Map<string, Lezione[]>()
  for (const l of registro.lezioni) {
    if (!ammessi.has(l.corsoId)) continue
    const chiave = `${l.corsoId}|${l.data}`
    mappa.set(chiave, [...(mappa.get(chiave) ?? []), l])
  }
  return mappa
}

/**
 * La lezione su cui cade un evento già attribuito a un corso: fra quelle del
 * corso in quel giorno, quella con cui si sovrappone di più. Nessuna, se
 * nessuna si sovrappone.
 */
export function lezioneSotto (
  lezioni: readonly Lezione[],
  evento: EventoCalendario,
): Lezione | null {
  let scelta: Lezione | null = null
  let meglio = 0
  for (const l of lezioni) {
    const da = inizioLezione(l)
    const a = fineLezione(l)
    if (!da || !a) continue
    const quanto = sovrappostiMinuti(da, a, evento.inizio, evento.fine)
    if (quanto > meglio) {
      scelta = l
      meglio = quanto
    }
  }
  return scelta
}

/** Chi è collegato a chi fra gli eventi del calendario e le lezioni del registro. */
export interface Collegamenti {
  /** Per chiave d'evento, la lezione su cui cade. */
  lezionePerEvento: Map<string, string>
  /** Per lezione, gli eventi che ci cadono sopra, in ordine d'ora. */
  eventiPerLezione: Map<string, EventoCalendario[]>
  /** Per chiave d'evento collegato, come se n'è trovato il corso. */
  viaPerEvento: Map<string, ViaAbbinamento>
  /** Le chiavi degli eventi che una regola dice «non è una lezione». */
  ignorati: Set<string>
}

/**
 * Gli eventi collegati alle lezioni, con le stesse prove del confronto: la
 * parte di `confrontaCalendario` che guarda senza proporre. Più eventi possono
 * cadere sulla stessa lezione (due blocchi da novanta minuti con la pausa).
 */
export function collegaEventi (
  registro: Registro,
  eventi: readonly EventoCalendario[],
  regole: readonly RegolaCalendario[],
): Collegamenti {
  const corsi = corsiConfrontabili(registro)
  const perGiorno = lezioniPerCorsoEGiorno(registro, corsi)
  const lezionePerEvento = new Map<string, string>()
  const eventiPerLezione = new Map<string, EventoCalendario[]>()
  const viaPerEvento = new Map<string, ViaAbbinamento>()
  const ignorati = new Set<string>()
  const abbina = abbinatore(registro, regole, corsi, perGiorno)
  for (const evento of eventi) {
    const { corsoId, via, ignorato } = abbina(evento)
    if (ignorato) ignorati.add(evento.chiave)
    if (ignorato || !corsoId || !via) continue
    const lezione = lezioneSotto(perGiorno.get(`${corsoId}|${evento.data}`) ?? [], evento)
    if (!lezione) continue
    lezionePerEvento.set(evento.chiave, lezione.id)
    viaPerEvento.set(evento.chiave, via)
    eventiPerLezione.set(lezione.id, [...(eventiPerLezione.get(lezione.id) ?? []), evento])
  }
  for (const gruppo of eventiPerLezione.values()) {
    gruppo.sort((a, b) => a.inizio.localeCompare(b.inizio))
  }
  return { lezionePerEvento, eventiPerLezione, viaPerEvento, ignorati }
}

// ------------------------------------------------------------------ anomalie

/** Che cosa non torna, in una settimana, fra il calendario e il registro. */
export interface AnomalieSettimana {
  /** Eventi ICS che non cadono su nessuna lezione, e che nessuna regola esclude. */
  eventiSenzaLezione: EventoCalendario[]
  /** Lezioni che nessun evento ICS copre, nei giorni che il calendario copre. */
  lezioniSenzaEvento: Lezione[]
  /** Lezioni collegate, ma per nome, orario o sovrapposizione: nessuna regola lo dice. */
  lezioniSenzaRegola: Lezione[]
}

/**
 * Le anomalie per settimana, per chiave del lunedì. Non contano gli eventi
 * annullati senza lezione né le lezioni annullate; le lezioni senza evento si
 * cercano solo nell'intervallo coperto dal calendario. Settimane senza anomalie
 * non compaiono.
 */
export function anomaliePerSettimana (
  registro: Registro,
  eventi: readonly EventoCalendario[],
  collegamenti: Collegamenti,
): Map<Iso, AnomalieSettimana> {
  const esito = new Map<Iso, AnomalieSettimana>()
  const di = (data: Iso): AnomalieSettimana => {
    const lunedi = inizioSettimana(data)
    const gia = esito.get(lunedi)
    if (gia) return gia
    const nuova = { eventiSenzaLezione: [], lezioniSenzaEvento: [], lezioniSenzaRegola: [] }
    esito.set(lunedi, nuova)
    return nuova
  }

  let dal: Iso | null = null
  let al: Iso | null = null
  for (const evento of eventi) {
    if (!dal || evento.data < dal) dal = evento.data
    if (!al || evento.data > al) al = evento.data
    if (evento.annullato || collegamenti.ignorati.has(evento.chiave)) continue
    if (collegamenti.lezionePerEvento.has(evento.chiave)) continue
    di(evento.data).eventiSenzaLezione.push(evento)
  }
  if (!dal || !al) return esito

  const corsi = new Set(corsiConfrontabili(registro).map((c) => c.id))
  for (const lezione of registro.lezioni) {
    if (!corsi.has(lezione.corsoId) || lezione.data < dal || lezione.data > al) continue
    const suoi = collegamenti.eventiPerLezione.get(lezione.id) ?? []
    if (suoi.length === 0) {
      if (lezione.stato !== 'annullata') di(lezione.data).lezioniSenzaEvento.push(lezione)
    } else if (suoi.some((e) => collegamenti.viaPerEvento.get(e.chiave) !== 'regola')) {
      di(lezione.data).lezioniSenzaRegola.push(lezione)
    }
  }
  return esito
}
