// Una notifica con «Annulla», per i gesti che tolgono qualcosa che si può
// rimettere (una pausa, una chiusura, una regola): invece di chiedere prima, si
// fa subito e si lascia il modo di tornare indietro (§ 3.6 di
// `docs/PIANO-IMPOSTAZIONI.md`). Chi toglie qualcosa che non torna chiede
// ancora conferma.
//
// La notifica nasce da `notifica()`, con la sua pila e il suo vestito; qui la
// si sostituisce con una copia che resta di più, perché il tempo di un
// «salvato» non basta per decidere di tornare indietro.

import { h } from '#ui/pannello/dom.js'
import { notifica } from './notifications.js'
import { testi as testiComandi } from '#ui/pannello/commands.testi.js'
import { testi } from './yearSetting.testi.js'

/** Quanto resta la notifica: il tempo di accorgersi dello sbaglio. */
const DURATA = 8000

/** Quanto dura l'uscita, come in `notifications.ts`. */
const USCITA = 180

/** Dice `testo`, con accanto «Annulla», che chiama `annulla` e chiude. */
export function notificaAnnullabile (testo: string, annulla: () => unknown): void {
  notifica(testo, 'info')
  const sua = document.querySelector('.pila-notifiche')?.lastElementChild
  if (!sua) return
  // La copia prende il posto dell'originale: il congedo a tempo di quello resta
  // su un nodo fuori dalla pagina, e non tocca questa.
  const voce = sua.cloneNode(true) as HTMLElement
  sua.replaceWith(voce)
  let via = false
  const congeda = (): void => {
    if (via) return
    via = true
    voce.classList.add('notifica--in-uscita')
    setTimeout(() => voce.remove(), USCITA)
  }
  const t = testi()
  const bottone = h(
    'button',
    {
      class: ['pulsante', 'pulsante--sottile', 'notifica__annulla'],
      type: 'button',
      attr: { title: t.annullaAiuto },
    },
    testiComandi().annulla,
  )
  bottone.addEventListener('click', () => {
    congeda()
    void annulla()
  })
  const chiudi = voce.querySelector('.notifica__chiudi')
  chiudi?.addEventListener('click', congeda)
  if (chiudi) chiudi.before(bottone)
  else voce.append(bottone)
  setTimeout(congeda, DURATA)
}
