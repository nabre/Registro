// L'agenda della settimana: quel che il widget sul desktop mostra senza che
// nessuno apra il registro.
//
// È la terza vista «da lontano» del registro, dopo il vassoio e i promemoria, e
// segue la regola delle altre due: qui non c'è Electron, non c'è il DOM e non
// c'è un orologio. Si passano il registro, il giorno e l'ora, e si ottiene un
// albero di stringhe già pronto da disegnare — «martedì, 08:20–09:50, I MEC A
// MAT, aula 214, in corso». Vuol dire che «alle 08:30 il widget segna quell'ora
// come in corso» si prova con `node --test`, senza aprire una finestra e senza
// aspettare le 08:30.
//
// La differenza rispetto al vassoio è il taglio. Il vassoio risponde «di questo
// corso, che cosa mi resta da fare», e quindi raggruppa per corso; il widget
// risponde «questa settimana, dove devo essere», e quindi raggruppa per giorno.
// Sono due domande diverse e due alberi diversi, e farne uno solo vorrebbe dire
// rispondere male a tutt'e due.
//
// In fondo al file sta la matematica della griglia — quante celle delle icone
// del desktop è larga la striscia. Sta nel dominio e non accanto alle chiamate
// di Windows per la solita ragione: è aritmetica, e l'aritmetica si prova.

import { annoInUso, estremiAnno, letteraSettimana } from './years.js'
import { fineLezione, inizioLezione } from './calculations.js'
import { classeDelCorso, corsoPerId, materiaDelCorso, siglaMateria } from './courses.js'
import { faseDellOra, type FaseOra } from './dashboard.js'
import {
  GIORNI_BREVI,
  MESI,
  giornoDelMese,
  giornoSettimana,
  inizioSettimana,
  minutiDaOra,
  settimanaDi,
  settimanaIso,
} from './dates.js'
import type { AnnoScolastico, Iso, LetteraSettimana, Lezione, Ora, Registro } from './models.js'
import { giorniMostrati, sospensioneDi } from './timetable.js'

/** Un'ora come la si legge in una riga della striscia. */
interface OraAgenda {
  lezioneId: string
  /** '08:20' e '09:50': l'inizio e la fine vere, slot compresi. */
  inizio: Ora
  fine: Ora
  /** Minuti da mezzanotte: serve a ordinare, e a sapere che cosa viene adesso. */
  daMinuti: number
  aMinuti: number
  /** 'I MEC A': la classe, che è il nome con cui un'ora si riconosce. */
  classe: string
  /** 'MAT': la materia dove non c'è spazio per il suo nome. */
  materia: string
  aula: string | null
  fase: FaseOra
}

interface GiornoAgenda {
  data: Iso
  /** 1 = lunedì … 7 = domenica. */
  giorno: number
  /** 'lun' */
  nome: string
  /** Il numero nel mese. */
  numero: number
  oggi: boolean
  /** Il nome della chiusura, quando in quel giorno non si fa lezione. */
  chiuso: string | null
  ore: OraAgenda[]
}

/**
 * Che cosa la striscia ha da dire prima ancora dei giorni.
 *
 * Non è una decorazione: un widget sul desktop si guarda di sfuggita, e una
 * settimana vuota può voler dire tre cose molto diverse — non c'è un registro
 * aperto, l'anno non è ancora cominciato, l'anno è finito. Senza distinguerle,
 * la striscia direbbe «niente» a settembre come a luglio, e chi la guarda
 * penserebbe che si è rotta.
 */
type StatoAgenda = 'ok' | 'senza-registro' | 'prima-dell-anno' | 'dopo-l-anno'

interface AgendaSettimana {
  /** Vedi `StatoAgenda`: che cosa c'è da mostrare, o perché non c'è niente. */
  stato: StatoAgenda
  /** '2026/2027', o niente quando un anno non c'è. */
  anno: string | null
  /** Il lunedì da cui la settimana comincia: è anche la chiave con cui si scorre. */
  lunedi: Iso
  /** Il numero ISO, che è come i piani annuali contano le settimane. */
  numero: number
  lettera: LetteraSettimana | null
  /** '15 – 19 settembre': quel che sta scritto in testa alla striscia. */
  etichetta: string
  /** Vero quando la settimana mostrata è quella di oggi: il bottone «oggi» si spegne. */
  corrente: boolean
  giorni: GiornoAgenda[]
  /** Quante ore ha in tutto: zero vuol dire una striscia con una riga sola dentro. */
  quante: number
  /** L'ora in corso adesso, se ce n'è una: la striscia la segna. */
  inCorso: string | null
  /** La prima che deve ancora cominciare, dentro questa settimana. */
  prossima: string | null
}

/** I giorni da mostrare: quelli scelti nelle impostazioni, o lunedì–venerdì. */
/** L'anno di cui si parla: quello in uso, che è l'unico che il widget guarda. */
export function annoDellAgenda (registro: Registro): AnnoScolastico | null {
  return annoInUso(registro)
}

