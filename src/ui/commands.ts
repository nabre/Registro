// Che cosa si può fare, e dove ha senso farlo.
//
// È la stessa regola del manifesto — l'elenco dei comandi del desktop sta in
// `src/manifest.ts`, e menu e impostazioni nascono di lì — portata dentro il
// pannello. Qui stanno le *azioni*: quel che si fa al registro. Dove si va
// invece è un altro elenco, in `pagine.ts`, e la separazione fra i due è il
// punto: un pulsante che cambia pagina e uno che esporta un CSV non sono la
// stessa cosa e non stanno più nella stessa fila.
//
// Ogni comando dichiara `dove` vive, e da lì nascono i tre posti in cui si
// trova:
//
//   `['app']`      — il menu «Registro» a sinistra della barra: il documento,
//                    l'anno, la posta, la manutenzione. Cose che si fanno al
//                    registro intero, da qualunque pagina.
//
//   `['calendario', …]` — la riga delle azioni sotto la barra, che mostra
//                    soltanto i comandi della pagina aperta. È la risposta a
//                    «che cosa posso fare *qui*», e non contiene nient'altro.
//
//   `['schermo']`  — i comandi della proiezione, che non sono di nessuna
//                    pagina: vivono nella scheda «Proiezione», che compare
//                    nella barra a schermo acceso e porta la stessa riga di
//                    azioni delle pagine. La fascia sotto la barra non li
//                    ripete: là si legge soltanto che cosa sta vedendo la
//                    classe.
//
// Un comando può stare in più posti — «Ora in questo corso» è nel registro
// della lezione, nei piani e nelle valutazioni — ma mai in due superfici che si
// vedono insieme. Se una pagina disegna già il pulsante suo, il comando non
// nomina quella pagina: la riga delle azioni e il corpo della pagina si vedono
// nello stesso schermo, e due pulsanti uguali a un centimetro l'uno dall'altro
// fanno chiedere in che cosa differiscono. Vale per Impostazioni (anno, pause,
// posta) e per Documenti (le esportazioni del corso), che *sono* la superficie
// di comando del loro mestiere.
//
// Due regole che vale la pena dire per esteso.
//
//   Un comando che adesso non si può fare resta al suo posto, spento, e dice
//   perché: `impedimento()` torna la frase da leggere. Nascondere i comandi
//   inapplicabili fa una barra che cambia forma sotto il puntatore, e
//   soprattutto non risponde mai alla domanda vera — «perché non posso
//   esportare i voti?» — che è quasi sempre «perché non hai scelto un corso».
//
//   Il contesto non lo passa chi clicca: sta in `contesto.ts`, dedotto da dove
//   si sta guardando, e lo leggono allo stesso modo le azioni e le pagine.

import { MODI_PDF } from '../domain/automation.js'
import {
  apriCartellaModelli,
  modelloAperto,
  modelloDaSalvare,
  portaImmagine,
  provaAperto,
  ricaricaAperto,
  ripristinaAperto,
  salvaModello,
} from './views/templates.js'
import { PIF } from '../domain/lexicon.js'
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
import type { NomeIcona } from './components/icons.js'
import { conferma } from './components/modal.js'
import { notifica } from './components/notifications.js'
import {
  moduloAllievo,
  chiediEliminazione,
  moduloAnno,
  moduloAvvio,
  moduloComposizione,
  moduloBloccoAssenze,
  moduloClasse,
  moduloComunicazione,
  moduloConsegna,
  moduloCorso,
  moduloImportaAllievi,
  moduloLezione,
  moduloPause,
  moduloRecapito,
} from './forms.js'
import {
  scegliModoCalendario,
  scorriCalendario,
  vaiAOggi,
} from './calendarNavigation.js'
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
// L'ordine in cui i fogli spuntati vanno in fila lo sa la pagina che li
// disegna: è quello che si ha davanti agli occhi, e il comando lo chiede a lei
// invece di ricomporlo dall'elenco delle spunte, che è in ordine di clic.
import { sceltiInOrdine } from './views/documents/sheets.js'
import { caricaPdf, pdfInAttesa, rileggiScansioni } from './views/sorting.js'
// La mappa tiene la propria inquadratura in una variabile di modulo — si muove
// sotto le dita, e non passa dallo stato — e questi due la interrogano invece
// di ricalcolarla: vedi la nota in cima a `views/map.ts`.
import { indirizziInAttesa, inquadraTutto } from './views/map.js'
// I modi del calendario e le schede dei documenti non stanno più qui: sono le
// porzioni di quelle due pagine, e le porzioni le nomina un posto solo — lo
// stesso da cui il percorso in fondo allo schermo legge quale sia aperta.
import { FILTRI_TODO, FILTRI_TODO_CLASSE, MODI_CALENDARIO, SCHEDE_DOCUMENTI } from './tabs.js'
// I comandi del piano lavorano su quello che la pagina ha davanti, e quale sia
// lo sa lei: `stato.pianoId` è nullo finché non se ne sceglie uno, ma un piano
// sullo schermo c'è lo stesso.
import { pianoMostrato, primaOraDelPiano, scordaEditorDelPiano } from './views/plans.js'

// -------------------------------------------------------------- un comando

/** Un testo che può dipendere da com'è messo il registro adesso. */
type Testo = string | (() => string)

/**
 * I posti in cui un comando può vivere.
 *
 * `'app'` è il menu del programma, `'schermo'` la scheda «Proiezione» della
 * barra, e ogni altro nome è una vista: la riga delle azioni di quella pagina.
 */
export type Posto = 'app' | 'schermo' | Vista

type Ambito = readonly Posto[]

