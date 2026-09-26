// Le azioni del pannello: quel che si fa al registro (dove si va sta in
// `pages.ts`). Ogni comando dichiara `dove` vive:
//
//   `['app']`            — il registro intero, da qualunque pagina: palette, e
//                          menu «File» per quelli senza `fuoriMenu`.
//   `['calendario', …]`  — la riga delle azioni della pagina aperta, e solo lei.
//   `['schermo']`        — i comandi della proiezione, nella scheda «Proiezione»
//                          che compare a schermo acceso.
//
// Un comando non nomina una pagina che ha già il pulsante suo nel corpo
// (Documenti, Impostazioni): due pulsanti uguali visibili insieme confondono.
// Un comando che adesso non si può fare resta spento e dice perché
// (`impedimento()`). Il contesto viene da `context.ts`, non da chi clicca.

import { MODI_PDF } from '../domain/automation.js'
import { checkDelCorso } from '../domain/check.js'
import { lessico } from '../domain/lexicon.testi.js'
import { parole } from '../domain/words.testi.js'
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
} from '../domain/projection.js'
import type { Lezione, StatoLezione } from '../domain/models.js'
import { riparazioni } from '../domain/repairs.js'
import { testi } from './commands.testi.js'
import type { NomeIcona } from './components/icons.js'
import { conferma } from './components/modal.js'
import { notifica } from './components/notifications.js'
import {
  moduloAllievo,
  moduloNuovaPersona,
  chiediEliminazione,
  moduloAnno,
  moduloComposizione,
  moduloBloccoAssenze,
  moduloClasse,
  moduloColonnaCheck,
  moduloColonneCheck,
  moduloComunicazione,
  moduloConsegna,
  moduloCorso,
  moduloImportaAllievi,
  moduloImportaRegistro,
  moduloLezione,
  moduloPause,
  moduloRecapito,
} from './forms.js'
import {
  scegliModoCalendario,
  scorriCalendario,
  vaiAOggi,
} from './calendarNavigation.js'
import { haCalendarioEsterno, mostraCalendarioEsterno } from './externalCalendar.js'
import { moduloCalendariIcs } from './views/settings/icsCalendar.js'
import { chiediImportaClasse } from './views/classes.js'
import { azione } from './bridge.js'
import {
  classeDelContesto,
  classeDelFascicolo,
  corsoDelContesto,
  lezioneDelContesto,
  senzaAnno,
  senzaClasse,
  senzaCorso,
  senzaLezione,
  senzaPosta,
} from './context.js'
import {
  aggiorna,
  annoCorrente,
  corsiDellAnnoAperto,
  corsiDi,
  nomeSemestreScelto,
  oraDaFare,
  sceltiPresenti,
  stato,
  type SchedaDocente,
  type Vista,
} from './state.js'
// L'ordine dei fogli spuntati è quello a schermo, non quello dei clic.
import { sceltiInOrdine } from './views/documents/sheets.js'
import { caricaPdf, pdfInAttesa, rileggiScansioni } from './views/sorting.js'
// La mappa tiene la sua inquadratura in una variabile di modulo (vedi `views/map.ts`).
import { indirizziInAttesa, inquadraTutto } from './views/map.js'
// Le porzioni delle pagine (modi, schede, filtri) le nomina solo `tabs.ts`.
import { FILTRI_TODO, FILTRI_TODO_CLASSE, MODI_CALENDARIO, SCHEDE_DOCUMENTI } from './tabs.js'
// Il piano su cui lavorare lo sa la pagina: `stato.pianoId` è nullo finché non
// se ne sceglie uno, ma un piano a schermo c'è lo stesso.
import { pianoMostrato, primaOraDelPiano, scordaEditorDelPiano } from './views/plans.js'
// L'editor del calendario scrive a tasti fermi: vedi `eseguiComando`.
import { esci as esciDallEditor, scriviInAttesa, spostamentoInAttesa } from './views/calendar/editor.js'

// -------------------------------------------------------------- un comando

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`src/i18n/page.ts`).
const t = testi()
const G = t.gruppi
const P = parole()

/** Un testo che può dipendere da com'è messo il registro adesso. */
type Testo = string | (() => string)

/**
 * I posti in cui un comando può vivere: `'app'` il menu del programma,
 * `'schermo'` la scheda «Proiezione», ogni altro nome la riga di quella vista.
 */
export type Posto = 'app' | 'schermo' | Vista

type Ambito = readonly Posto[]

