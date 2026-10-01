/**
 * Il divieto di ADR-47 fissato nei tipi: dove si è lo scrive solo `vai`, e
 * `aggiorna` non accetta né il posto né i campi che ne derivano. Non si
 * esegue: lo legge `tsc`, che fallisce se un `@ts-expect-error` qui sotto
 * smette di trovare il suo errore.
 */
import type { aggiorna } from '#ui/pannello/state.js'

type Modifiche = Parameters<typeof aggiorna>[0]

// Il resto dello stato passa: il tipo non è diventato `never`.
void ({ ricerca: '', schedaLezione: 'amministrazione' } satisfies Modifiche)

// @ts-expect-error la vista la deriva `vai` dal posto
void ({ vista: 'oggi' } satisfies Modifiche)
// @ts-expect-error il posto lo scrive solo `vai`
void ({ posto: { pagina: 'pagina.oggi' } } satisfies Modifiche)
// @ts-expect-error il contesto lo porta `vai`
void ({ corsoId: 'cor-a' } satisfies Modifiche)
// @ts-expect-error una scheda che fa pagina è un posto
void ({ schedaDocente: 'assenze' } satisfies Modifiche)
// @ts-expect-error anche l'area delle impostazioni
void ({ areaImpostazioni: 'utente' } satisfies Modifiche)
