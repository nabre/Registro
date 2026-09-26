// I calendari ICS del documento (aggiungere, ricopiare, rinominare, togliere)
// e l'applicazione della revisione. Rete e disco si leggono prima di scrivere:
// se l'origine non si legge, il registro resta com'era.
//
// Il confronto è una lettura (`calendario.confronta` in `api/procedures/calendario/`);
// qui arriva quel che si è spuntato, scritto tutto o niente. Non si cancellano
// lezioni: una sparita dal calendario resta finché qualcuno non la toglie.

import { fineLezione, inizioLezione, slotOrdinati } from '../domain/calculations.js'
import { allineamentoDaSoloAmmesso, slotDaFasce } from '../domain/calendar.js'
import { corsoPerId } from '../domain/courses.js'
import { oggi, istanteAdesso } from '../domain/dates.js'
import { creaLezione } from '../domain/factories.js'
import { nuovoIdCalendarioEsterno } from '../domain/identifiers.js'
import type { Lezione, Registro, SorgenteCalendario } from '../domain/models.js'
import { nomeDaOrigine, normalizzaCalendario } from '../domain/normalization.js'
import { validaLezione, validaSlot } from '../domain/validation.js'
import { copiaDallOrigine, eliminaCopia } from '../data/calendar.js'
import {
  conMessaggio,
  documentoCambiato,
  fatto,
  rifiuta,
  rifiutaCon,
  scegliUnFile,
  type Parte,
} from './context.js'
import { parole } from '../domain/words.testi.js'
import { testi } from './calendar.testi.js'

/** Il calendario con quell'id nel documento, o `undefined`. */
function calendarioDi (registro: Registro, id: string): SorgenteCalendario | undefined {
  return registro.impostazioni.calendario?.calendari.find((c) => c.id === id)
}

/** L'origine ripulita se ha la forma giusta (http/webcal/file o percorso), altrimenti `null`. */
function origineAccettabile (origine: string): string | null {
  const pulita = origine.trim().replace(/^"|"$/g, '')
  if (!pulita) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pulita) && !/^(https?|webcals?|file):\/\//i.test(pulita)) {
    return null
  }
  return pulita
}

/** La frase di un guasto di lettura, senza mai l'indirizzo dentro. */
function motivoDi (guasto: unknown): string {
  return guasto instanceof Error ? guasto.message : testi().nonSiLegge
}