export interface ComandoUI {
  /** Un nome stabile: lo usano le scorciatoie e chi invoca per nome. */
  id: string
  titolo: Testo
  simbolo: NomeIcona
  /**
   /**
    * Dove vive il comando. Una pagina mostra i comandi che la nominano e nessun
    * altro.
    */
  dove: Ambito
  /** Sottopagina del fascicolo in cui proporre il comando. */
  schedaDocente?: SchedaDocente
  /** Il riquadro dentro la riga: i comandi che si fanno per lo stesso motivo. */
  gruppo: string
  /** La riga che si legge fermandosi sopra: dice che cosa succede davvero. */
  aiuto?: Testo
  /** Nella grafia che si legge sul tasto: `Ctrl+S`. La ascolta `installaScorciatoie` (`shortcuts.ts`). */
  scorciatoia?: string
  /**
   * La scorciatoia la ascolta il menu dell'applicazione: qui si scrive soltanto.
   * Electron consuma gli acceleratori prima della pagina, e ascoltarli anche qui
   * farebbe partire il comando due volte.
   */
  dalMenu?: boolean
  /**
   * Vive nel programma (`'app'`) ma non nel menu «File», che tiene solo il minimo
   * per file e programma; la palette e la scorciatoia lo trovano comunque.
   */
  fuoriMenu?: boolean | (() => boolean)
  /**
   * Il comando che in quella scheda si preme più spesso: si vede di più. Può
   * dipendere dal registro (senza anni, «Nuovo anno» è l'unica cosa da fare).
   */
  primario?: boolean | (() => boolean)
  /**
   * Se quel che il comando accende è acceso adesso: i comandi della proiezione
   * mostrano lo stato dello schermo sul pulsante.
   */
  acceso?: () => boolean
  /** Perché adesso non si può, o `null` se si può. */
  impedimento?: () => string | null
  /**
   * Se il comando ha senso adesso nella sua pagina; se no non compare. A
   * differenza di `impedimento` lo toglie: per i comandi di un solo modo di
   * guardare (gli eventi ICS esistono solo nella settimana).
   */
  soloSe?: () => boolean
  al: () => void | Promise<unknown>
}

function testoDi (testo: Testo): string {
  return typeof testo === 'function' ? testo() : testo
}

export function titoloDi (comando: ComandoUI): string {
  return testoDi(comando.titolo)
}

export function aiutoDi (comando: ComandoUI): string | null {
  return comando.aiuto ? testoDi(comando.aiuto) : null
}

/**
 * Perché il comando non si può fare *da qui*, o `null`. Lo stato ricorda
 * l'ultima ora aperta anche dopo averla lasciata, e la palette elenca tutti i
 * comandi: si può solo se il comando vive nel programma, nello schermo o nella
 * pagina aperta, come nella barra.
 */
function fuoriPosto (comando: ComandoUI): string | null {
  if (comando.dove.includes('app') || comando.dove.includes('schermo')) return null
  if (vive(comando, stato.vista)) return null
  // La pagina è la sua, ma non quel che mostra (altra scheda, altro modo).
  return comando.dove.includes(stato.vista) ? t.nonConQuelCheMostra : t.dallaSuaPagina
}

export function impedimentoDi (comando: ComandoUI): string | null {
  return fuoriPosto(comando) ?? comando.impedimento?.() ?? null
}

export function primarioDi (comando: ComandoUI): boolean {
  return typeof comando.primario === 'function' ? comando.primario() : comando.primario === true
}

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

/**
 * Nome e spiegazione dei tre stati di un'ora. Un `Record` perché uno stato
 * nuovo nel dominio non compili senza pulsante; l'ordine sta a parte.
 */
const STATI_ORA: Record<StatoLezione, { testo: string, simbolo: NomeIcona, aiuto: string }> = {
  pianificata: {
    testo: lessico().statiLezione.pianificata,
    simbolo: 'calendario',
    aiuto: t.statiOra.pianificata,
  },
  svolta: {
    testo: lessico().statiLezione.svolta,
    simbolo: 'spunta',
    aiuto: t.statiOra.svolta,
  },
  annullata: {
    testo: lessico().statiLezione.annullata,
    simbolo: 'chiudi',
    aiuto: t.statiOra.annullata,
  },
}

/** Nell'ordine in cui un'ora li attraversa: prima, fatta, saltata. */
const ORDINE_STATI: readonly StatoLezione[] = ['pianificata', 'svolta', 'annullata']

/** Segna l'ora svolta, annullata o di nuovo pianificata. */
async function segnaLezione (lezione: Lezione, nuovo: Lezione['stato']): Promise<void> {
  const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
  if (!risposta.ok) return
  notifica(t.segnata[nuovo], nuovo === 'annullata' ? 'avviso' : 'successo')
}

/** Com'è messa l'ora aperta, o `null` se non ce n'è una. */
function statoLezione (): Lezione['stato'] | null {
  return lezioneDelContesto()?.stato ?? null
}

/**
 * Se l'interruttore «Calendario ICS» è acceso: gli altri due comandi del
 * riquadro si vedono solo allora, perché lavorano sui suoi eventi.
 */
function calendarioIcsAcceso (): boolean {
  return stato.mostraCalendarioEsterno && haCalendarioEsterno()
}

