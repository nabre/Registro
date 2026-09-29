// I testi della finestra nativa delle impostazioni: il telaio della pagina e
// le parole sullo stato di ogni voce. Etichette, descrizioni e scelte arrivano
// con le voci (`vociImpostazioni()`, dal manifesto).

import { catalogo } from '../../../../core/i18n/index.js'

const it = {
  // Il telaio, in `settings.html`
  titolo: 'Impostazioni',
  filtroSegnaposto: 'Filtra le impostazioni per nome, chiave o descrizione…',
  filtroEtichetta: 'Filtra le impostazioni',
  rimando:
    'Senza un anno aperto qui si regola quel che vale su questo computer. ' +
    'Con un anno aperto le stesse impostazioni stanno nel registro, insieme a quelle dell’anno.',
  apriNelRegistro: 'Apri nel registro',

  /** Il gruppo chiuso delle voci rare, in fondo alla loro sezione. */
  avanzate: (quante: number) => 'Avanzate (' + quante + ')',
  spiegazione: (etichetta: string) => 'Spiegazione: ' + etichetta,
  sospesa: (padre: string) => 'sospesa · ' + padre + ' è spento',
  nonSiAccende: 'non si accende',
  alProssimoAvvio: 'al prossimo avvio',
  alProssimoAvvioAiuto: 'Il registro la legge quando parte: il cambio vale dal prossimo avvio',
  nessunaCorrisponde: 'Nessuna impostazione corrisponde.',
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Einstellungen',
    filtroSegnaposto: 'Einstellungen nach Name, Schlüssel oder Beschreibung filtern…',
    filtroEtichetta: 'Einstellungen filtern',
    rimando:
      'Ohne geöffnetes Schuljahr stellst du hier ein, was auf diesem Computer gilt. ' +
      'Mit einem geöffneten Schuljahr stehen dieselben Einstellungen im Klassenbuch, zusammen mit denen des Schuljahrs.',
    apriNelRegistro: 'Im Klassenbuch öffnen',
    avanzate: (quante) => 'Erweitert (' + quante + ')',
    spiegazione: (etichetta) => 'Erklärung: ' + etichetta,
    sospesa: (padre) => 'ausgesetzt · ' + padre + ' ist aus',
    nonSiAccende: 'lässt sich nicht einschalten',
    alProssimoAvvio: 'beim nächsten Start',
    alProssimoAvvioAiuto:
      'Das Klassenbuch liest sie beim Starten: die Änderung gilt ab dem nächsten Start',
    nessunaCorrisponde: 'Keine Einstellung passt.',
  },
  fr: {
    titolo: 'Paramètres',
    filtroSegnaposto: 'Filtrer les paramètres par nom, clé ou description…',
    filtroEtichetta: 'Filtrer les paramètres',
    rimando:
      'Sans année ouverte, on règle ici ce qui vaut sur cet ordinateur. ' +
      'Avec une année ouverte, les mêmes paramètres se trouvent dans le registre, avec ceux de l’année.',
    apriNelRegistro: 'Ouvrir dans le registre',
    avanzate: (quante) => 'Avancé (' + quante + ')',
    spiegazione: (etichetta) => 'Explication : ' + etichetta,
    sospesa: (padre) => 'suspendu · ' + padre + ' est désactivé',
    nonSiAccende: 'ne s’active pas',
    alProssimoAvvio: 'au prochain démarrage',
    alProssimoAvvioAiuto:
      'Le registre le lit au démarrage : le changement vaut dès le prochain démarrage',
    nessunaCorrisponde: 'Aucun paramètre ne correspond.',
  },
  en: {
    titolo: 'Settings',
    filtroSegnaposto: 'Filter the settings by name, key or description…',
    filtroEtichetta: 'Filter the settings',
    rimando:
      'With no year open, here you set what applies on this computer. ' +
      'With a year open, the same settings are in the register, together with the year’s.',
    apriNelRegistro: 'Open in the register',
    avanzate: (quante) => 'Advanced (' + quante + ')',
    spiegazione: (etichetta) => 'Explanation: ' + etichetta,
    sospesa: (padre) => 'suspended · ' + padre + ' is off',
    nonSiAccende: 'won’t turn on',
    alProssimoAvvio: 'at next start',
    alProssimoAvvioAiuto: 'The register reads it when it starts: the change applies from the next start',
    nessunaCorrisponde: 'No setting matches.',
  },
})
