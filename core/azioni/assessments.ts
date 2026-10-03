// I momenti di valutazione, i voti e le prove corrette.
// I PDF delle prove seguono il momento: eliminarlo li porta via (vedi `cestina`).

import * as apparato from 'apparato'

import { comeAdesso } from '#core/dati/draft.js'
import { deposito } from '#core/dati/store.js'
import { archiviaCopia, nomeFileArchivio, percorsoValutazione, pulisciCopiaOrfana } from '#core/dati/filing.js'
import { arrotondaVoto, nomeCompleto, votoValido } from '#core/dominio/calculations.js'
import { creaValutazione } from '#core/dominio/factories.js'
import { classeDelMomento, corsoPerId } from '#core/dominio/courses.js'
import { agganciato } from '#core/dominio/orphans.js'
import { nuovoIdAllegato } from '#core/dominio/identifiers.js'
import type { Allegato, MomentoValutazione, Registro } from '#core/dominio/models.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { validaValutazione } from '#core/dominio/validation.js'
import {
  aOraAperta,
  apriFile,
  cestina,
  conMessaggio,
  documentoCambiato,
  fatto,
  rifiuta,
  rifiutaCon,
  riponi,
  scegliUnFile,
  type Parte,
} from './context.js'
import { testi as comuni } from './context.testi.js'
import { testi } from './assessments.testi.js'
import { testi as testiProgetti } from './projects.testi.js'
import { integrazioneDi } from '#core/dominio/projects.js'
import { istanteAdesso } from '#core/dominio/dates.js'

/**
 * Vero se la persona non è iscritta alla classe del momento: un voto fuori
 * classe non lo mostra nessuna griglia. I ritirati contano come iscritti; un
 * momento senza classe non si giudica, o i suoi voti diventano intoccabili.
 */
function fuoriClasse (registro: Registro, momento: MomentoValutazione, allievoId: string): boolean {
  const classe = classeDelMomento(registro, momento)
  return classe !== null && !classe.allievi.some((a) => a.id === allievoId)
}

/** Vero se il momento ha dati intestati a persone: voti, recuperi, prove. */
function conDatiDiPersone (momento: MomentoValutazione): boolean {
  return (
    momento.voti.some((v) => v.valore !== null || v.assente) ||
    (momento.recuperi ?? []).length > 0 ||
    momento.allegati.some((a) => a.allievoId !== null)
  )
}

