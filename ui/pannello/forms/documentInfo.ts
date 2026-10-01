// Il dialogo «Informazioni documento»: quale file è aperto, dove sta, che cosa
// contiene e se i riferimenti tornano. Le azioni di file (aprire, un anno nuovo,
// OneDrive) stanno nel menu «File» e in Ctrl+K, non qui né nelle impostazioni
// (`docs/PIANO-IMPOSTAZIONI.md` § 3.1); qui restano i gesti su questo file.

import { avviso, pulsante } from '#ui/pannello/components/base.js'
import { sintesiIncassata } from '#ui/pannello/components/filters.js'
import { apriModale } from '#ui/pannello/components/modal.js'
import { notifica } from '#ui/pannello/components/notifications.js'
import { h } from '#ui/pannello/dom.js'
import { azione } from '#ui/pannello/bridge.js'
import { stato } from '#ui/pannello/state.js'
import { testi } from './documentInfo.testi.js'

/** Il nome del file, staccato dal percorso: è quel che si riconosce. */
function nomeDelFile (percorso: string): string {
  return percorso.split(/[\\/]/).pop() ?? percorso
}

/** Il documento aperto, con il percorso per esteso: dice quale copia è. */
function documento (): HTMLElement {
  const t = testi()
  const corrente = stato.documenti.corrente
  if (!corrente) return avviso(t.nessunDocumento, 'attenzione')
  if (stato.documenti.provvisorio) {
    return h(
      'div',
      null,
      avviso(t.provvisorio(nomeDelFile(corrente)), 'attenzione'),
      pulsante({
        testo: t.salvaConNome,
        simbolo: 'spunta',
        variante: 'primario',
        al: () => azione({ tipo: 'stato.salva' }),
      }),
    )
  }
  // La cartella la dice l'host: confrontare percorsi è una regola del sistema.
  const cartella = stato.documenti.elenco.find((voce) => voce.aperto)?.cartella
  return h(
    'div',
    { class: 'documento-aperto' },
    h('strong', null, nomeDelFile(corrente)),
    h('code', { class: 'documento-aperto__percorso' }, corrente),
    cartella ? h('small', { class: 'testo-quieto' }, t.cartella(cartella)) : null,
    h('small', { class: 'testo-quieto' }, t.formato(stato.registro.versione)),
  )
}

/** Quel che c'è dentro, e i riferimenti che non tornano. */
function contenuto (): HTMLElement {
  const t = testi()
  const registro = stato.registro
  return h(
    'div',
    { class: 'modulo' },
    documento(),
    sintesiIncassata(
      { etichetta: t.sintesi.anni, valore: String(registro.anni.length) },
      { etichetta: t.sintesi.classi, valore: String(registro.classi.length) },
      { etichetta: t.sintesi.lezioni, valore: String(registro.lezioni.length) },
      { etichetta: t.sintesi.piani, valore: String(registro.piani.length) },
      { etichetta: t.sintesi.valutazioni, valore: String(registro.valutazioni.length) },
    ),
    stato.avvisi.length > 0
      ? avviso(
          h(
            'div',
            null,
            h('strong', null, t.riferimenti),
            h('ul', null, ...stato.avvisi.slice(0, 8).map((testo) => h('li', null, testo))),
            stato.avvisi.length > 8 ? h('p', null, t.eAltri(stato.avvisi.length - 8)) : null,
          ),
          'attenzione',
        )
      : avviso(t.tuttiTornano, 'informativo'),
  )
}

/**
 * Apre il dialogo. È una fotografia: la modale vive fuori dal ridisegno, quindi
 * dopo «Ricarica» il contenuto si rifà a mano.
 */
export function apriInformazioniDocumento (): void {
  const t = testi()
  const corpo = h('div', null, contenuto())
  const ridisegna = () => corpo.replaceChildren(contenuto())

  apriModale({
    titolo: t.titolo,
    aiuto: h('span', null, t.aiuto, t.dentro),
    corpo: () => corpo,
    azioniSecondarie: () => stato.documenti.corrente
      ? [
          pulsante({
            testo: t.mostraNellaCartella,
            simbolo: 'cartella',
            variante: 'sottile',
            al: () => azione({ tipo: 'sistema.apriCartella' }),
          }),
          pulsante({
            testo: t.ricarica,
            simbolo: 'ricarica',
            variante: 'sottile',
            titolo: t.ricaricaAiuto,
            al: async () => {
              const risposta = await azione({ tipo: 'stato.ricarica' })
              if (!risposta.ok) return
              ridisegna()
              notifica(t.ricaricati, 'info')
            },
          }),
        ]
      : null,
  })
}
