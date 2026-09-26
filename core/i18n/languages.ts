// Le lingue del registro e come si riconoscono le etichette di sistema.
// L'italiano è la lingua di partenza e di ripiego. Quella di adesso sta in
// `state.ts`.

/**
 * Le lingue, nell'ordine della tendina. Aggiungerne una qui fa fallire la
 * compilazione di ogni catalogo finché non ha la traduzione.
 */
export const LINGUE = ['it', 'de', 'fr', 'en'] as const

export type Lingua = typeof LINGUE[number]

/** La lingua dei testi di partenza, e quella a cui si ripiega. */
export const LINGUA_PREDEFINITA: Lingua = 'it'

/** Come ogni lingua chiama sé stessa: non si traducono, così ognuno trova la propria. */
export const NOMI_DELLE_LINGUE: Readonly<Record<Lingua, string>> = {
  it: 'Italiano',
  de: 'Deutsch',
  fr: 'Français',
  en: 'English',
}

/**
 * L'etichetta BCP 47 per `Intl`. Svizzere dove c'è una forma svizzera (`de-CH`:
 * migliaia con l'apostrofo); `en-GB` perché mette il giorno prima del mese.
 */
export const LOCALI: Readonly<Record<Lingua, string>> = {
  it: 'it-CH',
  de: 'de-CH',
  fr: 'fr-CH',
  en: 'en-GB',
}

/** Vero se il valore è una delle lingue del registro. */
export function èLingua (valore: unknown): valore is Lingua {
  return typeof valore === 'string' && (LINGUE as readonly string[]).includes(valore)
}

/**
 * La lingua di un'etichetta di sistema (`de-CH`, `it_CH.UTF-8`, `EN`), o null.
 * Conta solo la parte prima del primo separatore.
 */
export function linguaDaEtichetta (etichetta: string | null | undefined): Lingua | null {
  if (!etichetta) return null
  const lingua = etichetta.trim().toLowerCase().split(/[-_.@]/)[0]
  return èLingua(lingua) ? lingua : null
}

/** La scelta dell'impostazione che vuol dire «come il sistema». */
export const SCELTA_SISTEMA = 'sistema'

/**
 * La lingua in cui parlare. Una scelta valida vale sempre; altrimenti la prima
 * lingua del sistema, e se non è una delle nostre l'italiano (le lingue di
 * riserva del sistema non si guardano: non sono una scelta).
 */
export function risolviLingua (scelta: unknown, linguePreferite: readonly string[]): Lingua {
  if (èLingua(scelta)) return scelta
  return linguaDaEtichetta(linguePreferite[0]) ?? LINGUA_PREDEFINITA
}
