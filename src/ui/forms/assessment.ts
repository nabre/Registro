// Il momento di valutazione: che cosa si è valutato, quanto pesa, con che scala.
//
// Qui non se ne crea nessuno, e non è una dimenticanza. Un momento nasce in un
// posto solo: la tappa del piano che dichiara di essere una prova, dentro la
// lezione in cui la prova si è fatta. Prima si poteva crearne uno da cinque
// punti diversi — la vista Valutazioni, la scheda del corso, l'ora, il piano,
// il comando «nuovo» — e ognuno chiedeva a mano quel che il piano già sapeva:
// a quale ora appartiene, da quale tappa esce, che titolo e che peso avrebbe
// dovuto avere. Il risultato erano momenti scollegati dalla scaletta che li
// aveva previsti, doppioni della stessa prova, e una domanda senza risposta —
// «questa verifica di che tappa era?».
//
// Quindi: si aggancia dal piano, e qui si corregge quel che ne è uscito.

import { formattaData } from '../../domain/dates.js'
import { vociConValore } from '../../domain/lists.js'
import { MOTIVI_ORFANO, motivoOrfano } from '../../domain/orphans.js'
import type { MomentoValutazione } from '../../domain/models.js'
import { campo, riga } from '../components/base.js'
import { icona } from '../components/icons.js'
import { apriModale } from '../components/modal.js'
import { h } from '../dom.js'
import { aggiorna, classeDelCorsoId, nomeCorso, pianoPerId, stato } from '../state.js'

import {
  numero,
  salva,
  tastoElimina,
  testo,
} from './common.js'

/**
 * Da dove viene il momento, detto e non chiesto.
 *
 * Il legame con l'ora e con la tappa non è un campo da compilare: lo ha fatto
 * la scaletta, ed è l'unico posto in cui si fa. Mostrarlo come una tendina
 * significava permettere di spostare una prova su un'altra ora senza che la
 * scaletta ne sapesse niente — e allora la tappa continuava a offrire «Crea la
 * prova» per una prova che esisteva già altrove.
 */
function provenienza (momento: MomentoValutazione) {
  const lezione = momento.lezioneId
    ? stato.registro.lezioni.find((l) => l.id === momento.lezioneId) ?? null
    : null
  const piano = pianoPerId(momento.pianoId)
  const tappa = momento.attivitaId
    ? piano?.attivita.find((a) => a.id === momento.attivitaId) ?? null
    : null

  const motivo = motivoOrfano(stato.registro, momento)
  const pezzi = [
    nomeCorso(momento.corsoId),
    lezione ? `lezione del ${formattaData(lezione.data)}` : null,
    tappa ? `tappa «${tappa.titolo || 'senza titolo'}»` : null,
  ].filter(Boolean)

  return h(
    'div',
    { class: ['riquadro-collegamenti', motivo && 'riquadro-collegamenti--avviso'] },
    icona(motivo ? 'avviso' : 'piano'),
    h(
      'div',
      null,
      h('div', null, pezzi.join(' · ')),
      h(
        'small',
        { class: 'testo-quieto' },
        // Il motivo preciso, non un generico «viene da fuori»: «la tappa non
        // c'è più» e «non viene da nessun piano» sono due storie diverse, e si
        // decide diversamente che cosa farne.
        motivo === null
          ? 'Il legame lo fa la scaletta: si cambia di lì, non da qui.'
          : `Non è agganciato a nessuna tappa: ${MOTIVI_ORFANO[motivo]}. ` +
            'Resta nelle medie, ma non si sa più da che cosa sia uscito: si elimina ' +
            'dall’elenco in cima alla vista Valutazioni.',
      ),
    ),
  )
}

/**
 * Corregge un momento già nato: titolo, data, tipo, peso, scala, descrizione.
 * Il corso, l'ora e la tappa non si toccano — vengono dalla scaletta.
 */
