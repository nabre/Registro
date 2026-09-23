// Il riquadro d'avvio: scrive la fase che il main process annuncia.
//
// Non manda niente indietro: non c'è niente da chiedere a chi sta aspettando.

import { ascolta, perId } from '../shared/page.js'

import './splash.css'

const fase = perId('fase')
const versione = perId('versione')

ascolta((messaggio) => {
  if (messaggio.avvio !== 'fase') return
  if (typeof messaggio.testo === 'string') fase.textContent = messaggio.testo
  if (typeof messaggio.versione === 'string') versione.textContent = `Versione ${messaggio.versione}`
})
