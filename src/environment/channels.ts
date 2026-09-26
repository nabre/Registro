// I nomi dei canali IPC, condivisi fra main process e preload (bundle a parte).
// Solo stringhe, senza `electron`, così il preload non si tira dietro altro.

/** Il canale unico dei messaggi, nelle due direzioni. Chi ascolta distingue il mittente. */
export const CANALE = 'registro:messaggio'

/** Lo stato dell'interfaccia di una pagina: `leggi` all'avvio, `scrivi` a ogni modifica. */
export const CANALE_INTERFACCIA = 'registro:interfaccia'

/** La lingua della pagina, letta in modo sincrono dal preload (`environment/language.ts`). */
export const CANALE_LINGUA = 'registro:lingua'