// ---------------------------------------------------------------- i comandi

/**
 * Tutti i comandi, nell'ordine della barra. Dentro un gruppo il primo è il più
 * usato; l'ordine dei gruppi è quello della loro prima comparsa qui.
 */
export const COMANDI_UI: readonly ComandoUI[] = [
  // ----------------------------------------------------------------- File
  // «Nuovo», poi «Apri», come in ogni menu «File». Un anno nuovo nasce in un
  // file suo, quindi sta con i gesti del documento.
  {
    id: 'file.nuovoAnno',
    titolo: t.nuovoAnno,
    simbolo: 'calendario',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.nuovoAnnoAiuto,
    primario: () => annoCorrente() === null,
    al: () => moduloAnno(),
  },
  {
    id: 'file.apri',
    titolo: t.apri,
    simbolo: 'cartella',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.apriAiuto,
    scorciatoia: 'Ctrl+O',
    dalMenu: true,
    primario: true,
    al: () => azione({ tipo: 'documento.apri' }),
  },
  {
    // Dopo «Apri»: l'altro modo di servirsi di un anno non aperto, portandone
    // qui quel che vale. Apre una finestra del pannello, quindi non è nel menu
    // nativo (`src/manifest.ts`).
    id: 'file.importaRegistro',
    titolo: t.importaRegistro,
    simbolo: 'duplica',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.importaRegistroAiuto,
    impedimento: senzaAnno,
    al: () => moduloImportaRegistro(),
  },
  {
    id: 'file.salva',
    // Un anno mai salvato non ha un posto: il suo «Salva» è «salva con nome».
    // Vedi `stato.salva` in `actions/documents.ts`.
    titolo: () => (stato.documenti.provvisorio ? t.salvaConNome : P.salva),
    simbolo: 'spunta',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: () => (stato.documenti.provvisorio ? t.salvaConNomeAiuto : t.salvaAiuto),
    // Nel menu solo per l'anno mai salvato: il resto si salva da sé. Ctrl+S resta.
    fuoriMenu: () => stato.documenti.provvisorio !== true,
    primario: () => stato.documenti.provvisorio === true,
    scorciatoia: 'Ctrl+S',
    al: () => azione({ tipo: 'stato.salva' }),
  },
  {
    id: 'file.ricarica',
    titolo: t.ricarica,
    simbolo: 'ricarica',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.documento,
    aiuto: t.ricaricaAiuto,
    al: () => azione({ tipo: 'stato.ricarica' }),
  },
  {
    id: 'file.chiudi',
    titolo: t.chiudi,
    simbolo: 'chiudi',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.chiudiAiuto,
    impedimento: () => (stato.documenti.corrente ? null : t.nessunDocumento),
    al: () => azione({ tipo: 'documento.chiudi' }),
  },
  {
    id: 'file.cartella',
    titolo: t.cartella,
    simbolo: 'cartella',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.cartellaAiuto,
    al: () => azione({ tipo: 'sistema.apriCartella' }),
  },
  {
    id: 'file.modificaAnno',
    titolo: t.modificaAnno,
    simbolo: 'matita',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.anno,
    aiuto: t.modificaAnnoAiuto,
    impedimento: senzaAnno,
    al: () => {
      const anno = annoCorrente()
      if (anno) moduloAnno(anno)
    },
  },
  {
    id: 'file.pause',
    titolo: t.pause,
    simbolo: 'pausa',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.anno,
    impedimento: senzaAnno,
    al: () => {
      const anno = annoCorrente()
      if (anno) moduloPause(anno)
    },
  },
  // ------------------------------------------------------------- Modifica
  //
  // Annulla e ripristina i gesti sul registro. Non passano dal ciclo generale di
  // `installaScorciatoie`: dentro un campo di testo Ctrl+Z è di Chromium. Vedi
  // `tastoDellaStoria` in `shortcuts.ts`.
  {
    id: 'modifica.annulla',
    titolo: t.annulla,
    simbolo: 'annulla',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.modifica,
    aiuto: () => stato.storia.annulla > 0
      ? t.annullaAiutoPassi(stato.storia.annulla)
      : t.annullaAiuto,
    scorciatoia: 'Ctrl+Z',
    impedimento: () => stato.storia.annulla > 0 ? null : t.nienteDaAnnullare,
    al: () => azione({ tipo: 'storia.annulla' }),
  },
  {
    id: 'modifica.ripristina',
    titolo: t.ripristina,
    simbolo: 'ripristina',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.modifica,
    aiuto: () => stato.storia.ripristina > 0
      ? t.ripristinaAiutoPassi(stato.storia.ripristina)
      : t.ripristinaAiuto,
    scorciatoia: 'Ctrl+Y',
    impedimento: () => stato.storia.ripristina > 0 ? null : t.nienteDaRipristinare,
    al: () => azione({ tipo: 'storia.ripristina' }),
  },
  // ------------------------------------------------------------- La finestra
  //
  // I comandi della barra dei menu di sistema, nascosta su Windows e Linux
  // (ricompare con Alt). Zoom e schermo intero sono `fuoriMenu`: si trovano con le
  // scorciatoie, nella palette e nel menu nativo. `dalMenu` perché le scorciatoie
  // le ascolta il menu dell'applicazione, anche nascosto: ascoltarle anche qui
  // darebbe due scalini di zoom per ogni Ctrl+più.
  {
    id: 'finestra.ingrandisci',
    titolo: t.ingrandisci,
    simbolo: 'piu',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    aiuto: t.ingrandisciAiuto,
    scorciatoia: 'Ctrl+Plus',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'avanti' }),
  },
  {
    id: 'finestra.riduci',
    titolo: t.riduci,
    simbolo: 'meno',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    aiuto: t.riduciAiuto,
    scorciatoia: 'Ctrl+-',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'indietro' }),
  },
  {
    id: 'finestra.dimensioneNormale',
    titolo: t.dimensioneNormale,
    simbolo: 'ricarica',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    aiuto: t.dimensioneNormaleAiuto,
    scorciatoia: 'Ctrl+0',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'azzera' }),
  },
  {
    id: 'finestra.schermoIntero',
    titolo: t.schermoIntero,
    simbolo: 'schermo',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    // Detto per esteso: nel registro «schermo» è anche quello della classe.
    aiuto: t.schermoInteroAiuto,
    scorciatoia: 'F11',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.schermoIntero' }),
  },
  {
    id: 'finestra.esci',
    titolo: t.esci,
    // L'accensione e non la ✕: la ✕ della finestra lascia il registro acceso
    // nell'area di notifica, questa lo spegne del tutto.
    simbolo: 'spegni',
    dove: ['app'],
    gruppo: G.finestra,
    aiuto: t.esciAiuto,
    al: () => azione({ tipo: 'programma.esci' }),
  },

  // ---------------------------------------------------------- Manutenzione
  //
  // Impostazioni non ha comandi qui: non mostra la riga delle azioni, i gesti
  // stanno nelle sezioni (`views/settings.ts`).
  {
    id: 'file.ripara',
    titolo: t.ripara,
    simbolo: 'spunta',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.manutenzione,
    aiuto: t.riparaAiuto,
    impedimento: () => (riparazioni(stato.registro).length > 0 ? null : t.nienteDaRiparare),
    al: () => azione({ tipo: 'manutenzione.ripara' }),
  },

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
  // La modifica è un modo del registro, non di una pagina. Nel calendario la
  // griglia prende in mano le ore (`views/calendar/editor.ts`); nella pagina di
  // un'ora sblocca giorno, orario e aula. Per questo sta nella barra accanto a
  // «Proietta» (`commandBar.ts`): si vede e si spegne da ovunque.
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
  // Le ore che il calendario della scuola ha e il registro no, più le spostate.
  // Solo con «Calendario ICS» acceso; il primo calendario si aggiunge da
  // Impostazioni › Anno e orario › Calendari ICS.
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
    impedimento: () => {
      const ora = oraDaFare()
      if (!ora) return t.nessunOraDaCompilare
      // Nella pagina dell'ora, quella che aspetta è spesso quella che si sta già
      // compilando. Solo lì: `lezioneId` resta scritto anche lasciando la pagina.
      if (stato.vista === 'lezione' && ora.lezione.id === stato.lezioneId) {
        return t.stai
      }
      return null
    },
    al: () => {
      const ora = oraDaFare()
      if (!ora) return
      aggiorna({ vista: 'lezione', lezioneId: ora.lezione.id })
    },
  },
  // I tre filtri delle pendenze come interruttori: si cambiano scorrendo la pagina.
  ...FILTRI_TODO.map((filtro): ComandoUI => ({
    id: `todo.${filtro.valore}`,
    titolo: filtro.testo,
    simbolo: filtro.simbolo,
    dove: ['todo'],
    gruppo: G.cheCosaSiGuarda,
    aiuto: filtro.aiuto,
    acceso: () => stato.filtroTodo === filtro.valore,
    al: () => aggiorna({ filtroTodo: filtro.valore }),
  })),

  {
    id: 'registro.nuovaLezione',
    titolo: t.nuovaOra,
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
        dopo: (lezioneId) => aggiorna({ vista: 'lezione', lezioneId }),
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
    impedimento: () => (corsiDellAnnoAperto().length > 0 ? null : t.nessunCorsoPerConsegna),
    al: () => {
      const corso = corsoDelContesto() ?? corsiDellAnnoAperto()[0]
      if (corso) moduloConsegna({ corsoId: corso.id })
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
    titolo: t.nuovaClasse,
    simbolo: 'classi',
    dove: ['classi', 'corsi'],
    gruppo: G.crea,
    al: () => moduloClasse(),
  },
  // -------------------------------------------------------------- L'ora aperta
  //
  // I tre stati dell'ora, un pulsante ciascuno con acceso quello in vigore: lo
  // stato si legge guardandoli, e si preme dove si vuole andare.
  ...ORDINE_STATI.map((valore): ComandoUI => ({
    id: `lezione.stato.${valore}`,
    titolo: STATI_ORA[valore].testo,
    simbolo: STATI_ORA[valore].simbolo,
    dove: ['lezione'],
    gruppo: G.statoDellOra,
    aiuto: STATI_ORA[valore].aiuto,
    // «Svolta» chiude l'ora: finché non è fatto si vede più degli altri.
    primario: () => valore === 'svolta' && statoLezione() !== null && statoLezione() !== 'svolta',
    acceso: () => statoLezione() === valore,
    impedimento: senzaLezione,
    al: async () => {
      const lezione = lezioneDelContesto()
      // Premere lo stato in cui l'ora è già non fa niente.
      if (!lezione || lezione.stato === valore) return
      if (valore === 'annullata') {
        const sicuro = await conferma({
          titolo: t.annullareTitolo,
          testo: t.annullareTesto,
          testoConferma: t.annullareConferma,
        })
        if (!sicuro) return
      }
      await segnaLezione(lezione, valore)
    },
  })),
  {
    id: 'lezione.modifica',
    titolo: t.modificaOra,
    simbolo: 'matita',
    dove: ['lezione'],
    gruppo: G.ora,
    aiuto: t.modificaOraAiuto,
    // Solo con «Modifica» accesa, come nel calendario: fuori l'ora si legge.
    impedimento: () => senzaLezione() ?? (stato.editorCalendario ? null : t.accendiModifica),
    al: () => {
      const lezione = lezioneDelContesto()
      if (lezione) moduloLezione({ lezione })
    },
  },
  // ------------------------------------------------------- il piano aperto
  //
  // I gesti che si fanno a un piano. Lavorano su quello che la pagina mostra:
  // lo scelto, o il primo dell'elenco.
  {
    id: 'piano.vaiAlRegistro',
    titolo: t.vaiAlRegistro,
    simbolo: 'agenda',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.vaiAlRegistroAiuto,
    primario: true,
    impedimento: () => {
      const piano = pianoMostrato()
      if (!piano) return t.nessunPianoAperto
      return primaOraDelPiano(piano) ? null : t.pianoSenzaOra
    },
    al: () => {
      const piano = pianoMostrato()
      const lezione = piano ? primaOraDelPiano(piano) : null
      if (lezione) aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data })
    },
  },
  {
    id: 'piano.duplica',
    titolo: P.duplica,
    simbolo: 'duplica',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.duplicaAiuto,
    impedimento: () => (pianoMostrato() ? null : t.nessunPianoAperto),
    al: async () => {
      const piano = pianoMostrato()
      if (!piano) return
      const risposta = await azione({ tipo: 'piano.duplica', pianoId: piano.id })
      if (risposta.ok && risposta.creato) aggiorna({ pianoId: risposta.creato.id })
    },
  },
  {
    id: 'piano.elimina',
    titolo: P.elimina,
    simbolo: 'cestino',
    dove: ['piani'],
    gruppo: G.piano,
    aiuto: t.eliminaAiuto,
    impedimento: () => (pianoMostrato() ? null : t.nessunPianoAperto),
    al: async () => {
      const piano = pianoMostrato()
      if (!piano) return
      if (!(await chiediEliminazione({ genere: 'piano', id: piano.id }))) return
      const risposta = await azione({ tipo: 'piano.elimina', pianoId: piano.id })
      if (!risposta.ok) return
      // L'editor tenuto da parte modificava un piano che non c'è più.
      scordaEditorDelPiano()
      aggiorna({ pianoId: null })
    },
  },
  {
    id: 'corso.nuovaOra',
    titolo: t.oraInQuestoCorso,
    simbolo: 'piu',
    // Non nel registro della lezione, dove si scrive l'ora davanti: si crea dai
    // piani, dalle valutazioni e dal calendario.
    dove: ['piani', 'valutazioni'],
    gruppo: G.ora,
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (!corso) return
      moduloLezione({
        corsoId: corso.id,
        classeId: corso.classeId,
        data: stato.data,
        dopo: (lezioneId) => aggiorna({ vista: 'lezione', lezioneId }),
      })
    },
  },
  // ---------------------------------------------------------------- Check
  //
  // Le colonne si toccano una alla volta dal menu della loro testata, o tutte
  // insieme da qui. Aggiungerne una sta qui: una colonna che non c'è non ha testata.
  {
    id: 'check.nuovaColonna',
    titolo: t.aggiungiColonna,
    simbolo: 'piu',
    dove: ['check'],
    gruppo: G.check,
    aiuto: t.aggiungiColonnaAiuto,
    primario: true,
    impedimento: senzaCorso,
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloColonnaCheck({ corsoId: corso.id })
    },
  },
  {
    id: 'check.colonne',
    titolo: t.colonne,
    simbolo: 'presa',
    dove: ['check'],
    gruppo: G.check,
    aiuto: t.colonneAiuto,
    impedimento: () => {
      const corso = corsoDelContesto()
      if (!corso) return senzaCorso()
      return checkDelCorso(stato.registro, corso.id)?.colonne.length ? null : t.senzaColonne
    },
    al: () => {
      const corso = corsoDelContesto()
      if (corso) moduloColonneCheck(corso.id)
    },
  },
  // Verbale ed esportazioni del corso stanno nella pagina Documenti.

  // ---------------------------------------------------------------- Mappa
  {
    id: 'mappa.geocodifica',
    titolo: t.trovaIndirizzi,
    simbolo: 'segnaposto',
    dove: ['mappa'],
    gruppo: G.indirizzi,
    aiuto: t.trovaIndirizziAiuto,
    primario: () => indirizziInAttesa() > 0,
    impedimento: () => (indirizziInAttesa() > 0 ? null : t.tuttiTrovati),
    // Tutte le classi dell'anno: la mappa non ha un filtro per classe.
    al: () => azione({ tipo: 'mappa.geocodifica' }),
  },
  {
    id: 'mappa.rifai',
    titolo: t.rifaiIndirizzi,
    simbolo: 'ricarica',
    dove: ['mappa'],
    gruppo: G.indirizzi,
    aiuto: t.rifaiIndirizziAiuto,
    al: async () => {
      const sicuro = await conferma({
        titolo: t.rifareTitolo,
        testo: t.rifareTesto,
        testoConferma: t.rifai,
      })
      if (!sicuro) return
      await azione({ tipo: 'mappa.geocodifica', rifaiTutto: true })
    },
  },
  {
    id: 'mappa.inquadra',
    titolo: t.inquadra,
    simbolo: 'mappa',
    dove: ['mappa'],
    gruppo: G.comeSiGuarda,
    aiuto: t.inquadraAiuto,
    al: () => inquadraTutto(),
  },
  // --------------------------------------------------------------- Classe
  // L'elenco delle persone attraversa le classi: il comando chiede in quale, se
  // non la sa già (la persona scelta, o una classe sola nell'anno).
  {
    id: 'persone.nuova',
    titolo: t.nuovaPersona,
    simbolo: 'utente',
    dove: ['persone'],
    gruppo: G.elenco,
    aiuto: t.nuovaPersonaAiuto,
    primario: true,
    al: () => moduloNuovaPersona(classeDelContesto()),
  },
  {
    id: 'classe.nuovoAllievo',
    titolo: t.aggiungiAlGruppo,
    simbolo: 'utente',
    // Anche in Classi, nella riga delle azioni come in ogni pagina.
    dove: ['classi', 'allievo'],
    gruppo: G.elenco,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloAllievo(classe)
    },
  },
  {
    id: 'classe.incollaElenco',
    titolo: t.incollaElenco,
    simbolo: 'piano',
    dove: ['classi', 'allievo'],
    gruppo: G.elenco,
    aiuto: t.incollaElencoAiuto,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloImportaAllievi(classe)
    },
  },
  {
    // Con un anno per documento la classe dell'anno scorso sta in un altro file e
    // si porta da lì: non serve una classe scelta.
    id: 'classe.importa',
    titolo: t.importaClasse,
    simbolo: 'cartella',
    dove: ['classi'],
    gruppo: G.elenco,
    aiuto: t.importaClasseAiuto,
    impedimento: () =>
      stato.documenti.elenco.some((d) => !d.aperto && !d.mancante) ? null : t.nessunAltroAnno,
    al: () => chiediImportaClasse(),
  },
  {
    id: 'classe.comunicazione',
    titolo: t.nuovaComunicazione,
    simbolo: 'posta',
    // Non nel pannello del docente di classe (Comunicazioni ha il suo pulsante)
    // né in Classi, che tiene il solo «Nuova classe».
    dove: ['allievo'],
    gruppo: G.famiglie,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'classe.assenze',
    titolo: t.nuovoPeriodoAssenze,
    simbolo: 'orologio',
    dove: ['allievo'],
    gruppo: G.famiglie,
    aiuto: t.nuovoPeriodoAssenzeAiuto,
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloBloccoAssenze(classe)
    },
  },

  // I due modi di guardare le pendenze della classe, come interruttori nella
  // riga delle azioni.
  ...FILTRI_TODO_CLASSE.map((filtro): ComandoUI => ({
    id: `docente.pendenze.${filtro.valore}`,
    titolo: filtro.testo,
    simbolo: filtro.simbolo,
    dove: ['docenteClasse'],
    schedaDocente: 'todo',
    gruppo: G.cheCosaSiGuarda,
    aiuto: filtro.aiuto,
    acceso: () => stato.filtroTodoClasse === filtro.valore,
    al: () => aggiorna({ filtroTodoClasse: filtro.valore }),
  })),

  {
    id: 'docente.pendenza', titolo: t.nuovaPendenza, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'todo', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      return corsiDi(classe.id).length ? null : t.primaUnCorso
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'docente' })
    },
  },
  {
    id: 'docente.documento', titolo: t.chiediDocumento, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      return corsiDi(classe.id).length ? null : t.primaUnCorso
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'classe', documento: true })
    },
  },
  {
    // Il gesto normale è trascinare il PDF nella pagina, ma serve anche un comando
    // per chi non trascina.
    id: 'docente.caricaPdf', titolo: t.caricaPdf, simbolo: 'cartella',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: true,
    impedimento: () => (classeDelFascicolo() ? null : t.selezionaClasse),
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void caricaPdf(classe)
    },
  },
  {
    // La lettura automatica di tutti i PDF in ballo, per le pagine ancora da
    // smistare (serve quando si accende l'OCR o cambia modello). Quella per un file
    // solo sta in testa alla cornice.
    id: 'docente.rileggiScansioni', titolo: t.rileggiScansioni, simbolo: 'ricarica',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: false,
    aiuto: t.rileggiScansioniAiuto,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      if (!stato.ocrAttivo) return t.ocrSpento
      return pdfInAttesa(classe).length > 0 ? null : t.nessunPdf
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void rileggiScansioni(classe)
    },
  },
  {
    id: 'docente.personale', titolo: t.documentoPersonale, simbolo: 'documento',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: G.classe,
    primario: false,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return t.selezionaClasse
      return corsiDi(classe.id).length ? null : t.primaUnCorso
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'docente', documento: true })
    },
  },
  {
    id: 'docente.assenze', titolo: t.nuovoPeriodo, simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'assenze', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloBloccoAssenze(classe)
    },
  },
  {
    id: 'docente.comunicazione', titolo: t.nuovaComunicazione, simbolo: 'posta',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: G.classe,
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'docente.recapito', titolo: t.nuovoRecapito, simbolo: 'utente',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: G.classe,
    primario: false,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : t.selezionaClasse
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloRecapito(classe)
    },
  },
  {
    id: 'docente.elenco', titolo: t.elencoClasse, simbolo: 'classi',
    dove: ['docenteClasse'], gruppo: G.gestione,
    impedimento: () => classeDelFascicolo() ? null : t.selezionaClasse,
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) aggiorna({ vista: 'classi', classeId: classe.id })
    },
  },

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

  // ------------------------------------------------------------ Documenti
  //
  // Le tre schede della pagina come interruttori nella riga delle azioni, come i
  // modi del calendario: il pulsante acceso dice quale si guarda.
  ...SCHEDE_DOCUMENTI.map((scheda) => ({
    id: `documenti.scheda.${scheda.valore}`,
    titolo: scheda.nome,
    simbolo: scheda.simbolo,
    dove: ['documenti'] as Ambito,
    gruppo: G.documentiDi,
    aiuto: scheda.aiuto,
    impedimento: senzaCorso,
    acceso: () => stato.schedaDocumenti === scheda.valore,
    al: () => aggiorna({ schedaDocumenti: scheda.valore }),
  })),
  {
    id: 'documenti.aggiornaTutto',
    titolo: t.aggiornaTutto,
    simbolo: 'ricarica',
    dove: ['documenti'],
    gruppo: G.genera,
    aiuto: () => t.aggiornaTuttoAiuto(nomeSemestreScelto()),
    primario: true,
    impedimento: senzaCorso,
    al: () =>
      azione({
        tipo: 'rapporto.completo',
        corsoId: corsoDelContesto()?.id ?? null,
        semestreId: stato.semestreId,
      }),
  },
  // ------------------------------------------------------ le composizioni
  //
  // Combina i fogli spuntati in un PDF che resta nella cartella con l'elenco di
  // che cosa contiene, così si può rifare uguale. Sta nella riga delle azioni
  // perché le spunte attraversano le tre schede.
  {
    id: 'documenti.combina',
    titolo: () =>
      sceltiPresenti().length > 0 ? t.combinaScelti(sceltiPresenti().length) : t.combinaDocumenti,
    simbolo: 'duplica',
    dove: ['documenti'],
    gruppo: G.composizioni,
    aiuto: t.combinaAiuto,
    primario: () => sceltiPresenti().length >= 2,
    impedimento: () => senzaCorso() ?? (sceltiPresenti().length >= 2 ? null : t.almenoDue),
    al: () => moduloComposizione(sceltiInOrdine()),
  },
  {
    id: 'documenti.svuotaScelta',
    titolo: t.togliSpunte,
    simbolo: 'chiudi',
    dove: ['documenti'],
    gruppo: G.composizioni,
    aiuto: t.togliSpunteAiuto,
    impedimento: () => (stato.documentiScelti.length > 0 ? null : t.nessunoSpuntato),
    al: () => aggiorna({ documentiScelti: [] }),
  },
  // Chi rifà i documenti: tre interruttori, acceso quello in vigore.
  ...MODI_PDF.map((modo) => ({
    id: `documenti.rifare.${modo.valore}`,
    titolo: modo.nome,
    simbolo: 'ricarica',
    dove: ['documenti'] as Ambito,
    gruppo: G.chiLiRifa,
    aiuto: modo.spiegazione,
    acceso: () => stato.registro.impostazioni.pdfAutomatici === modo.valore,
    al: () =>
      azione({
        tipo: 'impostazioni.salva',
        impostazioni: { ...stato.registro.impostazioni, pdfAutomatici: modo.valore },
      }),
  })),

  {
    id: 'file.collegaPosta',
    titolo: t.collegaPosta,
    simbolo: 'collegamento',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.posta,
    aiuto: t.collegaPostaAiuto,
    al: () => azione({ tipo: 'posta.collega' }),
  },
  {
    id: 'file.provaPosta',
    titolo: t.provaPosta,
    simbolo: 'posta',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.posta,
    aiuto: t.provaPostaAiuto,
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.prova' }),
  },
  {
    id: 'file.provaInvioPosta',
    titolo: t.provaInvio,
    simbolo: 'posta',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.posta,
    aiuto: t.provaInvioAiuto,
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.invioProva' }),
  },
  {
    id: 'file.scollegaPosta',
    titolo: t.scollegaPosta,
    simbolo: 'chiudi',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.posta,
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.scollega' }),
  },
]

