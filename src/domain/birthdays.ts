// I compleanni delle persone in formazione, sul calendario.
//
// La data di nascita il registro ce l'ha già — serve ai moduli della scuola —
// e per trecentosessantaquattro giorni all'anno non fa niente. Un giorno,
// però, è una cosa che in aula si dice: chi entra in classe il mattino del 19
// ottobre non ha modo di saperlo se non se l'è segnato altrove, e accorgersene
// il giorno dopo non è la stessa cosa. È l'unico dato dell'anagrafica che ha un
// giorno suo, e quindi l'unico che può stare su un calendario.
//
// Non è un evento e non si salva da nessuna parte: si ricava dall'anagrafica
// ogni volta che si guarda un giorno. Vuol dire che correggere una data di
// nascita sposta il compleanno, e che una persona che se ne va se lo porta via
// — che è quel che ci si aspetta, e quel che una copia scritta dentro il
// calendario non avrebbe fatto.
//
// Qui dentro non c'è il DOM e non c'è un orologio: si passano il registro e un
// giorno, e si ottiene chi compie gli anni. «Il 29 febbraio si festeggia il 28»
// si prova senza aspettare il 2028.

import { nomeCompleto } from './calculations.js'
import { isoValida } from './dates.js'
import type { Allievo, Classe, Iso, Registro } from './models.js'

/** Un compleanno che cade in un certo giorno: chi, di che classe, e quanti anni fa. */
export interface Compleanno {
  allievoId: string
  classeId: string
  /** 'Rossi Maria': il nome con cui la persona compare in ogni elenco. */
  nome: string
  /** La sigla della classe: sul calendario due Rossi di due classi si distinguono così. */
  classe: string
  /** Il colore della classe, lo stesso delle sue ore. */
  colore: string
  /** Il giorno in cui si festeggia, che non è sempre quello in cui è nata: vedi `ricorrenza`. */
  data: Iso
  /** Il giorno vero, in ISO. */
  nascita: Iso
  /**
   * Gli anni che compie, o `null` se la data di nascita non permette di dirlo.
   *
   * I diciotto non sono un numero come gli altri: da lì in poi le
   * giustificazioni le firma lei, e chi è in aula quel giorno è bene che lo
   * sappia. Un'età che non torna — una nascita scritta nel futuro, un anno
   * battuto storto — non si mostra: meglio il solo nome che «compie -3 anni».
   */
  eta: number | null
}

/** Oltre questa età non è una persona in formazione: è una data battuta male. */
const ETA_MASSIMA = 110

/**
 * Il giorno in cui si festeggia una nascita, in un certo anno.
 *
 * Il 29 febbraio esiste un anno su quattro, e negli altri tre il compleanno non
 * sparisce: si sposta al 28. È la convenzione di chi è nato quel giorno, e
 * l'alternativa — il primo di marzo — porterebbe la festa in un altro mese.
 */
export function ricorrenza (nascita: Iso, anno: number): Iso | null {
  if (!isoValida(nascita)) return null
  const mese = nascita.slice(5, 7)
  const giorno = nascita.slice(8, 10)
  const candidata = `${String(anno).padStart(4, '0')}-${mese}-${giorno}`
  if (isoValida(candidata)) return candidata
  // Qui ci arriva solo il 29 febbraio di un anno che bisestile non è: ogni
  // altro giorno esiste in ogni anno.
  return mese === '02' && giorno === '29' ? `${String(anno).padStart(4, '0')}-02-28` : null
}

/** Quanti anni compie chi è nato in `nascita` il giorno `data`, o `null` se il conto non torna. */
function etaCompiuta (nascita: Iso, data: Iso): number | null {
  const anni = Number(data.slice(0, 4)) - Number(nascita.slice(0, 4))
  return anni > 0 && anni <= ETA_MASSIMA ? anni : null
}

/**
 * Gli anni compiuti a una certa data: l'età che si legge sulla scheda.
 *
 * Non è `etaCompiuta`, che conta i soli anni e va bene solo il giorno del
 * compleanno: qui il mese e il giorno contano, perché chi è nato a dicembre
 * a marzo ha ancora l'età di prima. La differenza vale trecentosessantaquattro
 * giorni all'anno, e su una scheda che dice «minorenne» vale tutto.
 *
 * `null` quando la data non c'è o non torna — una nascita nel futuro, un anno
 * battuto storto: meglio non dire niente che scrivere «-3 anni».
 */
export function anniCompiuti (nascita: Iso, data: Iso): number | null {
  if (!isoValida(nascita) || !isoValida(data)) return null
  // Il confronto è sul mese-giorno crudo, e **non** passa da `ricorrenza`.
  // Le due funzioni rispondono a domande diverse, e la differenza si vede solo
  // per chi è nato il 29 febbraio: `ricorrenza` dice quando si festeggia — il
  // 28, negli anni che bisestili non sono — mentre qui si contano gli anni
  // compiuti, che è la data da cui uno si firma le giustificazioni da sé, e
  // quella arriva il primo di marzo. Chi passa di qui pensando a un difetto
  // guardi `tests/domain/birthdays.test.mjs`: è scritto lì che è voluto.
  const anni =
    Number(data.slice(0, 4)) -
    Number(nascita.slice(0, 4)) -
    (data.slice(5) < nascita.slice(5) ? 1 : 0)
  return anni >= 0 && anni <= ETA_MASSIMA ? anni : null
}

