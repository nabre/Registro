// Il riquadro d'avvio: scrive la fase che il main process annuncia.
//
// Non manda niente indietro: non c'è niente da chiedere a chi sta aspettando.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '../../../src/i18n/page.js'
import { ascolta, perId, riempi } from '../shared/page.js'
import { testi } from './splash.testi.js'

import './splash.css'

const t = testi()
riempi(t)

const fase = perId('fase')
const versione = perId('versione')

ascolta((messaggio) => {
  if (messaggio.avvio !== 'fase') return
  if (typeof messaggio.testo === 'string') fase.textContent = messaggio.testo
  if (typeof messaggio.versione === 'string') versione.textContent = t.versione(messaggio.versione)
})
