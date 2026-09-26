// Che cosa le pagine del registro possono chiedere al sistema. Senza regole
// Electron concede ogni permesso a qualunque pagina; qui servono due:
//
//   media (solo audio)         il microfono della dettatura
//   clipboard-sanitized-write  «Copia» nell'anagrafica: un indirizzo, un numero
//
// Tutto il resto è no: un permesso concesso e non usato è una porta aperta. Le
// notifiche le fa il main process (`environment/notifications.ts`), non le pagine.
//
// Solo le nostre origini (`registro://`): la navigazione altrove è già chiusa
// in `environment/navigation.ts`, questa è la seconda serratura.
//
// Niente video: un `getUserMedia` che chieda anche la videocamera si rifiuta intero.

import { session } from 'electron'

/** Le pagine dell'applicazione, e nessun'altra. */
function nostra (origine: string): boolean {
  return origine.startsWith('registro://')
}

/**
 * I permessi concessi, e a chi. `dettagli` ha `mediaTypes` nella richiesta e
 * `mediaType` nel controllo: si appiattiscono qui.
 */
function concesso (
  permesso: string,
  origine: string,
  dettagli: { mediaTypes?: string[], mediaType?: string },
): boolean {
  if (!nostra(origine)) return false
  if (permesso === 'clipboard-sanitized-write') return true
  if (permesso !== 'media') return false

  const chiesti = dettagli.mediaTypes ?? (dettagli.mediaType ? [dettagli.mediaType] : [])
  // Senza tipo (l'elenco dei dispositivi) basta il permesso: l'apertura vera
  // ripassa da qui con il tipo.
  if (chiesti.length === 0) return true
  return chiesti.every((tipo) => tipo === 'audio')
}

/**
 * Da chiamare una volta, dopo `app.whenReady()` e prima delle finestre. Tutte
 * stanno nella sessione predefinita: nessuna `partition`.
 */
export function regolaPermessi (): void {
  const sessione = session.defaultSession

  sessione.setPermissionRequestHandler((contenuti, permesso, rispondi, dettagli) => {
    const origine =
      (dettagli as { requestingUrl?: string }).requestingUrl ?? contenuti?.getURL() ?? ''
    const risposta = concesso(permesso, origine, dettagli as { mediaTypes?: string[] })
    // Un permesso rifiutato nella pagina sembra una funzione che non parte: lo si scrive in console.
    if (!risposta) console.warn(`permesso rifiutato: ${permesso} da ${origine || 'origine ignota'}`)
    rispondi(risposta)
  })

  sessione.setPermissionCheckHandler((_contenuti, permesso, origine, dettagli) =>
    concesso(permesso, origine ?? '', dettagli),
  )
}
