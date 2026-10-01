// La bozza di `Archivio.modifica` (ADR-50, passo 2): l'operazione lavora su una
// bozza immer, e le patch che ne escono dicono quali collezioni ha toccato
// davvero e come tornare indietro. Le patch poi si riportano sullo stato vivo,
// in posto: gli oggetti del registro restano gli stessi, come quando
// l'operazione lo cambiava direttamente, e chi ne tiene uno in mano (un
// gestore che aspetta un dialogo, lo smistatore) continua a vedere quello vero.

import { Immer, current, enableArrayMethods, enablePatches, isDraft, type Draft, type Patch } from 'immer'

import type { Registro } from '#core/dominio/models.js'
import type { NomeCollezione } from './paths.js'

enablePatches()
// Senza, `find`, `filter`, `some` o `sort` su una lista della bozza fanno una
// bozza di ogni voce che toccano: su migliaia di lezioni costa decine di volte
// la stessa cosa sullo stato. Con, girano sulle voci com'è adesso e fanno bozza
// solo di quelle che tornano. Le funzioni passate vedono quindi le voci non
// ancora toccate così come sono nello stato: vanno solo lette, e confrontate
// per id, non per identità con oggetti presi fuori dall'operazione.
// Due limiti di immer 11 con questo modo, che le prove di `storia.test.mjs`
// e `controllaVivo` fanno vedere:
// - dopo `sort`, `reverse` o `splice` una lista non si rilegge nella stessa
//   operazione: una voce spostata in un posto già scritto (`push`,
//   `lista[i] = …`) torna quella dello stato e non una bozza, e cambiarla
//   cambierebbe lo stato vivo. Il riordino va per ultimo, come in `riponi`;
// - un oggetto nuovo con dentro pezzi della bozza, messo in una lista che poi
//   si riordina, porta nello stato bozze chiuse: i pezzi si prendono con
//   `comeAdesso` (`controllaSenzaBozze` in `archive.ts`).
enableArrayMethods()

/**
 * Un immer tutto nostro, così le impostazioni non toccano altri che usassero la
 * libreria. `autoFreeze` spento: le patch si riportano sullo stato vivo in
 * posto (`applicaInPosto`), che dev'essere cambiabile anche nei valori nuovi
 * che mettono, e un oggetto congelato là dentro farebbe lanciare la scrittura dopo. L'iterazione non stretta salta le
 * proprietà non enumerabili, che in dati letti da JSON non ci sono: costa meno.
 */
const immer = new Immer({ autoFreeze: false, useStrictIteration: false })

export type { Patch }

/**
 * Le differenze di una scrittura, per chi un domani vorrà mandare al pannello
 * solo quelle. Le patch parlano dello stato vivo: si leggono subito, non si
 * tengono né si cambiano.
 */
export interface Differenze {
  collezioni: NomeCollezione[]
  patch: readonly Patch[]
}

/**
 * La collezione su disco di ogni chiave in cima al registro: l'intestazione
 * (`registro.json`) ne raccoglie più d'una. Una chiave nuova nel `Registro`
 * non compila finché non si dice qui dove va.
 */
const COLLEZIONE_DI: Record<keyof Registro, NomeCollezione> = {
  versione: 'registro',
  anni: 'registro',
  annoCorrenteId: 'registro',
  materie: 'registro',
  impostazioni: 'registro',
  classi: 'classi',
  corsi: 'corsi',
  lezioni: 'lezioni',
  piani: 'piani',
  valutazioni: 'valutazioni',
  fascicoli: 'fascicoli',
  consegne: 'consegne',
  check: 'check',
  progetti: 'progetti',
  smistamenti: 'smistamenti',
  coordinate: 'coordinate',
}

/** La collezione che una patch tocca: il primo passo del suo percorso. */
function collezioneDi (patch: Patch): NomeCollezione {
  const chiave = patch.path[0]
  const collezione = typeof chiave === 'string' ? COLLEZIONE_DI[chiave as keyof Registro] : undefined
  // Le operazioni lavorano dentro il registro, mai sulla radice o su una chiave
  // che il modello non conosce: se succede, la patch non ha un posto su disco.
  // testo-fisso: diagnostica interna di sviluppo
  if (!collezione) throw new Error(`patch fuori dalle collezioni: /${patch.path.join('/')}`)
  return collezione
}

/** Le patch divise per collezione, nell'ordine in cui sono arrivate. */
export function perCollezione (patch: readonly Patch[]): Map<NomeCollezione, Patch[]> {
  const divise = new Map<NomeCollezione, Patch[]>()
  for (const una of patch) {
    const collezione = collezioneDi(una)
    const sue = divise.get(collezione)
    if (sue) sue.push(una)
    else divise.set(collezione, [una])
  }
  return divise
}

/**
 * Esegue `ricetta` su una bozza del registro e torna il registro nuovo di immer
 * e le patch, senza toccare lo stato: lo riporta chi chiama (`applicaInPosto`,
 * `sostituisciLeToccate`). Quel che la ricetta torna si ignora (per immer
 * sarebbe uno stato nuovo). Una ricetta che lancia non lascia niente a metà.
 */
