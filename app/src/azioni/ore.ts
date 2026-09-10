// L'ora di lezione: quando si fa, chi c'era, che cosa si è annotato.
//
// L'appello ha una regola che non si vede nei tipi: una lezione risulta svolta
// quando l'appello è stato fatto per intero, e non prima. Si scrive qui perché
// è qui che l'appello arriva, un nome alla volta.

import {
  allieviAttivi,
  contaUd,
  ordinaAllievi,
  slotSpostati,
  statiAllineati,
} from '../dominio/calcoli.js'
import { creaPresenza, duplicaLezione } from '../dominio/fabbriche.js'
import { classeDellaLezione } from '../dominio/corsi.js'
import type { Lezione, Presenza, Registro, StatoPresenza } from '../dominio/modelli.js'
import { validaLezione } from '../dominio/validazione.js'
import { aggiornaDopoChiusura } from './rapporti.js'
import { fatto, rifiuta, riponi, type Parte } from './contesto.js'

/**
 * L'appello di una lezione, completo e della lunghezza giusta.
 *
 * Una riga per allievo attivo — chi entra in classe a metà anno compare la
 * prima volta che si apre una lezione dopo l'iscrizione, senza dover rifare
 * quelle passate — e una casella per unità didattica. Le righe che c'erano si
 * tengono, allungate o accorciate se nel frattempo l'ora è cambiata: chi
 * aggiunge un'ora a una lezione già fatta non deve ritrovarsi l'appello
 * cancellato.
 */
function appelloCompleto (
  registro: Registro,
  lezione: Lezione,
  esistenti: Presenza[] = lezione.presenze,
): Presenza[] {
  const classe = classeDellaLezione(registro, lezione)
  if (!classe) return esistenti
  const ud = contaUd(lezione)
  const perId = new Map(esistenti.map((p) => [p.allievoId, p]))
  return ordinaAllievi(allieviAttivi(classe)).map((allievo) => {
    const voce = perId.get(allievo.id)
    if (!voce) return creaPresenza(allievo.id, ud)
    return { ...voce, stati: statiAllineati(voce, ud) }
  })
}

/**
 * L'appello con una parte riscritta: `dove` dice quali caselle toccare.
 *
 * Le tre azioni della matrice — una casella, una riga, una colonna — sono la
 * stessa scrittura con un filtro diverso, e tenerle separate voleva dire tre
 * occasioni di dimenticarsi di allungare le righe o di saltare un allievo
 * nuovo.
 */
function appelloScritto (
  registro: Registro,
  lezione: Lezione,
  stato: StatoPresenza,
  dove: (allievoId: string, ud: number) => boolean,
): Presenza[] {
  return appelloCompleto(registro, lezione).map((presenza) => ({
    ...presenza,
    stati: presenza.stati.map((attuale, ud) =>
      dove(presenza.allievoId, ud) ? stato : attuale,
    ),
    // I minuti pendono da un ritardo: senza più ritardi non hanno a che
    // attaccarsi, e restare appesi a un «presente» li rende una bugia.
    minuti: presenza.stati.some((s, ud) => (dove(presenza.allievoId, ud) ? stato : s) === 'ritardo')
      ? presenza.minuti
      : undefined,
  }))
}

