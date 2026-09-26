// I testi delle procedure di `intestazione`. Si leggono al momento dell'uso,
// mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  cartaId: 'La carta intestata: un id di impostazioni.intestazione.carte',
  logo: {
    titolo:
      'Il logo della carta intestata: si sceglie dal disco e se ne tiene una copia nel documento',
  },
  togliLogo: {
    titolo:
      'Via il logo dalla carta intestata: i fogli escono senza, e il file esce dal documento ' +
      'dell’anno',
  },
}

export const testi = catalogo(it, {
  de: {
    cartaId: 'Das Briefpapier: eine ID aus impostazioni.intestazione.carte',
    logo: {
      titolo:
        'Das Logo des Briefpapiers: Es wird auf der Festplatte ausgewählt, und eine Kopie ' +
        'bleibt im Dokument',
    },
    togliLogo: {
      titolo:
        'Entfernt das Logo vom Briefpapier: Die Blätter erscheinen ohne, und die Datei ' +
        'verlässt das Jahresdokument',
    },
  },
  fr: {
    cartaId: 'Le papier à en-tête : un id de impostazioni.intestazione.carte',
    logo: {
      titolo:
        'Le logo du papier à en-tête : on le choisit sur le disque et on en garde une copie ' +
        'dans le document',
    },
    togliLogo: {
      titolo:
        'Retire le logo du papier à en-tête : les feuilles sortent sans, et le fichier quitte ' +
        'le document de l’année',
    },
  },
  en: {
    cartaId: 'The letterhead: an id from impostazioni.intestazione.carte',
    logo: {
      titolo: 'The letterhead’s logo: it is picked from disk and a copy is kept in the document',
    },
    togliLogo: {
      titolo:
        'Removes the logo from the letterhead: sheets come out without it, and the file ' +
        'leaves the year document',
    },
  },
})
