// Il promemoria dell'ora che sta per cominciare: quale, e che cosa aspetta.
//
// Una notifica che dice troppo la si spegne: una sola per ora, poche righe.
// Niente Electron né orologio: giorno e ora entrano come parametri, così si
// prova senza aspettare.

import { Uno } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { consegneDellaLezione } from './assignments.js'
import { classeDellaLezione, materiaDellaLezione } from './courses.js'
import { confrontaLezioni, fineLezione, inizioLezione } from './calculations.js'
import { minutiDaOra } from './dates.js'
import type { Iso, Lezione, Ora, Registro } from './models.js'
import { testi } from './reminders.testi.js'

/** Quel che si consegna al sistema operativo: un titolo, un corpo, e dove andare. */
export interface Promemoria {
  /** L'ora di cui si parla: chi preme la notifica va lì. */
  lezioneId: string
  titolo: string
  corpo: string
  /** Quante cose aspettano quest'ora; zero dà una notifica «sta per cominciare». */
  daFare: number
}

/**
 * Le ore non annullate che cominciano in `[adesso, adesso + anticipo]`.
 * Un'ora già cominciata non si annuncia.
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
    // Stesso comparatore degli altri elenchi, così due ore che cominciano
    // insieme hanno un ordine deciso.
    .sort(confrontaLezioni)
}

/** «adesso», «fra 1 minuto», «fra 5 minuti»: quel che si direbbe a voce. */
function fraQuanto (inizio: Ora, ora: Ora): string {
  const t = testi()
  const mancano = minutiDaOra(inizio) - minutiDaOra(ora)
  if (mancano <= 0) return t.adesso
  if (mancano === 1) return t.fraUnMinuto
  return t.fraMinuti(mancano)
}

/**
 * Le pendenze di quest'ora in poche parole: le stesse del pallino «todo» del
 * cruscotto, cioè le consegne del corso già date e non chiuse. Non tutta la
 * classe: le altre materie non si risolvono in quest'aula.
 */
function coseAperte (registro: Registro, lezione: Lezione): { quante: number, detto: string } {
  const classe = classeDellaLezione(registro, lezione)
  const suoi = consegneDellaLezione(registro, lezione, classe)

  const t = testi()
  const pezzi: string[] = []
  if (suoi.arretrate.length > 0) pezzi.push(t.inRitardo(suoi.arretrate.length))
  if (suoi.scadono.length > 0) pezzi.push(t.inScadenza(suoi.scadono.length))
  if (suoi.aperte.length > 0) pezzi.push(t.daFare(suoi.aperte.length))

  const quante = suoi.arretrate.length + suoi.scadono.length + suoi.aperte.length
  if (quante === 0) return { quante: 0, detto: '' }

  // Al più tre titoli: oltre, il sistema taglia la notifica.
  const titoli = [...suoi.arretrate, ...suoi.scadono, ...suoi.aperte]
    .slice(0, 3)
    .map((consegna) => consegna.testo)
    .filter((testo) => testo.trim().length > 0)

  const testa = t.pendenze(quante, pezzi)
  return { quante, detto: titoli.length > 0 ? `${testa}: ${titoli.join(' · ')}` : testa }
}

/**
 * Che cosa dire di un'ora che sta per cominciare: titolo con classe e quanto
 * manca, corpo con orario, aula e quel che aspetta.
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

  const nome = classe?.nome ?? Uno(lessico().lezione)
  const titolo = inizio ? `${nome} ${fraQuanto(inizio, ora)}` : nome

  const righe: string[] = []
  const orario = inizio && fine ? `${inizio}–${fine}` : (inizio ?? '')
  const dove = [orario, materia, lezione.aula].filter(Boolean).join(' · ')
  if (dove) righe.push(dove)

  const aperte = coseAperte(registro, lezione)
  righe.push(aperte.quante > 0 ? aperte.detto : testi().nienteInSospeso)

  return { lezioneId: lezione.id, titolo, corpo: righe.join('\n'), daFare: aperte.quante }
}
