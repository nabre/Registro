// Le porzioni di una pagina: le linguette dentro una vista (ora, calendario,
// documenti, mappa, impostazioni). I loro nomi stanno solo qui: li leggono la
// vista che le disegna e il percorso che le dice.

import { NOMI_GENERE } from '../domain/map.js'
import type { NomeIcona } from './components/icons.js'
import { GRUPPI_SEZIONI, sezioneAperta } from './views/settings/sections.js'
import {
  classeDellAllievo,
  stato,
  type ModoCalendario,
  type SchedaDocumenti,
  type FiltroTodo,
  type SchedaLezione,
  type SchedaPersona,
} from './state.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './tabs.testi.js'

// Le costanti qui sotto nascono già nella lingua giusta: la pagina sceglie la
// lingua prima di caricare il resto e si ricarica quando cambia (`src/i18n/page.ts`).
const t = testi()

/** Le tre linguette del registro dell'ora. */
export const PORZIONI_LEZIONE: ReadonlyArray<{
  valore: SchedaLezione
  testo: string
  simbolo: NomeIcona
}> = [
  { valore: 'amministrazione', testo: t.amministrazione, simbolo: 'todo' },
  { valore: 'lezione', testo: t.lezione, simbolo: 'piano' },
  { valore: 'annotazioni', testo: t.annotazioni, simbolo: 'matita' },
]

/** Le tre linguette della scheda di una persona; i nomi vengono dal lessico dove c'è. */
const PORZIONI_PERSONA: ReadonlyArray<{
  valore: SchedaPersona
  testo: string
  simbolo: NomeIcona
}> = [
  { valore: 'anagrafica', testo: t.anagrafica, simbolo: 'utente' },
  { valore: 'docenteClasse', testo: t.docenteClasse, simbolo: 'classi' },
  { valore: 'materie', testo: t.materie, simbolo: 'libro' },
]

/**
 * Le linguette che valgono per una persona: quella del docente di classe solo
 * sulle classi in cui lo si è, per non avere una linguetta che porta a «non è
 * roba tua».
 */
export function porzioniPersona (docenteDiClasse: boolean) {
  return PORZIONI_PERSONA.filter((p) => p.valore !== 'docenteClasse' || docenteDiClasse)
}

/**
 * La linguetta aperta davvero: quella scelta, se per questa persona esiste.
 * Passando a una classe di cui non si è docente, la scelta di prima non vale.
 */
export function porzionePersona (docenteDiClasse: boolean): SchedaPersona {
  const valide = porzioniPersona(docenteDiClasse)
  return valide.some((p) => p.valore === stato.schedaPersona) ? stato.schedaPersona : 'anagrafica'
}

/** I modi in cui il calendario mostra le stesse ore. */
export const MODI_CALENDARIO: ReadonlyArray<{
  valore: ModoCalendario
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'settimana',
    testo: parole().settimana,
    simbolo: 'settimana',
    aiuto: t.settimanaAiuto,
  },
  {
    valore: 'mese',
    testo: parole().mese,
    simbolo: 'mese',
    aiuto: t.meseAiuto,
  },
  {
    valore: 'anno',
    testo: t.anno,
    simbolo: 'calendario',
    aiuto: t.annoAiuto,
  },
  {
    valore: 'agenda',
    testo: t.agenda,
    simbolo: 'agenda',
    aiuto: t.agendaAiuto,
  },
]

/** Le tre schede della pagina Documenti: di che cosa si stanno guardando i fogli. */
export const SCHEDE_DOCUMENTI: ReadonlyArray<{
  valore: SchedaDocumenti
  nome: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'corso',
    nome: t.corso,
    simbolo: 'libro',
    aiuto: t.corsoAiuto,
  },
  {
    valore: 'lezioni',
    nome: t.lezioni,
    simbolo: 'presa',
    aiuto: t.lezioniAiuto,
  },
  {
    valore: 'allievi',
    nome: t.allievi,
    simbolo: 'classi',
    aiuto: t.allieviAiuto,
  },
]

/**
 * I tre modi di guardare le pendenze. Il filtro vale solo per le consegne, le
 * sole di cui si sa a chi tocca il gesto; prove ferme, recuperi e richieste di
 * firma restano sempre in vista.
 */
export const FILTRI_TODO: ReadonlyArray<{
  valore: FiltroTodo
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'tutte',
    testo: parole().tutte,
    simbolo: 'spunta',
    aiuto: t.tutteAiuto,
  },
  {
    valore: 'mie',
    testo: t.mie,
    simbolo: 'utente',
    aiuto: t.mieAiuto,
  },
  {
    valore: 'classi',
    testo: t.delleClassi,
    simbolo: 'classi',
    aiuto: t.delleClassiAiuto,
  },
]

