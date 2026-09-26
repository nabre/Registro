// Il ponte fra il centralino (`src/actions.ts`) e le procedure: una procedura
// che dichiara `azione: 'presenze.riga'` prende il posto di quel gestore.
// Il pannello manda la stessa `Azione` e riceve la stessa `Risposta`, ma
// passando da convalida, codice d'errore e giornale.

import type { Azione } from '../protocol.js'
import type { EsitoAzione, Gestore, Parte } from '../actions/context.js'
import { registraTutte } from './index.js'
import { aEsitoAzione, chiama, procedure } from './core.js'
import type { EsitoScrittura, Origine } from './contract.js'

/**
 * I gestori che le procedure prendono in carico, nella forma del centralino.
 *
 * Si sparge dopo gli altri in `src/actions.ts`, quindi queste chiavi vincono.
 * Due procedure sulla stessa azione fermano tutto, come `registra` per i nomi:
 * altrimenti vincerebbe in silenzio l'ultima in ordine alfabetico.
 */
export function gestoriDelleProcedure (origine: Origine = 'pannello'): Parte {
  registraTutte()
  const parte: Record<string, Gestore<Azione['tipo']>> = {}
  const chi = new Map<string, string>()

  for (const p of procedure()) {
    if (!p.azione) continue
    const gia = chi.get(p.azione)
    if (gia) {
      throw new Error(
        // testo-fisso: un errore di programmazione, per chi sviluppa: il registro non parte
        `«${gia}» e «${p.nome}» prendono in carico la stessa azione «${p.azione}».`,
      )
    }
    chi.set(p.azione, p.nome)
    parte[p.azione] = async (contesto, azione): Promise<EsitoAzione> => {
      // `tipo` è l'indirizzo: la procedura riceve solo i campi.
      const { tipo: _tipo, ...ingresso } = azione as { tipo: string } & Record<string, unknown>
      const risultato = await chiama<EsitoScrittura>(
        contesto.archivio,
        p.nome,
        ingresso,
        // Vince l'origine del contesto: la mappa si costruisce una volta sola, e
        // l'origine la sa chi costruisce il contesto, cioè `esegui()`.
        { origine: contesto.origine ?? origine },
      )
      return aEsitoAzione(risultato)
    }
  }

  return parte
}

/** Quali azioni sono già passate sotto contratto: lo dice la pagina di aiuto. */
export function azioniSottoContratto (): string[] {
  registraTutte()
  return procedure()
    .map((p) => p.azione)
    .filter((a): a is string => Boolean(a))
    .sort()
}
