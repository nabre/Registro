// Il mese in testa al calendario del widget: dove si salta, e dove c'è qualcosa.
//
// La striscia mostra una settimana alla volta, ed è la misura giusta per «dove
// devo essere»; ma la domanda che segue è sempre «e poi?», e con le sole frecce
// ci si arriva un salto per volta, al buio. Il mese sopra risponde a colpo
// d'occhio: dove ci sono ore, dove la scuola è chiusa, dove è rimasto un buco.
// Si preme un giorno e la settimana sotto ci si sposta.
//
// Come il resto dell'agenda, qui non c'è un orologio e non c'è il DOM: entrano
// il registro, il giorno guardato e l'adesso vero, esce una griglia di caselle
// già decise. La fase di ogni ora la dà `dashboard.ts` — la stessa che disegna
// il registro — perché un pallino rosso nel widget e un'ora «da chiudere» nel
// registro devono voler dire la stessa cosa.

import { faseDellOra } from './dashboard.js'
import {
  GIORNI_BREVI,
  formattaMese,
  giornoDelMese,
  giornoSettimana,
  grigliaMese,
  inizioSettimana,
  primoDelMese,
  settimanaDi,
  sommaMesi,
} from './dates.js'
import { annoDellAgenda } from './agenda.js'
import { estremiAnno } from './years.js'
import { giorniMostrati } from './timetable.js'
import type { Iso, Lezione, Ora, Registro } from './models.js'
import { sospensioneDi } from './timetable.js'

/** Una casella della griglia: un giorno, e quel poco che ci sta dentro. */
interface GiornoMese {
  data: Iso
  numero: number
  /** Del mese guardato: le code degli altri due si disegnano spente. */
  suo: boolean
  oggi: boolean
  /** Dentro la settimana che si sta guardando sotto: è il riquadro evidenziato. */
  nellaSettimana: boolean
  /** Quante ore ci sono in programma: zero è una casella senza pallino. */
  quante: number
  /** Almeno un'ora rimasta indietro: il pallino cambia colore, e si va a vedere. */
  manca: boolean
  /** Il nome della chiusura, quando in quel giorno non si fa lezione. */
  chiuso: string | null
  /** Fuori dall'anno scolastico: c'è, ma non c'è niente da trovarci. */
  fuori: boolean
}

interface MeseAgenda {
  /** Il primo del mese: è la chiave con cui le frecce si muovono. */
  primo: Iso
  /** 'ottobre 2026' */
  etichetta: string
  /** Le intestazioni delle colonne: solo i giorni che il registro mostra. */
  colonne: string[]
  /** Le righe della griglia, una per settimana. */
  settimane: GiornoMese[][]
}

/** Il mese spostato di uno: quel che fanno le due frecce in testa alla griglia. */
export function meseSpostato (primo: Iso, mesi: number): Iso {
  return primoDelMese(sommaMesi(primo, mesi))
}

/**
 * La griglia del mese che contiene `riferimento`.
 *
 * `oggi` e `ora` restano separati dal riferimento per la stessa ragione della
 * settimana: si guarda avanti senza che le ore del mese prossimo diventino
 * tutte «da chiudere» — la fase la decide l'orologio, non il mese che si apre.
 *
 * Le colonne sono quelle dei giorni mostrati nelle impostazioni: in una scuola
 * che non fa sabato, una colonna di sabati vuoti è un settimo di striscia
 * sprecato, e la striscia è larga come una colonna di icone.
 */
export function meseAgenda (
  registro: Registro,
  riferimento: Iso,
  oggi: Iso,
  ora: Ora,
): MeseAgenda {
  const anno = annoDellAgenda(registro)
  const estremi = estremiAnno(anno)
  const visibili = giorniMostrati(registro)
  const primo = primoDelMese(riferimento)
  const dellaSettimana = new Set(settimanaDi(inizioSettimana(riferimento)))

  const celle = grigliaMese(primo).filter((data) => visibili.includes(giornoSettimana(data)))

  // Le lezioni si raccolgono per data una volta sola, come nella settimana: il
  // widget ricalcola a ogni battito dell'orologio, e attraversare l'anno intero
  // trenta volte — una per casella — è lavoro rifatto ogni mezzo minuto.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of registro.lezioni) {
    const elenco = perGiorno.get(lezione.data)
    if (elenco) elenco.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }

  const settimane: GiornoMese[][] = []
  let riga: GiornoMese[] = []
  let lunediRiga: Iso | null = null

  for (const data of celle) {
    const lunedi = inizioSettimana(data)
    if (lunedi !== lunediRiga) {
      if (riga.length > 0) settimane.push(riga)
      riga = []
      lunediRiga = lunedi
    }

    const ore = perGiorno.get(data) ?? []
    riga.push({
      data,
      numero: giornoDelMese(data),
      suo: data.slice(0, 7) === primo.slice(0, 7),
      oggi: data === oggi,
      nellaSettimana: dellaSettimana.has(data),
      quante: ore.length,
      manca: ore.some((lezione) => faseDellOra(registro, lezione, oggi, ora) === 'da-chiudere'),
      chiuso: sospensioneDi(anno, data)?.etichetta ?? null,
      fuori: estremi ? data < estremi.inizio || data > estremi.fine : true,
    })
  }
  if (riga.length > 0) settimane.push(riga)

  return {
    primo,
    etichetta: formattaMese(primo),
    colonne: visibili.map((giorno) => GIORNI_BREVI[giorno - 1]),
    settimane,
  }
}

/**
 * Il giorno utile più vicino a quello premuto, andando avanti.
 *
 * Serve a una cosa sola: premendo una casella del mese la settimana sotto ci si
 * sposta, e se quella casella è fuori dall'anno la settimana sarebbe vuota senza
 * che nessuno abbia sbagliato niente. `null` quando avanti non c'è più niente.
 */
export function primoGiornoUtile (registro: Registro, data: Iso): Iso | null {
  const estremi = estremiAnno(annoDellAgenda(registro))
  if (!estremi) return null
  if (data > estremi.fine) return null
  return data < estremi.inizio ? estremi.inizio : data
}
