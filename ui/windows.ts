// Le finestre del registro viste da una pagina: se è la principale o una
// figlia, quali altre sono aperte, e l'etichetta che lo dice nella barra del
// titolo. Le finestre le apre e le chiude l'host (`desktop/pannelli/panel.ts`),
// che a ogni cambio spinge l'elenco (`MessaggioFinestre`); il numero di questa
// la pagina lo sa già prima di disegnare, da `data-finestra` sull'`<html>`.
//
// Il DOM si tocca solo dentro le funzioni: le prove importano il modulo in Node.

import type { MessaggioFinestre } from '#contract/protocol.js'
import { testi } from './windows.testi.js'

/** La principale è la 1; le figlie da 2. */
export const PRINCIPALE = 1

type Elenco = MessaggioFinestre['elenco']

/** L'ultimo elenco arrivato dall'host; vuoto finché non arriva. */
let elenco: Elenco = []

/** Il numero di questa finestra, scritto dall'host nella pagina. */
export function numeroDellaFinestra (): number {
  // Le prove senza DOM, o con un documento finto, non hanno `documentElement`.
  const scritto = Number(globalThis.document?.documentElement?.dataset?.finestra)
  return Number.isInteger(scritto) && scritto > PRINCIPALE ? scritto : PRINCIPALE
}

/** Se questa pagina è una finestra figlia: nasce snella, con il ritorno alla principale. */
export function èFiglia (): boolean {
  return numeroDellaFinestra() !== PRINCIPALE
}

/** Quante figlie al più, finché l'impostazione `finestre.massimo` non dice altro. */
const MASSIMO_PREDEFINITO = 4

/**
 * Perché adesso non si apre un'altra finestra, o `null`: al tetto delle
 * figlie. Il tetto è l'impostazione del programma, letta dalle voci che
 * l'host manda (`programma`); l'host lo ricontrolla comunque.
 */
export function perchéNonUnAltra (
  programma: ReadonlyArray<{ chiave: string, valore: unknown }>,
): string | null {
  const scritto = programma.find((voce) => voce.chiave === 'registroDocenti.finestre.massimo')?.valore
  const massimo = typeof scritto === 'number' && scritto >= 1 ? scritto : MASSIMO_PREDEFINITO
  return elenco.length - 1 >= massimo ? testi().troppe(massimo) : null
}

/** Le finestre aperte, principale compresa, come le ha dette l'host. */
export function finestreAperte (): Elenco {
  return elenco
}

/** L'elenco nuovo dall'host. Torna vero se è cambiato, e allora si ridisegna. */
export function ricevoFinestre (messaggio: MessaggioFinestre): boolean {
  const nuovo = Array.isArray(messaggio.elenco) ? messaggio.elenco : []
  if (JSON.stringify(nuovo) === JSON.stringify(elenco)) return false
  elenco = nuovo
  return true
}

/**
 * Che cosa dice l'etichetta della finestra nella barra del titolo, o `null` se
 * non dice niente: la principale si nomina solo quando ci sono figlie
 * («Principale · 3», le finestre aperte); una figlia sempre, col suo numero e
 * la pagina che mostra («Finestra 2 · Calendario»).
 */
export function etichettaDellaFinestra (
  numero: number,
  aperte: Elenco,
  pagina: string,
): string | null {
  const t = testi()
  if (numero !== PRINCIPALE) return t.figlia(numero, pagina)
  return aperte.length > 1 ? t.principale(aperte.length) : null
}
