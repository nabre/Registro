// I nomi che la normalizzazione (`normalization.ts`) dà a quel che arriva dal
// disco senza nome, quando il lessico non li ha. Finiscono nel documento nella
// lingua del momento.

import { catalogo } from '../i18n/index.js'

const it = {
  recapito: 'Recapito',
  senzaOggetto: 'Senza oggetto',
  classeSenzaNome: 'Classe senza nome',
}

export const testi = catalogo(it, {
  de: {
    recapito: 'Kontaktadresse',
    senzaOggetto: 'Ohne Betreff',
    classeSenzaNome: 'Klasse ohne Namen',
  },
  fr: {
    recapito: 'Adresse de contact',
    senzaOggetto: 'Sans objet',
    classeSenzaNome: 'Classe sans nom',
  },
  en: {
    recapito: 'Contact address',
    senzaOggetto: 'No subject',
    classeSenzaNome: 'Unnamed class',
  },
})
