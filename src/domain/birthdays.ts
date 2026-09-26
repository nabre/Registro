// I compleanni delle persone in formazione, sul calendario.
//
// Non si salvano: si ricavano dall'anagrafica a ogni sguardo, così una data
// corretta o una persona che se ne va aggiornano il calendario da sé. Niente
// DOM né orologio: registro e giorno entrano come parametri.

import { nomeCompleto } from './calculations.js'
import { isoValida } from './dates.js'
import type { Allievo, Classe, Iso, Registro } from './models.js'
import { confrontaNomi } from './text.js'
import { testi } from './birthdays.testi.js'

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
   * Gli anni che compie, o `null` se la nascita non permette di dirlo (data
   * nel futuro, anno storto): meglio il solo nome che «compie -3 anni».
   */
  eta: number | null
}

/** Oltre questa età non è una persona in formazione: è una data battuta male. */
const ETA_MASSIMA = 110

/**
 * Il giorno in cui si festeggia una nascita in un certo anno. Il 29 febbraio
 * negli anni non bisestili si festeggia il 28, nello stesso mese.
 */
export function ricorrenza (nascita: Iso, anno: number): Iso | null {
  if (!isoValida(nascita)) return null
  const mese = nascita.slice(5, 7)
  const giorno = nascita.slice(8, 10)
  const candidata = `${String(anno).padStart(4, '0')}-${mese}-${giorno}`
  if (isoValida(candidata)) return candidata
  // Qui arriva solo il 29 febbraio di un anno non bisestile.
  return mese === '02' && giorno === '29' ? `${String(anno).padStart(4, '0')}-02-28` : null
}

/** Quanti anni compie chi è nato in `nascita` il giorno `data`, o `null` se il conto non torna. */
function etaCompiuta (nascita: Iso, data: Iso): number | null {
  const anni = Number(data.slice(0, 4)) - Number(nascita.slice(0, 4))
  return anni > 0 && anni <= ETA_MASSIMA ? anni : null
}

/**
 * Gli anni compiuti a una certa data, l'età della scheda: conta mese e giorno,
 * a differenza di `etaCompiuta`. `null` se la data manca o non torna.
 */
export function anniCompiuti (nascita: Iso, data: Iso): number | null {
  if (!isoValida(nascita) || !isoValida(data)) return null
  // Mese-giorno crudo, non `ricorrenza`: chi è nato il 29 febbraio festeggia
  // il 28 ma compie gli anni (e diventa maggiorenne) il primo marzo. Voluto:
  // vedi `tests/domain/birthdays.test.mjs`.
  const anni =
    Number(data.slice(0, 4)) -
    Number(nascita.slice(0, 4)) -
    (data.slice(5) < nascita.slice(5) ? 1 : 0)
  return anni >= 0 && anni <= ETA_MASSIMA ? anni : null
}

/** Le classi in cui cercare: quelle dell'anno, archiviate escluse, con il filtro già applicato. */
function classiDove (
  registro: Registro,
  annoId: string | null,
  classeId?: string | null,
): Classe[] {
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
 * Chi compie gli anni in un certo giorno, in ordine di elenco. Fuori chi si è
 * ritirato. `classeId` restringe a una classe (filtro del calendario).
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
 * I compleanni di un periodo, giorno per giorno, in una passata sola
 * sull'anagrafica. I giorni senza compleanni non compaiono.
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
      // Un periodo a cavallo di capodanno ha due ricorrenze possibili.
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
    (a, b) => confrontaNomi(a.classe, b.classe) || a.nome.localeCompare(b.nome, 'it'),
  )
}

/**
 * Un compleanno in una riga, «Rossi Maria compie 18 anni»: la stessa frase
 * per agenda, settimana e mese.
 */
export function fraseCompleanno (compleanno: Compleanno): string {
  const t = testi()
  return compleanno.eta === null
    ? t.compieGliAnni(compleanno.nome)
    : t.compie(compleanno.nome, compleanno.eta)
}
