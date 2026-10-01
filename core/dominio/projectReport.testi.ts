// Le parole che i conti mettono nei due rapporti del progetto
// (`projectReport.ts`): stati, caselle, periodi. Titoli e nomi delle colonne
// stanno con quelli degli altri rapporti, in `reportData/reportData.testi.ts`; le parole
// dei modelli nei `_testi*.tpl` di `templates/`.

import { catalogo } from '#core/i18n/index.js'
import type { StatoProgetto } from './models.js'

/** A che punto è un allievo con un compito: i valori di `statoCompitoPerAllievo`. */
type StatoCompito = 'non-iniziato' | 'in-corso' | 'fatto' | 'scaduto'

const it = {
  statiProgetto: {
    bozza: 'in preparazione',
    'in-corso': 'in corso',
    concluso: 'concluso',
  } as Record<StatoProgetto, string>,
  statiCompito: {
    'non-iniziato': 'non iniziato',
    'in-corso': 'in corso',
    fatto: 'fatto',
    scaduto: 'scaduto',
  } as Record<StatoCompito, string>,
  /** Il periodo del progetto: dalla prima all'ultima delle sue lezioni. */
  periodo: (dal: string, al: string) => `dal ${dal} al ${al}`,
  /** Il periodo di un progetto che nessuna lezione ha ancora toccato. */
  nessunaLezione: 'nessuna lezione',
  /** Una fase con il suo numero: «1. Ricerca», o «Fase 1» senza titolo. */
  fase: (numero: number, titolo: string) => titolo ? `${numero}. ${titolo}` : `Fase ${numero}`,
  /** La fine di chi ha avuto più tempo: si vede accanto alla data. */
  prorogata: (fine: string) => `${fine} (proroga)`,
  /** Una casella allievo × compito: quando ha cominciato, entro quando, a che punto è. */
  casellaCompito: (inizio: string, fine: string, stato: string) =>
    `${inizio || '–'} → ${fine || '–'} · ${stato}`,
  /** Un passo della progressione: il giorno e il livello di quel giorno. */
  passo: (data: string, livello: string) => `${data} ${livello}`,
  /** Una cella con la sola nota, senza livello. */
  soloNota: 'nota',
  /** Chi riguarda un giudizio dato a tutti. */
  classe: 'classe',
  suTanti: (quanti: number, tutti: number) => `${quanti}/${tutti}`,
}

export const testi = catalogo(it, {
  de: {
    statiProgetto: {
      bozza: 'in Vorbereitung',
      'in-corso': 'laufend',
      concluso: 'abgeschlossen',
    },
    statiCompito: {
      'non-iniziato': 'nicht begonnen',
      'in-corso': 'in Arbeit',
      fatto: 'erledigt',
      scaduto: 'überfällig',
    },
    periodo: (dal, al) => `vom ${dal} bis ${al}`,
    nessunaLezione: 'keine Lektion',
    fase: (numero, titolo) => titolo ? `${numero}. ${titolo}` : `Phase ${numero}`,
    prorogata: (fine) => `${fine} (Verlängerung)`,
    casellaCompito: (inizio, fine, stato) => `${inizio || '–'} → ${fine || '–'} · ${stato}`,
    passo: (data, livello) => `${data} ${livello}`,
    soloNota: 'Notiz',
    classe: 'Klasse',
    suTanti: (quanti, tutti) => `${quanti}/${tutti}`,
  },
  fr: {
    statiProgetto: {
      bozza: 'en préparation',
      'in-corso': 'en cours',
      concluso: 'terminé',
    },
    statiCompito: {
      'non-iniziato': 'pas commencé',
      'in-corso': 'en cours',
      fatto: 'fait',
      scaduto: 'échu',
    },
    periodo: (dal, al) => `du ${dal} au ${al}`,
    nessunaLezione: 'aucune leçon',
    fase: (numero, titolo) => titolo ? `${numero}. ${titolo}` : `Phase ${numero}`,
    prorogata: (fine) => `${fine} (prolongation)`,
    casellaCompito: (inizio, fine, stato) => `${inizio || '–'} → ${fine || '–'} · ${stato}`,
    passo: (data, livello) => `${data} ${livello}`,
    soloNota: 'note',
    classe: 'classe',
    suTanti: (quanti, tutti) => `${quanti}/${tutti}`,
  },
  en: {
    statiProgetto: {
      bozza: 'in preparation',
      'in-corso': 'in progress',
      concluso: 'completed',
    },
    statiCompito: {
      'non-iniziato': 'not started',
      'in-corso': 'in progress',
      fatto: 'done',
      scaduto: 'overdue',
    },
    periodo: (dal, al) => `from ${dal} to ${al}`,
    nessunaLezione: 'no lessons',
    fase: (numero, titolo) => titolo ? `${numero}. ${titolo}` : `Phase ${numero}`,
    prorogata: (fine) => `${fine} (extension)`,
    casellaCompito: (inizio, fine, stato) => `${inizio || '–'} → ${fine || '–'} · ${stato}`,
    passo: (data, livello) => `${data} ${livello}`,
    soloNota: 'note',
    classe: 'class',
    suTanti: (quanti, tutti) => `${quanti}/${tutti}`,
  },
})
