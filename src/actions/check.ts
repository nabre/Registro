// Il check: la lista di controllo di un corso, colonne e spunte per allievo.
// Le regole stanno in `src/domain/check.ts`; qui si trova, si decide il quando
// e si scrive. Le azioni sono idempotenti: un gesto che non cambia niente si
// prova su una copia e torna `invariato`, perché `modifica` leggerebbe il suo
// `false` come «non c'è più».

import {
  checkDelCorso,
  applicaColonne,
  applicaData,
  applicaLezione,
  applicaSpunta,
} from '../domain/check.js'
import { oggi, istanteAdesso } from '../domain/dates.js'
import { creaCheck } from '../domain/factories.js'
import { nuovoIdColonnaCheck } from '../domain/identifiers.js'
import type { Check, Registro } from '../domain/models.js'
import {
  invariato,
  rifiuta,
  rifiutaCon,
  riponi,
  type EsitoAzione,
  type Parte,
} from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './check.testi.js'

/** Il pezzo del contesto che serve per scrivere: `modifica`, e nient'altro. */
type Scrittura = Pick<Parameters<NonNullable<Parte['check.spunta']>>[0], 'modifica'>

/** Vero se l'operazione cambierebbe la lista, provata su una copia. */
function cambierebbe (check: Check, op: (copia: Check) => boolean): boolean {
  return op(structuredClone(check))
}

/**
 * Scrive l'operazione sul check vivo del corso, se cambia qualcosa; altrimenti
 * `invariato`. Un check sparito nel frattempo è «non c'è più».
 */
function scriviSulCheck (
  contesto: Scrittura,
  corsoId: string,
  check: Check,
  op: (check: Check) => boolean,
): EsitoAzione {
  if (!cambierebbe(check, op)) return invariato
  return contesto.modifica((r) => {
    const bersaglio = checkDelCorso(r, corsoId)
    if (!bersaglio) return false
    op(bersaglio)
  }, ['check'])
}

/**
 * Il check della casella nominata, con colonna e allievo verificati, o il motivo
 * del rifiuto. I ritirati valgono: le loro spunte si devono poter correggere.
 */
function casella (
  registro: Registro,
  azione: { corsoId: string; allievoId: string; colonnaId: string },
): { check: Check } | { errore: EsitoAzione } {
  const corso = registro.corsi.find((c) => c.id === azione.corsoId)
  if (!corso) return { errore: rifiutaCon('non-trovato', comuni().nonTrovato.corso) }
  const check = checkDelCorso(registro, corso.id)
  if (!check) return { errore: rifiutaCon('non-trovato', testi().senzaLista) }
  if (!check.colonne.some((c) => c.id === azione.colonnaId)) {
    return { errore: rifiutaCon('non-trovato', testi().colonnaNonTrovata) }
  }
  const classe = registro.classi.find((c) => c.id === corso.classeId)
  if (!classe?.allievi.some((a) => a.id === azione.allievoId)) {
    return { errore: rifiuta(comuni().fuoriClasse) }
  }
  return { check }
}

export const check = {
  /** Le colonne, tutte insieme: la lista nasce alla prima e sparisce quando è vuota. */
  'check.colonne': (contesto, azione) => {
    const registro = contesto.registro
    if (!registro.corsi.some((c) => c.id === azione.corsoId)) {
      return rifiutaCon('non-trovato', comuni().nonTrovato.corso)
    }
    const adesso = istanteAdesso()
    const esistente = checkDelCorso(registro, azione.corsoId)
    const nuovo = esistente ? structuredClone(esistente) : creaCheck(azione.corsoId)
    // Un id sconosciuto è una colonna nuova, con id dato dal dominio: `fondiCheck`
    // riconosce le colonne per id, e un id altrui le confonderebbe.
    const conosciute = new Set(esistente?.colonne.map((c) => c.id) ?? [])
    const colonne = azione.colonne.map((colonna) =>
      !colonna.id || conosciute.has(colonna.id)
        ? colonna
        : { ...colonna, id: nuovoIdColonnaCheck() },
    )
    if (!applicaColonne(nuovo, colonne, adesso)) return invariato
    const vuoto = nuovo.colonne.length === 0 && nuovo.spunte.length === 0
    return contesto.modifica((r) => {
      if (vuoto) r.check = r.check.filter((c) => c.corsoId !== azione.corsoId)
      else riponi(r.check, nuovo)
    }, ['check'])
  },

  /**
   * Spunta o toglie una casella. Da un'ora vale quella lezione (la data la
   * segue), altrimenti il giorno scelto o oggi. La lezione dev'essere del corso.
   */
  'check.spunta': (contesto, azione) => {
    const registro = contesto.registro
    const trovata = casella(registro, azione)
    if ('errore' in trovata) return trovata.errore
    const lezione = azione.lezioneId
      ? registro.lezioni.find((l) => l.id === azione.lezioneId) ?? null
      : null
    if (azione.lezioneId && lezione?.corsoId !== azione.corsoId) {
      return rifiuta(testi().lezioneDiAltroCorso)
    }
    const quando = !azione.fatta
      ? null
      : lezione
        ? { lezioneId: lezione.id, data: lezione.data }
        : { lezioneId: null, data: azione.data ?? oggi() }
    const adesso = istanteAdesso()
    return scriviSulCheck(contesto, azione.corsoId, trovata.check, (c) =>
      applicaSpunta(c, azione.allievoId, azione.colonnaId, quando, adesso))
  },

  /** Il giorno scelto a mano: la casella resta spuntata, e smette di seguire una lezione. */
  'check.data': (contesto, azione) => {
    const trovata = casella(contesto.registro, azione)
    if ('errore' in trovata) return trovata.errore
    const adesso = istanteAdesso()
    return scriviSulCheck(contesto, azione.corsoId, trovata.check, (c) =>
      applicaData(c, azione.allievoId, azione.colonnaId, azione.data, adesso))
  },

  /** La spunta passa all'ora nominata, che dev'essere del corso. */
  'check.lezione': (contesto, azione) => {
    const registro = contesto.registro
    const trovata = casella(registro, azione)
    if ('errore' in trovata) return trovata.errore
    const lezione = registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiutaCon('non-trovato', comuni().nonTrovato.lezione)
    if (lezione.corsoId !== azione.corsoId) {
      return rifiuta(testi().lezioneDiAltroCorso)
    }
    const adesso = istanteAdesso()
    return scriviSulCheck(contesto, azione.corsoId, trovata.check, (c) =>
      applicaLezione(c, azione.allievoId, azione.colonnaId, lezione, adesso))
  },
} satisfies Parte
