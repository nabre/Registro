// Dove si va: le destinazioni della barra laterale e della palette, per gruppo
// (le azioni stanno in `commands.ts`). La destinazione scelta distingue le
// pagine che condividono una vista.

import type { NomeIcona } from './components/icons.js'
import { notifica } from './components/notifications.js'
import { pagineDaSmistareInTutto } from './views/toSort.js'
import {
  classeDelFascicolo,
  corsoDelContesto,
  nomeDelCorso,
  senzaCorso,
} from './context.js'
import {
  aggiorna,
  classiDiCuiSonoDocente,
  lezioneDiRiferimentoDiCorso,
  nomeClasse,
  pendenzeDellaBarra,
  stato,
  type SchedaDocente,
  type Vista,
} from './state.js'
import { testi } from './pages.testi.js'

// Nomi letti una volta: la pagina si ricarica quando cambia lingua (`src/i18n/page.ts`).
const t = testi()

/**
 * Il gruppo della destinazione, cioè la sezione della barra laterale:
 *
 *   `agenda`   — la giornata, tutte le classi insieme: oggi, calendario,
 *                carta da smistare.
 *   `registro` — le pagine del corso scelto: ora, voti, pendenze, check, piani, documenti.
 *   `classe`   — il mestiere del docente di classe: pendenze, check, archivio,
 *                assenze, messaggi.
 *   `anno`     — chi c'è e com'è fatto l'anno: classi, persone, mappa, corsi.
 *   `sistema`  — il programma: impostazioni e guida.
 */
type GruppoPagina = 'agenda' | 'registro' | 'classe' | 'anno' | 'sistema'

export interface Pagina {
  /** Un nome stabile: lo cerca la palette, lo invoca chi va per nome. */
  id: string;
  titolo: string;
  simbolo: NomeIcona;
  gruppo: GruppoPagina;
  /** La riga che si legge fermandosi sopra: che cosa c'è, in quella pagina. */
  aiuto?: string;
  /** Perché adesso non ci si può andare, o `null` se si può. */
  impedimento?: () => string | null;
  /**
   * Quante cose aspettano dentro la pagina, accanto al titolo nella barra
   * laterale: per le pagine che esistono per farsi notare. Zero non si mostra.
   */
  conto?: () => number;
  /** Se è qui che si sta adesso. */
  attiva: () => boolean;
  /** Portarcisi, contesto compreso. */
  apri: () => void;
}

/**
 * Apre una pagina puntata sul corso del contesto. Corso e classe insieme,
 * perché le pagine filtrano per tutti e due.
 */
function vaiAlCorso (vista: Vista): void {
  const corso = corsoDelContesto()
  if (!corso) return
  if (vista === 'lezione') {
    const lezioneId = lezioneDiRiferimentoDiCorso(corso.id)
    if (!lezioneId) {
      notifica(t.nessunaLezione, 'avviso')
      return
    }
    aggiorna({
      vista,
      corsoId: corso.id,
      filtroClasseId: corso.classeId,
      lezioneId,
    })
    return
  }
  aggiorna({
    vista,
    corsoId: corso.id,
    filtroClasseId: corso.classeId,
    ...(vista === 'check' ? { ambitoCheck: 'corso' as const } : {}),
  })
}

/** Apre il check della classe scelta nel ruolo di docente di classe. */
function vaiAlCheckDellaClasse (): void {
  const classe = classeDelFascicolo()
  if (!classe) return
  aggiorna({
    vista: 'check',
    ambitoCheck: 'classe',
    classeId: classe.id,
    filtroClasseId: classe.id,
  })
}

/**
 * Apre il pannello del docente di classe su una scheda: le quattro schede
 * sono destinazioni a sé («Assenze», non «il pannello e la terza linguetta»).
 */
function vaiAlPannello (scheda: SchedaDocente): void {
  // La classe del fascicolo, non quella del contesto: la sezione esiste solo
  // dove il mestiere c'è, e qui una classe buona c'è sempre.
  const classe = classeDelFascicolo()
  if (!classe) return
  // Anche il filtro per classe, come in `vaiAlCorso`: uscendo si va in una
  // pagina del corso, che non deve trovarsi il filtro di prima.
  aggiorna({
    vista: 'docenteClasse',
    classeId: classe.id,
    filtroClasseId: classe.id,
    schedaDocente: scheda,
  })
}