/**
 * '15 – 19 settembre', o '29 settembre – 3 ottobre' quando la settimana
 * scavalca il mese.
 *
 * Il mese scritto una volta sola quando è lo stesso: la striscia è larga come
 * una colonna di icone, e «15 settembre – 19 settembre» ci andrebbe a capo.
 */
function etichettaSettimana (primo: Iso, ultimo: Iso): string {
  const mesePrimo = MESI[Number(primo.slice(5, 7)) - 1]
  const meseUltimo = MESI[Number(ultimo.slice(5, 7)) - 1]
  if (mesePrimo === meseUltimo) {
    return `${giornoDelMese(primo)} – ${giornoDelMese(ultimo)} ${meseUltimo}`
  }
  return `${giornoDelMese(primo)} ${mesePrimo} – ${giornoDelMese(ultimo)} ${meseUltimo}`
}

/** Un'ora del registro ridotta a quel che la striscia ne mostra. */
function oraAgenda (registro: Registro, lezione: Lezione, oggi: Iso, ora: Ora): OraAgenda | null {
  const inizio = inizioLezione(lezione)
  const fine = fineLezione(lezione)
  // Un'ora senza slot non ha un posto nella giornata: non si può disegnare in
  // una colonna fatta di orari, e inventarle un orario sarebbe peggio.
  if (!inizio || !fine) return null

  const corso = corsoPerId(registro, lezione.corsoId)
  const classe = classeDelCorso(registro, corso)
  const materia = materiaDelCorso(registro, corso)

  return {
    lezioneId: lezione.id,
    inizio: inizio,
    fine: fine,
    daMinuti: minutiDaOra(inizio),
    aMinuti: minutiDaOra(fine),
    classe: classe?.nome ?? 'classe',
    materia: siglaMateria(materia),
    aula: lezione.aula?.trim() || null,
    fase: faseDellOra(registro, lezione, oggi, ora),
  }
}


/**
 * Lo stato della striscia: se non c'è niente da mostrare, il perché.
 *
 * «Fuori dall'anno» si guarda sulla settimana intera e non sul lunedì: la
 * settimana che comincia il 31 agosto e contiene il 2 settembre è già dentro
 * l'anno, e dirla «prima» vorrebbe dire nascondere le prime ore.
 */
function statoAgenda (
  anno: AnnoScolastico | null,
  estremi: { inizio: Iso, fine: Iso } | null,
  lunedi: Iso,
  settimana: Iso[],
): StatoAgenda {
  if (!anno || !estremi) return 'senza-registro'
  const ultimo = settimana[settimana.length - 1] ?? lunedi
  if (ultimo < estremi.inizio) return 'prima-dell-anno'
  if (lunedi > estremi.fine) return 'dopo-l-anno'
  return 'ok'
}

/**
 * Da che settimana si apre l'agenda.
 *
 * Quella di oggi, quando oggi sta dentro l'anno. Fuori — a luglio, o a
 * ferragosto — si va alla prima settimana dell'anno o all'ultima, invece di
 * mostrare cinque giorni vuoti che non dicono niente: chi apre il widget in
 * agosto sta guardando avanti, e la risposta utile è «l'anno comincia qui».
 */
export function settimanaDiPartenza (registro: Registro, oggi: Iso): Iso {
  const estremi = estremiAnno(annoDellAgenda(registro))
  if (!estremi) return inizioSettimana(oggi)
  if (oggi < estremi.inizio) return inizioSettimana(estremi.inizio)
  if (oggi > estremi.fine) return inizioSettimana(estremi.fine)
  return inizioSettimana(oggi)
}

/**
 * La settimana che contiene `riferimento`, giorno per giorno.
 *
 * `oggi` e `ora` sono l'adesso vero e restano separati dal riferimento: si
 * scorre alla settimana prossima senza che le sue ore diventino tutte «da
 * chiudere» — la fase la decide l'orologio, non la settimana che si guarda.
 */
