// L'ora di lezione: quando si fa, chi c'era, che cosa si è annotato.

import {
  allieviAttivi,
  ammetteRitardo,
  contaUd,
  lezioneFinita,
  ordinaAllievi,
  statiAllineati,
  unitaDidattiche,
} from '#core/dominio/calculations.js'
import { slotFuoriDallePause, slotSullePause } from '#core/dominio/breaks.js'
import { creaPresenza, duplicaLezione } from '#core/dominio/factories.js'
import { classeDellaLezione, corsoPerId, lezioneCompilata } from '#core/dominio/courses.js'
import type { Lezione, Presenza, Registro, StatoPresenza } from '#core/dominio/models.js'
import { validaLezione } from '#core/dominio/validation.js'
import { aggiornaDopoChiusura } from './reportsRefresh.js'
import {
  conMessaggio,
  fatto,
  rifiuta,
  riponi,
  aOraAperta,
  type Contesto,
  type EsitoAzione,
  type Parte,
} from './context.js'
import { lezioniInChiusura } from '#core/dominio/timetable.js'
import { annoInUso } from '#core/dominio/years.js'
import { lezioneNeiProgetti } from '#core/dominio/projects.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './hours.testi.js'
import { istanteAdesso } from '#core/dominio/dates.js'

/**
 * L'appello completo: una riga per allievo attivo, una casella per UD. Le righe
 * esistenti si tengono, riallineate alla durata; quelle di chi non frequenta
 * più restano in coda, perché le sue assenze passate non vanno perse.
 */
function appelloCompleto (
  registro: Registro,
  lezione: Lezione,
  esistenti: Presenza[] = lezione.presenze,
): Presenza[] {
  const classe = classeDellaLezione(registro, lezione)
  if (!classe) return esistenti
  const ud = contaUd(lezione, registro.impostazioni.minutiUd)
  const perId = new Map(esistenti.map((p) => [p.allievoId, p]))
  const attivi = ordinaAllievi(allieviAttivi(classe))
  const righe = attivi.map((allievo) => {
    const voce = perId.get(allievo.id)
    if (!voce) return creaPresenza(allievo.id, ud)
    return { ...voce, stati: statiAllineati(voce, ud) }
  })
  // I non più attivi in coda, nell'ordine di prima e allineati come gli altri.
  const inElenco = new Set(attivi.map((a) => a.id))
  const uscite = esistenti
    .filter((p) => !inElenco.has(p.allievoId))
    .map((p) => ({ ...p, stati: statiAllineati(p, ud) }))
  return [...righe, ...uscite]
}

/** L'appello con una parte riscritta: `dove` dice quali caselle (casella, riga, colonna, tutte). */
function appelloScritto (
  registro: Registro,
  lezione: Lezione,
  stato: StatoPresenza,
  dove: (allievoId: string, ud: number) => boolean,
): Presenza[] {
  return appelloCompleto(registro, lezione).map((presenza) => {
    const stati = presenza.stati.map((attuale, ud) =>
      dove(presenza.allievoId, ud) ? stato : attuale,
    )
    return { ...presenza, stati, ritardi: ritardiValidi(stati, presenza.ritardi) }
  })
}

/**
 * I minuti di ritardo che restano con questi stati: valgono solo sulle UD in
 * ritardo. Senza nessun minuto rimasto l'elenco se ne va.
 */
function ritardiValidi (stati: StatoPresenza[], ritardi: number[] | undefined): number[] | undefined {
  if (!ritardi) return undefined
  const validi = stati.map((s, ud) => (s === 'ritardo' ? ritardi[ud] ?? 0 : 0))
  return validi.some((minuti) => minuti > 0) ? validi : undefined
}

/**
 * Scrive una parte dell'appello, rifiutando un ritardo che cadrebbe su un'UD
 * dove non si può arrivare in ritardo (`ammetteRitardo`): per questo una riga
 * di più UD non accetta mai il ritardo.
 */
