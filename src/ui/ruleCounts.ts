// Quanti eventi riconosce e quanti decide ogni regola di abbinamento, detto
// con le stesse parole nella scheda «Calendari ICS» e nella finestra del confronto.
// Il conto (`contaRegole`) si rifà solo quando cambiano gli eventi o il testo
// delle regole: la pagina si ridisegna a ogni spunta.

import { contaRegole, type ConteggioRegola } from '../domain/calendarRules.js'
import type { EventoCalendario } from '../domain/calendarIcs.js'
import { pastiglia } from './components/base.js'
import { eventiCaricati } from './externalCalendar.js'
import { testi } from './ruleCounts.testi.js'

/** Una regola come la si sta scrivendo: senza id se è appena nata. */
interface RegolaDaContare {
  testo: string
  corsoId: string | null
}

interface Ricordo {
  eventi: readonly EventoCalendario[]
  firma: string
  conti: ConteggioRegola[]
}

let ricordato: Ricordo | null = null

/**
 * I conti delle regole, nello stesso ordine, o `null` se gli eventi non ci sono:
 * degli zeri, a calendario non letto, farebbero correggere regole giuste.
 */
export function contiDelleRegole (regole: readonly RegolaDaContare[]): ConteggioRegola[] | null {
  const eventi = eventiCaricati()
  if (!eventi) return null
  // Conta solo il testo: il corso non cambia quali eventi la regola riconosce.
  const firma = regole.map((r) => r.testo).join('\u0000')
  if (ricordato?.eventi !== eventi || ricordato.firma !== firma) {
    const conMarche = regole.map((r, i) => ({ id: String(i), testo: r.testo, corsoId: r.corsoId }))
    const mappa = contaRegole(eventi, conMarche)
    ricordato = {
      eventi,
      firma,
      conti: conMarche.map((r) => mappa.get(r.id) ?? { abbinabili: 0, abbinati: 0, valida: false }),
    }
  }
  return ricordato.conti
}

/**
 * Il segno del conto accanto a una regola: nessun evento (quasi sempre un
 * refuso), nessuno deciso (un'altra regola più specifica li prende tutti),
 * oppure il numero. `null` se i conti non sono pronti o la regola non si legge.
 */
export function segnoConteggio (conto: ConteggioRegola | null | undefined): HTMLElement | null {
  if (!conto || !conto.valida) return null
  const t = testi()
  if (conto.abbinabili === 0) return pastiglia(t.nessunEvento, 'attenzione')
  if (conto.abbinati === 0) return pastiglia(t.coperta(conto.abbinabili), 'quiete')
  return pastiglia(t.abbinati(conto.abbinati, conto.abbinabili), 'neutro')
}
