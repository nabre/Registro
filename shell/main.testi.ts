// I testi del main process: le fasi del riquadro d'avvio, gli avvisi dopo un
// aggiornamento, il dialogo che apre un anno e il primo «resto accanto
// all'orologio».

import { catalogo } from '../src/i18n/index.js'

const it = {
  avvioFermato: (motivo: string) => `L'avvio si è fermato: ${motivo}`,

  // Le fasi del riquadro d'avvio
  creoAnnoNuovo: 'Creo l’anno nuovo…',
  aproAnno: (nome: string) => `Apro l’anno ${nome}…`,
  preparoRegistro: 'Preparo il registro…',

  /** Il titolo del lettore quando chi lo apre non ne dà uno. */
  documento: 'Documento',

  // Gli aggiornamenti
  aggiornatoAlla: (versione: string) => `Regiclass è aggiornato alla versione ${versione}`,
  noteDellaRelease: 'Che cosa cambia lo trovi nelle note della release, su GitHub.',
  aggiornamentoFallito: 'L’aggiornamento non è andato a buon fine',
  giraAncora: (versione: string) =>
    `Gira ancora la versione ${versione}. Si può riprovare da ` +
    'Impostazioni › Programma › Aggiornamenti.',
  versionePronta: (versione: string) => `Regiclass ${versione} è pronto`,

  // Aprire un anno
  nonSiÈAperto: (file: string, motivo: string) => `${file} non si è aperto: ${motivo}`,
  estensioneNonValida: (file: string) => `${file} non è un documento Regiclass (.regi).`,
  apriUnAnno: 'Apri un anno del registro',

  // La prima X che non chiude
  restaAccantoAllOrologio: 'Il registro resta accanto all’orologio',
  comeSiRiapre:
    'Riaprilo con un clic sull’icona. Per chiuderlo davvero: tasto destro sull’icona → ' +
    '«Esci dal registro».',
}

export const testi = catalogo(it, {
  de: {
    avvioFermato: (motivo) => `Der Start wurde abgebrochen: ${motivo}`,
    creoAnnoNuovo: 'Neues Schuljahr wird angelegt…',
    aproAnno: (nome) => `Schuljahr ${nome} wird geöffnet…`,
    preparoRegistro: 'Klassenbuch wird vorbereitet…',
    documento: 'Dokument',
    aggiornatoAlla: (versione) => `Regiclass ist auf Version ${versione} aktualisiert`,
    noteDellaRelease: 'Was sich ändert, steht in den Release-Notes auf GitHub.',
    aggiornamentoFallito: 'Die Aktualisierung hat nicht geklappt',
    giraAncora: (versione) =>
      `Es läuft noch Version ${versione}. Du kannst es erneut versuchen unter ` +
      'Einstellungen › Programm › Aktualisierungen.',
    versionePronta: (versione) => `Regiclass ${versione} ist bereit`,
    nonSiÈAperto: (file, motivo) => `${file} liess sich nicht öffnen: ${motivo}`,
    estensioneNonValida: (file) => `${file} ist kein Regiclass-Dokument (.regi).`,
    apriUnAnno: 'Schuljahr des Klassenbuchs öffnen',
    restaAccantoAllOrologio: 'Das Klassenbuch bleibt neben der Uhr',
    comeSiRiapre:
      'Öffne es wieder mit einem Klick auf das Symbol. Um es wirklich zu schliessen: Rechtsklick ' +
      'auf das Symbol → «Klassenbuch beenden».',
  },
  fr: {
    avvioFermato: (motivo) => `Le démarrage s’est arrêté : ${motivo}`,
    creoAnnoNuovo: 'Création de la nouvelle année…',
    aproAnno: (nome) => `Ouverture de l’année ${nome}…`,
    preparoRegistro: 'Préparation du registre…',
    documento: 'Document',
    aggiornatoAlla: (versione) => `Regiclass est à jour, version ${versione}`,
    noteDellaRelease: 'Ce qui change se trouve dans les notes de version, sur GitHub.',
    aggiornamentoFallito: 'La mise à jour n’a pas abouti',
    giraAncora: (versione) =>
      `C’est encore la version ${versione} qui tourne. On peut réessayer depuis ` +
      'Paramètres › Programme › Mises à jour.',
    versionePronta: (versione) => `Regiclass ${versione} est prêt`,
    nonSiÈAperto: (file, motivo) => `${file} ne s’est pas ouvert : ${motivo}`,
    estensioneNonValida: (file) => `${file} n’est pas un document Regiclass (.regi).`,
    apriUnAnno: 'Ouvrir une année du registre',
    restaAccantoAllOrologio: 'Le registre reste près de l’horloge',
    comeSiRiapre:
      'Rouvre-le d’un clic sur l’icône. Pour le fermer vraiment : clic droit sur l’icône → ' +
      '« Quitter le registre ».',
  },
  en: {
    avvioFermato: (motivo) => `Start-up stopped: ${motivo}`,
    creoAnnoNuovo: 'Creating the new year…',
    aproAnno: (nome) => `Opening the year ${nome}…`,
    preparoRegistro: 'Getting the register ready…',
    documento: 'Document',
    aggiornatoAlla: (versione) => `Regiclass has been updated to version ${versione}`,
    noteDellaRelease: 'You’ll find what has changed in the release notes, on GitHub.',
    aggiornamentoFallito: 'The update did not succeed',
    giraAncora: (versione) =>
      `Version ${versione} is still running. You can try again from ` +
      'Settings › Program › Updates.',
    versionePronta: (versione) => `Regiclass ${versione} is ready`,
    nonSiÈAperto: (file, motivo) => `${file} did not open: ${motivo}`,
    estensioneNonValida: (file) => `${file} is not a Regiclass document (.regi).`,
    apriUnAnno: 'Open a year of the register',
    restaAccantoAllOrologio: 'The register stays next to the clock',
    comeSiRiapre:
      'Reopen it with a click on the icon. To really close it: right-click the icon → ' +
      '“Quit the register”.',
  },
})
