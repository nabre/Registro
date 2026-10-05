// I comandi del programma: il documento, Modifica, la finestra e la
// manutenzione. Vivono in `['app']`: il menu «File», la palette, le scorciatoie.

import { parole } from '#core/dominio/words.testi.js'
import { riparazioni } from '#core/dominio/repairs.js'
import { titoloComando } from '#contract/manifest.js'
import type { ComandoUI } from '#ui/commands.js'
import { testi as testiComuni } from '#ui/commands.testi.js'
import { moduloAnno, moduloImportaRegistro, moduloPause } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import { apriOneDrive } from '#ui/forms/oneDrive.js'
import { apriInformazioniDocumento } from '#ui/forms/documentInfo.js'
import { senzaAnno } from '#ui/context.js'
import { annoCorrente, stato } from '#ui/state.js'
import { perchéNonUnAltra, èFiglia } from '#ui/windows.js'
import { testi } from './program.testi.js'

// Testi letti una volta: la pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
const t = testi()
const comuni = testiComuni()
const G = comuni.gruppi
const P = parole()

export const COMANDI_PROGRAMMA: readonly ComandoUI[] = [
  // ----------------------------------------------------------------- File
  // «Nuovo», poi «Apri», come in ogni menu «File». Un anno nuovo nasce in un
  // file suo, quindi sta con i gesti del documento.
  {
    id: 'file.nuovoAnno',
    titolo: () => titoloComando('registroDocenti.nuovoAnno'),
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
    // Un `.regi` che sta su OneDrive: la finestra è del pannello, quindi niente
    // menu nativo.
    id: 'file.apriDaOneDrive',
    titolo: t.apriDaOneDrive,
    simbolo: 'collegamento',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.apriDaOneDriveAiuto,
    al: () => apriOneDrive(),
  },
  {
    // Dopo «Apri»: l'altro modo di servirsi di un anno non aperto, portandone
    // qui quel che vale. Apre una finestra del pannello, quindi non è nel menu
    // nativo (`contract/manifest.ts`).
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
    titolo: () => (stato.documenti.provvisorio ? titoloComando('registroDocenti.salvaConNome') : P.salva),
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
    titolo: () => titoloComando('registroDocenti.chiudiDocumento'),
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
    // Quel che stava in Impostazioni › «Questo file»: un file non è
    // un'impostazione (skill `impostazione`, § «Il sistema delle pagine»).
    id: 'file.informazioni',
    titolo: t.informazioni,
    simbolo: 'informazione',
    dove: ['app'],
    gruppo: G.documento,
    aiuto: t.informazioniAiuto,
    al: () => apriInformazioniDocumento(),
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
    titolo: comuni.annulla,
    simbolo: 'annulla',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.modifica,
    aiuto: () => stato.storia.annulla > 0
      ? comuni.annullaAiutoPassi(stato.storia.annulla)
      : comuni.annullaAiuto,
    scorciatoia: 'Ctrl+Z',
    impedimento: () => stato.storia.annulla > 0 ? null : comuni.nienteDaAnnullare,
    al: () => azione({ tipo: 'storia.annulla' }),
  },
  {
    id: 'modifica.ripristina',
    titolo: comuni.ripristina,
    simbolo: 'ripristina',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.modifica,
    aiuto: () => stato.storia.ripristina > 0
      ? comuni.ripristinaAiutoPassi(stato.storia.ripristina)
      : comuni.ripristinaAiuto,
    scorciatoia: 'Ctrl+Y',
    impedimento: () => stato.storia.ripristina > 0 ? null : comuni.nienteDaRipristinare,
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
    // Un'altra finestra sul posto di adesso, con gli stessi id scelti: lo
    // stesso comando del menu nativo, che però non sa dove si guarda.
    id: 'finestra.nuova',
    titolo: () => titoloComando('registroDocenti.nuovaFinestra'),
    simbolo: 'duplica',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    aiuto: t.nuovaFinestraAiuto,
    scorciatoia: 'Ctrl+Shift+N',
    dalMenu: true,
    impedimento: () => perchéNonUnAltra(stato.programma),
    al: () => azione({ tipo: 'finestra.nuova', posto: stato.posto, contesto: stato.contesto }),
  },
  {
    id: 'finestra.principale',
    titolo: () => titoloComando('registroDocenti.finestraPrincipale'),
    simbolo: 'sinistra',
    dove: ['app'],
    fuoriMenu: true,
    gruppo: G.finestra,
    aiuto: t.finestraPrincipaleAiuto,
    scorciatoia: 'Ctrl+Shift+1',
    dalMenu: true,
    // Solo da una figlia: nella principale ci si è già.
    soloSe: () => èFiglia(),
    al: () => azione({ tipo: 'finestra.principale' }),
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
  // stanno nelle sezioni (`views/settings.tsx`).
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
]
