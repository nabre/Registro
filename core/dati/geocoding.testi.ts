// I testi di `geocoding.ts`: perché un indirizzo non è sulla mappa. Si leggono
// nel cartellino accanto al nome, scritti per chi insegna.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Il dettaglio fra parentesi di `nonRisponde`: minuscolo, segue la frase. */
  haRisposto: (stato: number) => `il servizio ha risposto ${stato}`,
  indirizzoVuoto: 'Indirizzo vuoto.',
  nonRisponde: (dettaglio: string) => `Il servizio non risponde (${dettaglio}).`,
  nessunRisultato: 'Nessun risultato, nemmeno per il paese.',
}

export const testi = catalogo(it, {
  de: {
    haRisposto: (stato) => `der Dienst hat mit ${stato} geantwortet`,
    indirizzoVuoto: 'Leere Adresse.',
    nonRisponde: (dettaglio) => `Der Dienst antwortet nicht (${dettaglio}).`,
    nessunRisultato: 'Kein Ergebnis, nicht einmal für den Ort.',
  },
  fr: {
    haRisposto: (stato) => `le service a répondu ${stato}`,
    indirizzoVuoto: 'Adresse vide.',
    nonRisponde: (dettaglio) => `Le service ne répond pas (${dettaglio}).`,
    nessunRisultato: 'Aucun résultat, même pas pour la localité.',
  },
  en: {
    haRisposto: (stato) => `the service responded with ${stato}`,
    indirizzoVuoto: 'Empty address.',
    nonRisponde: (dettaglio) => `The service isn’t responding (${dettaglio}).`,
    nessunRisultato: 'No result, not even for the town.',
  },
})