export const calendario = {
  'calendario.aggiungi': async (contesto, azione) => {
    const t = testi()
    let origine = azione.origine.trim()
    // Senza origine: «Aggiungi un file…», il dialogo lo apre l'host.
    if (!origine) {
      const scelto = await scegliUnFile({
        titolo: t.titoloDialogo,
        tasto: parole().aggiungi,
        filtri: { [t.filtroIcs]: ['ics', 'ical', 'ifb'], [t.filtroTutti]: ['*'] },
      })
      if (!scelto) return fatto
      origine = scelto.uri.fsPath
    }
    const pulita = origineAccettabile(origine)
    if (!pulita) return rifiuta(t.origineNonValida)
    if (contesto.registro.impostazioni.calendario?.calendari.some((c) => c.origine === pulita)) {
      return rifiuta(t.giaNelDocumento)
    }

    const nuovo: SorgenteCalendario = {
      id: nuovoIdCalendarioEsterno(),
      nome: azione.nome?.trim() || nomeDaOrigine(pulita),
      origine: pulita,
    }
    try {
      nuovo.copiatoIl = await copiaDallOrigine(nuovo)
    } catch (guasto) {
      return rifiuta(motivoDi(guasto))
    }
    if (!contesto.ancoraQui()) {
      eliminaCopia(nuovo.id)
      return documentoCambiato()
    }
    const scritto = contesto.modifica((r) => {
      const prima = r.impostazioni.calendario
      r.impostazioni.calendario = {
        calendari: [...(prima?.calendari ?? []), nuovo],
        regole: prima?.regole ?? [],
      }
    }, ['registro'])
    if (!scritto.ok) return scritto
    return conMessaggio(t.aggiunto(nuovo.nome))
  },

  'calendario.aggiorna': async (contesto, azione) => {
    const t = testi()
    const scelto = calendarioDi(contesto.registro, azione.calendarioId)
    if (!scelto) return rifiutaCon('non-trovato', t.nonCePiu)
    let copiatoIl: string
    try {
      copiatoIl = await copiaDallOrigine(scelto)
    } catch (guasto) {
      return rifiuta(t.copiaDiPrima(motivoDi(guasto)))
    }
    if (!contesto.ancoraQui()) return documentoCambiato()
    // Tolto mentre si scaricava: «non trovato».
    const scritto = contesto.modifica((r) => {
      const suo = calendarioDi(r, azione.calendarioId)
      if (!suo) return false
      suo.copiatoIl = copiatoIl
    }, ['registro'], t.nonCePiu)
    if (!scritto.ok) return scritto
    return conMessaggio(t.aggiornato(scelto.nome))
  },

  'calendario.modifica': async (contesto, azione) => {
    const t = testi()
    const scelto = calendarioDi(contesto.registro, azione.calendarioId)
    if (!scelto) return rifiutaCon('non-trovato', t.nonCePiu)
    const nome = azione.nome?.trim()
    if (azione.nome !== undefined && !nome) return rifiuta(t.senzaNome)

    let origine: string | undefined
    let copiatoIl: string | undefined
    if (azione.origine !== undefined && azione.origine.trim() !== scelto.origine) {
      origine = origineAccettabile(azione.origine) ?? undefined
      if (!origine) return rifiuta(t.origineNonValida)
      // Prima la copia, poi il cambio: se la nuova origine non si legge, il
      // calendario resta quello di prima, con la sua copia.
      try {
        copiatoIl = await copiaDallOrigine({ ...scelto, origine })
      } catch (guasto) {
        return rifiuta(t.quelloDiPrima(motivoDi(guasto)))
      }
      if (!contesto.ancoraQui()) return documentoCambiato()
    }
    if (!nome && !origine) return fatto

    return contesto.modifica((r) => {
      const suo = calendarioDi(r, azione.calendarioId)
      if (!suo) return false
      if (nome) suo.nome = nome
      if (origine && copiatoIl) {
        suo.origine = origine
        suo.copiatoIl = copiatoIl
      }
    }, ['registro'], t.nonCePiu)
  },

  'calendario.togli': (contesto, azione) => {
    if (!calendarioDi(contesto.registro, azione.calendarioId)) return fatto
    const scritto = contesto.modifica((r) => {
      const prima = r.impostazioni.calendario
      if (!prima) return
      const calendari = prima.calendari.filter((c) => c.id !== azione.calendarioId)
      // Né calendari né regole: via l'impostazione intera.
      if (calendari.length === 0 && prima.regole.length === 0) delete r.impostazioni.calendario
      else r.impostazioni.calendario = { ...prima, calendari }
    }, ['registro'])
    // La copia va via solo a scrittura riuscita, o si rileggerebbe l'origine a ogni vista.
    if (scritto.ok) eliminaCopia(azione.calendarioId)
    return scritto
  },

  'calendario.applica': (contesto, azione) => {
    const t = testi()
    const registro = contesto.registro
    const errori: string[] = []
    // Senza `regole` quelle salvate restano: l'allineamento automatico non le
    // manda, perché le sue potrebbero essere vecchie.
    const regole = azione.regole
    // L'allineamento automatico (`ui/externalCalendar.ts`) si ricontrolla sul
    // registro di adesso: una lezione nel frattempo svolta o spostata non si tocca.
    const automatico = azione.automatico === true
    const giorno = oggi()

    const nuove: Lezione[] = []
    for (const voce of azione.crea) {
      if (!corsoPerId(registro, voce.corsoId)) {
        errori.push(t.corsoSparito)
        continue
      }
      const prima = voce.fasce[0]
      if (!prima) continue
      // Idempotente: se un'ora del corso si sovrappone già, non se ne crea un'altra.
      const gia = registro.lezioni.some((l) => {
        if (l.corsoId !== voce.corsoId || l.data !== voce.data) return false
        const da = inizioLezione(l)
        const a = fineLezione(l)
        const fine = voce.fasce[voce.fasce.length - 1].fine
        return da !== null && a !== null && da < fine && prima.inizio < a
      })
      if (gia) continue
      // La durata passata a `creaLezione` non conta: le fasce le dà il calendario.
      const { minutiUd } = registro.impostazioni
      const lezione = creaLezione(voce.corsoId, voce.data, prima.inizio, minutiUd)
      lezione.slot = slotDaFasce(voce.fasce)
      if (voce.aula) lezione.aula = voce.aula
      const esito = validaLezione(lezione, registro.impostazioni.minutiUd)
      if (!esito.valido) errori.push(...esito.errori.map((e) => `${voce.data}: ${e}`))
      else nuove.push(lezione)
    }

    for (const voce of azione.allinea) {
      const lezione = registro.lezioni.find((l) => l.id === voce.lezioneId)
      if (!lezione) errori.push(t.daAllineareSparita)
      else if (automatico && !allineamentoDaSoloAmmesso(registro, lezione, voce, giorno)) {
        errori.push(t.daConfermare(lezione.data))
      } else if (voce.fasce) {
        const esito = validaSlot(slotDaFasce(voce.fasce), registro.impostazioni.minutiUd)
        if (!esito.valido) errori.push(...esito.errori.map((e) => `${lezione.data}: ${e}`))
      }
    }
    for (const id of azione.annulla) {
      if (!registro.lezioni.some((l) => l.id === id)) errori.push(t.daAnnullareSparita)
    }
    if (errori.length > 0) return rifiuta(...new Set(errori))

    const impostazione = regole === undefined
      ? null
      : normalizzaCalendario({
          calendari: registro.impostazioni.calendario?.calendari ?? [],
          regole,
        })
    const allineate = new Set(azione.allinea.map((v) => v.lezioneId))
    const annullate = new Set(azione.annulla)
    const quando = istanteAdesso()

    const scritto = contesto.modifica((r) => {
      if (impostazione) r.impostazioni.calendario = impostazione
      else if (impostazione === undefined) delete r.impostazioni.calendario
      for (const voce of azione.allinea) {
        const lezione = r.lezioni.find((l) => l.id === voce.lezioneId)
        if (!lezione) continue
        if (voce.fasce) lezione.slot = slotDaFasce(voce.fasce, slotOrdinati(lezione.slot))
        if (voce.aula !== undefined) lezione.aula = voce.aula
        lezione.aggiornataIl = quando
      }
      for (const lezione of r.lezioni) {
        if (!annullate.has(lezione.id)) continue
        lezione.stato = 'annullata'
        lezione.aggiornataIl = quando
      }
      r.lezioni.push(...nuove)
      r.lezioni.sort((a, b) => a.data.localeCompare(b.data))
    }, ['registro', 'lezioni'])
    if (!scritto.ok) return scritto

    const detto = [
      nuove.length > 0 ? t.create(nuove.length) : '',
      allineate.size > 0 ? t.allineate(allineate.size) : '',
      annullate.size > 0 ? t.annullate(annullate.size) : '',
    ].filter(Boolean)
    return detto.length > 0
      ? conMessaggio(t.dalCalendario(detto))
      : conMessaggio(regole === undefined ? t.nienteDaCambiare : t.regoleSalvate)
  },
} satisfies Parte
