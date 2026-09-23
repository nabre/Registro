/**
 * La rete di sicurezza delle finestre che aspettano la pagina per mostrarsi.
 *
 * Le finestre del registro nascono nascoste e si mostrano quando la pagina dice
 * di essersi disegnata. Se non lo dice — uno sbaglio nel suo script, o il
 * lettore di PDF che non annuncia di essere pronto — resterebbero invisibili, e
 * una finestra invisibile che non si può nemmeno chiudere è peggio di una
 * vuota. Era lo stesso `setTimeout` scritto quattro volte (benvenuto,
 * impostazioni, lettore, dialoghi): adesso è uno, e ognuno lo chiama dal punto
 * in cui lo chiamava prima.
 */
import type { BrowserWindow } from 'electron'

/**
 * Fra `ms` millisecondi mostra `finestra`, se esiste ancora e nessuno l'ha già
 * mostrata. Non fa altro: chi la chiama sceglie da quale evento partire.
 */
export function mostraComunque (finestra: BrowserWindow, ms = 1000): void {
  setTimeout(() => {
    if (!finestra.isDestroyed() && !finestra.isVisible()) finestra.show()
  }, ms)
}
