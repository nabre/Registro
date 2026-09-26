// Il calendario: gli aiutanti che tutte le viste condividono (festivi,
// chiusure, confini dei semestri, lettera della settimana, giorni visibili),
// così settimana, mese, anno e striscia dicono la stessa cosa.

import { giornoSettimana, numeroSemestre, sommaGiorni } from '../../../domain/dates.js'
import { testoDiVoce } from '../../../domain/lists.js'
import { letteraSettimana } from '../../../domain/years.js'
import type { Iso, LetteraSettimana, Lezione, Semestre } from '../../../domain/models.js'
import { sospensioneDi } from '../../../domain/timetable.js'
import { h, type Figlio } from '../../dom.js'
import { aggiorna, annoCorrente, stato } from '../../state.js'
import { testi } from './calendar.testi.js'

/** Il nome della sospensione che copre un giorno, o stringa vuota. */
export function chiusura (data: string): string {
  return sospensioneDi(annoCorrente(), data)?.etichetta ?? ''
}

export function apriLezione (lezione: Lezione): void {
  aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data })
}

/** Sabato e domenica: giorni veri, ma non giorni di scuola. */
export function festivo (data: Iso): boolean {
  return giornoSettimana(data) >= 6
}

/**
 * Il semestre che comincia proprio in questo giorno, se c'è. Il confine si
 * ricava dalle date e va mostrato: una verifica ai due lati finisce in due
 * pagelle diverse.
 */
export function apreSemestre (data: Iso): Semestre | null {
  return annoCorrente()?.semestri.find((semestre) => semestre.inizio === data) ?? null
}

/** Il semestre che finisce proprio in questo giorno, se ce n'è uno. */
export function chiudeSemestre (data: Iso): Semestre | null {
  return annoCorrente()?.semestri.find((semestre) => semestre.fine === data) ?? null
}

/**
 * Il semestre che finisce in questo giorno, se non è l'ultimo: la fine
 * dell'ultimo è il bordo della striscia.
 */
export function chiudeSemestreDiMezzo (data: Iso): Semestre | null {
  const semestri = annoCorrente()?.semestri ?? []
  const suo = semestri.find((semestre) => semestre.fine === data)
  if (!suo) return null
  // L'ultimo è quello che finisce più tardi, non quello in fondo all'elenco.
  const ultimo = semestri.every((semestre) => semestre.fine <= suo.fine)
  return ultimo ? null : suo
}

/**
 * Il segno del confine di semestre, accanto al numero del giorno e in rosso:
 * il giorno di cui si parla.
 */
function segnoSemestre (data: Iso, classe = 'segno-semestre'): Figlio {
  const apre = apreSemestre(data)
  const chiude = chiudeSemestre(data)
  if (!apre && !chiude) return null

  // Fine e inizio nello stesso giorno (solo in dati scritti a mano): si dicono entrambi.
  const t = testi()
  const voci = [
    chiude
      ? { testo: t.fineBreve(numeroSemestre(chiude)), lungo: t.finisceIl(chiude.etichetta) }
      : null,
    apre
      ? { testo: t.inizioBreve(numeroSemestre(apre)), lungo: t.cominciaIl(apre.etichetta) }
      : null,
  ].filter((v): v is { testo: string, lungo: string } => v !== null)

  return h(
    'span',
    { class: classe, attr: { title: voci.map((v) => v.lungo).join(' · ') } },
    voci.map((v) => v.testo).join(' · '),
  )
}

/** I giorni della settimana da mostrare (1 = lunedì), dalle Impostazioni; di norma lunedì-venerdì. */
export function giorniVisibili (): number[] {
  const configurati = stato.registro.impostazioni.giorniVisibili
  return configurati.length > 0 ? [...configurati].sort((a, b) => a - b) : [1, 2, 3, 4, 5]
}

/**
 * Il tipo della settimana in cui cade un giorno (A, B…), o nessuno. Qui si
 * legge soltanto: si mette dalle Impostazioni.
 */
export function letteraDi (giorno: Iso): LetteraSettimana | null {
  const valore = letteraSettimana(annoCorrente(), giorno)
  // La parola della lista, non il valore salvato: rinominarla cambia quel che si vede.
  return valore ? testoDiVoce(stato.registro.impostazioni, 'tipoSettimana', valore) : null
}

// ------------------------------------------------------------ confini nascosti

/**
 * I giorni nascosti attaccati a un giorno visibile, andando in un verso: dopo
 * un venerdì, con il fine settimana spento, sono sabato e domenica.
 */
function nascostiAccanto (data: Iso, verso: 1 | -1): Iso[] {
  const visibili = giorniVisibili()
  const nascosti: Iso[] = []
  let giorno = sommaGiorni(data, verso)
  while (nascosti.length < 6 && !visibili.includes(giornoSettimana(giorno))) {
    nascosti.push(giorno)
    giorno = sommaGiorni(giorno, verso)
  }
  return nascosti
}

/**
 * Il giorno in cui un semestre comincia, fra questo e i nascosti subito prima:
 * un confine su un giorno nascosto (domenica) passa al primo visibile dopo,
 * la fine all'ultimo visibile prima.
 */
export function apreQui (data: Iso): Iso | null {
  return [data, ...nascostiAccanto(data, -1)].find((giorno) => apreSemestre(giorno)) ?? null
}

/** Come `apreQui`, per la fine: questo giorno o i nascosti subito dopo. */
export function chiudeQui (data: Iso): Iso | null {
  return [data, ...nascostiAccanto(data, 1)].find((giorno) => chiudeSemestre(giorno)) ?? null
}

/** Il segno del confine per un giorno visibile, compresi quelli nascosti accanto. */
export function segnoSemestreQui (data: Iso, classe?: string): Figlio {
  const giorni = [...new Set([chiudeQui(data), apreQui(data)])].filter((g): g is Iso => g !== null)
  return giorni.map((giorno) => segnoSemestre(giorno, classe))
}
