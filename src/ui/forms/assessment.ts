// Il momento di valutazione: che cosa si è valutato, quanto pesa, con che
// scala. Qui non se ne crea nessuno: un momento nasce solo dalla tappa del
// piano che dichiara una prova, nella lezione in cui la si è fatta. Qui si
// corregge quel che ne è uscito.

import { formattaData } from '../../domain/dates.js'
import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { vociConValore } from '../../domain/lists.js'
import { MOTIVI_ORFANO, motivoOrfano } from '../../domain/orphans.js'
import type { MomentoValutazione } from '../../domain/models.js'
import { parole } from '../../domain/words.testi.js'
import { campo, riga } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { icona } from '../components/icons.js'
import { apriModale } from '../components/modal.js'
import { h } from '../dom.js'
import { apriMomento } from '../calendarNavigation.js'
import {
  aggiorna,
  lezionePerId,
  nomeCorso,
  pianoPerId,
  stato,
  valutazionePerId,
} from '../state.js'

import {
  baseViva,
  numero,
  salva,
  tastoElimina,
  testo,
} from './common.js'
import { testi } from './assessment.testi.js'

/**
 * Da dove viene il momento, detto e non chiesto: il legame con ora e tappa lo
 * fa la scaletta, e una tendina permetterebbe di spostare la prova senza che
 * la scaletta lo sappia.
 */
function provenienza (momento: MomentoValutazione) {
  const t = testi()
  const lezione = lezionePerId(momento.lezioneId)
  const piano = pianoPerId(momento.pianoId)
  const tappa = momento.attivitaId
    ? piano?.attivita.find((a) => a.id === momento.attivitaId) ?? null
    : null

  const motivo = motivoOrfano(stato.registro, momento)
  const pezzi = [
    nomeCorso(momento.corsoId),
    lezione ? t.lezioneDel(formattaData(lezione.data)) : null,
    tappa ? t.tappa(tappa.titolo || parole().senzaTitolo) : null,
  ].filter(Boolean)

  return h(
    'div',
    { class: ['riquadro-collegamenti', motivo && 'riquadro-collegamenti--avviso'] },
    icona(motivo ? 'avviso' : 'piano'),
    h(
      'div',
      null,
      // Il legame sano si spiega dietro la «i»; quello rotto resta scritto, perché
      // dice che cosa fare.
      h(
        'div',
        null,
        pezzi.join(' · '),
        motivo === null
          ? suggerimento(t.aiutoProvenienza, { etichetta: t.provenienza })
          : null,
      ),
      motivo === null
        ? null
        : h(
            'small',
            { class: 'testo-quieto' },
            // Il motivo preciso: «la tappa non c'è più» e «non viene da nessun piano» si
            // risolvono in modo diverso.
            t.orfano(MOTIVI_ORFANO[motivo]),
          ),
    ),
  )
}

/**
 * Corregge un momento già nato: titolo, data, tipo, peso, scala, descrizione.
 * Il corso, l'ora e la tappa non si toccano — vengono dalla scaletta.
 */
export function moduloValutazione (momento: MomentoValutazione): void {
  const t = testi()
  const p = parole()
  apriModale({
    titolo: Uno(lessico().momento),
    sottotitolo: momento.titolo,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        provenienza(momento),
        riga(
          campo({
            nome: 'titolo',
            etichetta: p.titolo,
            valore: momento.titolo,
            segnaposto: t.segnapostoTitolo,
            richiesto: true,
            larghezza: 'meta',
          }),
          campo({
            nome: 'data',
            etichetta: p.data,
            tipo: 'date',
            valore: momento.data,
            richiesto: true,
            aiuto: t.aiutoData,
            larghezza: 'quarto',
          }),
          campo({
            nome: 'tipo',
            etichetta: parole().tipo,
            tipo: 'select',
            valore: momento.tipo,
            opzioni: vociConValore(stato.registro.impostazioni, 'tipoValutazione', momento.tipo),
            larghezza: 'quarto',
          }),
        ),
        riga(
          campo({
            nome: 'peso',
            etichetta: t.peso,
            tipo: 'number',
            valore: momento.peso,
            // `passo: 'any'`: con un passo di 0,1 il browser rifiuterebbe 1,25.
            min: 0,
            max: 10,
            passo: 'any',
            aiuto: t.aiutoPeso,
            larghezza: 'quarto',
          }),
          // Senza passo: gli estremi di una scala non hanno una grana.
          campo({
            nome: 'scalaMin',
            etichetta: t.votoMinimo,
            tipo: 'number',
            valore: momento.scala.min,
            passo: 'any',
            larghezza: 'quarto',
          }),
          campo({
            nome: 'scalaMax',
            etichetta: t.votoMassimo,
            tipo: 'number',
            valore: momento.scala.max,
            passo: 'any',
            larghezza: 'quarto',
          }),
          campo({
            nome: 'scalaSufficienza',
            etichetta: t.sufficienza,
            tipo: 'number',
            valore: momento.scala.sufficienza,
            passo: 'any',
            larghezza: 'quarto',
          }),
        ),
        campo({
          nome: 'descrizione',
          etichetta: p.descrizione,
          tipo: 'textarea',
          righe: 3,
          valore: momento.descrizione ?? '',
          segnaposto: t.segnapostoDescrizione,
        }),
      ),
    alSalva: async (valori, contesto) => {
      // Il momento com'è adesso: voti, recuperi e allegati non stanno qui e possono
      // essere cambiati altrove.
      const vivo = baseViva(contesto, true, momento, valutazionePerId(momento.id))
      if (!vivo) return
      const aggiornato: MomentoValutazione = {
        ...vivo,
        titolo: testo(valori.titolo),
        data: testo(valori.data),
        tipo: testo(valori.tipo) as MomentoValutazione['tipo'],
        peso: numero(valori.peso, 1),
        descrizione: testo(valori.descrizione),
        scala: {
          ...vivo.scala,
          min: numero(valori.scalaMin, vivo.scala.min),
          max: numero(valori.scalaMax, vivo.scala.max),
          sufficienza: numero(valori.scalaSufficienza, vivo.scala.sufficienza),
        },
      }
      await salva(
        contesto,
        { tipo: 'valutazione.salva', valutazione: aggiornato },
        t.aggiornato,
        () => apriMomento(aggiornato),
      )
    },
    azioniSecondarie: (contesto) =>
      tastoElimina({
        contesto,
        chiedi: { genere: 'valutazione', id: momento.id },
        azione: { tipo: 'valutazione.elimina', valutazioneId: momento.id },
        fatto: t.eliminato,
        poi: () => aggiorna({ valutazioneId: null }),
      }),
  })
}
