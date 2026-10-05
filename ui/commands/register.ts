// I comandi del calendario: il periodo guardato, i modi, la modifica delle
// ore, il calendario ICS; e quelli che creano corsi, classi e consegne.

import { parole } from '#core/dominio/words.testi.js'
import { titoloComando } from '#contract/manifest.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { moduloClasse, moduloConsegna, moduloCorso, moduloLezione } from '#ui/forms.js'
import { scegliModoCalendario, scorriCalendario, vaiAOggi } from '#ui/calendarNavigation.js'
import { haCalendarioEsterno, mostraCalendarioEsterno } from '#ui/externalCalendar.js'
import { moduloCalendariIcs } from '#ui/views/settings/icsCalendar.js'
import { azione } from '#ui/bridge.js'
import { classeDelContesto, corsoDelContesto, senzaCorso } from '#ui/context.js'
import { aggiorna, corsiDellAnnoAperto, oraDaFare, stato } from '#ui/state.js'
// Le porzioni delle pagine (modi, schede, filtri) le nomina solo `tabs.ts`.
import { MODI_CALENDARIO } from '#ui/tabs.js'
import { apriLezione } from '#ui/pages.js'
// «Modifica» si spegne passando dall'editor, che si porta via l'ora scelta.
import { esci as esciDallEditor } from '#ui/views/calendar/editor.js'
import { testi } from './register.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const G = testiComuni().gruppi
const P = parole()

/**
 * Se l'interruttore «Calendario ICS» è acceso: gli altri comandi del
 * riquadro si vedono solo allora, perché lavorano sui suoi eventi.
 */
function calendarioIcsAcceso (): boolean {
  return stato.mostraCalendarioEsterno && haCalendarioEsterno()
}

/**
 * Perché «Lezione da compilare» non porta da nessuna parte, o `null`: nessuna
 * ora aspetta, o quella che aspetta è già aperta.
 */
function impedimentoOra (): string | null {
  const ora = oraDaFare()
  if (!ora) return t.nessunOraDaCompilare
  // Nella pagina dell'ora, quella che aspetta è spesso quella che si sta già
  // compilando. Solo lì: `lezioneId` resta scritto anche lasciando la pagina.
  if (stato.vista === 'lezione' && ora.lezione.id === stato.lezioneId) return t.stai
  return null
}

