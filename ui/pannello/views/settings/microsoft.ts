// Gli account Microsoft: con quali il registro legge OneDrive, e la casella
// della posta, che compare anche prima di essere collegata perché è il primo
// account che si vorrà usare. Un account che il client di OneDrive sincronizza
// sul computer compare da sé e si sfoglia senza accesso; collegarlo a Graph
// passa dal browser, e il gettone resta nel portachiavi dell'host: qui
// arrivano solo indirizzi.

import { avviso, pastiglia, pulsante, scheda } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { h } from '../../dom.js'
import type { AccountMicrosoft } from '../../../../core/dominio/onedrive.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'
import { apriOneDrive } from '../../forms/oneDrive.js'
import { testi } from './microsoft.testi.js'

/** Una riga dell'elenco: chi è, a che cosa serve, e i gesti che gli si addicono. */
function rigaAccount (account: AccountMicrosoft): HTMLElement {
  const t = testi()
  return h(
    'li',
    { class: 'account-microsoft' },
    h(
      'div',
      { class: 'account-microsoft__chi' },
      h('strong', null, account.nome || account.indirizzo),
      account.nome ? h('small', null, account.indirizzo) : null,
    ),
    h(
      'div',
      { class: 'account-microsoft__usi' },
      account.sulComputer ? pastiglia(t.sulComputer, 'positivo', 'cartella') : null,
      account.onedrive ? pastiglia(t.onedriveCollegato, 'positivo', 'collegamento') : null,
      !account.sulComputer && !account.onedrive
        ? pastiglia(t.onedriveDaCollegare, 'quiete', 'collegamento')
        : null,
      account.posta ? pastiglia(t.casellaPosta, 'neutro', 'posta') : null,
    ),
    h(
      'div',
      { class: 'account-microsoft__azioni' },
      account.sulComputer || account.onedrive
        ? pulsante({
            testo: t.sfoglia,
            simbolo: 'cartella',
            variante: 'sottile',
            titolo: t.sfogliaAiuto,
            al: () => apriOneDrive(account.indirizzo),
          })
        : null,
      account.onedrive
        ? pulsante({
            testo: t.scollega,
            simbolo: 'chiudi',
            variante: 'fantasma',
            titolo: t.scollegaAiuto,
            al: async () => {
              const sicuro = await conferma({
                titolo: t.scollegare(account.indirizzo),
                testo: t.scollegareTesto,
                testoConferma: t.scollega,
              })
              if (!sicuro) return
              await azione({ tipo: 'microsoft.togli', indirizzo: account.indirizzo })
            },
          })
        : null,
      // Sincronizzato sul computer non serve collegarlo: si sfoglia già.
      !account.onedrive && !account.sulComputer
        ? pulsante({
            testo: t.collega,
            simbolo: 'collegamento',
            variante: 'primario',
            titolo: t.collegaAiuto,
            al: () => azione({ tipo: 'microsoft.aggiungi', indirizzo: account.indirizzo }),
          })
        : null,
    ),
  )
}

/** La scheda degli account: l'elenco, e il tasto per aggiungerne uno. */
export function schedaAccountMicrosoft (): HTMLElement {
  const t = testi()
  const account = stato.microsoft.account

  return scheda({
    titolo: t.titolo,
    aiuto: t.aiuto,
    azioni: pulsante({
      testo: t.aggiungi,
      simbolo: 'piu',
      variante: account.length === 0 ? 'primario' : 'sottile',
      titolo: t.aggiungiAiuto,
      al: () => azione({ tipo: 'microsoft.aggiungi' }),
    }),
    contenuto: h(
      'div',
      { class: 'posta-corpo' },
      account.length === 0
        ? avviso(t.nessuno, 'informativo')
        : h('ul', { class: 'elenco-account-microsoft' }, ...account.map(rigaAccount)),
      h('small', { class: 'campo__aiuto' }, t.nota),
    ),
  })
}
