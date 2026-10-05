// Dove si va: le destinazioni della barra laterale e della palette, per gruppo
// (le azioni stanno in `commands.ts`). La destinazione scelta distingue le
// pagine che condividono una vista.

import type { NomeIcona } from './components/icons.js'
import { notifica } from './components/notifications.js'
import { pagineDaSmistareInTutto } from './views/sorting/toSort.js'
import {
  classeDelFascicolo,
  corsoDelContesto,
  nomeDelCorso,
  senzaCorso,
} from './context.js'
import {
  aggiorna,
  classiDiCuiSonoDocente,
  inBlocco,
  lezioneDiRiferimentoDiCorso,
  nomeClasse,
  nomeMateria,
  pendenzeDellaBarra,
  stato,
  vai,
} from './state.js'
import type { PaginaId } from './place.js'
import { testi } from './pages.testi.js'

// Nomi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
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
type GruppoPagina = 'agenda' | 'registro' | 'progettazione' | 'classe' | 'anno' | 'sistema'

export interface Pagina {
  /** Un nome stabile: lo cerca la palette, lo invoca chi va per nome, lo ricorda la memoria. */
  id: PaginaId;
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

/** Apre un'ora nel Registro del suo corso: il corso di lavoro la segue. */
export function apriLezione (lezioneId: string): void {
  vai({ pagina: 'pagina.corso.registro', soggetto: { tipo: 'lezione', id: lezioneId } })
}

/**
 * Apre una pagina del registro sul corso del contesto (nel Registro, quello
 * dell'ora aperta). Il Registro di un corso senza ore non c'è: lo si dice.
 */
function vaiAlCorso (pagina: PaginaId): void {
  const corso = corsoDelContesto()
  if (!corso) return
  if (pagina === 'pagina.corso.registro' && !lezioneDiRiferimentoDiCorso(corso.id)) {
    notifica(t.nessunaLezione, 'avviso')
    return
  }
  vai({ pagina, soggetto: { tipo: 'corso', id: corso.id } })
}

/** Se si è in questa pagina: una sola domanda, al posto. */
function qui (id: PaginaId): () => boolean {
  return () => stato.posto.pagina === id
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
    attiva: qui('pagina.oggi'),
    apri: () => { vai({ pagina: 'pagina.oggi' }) },
  },
  {
    id: 'pagina.calendario',
    titolo: t.calendario,
    simbolo: 'calendario',
    gruppo: 'agenda',
    aiuto: t.calendarioAiuto,
    attiva: qui('pagina.calendario'),
    apri: () => { vai({ pagina: 'pagina.calendario' }) },
  },
  // Il gruppo «Anno» comincia dalle classi, poi persone, mappa e corsi.
  {
    id: 'pagina.classi',
    titolo: t.classi,
    simbolo: 'classi',
    gruppo: 'anno',
    aiuto: t.classiAiuto,
    attiva: qui('pagina.classi'),
    apri: () => { vai({ pagina: 'pagina.classi' }) },
  },
  {
    // Con l'anno e non con la classe: la domanda è «chi è questa persona», e di
    // che classe sia spesso non lo si sa. L'elenco attraversa le classi.
    id: 'pagina.persone',
    titolo: t.persone,
    simbolo: 'utente',
    gruppo: 'anno',
    aiuto: t.personeAiuto,
    // La scheda di una persona non ha voce: si accende l'elenco da cui viene.
    attiva: () => stato.posto.pagina === 'pagina.persone' || stato.posto.pagina === 'pagina.allievo',
    apri: () => { vai({ pagina: 'pagina.persone' }) },
  },
  {
    // Con l'anno: la domanda è «da dove arriva la gente» (visite in azienda,
    // ritardi). Guarda tutte le classi, con una tendina sua per restringere.
    id: 'pagina.mappa',
    titolo: t.mappa,
    simbolo: 'mappa',
    gruppo: 'anno',
    aiuto: t.mappaAiuto,
    attiva: qui('pagina.mappa'),
    apri: () => { vai({ pagina: 'pagina.mappa' }) },
  },
  // Com'è fatto l'anno: ci si entra a settembre e quando cambia qualcosa.
  {
    id: 'pagina.corsi',
    titolo: t.corsi,
    simbolo: 'libro',
    gruppo: 'anno',
    aiuto: t.corsiAiuto,
    attiva: qui('pagina.corsi'),
    apri: () => { vai({ pagina: 'pagina.corsi' }) },
  },
  // La carta che entra (scansioni da dividere) e le pendenze: lavoro della giornata / agenda.
  {
    id: 'pagina.pendenze',
    titolo: t.pendenze,
    simbolo: 'spunta',
    gruppo: 'agenda',
    aiuto: t.pendenzeAiuto,
    conto: () => pendenzeDellaBarra().aperti,
    // Anche le pendenze della classe: si arriva da qui, e il percorso lo dice.
    attiva: () => stato.posto.pagina === 'pagina.pendenze' || stato.posto.pagina === 'pagina.classe.pendenze',
    apri: () => { vai({ pagina: 'pagina.pendenze' }) },
  },
  {
    // Guarda tutte le classi, e una parte di quel che mostra una classe non ce l'ha ancora.
    id: 'pagina.daSmistare',
    titolo: t.daSmistare,
    simbolo: 'vassoio',
    gruppo: 'agenda',
    aiuto: t.daSmistareAiuto,
    conto: pagineDaSmistareInTutto,
    attiva: qui('pagina.daSmistare'),
    apri: () => { vai({ pagina: 'pagina.daSmistare' }) },
  },
  // Il registro: le pagine del corso scelto in cima. Senza corso restano spente
  // e dicono che cosa manca, perché l'elenco non cambi altezza.
  {
    id: 'pagina.corso.registro',
    titolo: t.lezione,
    simbolo: 'lezione',
    gruppo: 'registro',
    aiuto: t.lezioneAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.registro'),
    apri: () => vaiAlCorso('pagina.corso.registro'),
  },
  {
    id: 'pagina.corso.valutazioni',
    titolo: t.valutazioni,
    simbolo: 'valutazioni',
    gruppo: 'registro',
    aiuto: t.valutazioniAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.valutazioni'),
    apri: () => vaiAlCorso('pagina.corso.valutazioni'),
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
    attiva: qui('pagina.corso.check'),
    apri: () => vaiAlCorso('pagina.corso.check'),
  },
  {
    id: 'pagina.corso.documenti',
    titolo: t.documenti,
    simbolo: 'documento',
    gruppo: 'registro',
    aiuto: t.documentiAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.documenti'),
    apri: () => vaiAlCorso('pagina.corso.documenti'),
  },