export function agendaSettimana (
  registro: Registro,
  riferimento: Iso,
  oggi: Iso,
  ora: Ora,
): AgendaSettimana {
  const anno = annoDellAgenda(registro)
  const estremi = estremiAnno(anno)
  const visibili = giorniMostrati(registro)
  const lunedi = inizioSettimana(riferimento)
  const settimana = settimanaDi(lunedi).filter((data) => visibili.includes(giornoSettimana(data)))

  // Le lezioni si raccolgono per data una volta sola: sono qualche migliaio in
  // un anno, e attraversarle cinque volte — una per giorno mostrato — è lavoro
  // rifatto a ogni battito dell'orologio, con il widget acceso tutto il giorno.
  const perGiorno = new Map<Iso, Lezione[]>()
  for (const lezione of registro.lezioni) {
    const elenco = perGiorno.get(lezione.data)
    if (elenco) elenco.push(lezione)
    else perGiorno.set(lezione.data, [lezione])
  }

  const giorni: GiornoAgenda[] = settimana.map((data) => {
    const ore = (perGiorno.get(data) ?? [])
      .map((lezione) => oraAgenda(registro, lezione, oggi, ora))
      .filter((riga): riga is OraAgenda => riga !== null)
      .sort((a, b) => a.daMinuti - b.daMinuti)

    return {
      data,
      giorno: giornoSettimana(data),
      nome: GIORNI_BREVI[giornoSettimana(data) - 1],
      numero: giornoDelMese(data),
      oggi: data === oggi,
      chiuso: sospensioneDi(anno, data)?.etichetta ?? null,
      ore,
    }
  })

  const tutte = giorni.flatMap((giorno) => giorno.ore.map((riga) => ({ giorno, riga })))
  const inCorso = tutte.find(({ riga }) => riga.fase === 'in-corso')?.riga.lezioneId ?? null
  // La prossima è la prima che deve ancora cominciare: oggi più tardi, o in un
  // giorno che viene dopo. Le ore rimaste indietro non sono «prossime» — quelle
  // le racconta il vassoio, che è il posto dove si vanno a chiudere i buchi.
  const prossima =
    tutte.find(
      ({ giorno, riga }) =>
        giorno.data > oggi || (giorno.data === oggi && riga.daMinuti > minutiDaOra(ora)),
    )?.riga.lezioneId ?? null

  return {
    stato: statoAgenda(anno, estremi, lunedi, settimana),
    anno: anno?.etichetta ?? null,
    lunedi,
    numero: settimanaIso(lunedi),
    lettera: letteraSettimana(anno, lunedi),
    etichetta: etichettaSettimana(settimana[0] ?? lunedi, settimana[settimana.length - 1] ?? lunedi),
    corrente: lunedi === inizioSettimana(oggi),
    giorni,
    quante: tutte.length,
    inCorso,
    prossima,
  }
}

// --------------------------------------------------------------- la griglia

/*
 * La larghezza della striscia si misura in celle delle icone del desktop, e non
 * in pixel.
 *
 * È il punto per cui il widget non sembra appoggiato sopra il desktop ma dentro:
 * le icone stanno su una griglia — Windows la chiama spaziatura delle icone — e
 * una striscia larga due celle e mezzo lascia mezza colonna sprecata al proprio
 * fianco, che si vede subito. Larga un numero intero di celle, il suo bordo cade
 * dove cadrebbe comunque il bordo di una colonna di icone.
 *
 * Le tre funzioni qui sotto sono l'aritmetica di quel vincolo, e stanno nel
 * dominio perché l'aritmetica si prova senza aprire Windows. Chi chiede a
 * Windows quanto è larga una cella è `environment/anchoring.ts`.
 */

/** Meno di due celle non ci sta un orario accanto a una classe. */
export const CELLE_MINIME = 2

/** E meno di tre in altezza non ci sta un giorno con le sue ore. */
const CELLE_MINIME_ALTEZZA = 3

/** L'arrotondamento vero, uguale per le due misure: alla cella più vicina, dentro i limiti. */
function celle (misura: number, cella: number, minime: number, massime: number): number {
  return Math.min(massime, Math.max(minime, Math.round(misura / Math.max(1, cella))))
}

/** Più di metà schermo non è un widget: è una finestra che ha invaso il desktop. */
function celleMassime (larghezzaSchermo: number, cella: number): number {
  return Math.max(CELLE_MINIME, Math.floor(larghezzaSchermo / 2 / Math.max(1, cella)))
}

/** In altezza il limite è il bordo stesso: una striscia può arrivare in fondo. */
function celleMassimeAltezza (altezzaSchermo: number, cella: number): number {
  return Math.max(CELLE_MINIME_ALTEZZA, Math.floor(altezzaSchermo / Math.max(1, cella)))
}

/** Quante celle sono, arrotondate alla più vicina e tenute dentro i limiti. */
export function celleDaLarghezza (
  larghezza: number,
  cella: number,
  larghezzaSchermo: number,
): number {
  return celle(larghezza, cella, CELLE_MINIME, celleMassime(larghezzaSchermo, cella))
}

/** E la larghezza in pixel che ne viene: è quella che si dà ad `ABM_SETPOS`. */
export function larghezzaDaCelle (
  numero: number,
  cella: number,
  larghezzaSchermo: number,
): number {
  return celle(numero * Math.max(1, cella), cella, CELLE_MINIME, celleMassime(larghezzaSchermo, cella)) * Math.max(1, cella)
}

/**
 * Le stesse due funzioni per l'altezza, che si trascina dal bordo di sotto.
 *
 * Una striscia più corta dello schermo non libera le icone che le stanno
 * sotto — la fetta riservata resta tutta la colonna, vedi `anchoring.ts` — ma
 * serve lo stesso: cinque giorni di ore stanno in mezzo schermo, e una striscia
 * lunga quanto lo schermo con sotto metà vuoto è metà scrivania buttata.
 */
export function celleDaAltezza (altezza: number, cella: number, altezzaSchermo: number): number {
  return celle(altezza, cella, CELLE_MINIME_ALTEZZA, celleMassimeAltezza(altezzaSchermo, cella))
}

export function altezzaDaCelle (numero: number, cella: number, altezzaSchermo: number): number {
  const passo = Math.max(1, cella)
  return celle(numero * passo, cella, CELLE_MINIME_ALTEZZA, celleMassimeAltezza(altezzaSchermo, passo)) * passo
}
