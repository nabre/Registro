// I testi di `exports.ts`: i documenti già esportati. «Aggiorna» si chiama come
// `parole().aggiorna` in ogni lingua.

import { catalogo } from '../i18n/index.js'

const it = {
  nonEsportato: 'Non è un documento esportato.',
  sparitoSiRifa: 'Quel documento non c’è più: si rifà con «Aggiorna».',
  nonApribile: 'Il documento c’è, ma non si è potuto aprire da qui.',
  /** Il titolo della finestra quando il percorso non dà un nome. */
  documento: 'Documento',
  sparito: 'Quel documento non c’è più.',
  buttato: 'Documento buttato via. Si rifà con «Aggiorna».',
}

export const testi = catalogo(it, {
  de: {
    nonEsportato: 'Das ist kein exportiertes Dokument.',
    sparitoSiRifa: 'Dieses Dokument gibt es nicht mehr: Mit «Aktualisieren» wird es neu erstellt.',
    nonApribile: 'Das Dokument ist da, liess sich aber von hier aus nicht öffnen.',
    documento: 'Dokument',
    sparito: 'Dieses Dokument gibt es nicht mehr.',
    buttato: 'Dokument gelöscht. Mit «Aktualisieren» wird es neu erstellt.',
  },
  fr: {
    nonEsportato: 'Ce n’est pas un document exporté.',
    sparitoSiRifa: 'Ce document n’existe plus : refais-le avec « Mettre à jour ».',
    nonApribile: 'Le document existe, mais il n’a pas pu être ouvert d’ici.',
    documento: 'Document',
    sparito: 'Ce document n’existe plus.',
    buttato: 'Document supprimé. Refais-le avec « Mettre à jour ».',
  },
  en: {
    nonEsportato: 'That isn’t an exported document.',
    sparitoSiRifa: 'That document is no longer there: press “Update” to make it again.',
    nonApribile: 'The document is there, but it couldn’t be opened from here.',
    documento: 'Document',
    sparito: 'That document is no longer there.',
    buttato: 'Document deleted. Press “Update” to make it again.',
  },
})