  // La progettazione: panoramica, piani di lezione e integrazione dei progetti nel corso.
  {
    id: 'pagina.corso.overview',
    titolo: t.overview,
    simbolo: 'colonne',
    gruppo: 'progettazione',
    aiuto: t.overviewAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.overview'),
    apri: () => vaiAlCorso('pagina.corso.overview'),
  },
  {
    id: 'pagina.corso.piani',
    titolo: t.piani,
    simbolo: 'piano',
    gruppo: 'progettazione',
    aiuto: t.pianiAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.piani'),
    apri: () => vaiAlCorso('pagina.corso.piani'),
  },
  {
    // Accanto ai piani: i progetti della biblioteca messi al lavoro nel corso.
    id: 'pagina.corso.integrazione',
    titolo: t.integrazione,
    simbolo: 'innesto',
    gruppo: 'progettazione',
    aiuto: t.integrazioneAiuto,
    impedimento: senzaCorso,
    attiva: qui('pagina.corso.integrazione'),
    apri: () => vaiAlCorso('pagina.corso.integrazione'),
  },
  {
    // Con l'anno: la biblioteca dei progetti, di nessun corso. Si integrano
    // nei corsi dalla progettazione.
    id: 'pagina.progetti',
    titolo: t.progetti,
    simbolo: 'progetto',
    gruppo: 'anno',
    aiuto: t.progettiAiuto,
    attiva: qui('pagina.progetti'),
    apri: () => { vai({ pagina: 'pagina.progetti' }) },
  },

  // Il docente di classe: le schede del fascicolo di classe.
  // Nessuna dichiara un impedimento: la sezione esiste solo dove il mestiere c'è
  // (`sezioneCePer`) e lì `completa` trova sempre la classe del fascicolo.