export function moduloValutazione (momento: MomentoValutazione, dopo?: () => void): void {
  apriModale({
    titolo: 'Momento di valutazione',
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
            etichetta: 'Titolo',
            valore: momento.titolo,
            segnaposto: 'Verifica sulle equazioni',
            richiesto: true,
            larghezza: 'meta',
          }),
          campo({
            nome: 'data',
            etichetta: 'Data',
            tipo: 'date',
            valore: momento.data,
            richiesto: true,
            aiuto: 'Nasce dall’ora della prova; si sposta solo per un recupero.',
            larghezza: 'quarto',
          }),
          campo({
            nome: 'tipo',
            etichetta: 'Tipo',
            tipo: 'select',
            valore: momento.tipo,
            opzioni: vociConValore(stato.registro.impostazioni, 'tipoValutazione', momento.tipo),
            larghezza: 'quarto',
          }),
        ),
        riga(
          campo({
            nome: 'peso',
            etichetta: 'Peso',
            tipo: 'number',
            valore: momento.peso,
            // `passo: 'any'` è la correzione di un errore vero: con un passo di
            // 0,1 il browser rifiutava 1,25 — «i due valori più vicini sono 1,2
            // e 1,3» — e il campo non si lasciava salvare. La ponderazione è
            // decimale davvero, e il passo non deve dettarne la grana.
            min: 0,
            max: 10,
            passo: 'any',
            aiuto: 'Quanto conta nella media: da 0 a 10, decimali ammessi. Zero non fa media.',
            larghezza: 'quarto',
          }),
          // Senza passo, come nelle impostazioni: gli estremi di una scala non
          // hanno una grana, e un passo da un quarto rifiutava quel che non ci
          // cadeva sopra.
          campo({ nome: 'scalaMin', etichetta: 'Voto minimo', tipo: 'number', valore: momento.scala.min, passo: 'any', larghezza: 'quarto' }),
          campo({ nome: 'scalaMax', etichetta: 'Voto massimo', tipo: 'number', valore: momento.scala.max, passo: 'any', larghezza: 'quarto' }),
          campo({
            nome: 'scalaSufficienza',
            etichetta: 'Sufficienza',
            tipo: 'number',
            valore: momento.scala.sufficienza,
            passo: 'any',
            larghezza: 'quarto',
          }),
        ),
        campo({
          nome: 'descrizione',
          etichetta: 'Descrizione',
          tipo: 'textarea',
          righe: 3,
          valore: momento.descrizione ?? '',
          segnaposto: 'contenuti, criteri, materiale ammesso',
        }),
      ),
    alSalva: async (valori, contesto) => {
      const aggiornato: MomentoValutazione = {
        ...momento,
        titolo: testo(valori.titolo),
        data: testo(valori.data),
        tipo: testo(valori.tipo) as MomentoValutazione['tipo'],
        peso: numero(valori.peso, 1),
        descrizione: testo(valori.descrizione),
        scala: {
          ...momento.scala,
          min: numero(valori.scalaMin, momento.scala.min),
          max: numero(valori.scalaMax, momento.scala.max),
          sufficienza: numero(valori.scalaSufficienza, momento.scala.sufficienza),
        },
      }
      await salva(
        contesto,
        { tipo: 'valutazione.salva', valutazione: aggiornato },
        'Momento aggiornato.',
        () => {
          // Chi ha aperto questo modulo da dentro un'ora del Registro vuole
          // restarci: sbalzarlo alla vista Valutazioni gli farebbe perdere il
          // filo di quel che stava facendo.
          if (dopo) {
            dopo()
            return
          }
          aggiorna({
            vista: 'valutazioni',
            valutazioneId: aggiornato.id,
            filtroClasseId: classeDelCorsoId(aggiornato.corsoId)?.id ?? stato.filtroClasseId,
          })
        },
      )
    },
    azioniSecondarie: (contesto) =>
      tastoElimina({
        contesto,
        chiedi: { genere: 'valutazione', id: momento.id },
        azione: { tipo: 'valutazione.elimina', valutazioneId: momento.id },
        fatto: 'Momento eliminato.',
        poi: () => aggiorna({ valutazioneId: null }),
      }),
  })
}
