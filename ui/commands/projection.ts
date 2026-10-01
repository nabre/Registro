// I comandi dello schermo per la classe, nella scheda «Proiezione».

import {
  BLOCCHI,
  NOMI_BLOCCO,
  NOMI_VISTA_CALENDARIO,
  VISTE_CALENDARIO,
  bloccoAperto,
  bloccoScorrendo,
  riservato,
  type BloccoProiezione,
  type ImpostazioniProiezione,
} from '#core/dominio/projection.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import type { NomeIcona } from '#ui/components/icons.js'
import { azione } from '#ui/bridge.js'
import { stato } from '#ui/state.js'
import { testi } from './projection.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi

// -------------------------------------------------------------- lo schermo

/** Com'è messo lo schermo per la classe adesso. */
function proiettata (): ImpostazioniProiezione {
  return stato.proiezione.impostazioni
}

/** Cambia com'è messo lo schermo: l'host lo racconta indietro a tutti. */
function mandaProiezione (impostazioni: ImpostazioniProiezione): Promise<unknown> {
  return azione({ tipo: 'proiezione.impostazioni', impostazioni })
}

function senzaSchermo (): string | null {
  return stato.proiezione.aperta ? null : t.schermoSpento
}

function senzaSchedeDaScorrere (): string | null {
  return proiettata().blocchi.length > 1 ? null : t.unaSchedaSola
}

/**
 * Apre una scheda sullo schermo grande, accendendola se era spenta; ricliccata
 * quella aperta, la spegne. La regola la usano sia i comandi sia la fascia
 * della proiezione, che legge di qui.
 */
export function apriBlocco (blocco: BloccoProiezione): Promise<unknown> {
  const attuali = proiettata()
  const acceso = attuali.blocchi.includes(blocco)

  if (acceso && bloccoAperto(attuali) === blocco) {
    // Ricliccando quella aperta la si spegne: lo schermo passa alla successiva.
    return mandaProiezione({
      ...attuali,
      blocchi: attuali.blocchi.filter((b) => b !== blocco),
      aperto: null,
    })
  }

  return mandaProiezione({
    ...attuali,
    // Nell'ordine dichiarato, non dei clic: «la prossima» è sempre la stessa.
    blocchi: BLOCCHI.filter((b) => attuali.blocchi.includes(b) || b === blocco),
    aperto: blocco,
  })
}

/** L'icona di ogni scheda proiettabile: le stesse delle pagine che mostrano. */
const ICONE_BLOCCO: Record<BloccoProiezione, NomeIcona> = {
  scaletta: 'piano',
  argomenti: 'agenda',
  consegne: 'allegato',
  calendario: 'calendario',
  valutazioni: 'valutazioni',
  documenti: 'documento',
  appello: 'classi',
}

/** L'icona di ogni vista del calendario: le stesse del selettore del registro. */
const ICONE_VISTA: Record<'settimana' | 'mese' | 'anno' | 'agenda', NomeIcona> = {
  settimana: 'settimana',
  mese: 'mese',
  anno: 'calendario',
  agenda: 'agenda',
}

/**
 * Il comando che mette una scheda sullo schermo grande (`apriBlocco`). I blocchi
 * riservati (voti, documenti, appello) lo dicono nell'aiuto: parlano di singole persone.
 */
function comandoDiBlocco (blocco: BloccoProiezione): ComandoUI {
  return {
    id: `proiezione.blocco.${blocco}`,
    titolo: NOMI_BLOCCO[blocco],
    simbolo: ICONE_BLOCCO[blocco],
    dove: ['schermo'],
    gruppo: G.sulloSchermo,
    // La frase si compone nella lingua: il tedesco tiene la maiuscola del nome.
    aiuto: riservato(blocco)
      ? t.bloccoRiservato(NOMI_BLOCCO[blocco])
      : t.mostraBlocco(NOMI_BLOCCO[blocco]),
    impedimento: senzaSchermo,
    acceso: () => bloccoAperto(proiettata()) === blocco,
    al: () => apriBlocco(blocco),
  }
}