export function inBozza (
  stato: Registro,
  ricetta: (bozza: Registro) => unknown,
): { nuovo: Registro; patch: Patch[]; inverse: Patch[] } {
  const [nuovo, patch, inverse] = immer.produceWithPatches(stato, (bozza) => {
    ricetta(bozza)
  })
  return compatta(stato, nuovo, patch, inverse)
}

/**
 * Riscrive più corte le patch delle liste in cima al registro. Immer descrive
 * una lista riordinata o con una voce inserita in mezzo posto per posto: su
 * migliaia di lezioni sono migliaia di patch, ognuna con la sua voce da
 * copiare, pesare e riportare. Qui si guarda la lista prima e dopo, per
 * identità (le voci non toccate sono le stesse), e si dice solo il pezzo che
 * cambia: una voce tolta e rimessa, o le voci del tratto in mezzo. Si fa solo
 * per le liste le cui patch stanno tutte al primo livello: una patch più in
 * fondo cambia una voce in posto, e quella va lasciata com'è.
 */
function compatta (
  stato: Registro,
  nuovo: Registro,
  patch: Patch[],
  inverse: Patch[],
): { nuovo: Registro; patch: Patch[]; inverse: Patch[] } {
  patch = togliSuperate(patch)
  inverse = togliSuperate(inverse)
  const quante = new Map<string, number>()
  const profonde = new Set<string>()
  const intere = new Set<string>()
  for (const una of patch) {
    const chiave = String(una.path[0])
    quante.set(chiave, (quante.get(chiave) ?? 0) + 1)
    if (una.path.length > 2) profonde.add(chiave)
    if (una.path.length === 1) intere.add(chiave)
  }
  const prima = stato as unknown as Record<string, unknown>
  const dopo = nuovo as unknown as Record<string, unknown>
  for (const [chiave, numero] of quante) {
    // Due patch (una tolta e una messa) sono già il meglio; non una lista
    // rimessa intera (`r.lezioni = r.lezioni.filter(…)`), che pesa quanto tutte le sue voci.
    if ((numero <= 2 && !intere.has(chiave)) || profonde.has(chiave)) continue
    const vecchia = prima[chiave]
    const nuova = dopo[chiave]
    if (!Array.isArray(vecchia) || !Array.isArray(nuova)) continue
    const corte = differenzaDiLista(chiave, vecchia, nuova)
    if (corte.avanti.length >= numero && !intere.has(chiave)) continue
    patch = [...patch.filter((una) => una.path[0] !== chiave), ...corte.avanti]
    inverse = [...inverse.filter((una) => una.path[0] !== chiave), ...corte.indietro]
  }
  return { nuovo, patch, inverse }
}

/**
 * Toglie le patch dentro una voce che una patch dopo sostituisce o toglie
 * intera. Immer le manda per una voce spostata e poi cambiata (`splice`, poi
 * `lista[0].nome = …`): prima quella dentro, al posto dove la voce arriva, poi
 * quella che ce la mette. Riportata in posto, la prima cambierebbe la voce che
 * quel posto aveva prima: un oggetto che esce dalla lista, ma che la storia e
 * chi lo tiene vedrebbero cambiato.
 */
function togliSuperate (patch: Patch[]): Patch[] {
  // Senza patch dentro una voce (le più: un riordino, una voce rimessa) non c'è niente da togliere.
  if (!patch.some((una) => una.path.length > 2)) return patch
  const chiaveDi = (percorso: Patch['path']) => percorso.map(String).join('\u0000')
  const ultima = new Map<string, number>()
  patch.forEach((una, i) => {
    if (una.op !== 'add') ultima.set(chiaveDi(una.path), i)
  })
  return patch.filter((una, i) => {
    for (let fin = 1; fin < una.path.length; fin++) {
      const dove = ultima.get(chiaveDi(una.path.slice(0, fin)))
      if (dove !== undefined && dove > i) return false
    }
    return true
  })
}

/**
 * Le patch che portano la lista `prima` a `dopo` e ritorno, tagliando le voci
 * uguali in testa e in coda. Una voce sola spostata (un'ora trascinata a un
 * altro giorno, poi riordinata) sono due patch, per quanto lontano vada.
 */
