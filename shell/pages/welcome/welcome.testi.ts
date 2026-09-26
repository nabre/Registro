// I testi della pagina di benvenuto: il telaio di `welcome.html` e le parole
// dell'elenco degli anni. L'invito e la versione li manda il main process
// (`shell/windows/welcome.testi.ts`), gli aggiornamenti arrivano già detti.

import { catalogo } from '../../../src/i18n/index.js'

const it = {
  // Il telaio, in `welcome.html`
  nascondiNotizia: 'Nascondi fino alla prossima novità',
  apriAnno: 'Apri un anno…',
  apriAnnoSotto: 'un documento «.regi» che hai già',
  creaAnno: 'Crea un nuovo anno…',
  creaAnnoSotto: 'date, semestri e vacanze, in un file nuovo',
  recenti: 'Recenti e preferiti',

  // L'elenco
  nonDisponibile: (cartella: string) => 'non disponibile — ' + cartella,
  togliDaiPreferiti: 'Togli dai preferiti',
  tieniDaParte: 'Tieni da parte: i preferiti non scadono',
  dimentica: 'Togli dall’elenco. Il file sul disco non si tocca',
  nessunAnno: 'Nessun anno aperto finora: comincia creandone uno.',
}

export const testi = catalogo(it, {
  de: {
    nascondiNotizia: 'Bis zur nächsten Neuigkeit ausblenden',
    apriAnno: 'Schuljahr öffnen…',
    apriAnnoSotto: 'ein «.regi»-Dokument, das du schon hast',
    creaAnno: 'Neues Schuljahr anlegen…',
    creaAnnoSotto: 'Daten, Semester und Ferien, in einer neuen Datei',
    recenti: 'Zuletzt geöffnet und Favoriten',
    nonDisponibile: (cartella) => 'nicht verfügbar — ' + cartella,
    togliDaiPreferiti: 'Aus den Favoriten entfernen',
    tieniDaParte: 'Aufbewahren: Favoriten verfallen nicht',
    dimentica: 'Aus der Liste entfernen. Die Datei auf der Festplatte bleibt unberührt',
    nessunAnno: 'Noch kein Schuljahr geöffnet: Beginne damit, eines anzulegen.',
  },
  fr: {
    nascondiNotizia: 'Masquer jusqu’à la prochaine nouveauté',
    apriAnno: 'Ouvrir une année…',
    apriAnnoSotto: 'un document « .regi » que tu as déjà',
    creaAnno: 'Créer une nouvelle année…',
    creaAnnoSotto: 'dates, semestres et vacances, dans un nouveau fichier',
    recenti: 'Récents et favoris',
    nonDisponibile: (cartella) => 'indisponible — ' + cartella,
    togliDaiPreferiti: 'Retirer des favoris',
    tieniDaParte: 'Mettre de côté : les favoris n’expirent pas',
    dimentica: 'Retirer de la liste. Le fichier sur le disque n’est pas touché',
    nessunAnno: 'Aucune année ouverte jusqu’ici : commence par en créer une.',
  },
  en: {
    nascondiNotizia: 'Hide until there is something new',
    apriAnno: 'Open a year…',
    apriAnnoSotto: 'a “.regi” document you already have',
    creaAnno: 'Create a new year…',
    creaAnnoSotto: 'dates, semesters and holidays, in a new file',
    recenti: 'Recent and favourites',
    nonDisponibile: (cartella) => 'not available — ' + cartella,
    togliDaiPreferiti: 'Remove from favourites',
    tieniDaParte: 'Keep aside: favourites don’t expire',
    dimentica: 'Remove from the list. The file on disk is not touched',
    nessunAnno: 'No year opened so far: start by creating one.',
  },
})