export const COMANDI_REGISTRO: readonly ComandoUI[] = [
  // ------------------------------------------------------------- Registro
  {
    id: 'registro.oggi',
    titolo: P.oggi,
    simbolo: 'calendario',
    // Solo nel calendario: nelle pendenze, ordinate per fretta, «oggi» non
    // avrebbe niente da fare.
    dove: ['calendario'],
    gruppo: G.adesso,
    aiuto: t.oggiAiuto,
    scorciatoia: 'Ctrl+Alt+T',
    dalMenu: true,
    primario: true,
    al: vaiAOggi,
  },
  // Le frecce del calendario: un mese nella vista a mese, una settimana nelle
  // altre. Nel gruppo «Adesso» con «Oggi»: spostano il periodo guardato.
  {
    id: 'calendario.indietro',
    titolo: P.indietro,
    simbolo: 'sinistra',
    dove: ['calendario'],
    gruppo: G.adesso,
    aiuto: () => (stato.modoCalendario === 'mese' ? t.mesePrima : t.settimanaPrima),
    al: () => scorriCalendario(-1),
  },
  {
    id: 'calendario.avanti',
    titolo: P.avanti,
    simbolo: 'destra',
    dove: ['calendario'],
    gruppo: G.adesso,
    aiuto: () => (stato.modoCalendario === 'mese' ? t.meseDopo : t.settimanaDopo),
    al: () => scorriCalendario(1),
  },

  // Le quattro modalità come interruttori: si cambiano spesso e si legge quale è accesa.
  ...MODI_CALENDARIO.map((modo): ComandoUI => ({
    id: `calendario.${modo.valore}`,
    titolo: modo.testo,
    simbolo: modo.simbolo,
    dove: ['calendario'],
    gruppo: G.comeSiGuarda,
    aiuto: modo.aiuto,
    acceso: () => stato.modoCalendario === modo.valore,
    al: () => scegliModoCalendario(modo.valore),
  })),
  // La modifica è un modo del registro, non di una pagina: nel calendario la
  // griglia prende in mano le ore (`views/calendar/editor.tsx`). Per questo sta
  // nella barra accanto a «Proietta» (`commandBar.tsx`): si vede e si spegne da ovunque.
  {
    id: 'calendario.editor',
    titolo: P.modifica,
    simbolo: 'matita',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.modificaLeOre,
    aiuto: t.modificaAiuto,
    scorciatoia: 'Ctrl+E',
    acceso: () => stato.editorCalendario,
    // Spegnerla si può sempre: l'impedimento vale solo per accenderla.
    impedimento: () =>
      stato.editorCalendario || corsiDellAnnoAperto().length > 0 ? null : t.nessunCorsoPerLezioni,
    // Spegnendo passa da `esci`, che si porta via anche l'ora scelta.
    al: () => stato.editorCalendario ? esciDallEditor() : aggiorna({ editorCalendario: true }),
  },
  // ------------------------------------------------------- Calendario ICS
  //
  // I comandi del calendario ICS in fila: l'interruttore degli eventi, i segni
  // che ne dipendono, il confronto che ne fa lezioni.

  // Gli eventi del calendario della scuola sopra le ore. Riaccenderlo rilegge il file.
  {
    id: 'calendario.esterno',
    titolo: t.calendarioIcs,
    simbolo: 'collegamento',
    dove: ['calendario'],
    gruppo: G.calendarioIcs,
    // Solo nella settimana (l'unica che disegna gli eventi ICS) e in modifica:
    // gli eventi servono a fare e correggere le lezioni.
    soloSe: () => stato.modoCalendario === 'settimana' && stato.editorCalendario,
    aiuto: t.calendarioIcsAiuto,
    acceso: calendarioIcsAcceso,
    impedimento: () => (haCalendarioEsterno() ? null : t.nessunCalendarioIcs),
    al: () => mostraCalendarioEsterno(!stato.mostraCalendarioEsterno),
  },
  // Riscarica i calendari collegati con un indirizzo, come a ogni avvio; poi
  // rilegge gli eventi. Solo con «Calendario ICS» acceso, accanto a lui.
  {
    id: 'calendario.aggiornaIcs',
    titolo: t.aggiornaIcs,
    simbolo: 'ricarica',
    dove: ['calendario'],
    gruppo: G.calendarioIcs,
    soloSe: () =>
      stato.modoCalendario === 'settimana' && stato.editorCalendario && calendarioIcsAcceso(),
    aiuto: t.aggiornaIcsAiuto,
    al: async () => {
      const risposta = await azione({ tipo: 'calendario.aggiornaTutti' })
      if (risposta.ok) mostraCalendarioEsterno(true)
    },
  },
  // Le ore che il calendario della scuola ha e il registro no, più le spostate.
  // Solo con «Calendario ICS» acceso; il primo calendario si aggiunge da
  // Impostazioni › Calendario › Calendari esterni.
  {
    id: 'registro.confrontaCalendario',
    titolo: t.confronta,
    simbolo: 'calendario',
    dove: ['calendario'],
    gruppo: G.calendarioIcs,
    soloSe: () => stato.editorCalendario && calendarioIcsAcceso(),
    aiuto: t.confrontaAiuto,
    impedimento: () => (corsiDellAnnoAperto().length > 0 ? null : t.nessunCorsoPerLezioni),
    // Prima l'elenco dei calendari; la revisione si apre da lì.
    al: () => moduloCalendariIcs(),
  },
  {
    id: 'registro.oraDaCompilare',
    titolo: () => (oraDaFare()?.manca ? t.oraDaCompilare : t.prossimaOra),
    simbolo: 'orologio',
    // Dove si lavora sulle ore; non fra le pendenze, dove saltare altrove fa
    // perdere il filo (l'ora che aspetta la dice già la barra in fondo).
    dove: ['calendario', 'lezione'],
    gruppo: G.adesso,
    aiuto: t.oraDaCompilareAiuto,
    // Senza un'ora che aspetta, o se è quella aperta, il pulsante spento in testa
    // alla riga non porterebbe da nessuna parte: non c'è. La palette dice il
    // perché con l'impedimento.
    soloSe: () => impedimentoOra() === null,
    impedimento: () => impedimentoOra(),
    al: () => {
      const ora = oraDaFare()
      if (!ora) return
      apriLezione(ora.lezione.id)
    },
  },
  {
    id: 'registro.nuovaLezione',
    titolo: () => titoloComando('registroDocenti.nuovaLezione'),
    simbolo: 'piu',
    // Nel calendario, dove un'ora ha il suo posto nella settimana; fra le
    // pendenze si crea solo quel che resta da fare.
    dove: ['calendario'],
    // Solo con «Modifica» accesa: creare un'ora è un gesto della modifica.
    gruppo: G.modificaLeOre,
    soloSe: () => stato.editorCalendario,
    aiuto: t.nuovaOraAiuto,
    scorciatoia: 'Ctrl+Alt+N',
    dalMenu: true,
    primario: true,
    al: () =>
      moduloLezione({
        corsoId: corsoDelContesto()?.id,
        data: stato.data,
        dopo: (lezioneId) => apriLezione(lezioneId),
      }),
  },
  {
    id: 'registro.nuovaConsegna',
    titolo: t.nuovaConsegna,
    simbolo: 'piu',
    dove: ['todo'],
    gruppo: G.crea,
    aiuto: t.nuovaConsegnaAiuto,
    primario: true,
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloConsegna({ corsoId: corso.id, corsoFisso: true })
    },
  },
  {
    id: 'registro.nuovoCorso',
    titolo: t.nuovoCorso,
    simbolo: 'libro',
    // Solo in Corsi: la pagina Classi tiene il solo «Nuova classe».
    dove: ['corsi'],
    gruppo: G.crea,
    aiuto: t.nuovoCorsoAiuto,
    al: () => moduloCorso({ classeId: classeDelContesto()?.id }),
  },
  {
    id: 'registro.nuovaClasse',
    titolo: () => titoloComando('registroDocenti.nuovaClasse'),
    simbolo: 'classi',
    dove: ['classi', 'corsi'],
    gruppo: G.crea,
    al: () => moduloClasse(),
  },
]