export const valutazioni = {
  /** Il momento di valutazione di una tappa del piano; se c'è già, torna quello. */
  'valutazione.daAttivita': aOraAperta((contesto, azione) => {
    const lezione = contesto.registro.lezioni.find((l) => l.id === azione.lezioneId)
    if (!lezione) return rifiuta(comuni().nonTrovato.lezione)
    const piano = contesto.registro.piani.find((p) => p.id === lezione.pianoId)
    const attivita = piano?.attivita.find((a) => a.id === azione.attivitaId)
    if (!piano || !attivita) return rifiuta(testi().tappaSparita)

    const gia = contesto.registro.valutazioni.find(
      (v) => v.lezioneId === lezione.id && v.attivitaId === attivita.id,
    )
    if (gia) return { ok: true, creato: { id: gia.id } }

    const prevista = attivita.valutazione ?? null
    const momento = creaValutazione(
      lezione.corsoId,
      prevista?.titolo || attivita.titolo || testi().verifica,
      contesto.registro.impostazioni.scala,
      lezione.data,
    )
    momento.lezioneId = lezione.id
    momento.pianoId = piano.id
    momento.attivitaId = attivita.id
    // La prova di una tappa di progetto è del progetto, se è integrato nel corso.
    const progetto = attivita.progettoId
      ? contesto.registro.progetti.find((p) => p.id === attivita.progettoId)
      : undefined
    if (progetto && integrazioneDi(progetto, lezione.corsoId)) momento.progettoId = progetto.id
    if (prevista) {
      momento.tipo = prevista.tipo
      momento.peso = prevista.peso
    }

    const salvato = contesto.modifica((r) => {
      r.valutazioni.push(momento)
    }, ['valutazioni'])
    if (!salvato.ok) return salvato
    return { ok: true, creato: { id: momento.id } }
  }),

  /**
   * Il momento intero: titolo, data, tipo, peso, scala, descrizione.
   * Voti, recuperi e PDF di un momento esistente restano quelli del registro
   * (chi salva può avere una copia vecchia); si cambiano con `voto.imposta`,
   * `recupero.imposta`, `allegato.*`. Un momento nuovo nasce coi suoi voti ma
   * senza allegati: un percorso scelto da chi chiama potrebbe essere altrui.
   */
  'valutazione.salva': (contesto, azione) => {
    const esito = validaValutazione(azione.valutazione)
    if (!esito.valido) return { ok: false, errori: esito.errori }
    const registro = contesto.registro
    const chiesto = azione.valutazione
    // Rimandi a cose che non ci sono: il momento finirebbe sganciato da subito.
    if (!corsoPerId(registro, chiesto.corsoId)) return rifiuta(comuni().nonTrovato.corso)
    const lezione = chiesto.lezioneId ? registro.lezioni.find((l) => l.id === chiesto.lezioneId) : null
    if (chiesto.lezioneId && !lezione) {
      return rifiuta(comuni().nonTrovato.lezione)
    }
    if (lezione && lezione.corsoId !== chiesto.corsoId) {
      return rifiuta(testi().lezioneAltroCorso)
    }
    const piano = chiesto.pianoId ? registro.piani.find((p) => p.id === chiesto.pianoId) : null
    if (chiesto.pianoId && !piano) {
      return rifiuta(comuni().nonTrovato.piano)
    }
    if (piano && piano.corsoId && piano.corsoId !== chiesto.corsoId) {
      return rifiuta(testi().pianoAltroCorso)
    }
    if (piano && lezione?.pianoId && piano.id !== lezione.pianoId) {
      return rifiuta(testi().pianoDiversoDaLezione)
    }
    if (chiesto.progettoId) {
      const progetto = registro.progetti.find((p) => p.id === chiesto.progettoId)
      if (!progetto) return rifiutaCon('non-trovato', comuni().vociSparite.progetti)
      if (!integrazioneDi(progetto, chiesto.corsoId)) return rifiuta(testiProgetti().progettoAltroCorso)
    }
    const vivo = registro.valutazioni.find((v) => v.id === chiesto.id)
    if (vivo) {
      // Voti di persone di un'altra classe non li mostrerebbe nessuna griglia.
      const da = corsoPerId(registro, vivo.corsoId)?.classeId ?? null
      const a = corsoPerId(registro, chiesto.corsoId)?.classeId ?? null
      if (da !== null && da !== a && conDatiDiPersone(vivo)) return rifiuta(testi().altraClasse)
      if (vivo.voti.some((v) => v.valore !== null && !votoValido(v.valore, chiesto.scala))) {
        return rifiuta(testi().scalaStretta(chiesto.scala.min, chiesto.scala.max))
      }
    }
    const nuova = !vivo
    const momento = { ...chiesto, aggiornatoIl: istanteAdesso() }
    const scritto = contesto.modifica((r) => {
      // Com'è adesso e non la bozza: i suoi pezzi vanno in un oggetto nuovo.
      const viva = comeAdesso(r.valutazioni.find((v) => v.id === momento.id))
      const salvato = viva
        ? {
            ...momento,
            // I voti si riportano sul passo della scala nuova, come `voto.imposta`.
            voti: viva.voti.map((v) =>
              v.valore === null ? v : { ...v, valore: arrotondaVoto(v.valore, momento.scala) },
            ),
            recuperi: viva.recuperi,
            allegati: viva.allegati,
          }
        : { ...momento, allegati: [] }
      riponi(r.valutazioni, salvato, (a, b) => a.data.localeCompare(b.data))
    }, ['valutazioni'])
    if (!scritto.ok) return scritto
    return nuova ? { ok: true, creato: { id: momento.id } } : fatto
  },

  // Via il momento, via anche i suoi PDF, come promette la domanda di conferma.
  'valutazione.elimina': async (contesto, azione) => {
    return contesto.elimina({ genere: 'valutazione', id: azione.valutazioneId })
  },

  /**
   * Elimina i momenti sganciati indicati, uno per uno via `elimina` (che cestina
   * i PDF). Per id, perché si cancella quel che si è visto; chi nel frattempo
   * non è più sganciato si salta in silenzio.
   */
  'valutazione.eliminaOrfane': async (contesto, azione) => {
    const ids = new Set(azione.ids)
    if (ids.size === 0) return rifiuta(testi().nessunoDaEliminare)

    let tolti = 0
    let voti = 0
    for (const id of ids) {
      const momento = contesto.registro.valutazioni.find((v) => v.id === id)
      if (!momento || agganciato(contesto.registro, momento)) continue
      voti += momento.voti.filter((v) => v.valore !== null).length
      const esito = await contesto.elimina({ genere: 'valutazione', id })
      if (esito.ok) tolti += 1
    }

    if (tolti === 0) return conMessaggio(testi().nessunoSganciato, 'info')
    return conMessaggio(testi().sganciatiEliminati(tolti, voti), 'info')
  },

  'voto.imposta': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta(comuni().nonTrovato.momento)
    if (fuoriClasse(contesto.registro, momento, azione.allievoId)) {
      return rifiuta(comuni().fuoriClasse)
    }
    if (azione.valore !== null && !votoValido(azione.valore, momento.scala)) {
      return rifiuta(testi().fuoriScala(momento.scala.min, momento.scala.max))
    }
    // Il voto entra sul passo della scala (quarti di punto: 4.3 → 4.25).
    // Mutua esclusione rigida: se assente=true, il valore è forzato a null; se valore != null, assente è false.
    const assente = azione.valore !== null ? false : Boolean(azione.assente)
    const valore = assente || azione.valore === null
      ? null
      : arrotondaVoto(azione.valore, momento.scala)
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      const voto = bersaglio.voti.find((v) => v.allievoId === azione.allievoId)
      if (voto) {
        voto.valore = valore
        voto.assente = assente
        if (azione.nota !== undefined) voto.nota = azione.nota
      } else {
        bersaglio.voti.push({
          allievoId: azione.allievoId,
          valore,
          assente,
          nota: azione.nota,
        })
      }
    })
  },

  /**
   * Riconsegna la prova a tutta la classe: una data su ogni riga con un voto,
   * così chi mancava resta da riconsegnare. Chi ha già la sua data la tiene;
   * `il: null` toglie la data a tutti.
   */
  'valutazione.riconsegna': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta(comuni().nonTrovato.momento)
    // Non si riconsegna prima della data della prova.
    if (azione.il !== null && momento.data > azione.il) {
      return rifiuta(testi().nonSvolta)
    }
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      for (const voto of bersaglio.voti) {
        // Solo chi ha un foglio: l'assente ha il recupero, con la sua riconsegna.
        if (voto.assente || voto.valore === null) continue
        if (azione.il === null) voto.riconsegnataIl = null
        else if (!voto.riconsegnataIl) voto.riconsegnataIl = azione.il
      }
    })
  },

  /**
   * Fissa (o disdice, o dispensa) il recupero di una prova per un assente.
   * Scrive la riga fra i recuperi e, se la casella non c'è, il voto assente.
   * Il voto del recupero va nella casella della prova, con `voto.imposta`.
   */
  'recupero.imposta': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta(comuni().nonTrovato.momento)
    if (fuoriClasse(contesto.registro, momento, azione.allievoId)) {
      return rifiuta(comuni().fuoriClasse)
    }
    if (azione.previstoIl && azione.previstoIl < momento.data) {
      return rifiuta(testi().recuperoPrima)
    }

    const prima = (momento.recuperi ?? []).find((r) => r.allievoId === azione.allievoId) ?? null
    // `riconsegnataIl` assente vuol dire «lascia com'era».
    const riconsegnataIl =
      azione.riconsegnataIl === undefined ? prima?.riconsegnataIl ?? null : azione.riconsegnataIl
    const rifattaIl = azione.previstoIl ?? prima?.previstoIl ?? null
    // Non si riconsegna prima di aver rifatto la prova.
    if (riconsegnataIl && rifattaIl && riconsegnataIl < rifattaIl) {
      return rifiuta(testi().recuperoNonRifatto)
    }

    const adesso = istanteAdesso()
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      if (!bersaglio.voti.some((v) => v.allievoId === azione.allievoId)) {
        bersaglio.voti.push({ allievoId: azione.allievoId, valore: null, assente: true })
      }

      const righe = (bersaglio.recuperi ?? []).filter((r) => r.allievoId !== azione.allievoId)
      const nota = azione.nota || undefined
      const dispensato = azione.dispensato === true

      // Riga vuota: sparisce e il recupero torna «da fissare» (non dispensato).
      if (azione.previstoIl || nota || dispensato || riconsegnataIl) {
        righe.push({
          allievoId: azione.allievoId,
          previstoIl: dispensato ? null : azione.previstoIl,
          // Dispensato: non c'è un foglio da riconsegnare.
          riconsegnataIl: dispensato ? null : riconsegnataIl,
          nota,
          dispensato: dispensato || undefined,
          aggiornatoIl: adesso,
        })
      }

      bersaglio.recuperi = righe
    })
  },

  /** Il giorno in cui un allievo ha riavuto la sua prova corretta; `null` la toglie. */
  'voto.riconsegna': (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    if (!momento) return rifiuta(comuni().nonTrovato.momento)
    // Non si riconsegna prima della data della prova.
    if (azione.il !== null && momento.data > azione.il) {
      return rifiuta(testi().nonSvolta)
    }

    // Casella vuota o assente: nessun foglio da riconsegnare. Togliere la data
    // invece è sempre permesso.
    const casella = momento.voti.find((v) => v.allievoId === azione.allievoId)
    if (azione.il !== null && casella && (casella.assente || casella.valore === null)) {
      return rifiuta(casella.assente ? testi().eraAssente : testi().senzaVoto)
    }

    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      const voto = bersaglio.voti.find((v) => v.allievoId === azione.allievoId)
      // Nessuna casella: non si inventa un voto, e lo si dice.
      if (!voto) return false
      voto.riconsegnataIl = azione.il
    }, [], testi().senzaCasella)
  },

  'allegato.aggiungi': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    const t = testi()
    if (!momento) return rifiuta(comuni().nonTrovato.momento)
    if (!deposito()) return rifiuta(comuni().senzaAnno)

    // La prova è sempre di qualcuno; il recupero di uno (il compito rifatto) o
    // di nessuno (il testo della prova di recupero).
    const perAllievo = azione.ruolo === 'prova' || azione.ruolo === 'recupero'
    const allievoId = perAllievo ? azione.allievoId ?? null : null
    if (azione.ruolo === 'prova' && !allievoId) {
      return rifiuta(t.serveChi)
    }
    // Senza classe non c'è dove archiviare: si rifiuta prima del dialogo.
    const classe = classeDelMomento(contesto.registro, momento)
    if (!classe) return rifiuta(t.senzaClasse)
    const allievo = allievoId ? classe.allievi.find((a) => a.id === allievoId) ?? null : null
    if (allievoId && !allievo) return rifiuta(t.pifFuoriClasse)

    let scelto: { nome: string, uri: apparato.Uri, estensione: string } | null = null
    if (azione.file) {
      const uri = apparato.Uri.file(azione.file)
      const nome = uri.path.split('/').pop() ?? 'allegato.pdf'
      const estensione = nome.includes('.') ? `.${nome.split('.').pop()}` : '.pdf'
      scelto = { nome, uri, estensione }
    } else {
      scelto = await scegliUnFile({
        titolo: allievo
          ? t.provaDi(azione.ruolo === 'recupero', nomeCompleto(allievo))
          : `${lessico().ruoliAllegato[azione.ruolo]} — ${momento.titolo}`,
        tasto: comuni().allega,
        filtri: { PDF: ['pdf'] },
      })
    }
    if (!scelto) return fatto
    // Durante il dialogo può essersi aperto un altro anno.
    if (!contesto.ancoraQui()) return documentoCambiato()

    const nomeDestinazione = nomeFileArchivio(
      classe.nome,
      allievo ? nomeCompleto(allievo) : null,
      momento.titolo,
      // Prova e recupero stanno nella stessa cartella: il nome li distingue.
      allievo && azione.ruolo !== 'recupero' ? 'prova' : azione.ruolo,
      '.pdf',
    )
    // Il PDF nuovo sostituisce quello dello stesso ruolo e allievo.
    const vecchio = momento.allegati.find(
      (a) => a.ruolo === azione.ruolo && a.allievoId === allievoId,
    )?.file ?? null
    // Copia, non riferimento: il PDF scelto può stare in Download e sparire.
    const esito = await archiviaCopia(
      percorsoValutazione(
        classe,
        corsoPerId(contesto.registro, momento.corsoId),
        nomeDestinazione,
        allievo ? nomeCompleto(allievo) : null,
      ),
      scelto.uri,
      vecchio,
    )
    if ('errore' in esito) return rifiuta(comuni().copiaNonRiuscita(esito.errore))

    const allegato: Allegato = {
      id: nuovoIdAllegato(),
      ruolo: azione.ruolo,
      allievoId,
      nome: scelto.nome,
      file: esito.relativo,
      aggiuntoIl: istanteAdesso(),
    }
    // `contesto.modifica` rifiuta se durante la copia il documento è cambiato
    // o il momento è sparito.
    const scritto = contesto.modifica((r) => {
      const bersaglio = r.valutazioni.find((v) => v.id === azione.valutazioneId)
      if (!bersaglio) return false
      // Una voce sola per ruolo e allievo.
      bersaglio.allegati = bersaglio.allegati.filter(
        (a) => !(a.ruolo === allegato.ruolo && a.allievoId === allegato.allievoId),
      )
      bersaglio.allegati.push(allegato)
      bersaglio.aggiornatoIl = allegato.aggiuntoIl
    }, ['valutazioni'], comuni().sparito.momento)
    if (!scritto.ok) {
      pulisciCopiaOrfana(esito.relativo)
      return scritto
    }
    // Il PDF di prima con un altro nome (rinomine) non è stato sovrascritto: nel cestino.
    if (vecchio && vecchio !== esito.relativo) await cestina(vecchio)
    return { ok: true, creato: { id: allegato.id } }
  },

  // Il PDF si apre con il visualizzatore del sistema: il registro non ne ha uno.
  'allegato.apri': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    const allegato = momento?.allegati.find((a) => a.id === azione.allegatoId)
    if (!allegato) return rifiuta(comuni().nonTrovato.allegato)
    return apriFile(allegato.file, allegato.nome)
  },

  'allegato.elimina': async (contesto, azione) => {
    const momento = contesto.registro.valutazioni.find((v) => v.id === azione.valutazioneId)
    const allegato = momento?.allegati.find((a) => a.id === azione.allegatoId)
    if (!allegato) return rifiuta(comuni().nonTrovato.allegato)
    await cestina(allegato.file)
    return contesto.suVoce('valutazioni', azione.valutazioneId, (bersaglio) => {
      bersaglio.allegati = bersaglio.allegati.filter((a) => a.id !== azione.allegatoId)
    })
  },
} satisfies Parte
