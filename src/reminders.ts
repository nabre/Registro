// Decide quando notificare l'inizio di un'ora: `domain/reminders.ts` sa che cosa
// dire, `environment/notifications.ts` come mostrarlo; qui c'è solo il momento.
// Regole: una notifica per ora (`annunciate`), niente al primo battito, niente
// se la finestra è davanti. Un battito sull'orologio vero invece di un timer per
// lezione, perché un `setTimeout` non scatta se il portatile dorme.

import * as apparato from 'apparato'

import type { Archivio } from './data/archive.js'
import { adesso, minutiDaOra, oggi, oraDaMinuti } from './domain/dates.js'
import { oreCheCominciano, promemoriaDellOra } from './domain/reminders.js'
import {
  avvisa,
  dichiaraIdentita,
  finestraDavanti,
  notificheDisponibili,
} from './environment/notifications.js'

/** Ogni quanto si guarda l'orologio. */
const BATTITO = 30_000

/** Minuti in cui un'ora già cominciata si annuncia ancora (serve al risveglio del portatile). */
const RITARDO_MASSIMO = 15

function impostazioni () {
  const conf = apparato.impostazioni.leggi('registroDocenti.promemoria')
  return {
    attivo: conf.get<boolean>('attivo', true),
    anticipo: Math.max(0, conf.get<number>('anticipoMinuti', 5)),
  }
}

/** Avvolge un battito di `setInterval`: un'eccezione finisce in console invece di restare non catturata. */
export function battitoSicuro (chi: string, battito: () => void): () => void {
  return () => {
    try {
      battito()
    } catch (errore) {
      console.error(`[${chi}] battito non riuscito:`, errore)
    }
  }
}

/** Accende i promemoria e torna il modo di spegnerli; `apri` è l'azione al clic sulla notifica. */
export function avviaPromemoria (
  archivio: Archivio,
  apri: (lezioneId: string) => void,
): apparato.Smaltitore {
  if (!notificheDisponibili()) {
    // Senza centro notifiche non è un guasto: lo si dice una volta sola.
    console.log('promemoria: il sistema non mostra notifiche, restano spenti')
    return new apparato.Smaltitore(() => {})
  }

  dichiaraIdentita()

  /** Le ore già annunciate, per id. */
  const annunciate = new Set<string>()
  let primoGiro = true
  /** Il documento su cui la memoria è stata riempita. */
  let documento = archivio.documentoAperto?.toString() ?? null

  const batti = (): void => {
    const { attivo, anticipo } = impostazioni()
    if (!attivo) return

    // Cambiare documento vale come riaprire: si svuota la memoria e il primo
    // giro torna a tacere.
    const apertoAdesso = archivio.documentoAperto?.toString() ?? null
    if (apertoAdesso !== documento) {
      documento = apertoAdesso
      annunciate.clear()
      primoGiro = true
    }

    const giorno = oggi()
    const ora = adesso()

    // Finestra da `RITARDO_MASSIMO` fa fino a `anticipo` avanti: si parte prima e
    // si allarga l'anticipo, perché `oreCheCominciano` guarda solo in avanti.
    const ore = oreCheCominciano(
      archivio.registro,
      giorno,
      indietro(ora, RITARDO_MASSIMO),
      anticipo + RITARDO_MASSIMO,
    )

    for (const lezione of ore) {
      if (annunciate.has(lezione.id)) continue
      annunciate.add(lezione.id)
      // Il primo giro riempie la memoria e tace.
      if (primoGiro) continue
      // Registro già davanti: basta la barra di stato.
      if (finestraDavanti()) continue

      const promemoria = promemoriaDellOra(archivio.registro, lezione, ora)
      // Traccia in console: distingue «non mi ha avvisato» da «non l'ho vista».
      console.log(`[promemoria] ${ora} — ${promemoria.titolo} (${promemoria.daFare} aperte)`)
      avvisa({
        titolo: promemoria.titolo,
        corpo: promemoria.corpo,
        al: () => apri(promemoria.lezioneId),
      })
    }

    primoGiro = false
  }

  batti()
  const timer = setInterval(battitoSicuro('promemoria', batti), BATTITO)

  return new apparato.Smaltitore(() => clearInterval(timer))
}

/** L'ora di `minuti` fa, senza scendere sotto la mezzanotte. */
function indietro (ora: string, minuti: number): string {
  return oraDaMinuti(Math.max(0, minutiDaOra(ora) - minuti))
}
