// Le finestre del registro viste da una pagina: se è la principale o una
// figlia, quali altre sono aperte, e l'etichetta che lo dice nella barra del
// titolo. Le finestre le apre e le chiude l'host (`desktop/pannelli/panel.ts`),
// che a ogni cambio spinge l'elenco (`MessaggioFinestre`); il numero di questa
// la pagina lo sa già prima di disegnare, da `data-finestra` sull'`<html>`.
// Corso, classe del docente di classe e periodo sono gli stessi in tutte: la
// pagina dice all'host quando chi la guarda li cambia, e l'host li gira alle altre.
//
// Il DOM si tocca solo dentro le funzioni: le prove importano il modulo in Node.

import type { ContestoCondiviso, MessaggioFinestre } from '#contract/protocol.js'
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

// ------------------------------------------- corso, classe e periodo condivisi

/**
 * Corso di lavoro, classe del docente di classe e periodo come li ha questa
 * finestra. Per corso e classe `null` è «niente scelto», per il periodo l'anno intero.
 */
export interface Condivisi {
  corsoId: string | null
  classeId: string | null
  semestreId: string | null
}

/**
 * Gli ultimi corso, classe e periodo che questa finestra ha in comune con le altre:
 * detti all'host o presi da lui. `null` a pagina appena caricata o a
 * documento cambiato, finché non se ne sa nessuno.
 */
let noti: Condivisi | null = null

/**
 * Che cosa dire all'host dei condivisi di adesso, o `null` se niente: i campi
 * cambiati da chi guarda questa finestra. Alla partenza parla solo la
 * principale (riaprendo il documento valgono i suoi, non quelli ricordati da
 * una figlia). Corso o classe a «niente scelto» non si dicono, perché
 * svuoterebbero le altre; l'anno intero sì, è un periodo scelto.
 */
export function condivisiDaDire (adesso: Condivisi): ContestoCondiviso | null {
  const prima = noti
  noti = adesso
  const cambio: ContestoCondiviso = {}
  const daDire = (campo: keyof Condivisi) => prima === null ? !èFiglia() : adesso[campo] !== prima[campo]
  for (const campo of ['corsoId', 'classeId'] as const) {
    const valore = adesso[campo]
    if (valore !== null && daDire(campo)) cambio[campo] = valore
  }
  if (daDire('semestreId')) cambio.semestreId = adesso.semestreId
  return Object.keys(cambio).length > 0 ? cambio : null
}

/**
 * Prende i condivisi di adesso senza dirli: dopo un allineamento chiesto
 * dall'host, o dopo che i dati nuovi hanno spostato qualcosa da sé. Una
 * pagina che non arriva dove le altre (una persona tiene la sua classe) resta
 * dov'è senza tirare le altre con sé.
 */
export function prendiCondivisi (adesso: Condivisi): void {
  noti = adesso
}

/** Si riparte da capo: pagina nuova o altro documento. */
export function scordaCondivisi (): void {
  noti = null
}
