// Come le impostazioni si dividono in aree e sezioni, e che cosa si trova
// cercandole. Senza DOM, così si prova: un'impostazione del manifesto finita
// in nessuna sezione non comparirebbe da nessuna parte. Per questo una sezione
// *raccoglie* quel che nessun'altra nomina.
//
// Quali sezioni stanno in quale area lo dice `posto.ts` (`SEZIONI_DELLE_AREE`),
// che ne fa gli indirizzi; qui si attaccano nomi, ambiti e chiavi.

import { Maiuscola } from '../../../../core/dominio/lexicon.js'
import { corrispondeAlla, pezziDiRicerca } from '../../../../core/dominio/text.js'
import {
  DIVISIONI,
  avvertenzaCondotto,
  divisioneDi,
  gruppoDi,
  nomeSezione,
  sottoPrefisso,
  titoloArea as titoloDellArea,
  titoloGruppo,
  type SezioneDiProgramma,
} from '../../../../core/controlli/areas.js'
import { CHIAVI_DEL_COLLEGAMENTO, IMPOSTAZIONI } from '../../../../contract/manifesto.js'
import type { VoceProgramma } from '../../../../contract/protocollo.js'
import type { NomeIcona } from '../../components/icons.js'
import {
  AREE_IMPOSTAZIONI,
  SEZIONI_DELLE_AREE,
  areaDellaSezione,
  type AreaImpostazioni,
  type Scheda,
  type SezioneImpostazioni,
} from '../../posto.js'
import { testi } from './sections.testi.js'

export { sottoPrefisso }

// La pagina sceglie la lingua prima di caricare il resto e si ricarica quando
// cambia: le costanti del modulo nascono già nella lingua giusta.
const T = testi()

/** Dove sta un blocco di impostazioni: nel file dell'anno, o su questo computer. */
export type AmbitoBlocco = 'anno' | 'computer'

/** Un'area: una scheda della testata, una pagina che scorre. */
export interface Area {
  id: AreaImpostazioni
  titolo: string
  simbolo: NomeIcona
}

const SIMBOLI: Readonly<Record<AreaImpostazioni, NomeIcona>> = {
  calendario: 'calendario',
  didattica: 'valutazioni',
  utente: 'utente',
  programma: 'impostazioni',
}

export const AREE: readonly Area[] = AREE_IMPOSTAZIONI.map((id) => ({
  id,
  titolo: titoloDellArea(id),
  simbolo: SIMBOLI[id],
}))

/**
 * Di chi sono i blocchi di una sezione, nell'ordine in cui compaiono. Una
 * sezione con due ambiti porta la pastiglia su ogni blocco.
 */
const AMBITI: Readonly<Record<SezioneImpostazioni, readonly AmbitoBlocco[]>> = {
  anno: ['anno'],
  // Il catalogo dei calendari ufficiali viene con il programma.
  chiusure: ['anno', 'computer'],
  settimane: ['anno'],
  giornata: ['anno'],
  ics: ['anno'],
  valutazione: ['anno'],
  liste: ['anno'],
  chiSei: ['anno'],
  stampa: ['anno'],
  account: ['computer'],
  // La casella e i recapiti sono del computer, la firma dell'anno.
  posta: ['computer', 'anno'],
  aspetto: ['computer'],
  avvio: ['computer'],
  modelli: ['computer'],
  aggiornamenti: ['computer'],
  condotto: ['computer'],
}

/** Una sezione, con la sua area e quel che serve per trovarla. */
export interface Sezione {
  id: SezioneImpostazioni
  area: AreaImpostazioni
  titolo: string
  sottotitolo: string
  /** Parole in più che la trovano cercando: i campi del documento non sono nel manifesto. */
  parole: string
  ambiti: readonly AmbitoBlocco[]
}

/** Se una sezione disegna chiavi del manifesto: allora nome e riassunto vengono da `areas.ts`. */
function diProgramma (id: SezioneImpostazioni): id is SezioneDiProgramma {
  return DIVISIONI.some((divisione) => divisione.id === id)
}

/** Nome, riassunto e parole di una sezione, da chi li sa. */
function testiDi (id: SezioneImpostazioni): { titolo: string, sottotitolo: string, parole: string } {
  return diProgramma(id) ? { ...nomeSezione(id), parole: T.parole[id] } : T.sezioni[id]
}