export interface ComandoUI {
  /** Un nome stabile: lo usano le scorciatoie e chi invoca per nome. */
  id: string
  titolo: Testo
  simbolo: NomeIcona
  /**
   * Dove vive il comando: nel menu del programma, in certe pagine, o fra i
   * comandi dello schermo per la classe.
   *
   * È la dichiarazione che tiene in ordine la barra. Una pagina mostra i
   * comandi che la nominano e nessun altro, e un comando che non nomina nessuna
   * pagina non compare da nessuna parte se non dove ha detto — niente più
   * pulsanti spenti buttati lì perché la scheda era quella.
   */
  dove: Ambito
  /** Sottopagina del fascicolo in cui proporre il comando. */
  schedaDocente?: SchedaDocente
  /** Il riquadro dentro la riga: i comandi che si fanno per lo stesso motivo. */
  gruppo: string
  /** La riga che si legge fermandosi sopra: dice che cosa succede davvero. */
  aiuto?: Testo
  /** Nella grafia che si legge sul tasto: `Ctrl+S`. La ascolta `installaScorciatoie`. */
  scorciatoia?: string
  /**
   * La scorciatoia la ascolta già il menu dell'applicazione: qui si scrive
   * soltanto.
   *
   * Electron consuma i tasti dichiarati come acceleratori di menu prima che
   * arrivino alla pagina, e quelli che arrivano lo stesso partirebbero due
   * volte — due dialoghi «apri un anno», due moduli «nuova ora». Il tasto
   * resta scritto accanto al comando perché chi guarda la barra vuole
   * impararlo, e funziona: lo fa partire il menu.
   */
  dalMenu?: boolean
  /**
   * Il comando che in quella scheda si preme più spesso: si vede di più.
   *
   * Può dipendere da com'è messo il registro: in un documento senza nemmeno un
   * anno scolastico, «Nuovo anno» non è un comando fra gli altri — è l'unica
   * cosa da fare, e finché non la si fa il resto non ha su che cosa lavorare.
   */
  primario?: boolean | (() => boolean)
  /**
   * Se quel che il comando accende è acceso adesso.
   *
   * I comandi della proiezione non fanno accadere una cosa e basta: mettono lo
   * schermo in uno stato, e lo stato va letto sul pulsante — «i nomi sono
   * visibili», «la classe sta guardando le consegne». Un pulsante che non dice
   * come sta la cosa che comanda costringe a girarsi verso il proiettore, che
   * è proprio quel che la barra deve evitare.
   */
  acceso?: () => boolean
  /** Perché adesso non si può, o `null` se si può. */
  impedimento?: () => string | null
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

export function impedimentoDi (comando: ComandoUI): string | null {
  return comando.impedimento?.() ?? null
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
  return stato.proiezione.aperta ? null : 'Lo schermo per la classe è spento.'
}

function senzaSchedeDaScorrere (): string | null {
  return proiettata().blocchi.length > 1
    ? null
    : 'C’è una scheda sola accesa: non c’è niente fra cui scorrere.'
}

/**
 * Apre una scheda sullo schermo grande, accendendola se era spenta.
 *
 * Un clic solo per il gesto normale — «adesso mostro le consegne» — e non due,
 * uno per accendere e uno per aprire. Chi vuole solo spegnere una scheda
 * riclicca quella aperta: è l'unico caso in cui spegnere serve davvero, perché
 * è l'unica che si sta vedendo.
 *
 * Sta fra i comandi e non nella fascia che la disegna: la regola dei tre stati
 * — spenta, accesa, in vista — la usano tutt'e due, e finché viveva nel
 * componente era il componente a doverla esportare verso l'elenco dei comandi,
 * che è il verso sbagliato. Adesso la fascia legge di qui, e la dipendenza va
 * in un senso solo.
 */
export function apriBlocco (blocco: BloccoProiezione): Promise<unknown> {
  const attuali = proiettata()
  const acceso = attuali.blocchi.includes(blocco)

  if (acceso && bloccoAperto(attuali) === blocco) {
    // Ricliccando quella aperta la si spegne: lo schermo scivola sulla
    // successiva da solo, e con l'ultima resta pulito.
    return mandaProiezione({
      ...attuali,
      blocchi: attuali.blocchi.filter((b) => b !== blocco),
      aperto: null,
    })
  }

  return mandaProiezione({
    ...attuali,
    // Nell'ordine dichiarato e non in quello dei clic: è l'ordine in cui le
    // schede scorrono sullo schermo, e cambiarlo a seconda dei clic vorrebbe
    // dire che «la prossima» non è sempre la stessa.
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
 * Il comando che mette una scheda sullo schermo grande.
 *
 * Il gesto è quello della fascia della proiezione, e il lavoro è il suo:
 * `apriBlocco` accende la scheda se era spenta e la apre, e ricliccando quella
 * aperta la toglie. I blocchi riservati — voti, documenti, appello — lo dicono
 * nell'aiuto: parlano delle singole persone, e aprirli vuol dire mostrarli a
 * tutta la classe.
 */
function comandoDiBlocco (blocco: BloccoProiezione): ComandoUI {
  return {
    id: `proiezione.blocco.${blocco}`,
    titolo: NOMI_BLOCCO[blocco],
    simbolo: ICONE_BLOCCO[blocco],
    dove: ['schermo'],
    gruppo: 'Sullo schermo',
    aiuto: riservato(blocco)
      ? `${NOMI_BLOCCO[blocco]}: parla delle singole persone. Aprendolo, lo vede tutta la classe.`
      : `Mostra ${NOMI_BLOCCO[blocco].toLowerCase()} alla classe`,
    impedimento: senzaSchermo,
    acceso: () => bloccoAperto(proiettata()) === blocco,
    al: () => apriBlocco(blocco),
  }
}

/**
 * Come si chiamano i tre stati di un'ora, e che cosa vuol dire metterla lì.
 *
 * Un `Record` e non un elenco: dichiarato così, uno stato nuovo nel dominio non
 * compila finché non gli si dà un nome e una spiegazione — che è l'unico modo
 * di non ritrovarsi uno stato senza pulsante e senza che nessuno se ne accorga.
 * L'ordine sta a parte, perché un `Record` non ne ha uno.
 */
const STATI_ORA: Record<StatoLezione, { testo: string, simbolo: NomeIcona, aiuto: string }> = {
  pianificata: {
    testo: 'Pianificata',
    simbolo: 'calendario',
    aiuto: 'L’ora torna fra quelle da fare: quel che è già scritto resta',
  },
  svolta: {
    testo: 'Svolta',
    simbolo: 'spunta',
    aiuto: 'L’ora è fatta: esce dalle pendenze e conta nel monte ore',
  },
  annullata: {
    testo: 'Annullata',
    simbolo: 'chiudi',
    aiuto: 'Resta nel registro, segnata come non svolta: i dati inseriti non si perdono',
  },
}

/** Nell'ordine in cui un'ora li attraversa: prima, fatta, saltata. */
const ORDINE_STATI: readonly StatoLezione[] = ['pianificata', 'svolta', 'annullata']

/**
 * Segna l'ora svolta, annullata o di nuovo pianificata.
 *
 * Stava dentro la vista, come chiusura dei suoi quattro pulsanti in testata.
 * Adesso quei pulsanti sono comandi della pagina, nella riga delle azioni
 * insieme al verbale e alle esportazioni: lo stato di un'ora è una cosa che si
 * fa all'ora, non una decorazione della sua intestazione.
 */
async function segnaLezione (lezione: Lezione, nuovo: Lezione['stato']): Promise<void> {
  const risposta = await azione({ tipo: 'lezione.stato', lezioneId: lezione.id, stato: nuovo })
  if (!risposta.ok) return
  notifica(
    nuovo === 'svolta' ? 'Lezione segnata come svolta.' : `Lezione ${nuovo}.`,
    nuovo === 'annullata' ? 'avviso' : 'successo',
  )
}

/** Com'è messa l'ora aperta, o `null` se non ce n'è una. */
function statoLezione (): Lezione['stato'] | null {
  return lezioneDelContesto()?.stato ?? null
}


// ------------------------------------------------------------- i documenti

// ---------------------------------------------------------------- i comandi

/**
 * Tutti i comandi, nell'ordine in cui compaiono nella barra.
 *
 * L'ordine dentro ogni gruppo conta: il primo è quello che si preme più
 * spesso. L'ordine dei gruppi lo decide la prima volta che compaiono qui
 * sotto, e non c'è un secondo elenco che dica come disporli — un elenco
 * dell'ordine separato dall'elenco delle cose diverge al primo comando nuovo.
 */
export const COMANDI_UI: readonly ComandoUI[] = [
  // ----------------------------------------------------------------- File
  {
    id: 'file.apri',
    titolo: 'Apri un anno…',
    simbolo: 'cartella',
    dove: ['app'],
    gruppo: 'Il documento',
    aiuto: 'Un altro documento «.registro», scelto dal disco',
    scorciatoia: 'Ctrl+O',
    dalMenu: true,
    primario: true,
    al: () => azione({ tipo: 'documento.apri' }),
  },
  {
    id: 'file.salva',
    titolo: 'Salva',
    simbolo: 'spunta',
    dove: ['app'],
    gruppo: 'Il documento',
    aiuto: 'Il registro salva da sé: questo smette di aspettare, e lo dice',
    scorciatoia: 'Ctrl+S',
    // Sulla pagina Modelli, Ctrl+S salva il modello aperto.
    //
    // Non è un'eccezione capricciosa: è l'unica pagina del registro in cui si
    // scrive dentro un file invece che dentro i dati, e chi ha davanti un
    // editor con delle modifiche non salvate preme Ctrl+S per quelle. Nel
    // registro non ci sono documenti da salvare — si salva da sé — e proprio
    // per questo il tasto era libero di rispondere alla domanda giusta.
    al: () =>
      stato.vista === 'modelli' && modelloDaSalvare()
        ? salvaModello()
        : azione({ tipo: 'stato.salva' }),
  },
  {
    id: 'file.ricarica',
    titolo: 'Ricarica',
    simbolo: 'ricarica',
    dove: ['app'],
    gruppo: 'Il documento',
    aiuto: 'Rilegge il documento dal disco: serve se lo ha toccato qualcun altro',
    al: () => azione({ tipo: 'stato.ricarica' }),
  },
  {
    id: 'file.chiudi',
    titolo: 'Chiudi l’anno',
    simbolo: 'chiudi',
    dove: ['app'],
    gruppo: 'Il documento',
    aiuto:
      'Chiude il documento e lascia il file libero: serve per farlo salire su OneDrive, ' +
      'o per riprenderlo da un altro computer',
    impedimento: () =>
      stato.documenti.corrente ? null : 'Non c’è nessun documento aperto.',
    al: () => azione({ tipo: 'documento.chiudi' }),
  },
  {
    id: 'file.cartella',
    titolo: 'Mostra nel gestore file',
    simbolo: 'cartella',
    dove: ['app'],
    gruppo: 'Il documento',
    aiuto: 'Apre la cartella in cui sta il documento dell’anno',
    al: () => azione({ tipo: 'sistema.apriCartella' }),
  },
  {
    id: 'file.nuovoAnno',
    titolo: 'Nuovo anno scolastico',
    simbolo: 'calendario',
    dove: ['app'],
    gruppo: 'L’anno',
    aiuto: 'Un anno nuovo dentro questo stesso documento: date, semestri, vacanze',
    primario: () => annoCorrente() === null,
    al: () => moduloAnno(),
  },
  {
    id: 'file.modificaAnno',
    titolo: 'Modifica l’anno',
    simbolo: 'matita',
    dove: ['app'],
    gruppo: 'L’anno',
    aiuto: 'Date, semestri e settimane dell’anno in uso',
    impedimento: senzaAnno,
    al: () => {
      const anno = annoCorrente()
      if (anno) moduloAnno(anno)
    },
  },
  {
    id: 'file.pause',
    titolo: 'Vacanze e sospensioni',
    simbolo: 'pausa',
    dove: ['app'],
    gruppo: 'L’anno',
    impedimento: senzaAnno,
    al: () => {
      const anno = annoCorrente()
      if (anno) moduloPause(anno)
    },
  },
  // ------------------------------------------------------------- La finestra
  //
  // Quel che si faceva dalla barra dei menu di sistema, e che da quando il
  // registro si disegna la barra del titolo da sé non si vede più: su Windows
  // e su Linux la barra dei menu è nascosta, e «Ingrandisci» o «Schermo
  // intero» resterebbero solo per chi conosce la scorciatoia.
  //
  // Le scorciatoie continuano a farle partire il menu dell'applicazione, che
  // resta installato anche quando non si vede — è la ragione del `dalMenu`
  // qui sotto: il tasto si scrive accanto alla voce, ma non lo si ascolta una
  // seconda volta, o partirebbe due scalini di zoom per ogni Ctrl+più.
  {
    id: 'finestra.ingrandisci',
    titolo: 'Ingrandisci',
    simbolo: 'piu',
    dove: ['app'],
    gruppo: 'La finestra',
    aiuto: 'Testo e riquadri più grandi, di un passo',
    scorciatoia: 'Ctrl+Plus',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'avanti' }),
  },
  {
    id: 'finestra.riduci',
    titolo: 'Riduci',
    simbolo: 'meno',
    dove: ['app'],
    gruppo: 'La finestra',
    aiuto: 'Testo e riquadri più piccoli, di un passo: ce ne sta di più',
    scorciatoia: 'Ctrl+-',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'indietro' }),
  },
  {
    id: 'finestra.dimensioneNormale',
    titolo: 'Dimensione normale',
    simbolo: 'ricarica',
    dove: ['app'],
    gruppo: 'La finestra',
    aiuto: 'Rimette la finestra alla sua misura',
    scorciatoia: 'Ctrl+0',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.zoom', verso: 'azzera' }),
  },
  {
    id: 'finestra.schermoIntero',
    titolo: 'Schermo intero',
    simbolo: 'schermo',
    dove: ['app'],
    gruppo: 'La finestra',
    // Detto per esteso: nel registro «schermo» è anche quello della classe, e
    // due voci che cominciano con la stessa parola si confondono.
    aiuto: 'La finestra di chi insegna occupa tutto lo schermo — non è lo schermo per la classe',
    scorciatoia: 'F11',
    dalMenu: true,
    al: () => azione({ tipo: 'finestra.schermoIntero' }),
  },
  {
    id: 'finestra.esci',
    titolo: 'Esci',
    simbolo: 'chiudi',
    dove: ['app'],
    gruppo: 'La finestra',
    aiuto: 'Chiude il registro. Quel che si è scritto è già salvato',
    al: () => azione({ tipo: 'programma.esci' }),
  },