function scriviAppello (
  contesto: Contesto,
  lezioneId: string,
  stato: StatoPresenza,
  dove: (allievoId: string, ud: number) => boolean,
): EsitoAzione {
  const ora = contesto.registro.lezioni.find((l) => l.id === lezioneId)
  if (ora && stato === 'ritardo') {
    const vietate = unitaDidattiche(ora, contesto.registro.impostazioni.minutiUd)
      .filter((unita) => !ammetteRitardo(unita))
    const toccate = appelloCompleto(contesto.registro, ora)
    if (toccate.some((p) => vietate.some((unita) => dove(p.allievoId, unita.indice)))) {
      return rifiuta(testi().ritardoFuoriPosto)
    }
  }
  return contesto.suVoce('lezioni', lezioneId, (lezione, r) => {
    lezione.presenze = appelloScritto(r, lezione, stato, dove)
  })
}

/**
 * Vero se l'ora passa a un corso di un'altra classe. Un corso di partenza
 * sparito non conta: l'ora si deve poter riagganciare.
 */
function classeCambiata (registro: Registro, prima: Lezione, dopo: Lezione): boolean {
  if (prima.corsoId === dopo.corsoId) return false
  const da = corsoPerId(registro, prima.corsoId)?.classeId ?? null
  const a = corsoPerId(registro, dopo.corsoId)?.classeId ?? null
  return da !== null && da !== a
}

/**
 * Vero se l'ora ha dati intestati a persone (appello toccato, matrice,
 * osservazioni). Le righe mute dell'appello non contano.
 */
function conDatiDiPersone (lezione: Lezione): boolean {
  return (
    (lezione.matrice ?? []).length > 0 ||
    lezione.osservazioni.some((o) => Boolean(o.allievoId)) ||
    lezione.presenze.some(
      (p) =>
        p.stati.some((s) => s !== 'non-impostato') || p.ritardi !== undefined || Boolean(p.nota),
    )
  )
}

/**
 * Vero se l'ora è citata da momenti, consegne, spunte del check o progetti di un corso
 * diverso da `corsoId`: spostata lì, quei rimandi punterebbero a un'ora
 * d'altri. L'eliminazione li stacca fissando la data; il salvataggio rifiuta.
 */
function citataFuoriDalCorso (registro: Registro, lezioneId: string, corsoId: string): boolean {
  return (
    registro.valutazioni.some((v) => v.lezioneId === lezioneId && v.corsoId !== corsoId) ||
    registro.consegne.some((c) =>
      (c.dataLezioneId === lezioneId || c.scadenzaLezioneId === lezioneId) && c.corsoId !== corsoId,
    ) ||
    registro.check.some((lista) =>
      lista.corsoId !== corsoId && lista.spunte.some((s) => s.lezioneId === lezioneId),
    ) ||
    lezioneNeiProgetti(registro, lezioneId, corsoId)
  )
}