// -------------------------------------------------------------- le raccolte

/** Se il comando vive in quel posto. */
export function vive (comando: ComandoUI, posto: Posto): boolean {
  return comando.dove.includes(posto) &&
    (posto !== 'docenteClasse' || !comando.schedaDocente || comando.schedaDocente === stato.schedaDocente) &&
    (comando.soloSe?.() ?? true)
}

/**
 * I comandi di un posto, divisi nei riquadri in cui compaiono, nell'ordine di
 * `COMANDI_UI`.
 */
export function gruppiDi (posto: Posto): Array<{ titolo: string, comandi: ComandoUI[] }> {
  const gruppi: Array<{ titolo: string, comandi: ComandoUI[] }> = []
  for (const comando of COMANDI_UI) {
    if (!vive(comando, posto)) continue
    const gruppo = gruppi.find((g) => g.titolo === comando.gruppo)
    if (gruppo) gruppo.comandi.push(comando)
    else gruppi.push({ titolo: comando.gruppo, comandi: [comando] })
  }
  return gruppi
}

/** I comandi della pagina aperta: quel che si può fare qui e adesso. */
export function gruppiDellaPagina (vista: Vista): Array<{ titolo: string, comandi: ComandoUI[] }> {
  return gruppiDi(vista)
}

/** I comandi del menu del programma, nei loro gruppi: senza quelli `fuoriMenu`. */
export function gruppiDelMenu (): Array<{ titolo: string, comandi: ComandoUI[] }> {
  return gruppiDi('app')
    .map((gruppo) => ({
      ...gruppo,
      comandi: gruppo.comandi.filter((comando) =>
        typeof comando.fuoriMenu === 'function' ? !comando.fuoriMenu() : comando.fuoriMenu !== true),
    }))
    .filter((gruppo) => gruppo.comandi.length > 0)
}

/** Il comando con quell'id, per chi lo invoca per nome. */
export function comandoPerId (id: string): ComandoUI | null {
  return COMANDI_UI.find((comando) => comando.id === id) ?? null
}

/**
 * Esegue un comando, o dice perché non si può. Il controllo sta qui perché
 * palette e scorciatoie arrivano da altre strade. Torna quel che il comando ha
 * avviato, così il pulsante tiene la rotella finché l'host risponde.
 */
export function eseguiComando (comando: ComandoUI): void | Promise<unknown> {
  // Uno spostamento delle frecce non ancora scritto è l'ultimo gesto: si scrive
  // prima di annullare o ripristinare, se no si annulla il passo sbagliato e la
  // pila di Ctrl+Y si svuota.
  if ((comando.id === 'modifica.annulla' || comando.id === 'modifica.ripristina') && spostamentoInAttesa()) {
    return scriviInAttesa().then(() => eseguiComando(comando))
  }
  const perche = impedimentoDi(comando)
  if (perche) {
    notifica(perche, 'avviso')
    return
  }
  return comando.al()
}