  {
    id: 'pagina.classe.check',
    titolo: t.checkClasse,
    simbolo: 'checkClasse',
    gruppo: 'classe',
    aiuto: t.checkClasseAiuto,
    attiva: qui('pagina.classe.check'),
    apri: () => { vai({ pagina: 'pagina.classe.check' }) },
  },
  {
    id: 'pagina.classe.documenti',
    titolo: t.archivio,
    simbolo: 'archivio',
    gruppo: 'classe',
    aiuto: t.archivioAiuto,
    attiva: qui('pagina.classe.documenti'),
    apri: () => { vai({ pagina: 'pagina.classe.documenti' }) },
  },
  {
    id: 'pagina.classe.assenze',
    titolo: t.assenze,
    simbolo: 'assenze',
    gruppo: 'classe',
    aiuto: t.assenzeAiuto,
    attiva: qui('pagina.classe.assenze'),
    apri: () => { vai({ pagina: 'pagina.classe.assenze' }) },
  },
  {
    id: 'pagina.classe.messaggistica',
    titolo: t.messaggistica,
    simbolo: 'posta',
    gruppo: 'classe',
    aiuto: t.messaggisticaAiuto,
    attiva: qui('pagina.classe.messaggistica'),
    apri: () => { vai({ pagina: 'pagina.classe.messaggistica' }) },
  },

  // Il programma: la macchina, non il registro. Non è nel menu «File», perché la
  // barra laterale è sempre in vista.
  {
    id: 'pagina.impostazioni',
    titolo: t.impostazioni,
    simbolo: 'impostazioni',
    gruppo: 'sistema',
    aiuto: t.impostazioniAiuto,
    attiva: qui('pagina.impostazioni'),
    apri: () => { vai({ pagina: 'pagina.impostazioni' }) },
  },
  {
    id: 'pagina.guida',
    titolo: t.guida,
    simbolo: 'informazione',
    gruppo: 'sistema',
    aiuto: t.guidaAiuto,
    attiva: qui('pagina.guida'),
    apri: () => { vai({ pagina: 'pagina.guida' }) },
  },
]

/**
 * Il titolo del gruppo a righe: il registro manda a capo la materia, il
 * docente di classe la classe.
 */
function righeDelGruppo (gruppo: GruppoPagina): string[] {
  if (gruppo === 'classe') {
    const classe = classeDelFascicolo()
    return classe ? [t.gruppi.classe, nomeClasse(classe.id)] : [titoloDelGruppo(gruppo)]
  }
  const corso = gruppo === 'registro' || gruppo === 'progettazione' ? corsoDelContesto() : null
  const materia = corso ? nomeMateria(corso.materiaId) : ''
  if (!corso || !materia) return [titoloDelGruppo(gruppo)]
  const classe = nomeClasse(corso.classeId)
  const prefisso = gruppo === 'registro' ? t.registroDi(classe) : t.progettazioneDi(classe)
  return classe ? [prefisso, materia] : [titoloDelGruppo(gruppo)]
}

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
    case 'progettazione': {
      const corso = corsoDelContesto()
      return corso ? t.progettazioneDi(nomeDelCorso(corso)) : t.gruppi.progettazione
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
      return 'lezione'
    case 'progettazione':
      return 'progetto'
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
  'progettazione',
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
function paginaVisibile (pagina: Pagina): boolean {
  return sezioneCePer(pagina.gruppo)
}

/** Destinazioni disponibili, condivise da barra e palette. */
export function pagineVisibili (): Pagina[] {
  return PAGINE.filter(paginaVisibile)
}

/** Un gruppo di destinazioni: una scheda della barra, con dentro le sue pagine. */
export interface GruppoDiPagine {
  gruppo: GruppoPagina;
  /** Il nome lungo, con dentro il corso o la classe: sta in cima alla tendina. */
  titolo: string;
  /**
   * Lo stesso titolo per la barra laterale, a righe: la materia va a capo sotto
   * «Registro — classe», perché in una colonna stretta si leggano tutte e due.
   */
  righe: string[];
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
        righe: righeDelGruppo(gruppo),
        nome: nomeDelGruppo(gruppo),
        simbolo: simboloDelGruppo(gruppo),
        attivo: attiva?.gruppo === gruppo,
        pagine: pagineVisibili().filter((pagina) => pagina.gruppo === gruppo),
      }
    })
    .filter((voce) => voce.pagine.length > 0)
}

/** La destinazione in cui si è: quella del posto (la scheda di una persona accende Persone). */
export function paginaAttiva (): Pagina | null {
  return PAGINE.find((pagina) => pagina.attiva()) ?? null
}

/**
 * Come si chiama il posto in cui si sta: il titolo della destinazione attiva.
 * L'unica vista senza destinazione è la scheda di una persona.
 */
export function nomeDelPosto (): string {
  if (stato.posto.pagina === 'pagina.allievo') return t.schedaPersona
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
  inBlocco(() => {
    pagina.apri()
    // Cambiare pagina riporta la riga delle azioni sui comandi della pagina, anche
    // dalla scheda «Proiezione» (lo schermo resta acceso).
    aggiorna({ schedaComandi: 'pagina' })
  })
}