function differenzaDiLista (
  chiave: string,
  prima: readonly unknown[],
  dopo: readonly unknown[],
): { avanti: Patch[]; indietro: Patch[] } {
  const minimo = Math.min(prima.length, dopo.length)
  let testa = 0
  while (testa < minimo && prima[testa] === dopo[testa]) testa++
  let coda = 0
  while (coda < minimo - testa && prima[prima.length - 1 - coda] === dopo[dopo.length - 1 - coda]) coda++
  const tolte = prima.slice(testa, prima.length - coda)
  const messe = dopo.slice(testa, dopo.length - coda)
  const posto = (i: number): Patch['path'] => [chiave, testa + i]

  if (tolte.length === messe.length && tolte.length >= 3) {
    const ultima = tolte.length - 1
    // La prima del tratto è andata in fondo: le altre sono scalate su di uno.
    if (tolte.slice(1).every((voce, i) => voce === messe[i])) {
      return {
        avanti: [{ op: 'remove', path: posto(0) }, { op: 'add', path: posto(ultima), value: messe[ultima] }],
        indietro: [{ op: 'remove', path: posto(ultima) }, { op: 'add', path: posto(0), value: tolte[0] }],
      }
    }
    // L'ultima del tratto è andata in testa.
    if (tolte.slice(0, -1).every((voce, i) => voce === messe[i + 1])) {
      return {
        avanti: [{ op: 'remove', path: posto(ultima) }, { op: 'add', path: posto(0), value: messe[0] }],
        indietro: [{ op: 'remove', path: posto(0) }, { op: 'add', path: posto(ultima), value: tolte[ultima] }],
      }
    }
  }
  if (tolte.length === messe.length) {
    const avanti: Patch[] = []
    const indietro: Patch[] = []
    tolte.forEach((voce, i) => {
      if (voce === messe[i]) return
      avanti.push({ op: 'replace', path: posto(i), value: messe[i] })
      indietro.push({ op: 'replace', path: posto(i), value: voce })
    })
    return { avanti, indietro }
  }
  // Tolte sempre dallo stesso posto: dopo ognuna le altre scalano.
  return {
    avanti: [
      ...tolte.map((): Patch => ({ op: 'remove', path: posto(0) })),
      ...messe.map((voce, i): Patch => ({ op: 'add', path: posto(i), value: voce })),
    ],
    indietro: [
      ...messe.map((): Patch => ({ op: 'remove', path: posto(0) })),
      ...tolte.map((voce, i): Patch => ({ op: 'add', path: posto(i), value: voce })),
    ],
  }
}

/**
 * Mette nello stato vivo, dal registro nuovo di immer, le chiavi in cima che
 * le patch toccano: le raccolte cambiate diventano oggetti nuovi, le altre
 * restano quelle. Ci conta chi confronta prima e dopo per identità
 * (`core/azioni/history.ts`).
 */
export function sostituisciLeToccate (
  stato: Registro,
  nuovo: Registro,
  patch: readonly Patch[],
): void {
  const vivo = stato as unknown as Record<string, unknown>
  const fonte = nuovo as unknown as Record<string, unknown>
  const chiavi = new Set(patch.map((una) => String(una.path[0])))
  for (const chiave of chiavi) vivo[chiave] = fonte[chiave]
}

/**
 * Un pezzo della bozza com'è adesso, fuori dalla bozza: per metterlo in un
 * oggetto nuovo, o tenerlo dopo l'operazione. Quel che non è una bozza torna com'è.
 */
export function comeAdesso<T> (valore: T): T {
  return isDraft(valore) ? current(valore as Draft<T>) : valore
}

/** Applica delle patch su una bozza: per l'annulla, dentro `inBozza`. */
export function applicaInBozza (bozza: Registro, patch: readonly Patch[]): void {
  immer.applyPatches(bozza, patch)
}

/**
 * Riporta sullo stato vivo, in posto, le patch di una bozza fatta su di lui. È
 * il contrario di quel che fa immer (uno stato nuovo), per non cambiare
 * l'identità degli oggetti a chi li tiene. Le patch di immer sulle liste sono
 * sostituzioni per indice, aggiunte e tolte in coda, e `length`.
 */
export function applicaInPosto (stato: Registro, patch: readonly Patch[]): void {
  for (const una of patch) {
    const { op, path } = una
    const valore: unknown = una.value
    let dove = stato as unknown as Record<string | number, unknown>
    for (const passo of path.slice(0, -1)) dove = dove[passo] as Record<string | number, unknown>
    const ultima = path[path.length - 1]
    // testo-fisso: diagnostica interna di sviluppo
    if (ultima === undefined) throw new Error('patch sulla radice del registro')
    if (Array.isArray(dove) && ultima !== 'length') {
      const indice = Number(ultima)
      if (op === 'add') dove.splice(indice, 0, valore)
      else if (op === 'remove') dove.splice(indice, 1)
      else dove[indice] = valore
    } else if (op === 'remove') {
      // Proprietà che la bozza ha tolto: si toglie, non si mette a `undefined`.
      delete dove[ultima]
    } else {
      dove[ultima] = valore
    }
  }
}

/**
 * Una copia delle patch da tenere nella storia. I valori di immer sono oggetti
 * dello stato vivo, e le scritture dopo li cambiano in posto (`applicaInPosto`):
 * senza copia un annulla rimetterebbe il valore cambiato dopo, non quello di allora.
 */
export function copiaDelle (patch: readonly Patch[]): Patch[] {
  return structuredClone(patch) as Patch[]
}

/** Quanto pesano delle patch, in caratteri come le copie: per il tetto della storia. */
export function pesoDelle (patch: readonly Patch[]): number {
  return JSON.stringify(patch).length
}
