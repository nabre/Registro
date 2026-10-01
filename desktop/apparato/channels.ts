// I nomi dei canali IPC, condivisi fra main process e preload (bundle a parte).
// Solo stringhe, senza `electron`, così il preload non si tira dietro altro.

/** Il canale unico dei messaggi, nelle due direzioni. Chi ascolta distingue il mittente. */
export const CANALE = 'registro:messaggio'

/** Lo stato dell'interfaccia di una pagina: `leggi` all'avvio, `scrivi` a ogni modifica. */
export const CANALE_INTERFACCIA = 'registro:interfaccia'

/** La lingua della pagina, letta in modo sincrono dal preload (`environment/language.ts`). */
export const CANALE_LINGUA = 'registro:lingua'

/** I discriminanti noti per i messaggi che transitano su `CANALE`. */
const DISCRIMINANTI_CANALE = [
  'tipo',
  'azione',
  'procedura',
  'storia',
  'campioni',
  'segui',
  'dialogo',
  'benvenuto',
  'impostazioni',
  'avvio',
  // Le opzioni di sviluppo: il main process ascolta solo con `npm run dev`.
  'sviluppo',
] as const

/** Verifica se un messaggio è un oggetto non nullo avente una proprietà tra quelle in `DISCRIMINANTI_CANALE`. */
export function haDiscriminanteCanale (messaggio: unknown): boolean {
  if (typeof messaggio !== 'object' || messaggio === null) return false
  return DISCRIMINANTI_CANALE.some((chiave) => chiave in messaggio)
}