/** Tutte le sezioni, area per area, nell'ordine in cui scorrono. */
export const SEZIONI: readonly Sezione[] = AREE_IMPOSTAZIONI.flatMap((area) =>
  SEZIONI_DELLE_AREE[area].map((id): Sezione => ({
    id,
    area,
    ...testiDi(id),
    ambiti: AMBITI[id],
  })),
)

/** Le sezioni di un'area, in ordine. */
export function sezioniDellArea (area: AreaImpostazioni): Sezione[] {
  return SEZIONI.filter((sezione) => sezione.area === area)
}

/** Una sezione per id; una che non c'è più ricade sulla prima. */
export function sezioneDi (id: string): Sezione {
  return SEZIONI.find((sezione) => sezione.id === id) ?? SEZIONI[0]
}

/** Il nome di un'area. */
export function titoloArea (area: AreaImpostazioni): string {
  return titoloDellArea(area)
}

/** Il nome di un ambito, per la pastiglia, e il suo perché. */
export function nomeAmbito (ambito: AmbitoBlocco): { nome: string, aiuto: string } {
  return { nome: T.ambiti[ambito], aiuto: T.ambitiAiuto[ambito] }
}

export interface SezioneProgramma {
  id: SezioneDiProgramma
  titolo: string
  sottotitolo: string
  /** Le chiavi che raccoglie, per prefisso (vedi `divisioneDi`). */
  prefissi: readonly string[]
  /**
   * Quel che va letto prima di toccare queste voci, quando concedono qualcosa ad
   * altri (il condotto apre i dati a ogni programma dello stesso utente).
   */
  avvertenza?: string
  /** La rete — «Aspetto»: raccoglie anche quel che nessuna sezione ha nominato. */
  raccoglie?: boolean
}

/**
 * Le sezioni che disegnano chiavi del manifesto, con i prefissi che prendono:
 * le stesse della finestra nativa, prese dallo stesso elenco (`areas.ts`).
 */
export const SEZIONI_PROGRAMMA: readonly SezioneProgramma[] = DIVISIONI.map((divisione) => ({
  id: divisione.id,
  ...nomeSezione(divisione.id),
  prefissi: divisione.prefissi,
  ...(divisione.avvertenza ? { avvertenza: avvertenzaCondotto() } : {}),
  ...(divisione.raccoglie ? { raccoglie: true } : {}),
}))

/** La sezione delle chiavi con quell'id, se ne disegna. */
export function sezioneProgramma (id: SezioneImpostazioni): SezioneProgramma | undefined {
  return SEZIONI_PROGRAMMA.find((sezione) => sezione.id === id)
}

/**
 * Le chiavi che una scheda dedicata disegna da sé, e che l'elenco generico
 * salta. Stanno qui per evitare import circolari fra la scheda e il
 * disegnatore delle righe. Le voci sono spostate, non nascoste: le disegna la
 * stessa funzione, accanto alla riga che ne spiega l'effetto.
 */
export const CHIAVI_IN_SCHEDA: Readonly<Record<string, readonly string[]>> = {
  // La casella si mostra nella scheda Posta, non si scrive a mano: l'account si
  // collega in Utente › Account, e il mittente si sceglie fra gli indirizzi
  // dell'account.
  posta: [
    'registroDocenti.posta.invioDiretto',
    'registroDocenti.posta.utente',
    'registroDocenti.posta.mittente',
  ],
  // Tutte nelle righe d'uso (Assistente, Scansioni, Dettatura) e in «Sul
  // computer»: interruttore, modello e stato stanno insieme, una volta sola.
  modelli: [
    'registroDocenti.modelli.cartella',
    'registroDocenti.ocr.attivo',
    'registroDocenti.ocr.modello',
    'registroDocenti.ocr.proiettore',
    'registroDocenti.ocr.lettore',
    'registroDocenti.assistente.attivo',
    'registroDocenti.assistente.modello',
    'registroDocenti.dettatura.attivo',
    'registroDocenti.dettatura.taglia',
    'registroDocenti.dettatura.porta',
  ],
}

/** Se una chiave la disegna già la scheda dedicata di quella sezione. */
function disegnataDallaScheda (chiave: string, sezione: SezioneProgramma): boolean {
  return (CHIAVI_IN_SCHEDA[sezione.id] ?? []).includes(chiave)
}

