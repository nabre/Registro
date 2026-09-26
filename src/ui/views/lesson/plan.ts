// La scaletta dell'ora: il piano assegnato alla lezione, le sue tappe con lo
// stato di avanzamento e le risorse che si portano in aula.

import {
  avanzamentoPiano,
  confrontaPianoConLezione,
  minutiDiAttivita,
  scalettaSulleUd,
} from '../../../domain/calculations.js'
import {
  attivitaValutata,
  nomeTipoAttivita,
  riassuntoParametri,
} from '../../../domain/activities.js'
import { formattaDurata } from '../../../domain/dates.js'
import type { Lezione, Risorsa, StatoAttivita } from '../../../domain/models.js'
import {
  barra,
  collegamento,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { icona } from '../../components/icons.js'
import { h } from '../../dom.js'
import { moduloPiano, moduloAssegnaPiano } from '../../forms.js'
import { azione } from '../../bridge.js'
import { pianoPerId, stato, uriDato } from '../../state.js'
import { pulsanteValutazione } from './assessments.js'
import { Molti, Uno, quanti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './plan.testi.js'

/** Gli stati di una tappa, con il segno del pulsante; il nome sta nel catalogo. */
const STATI_ATTIVITA: Array<{ valore: StatoAttivita; sigla: string }> = [
  { valore: 'da-fare', sigla: '·' },
  { valore: 'svolta', sigla: '✓' },
  { valore: 'parziale', sigla: '~' },
  { valore: 'saltata', sigla: '×' },
]

/**
 * Le risorse di un piano viste dall'aula: si aprono e basta; si modificano
 * nella vista Piani.
 */
function risorseDaAula (
  pianoId: string,
  attivitaId: string | null,
  risorse: Risorsa[],
): HTMLElement | null {
  if (risorse.length === 0) return null

  return h(
    'ul',
    { class: 'risorse__elenco risorse__elenco--aula' },
    ...risorse.map((risorsa) => {
      const apri = () =>
        void azione({ tipo: 'risorsa.apri', pianoId, attivitaId, risorsaId: risorsa.id })
      const indirizzo = risorsa.tipo === 'immagine' ? uriDato(risorsa.file) : null

      return h(
        'li',
        // testo-fisso: classi CSS
        { class: `risorsa risorsa--${risorsa.tipo}` },
        indirizzo
          ? h('img', {
              class: 'risorsa__miniatura',
              attr: { src: indirizzo, alt: risorsa.titolo, loading: 'lazy' },
              onclick: apri,
            })
          : icona(risorsa.tipo === 'collegamento' ? 'collegamento' : 'documento', 'risorsa__simbolo'),
        h(
          'div',
          { class: 'risorsa__corpo' },
          collegamento({ testo: risorsa.titolo || parole().senzaTitolo, al: apri }),
          risorsa.note ? h('p', { class: 'risorsa__note' }, risorsa.note) : null,
        ),
      )
    }),
  )
}

export function pannelloPiano (lezione: Lezione): HTMLElement {
  const piano = pianoPerId(lezione.pianoId)
  const t = testi()
  const L = lessico()

  if (!piano) {
    return scheda({
      titolo: Uno(L.pianoLezione),
      contenuto: statoVuoto({
        simbolo: 'piano',
        titolo: t.nessunPiano,
        testo: t.nessunPianoTesto,
        azione: pulsante({
          testo: t.assegna,
          variante: 'primario',
          simbolo: 'piano',
          al: () => moduloAssegnaPiano(lezione),
        }),
      }),
    })
  }

  const { minutiUd } = stato.registro.impostazioni
  const confronto = confrontaPianoConLezione(piano, lezione, minutiUd)
  // La scaletta posata sull'ora vera: quando cade ogni tappa e dove sta l'intervallo.
  const posata = scalettaSulleUd(piano.attivita, lezione, minutiUd)
  const avanzamento = avanzamentoPiano(lezione, piano)
  const perAttivita = new Map(lezione.avanzamento.map((a) => [a.attivitaId, a]))

  return scheda({
    titolo: Uno(L.pianoLezione),
    // Il sottotitolo dice quanto pesa la scaletta, non il nome del piano.
    sottotitolo:
      `${quanti(piano.attivita.length, L.attivita)} · ` +
      formattaDurata(minutiDiAttivita(confronto.durataPiano, posata.minutiPerUd)),
    azioni: [
      pulsante({
        testo: t.cambia,
        variante: 'sottile',
        simbolo: 'piano',
        al: () => moduloAssegnaPiano(lezione),
      }),
      pulsante({
        simbolo: 'matita',
        variante: 'fantasma',
        // Si modifica di qui, con le UD di quest'ora sotto gli occhi.
        titolo: t.modificaScaletta,
        al: () => moduloPiano(piano, undefined, undefined, lezione),
      }),
    ],
    contenuto: h(
      'div',
      { class: 'piano-lezione' },
      h(
        'div',
        { class: 'piano-lezione__sintesi' },
        barra(avanzamento, 'positivo'),
        h(
          'div',
          { class: 'piano-lezione__conti' },
          pastiglia(t.svolto(Math.round(avanzamento * 100)), 'informativo'),
          pastiglia(
            t.piano(formattaDurata(minutiDiAttivita(confronto.durataPiano, posata.minutiPerUd))),
            'quiete',
            'orologio',
          ),
          Math.abs(confronto.scostamento) >= 0.05
            ? pastiglia(
                confronto.scostamento > 0
                  ? t.diTroppo(minutiDiAttivita(confronto.scostamento, posata.minutiPerUd))
                  : t.liberi(minutiDiAttivita(-confronto.scostamento, posata.minutiPerUd)),
                confronto.scostamento > 0 ? 'attenzione' : 'positivo',
              )
            : pastiglia(t.inOrario, 'positivo'),
          // Si avvisa solo quando si sfora l'intervallo.
          confronto.oltreLaPausa > 0
            ? pastiglia(
                t.oltreLaPausa(confronto.oltreLaPausa),
                'attenzione',
              )
            : null,
        ),
      ),
      piano.obiettivi.length > 0
        ? h(
            'div',
            { class: 'piano-lezione__obiettivi' },
            h('h5', null, t.obiettivi),
            h('ul', null, ...piano.obiettivi.map((o) => h('li', null, o))),
          )
        : null,
      // Il materiale per tutta l'ora, in cima.
      piano.risorse.length > 0
        ? h(
            'div',
            { class: 'piano-lezione__risorse' },
            h('h5', null, Molti(L.risorsa)),
            risorseDaAula(piano.id, null, piano.risorse),
          )
        : null,
      h(
        'ol',
        { class: 'scaletta scaletta--aula' },
        // I nomi delle colonne della scaletta.
        h(
          'li',
          { class: 'scaletta__voce scaletta__voce--intestazione' },
          h('span', null, '#'),
          h('span', null, Uno(L.attivita)),
          h('span', null, parole().tipo),
          h('span', null, t.durata),
          h('span', null, t.quando),
          h('span', null, Uno(L.prova)),
          h('span', null, parole().stato),
        ),
        ...piano.attivita.flatMap((attivita, indice) => {
          const corrente = perAttivita.get(attivita.id)?.stato ?? 'da-fare'
          const dove = posata.posti[indice]
          // L'intervallo si vede dov'è, fra le tappe, con i minuti che dura.
          const bloccoDi = (ud: number | null | undefined): number | null =>
            ud === null || ud === undefined ? null : posata.ud[ud]?.blocco ?? null
          const apre = bloccoDi(dove?.ud)
          const chiudeLaPrima = indice > 0 ? bloccoDi(posata.posti[indice - 1]?.udFine) : null
          const stacco =
            apre !== null && chiudeLaPrima !== null && apre !== chiudeLaPrima
              ? posata.blocchi[apre]
              : null
          return [
            stacco
              ? h(
                  'li',
                  { class: 'scaletta__pausa' },
                  icona('pausa', 'icona--minuta'),
                  h('span', null, t.intervallo(stacco.pausaPrima)),
                )
              : null,
            h(
              'li',
              { class: ['scaletta__voce', `scaletta__voce--${corrente}`] },
              h('span', { class: 'scaletta__numero' }, String(indice + 1)),
              h(
                'div',
                { class: 'scaletta__titolo' },
                h('strong', null, attivita.titolo || parole().senzaTitolo),
                dove?.oltreLaPausa
                  ? pastiglia(t.aCavallo, 'attenzione')
                  : null,
              ),
              h(
                'span',
                { class: 'scaletta__tipo' },
                pastiglia(nomeTipoAttivita(attivita.tipo, stato.registro.impostazioni), 'quiete'),
              ),
              h('span', { class: 'scaletta__durata' }, formattaDurata(minutiDiAttivita(attivita.durataUd, posata.minutiPerUd))),
              // Quando cade davvero, pause comprese.
              h(
                'span',
                { class: 'scaletta__orario' },
                dove?.oraInizio ? `${dove.oraInizio}–${dove.oraFine ?? '…'}` : '—',
              ),
              // La tappa che è una prova lo dice qui, ed è da qui che il suo momento nasce.
              h(
                'span',
                { class: 'scaletta__prova' },
                attivitaValutata(attivita) ? pulsanteValutazione(lezione, attivita) : null,
              ),
              h(
                'span',
                { class: 'scaletta__stati' },
                ...STATI_ATTIVITA.map((voce) =>
                  h(
                    'button',
                    {
                      class: ['stato-attivita', corrente === voce.valore && 'stato-attivita--attivo'],
                      type: 'button',
                      attr: {
                        title: t.stati[voce.valore],
                        'aria-pressed': corrente === voce.valore,
                      },
                      onclick: () =>
                        void azione({
                          tipo: 'avanzamento.imposta',
                          lezioneId: lezione.id,
                          attivitaId: attivita.id,
                          stato: voce.valore,
                        }),
                    },
                    voce.sigla,
                  ),
                ),
              ),
              // Descrizione e parametri scendono sotto, allineati al titolo.
              attivita.descrizione ||
              riassuntoParametri(attivita, stato.registro.impostazioni) ||
              attivita.risorse.length > 0
                ? h(
                    'div',
                    { class: 'scaletta__estesa' },
                    attivita.descrizione
                      ? h('p', { class: 'scaletta__descrizione' }, attivita.descrizione)
                      : null,
                    // I parametri del tipo in una riga («gruppi da 3 · a sorteggio»).
                    riassuntoParametri(attivita, stato.registro.impostazioni)
                      ? h(
                          'p',
                          { class: 'scaletta__parametri testo-quieto' },
                          riassuntoParametri(attivita, stato.registro.impostazioni),
                        )
                      : null,
                    risorseDaAula(piano.id, attivita.id, attivita.risorse),
                  )
                : null,
            ),
          ]
        }),
      ),
    ),
  })
}