/** Le classi in cui cercare: quelle dell'anno, archiviate escluse, con il filtro già applicato. */
function classiDove (registro: Registro, annoId: string | null, classeId?: string | null): Classe[] {
  return registro.classi.filter(
    (classe) =>
      !classe.archiviata &&
      (!annoId || classe.annoId === annoId) &&
      (!classeId || classe.id === classeId),
  )
}

/** Il compleanno di una persona in un certo giorno, o `null` se quel giorno non è il suo. */
function compleannoDi (allievo: Allievo, classe: Classe, data: Iso): Compleanno | null {
  const nascita = allievo.dataNascita
  if (!nascita || !isoValida(nascita)) return null
  if (ricorrenza(nascita, Number(data.slice(0, 4))) !== data) return null

  return {
    allievoId: allievo.id,
    classeId: classe.id,
    nome: nomeCompleto(allievo),
    classe: classe.nome,
    colore: classe.colore,
    data,
    nascita,
    eta: etaCompiuta(nascita, data),
  }
}

/**
 * Chi compie gli anni in un certo giorno, in ordine di elenco.
 *
 * Chi si è ritirato resta fuori: non è più in aula, e un compleanno sul
 * calendario è un promemoria per l'ora di lezione, non un anniversario.
 *
 * `classeId` restringe a una classe sola: è il filtro del calendario, che
 * quando si guarda un corso solo non ha motivo di mostrare i compleanni di
 * tutte le altre classi.
 */
export function compleanniDelGiorno (
  registro: Registro,
  annoId: string | null,
  data: Iso,
  classeId?: string | null,
): Compleanno[] {
  if (!isoValida(data)) return []

  const trovati: Compleanno[] = []
  for (const classe of classiDove(registro, annoId, classeId)) {
    for (const allievo of classe.allievi) {
      if (!allievo.attivo) continue
      const compleanno = compleannoDi(allievo, classe, data)
      if (compleanno) trovati.push(compleanno)
    }
  }

  return ordina(trovati)
}

/**
 * I compleanni di un periodo, giorno per giorno.
 *
 * Serve a chi disegna più giorni insieme — la settimana, il mese — e non vuole
 * ripassare l'anagrafica una volta per cella. I giorni senza compleanni non
 * compaiono: la mappa è vuota quasi sempre, ed è giusto che lo sia.
 */
export function compleanniPerGiorno (
  registro: Registro,
  annoId: string | null,
  dal: Iso,
  al: Iso,
  classeId?: string | null,
): Map<Iso, Compleanno[]> {
  const per = new Map<Iso, Compleanno[]>()
  if (!isoValida(dal) || !isoValida(al) || al < dal) return per

  const primoAnno = Number(dal.slice(0, 4))
  const ultimoAnno = Number(al.slice(0, 4))

  for (const classe of classiDove(registro, annoId, classeId)) {
    for (const allievo of classe.allievi) {
      if (!allievo.attivo) continue
      // Un periodo a cavallo di capodanno contiene due ricorrenze possibili —
      // quella del 2026 e quella del 2027 — e tenerne una sola vorrebbe dire
      // perdere i compleanni di gennaio guardando dicembre.
      for (let anno = primoAnno; anno <= ultimoAnno; anno += 1) {
        const data = allievo.dataNascita ? ricorrenza(allievo.dataNascita, anno) : null
        if (!data || data < dal || data > al) continue
        const compleanno = compleannoDi(allievo, classe, data)
        if (!compleanno) continue
        per.set(data, [...(per.get(data) ?? []), compleanno])
      }
    }
  }

  for (const [data, suoi] of per) per.set(data, ordina(suoi))
  return per
}

/** Classe, poi cognome: lo stesso ordine degli elenchi, con collazione italiana. */
function ordina (compleanni: Compleanno[]): Compleanno[] {
  return [...compleanni].sort(
    (a, b) => a.classe.localeCompare(b.classe, 'it') || a.nome.localeCompare(b.nome, 'it'),
  )
}

/**
 * Come si legge un compleanno in una riga sola: «Rossi Maria compie 18 anni».
 *
 * Sta qui e non nella vista perché la stessa frase serve in tre punti — la
 * pastiglia dell'agenda, il suggerimento della settimana, la cella del mese —
 * e tre frasi leggermente diverse per la stessa cosa si notano.
 */
export function fraseCompleanno (compleanno: Compleanno): string {
  return compleanno.eta === null
    ? `${compleanno.nome} compie gli anni`
    : `${compleanno.nome} compie ${compleanno.eta} anni`
}