/**
 * Tutte le destinazioni, gruppo per gruppo, nell'ordine di una giornata: in
 * fondo a ogni gruppo le pagine che si aprono di rado.
 */
export const PAGINE: readonly Pagina[] = [
  // L'agenda viene prima: le pagine con cui si comincia, indipendenti dal corso.
  // La Dashboard apre la fila: la giornata in una schermata, da cui si va altrove
  // senza farci niente.
  {
    id: 'pagina.oggi',
    titolo: t.dashboard,
    simbolo: 'dashboard',
    gruppo: 'agenda',
    aiuto: t.oggiAiuto,
    attiva: () => stato.vista === 'oggi',
    apri: () => aggiorna({ vista: 'oggi' }),
  },
  {
    id: 'pagina.calendario',
    titolo: t.calendario,
    simbolo: 'calendario',
    gruppo: 'agenda',
    aiuto: t.calendarioAiuto,
    attiva: () => stato.vista === 'calendario',
    apri: () => aggiorna({ vista: 'calendario' }),
  },
  // Il gruppo «Anno» comincia dalle classi, poi persone, mappa e corsi.
  {
    id: 'pagina.classi',
    titolo: t.classi,
    simbolo: 'classi',
    gruppo: 'anno',
    aiuto: t.classiAiuto,
    attiva: () => stato.vista === 'classi',
    apri: () => aggiorna({ vista: 'classi' }),
  },
  {
    // Con l'anno e non con la classe: la domanda è «chi è questa persona», e di
    // che classe sia spesso non lo si sa. L'elenco attraversa le classi.
    id: 'pagina.persone',
    titolo: t.persone,
    simbolo: 'utente',
    gruppo: 'anno',
    aiuto: t.personeAiuto,
    attiva: () => stato.vista === 'persone' || stato.vista === 'allievo',
    apri: () => aggiorna({ vista: 'persone' }),
  },
  {
    // Con l'anno: la domanda è «da dove arriva la gente» (visite in azienda,
    // ritardi). Guarda tutte le classi, con una tendina sua per restringere.
    id: 'pagina.mappa',
    titolo: t.mappa,
    simbolo: 'mappa',
    gruppo: 'anno',
    aiuto: t.mappaAiuto,
    attiva: () => stato.vista === 'mappa',
    apri: () => aggiorna({ vista: 'mappa' }),
  },
  // Com'è fatto l'anno: ci si entra a settembre e quando cambia qualcosa.
  {
    id: 'pagina.corsi',
    titolo: t.corsi,
    simbolo: 'libro',
    gruppo: 'anno',
    aiuto: t.corsiAiuto,
    attiva: () => stato.vista === 'corsi',
    apri: () => aggiorna({ vista: 'corsi' }),
  },
  // La carta che entra (scansioni da dividere) è lavoro della giornata: agenda.
  {
    // Guarda tutte le classi, e una parte di quel che mostra una classe non ce l'ha ancora.
    id: 'pagina.daSmistare',
    titolo: t.daSmistare,
    simbolo: 'documento',
    gruppo: 'agenda',
    aiuto: t.daSmistareAiuto,
    conto: pagineDaSmistareInTutto,
    attiva: () => stato.vista === 'daSmistare',
    apri: () => aggiorna({ vista: 'daSmistare' }),
  },
  // Il registro: le pagine del corso scelto in cima. Senza corso restano spente
  // e dicono che cosa manca, perché l'elenco non cambi altezza.
  {
    id: 'pagina.corso.registro',
    titolo: t.lezione,
    simbolo: 'agenda',
    gruppo: 'registro',
    aiuto: t.lezioneAiuto,
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'lezione',
    apri: () => vaiAlCorso('lezione'),
  },
  {
    id: 'pagina.corso.valutazioni',
    titolo: t.valutazioni,
    simbolo: 'valutazioni',
    gruppo: 'registro',
    aiuto: t.valutazioniAiuto,
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'valutazioni',
    apri: () => vaiAlCorso('valutazioni'),
  },
  {
    id: 'pagina.pendenze',
    titolo: t.pendenze,
    simbolo: 'spunta',
    gruppo: 'registro',
    aiuto: t.pendenzeAiuto,
    impedimento: senzaCorso,
    // Lo stesso numero della barra in fondo e della tessera di «Oggi».
    conto: () => pendenzeDellaBarra().aperti,
    attiva: () => stato.vista === 'todo',
    apri: () => vaiAlCorso('todo'),
  },
  {
    // Accanto alle valutazioni: persone in riga e colonne, ma è fatto/non fatto e
    // la data, non un voto.
    id: 'pagina.corso.check',
    titolo: t.check,
    simbolo: 'check',
    gruppo: 'registro',
    aiuto: t.checkAiuto,
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'check' && stato.ambitoCheck === 'corso',
    apri: () => vaiAlCorso('check'),
  },
  {
    id: 'pagina.corso.piani',
    titolo: t.piani,
    simbolo: 'piano',
    gruppo: 'registro',
    aiuto: t.pianiAiuto,
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'piani',
    apri: () => vaiAlCorso('piani'),
  },
  {
    id: 'pagina.corso.documenti',
    titolo: t.documenti,
    simbolo: 'documento',
    gruppo: 'registro',
    aiuto: t.documentiAiuto,
    impedimento: senzaCorso,
    attiva: () => stato.vista === 'documenti',
    apri: () => vaiAlCorso('documenti'),
  },

  // Il docente di classe: le quattro schede del pannello come destinazioni.
  // Nessuna dichiara un impedimento: la sezione esiste solo dove il mestiere c'è
  // (`sezioneCePer`) e lì `classeDelFascicolo()` trova sempre una classe.
  {
    id: 'pagina.classe.pendenze',
    titolo: t.pendenzeClasse,
    simbolo: 'spunta',
    gruppo: 'classe',
    aiuto: t.pendenzeClasseAiuto,
    attiva: () =>
      stato.vista === 'docenteClasse' && stato.schedaDocente === 'todo',
    apri: () => vaiAlPannello('todo'),
  },
  {
    id: 'pagina.classe.check',
    titolo: t.checkClasse,
    simbolo: 'check',
    gruppo: 'classe',
    aiuto: t.checkClasseAiuto,
    attiva: () => stato.vista === 'check' && stato.ambitoCheck === 'classe',
    apri: vaiAlCheckDellaClasse,
  },
  {
    id: 'pagina.classe.documenti',
    titolo: t.archivio,
    simbolo: 'documento',
    gruppo: 'classe',
    aiuto: t.archivioAiuto,
    attiva: () =>
      stato.vista === 'docenteClasse' && stato.schedaDocente === 'documenti',
    apri: () => vaiAlPannello('documenti'),
  },
  {
    id: 'pagina.classe.assenze',
    titolo: t.assenze,
    simbolo: 'calendario',
    gruppo: 'classe',
    aiuto: t.assenzeAiuto,
    attiva: () =>
      stato.vista === 'docenteClasse' && stato.schedaDocente === 'assenze',
    apri: () => vaiAlPannello('assenze'),
  },
  {
    id: 'pagina.classe.messaggistica',
    titolo: t.messaggistica,
    simbolo: 'posta',
    gruppo: 'classe',
    aiuto: t.messaggisticaAiuto,
    attiva: () =>
      stato.vista === 'docenteClasse' &&
      stato.schedaDocente === 'messaggistica',
    apri: () => vaiAlPannello('messaggistica'),
  },

  // Il programma: la macchina, non il registro. Non è nel menu «File», perché la
  // barra laterale è sempre in vista.
  {
    id: 'pagina.impostazioni',
    titolo: t.impostazioni,
    simbolo: 'impostazioni',
    gruppo: 'sistema',
    aiuto: t.impostazioniAiuto,
    attiva: () => stato.vista === 'impostazioni',
    apri: () => aggiorna({ vista: 'impostazioni' }),
  },
  {
    id: 'pagina.guida',
    titolo: t.guida,
    simbolo: 'informazione',
    gruppo: 'sistema',
    aiuto: t.guidaAiuto,
    attiva: () => stato.vista === 'guida',
    apri: () => aggiorna({ vista: 'guida' }),
  },
]

