// I corsi di una carta intestata, per la sezione Intestazione, senza DOM:
// ordine, raggruppamento per classe, selezione con Ctrl e Maiuscolo, quali
// corsi partono trascinando. Stanno qui per essere provati; il disegno è in
// `letterhead.ts`.

import { Uno } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { Classe, Corso, Materia } from '../../../domain/models.js'
import { confrontaNomi } from '../../../domain/text.js'
import { testi } from './letterhead.testi.js'

/** Un corso come lo mostra la sua pastiglia. */
interface CorsoInCarta {
  id: string
  /**
   * Il testo della pastiglia: la materia (la classe è già nel gruppo), con la
   * sigla se c'è. Il nome intero sta in `nome`.
   */
  etichetta: string
  /** Il nome per intero, «DIC4a · Matematica»: per chi non vede il gruppo. */
  nome: string
}

/** I corsi di una classe dentro una carta. */
export interface GruppoDiClasse {
  classeId: string
  nome: string
  corsi: CorsoInCarta[]
}

/** Quel che serve sapere dell'anno per dare un nome ai corsi. */
interface Anagrafe {
  corsi: readonly Corso[]
  classi: readonly Classe[]
  materie: readonly Materia[]
}

/**
 * I corsi di una carta, raggruppati per classe. Si mostrano solo quelli di
 * `visibili` (l'anno aperto), gli altri si contano. Classi in ordine di nome,
 * dentro le materie, come nella barra laterale.
 */
export function gruppiDellaCarta (
  corsiIds: readonly string[],
  anagrafe: Anagrafe,
  visibili: ReadonlySet<string>,
): { gruppi: GruppoDiClasse[], altri: number } {
  const classi = new Map(anagrafe.classi.map((classe) => [classe.id, classe]))
  const materie = new Map(anagrafe.materie.map((materia) => [materia.id, materia]))
  const corsi = new Map(anagrafe.corsi.map((corso) => [corso.id, corso]))
  const perClasse = new Map<string, GruppoDiClasse>()
  let altri = 0
  const senzaClasse = testi().senzaClasse
  const unCorso = Uno(lessico().corso)

  for (const id of corsiIds) {
    const corso = corsi.get(id)
    if (!corso || !visibili.has(id)) {
      altri += 1
      continue
    }
    const classe = classi.get(corso.classeId)
    const nomeClasse = classe?.nome ?? senzaClasse
    const laMateria = materie.get(corso.materiaId)
    const materia = laMateria?.nome ?? ''
    const sigla = laMateria?.sigla?.trim() ?? ''
    const gruppo = perClasse.get(corso.classeId) ??
      { classeId: corso.classeId, nome: nomeClasse, corsi: [] }
    gruppo.corsi.push({
      id,
      etichetta: sigla || materia || corso.titolo || unCorso,
      nome: [nomeClasse, materia].filter(Boolean).join(' · ') || corso.titolo || unCorso,
    })
    perClasse.set(corso.classeId, gruppo)
  }

  const gruppi = [...perClasse.values()].sort((a, b) => confrontaNomi(a.nome, b.nome))
  for (const gruppo of gruppi) gruppo.corsi.sort((a, b) => confrontaNomi(a.etichetta, b.etichetta))
  return { gruppi, altri }
}

/** I corsi nell'ordine in cui compaiono a schermo: quello degli intervalli. */
export function ordineAVista (gruppi: readonly GruppoDiClasse[]): string[] {
  return gruppi.flatMap((gruppo) => gruppo.corsi.map((corso) => corso.id))
}

/** La selezione delle pastiglie, e da dove parte il prossimo intervallo. */
export interface Selezione {
  scelti: ReadonlySet<string>
  ancora: string | null
}

/** Come si è cliccato: da solo, con Ctrl (aggiunge o toglie), con Maiuscolo (intervallo). */
export type ModoClic = 'solo' | 'aggiungi' | 'intervallo'

/**
 * La selezione dopo un clic su una pastiglia, come nei gestori di file: il
 * clic semplice sceglie quella sola (se era già la sola resta), Ctrl aggiunge o
 * toglie, Maiuscolo prende l'intervallo dall'ultima cliccata, dentro la stessa
 * carta (`ordine` è quello a vista della carta cliccata).
 */
export function selezionaCon (
  prima: Selezione,
  id: string,
  modo: ModoClic,
  ordine: readonly string[],
): Selezione {
  if (modo === 'aggiungi') {
    const scelti = new Set(prima.scelti)
    if (scelti.has(id)) scelti.delete(id)
    else scelti.add(id)
    return { scelti, ancora: id }
  }
  if (modo === 'intervallo' && prima.ancora !== null) {
    const da = ordine.indexOf(prima.ancora)
    const a = ordine.indexOf(id)
    if (da >= 0 && a >= 0) {
      const [inizio, fine] = da <= a ? [da, a] : [a, da]
      // L'ancora resta: due Maiuscolo+clic di fila regolano lo stesso intervallo.
      const scelti = new Set([...prima.scelti, ...ordine.slice(inizio, fine + 1)])
      return { scelti, ancora: prima.ancora }
    }
  }
  return { scelti: new Set([id]), ancora: id }
}

/**
 * Quali corsi partono trascinando `ids` (una pastiglia o una classe intera):
 * tutta la selezione se li contiene, altrimenti solo quelli presi.
 */
export function daTrascinare (ids: readonly string[], scelti: ReadonlySet<string>): string[] {
  if (ids.length > 0 && ids.every((id) => scelti.has(id))) {
    return [...new Set([...ids, ...scelti])]
  }
  return [...ids]
}

/** Il tipo con cui i corsi viaggiano nel `dataTransfer`: solo dentro questa sezione. */
export const TIPO_CORSI = 'application/x-registro-corsi'

/** Gli id dei corsi scritti per il `dataTransfer`. */
export function codificaCorsi (ids: readonly string[]): string {
  return JSON.stringify(ids)
}

/** Gli id letti dal `dataTransfer`, o nessuno se quel che arriva non è un elenco di corsi. */
export function decodificaCorsi (testo: string): string[] {
  try {
    const dato: unknown = JSON.parse(testo)
    return Array.isArray(dato) ? dato.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}
