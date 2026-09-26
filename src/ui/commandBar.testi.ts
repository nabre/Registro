// I testi della barra dei comandi (`commandBar.ts`): il menu «File» con i
// registri recenti e preferiti, le tendine del contesto, la scheda della
// proiezione e l'interruttore delle azioni.

import { catalogo } from '../i18n/index.js'

const it = {
  // Il tasto destro su un registro recente.
  togliDaiPreferiti: 'Togli dai preferiti',
  aggiungiAiPreferiti: 'Aggiungi ai preferiti',
  togliDallElenco: 'Togli dall’elenco',
  eQuelloAperto: 'È il registro aperto: torna nell’elenco da sé',
  togliRiga: 'Toglie la riga dall’elenco. Il file resta dov’è',
  nonDisponibile: ' — non disponibile',
  recenteTitolo: (percorso: string) =>
    `${percorso}\nTasto destro: preferiti, togli dall’elenco`,
  fileSparito:
    'Il file non si trova più lì. Tasto destro per toglierlo dall’elenco.',
  preferiti: 'Preferiti',
  recenti: 'Recenti',

  // La barra.
  comandiSchermo: 'I comandi dello schermo per la classe',
  proiezione: 'Proiezione',
  file: 'File',
  fileTitolo: 'Nuovo, apri, salva, chiudi: il documento dell’anno',

  // Le tendine del contesto.
  corso: 'Corso',
  corsoTitolo: 'Il corso su cui sono puntate le pagine del registro',
  classe: 'Classe',
  classeFascicoloTitolo: 'La classe di cui si sta guardando il fascicolo',
  classePaginaTitolo: 'La classe di cui si guardano le persone',
  archiviata: (classe: string) => `${classe} (archiviata)`,
  corsoAgendaTitolo:
    'Restringe il calendario a un corso. Non cambia il corso del registro.',
  tuttiICorsi: 'Tutti i corsi',
  anno: 'Anno',
  annoTitolo: 'L’anno scolastico in uso',
  periodoTitolo:
    'I conteggi — medie, assenze, lezioni — si fermano a questo periodo',
  annoIntero: 'Anno intero',
  classeMappaTitolo: 'Le case e le aziende di una classe sola, o di tutte',
  tutteLeClassi: 'Tutte le classi',

  // Le azioni della pagina.
  mostraAzioniTitolo: 'Mostra le azioni (Ctrl+B)',
  nascondiAzioniTitolo: 'Nascondi le azioni (Ctrl+B)',
  mostraAzioni: 'Mostra le azioni',
  nascondiAzioni: 'Nascondi le azioni',
  azioniDi: (di: string) => `Azioni: ${di}`,
}

