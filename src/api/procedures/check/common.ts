// Le guardie delle procedure di `check`. Distinguono «non c'è» (corso, lista,
// colonna, lezione: si rilegge e si ritenta) da «non si può» (persona di
// un'altra classe, lezione di un altro corso: mai, e dice quale campo è di
// troppo).

import { checkDelCorso } from '../../../domain/check.js'
import type { Allievo, Check, ColonnaCheck, Corso, Lezione } from '../../../domain/models.js'
import { errore, ErroreApi, type Ambito } from '../../contract.js'
import { esigiCorso } from '../common/register.js'
import { testi } from './check.testi.js'

const t = () => testi().comune

/** La lista del corso, o il motivo per cui non c'è. */
function esigiCheck (ambito: Ambito, corso: Corso): Check {
  const check = checkDelCorso(ambito.contesto.registro, corso.id)
  if (!check) {
    throw errore.nonTrovato('check', t().rimedioCheck)
  }
  return check
}

function esigiColonna (check: Check, colonnaId: string): ColonnaCheck {
  const colonna = check.colonne.find((c) => c.id === colonnaId)
  if (!colonna) {
    throw errore.nonTrovato('colonnaCheck', t().rimedioColonne)
  }
  return colonna
}

/**
 * La persona, purché stia nella classe del corso. Ritirati compresi: la loro
 * riga resta finché ha spunte, che si devono poter togliere o ridatare. Una
 * persona di un'altra classe è «la persona sbagliata», non «non trovata».
 */
function esigiAllievoDelCorso (ambito: Ambito, corso: Corso, allievoId: string): Allievo {
  const registro = ambito.contesto.registro
  const classe = registro.classi.find((c) => c.id === corso.classeId)
  const allievo = classe?.allievi.find((a) => a.id === allievoId)
  if (allievo) return allievo
  if (!registro.classi.some((c) => c.allievi.some((a) => a.id === allievoId))) {
    throw errore.nonTrovato('pif', t().rimedioPersone)
  }
  throw new ErroreApi('rifiutato', [t().personaDiAltraClasse(corso.titolo)], 'allievoId')
}

/**
 * La lezione, purché sia del corso: una spunta dentro un'ora ne segue la data.
 */
export function esigiLezioneDelCorso (ambito: Ambito, corso: Corso, lezioneId: string): Lezione {
  const lezione = ambito.contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (!lezione) throw errore.nonTrovato('lezione')
  if (lezione.corsoId !== corso.id) {
    throw new ErroreApi('rifiutato', [t().lezioneDiAltroCorso(corso.titolo)], 'lezioneId')
  }
  return lezione
}

/**
 * La casella nominata: corso, lista, colonna, persona, in quest'ordine
 * d'inclusione, così la prima che manca spiega le altre.
 */
export function esigiCasella (
  ambito: Ambito,
  ingresso: { corsoId: string; allievoId: string; colonnaId: string },
): { corso: Corso; check: Check } {
  const corso = esigiCorso(ambito, ingresso.corsoId)
  const check = esigiCheck(ambito, corso)
  esigiColonna(check, ingresso.colonnaId)
  esigiAllievoDelCorso(ambito, corso, ingresso.allievoId)
  return { corso, check }
}