  // ---------------------------------------------------------- Impostazioni
  //
  // I due ambiti stanno nella riga delle azioni e non dentro la pagina: sono la
  // prima scelta che si fa arrivando lì — di chi sono le impostazioni che sto
  // per cambiare — e la barra è il posto dove il pannello tiene le scelte che
  // valgono per tutta la pagina. Si comportano come i comandi dello schermo:
  // dicono anche come stanno, non solo che cosa fanno.
  {
    id: 'impostazioni.programma',
    titolo: 'Programma',
    simbolo: 'impostazioni',
    dove: ['impostazioni'],
    gruppo: 'Che cosa si regola',
    aiuto: 'Le impostazioni che restano su questo computer, per tutti i documenti',
    acceso: () => stato.ambitoImpostazioni === 'programma',
    al: () => aggiorna({ ambitoImpostazioni: 'programma' }),
  },
  {
    id: 'impostazioni.registro',
    titolo: 'Registro',
    simbolo: 'libro',
    dove: ['impostazioni'],
    gruppo: 'Che cosa si regola',
    aiuto: 'Le impostazioni che stanno dentro il documento d’anno e viaggiano con lui',
    acceso: () => stato.ambitoImpostazioni === 'documento',
    al: () => aggiorna({ ambitoImpostazioni: 'documento' }),
  },

  {
    id: 'file.ripara',
    titolo: 'Ripara il registro',
    simbolo: 'spunta',
    dove: ['app', 'impostazioni'],
    gruppo: 'Manutenzione',
    aiuto: 'Rimette a posto i riferimenti rotti che si correggono senza perdere niente',
    impedimento: () =>
      riparazioni(stato.registro).length > 0 ? null : 'Non c’è niente da riparare.',
    al: () => azione({ tipo: 'manutenzione.ripara' }),
  },

  // ------------------------------------------------------------- Registro
  {
    id: 'registro.oggi',
    titolo: 'Oggi',
    simbolo: 'calendario',
    // Solo nel calendario: là «oggi» è un posto in cui tornare — la settimana
    // che si stava guardando — mentre nelle pendenze non c'è niente da
    // riportare a oggi, perché l'elenco è già ordinato per fretta e non per
    // data. Un pulsante che in una pagina non fa niente di quel che il suo
    // nome promette è un pulsante che insegna a non fidarsi della riga.
    dove: ['calendario'],
    gruppo: 'Adesso',
    aiuto: 'Il calendario sulla settimana di oggi',
    scorciatoia: 'Ctrl+Alt+T',
    dalMenu: true,
    primario: true,
    al: vaiAOggi,
  },
  // Le frecce del calendario: un mese nella vista a mese, una settimana in
  // tutte le altre. Sono nel gruppo «Adesso» insieme a «Oggi» perché sono lo
  // stesso gesto — spostare il periodo che si sta guardando — e separarle
  // vorrebbe dire tre riquadri per tre pulsanti.
  {
    id: 'calendario.indietro',
    titolo: 'Indietro',
    simbolo: 'sinistra',
    dove: ['calendario'],
    gruppo: 'Adesso',
    aiuto: () =>
      stato.modoCalendario === 'mese' ? 'Il mese prima' : 'La settimana prima',
    al: () => scorriCalendario(-1),
  },
  {
    id: 'calendario.avanti',
    titolo: 'Avanti',
    simbolo: 'destra',
    dove: ['calendario'],
    gruppo: 'Adesso',
    aiuto: () =>
      stato.modoCalendario === 'mese' ? 'Il mese dopo' : 'La settimana dopo',
    al: () => scorriCalendario(1),
  },