export const testi = catalogo(it, {
  de: {
    togliDaiPreferiti: 'Aus den Favoriten entfernen',
    aggiungiAiPreferiti: 'Zu den Favoriten hinzufügen',
    togliDallElenco: 'Aus der Liste entfernen',
    eQuelloAperto:
      'Das ist das offene Klassenbuch: Es kommt von selbst in die Liste zurück',
    togliRiga: 'Entfernt die Zeile aus der Liste. Die Datei bleibt, wo sie ist',
    nonDisponibile: ' — nicht verfügbar',
    recenteTitolo: (percorso) =>
      `${percorso}\nRechte Maustaste: Favoriten, aus der Liste entfernen`,
    fileSparito:
      'Die Datei ist nicht mehr dort. Mit der rechten Maustaste lässt sie sich aus der Liste ' +
      'entfernen.',
    preferiti: 'Favoriten',
    recenti: 'Zuletzt geöffnet',
    comandiSchermo: 'Die Befehle des Bildschirms für die Klasse',
    proiezione: 'Projektion',
    file: 'Datei',
    fileTitolo:
      'Neu, öffnen, speichern, schliessen: das Dokument des Schuljahrs',
    corso: 'Kurs',
    corsoTitolo: 'Der Kurs, auf den die Seiten des Klassenbuchs gerichtet sind',
    classe: 'Klasse',
    classeFascicoloTitolo: 'Die Klasse, deren Dossier man gerade ansieht',
    classePaginaTitolo: 'Die Klasse, deren Personen man ansieht',
    archiviata: (classe) => `${classe} (archiviert)`,
    corsoAgendaTitolo:
      'Beschränkt den Kalender auf einen Kurs. Ändert nicht den Kurs des Klassenbuchs.',
    tuttiICorsi: 'Alle Kurse',
    anno: 'Schuljahr',
    annoTitolo: 'Das laufende Schuljahr',
    periodoTitolo:
      'Die Zählungen — Durchschnitte, Absenzen, Stunden — enden bei diesem Zeitraum',
    annoIntero: 'Ganzes Jahr',
    classeMappaTitolo:
      'Die Wohnorte und Betriebe einer einzigen Klasse, oder aller',
    tutteLeClassi: 'Alle Klassen',
    mostraAzioniTitolo: 'Aktionen anzeigen (Ctrl+B)',
    nascondiAzioniTitolo: 'Aktionen ausblenden (Ctrl+B)',
    mostraAzioni: 'Aktionen anzeigen',
    nascondiAzioni: 'Aktionen ausblenden',
    azioniDi: (di) => `Aktionen: ${di}`,
  },
  fr: {
    togliDaiPreferiti: 'Retirer des favoris',
    aggiungiAiPreferiti: 'Ajouter aux favoris',
    togliDallElenco: 'Retirer de la liste',
    eQuelloAperto:
      'C’est le registre ouvert : il revient tout seul dans la liste',
    togliRiga: 'Retire la ligne de la liste. Le fichier reste où il est',
    nonDisponibile: ' — non disponible',
    recenteTitolo: (percorso) =>
      `${percorso}\nClic droit : favoris, retirer de la liste`,
    fileSparito:
      'Le fichier n’est plus là. Clic droit pour le retirer de la liste.',
    preferiti: 'Favoris',
    recenti: 'Récents',
    comandiSchermo: 'Les commandes de l’écran pour la classe',
    proiezione: 'Projection',
    file: 'Fichier',
    fileTitolo: 'Nouveau, ouvrir, enregistrer, fermer : le document de l’année',
    corso: 'Cours',
    corsoTitolo: 'Le cours sur lequel sont réglées les pages du registre',
    classe: 'Classe',
    classeFascicoloTitolo: 'La classe dont on regarde le dossier',
    classePaginaTitolo: 'La classe dont on regarde les personnes',
    archiviata: (classe) => `${classe} (archivée)`,
    corsoAgendaTitolo:
      'Limite le calendrier à un cours. Ne change pas le cours du registre.',
    tuttiICorsi: 'Tous les cours',
    anno: 'Année',
    annoTitolo: 'L’année scolaire en cours',
    periodoTitolo:
      'Les calculs — moyennes, absences, heures — s’arrêtent à cette période',
    annoIntero: 'Année entière',
    classeMappaTitolo:
      'Les domiciles et les entreprises d’une seule classe, ou de toutes',
    tutteLeClassi: 'Toutes les classes',
    mostraAzioniTitolo: 'Afficher les actions (Ctrl+B)',
    nascondiAzioniTitolo: 'Masquer les actions (Ctrl+B)',
    mostraAzioni: 'Afficher les actions',
    nascondiAzioni: 'Masquer les actions',
    azioniDi: (di) => `Actions : ${di}`,
  },
  en: {
    togliDaiPreferiti: 'Remove from favourites',
    aggiungiAiPreferiti: 'Add to favourites',
    togliDallElenco: 'Remove from list',
    eQuelloAperto:
      'This is the open register: it comes back into the list by itself',
    togliRiga: 'Removes the row from the list. The file stays where it is',
    nonDisponibile: ' — not available',
    recenteTitolo: (percorso) =>
      `${percorso}\nRight-click: favourites, remove from list`,
    fileSparito:
      'The file is no longer there. Right-click to remove it from the list.',
    preferiti: 'Favourites',
    recenti: 'Recent',
    comandiSchermo: 'The class screen commands',
    proiezione: 'Projection',
    file: 'File',
    fileTitolo: 'New, open, save, close: the year’s document',
    corso: 'Course',
    corsoTitolo: 'The course the register’s pages are set to',
    classe: 'Class',
    classeFascicoloTitolo: 'The class whose class file you are looking at',
    classePaginaTitolo: 'The class whose people you are looking at',
    archiviata: (classe) => `${classe} (archived)`,
    corsoAgendaTitolo:
      'Narrows the calendar to one course. It does not change the register’s course.',
    tuttiICorsi: 'All courses',
    anno: 'Year',
    annoTitolo: 'The school year in use',
    periodoTitolo:
      'The counts — averages, absences, lessons — stop at this period',
    annoIntero: 'Whole year',
    classeMappaTitolo: 'The homes and companies of a single class, or of all',
    tutteLeClassi: 'All classes',
    mostraAzioniTitolo: 'Show actions (Ctrl+B)',
    nascondiAzioniTitolo: 'Hide actions (Ctrl+B)',
    mostraAzioni: 'Show actions',
    nascondiAzioni: 'Hide actions',
    azioniDi: (di) => `Actions: ${di}`,
  },
})
