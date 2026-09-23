// Che cosa le pagine del registro possono chiedere al sistema, e nient'altro.
//
// Chromium ha una ventina di permessi — posizione, notifiche, appunti,
// microfono, videocamera, sensori, midi — e senza una riga di codice Electron
// li **concede tutti**, in silenzio, a qualunque pagina caricata. Finché nel
// registro non c'era niente che ne chiedesse uno la cosa non si vedeva; da
// quando c'è la dettatura sì, ed è l'occasione giusta per dire per iscritto
// quali sono i due che servono.
//
//   media (solo audio)         il microfono della dettatura
//   clipboard-sanitized-write  «Copia» nell'anagrafica: un indirizzo, un numero
//
// Tutto il resto è no. Non perché sia pericoloso in sé, ma perché in queste
// pagine non lo chiede nessuno: un permesso che nessuno usa e che è concesso è
// soltanto una porta aperta di cui ci si accorge il giorno in cui qualcosa la
// attraversa. Le notifiche del registro, per dire, non passano di qui — le
// fa il main process con l'API di Electron (`environment/notifications.ts`), e una
// pagina che chiedesse `Notification.requestPermission()` si sentirebbe dire
// di no senza che nulla smetta di funzionare.
//
// **Solo le nostre origini.** Le pagine stanno su `registro://`, che è uno
// schema nostro e non raggiungibile dalla rete; la navigazione altrove è già
// chiusa in `environment/navigation.ts`. Il controllo sull'origine è la seconda
// serratura: se mai una pagina estranea finisse dentro l'applicazione, non
// troverebbe un microfono già concesso.
//
// **Il video no.** Il registro non ha niente da riprendere, e la richiesta di
// `media` arriva con l'elenco di quel che vuole: un `getUserMedia` che chieda
// anche la videocamera — per sbaglio o perché qualcuno ha cambiato una riga —
// viene rifiutato intero invece di accendere la webcam di chi ha davanti una
// classe.

import { session } from 'electron'

/** Le pagine dell'applicazione, e nessun'altra. */
function nostra (origine: string): boolean {
  return origine.startsWith('registro://')
}

/**
 * I permessi concessi, e a chi.
 *
 * `dettagli` cambia forma fra la richiesta e il controllo — di là
 * `mediaTypes`, di qua `mediaType` — e la differenza si appiattisce qui, in un
 * posto solo, perché la regola è la stessa nei due casi.
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
  // Il controllo arriva anche senza dire che cosa vuole — succede con
  // l'elenco dei dispositivi — e in quel caso si guarda il permesso e basta:
  // quel che poi si apre davvero ripassa da qui con il tipo scritto.
  if (chiesti.length === 0) return true
  return chiesti.every((tipo) => tipo === 'audio')
}

/**
 * Da chiamare una volta, dopo `app.whenReady()` e prima delle finestre.
 *
 * Tutte le finestre del registro stanno nella sessione predefinita: non c'è
 * nessuna `partition`, e una pagina con una sessione sua non esiste in questo
 * programma.
 */
export function regolaPermessi (): void {
  const sessione = session.defaultSession

  sessione.setPermissionRequestHandler((contenuti, permesso, rispondi, dettagli) => {
    const origine =
      (dettagli as { requestingUrl?: string }).requestingUrl ?? contenuti?.getURL() ?? ''
    const risposta = concesso(permesso, origine, dettagli as { mediaTypes?: string[] })
    // Sulla console e non in silenzio: un permesso rifiutato si presenta nella
    // pagina come una funzione che non parte, e senza questa riga si passerebbe
    // il pomeriggio a cercarne la ragione nella funzione.
    if (!risposta) console.warn(`permesso rifiutato: ${permesso} da ${origine || 'origine ignota'}`)
    rispondi(risposta)
  })

  sessione.setPermissionCheckHandler((_contenuti, permesso, origine, dettagli) =>
    concesso(permesso, origine ?? '', dettagli),
  )
}