/**
 * I due modi di guardare le pendenze di una classe: i filtri della pagina
 * delle pendenze senza «delle classi», che qui sarebbe la classe stessa.
 */
export const FILTRI_TODO_CLASSE: ReadonlyArray<{
  valore: 'tutte' | 'mie'
  testo: string
  simbolo: NomeIcona
  aiuto: string
}> = [
  {
    valore: 'tutte',
    testo: t.tutteLeConsegne,
    simbolo: 'spunta',
    aiuto: t.tutteLeConsegneAiuto,
  },
  {
    valore: 'mie',
    testo: t.consegnePersonali,
    simbolo: 'utente',
    aiuto: t.consegnePersonaliAiuto,
  },
]

/** Una porzione detta a chi la deve mostrare: come si chiama e con che segno. */
export interface Porzione {
  testo: string
  simbolo: NomeIcona
}

/**
 * Quali linguette ha la pagina che si ha davanti, gemella di `porzioneAttiva()`.
 * La legge la veduta dell'assistente («dove posso andare»). Elenco vuoto per le
 * pagine di una schermata sola.
 */
export function porzioniDellaVista (): Porzione[] {
  const dette = (voci: ReadonlyArray<{ testo?: string, nome?: string, simbolo: NomeIcona }>) =>
    voci.map((voce) => ({ testo: voce.testo ?? voce.nome ?? '', simbolo: voce.simbolo }))

  switch (stato.vista) {
    case 'lezione':
      return dette(PORZIONI_LEZIONE)
    case 'allievo':
    case 'persone': {
      const classe = classeDellAllievo(stato.allievoId, stato.classeId)
      return dette(porzioniPersona(Boolean(classe?.docenteDiClasse)))
    }
    case 'calendario':
      return dette(MODI_CALENDARIO)
    case 'documenti':
      return dette(SCHEDE_DOCUMENTI)
    case 'mappa':
      return [
        { testo: parole().tutti, simbolo: 'mappa' },
        { testo: NOMI_GENERE.lavoro, simbolo: 'azienda' },
        { testo: NOMI_GENERE.domicilio, simbolo: 'casa' },
      ]
    case 'impostazioni':
      return GRUPPI_SEZIONI.map((gruppo) => ({ testo: gruppo.titolo, simbolo: gruppo.simbolo }))
    default:
      return []
  }
}

/** La porzione aperta della pagina, o `null` se è una schermata sola. */
export function porzioneAttiva (): Porzione | null {
  switch (stato.vista) {
    case 'lezione': {
      const linguetta = PORZIONI_LEZIONE.find((p) => p.valore === stato.schedaLezione)
      return linguetta ? { testo: linguetta.testo, simbolo: linguetta.simbolo } : null
    }
    // La scheda della sola persona e l'elenco con la scheda accanto: stessa linguetta.
    case 'allievo':
    case 'persone': {
      const classe = classeDellAllievo(stato.allievoId, stato.classeId)
      const quale = porzionePersona(Boolean(classe?.docenteDiClasse))
      const linguetta = PORZIONI_PERSONA.find((p) => p.valore === quale)
      return linguetta ? { testo: linguetta.testo, simbolo: linguetta.simbolo } : null
    }
    case 'calendario': {
      const modo = MODI_CALENDARIO.find((m) => m.valore === stato.modoCalendario)
      return modo ? { testo: modo.testo, simbolo: modo.simbolo } : null
    }
    case 'documenti': {
      const scheda = SCHEDE_DOCUMENTI.find((s) => s.valore === stato.schedaDocumenti)
      return scheda ? { testo: scheda.nome, simbolo: scheda.simbolo } : null
    }
    case 'mappa':
      return stato.schedaMappa === 'tutti'
        ? { testo: parole().tutti, simbolo: 'mappa' }
        : {
            testo: NOMI_GENERE[stato.schedaMappa],
            simbolo: stato.schedaMappa === 'lavoro' ? 'azienda' : 'casa',
          }
    // Delle impostazioni la linguetta è il gruppo; la sezione dentro il gruppo è
    // l'anello dopo e la dà `sezioneAperta()`.
    case 'impostazioni': {
      const { gruppo } = sezioneAperta(
        stato.ambitoImpostazioni,
        stato.schedaDocumento,
        stato.schedaProgramma,
      )
      return { testo: gruppo.titolo, simbolo: gruppo.simbolo }
    }
    default:
      return null
  }
}
