// Il pulsante delle finestre nella riga dei comandi, accanto a «Proietta»:
// nella principale apre la pagina di adesso in una finestra nuova (lo stesso
// comando di Ctrl+Maiusc+N), in una figlia riporta alla principale. Visibile
// perché una scorciatoia o un menu del tasto destro li trova solo chi li sa.
// Sta fuori da `commandBar.tsx` perché là si tocca solo il punto in cui compare.

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
        className="barra-comandi__schermo"
        type="button"
        // testo-fisso: chiave di fuoco, non si legge
        data-fuoco="comando-finestra.principale"
        title={t.allaPrincipaleTitolo}
        onClick={() => { void azione({ tipo: 'finestra.principale' }) }}
      >
        <span>{t.allaPrincipale}</span>
      </button>
    )
  }
  const comando = comandoPerId('finestra.nuova')
  if (!comando) return null
  const impedito = impedimentoDi(comando)
  const nome = titoloDi(comando)
  return (
    <button
      className="barra-comandi__schermo"
      type="button"
      disabled={impedito !== null}
      // testo-fisso: chiave di fuoco, non si legge
      data-fuoco="comando-finestra.nuova"
      title={impedito ?? testi().nuovaTitolo(nome)}
      onClick={() => { void eseguiComando(comando) }}
    >
      <Icona nome="duplica" classe="icona--minuta" />
      <span>{testi().nuovaBreve}</span>
    </button>
  )
}