export const ore = {
  'lezione.salva': (contesto, azione) => {
    const esito = validaLezione(azione.lezione, contesto.registro.impostazioni.minutiUd)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const prima = contesto.registro.lezioni.find((l) => l.id === azione.lezione.id)
    const nuova = !prima
    const lezione = { ...azione.lezione, aggiornataIl: istanteAdesso() }
    // Un'UD non sta sopra una pausa: se ne invade una, si spezza e si sposta.
    const fuori = slotFuoriDallePause(lezione.slot, contesto.registro.impostazioni)
    const ridisposta = fuori !== lezione.slot
    lezione.slot = fuori
    if (lezione.stato === 'svolta' && prima?.stato !== 'svolta' && !lezioneFinita(lezione)) {
      return rifiuta(testi().nonFinita)
    }
    // Annullarla dal modulo vale come dal pulsante: niente se è compilata, e il
    // piano si stacca.
    if (lezione.stato === 'annullata' && prima?.stato !== 'annullata') {
      if (prima && lezioneCompilata(contesto.registro, prima)) {
        return rifiuta(testi().annullataCompilata)
      }
      lezione.pianoId = null
      lezione.avanzamento = []
    }
    if (lezione.pianoId) {
      const piano = contesto.registro.piani.find((p) => p.id === lezione.pianoId)
      if (!piano) return rifiuta(comuni().nonTrovato.piano)
      if (piano.corsoId && piano.corsoId !== lezione.corsoId) {
        return rifiuta(testi().pianoAltroCorso)
      }
    }
    // Cambio di classe: rifiutato se l'ora ha dati di persone, altrimenti
    // l'appello muto si butta e si rifà sulla classe nuova.
    if (prima && prima.corsoId !== lezione.corsoId &&
      citataFuoriDalCorso(contesto.registro, prima.id, lezione.corsoId)) {
      return rifiuta(testi().citataAltrove)
    }
    // Si guarda anche l'ora com'è nel registro: chi salva con un appello vuoto
    // non deve poterlo cancellare passando di classe.
    if (prima && classeCambiata(contesto.registro, prima, lezione)) {
      if (conDatiDiPersone(prima) || conDatiDiPersone(lezione)) {
        return rifiuta(testi().altraClasse)
      }
      lezione.presenze = []
    }
    contesto.modifica((r) => {
      riponi(r.lezioni, lezione, (a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
    const scritta = nuova ? { ok: true as const, creato: { id: lezione.id } } : fatto
    if (!ridisposta) return scritta
    return conMessaggio(testi().ridisposta, 'info', scritta)
  },

  // Una valutazione svolta in quella lezione resta: perde solo il rimando.
  'lezione.elimina': (contesto, azione) => {
    return contesto.elimina({ genere: 'lezione', id: azione.lezioneId })
  },

  'lezione.togliNelleChiusure': async (contesto, azione) => {
    const anno = annoInUso(contesto.registro)
    const lezioni = lezioniInChiusura(contesto.registro, anno, azione.dal, azione.al)
    if (lezioni.length === 0) return rifiuta(testi().nessunaInChiusura)
    const esito = await contesto.eliminaInsieme(lezioni.map((l) => ({ genere: 'lezione' as const, id: l.id })))
    if (!esito.ok) return esito
    return conMessaggio(testi().tolteInChiusura(lezioni.length), 'info', esito)
  },

  'lezione.duplica': (contesto, azione) => {
    const origine = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!origine) return rifiuta(comuni().nonTrovato.lezione)
    const copia = duplicaLezione(origine, azione.data)
    // A un'altra ora la copia segue le pause della giornata, come lo spostamento.
    if (azione.inizio) {
      copia.slot = slotSullePause(copia.slot, contesto.registro.impostazioni, azione.inizio)
    }
    contesto.modifica((r) => {
      r.lezioni.push(copia)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['lezioni'])
    return { ok: true, creato: { id: copia.id } }
  },

  'lezione.stato': (contesto, azione) => {
    const prima = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    // Conclusa si dice di un'ora il cui tempo è passato.
    if (prima && azione.stato === 'svolta' && prima.stato !== 'svolta' && !lezioneFinita(prima)) {
      return rifiuta(testi().nonFinita)
    }
    if (prima && azione.stato === 'annullata' && prima.stato !== 'annullata' &&
      lezioneCompilata(contesto.registro, prima)) {
      return rifiuta(testi().annullataCompilata)
    }
    const esito = contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.stato = azione.stato
      // Annullata, l'ora non tiene il piano: lo stacca (resta fra i piani del corso).
      if (azione.stato === 'annullata') {
        lezione.pianoId = null
        lezione.avanzamento = []
      }
      // Svolta senza appello: nascono le righe, mute, da riempire.
      if (azione.stato === 'svolta' && lezione.presenze.length === 0) {
        lezione.presenze = appelloCompleto(r, lezione, [])
      }
    })

    // Chiudere un'ora rifà i documenti del corso, senza aspettarli: l'avviso
    // arriva quando i file ci sono.
    if (esito.ok && azione.stato === 'svolta') {
      const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
      // L'archivio e non il registro: vedi `aggiornaDopoChiusura`.
      if (lezione) aggiornaDopoChiusura(contesto.archivio, lezione)
    }
    return esito
  },

  // Trascinamento nel calendario: cambia il giorno e, con l'ora, ridispone le
  // stesse UD sulle pause della giornata (`slotSullePause`). Il resto resta.
  'lezione.sposta': (contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione, r) => {
      lezione.data = azione.data
      if (azione.inizio) {
        lezione.slot = slotSullePause(lezione.slot, r.impostazioni, azione.inizio)
      }
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    })
  },

  /** I testi dell'ora: si scrivono solo i campi presenti, per non sovrascrivere gli altri. */
  'lezione.testi': aOraAperta((contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      if (azione.argomenti !== undefined) lezione.argomenti = azione.argomenti
      if (azione.materiali !== undefined) lezione.materiali = azione.materiali
      if (azione.consuntivo !== undefined) lezione.consuntivo = azione.consuntivo
    })
  }),

  'presenze.ud': aOraAperta((contesto, azione) =>
    scriviAppello(
      contesto,
      azione.lezioneId,
      azione.stato,
      (allievoId, ud) => allievoId === azione.allievoId && ud === azione.ud,
    )),

  'presenze.riga': aOraAperta((contesto, azione) =>
    scriviAppello(contesto, azione.lezioneId, azione.stato, (allievoId) => allievoId === azione.allievoId)),

  'presenze.colonna': aOraAperta((contesto, azione) =>
    scriviAppello(contesto, azione.lezioneId, azione.stato, (_id, ud) => ud === azione.ud)),

  'presenze.tutti': aOraAperta((contesto, azione) =>
    scriviAppello(contesto, azione.lezioneId, azione.stato, () => true)),

  /**
   * Minuti di ritardo di un'UD e nota di una riga sola: tocca solo quella, le
   * altre restano intatte. Senza `ud` i minuti vanno sulla prima UD in ritardo.
   */
  'presenze.campi': aOraAperta((contesto, azione) => {
    const ora = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    const esistente = ora?.presenze.find((p) => p.allievoId === azione.allievoId)
    const ud = azione.ud ?? esistente?.stati.indexOf('ritardo') ?? -1
    // I minuti stanno solo su un'UD in ritardo: altrove nessuna schermata li mostra.
    if (azione.minuti !== undefined && esistente?.stati[ud] !== 'ritardo') {
      return rifiuta(testi().minutiSenzaRitardo)
    }
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      let presenza = lezione.presenze.find((p) => p.allievoId === azione.allievoId)
      if (!presenza) {
        const quante = contaUd(lezione, contesto.registro.impostazioni.minutiUd)
        presenza = creaPresenza(azione.allievoId, quante)
        lezione.presenze.push(presenza)
      }
      if (azione.minuti !== undefined) {
        const ritardi = presenza.stati.map((_, i) => presenza.ritardi?.[i] ?? 0)
        ritardi[ud] = azione.minuti
        presenza.ritardi = ritardiValidi(presenza.stati, ritardi)
      }
      if (azione.nota !== undefined) presenza.nota = azione.nota
    })
  }),

  /**
   * Una casella della matrice: segno, nota o tutti e due; quel che manca resta
   * com'era. Una casella senza segno né nota si toglie.
   */
  'osservazione.cella': aOraAperta((contesto, azione) => {
    // Solo persone di questa classe: una casella altrui nessuna schermata la mostra.
    const ora = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    const classe = ora ? classeDellaLezione(contesto.registro, ora) : null
    if (classe && !classe.allievi.some((a) => a.id === azione.allievoId)) {
      return rifiuta(testi().fuoriClasse)
    }
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      const matrice = lezione.matrice ?? []
      const vecchia = matrice.find(
        (c) => c.allievoId === azione.allievoId && c.aspetto === azione.aspetto,
      )
      const segno = azione.segno === undefined ? vecchia?.segno ?? null : azione.segno
      const nota = (azione.nota === undefined ? vecchia?.nota ?? '' : azione.nota).trim()
      const restanti = matrice.filter((c) => c !== vecchia)

      if (!segno && !nota) {
        lezione.matrice = restanti
        return
      }
      lezione.matrice = [
        ...restanti,
        {
          allievoId: azione.allievoId,
          aspetto: azione.aspetto,
          segno,
          ...(nota ? { nota } : {}),
        },
      ]
    })
  }),

  'osservazione.salva': aOraAperta((contesto, azione) => {
    if (!azione.osservazione.testo.trim()) return rifiuta(testi().osservazioneVuota)
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      riponi(lezione.osservazioni, azione.osservazione)
    })
  }),

  'osservazione.elimina': aOraAperta((contesto, azione) => {
    return contesto.suVoce('lezioni', azione.lezioneId, (lezione) => {
      lezione.osservazioni = lezione.osservazioni.filter((o) => o.id !== azione.osservazioneId)
    })
  }),
} satisfies Parte