export const ore = {
  'lezione.salva': (contesto, azione) => {
    const esito = validaLezione(azione.lezione)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const nuova = !contesto.registro.lezioni.some((l) => l.id === azione.lezione.id)
    const lezione = { ...azione.lezione, aggiornataIl: new Date().toISOString() }
    contesto.modifica((r) => {
      riponi(r.lezioni, lezione, (a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
    return nuova ? { ok: true, creato: { id: lezione.id } } : fatto
  },

  // Una valutazione svolta in quella lezione resta: perde solo il rimando.
  'lezione.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'lezione', id: azione.lezioneId })
  },

  'lezione.duplica': (contesto, azione) => {
    const origine = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!origine) return rifiuta('Lezione non trovata.')
    const copia = duplicaLezione(origine, azione.data)
    if (azione.inizio) copia.slot = slotSpostati(copia.slot, azione.inizio)
    contesto.modifica((r) => {
      r.lezioni.push(copia)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
    return { ok: true, creato: { id: copia.id } }
  },

  'lezione.stato': (contesto, azione) => {
    const esito = contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.stato = azione.stato
      // Marcare la lezione come svolta è il momento in cui serve l'appello:
      // se non c'è ancora, si parte da tutti presenti.
      // Segnare un'ora come svolta non fa l'appello al posto di nessuno: le
      // righe nascono mute, e le caselle restano da riempire.
      if (azione.stato === 'svolta' && lezione.presenze.length === 0) {
        lezione.presenze = appelloCompleto(r, lezione, [])
      }
    })

    // Chiudere un'ora rifà i documenti di quel corso: il verbale, le presenze,
    // la griglia dei voti, la scheda di ogni allievo. È il momento in cui i
    // dati di quell'ora sono completi, ed è l'unico momento in cui qualcuno
    // se ne ricorderebbe. Non si aspetta: il pulsante deve rispondere subito,
    // e l'avviso arriva quando i file ci sono.
    if (esito.ok && azione.stato === 'svolta') {
      const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
      if (lezione) aggiornaDopoChiusura(contesto.registro, lezione)
    }
    return esito
  },

  // Trascinare una lezione nel calendario finisce qui. Spostarla non la
  // riscrive: cambia il giorno e, se si dice anche l'ora, scivolano tutti gli
  // slot insieme — pause comprese, durate intatte. Appello, osservazioni e
  // consuntivo restano dove sono, perché è la stessa ora spostata.
  'lezione.sposta': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.data = azione.data
      if (azione.inizio) lezione.slot = slotSpostati(lezione.slot, azione.inizio)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    })
  },

  /**
   * I testi dell'ora, un campo alla volta: solo quelli presenti nell'azione
   * si scrivono. Arrivano dalla tastiera mentre l'ora è ancora in corso, e
   * rimandare gli altri due dalla copia che il campo aveva in mano
   * sovrascriverebbe quel che un altro campo ha appena salvato.
   */
  'lezione.testi': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      if (azione.argomenti !== undefined) lezione.argomenti = azione.argomenti
      if (azione.materiali !== undefined) lezione.materiali = azione.materiali
      if (azione.consuntivo !== undefined) lezione.consuntivo = azione.consuntivo
    })
  },

  'presenze.imposta': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.presenze = azione.presenze
    })
  },

  'presenze.ud': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.presenze = appelloScritto(
        r,
        lezione,
        azione.stato,
        (allievoId, ud) => allievoId === azione.allievoId && ud === azione.ud,
      )
    })
  },

  'presenze.riga': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.presenze = appelloScritto(
        r,
        lezione,
        azione.stato,
        (allievoId) => allievoId === azione.allievoId,
      )
    })
  },

  'presenze.colonna': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.presenze = appelloScritto(r, lezione, azione.stato, (_id, ud) => ud === azione.ud)
    })
  },

  'presenze.tutti': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.presenze = appelloScritto(r, lezione, azione.stato, () => true)
    })
  },

  /**
   * I minuti di ritardo e la nota di una riga sola, senza passare da
   * `presenze.imposta`. Trova o crea solo la riga di quella persona — le
   * altre, comprese quelle di chi non frequenta più, restano intatte: era il
   * bug per cui scrivere una nota durante l'appello cancellava le caselle già
   * spuntate di tutti gli altri.
   */
  'presenze.campi': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      let presenza = lezione.presenze.find((p) => p.allievoId === azione.allievoId)
      if (!presenza) {
        presenza = creaPresenza(azione.allievoId, contaUd(lezione))
        lezione.presenze.push(presenza)
      }
      if (azione.minuti !== undefined) presenza.minuti = azione.minuti
      if (azione.nota !== undefined) presenza.nota = azione.nota
    })
  },

  'osservazione.salva': (contesto, azione) => {
    if (!azione.osservazione.testo.trim()) return rifiuta('L’osservazione è vuota.')
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      riponi(lezione.osservazioni, azione.osservazione)
    })
  },

  'osservazione.elimina': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.osservazioni = lezione.osservazioni.filter((o) => o.id !== azione.osservazioneId)
    })
  },
} satisfies Parte