  // Le quattro modalità: quattro interruttori e non una tendina, perché sono
  // quattro e si cambiano spesso — e perché così si legge quale è accesa senza
  // aprire niente. `acceso` fa il lavoro che faceva il `selettore` nella
  // testata della vista.
  ...MODI_CALENDARIO.map((modo): ComandoUI => ({
    id: `calendario.${modo.valore}`,
    titolo: modo.testo,
    simbolo: modo.simbolo,
    dove: ['calendario'],
    gruppo: 'Come si guarda',
    aiuto: modo.aiuto,
    acceso: () => stato.modoCalendario === modo.valore,
    al: () => scegliModoCalendario(modo.valore),
  })),
  {
    id: 'registro.oraDaCompilare',
    titolo: () => (oraDaFare()?.manca ? 'Ora da compilare' : 'Prossima ora'),
    simbolo: 'orologio',
    // Nel calendario e nel registro dell'ora, dove si sta lavorando sulle ore.
    // Non fra le pendenze: da lì si salta a un'altra pagina, e chi sta
    // mettendo in fila quel che manca lo perde il filo — l'ora che aspetta la
    // dice già la barra in fondo, da qualunque pagina.
    dove: ['calendario', 'lezione'],
    gruppo: 'Adesso',
    aiuto: 'Apre l’ora che aspetta: il buco da riempire, o quella che viene',
    impedimento: () => {
      const ora = oraDaFare()
      if (!ora) return 'Non c’è nessun’ora da compilare.'
      // Nella pagina dell'ora, quella che aspetta è spesso quella che si sta
      // già compilando: il pulsante restava accesso e non faceva niente, che
      // è il modo di insegnare a non fidarsi della riga.
      if (ora.lezione.id === stato.lezioneId) return 'È l’ora che stai compilando.'
      return null
    },
    al: () => {
      const ora = oraDaFare()
      if (!ora) return
      aggiorna({ vista: 'lezione', lezioneId: ora.lezione.id })
    },
  },
  // I tre filtri delle pendenze: interruttori e non una tendina, perché sono
  // tre e si cambiano scorrendo la pagina. `acceso` fa il lavoro che faceva il
  // `selettore` nella testata della vista.
  ...FILTRI_TODO.map((filtro): ComandoUI => ({
    id: `todo.${filtro.valore}`,
    titolo: filtro.testo,
    simbolo: filtro.simbolo,
    dove: ['todo'],
    gruppo: 'Che cosa si guarda',
    aiuto: filtro.aiuto,
    acceso: () => stato.filtroTodo === filtro.valore,
    al: () => aggiorna({ filtroTodo: filtro.valore }),
  })),

