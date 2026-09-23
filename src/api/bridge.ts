// Il ponte fra il centralino di sempre e le procedure.
//
// Il registro ha centoquarantuno azioni. Riscriverle tutte in un colpo vorrebbe
// dire una modifica che nessuno può rileggere e una giornata in cui niente
// funziona; lasciarle tutte com'erano vorrebbe dire scrivere un contratto che
// non protegge nulla. Quindi né l'una né l'altra: una procedura che dichiara
// `azione: 'presenze.riga'` **prende il posto** di quel gestore nel centralino,
// e tutte le altre azioni restano esattamente dove sono.
//
// Per il pannello non cambia niente — manda la stessa `Azione`, riceve la
// stessa `Risposta` — ma quella richiesta, adesso, passa da una convalida vera,
// torna con un codice d'errore e lascia una riga nel giornale. È il modo in cui
// si sostituisce il motore di una macchina che intanto cammina: un cilindro
// alla volta, e il volante non si accorge.

import type { Azione } from '../protocol.js'
import type { EsitoAzione, Gestore, Parte } from '../actions/context.js'
import { registraTutte } from './index.js'
import { aEsitoAzione, chiama, procedure } from './core.js'
import type { EsitoScrittura, Origine } from './contract.js'

/**
 * I gestori che le procedure prendono in carico, nella forma che il centralino
 * si aspetta.
 *
 * Si sparge **dopo** gli altri in `src/actions.ts`: le chiavi che compaiono qui
 * vincono su quelle di prima, ed è l'unica riga di quel file che cambia.
 *
 * Due procedure che dichiarano la **stessa azione** fermano tutto, come due
 * procedure con lo stesso nome fermano `registra`. `registra` protegge i nomi
 * di procedura e qui non proteggeva nessuno i nomi di azione: `procedure()`
 * ordina per nome, quindi in una collisione vinceva l'ultima in ordine
 * alfabetico — deterministicamente, e senza un suono. Vuol dire che il
 * pannello avrebbe mandato la sua `Azione` di sempre e sarebbe finita in una
 * procedura che non è quella che qualcuno credeva: lo stesso difetto che
 * `registra` esiste per prevenire, lasciato aperto sull'altro identificatore.
 * Oggi duplicati non ce ne sono; questo serve a saperlo domani.
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
        `«${gia}» e «${p.nome}» prendono in carico la stessa azione «${p.azione}».`,
      )
    }
    chi.set(p.azione, p.nome)
    parte[p.azione] = async (contesto, azione): Promise<EsitoAzione> => {
      // Il `tipo` è l'indirizzo, non un dato: la procedura riceve i campi e
      // basta, come li riceverebbe da una riga di comando.
      const { tipo: _tipo, ...ingresso } = azione as { tipo: string } & Record<string, unknown>
      const risultato = await chiama<EsitoScrittura>(
        contesto.archivio,
        p.nome,
        ingresso,
        // Quella del contesto vince: la mappa si costruisce una volta sola, in
        // `src/actions.ts`, quindi un'origine cablata qui varrebbe per tutti i
        // chiamanti. Chi sa da dove parte la richiesta è chi costruisce il
        // contesto, cioè `esegui()`.
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