/**
 * Il titolo del gruppo con dentro il corso o la classe: le pagine sotto sono
 * di quello.
 */
function titoloDelGruppo (gruppo: GruppoPagina): string {
  switch (gruppo) {
    case 'registro': {
      const corso = corsoDelContesto()
      return corso ? t.registroDi(nomeDelCorso(corso)) : t.gruppi.registro
    }
    case 'classe': {
      const classe = classeDelFascicolo()
      return classe ? t.docenteDi(nomeClasse(classe.id)) : t.gruppi.classe
    }
    default:
      return nomeDelGruppo(gruppo)
  }
}

/** Il nome corto del gruppo, una o due parole: il corso sta nel titolo lungo. */
export function nomeDelGruppo (gruppo: GruppoPagina): string {
  return t.gruppi[gruppo]
}

/** L'icona della scheda: quella del mestiere, una sola per gruppo. */
function simboloDelGruppo (gruppo: GruppoPagina): NomeIcona {
  switch (gruppo) {
    case 'agenda':
      return 'calendario'
    case 'registro':
      return 'agenda'
    case 'classe':
      return 'classi'
    case 'anno':
      return 'utente'
    case 'sistema':
      return 'impostazioni'
  }
}

/** L'ordine dei gruppi, dal più quotidiano al meno. */
const ORDINE: readonly GruppoPagina[] = [
  'agenda',
  'registro',
  'classe',
  'anno',
  'sistema',
]