/**
 * Le voci dell'elenco di una sezione, nell'ordine del manifesto: quelle che
 * `divisioneDi` le assegna (il prefisso più lungo; chi raccoglie prende quel
 * che nessun'altra nomina), meno quelle della scheda dedicata.
 */
export function vociDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  return voci.filter((voce) =>
    !disegnataDallaScheda(voce.chiave, sezione) && divisioneDi(voce.chiave).id === sezione.id)
}

/**
 * Tutte le voci che la sezione mostra, elenco e scheda dedicata insieme: serve
 * a chi conta («Ripristina (3)», il numero sull’area), che altrimenti
 * salterebbe le voci della scheda. È la stessa unione della prova di copertura.
 */
export function vociMostrateDaSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  const promosse = CHIAVI_IN_SCHEDA[sezione.id] ?? []
  return [
    ...vociDiSezione(voci, sezione),
    ...voci.filter((voce) =>
      promosse.includes(voce.chiave) && !CHIAVI_DEL_COLLEGAMENTO.includes(voce.chiave),
    ),
  ]
}

export interface GruppoVoci {
  /** `registroDocenti.posta`, o la chiave stessa quando non ha gruppo. */
  prefisso: string
  titolo: string
  voci: VoceProgramma[]
}

/**
 * Le voci di una sezione divise nei loro gruppi, nell'ordine di arrivo. Solo le
 * voci comuni: le `avanzata` le dà `avanzateDiSezione`. I gruppi di una voce
 * sola con lo stesso nome li scarta chi disegna.
 */
export function gruppiDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): GruppoVoci[] {
  return raggruppa(vociDiSezione(voci, sezione).filter((voce) => !voce.avanzata))
}

/** Le voci avanzate di una sezione, in fondo nel gruppo che si apre; non divise per gruppo. */
export function avanzateDiSezione (
  voci: readonly VoceProgramma[],
  sezione: SezioneProgramma,
): VoceProgramma[] {
  return vociDiSezione(voci, sezione).filter((voce) => voce.avanzata)
}

function raggruppa (voci: readonly VoceProgramma[]): GruppoVoci[] {
  const gruppi: GruppoVoci[] = []
  for (const voce of voci) {
    const prefisso = gruppoDi(voce.chiave)
    const gia = gruppi.find((gruppo) => gruppo.prefisso === prefisso)
    if (gia) {
      gia.voci.push(voce)
      continue
    }
    gruppi.push({
      prefisso,
      titolo: titoloGruppo(prefisso) ?? nomeVoce(prefisso),
      voci: [voce],
    })
  }
  return gruppi
}

/**
 * Il nome di un'impostazione: `etichetta` nel manifesto, o l'ultimo pezzo della
 * chiave a parole.
 */
export function nomeVoce (chiave: string): string {
  const scritta = IMPOSTAZIONI[chiave]?.etichetta
  if (scritta) return scritta
  const ultimo = chiave.split('.').pop() ?? chiave
  const parole = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return Maiuscola(parole)
}

// ------------------------------------------------------------------ cercare

/** Quel che si trova cercando: una voce del programma, o una sezione intera. */
export interface Trovata {
  /** Dove porta: l'area e la voce su cui arrivare. */
  scheda: Scheda
  titolo: string
  area: AreaImpostazioni
  sezione: SezioneImpostazioni
  /** L'ambito, quando è uno solo. */
  ambito: AmbitoBlocco | null
  /** La voce del programma trovata; assente per una sezione. */
  voce?: VoceProgramma
}

/**
 * Le impostazioni che rispondono a quel che si è scritto, dei due ambiti: le
 * voci del programma (nome, chiave, descrizione, gruppo) e le sezioni (nome,
 * riassunto, campi noti). La stessa sorgente per il filtro della pagina e per
 * Ctrl+K. Vuoto se non si è scritto niente.
 */
