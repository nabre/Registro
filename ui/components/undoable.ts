// Una notifica con «Annulla», per i gesti che tolgono qualcosa che si può
// rimettere (una pausa, una chiusura, una regola): invece di chiedere prima, si
// fa subito e si lascia il modo di tornare indietro (§ 3.6 di
// `docs/PIANO-IMPOSTAZIONI.md`). Chi toglie qualcosa che non torna chiede
// ancora conferma.

import { notifica } from './notifications.js'
import { testi as testiComandi } from '#ui/commands.testi.js'
import { testi } from './yearSetting.testi.js'

/** Quanto resta la notifica: il tempo di un «salvato» non basta per decidere. */
const DURATA = 8000

/** Dice `testo`, con accanto «Annulla», che chiama `annulla` e chiude. */
export function notificaAnnullabile (testo: string, annulla: () => unknown): void {
  notifica(testo, 'info', {
    durata: DURATA,
    azione: { testo: testiComandi().annulla, aiuto: testi().annullaAiuto, al: annulla },
  })
}