export const COMANDI_PROIEZIONE: readonly ComandoUI[] = [
  // ----------------------------------------------------------- Proiezione
  {
    id: 'proiezione.schermo',
    titolo: () => (stato.proiezione.aperta ? t.spegniSchermo : t.proietta),
    simbolo: 'schermo',
    dove: ['app', 'schermo'],
    fuoriMenu: true,
    gruppo: G.schermo,
    aiuto: () => (stato.proiezione.aperta ? t.spegniSchermoAiuto : t.proiettaAiuto),
    primario: true,
    acceso: () => stato.proiezione.aperta,
    al: () => azione({ tipo: stato.proiezione.aperta ? 'proiezione.chiudi' : 'proiezione.apri' }),
  },
  {
    id: 'proiezione.pausa',
    titolo: () => (proiettata().sospesa ? t.riprendi : t.pausa),
    simbolo: 'pausa',
    dove: ['schermo'],
    gruppo: G.schermo,
    aiuto: t.pausaAiuto,
    impedimento: senzaSchermo,
    acceso: () => proiettata().sospesa,
    al: () => mandaProiezione({ ...proiettata(), sospesa: !proiettata().sospesa }),
  },
  {
    id: 'proiezione.indietro',
    titolo: t.schedaPrecedente,
    simbolo: 'sinistra',
    dove: ['schermo'],
    gruppo: G.schermo,
    impedimento: () => senzaSchermo() ?? senzaSchedeDaScorrere(),
    al: () => mandaProiezione({ ...proiettata(), aperto: bloccoScorrendo(proiettata(), -1) }),
  },
  {
    id: 'proiezione.avanti',
    titolo: t.schedaSuccessiva,
    simbolo: 'destra',
    dove: ['schermo'],
    gruppo: G.schermo,
    impedimento: () => senzaSchermo() ?? senzaSchedeDaScorrere(),
    al: () => mandaProiezione({ ...proiettata(), aperto: bloccoScorrendo(proiettata(), 1) }),
  },

  // Una voce per blocco (`apriBlocco`): il pulsante acceso è quel che la classe
  // sta guardando.
  ...BLOCCHI.map((blocco) => comandoDiBlocco(blocco)),

  {
    id: 'proiezione.nomi',
    titolo: () => (proiettata().nomi ? t.nomiVisibili : t.senzaNomi),
    simbolo: 'utente',
    dove: ['schermo'],
    gruppo: G.comeSiVede,
    aiuto: t.nomiAiuto,
    impedimento: senzaSchermo,
    acceso: () => proiettata().nomi,
    al: () => mandaProiezione({ ...proiettata(), nomi: !proiettata().nomi }),
  },
  {
    id: 'proiezione.misure',
    titolo: () => (proiettata().compatta ? t.misureStrette : t.misureLarghe),
    simbolo: 'su',
    dove: ['schermo'],
    gruppo: G.comeSiVede,
    aiuto: () => (proiettata().compatta ? t.misureStretteAiuto : t.misureLargheAiuto),
    impedimento: senzaSchermo,
    acceso: () => !proiettata().compatta,
    al: () => mandaProiezione({ ...proiettata(), compatta: !proiettata().compatta }),
  },

  // Le quattro viste del calendario proiettato: attive solo con la scheda
  // Calendario aperta. Il giorno lo porta il calendario del registro.
  ...VISTE_CALENDARIO.map((vista) => ({
    id: `proiezione.calendario.${vista}`,
    titolo: NOMI_VISTA_CALENDARIO[vista],
    simbolo: ICONE_VISTA[vista],
    dove: ['schermo'] as const,
    gruppo: G.calendarioProiettato,
    aiuto: t.vistaProiettataAiuto,
    impedimento: () =>
      senzaSchermo() ??
      (bloccoAperto(proiettata()) === 'calendario' ? null : t.calendarioNonAperto),
    acceso: () => (proiettata().calendario ?? 'agenda') === vista,
    al: () => mandaProiezione({ ...proiettata(), calendario: vista }),
  })),
]
