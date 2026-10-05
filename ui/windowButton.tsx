// Il pulsante delle finestre nella barra del titolo, subito a sinistra di
// «Cerca»: nella principale apre la pagina di adesso in una finestra nuova (lo
// stesso comando di Ctrl+Maiusc+N), in una figlia riporta alla principale.
// Visibile perché una scorciatoia o un menu del tasto destro li trova solo chi
// li sa; un'icona sola, come ↶ ↷, perché la barra del titolo ha poco posto e
// il nome sta nel suggerimento e per i lettori di schermo.

import type { ReactNode } from 'react'

import { Icona } from './components/icons.js'
import { comandoPerId, eseguiComando, impedimentoDi, titoloDi } from './commands.js'
import { azione } from './bridge.js'
import { èFiglia } from './windows.js'
import { testi } from './windows.testi.js'

export function pulsanteFinestra (): ReactNode {
  if (èFiglia()) {
    const t = testi()
    return (
      <button
        className="barra-titolo__storia barra-titolo__finestra-nuova"
        type="button"
        // testo-fisso: chiave di fuoco, non si legge
        data-fuoco="comando-finestra.principale"
        title={t.allaPrincipaleTitolo}
        aria-label={t.allaPrincipale}
        onClick={() => { void azione({ tipo: 'finestra.principale' }) }}
      >
        <Icona nome="finestraPrincipale" classe="icona--minuta" />
      </button>
    )
  }
  const comando = comandoPerId('finestra.nuova')
  if (!comando) return null
  const impedito = impedimentoDi(comando)
  const nome = titoloDi(comando)
  return (
    <button
      className="barra-titolo__storia barra-titolo__finestra-nuova"
      type="button"
      disabled={impedito !== null}
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco="comando-finestra.nuova"
      title={impedito ?? testi().nuovaTitolo(nome)}
      aria-label={testi().nuovaBreve}
      onClick={() => { void eseguiComando(comando) }}
    >
      <Icona nome="finestraNuova" classe="icona--minuta" />
    </button>
  )
}
