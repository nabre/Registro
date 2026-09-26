// I testi di `tray.ts`: le voci fisse del menu dell'icona accanto all'orologio.
// Quel che dice delle ore e dei corsi sta in `domain/tray.testi.ts`; il marchio
// «Regiclass» non si traduce.

import { catalogo } from './i18n/index.js'

const it = {
  /** La seconda riga del suggerimento, sotto il marchio, quando non c'è un anno. */
  nessunAnnoAperto: 'Nessun anno aperto',
  adesso: (etichetta: string) => `Adesso: ${etichetta}`,
  nessunCorso: 'Nessun corso con ore in questo anno',
  apriRegistro: 'Apri il registro',
  vaiAOggi: 'Vai a oggi',
  esci: 'Esci dal registro',
  nonDisponibile: (nome: string) => `${nome} — non disponibile`,
  /** La riga spenta in cima al menu senza anno, dopo il marchio. */
  intestazioneSenzaAnno: 'nessun anno aperto',
  preferiti: 'Preferiti',
  recenti: 'Recenti',
  nessunRecente: 'Nessun anno recente',
  apriAnno: 'Apri un anno…',
  creaAnno: 'Crea un nuovo anno…',
  benvenuto: 'Mostra il benvenuto',
  altre: (n: number) => `e altre ${n}…`,
  apriCorso: 'Apri il corso',
}

export const testi = catalogo(it, {
  de: {
    nessunAnnoAperto: 'Kein Schuljahr geöffnet',
    adesso: (etichetta) => `Jetzt: ${etichetta}`,
    nessunCorso: 'Kein Kurs mit Unterricht in diesem Schuljahr',
    apriRegistro: 'Klassenbuch öffnen',
    vaiAOggi: 'Zu heute',
    esci: 'Klassenbuch beenden',
    nonDisponibile: (nome) => `${nome} — nicht verfügbar`,
    intestazioneSenzaAnno: 'kein Schuljahr geöffnet',
    preferiti: 'Favoriten',
    recenti: 'Zuletzt verwendet',
    nessunRecente: 'Kein zuletzt verwendetes Schuljahr',
    apriAnno: 'Schuljahr öffnen…',
    creaAnno: 'Neues Schuljahr anlegen…',
    benvenuto: 'Willkommen anzeigen',
    altre: (n) => `und ${n} weitere…`,
    apriCorso: 'Kurs öffnen',
  },
  fr: {
    nessunAnnoAperto: 'Aucune année ouverte',
    adesso: (etichetta) => `Maintenant : ${etichetta}`,
    nessunCorso: 'Aucun cours avec des leçons cette année',
    apriRegistro: 'Ouvrir le registre',
    vaiAOggi: 'Aller à aujourd’hui',
    esci: 'Quitter le registre',
    nonDisponibile: (nome) => `${nome} — non disponible`,
    intestazioneSenzaAnno: 'aucune année ouverte',
    preferiti: 'Favoris',
    recenti: 'Récents',
    nessunRecente: 'Aucune année récente',
    apriAnno: 'Ouvrir une année…',
    creaAnno: 'Créer une nouvelle année…',
    benvenuto: 'Afficher l’accueil',
    altre: (n) => `et ${n} autres…`,
    apriCorso: 'Ouvrir le cours',
  },
  en: {
    nessunAnnoAperto: 'No year open',
    adesso: (etichetta) => `Now: ${etichetta}`,
    nessunCorso: 'No course with lessons this year',
    apriRegistro: 'Open the register',
    vaiAOggi: 'Go to today',
    esci: 'Quit the register',
    nonDisponibile: (nome) => `${nome} — not available`,
    intestazioneSenzaAnno: 'no year open',
    preferiti: 'Favourites',
    recenti: 'Recent',
    nessunRecente: 'No recent years',
    apriAnno: 'Open a year…',
    creaAnno: 'Create a new year…',
    benvenuto: 'Show the welcome screen',
    altre: (n) => `and ${n} more…`,
    apriCorso: 'Open the course',
  },
})