export function cercaImpostazioni (voci: readonly VoceProgramma[], cercato: string): Trovata[] {
  const pezzi = pezziDiRicerca(cercato)
  if (pezzi.length === 0) return []
  const sezioni = SEZIONI
    .filter((sezione) => corrispondeAlla(
      `${sezione.titolo} ${sezione.sottotitolo} ${sezione.parole} ${titoloDellArea(sezione.area)}`,
      pezzi,
    ))
    .map((sezione): Trovata => ({
      scheda: `${sezione.area}#${sezione.id}`,
      titolo: sezione.titolo,
      area: sezione.area,
      sezione: sezione.id,
      ambito: sezione.ambiti.length === 1 ? sezione.ambiti[0] : null,
    }))
  const chiavi = SEZIONI_PROGRAMMA.flatMap((sezione) => {
    const area = areaDellaSezione(sezione.id) ?? 'programma'
    const promosse = CHIAVI_IN_SCHEDA[sezione.id] ?? []
    return vociMostrateDaSezione(voci, sezione)
      .filter((voce) => corrispondeAlla(
        `${voce.chiave} ${nomeVoce(voce.chiave)} ${voce.descrizione} ` +
          `${titoloGruppo(gruppoDi(voce.chiave)) ?? ''}`,
        pezzi,
      ))
      .map((voce): Trovata => ({
        // Una voce disegnata da una scheda non ha una riga sua: si arriva alla sezione.
        scheda: `${area}#${promosse.includes(voce.chiave) ? sezione.id : voce.chiave}`,
        titolo: nomeVoce(voce.chiave),
        area,
        sezione: sezione.id,
        ambito: 'computer',
        voce,
      }))
  })
  // Prima le voci, che si cambiano sul posto; poi le sezioni, che portano altrove.
  return [...chiavi, ...sezioni]
}

// ------------------------------------------------------------------ contare

/** Quante impostazioni di un'area sono state decise a mano, schede dedicate comprese. */
export function scritteNellArea (voci: readonly VoceProgramma[], area: AreaImpostazioni): number {
  return SEZIONI_PROGRAMMA
    .filter((sezione) => areaDellaSezione(sezione.id) === area)
    .reduce((somma, sezione) =>
      somma + vociMostrateDaSezione(voci, sezione).filter((voce) => voce.scritta).length, 0)
}

/**
 * Le voci che «Ripristina» di un'area riporta al predefinito: solo quelle
 * decise a mano negli elenchi delle sue sezioni. Mai quelle delle schede
 * dedicate (un modello scelto, la cartella dei modelli: si cambiano lì, dove
 * se ne vede l'effetto) e mai quelle del collegamento, che staccherebbero la
 * casella dal suo gettone.
 */
export function daRipristinare (voci: readonly VoceProgramma[], area: AreaImpostazioni): VoceProgramma[] {
  return SEZIONI_PROGRAMMA
    .filter((sezione) => areaDellaSezione(sezione.id) === area)
    .flatMap((sezione) => vociDiSezione(voci, sezione))
    .filter((voce) => voce.scritta && !CHIAVI_DEL_COLLEGAMENTO.includes(voce.chiave))
}

/**
 * Che cosa, in un'area, chiede attenzione: un uso acceso senza il suo modello,
 * l'invio diretto senza casella. Solo dati che il pannello ha già; vuoto se
 * è tutto a posto.
 */
export function daSistemare (
  area: AreaImpostazioni,
  voci: readonly VoceProgramma[],
  posta: { invioDiretto: boolean, exchange: boolean },
): string[] {
  const motivi: string[] = []
  if (area === 'utente' && posta.invioDiretto && !posta.exchange) motivi.push(T.invioSenzaCasella)
  const valore = (chiave: string) => voci.find((voce) => voce.chiave === chiave)?.valore
  for (const sezione of SEZIONI_PROGRAMMA) {
    if (areaDellaSezione(sezione.id) !== area) continue
    // Anche le voci delle schede: gli interruttori degli usi stanno nelle righe d'uso.
    for (const voce of vociMostrateDaSezione(voci, sezione)) {
      // Un gruppo con un interruttore `attivo` e un `modello`: acceso senza modello non serve.
      if (!voce.chiave.endsWith('.attivo') || voce.valore !== true || voce.sospesa) continue
      const gruppo = gruppoDi(voce.chiave)
      const modello = valore(`${gruppo}.modello`)
      if (modello === undefined || String(modello).trim() !== '') continue
      motivi.push(T.accesoSenzaModello(titoloGruppo(gruppo) ?? nomeVoce(gruppo)))
    }
  }
  return motivi
}
