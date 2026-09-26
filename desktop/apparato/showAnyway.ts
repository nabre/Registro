/**
 * Rete di sicurezza per le finestre che nascono nascoste e aspettano la pagina:
 * se la pagina non annuncia di essere pronta, si mostrano lo stesso.
 */
import type { BrowserWindow } from 'electron'

/** Dopo un secondo mostra `finestra`, se esiste ancora ed è nascosta. */
export function mostraComunque (finestra: BrowserWindow): void {
  setTimeout(() => {
    if (!finestra.isDestroyed() && !finestra.isVisible()) finestra.show()
  }, 1000)
}
