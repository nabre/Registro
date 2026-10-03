// I giudizi di un progetto: note datate su una persona o sulla classe. In cima
// una riga per scriverne uno al volo; sotto l'elenco, dal più recente. Dentro
// un'ora il giudizio nuovo si lega a lei e l'elenco mostra quelli dell'ora.

import { nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type { GiudizioProgetto, Lezione, ProgettoNelCorso } from '#core/dominio/models.js'
import { giornoDellaVoce } from '#core/dominio/projects.js'
import { parole } from '#core/dominio/words.testi.js'
import { pulsante, quieto, tendina } from '#ui/components/base.js'
import { azione } from '#ui/bridge.js'
import { h } from '#ui/dom.js'
import { allieviDelProgetto, attiviDelProgetto, moduloGiudizio } from '#ui/forms/project.js'
import { stato } from '#ui/state.js'
import { testi } from './judgements.testi.js'

/** Per chi si scrive il prossimo giudizio, per progetto: resta fra un ridisegno e l'altro. */
const destinatari = new Map<string, string>()

export function giudiziDelProgetto (progetto: ProgettoNelCorso, lezione: Lezione | null): HTMLElement {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  const nomi = new Map(allievi.map((a) => [a.id, nomeCompleto(a)]))
  const chi = destinatari.get(progetto.id) ?? ''

  const campo = h('input', {
    class: 'campo__controllo giudizi-progetto__testo',
    type: 'text',
    placeholder: t.segnaposto,
    // testo-fisso: chiave di fuoco
    dataset: { fuoco: `giudizio-nuovo-${progetto.id}` },
    attr: { 'aria-label': t.nuovo },
    onkeydown: (evento: KeyboardEvent) => {
      if (evento.key === 'Enter') {
        evento.preventDefault()
        void aggiungi()
      }
    },
  })
  const aggiungi = async (): Promise<void> => {
    const scritto = campo.value.trim()
    if (!scritto) return
    const risposta = await azione({
      tipo: 'progetto.giudizio.salva',
      progettoId: progetto.id,
      corsoId: progetto.corsoId,
      giudizio: {
        allievoId: destinatari.get(progetto.id) || null,
        testo: scritto,
        ...(lezione ? { lezioneId: lezione.id } : { data: stato.adessoData }),
      },
    })
    if (risposta.ok) campo.value = ''
  }

  const tutti = [...progetto.giudizi].sort((a, b) =>
    giornoDellaVoce(stato.registro, b).localeCompare(giornoDellaVoce(stato.registro, a)) ||
    b.creatoIl.localeCompare(a.creatoIl))
  const mostrati = lezione ? tutti.filter((g) => g.lezioneId === lezione.id) : tutti
  const altrove = tutti.length - mostrati.length

  const riga = (giudizio: GiudizioProgetto): HTMLElement =>
    h(
      'li',
      { class: 'osservazione' },
      h(
        'div',
        { class: 'osservazione__testata' },
        h('span', { class: 'osservazione__ora' }, formattaData(giornoDellaVoce(stato.registro, giudizio))),
        h(
          'span',
          { class: 'osservazione__chi' },
          giudizio.allievoId ? nomi.get(giudizio.allievoId) ?? t.nonInElenco : t.tuttaLaClasse,
        ),
        pulsante({
          simbolo: 'matita',
          variante: 'fantasma',
          titolo: parole().modifica,
          al: () => moduloGiudizio({ progetto, giudizio }),
        }),
      ),
      h('p', { class: 'osservazione__testo' }, giudizio.testo),
    )

  return h(
    'div',
    { class: 'giudizi-progetto', dataset: { telaio: `giudizi:${progetto.id}` } }, // testo-fisso: una chiave, non un testo
    h(
      'div',
      { class: 'giudizi-progetto__nuovo' },
      tendina({
        voci: [
          { valore: '', testo: t.tuttaLaClasse },
          ...attiviDelProgetto(progetto).map((a) => ({ valore: a.id, testo: nomeCompleto(a) })),
        ],
        valore: chi,
        etichetta: parole().chi,
        al: (scelto) => { destinatari.set(progetto.id, scelto) },
      }),
      campo,
      pulsante({ testo: parole().aggiungi, simbolo: 'piu', variante: 'sottile', al: aggiungi }),
    ),
    mostrati.length === 0
      ? quieto(lezione ? t.nessunoInLezione : t.nessuno)
      : h('ul', { class: 'osservazioni' }, ...mostrati.map(riga)),
    altrove > 0 ? quieto(t.altrove(altrove)) : null,
  )
}