  {
    id: 'registro.nuovaLezione',
    titolo: 'Nuova ora',
    simbolo: 'piu',
    // Nel calendario, che è dove le ore si mettono: un'ora ha un giorno e un
    // posto nella settimana, e la settimana la si sta guardando là. Fra le
    // pendenze si crea quel che resta da fare — «Nuova consegna» — e un
    // pulsante che apre un'ora portava fuori dalla pagina proprio chi stava
    // mettendo in fila quel che manca.
    dove: ['calendario'],
    gruppo: 'Crea',
    aiuto: 'Un’ora fuori orario, o la prima di un corso appena fatto',
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
    titolo: 'Nuova consegna',
    simbolo: 'piu',
    dove: ['todo'],
    gruppo: 'Crea',
    aiuto: 'Qualcosa che si dà e deve tornare indietro: un compito, un documento',
    primario: true,
    impedimento: () =>
      corsiDellAnnoAperto().length > 0 ? null : 'Non c’è ancora nessun corso a cui darla.',
    al: () => {
      const corso = corsoDelContesto() ?? corsiDellAnnoAperto()[0]
      if (corso) moduloConsegna({ corsoId: corso.id })
    },
  },
  {
    id: 'registro.nuovoCorso',
    titolo: 'Nuovo corso',
    simbolo: 'libro',
    dove: ['corsi', 'classi'],
    gruppo: 'Crea',
    aiuto: 'Una materia a una classe, con il suo orario',
    al: () => moduloCorso({ classeId: classeDelContesto()?.id }),
  },
  {
    id: 'registro.nuovaClasse',
    titolo: 'Nuova classe',
    simbolo: 'classi',
    dove: ['classi', 'corsi'],
    gruppo: 'Crea',
    al: () => moduloClasse(),
  },
  {
    id: 'registro.avvio',
    titolo: 'Avvio guidato',
    simbolo: 'presa',
    dove: ['app', 'corsi'],
    gruppo: 'Crea',
    aiuto: 'Anno, classe, materia e orario in una finestra sola',
    al: () => moduloAvvio(),
  },
  // ---------------------------------------------------------------- Corso
  //
  // I quattro gesti che si fanno all'ora aperta. Erano pulsanti nella testata
  // della vista — indietro, svolta, modifica, annulla — e stavano in una fila
  // tutta loro a tre centimetri dalla riga delle azioni, che è dove il registro
  // tiene quel che si può fare nella pagina aperta.
  // I tre stati dell'ora, uno per pulsante, con acceso quello in vigore.
  //
  // Erano due interruttori che cambiavano nome secondo lo stato — «Segna come
  // svolta» che diventava «Riporta a pianificata», «Annulla l'ora» che
  // diventava «Riattiva l'ora» — e per sapere com'era messa l'ora bisognava
  // leggere che cosa promettevano i pulsanti e dedurre il contrario. Tre
  // pulsanti con uno acceso dicono lo stato guardandoli, e il gesto è sempre
  // lo stesso: si preme dove si vuole andare.
  ...ORDINE_STATI.map((valore): ComandoUI => ({
    id: `lezione.stato.${valore}`,
    titolo: STATI_ORA[valore].testo,
    simbolo: STATI_ORA[valore].simbolo,
    dove: ['lezione'],
    gruppo: 'Stato dell’ora',
    aiuto: STATI_ORA[valore].aiuto,
    // «Svolta» è il gesto con cui si chiude un'ora, e lo si fa una volta per
    // ora: finché non è fatto si vede più degli altri.
    primario: () => valore === 'svolta' && statoLezione() !== null && statoLezione() !== 'svolta',
    acceso: () => statoLezione() === valore,
    impedimento: senzaLezione,
    al: async () => {
      const lezione = lezioneDelContesto()
      // Premere lo stato in cui l'ora è già non è un errore: non è niente.
      if (!lezione || lezione.stato === valore) return
      if (valore === 'annullata') {
        const sicuro = await conferma({
          titolo: 'Annullare la lezione?',
          testo: 'Resta nel registro, segnata come non svolta. I dati già inseriti non si perdono.',
          testoConferma: 'Annulla la lezione',
        })
        if (!sicuro) return
      }
      await segnaLezione(lezione, valore)
    },
  })),
  {
    id: 'lezione.modifica',
    titolo: 'Modifica l’ora',
    simbolo: 'matita',
    dove: ['lezione'],
    gruppo: 'L’ora',
    aiuto: 'Giorno, orario, aula e pause di quest’ora',
    impedimento: senzaLezione,
    al: () => {
      const lezione = lezioneDelContesto()
      if (lezione) moduloLezione({ lezione })
    },
  },
  // ------------------------------------------------------- il piano aperto
  //
  // Stavano come pulsanti nella testata della scheda del piano, ma non sono
  // roba della scheda: sono i tre gesti che si fanno *a* un piano, e i gesti
  // che si fanno a quel che si ha davanti stanno nella riga della barra, come
  // per ogni altra pagina. Il piano su cui lavorano è quello che la pagina
  // mostra — quello scelto, o il primo dell'elenco quando non se ne è ancora
  // scelto nessuno.
  {
    id: 'piano.vaiAlRegistro',
    titolo: 'Vai al registro',
    simbolo: 'agenda',
    dove: ['piani'],
    gruppo: 'Il piano',
    aiuto: 'Apre il registro dell’ora che usa questa scaletta',
    primario: true,
    impedimento: () => {
      const piano = pianoMostrato()
      if (!piano) return 'Nessun piano aperto.'
      return primaOraDelPiano(piano)
        ? null
        : 'Questa scaletta non sta ancora su nessun’ora: assegnala da un’ora del calendario.'
    },
    al: () => {
      const piano = pianoMostrato()
      const lezione = piano ? primaOraDelPiano(piano) : null
      if (lezione) aggiorna({ vista: 'lezione', lezioneId: lezione.id, data: lezione.data })
    },
  },
  {
    id: 'piano.duplica',
    titolo: 'Duplica',
    simbolo: 'duplica',
    dove: ['piani'],
    gruppo: 'Il piano',
    aiuto: 'Una copia da adattare: è così che lo stesso piano serve un altro corso',
    impedimento: () => (pianoMostrato() ? null : 'Nessun piano aperto.'),
    al: async () => {
      const piano = pianoMostrato()
      if (!piano) return
      const risposta = await azione({ tipo: 'piano.duplica', pianoId: piano.id })
      if (risposta.ok && risposta.creato) aggiorna({ pianoId: risposta.creato.id })
    },
  },
  {
    id: 'piano.elimina',
    titolo: 'Elimina',
    simbolo: 'cestino',
    dove: ['piani'],
    gruppo: 'Il piano',
    aiuto: 'Toglie la scaletta e il materiale che ci sta attaccato',
    impedimento: () => (pianoMostrato() ? null : 'Nessun piano aperto.'),
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
    titolo: 'Ora in questo corso',
    simbolo: 'piu',
    // Non nel registro della lezione: là si scrive l'ora che si ha davanti, e
    // un pulsante che ne crea un'altra in mezzo all'appello è un gesto che
    // nessuno cerca lì. Si fa dai piani e dalle valutazioni, dove si guarda il
    // corso intero, e dal calendario, dove si vede il buco da riempire.
    dove: ['piani', 'valutazioni'],
    gruppo: 'L’ora',
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
  // Qui c'erano il verbale dell'ora e le tre esportazioni del corso — tutto il
  // corso in un colpo, i voti in CSV, le presenze in CSV. Non ci sono più:
  // quel che esce dal registro e va in mano ad altri sta nella pagina
  // Documenti, che li disegna già uno per uno, corso per corso e ora per ora,
  // accanto alla regola con cui il registro li rifà da sé. Sparsi fra tre
  // pagine erano quattro pulsanti da ricordarsi dove stavano, e chi doveva
  // consegnare a fine semestre passava da tre pagine per mettere insieme
  // venti fogli.

  // ---------------------------------------------------------------- Mappa
  {
    id: 'mappa.geocodifica',
    titolo: 'Trova gli indirizzi',
    simbolo: 'segnaposto',
    dove: ['mappa'],
    gruppo: 'Indirizzi',
    aiuto:
      'Chiede a OpenStreetMap dove cadono gli indirizzi che non hanno ancora un punto. ' +
      'È l’unico gesto del registro che manda fuori un dato dell’anagrafica, ed è per questo ' +
      'che si preme a mano: la risposta resta scritta, e non si richiede più.',
    primario: () => indirizziInAttesa() > 0,
    impedimento: () =>
      indirizziInAttesa() > 0
        ? null
        : 'Ogni indirizzo scritto ha già il suo punto sulla mappa.',
    // Tutte le classi dell'anno: la mappa non ha più un filtro per classe, e
    // cercare «solo quelle che si vedono» non vorrebbe dire niente.
    al: () => azione({ tipo: 'mappa.geocodifica' }),
  },
  {
    id: 'mappa.rifai',
    titolo: 'Rifai gli indirizzi',
    simbolo: 'ricarica',
    dove: ['mappa'],
    gruppo: 'Indirizzi',
    aiuto:
      'Richiede anche quelli che un punto ce l’hanno già: serve quando un indirizzo ' +
      'incompleto è caduto nel paese sbagliato, e lo si è corretto nell’anagrafica.',
    al: async () => {
      const sicuro = await conferma({
        titolo: 'Rifare tutti gli indirizzi?',
        testo:
          'Gli indirizzi delle classi in mappa tornano al geocodificatore, anche quelli ' +
          'già risolti. Ci vuole circa un secondo per indirizzo.',
        testoConferma: 'Rifai',
      })
      if (!sicuro) return
      await azione({ tipo: 'mappa.geocodifica', rifaiTutto: true })
    },
  },
  {
    id: 'mappa.inquadra',
    titolo: 'Inquadra tutto',
    simbolo: 'mappa',
    dove: ['mappa'],
    gruppo: 'Come si guarda',
    aiuto: 'Riporta la mappa sul riquadro che contiene tutti i punti accesi',
    al: () => inquadraTutto(),
  },
  // --------------------------------------------------------------- Classe
  {
    id: 'classe.nuovoAllievo',
    titolo: 'Aggiungi al gruppo',
    simbolo: 'utente',
    // Non in Classi: là la scheda della classe ha già i suoi due pulsanti, a
    // dieci centimetri dall'elenco che riempiono. Qui servono alle pagine in
    // cui quell'elenco non si vede.
    dove: ['allievo'],
    gruppo: 'Elenco',
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloAllievo(classe)
    },
  },
  {
    id: 'classe.incollaElenco',
    titolo: 'Incolla elenco',
    simbolo: 'piano',
    dove: ['allievo'],
    gruppo: 'Elenco',
    aiuto: 'Un elenco copiato da un foglio diventa il gruppo della classe',
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloImportaAllievi(classe)
    },
  },
  {
    id: 'classe.comunicazione',
    titolo: 'Nuova comunicazione',
    simbolo: 'posta',
    // Non nel pannello del docente di classe: là la sezione Comunicazioni ha
    // il suo pulsante, sopra l'elenco che riguarda.
    dove: ['classi', 'allievo'],
    gruppo: 'Famiglie',
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'classe.assenze',
    titolo: 'Nuovo periodo assenze',
    simbolo: 'orologio',
    dove: ['classi', 'allievo'],
    gruppo: 'Famiglie',
    aiuto: 'Il foglio delle assenze da far firmare, per un periodo',
    impedimento: senzaClasse,
    al: () => {
      const classe = classeDelContesto()
      if (classe) moduloBloccoAssenze(classe)
    },
  },

  // I due modi di guardare le pendenze della classe: interruttori nella riga
  // delle azioni, come i filtri della pagina delle pendenze. Stavano dentro la
  // scheda, in un selettore accanto al titolo: due posti diversi per lo stesso
  // gesto, e chi lo cercava dove sta sempre — nella riga — non lo trovava.
  ...FILTRI_TODO_CLASSE.map((filtro): ComandoUI => ({
    id: `docente.pendenze.${filtro.valore}`,
    titolo: filtro.testo,
    simbolo: filtro.simbolo,
    dove: ['docenteClasse'],
    schedaDocente: 'todo',
    gruppo: 'Che cosa si guarda',
    aiuto: filtro.aiuto,
    acceso: () => stato.filtroTodoClasse === filtro.valore,
    al: () => aggiorna({ filtroTodoClasse: filtro.valore }),
  })),

  {
    id: 'docente.pendenza', titolo: 'Nuova pendenza', simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'todo', gruppo: 'Classe',
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return 'Seleziona una classe di cui sei docente'
      return corsiDi(classe.id).length ? null : 'Crea prima un corso per questa classe'
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'docente' })
    },
  },
  {
    id: 'docente.documento', titolo: 'Chiedi un documento', simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: 'Classe',
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return 'Seleziona una classe di cui sei docente'
      return corsiDi(classe.id).length ? null : 'Crea prima un corso per questa classe'
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'classe', documento: true })
    },
  },
  {
    // Il gesto normale è trascinare il PDF nella pagina — arriva per mail, lo si
    // tira dentro — ma un comando ci vuole lo stesso: c'è chi il trascinamento
    // non lo usa, e un gesto che esiste solo se lo si indovina non esiste.
    id: 'docente.caricaPdf', titolo: 'Carica dei PDF', simbolo: 'cartella',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: 'Classe',
    primario: true,
    impedimento: () => (classeDelFascicolo() ? null : 'Seleziona una classe di cui sei docente'),
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void caricaPdf(classe)
    },
  },
  {
    // Il comando generale della lettura automatica: tutti i PDF in ballo, tutte
    // le pagine che restano da smistare. Quello per un file solo sta in testa
    // alla cornice, dove il file si guarda — qui c'è la domanda che riguarda la
    // classe intera, e che nasce quando l'OCR cambia: lo si accende a metà
    // lavoro, o si scarica un modello che legge meglio di quello di prima.
    id: 'docente.rileggiScansioni', titolo: 'Rileggi le scansioni', simbolo: 'ricarica',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: 'Classe',
    primario: false,
    aiuto:
      'Rimette in coda la lettura di tutte le pagine ancora da smistare, in tutti i PDF di ' +
      'questa classe. Le pagine già archiviate restano dove sono.',
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return 'Seleziona una classe di cui sei docente'
      if (!stato.ocrAttivo) return 'La lettura automatica delle scansioni è spenta'
      return pdfInAttesa(classe).length > 0 ? null : 'Non c’è nessun PDF da dividere'
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) void rileggiScansioni(classe)
    },
  },
  {
    id: 'docente.personale', titolo: 'Documento personale', simbolo: 'documento',
    dove: ['docenteClasse'], schedaDocente: 'documenti', gruppo: 'Classe',
    primario: false,
    impedimento: () => {
      const classe = classeDelFascicolo()
      if (!classe) return 'Seleziona una classe di cui sei docente'
      return corsiDi(classe.id).length ? null : 'Crea prima un corso per questa classe'
    },
    al: () => {
      const classe = classeDelFascicolo()
      const corso = classe && corsiDi(classe.id)[0]
      if (corso) moduloConsegna({ corsoId: corso.id, a: 'docente', documento: true })
    },
  },
  {
    id: 'docente.assenze', titolo: 'Nuovo periodo', simbolo: 'piu',
    dove: ['docenteClasse'], schedaDocente: 'assenze', gruppo: 'Classe',
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : 'Seleziona una classe di cui sei docente'
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloBloccoAssenze(classe)
    },
  },
  {
    id: 'docente.comunicazione', titolo: 'Nuova comunicazione', simbolo: 'posta',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: 'Classe',
    primario: true,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : 'Seleziona una classe di cui sei docente'
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloComunicazione(classe)
    },
  },
  {
    id: 'docente.recapito', titolo: 'Nuovo recapito', simbolo: 'utente',
    dove: ['docenteClasse'], schedaDocente: 'messaggistica', gruppo: 'Classe',
    primario: false,
    impedimento: () => {
      const classe = classeDelFascicolo()
      return classe ? null : 'Seleziona una classe di cui sei docente'
    },
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) moduloRecapito(classe)
    },
  },
  {
    id: 'docente.elenco', titolo: 'Elenco della classe', simbolo: 'classi',
    dove: ['docenteClasse'], gruppo: 'Gestione',
    impedimento: () => classeDelFascicolo() ? null : 'Seleziona una classe di cui sei docente',
    al: () => {
      const classe = classeDelFascicolo()
      if (classe) aggiorna({ vista: 'classi', classeId: classe.id })
    },
  },

  // ----------------------------------------------------------- Proiezione
  {
    id: 'proiezione.schermo',
    titolo: () => (stato.proiezione.aperta ? 'Spegni lo schermo' : 'Proietta'),
    simbolo: 'schermo',
    dove: ['app', 'schermo'],
    gruppo: 'Lo schermo',
    aiuto: () =>
      stato.proiezione.aperta
        ? 'Chiude la finestra che sta sul proiettore'
        : 'Apre lo schermo per la classe, in una finestra da portare sul proiettore',
    primario: true,
    acceso: () => stato.proiezione.aperta,
    al: () => azione({ tipo: stato.proiezione.aperta ? 'proiezione.chiudi' : 'proiezione.apri' }),
  },
  {
    id: 'proiezione.pausa',
    titolo: () => (proiettata().sospesa ? 'Riprendi' : 'Pausa'),
    simbolo: 'pausa',
    dove: ['schermo'],
    gruppo: 'Lo schermo',
    aiuto: 'Spegne il contenuto lasciando la finestra dov’è: si riprende com’era',
    impedimento: senzaSchermo,
    acceso: () => proiettata().sospesa,
    al: () => mandaProiezione({ ...proiettata(), sospesa: !proiettata().sospesa }),
  },
  {
    id: 'proiezione.indietro',
    titolo: 'Scheda precedente',
    simbolo: 'sinistra',
    dove: ['schermo'],
    gruppo: 'Lo schermo',
    impedimento: () => senzaSchermo() ?? senzaSchedeDaScorrere(),
    al: () => mandaProiezione({ ...proiettata(), aperto: bloccoScorrendo(proiettata(), -1) }),
  },
  {
    id: 'proiezione.avanti',
    titolo: 'Scheda successiva',
    simbolo: 'destra',
    dove: ['schermo'],
    gruppo: 'Lo schermo',
    impedimento: () => senzaSchermo() ?? senzaSchedeDaScorrere(),
    al: () => mandaProiezione({ ...proiettata(), aperto: bloccoScorrendo(proiettata(), 1) }),
  },

  // Una voce per blocco: il gesto è quello della fascia — un clic apre la
  // scheda e la accende se era spenta, un altro sulla stessa la toglie — e il
  // pulsante acceso è quello che la classe sta guardando adesso.
  ...BLOCCHI.map((blocco) => comandoDiBlocco(blocco)),

  {
    id: 'proiezione.nomi',
    titolo: () => (proiettata().nomi ? 'Nomi visibili' : 'Senza nomi'),
    simbolo: 'utente',
    dove: ['schermo'],
    gruppo: 'Come si vede',
    aiuto: 'Se accanto ai voti e ai documenti mancanti compaiono i nomi',
    impedimento: senzaSchermo,
    acceso: () => proiettata().nomi,
    al: () => mandaProiezione({ ...proiettata(), nomi: !proiettata().nomi }),
  },
  {
    id: 'proiezione.misure',
    titolo: () => (proiettata().compatta ? 'Misure strette' : 'Misure larghe'),
    simbolo: 'su',
    dove: ['schermo'],
    gruppo: 'Come si vede',
    aiuto: () =>
      proiettata().compatta
        ? 'Caratteri più piccoli: ci sta più roba nella pagina'
        : 'Caratteri più grandi: si legge da più lontano, ma ci sta meno',
    impedimento: senzaSchermo,
    acceso: () => !proiettata().compatta,
    al: () => mandaProiezione({ ...proiettata(), compatta: !proiettata().compatta }),
  },

  // Le quattro viste del calendario proiettato. Si possono premere solo con la
  // scheda Calendario aperta: è l'unico momento in cui cambiano qualcosa sullo
  // schermo grande. Il giorno no: quello lo porta il calendario del registro.
  ...VISTE_CALENDARIO.map((vista) => ({
    id: `proiezione.calendario.${vista}`,
    titolo: NOMI_VISTA_CALENDARIO[vista],
    simbolo: ICONE_VISTA[vista],
    dove: ['schermo'] as const,
    gruppo: 'Calendario proiettato',
    aiuto: 'Il giorno è quello aperto nel calendario del registro',
    impedimento: () =>
      senzaSchermo() ??
      (bloccoAperto(proiettata()) === 'calendario'
        ? null
        : 'La scheda Calendario non è quella aperta sullo schermo.'),
    acceso: () => (proiettata().calendario ?? 'agenda') === vista,
    al: () => mandaProiezione({ ...proiettata(), calendario: vista }),
  })),

  // ------------------------------------------------------------ Documenti
  //
  // Le tre schede della pagina stanno qui e non dentro la pagina, come i modi
  // del calendario: sono navigazione dentro una pagina sola — «di che cosa
  // parliamo: del corso, dell'ora, delle persone» — e la riga delle azioni è
  // dove si cercano le cose che si premono, non in mezzo ai fogli da
  // consegnare. Il pulsante acceso dice quale si sta guardando.
  ...SCHEDE_DOCUMENTI.map((scheda) => ({
    id: `documenti.scheda.${scheda.valore}`,
    titolo: scheda.nome,
    simbolo: scheda.simbolo,
    dove: ['documenti'] as Ambito,
    gruppo: 'Documenti di',
    aiuto: scheda.aiuto,
    impedimento: senzaCorso,
    acceso: () => stato.schedaDocumenti === scheda.valore,
    al: () => aggiorna({ schedaDocumenti: scheda.valore }),
  })),
  {
    id: 'documenti.aggiornaTutto',
    titolo: 'Aggiorna tutto',
    simbolo: 'ricarica',
    dove: ['documenti'],
    gruppo: 'Genera',
    aiuto: () =>
      'Tutto quel che il corso sa stampare: presenze, voti, una scheda per ogni ' +
      `${PIF.singolare} e per ogni prova, il verbale di ogni ora svolta, i piani, le facce ` +
      `e il fascicolo di classe, nel ${nomeSemestreScelto()}`,
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
  // Combinare dei fogli è il gesto di chi consegna: venticinque schede vanno in
  // segreteria come un documento solo. Le caselle stanno nelle righe della
  // pagina — è lì che si sceglie — e il comando qui raccoglie quel che si è
  // spuntato, chiede un nome, e ne fa un PDF che resta nella cartella con
  // l'elenco di che cosa ci sta dentro: rifarlo vuol dire le stesse schede,
  // nello stesso ordine, com'erano stamattina.
  //
  // Sta nella riga delle azioni e non dentro un riquadro perché le spunte
  // attraversano le tre schede: una composizione può mettere insieme il verbale di
  // un'ora e la scheda di una persona, e il conto si legge qui anche quando
  // quelle righe non sono in vista.
  {
    id: 'documenti.combina',
    titolo: () =>
      sceltiPresenti().length > 0
        ? `Combina i ${sceltiPresenti().length} scelti`
        : 'Combina i documenti scelti',
    simbolo: 'duplica',
    dove: ['documenti'],
    gruppo: 'Composizioni',
    aiuto: 'Un PDF solo con dentro, in fila, i documenti spuntati: chiede come chiamarlo',
    primario: () => sceltiPresenti().length >= 2,
    impedimento: () =>
      senzaCorso() ??
      (sceltiPresenti().length >= 2
        ? null
        : 'Spunta almeno due documenti nelle righe: la composizione li mette in fila in un PDF solo.'),
    al: () => moduloComposizione(sceltiInOrdine()),
  },
  {
    id: 'documenti.svuotaScelta',
    titolo: 'Togli le spunte',
    simbolo: 'chiudi',
    dove: ['documenti'],
    gruppo: 'Composizioni',
    aiuto: 'Nessun documento scelto: si riparte da zero',
    impedimento: () =>
      stato.documentiScelti.length > 0 ? null : 'Non c’è nessun documento spuntato.',
    al: () => aggiorna({ documentiScelti: [] }),
  },
  // I modelli non stanno più fra i comandi di Documenti, e non aprono più la
  // cartella nel gestore di file: sono una pagina, «Modelli», sotto «Il
  // programma». Un pulsante che cambia pagina non è un'azione — è una
  // destinazione, e le destinazioni stanno in `pagine.ts`, nella barra a
  // sinistra con tutte le altre.

  // I comandi della pagina Modelli. Salvare, provare e rimettere quello di
  // serie sono i tre gesti di chi sta modificando un foglio, e stanno qui e non
  // nella pagina: la pagina è fatta di un elenco, un editor e un'anteprima, e
  // tre pulsanti in mezzo sarebbero tre pulsanti in mezzo a quel che si legge.
  {
    id: 'modelli.salva',
    titolo: 'Salva il modello',
    simbolo: 'spunta',
    dove: ['modelli'],
    gruppo: 'Modello',
    aiuto: 'Scrive il file in templates/, come Ctrl+S: vale dal prossimo rapporto',
    primario: () => modelloDaSalvare(),
    impedimento: () =>
      modelloDaSalvare() ? null : 'Non c’è niente da salvare: il file è già com’è scritto qui.',
    al: () => salvaModello(),
  },
  {
    id: 'modelli.prova',
    titolo: 'Prova',
    simbolo: 'documento',
    dove: ['modelli'],
    gruppo: 'Modello',
    aiuto: 'Compone il foglio con i dati veri del registro e lo mostra, senza scriverlo',
    impedimento: () => {
      const aperto = modelloAperto()
      if (!aperto) return 'Non c’è nessun modello aperto.'
      if (aperto.genere === null) return `«${aperto.titolo}» non compone un PDF: non c’è niente da guardare.`
      return null
    },
    al: () => provaAperto(),
  },
  {
    id: 'modelli.ricarica',
    titolo: 'Rileggi dal disco',
    simbolo: 'ricarica',
    dove: ['modelli'],
    gruppo: 'Modello',
    aiuto: 'Butta via quel che si è scritto e rilegge il file com’è su disco',
    impedimento: () => (modelloAperto() ? null : 'Non c’è nessun modello aperto.'),
    al: () => ricaricaAperto(),
  },
  {
    id: 'modelli.ripristina',
    titolo: 'Rimetti quello di serie',
    simbolo: 'cestino',
    dove: ['modelli'],
    gruppo: 'Modello',
    aiuto: 'Il modello torna alla copia che il registro porta con sé',
    impedimento: () => {
      const aperto = modelloAperto()
      if (!aperto) return 'Non c’è nessun modello aperto.'
      if (!aperto.haDiSerie) return `«${aperto.titolo}» non è di serie: non c’è niente a cui tornare.`
      if (!aperto.modificato) return 'Questo modello è già quello di serie.'
      return null
    },
    al: () => ripristinaAperto(),
  },
  {
    id: 'modelli.immagine',
    titolo: 'Porta un’immagine',
    simbolo: 'immagine',
    dove: ['modelli'],
    gruppo: 'Cartella',
    aiuto: 'Copia un PNG o un JPEG in templates/: il logo della sede',
    al: () => portaImmagine(),
  },
  {
    id: 'modelli.cartella',
    titolo: 'Apri la cartella',
    simbolo: 'cartella',
    dove: ['modelli'],
    gruppo: 'Cartella',
    aiuto: 'Apre templates/ nel gestore di file, per chi ci vuole lavorare da fuori',
    al: () => apriCartellaModelli(),
  },

  // Chi rifà i documenti: tre comandi e non un selettore nella pagina.
  //
  // È una regola che si mette una volta e poi si dimentica — non un foglio da
  // guardare — e stava in fondo alla pagina occupando il posto di quel che si
  // viene a fare qui. Nella riga delle azioni sta accanto agli altri comandi
  // della pagina, con il pulsante acceso su quella in vigore: si legge in che
  // stato è senza aprire niente, che è l'unica cosa che se ne vuole sapere.
  ...MODI_PDF.map((modo) => ({
    id: `documenti.rifare.${modo.valore}`,
    titolo: modo.nome,
    simbolo: 'ricarica',
    dove: ['documenti'] as Ambito,
    gruppo: 'Chi li rifà',
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
    titolo: 'Collega la posta',
    simbolo: 'collegamento',
    dove: ['app'],
    gruppo: 'Posta',
    aiuto: 'Chiede l’indirizzo e fa accedere dal browser: il gettone resta nel portachiavi',
    al: () => azione({ tipo: 'posta.collega' }),
  },
  {
    id: 'file.provaPosta',
    titolo: 'Prova la posta',
    simbolo: 'posta',
    dove: ['app'],
    gruppo: 'Posta',
    aiuto: 'Domanda di chi è la casella, senza mandare niente',
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.prova' }),
  },
  {
    id: 'file.provaInvioPosta',
    titolo: 'Manda una mail di prova',
    simbolo: 'posta',
    dove: ['app'],
    gruppo: 'Posta',
    aiuto: 'Manda una mail vera all’indirizzo che scrivi: è l’unico modo di provare l’invio',
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.invioProva' }),
  },
  {
    id: 'file.scollegaPosta',
    titolo: 'Scollega la posta',
    simbolo: 'chiudi',
    dove: ['app'],
    gruppo: 'Posta',
    impedimento: senzaPosta,
    al: () => azione({ tipo: 'posta.scollega' }),
  },
]

// -------------------------------------------------------------- le raccolte

/** Se il comando vive in quel posto. */
export function vive (comando: ComandoUI, posto: Posto): boolean {
  return comando.dove.includes(posto) &&
    (posto !== 'docenteClasse' || !comando.schedaDocente || comando.schedaDocente === stato.schedaDocente)
}

/**
 * I comandi di un posto, divisi nei riquadri in cui compaiono.
 *
 * L'ordine dei riquadri lo decide l'ordine in cui i comandi sono scritti in
 * `COMANDI_UI`: un secondo elenco che dicesse come disporli divergerebbe al
 * primo comando nuovo.
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

/** I comandi del menu del programma, nei loro gruppi. */
export function gruppiDelMenu (): Array<{ titolo: string, comandi: ComandoUI[] }> {
  return gruppiDi('app')
}

/** Il comando con quell'id, per chi lo invoca per nome. */
export function comandoPerId (id: string): ComandoUI | null {
  return COMANDI_UI.find((comando) => comando.id === id) ?? null
}

/**
 * Esegue un comando, o dice perché non si può.
 *
 * Il controllo sta qui e non solo nella barra: la palette e le scorciatoie
 * arrivano allo stesso comando da altre strade, e un pulsante spento non ferma
 * chi preme un tasto.
 *
 * Torna quel che il comando ha avviato, se ha avviato qualcosa: è così che il
 * pulsante della barra si tiene la sua rotella finché l'host non ha risposto.
 */
export function eseguiComando (comando: ComandoUI): void | Promise<unknown> {
  const perche = impedimentoDi(comando)
  if (perche) {
    notifica(perche, 'avviso')
    return
  }
  return comando.al()
}

// ------------------------------------------------------------ le scorciatoie

/** Se il tasto è stato premuto dentro qualcosa in cui si sta scrivendo. */
function dentroUnCampo (bersaglio: EventTarget | null): boolean {
  if (!(bersaglio instanceof HTMLElement)) return false
  return bersaglio.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(bersaglio.tagName)
}

/**
 * Consegna quel che si sta scrivendo prima che parta un comando da tastiera.
 *
 * I campi del registro salvano su `change`, cioè uscendo dal campo: un Ctrl+S
 * premuto a metà di un consuntivo non ne usciva, e `stato.salva` scriveva il
 * registro senza quel testo — dicendo «Tutto salvato.». Un clic su un
 * pulsante il campo lo lascia da sé; una scorciatoia no, e allora lo si fa
 * qui: fuori e subito dentro, con il cursore dov'era. `blur()` fa partire
 * `change` in modo sincrono, quindi il salvataggio del campo è mandato prima
 * del comando, e la fila unica dell'host lo esegue prima.
 */
function consegnaIlCampo (): void {
  const attivo = document.activeElement
  if (!(attivo instanceof HTMLInputElement || attivo instanceof HTMLTextAreaElement)) return
  const { selectionStart: inizio, selectionEnd: fine } = attivo
  attivo.blur()
  attivo.focus()
  try {
    if (inizio !== null) attivo.setSelectionRange(inizio, fine ?? inizio)
  } catch {
    // Date, numeri, colori: campi che una selezione non ce l'hanno.
  }
}

/**
 * I tasti che valgono in tutta la finestra.
 *
 * Si legge la scorciatoia dichiarata dal comando: non c'è una seconda tabella
 * da tenere allineata, e un comando che cambia tasto lo cambia in un posto
 * solo — la barra scrive quel che questa funzione ascolta.
 *
 * Non rispondono dentro una modale: lì il gesto appartiene al modulo aperto —
 * Invio salva, Escape annulla — e un Ctrl+S che salvasse il registro mentre si
 * compila una finestra risponderebbe a una domanda che nessuno ha fatto. Nei
 * campi di testo invece rispondono: Ctrl+S premuto in mezzo a un consuntivo è
 * proprio il momento in cui lo si vuole.
 */
export function installaScorciatoie (opzioni: {
  comandi: () => void
  palette: () => void
}): void {
  document.addEventListener('keydown', (evento: KeyboardEvent) => {
    if (!evento.ctrlKey && !evento.metaKey) return
    if (document.querySelector('.modale')) return

    const tasto = evento.key.toLowerCase()
    const conAlt = evento.altKey

    // I due gesti del telaio, che non sono comandi del registro: aprono e
    // chiudono pezzi della finestra, e non c'è niente da eseguire. Ctrl+B
    // nasconde le azioni della barra dei comandi — «dammi tutto lo schermo» —
    // e non la barra laterale, che ha il suo pulsante e resta dov'è.
    if (!conAlt && !evento.shiftKey && tasto === 'b') {
      // Non mentre si scrive: Ctrl+B dentro un campo è il gesto del grassetto,
      // e chi lo preme per abitudine non sta chiedendo di chiudere i comandi.
      if (dentroUnCampo(evento.target)) return
      evento.preventDefault()
      opzioni.comandi()
      return
    }
    if (!conAlt && !evento.shiftKey && tasto === 'k') {
      evento.preventDefault()
      opzioni.palette()
      return
    }

    for (const comando of COMANDI_UI) {
      if (!comando.scorciatoia || comando.dalMenu) continue
      const pezzi = comando.scorciatoia.toLowerCase().split('+')
      if (pezzi.includes('alt') !== conAlt) continue
      if (pezzi.includes('shift') !== evento.shiftKey) continue
      if (pezzi[pezzi.length - 1] !== tasto) continue
      evento.preventDefault()
      consegnaIlCampo()
      // `void`: una scorciatoia lancia il comando e restituisce subito la
      // tastiera a chi scrive. Non c’è niente da aspettare qui.
      void eseguiComando(comando)
      return
    }
  })
}
