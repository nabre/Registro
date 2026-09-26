// I testi del menu e della finestra nativa delle impostazioni: gruppi, voci
// che non sono comandi, ruoli di Electron, rifiuti senza motivo della dogana.
// I titoli dei comandi vengono da `src/manifest.testi.ts`.

import { catalogo } from '../../src/i18n/index.js'

/** I gruppi del menu, per nome: l'ordine e i comandi dentro stanno in `menu.ts`. */
export type GruppoDelMenu = 'registro' | 'vaiA' | 'nuovo' | 'schermo' | 'posta' | 'cartelle'

const it = {
  gruppi: {
    registro: 'Registro',
    vaiA: 'Vai a',
    nuovo: 'Nuovo',
    schermo: 'Schermo',
    posta: 'Posta',
    cartelle: 'Cartelle',
  } satisfies Record<GruppoDelMenu, string>,
  /** Il gruppo dei comandi che nessun gruppo nomina. */
  altro: 'Altro',

  apri: 'Apri…',
  apriRecente: 'Apri un anno recente',
  /** In coda a un anno recente il cui file adesso non c'è. */
  nonDisponibile: 'non disponibile',
  impostazioniDelProgramma: 'Impostazioni del programma…',
  disinstalla: 'Disinstalla…',

  // «Modifica» e «Visualizza»: ruoli di Electron, con il nome del registro
  modifica: 'Modifica',
  annullaGesto: 'Annulla',
  ripeti: 'Ripeti',
  taglia: 'Taglia',
  selezionaTutto: 'Seleziona tutto',
  visualizza: 'Visualizza',
  dimensioneNormale: 'Dimensione normale',
  ingrandisci: 'Ingrandisci',
  riduci: 'Riduci',
  schermoIntero: 'Schermo intero',
  strumentiDiSviluppo: 'Strumenti di sviluppo',

  // La finestra delle impostazioni
  valoreRifiutato: 'Valore non accettato.',
  percorsoRifiutato: 'Percorso non accettato.',
}

export const testi = catalogo(it, {
  de: {
    gruppi: {
      registro: 'Klassenbuch',
      vaiA: 'Gehe zu',
      nuovo: 'Neu',
      schermo: 'Bildschirm',
      posta: 'E-Mail',
      cartelle: 'Ordner',
    },
    altro: 'Weitere',
    apri: 'Öffnen…',
    apriRecente: 'Zuletzt geöffnetes Schuljahr',
    nonDisponibile: 'nicht verfügbar',
    impostazioniDelProgramma: 'Programmeinstellungen…',
    disinstalla: 'Deinstallieren…',
    modifica: 'Bearbeiten',
    annullaGesto: 'Rückgängig',
    ripeti: 'Wiederholen',
    taglia: 'Ausschneiden',
    selezionaTutto: 'Alles auswählen',
    visualizza: 'Ansicht',
    dimensioneNormale: 'Originalgrösse',
    ingrandisci: 'Vergrössern',
    riduci: 'Verkleinern',
    schermoIntero: 'Vollbild',
    strumentiDiSviluppo: 'Entwicklertools',
    valoreRifiutato: 'Wert nicht angenommen.',
    percorsoRifiutato: 'Pfad nicht angenommen.',
  },
  fr: {
    gruppi: {
      registro: 'Registre',
      vaiA: 'Aller à',
      nuovo: 'Nouveau',
      schermo: 'Écran',
      posta: 'Messagerie',
      cartelle: 'Dossiers',
    },
    altro: 'Autres',
    apri: 'Ouvrir…',
    apriRecente: 'Ouvrir une année récente',
    nonDisponibile: 'indisponible',
    impostazioniDelProgramma: 'Paramètres du programme…',
    disinstalla: 'Désinstaller…',
    modifica: 'Édition',
    annullaGesto: 'Annuler',
    ripeti: 'Rétablir',
    taglia: 'Couper',
    selezionaTutto: 'Tout sélectionner',
    visualizza: 'Affichage',
    dimensioneNormale: 'Taille réelle',
    ingrandisci: 'Zoom avant',
    riduci: 'Zoom arrière',
    schermoIntero: 'Plein écran',
    strumentiDiSviluppo: 'Outils de développement',
    valoreRifiutato: 'Valeur non acceptée.',
    percorsoRifiutato: 'Chemin non accepté.',
  },
  en: {
    gruppi: {
      registro: 'Register',
      vaiA: 'Go to',
      nuovo: 'New',
      schermo: 'Screen',
      posta: 'Mail',
      cartelle: 'Folders',
    },
    altro: 'More',
    apri: 'Open…',
    apriRecente: 'Open a recent year',
    nonDisponibile: 'not available',
    impostazioniDelProgramma: 'Program settings…',
    disinstalla: 'Uninstall…',
    modifica: 'Edit',
    annullaGesto: 'Undo',
    ripeti: 'Redo',
    taglia: 'Cut',
    selezionaTutto: 'Select all',
    visualizza: 'View',
    dimensioneNormale: 'Actual size',
    ingrandisci: 'Zoom in',
    riduci: 'Zoom out',
    schermoIntero: 'Full screen',
    strumentiDiSviluppo: 'Developer tools',
    valoreRifiutato: 'Value not accepted.',
    percorsoRifiutato: 'Path not accepted.',
  },
})