/**
 * Se la sezione esiste in questo registro: «Docente di classe» solo se almeno
 * una classe ha la spunta (si rifà a ogni ridisegno). Gli altri gruppi ci sono
 * sempre; il registro anche senza corsi, con le pagine spente.
 */
function sezioneCePer (gruppo: GruppoPagina): boolean {
  return gruppo !== 'classe' || classiDiCuiSonoDocente().length > 0
}

/** Se una destinazione appartiene a una sezione disponibile nel documento. */
export function paginaVisibile (pagina: Pagina): boolean {
  return sezioneCePer(pagina.gruppo)
}

/** Destinazioni disponibili, condivise da barra e palette. */
export function pagineVisibili (): Pagina[] {
  return PAGINE.filter(paginaVisibile)
}

/** Un gruppo di destinazioni: una scheda della barra, con dentro le sue pagine. */
interface GruppoDiPagine {
  gruppo: GruppoPagina;
  /** Il nome lungo, con dentro il corso o la classe: sta in cima alla tendina. */
  titolo: string;
  /** Il nome corto, che sta scritto sulla scheda. */
  nome: string;
  simbolo: NomeIcona;
  /** Se è qui che si sta adesso: la scheda si accende. */
  attivo: boolean;
  pagine: Pagina[];
}

/** Le destinazioni raccolte per gruppo, nell'ordine in cui si mostrano. */
export function gruppiDiPagine (): GruppoDiPagine[] {
  const attiva = paginaAttiva()
  return ORDINE.filter(sezioneCePer)
    .map((gruppo): GruppoDiPagine => {
      return {
        gruppo,
        titolo: titoloDelGruppo(gruppo),
        nome: nomeDelGruppo(gruppo),
        simbolo: simboloDelGruppo(gruppo),
        attivo: attiva?.gruppo === gruppo,
        pagine: pagineVisibili().filter((pagina) => pagina.gruppo === gruppo),
      }
    })
    .filter((voce) => voce.pagine.length > 0)
}

/** Preferisce la destinazione scelta, se ancora compatibile con la vista. */
export function paginaAttiva (): Pagina | null {
  return (
    PAGINE.find((pagina) => pagina.id === stato.paginaId && pagina.attiva()) ??
    PAGINE.find((pagina) => pagina.attiva()) ??
    null
  )
}

/**
 * Come si chiama il posto in cui si sta: il titolo della destinazione attiva.
 * L'unica vista senza destinazione è la scheda di una persona.
 */
export function nomeDelPosto (): string {
  if (stato.vista === 'allievo') return t.schedaPersona
  return paginaAttiva()?.titolo ?? t.gruppi.registro
}

/**
 * Va in una pagina, o dice perché non si può: il controllo sta qui perché la
 * palette arriva da un'altra strada.
 */
export function vaiA (pagina: Pagina): void {
  if (!paginaVisibile(pagina)) return
  const perche = pagina.impedimento?.() ?? null
  if (perche) {
    notifica(perche, 'avviso')
    return
  }
  pagina.apri()
  // Cambiare pagina riporta la riga delle azioni sui comandi della pagina, anche
  // dalla scheda «Proiezione» (lo schermo resta acceso).
  aggiorna({
    schedaComandi: 'pagina',
    ...(pagina.attiva() ? { paginaId: pagina.id } : {}),
  })
}
