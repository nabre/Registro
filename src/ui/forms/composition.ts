// Il nome di una composizione, chiesto prima di comporla: i documenti e il
// loro ordine li ha già decisi la pagina, il nome è quello del PDF in
// `esportazioni/` con cui lo si ritroverà.

import { campo } from '../components/base.js'
import { suggerimento } from '../components/hint.js'
import { apriModale } from '../components/modal.js'
import { notifica } from '../components/notifications.js'
import { h } from '../dom.js'
import { aggiorna, stato } from '../state.js'

import { inviaDalModulo, testo } from './common.js'
import { testi } from './composition.testi.js'

/**
 * Chiede il nome, compone e apre il PDF nella cornice. Le spunte se ne vanno
 * solo se la composizione riesce: a un rifiuto (nome usato, documento sparito)
 * restano, per riprovare.
 */
export function moduloComposizione (scelti: Array<{ percorso: string, nome: string }>): void {
  const t = testi()
  if (scelti.length < 2) {
    notifica(t.almenoDue, 'avviso')
    return
  }
  const percorsi = scelti.map((s) => s.percorso)

  apriModale({
    titolo: t.titolo,
    larghezza: 'stretta',
    testoSalva: t.combina,
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        // Il conteggio è un dato e resta scritto; come si rifà sta dietro la «i».
        h(
          'p',
          { class: 'testo-quieto' },
          t.documentiInOrdine(percorsi.length),
          suggerimento(t.aiuto, { etichetta: t.composizione }),
        ),
        // L'elenco numerato: l'ordine delle pagine si vede prima di fare il PDF.
        h(
          'ol',
          { class: 'composizione__ordine' },
          scelti.map((foglio) => h('li', { attr: { title: foglio.percorso } }, foglio.nome)),
        ),
        campo({
          nome: 'nome',
          etichetta: t.nome,
          valore: '',
          segnaposto: t.segnapostoNome,
          richiesto: true,
          aiuto: t.aiutoNome,
        }),
      ),
    alSalva: async (valori, contesto) => {
      const nome = testo(valori.nome).trim()
      if (!nome) {
        contesto.mostraErrori([t.serveUnNome])
        return
      }
      const risposta = await inviaDalModulo(
        contesto,
        { tipo: 'composizione.crea', nome, percorsi },
        t.nonComposto,
      )
      if (!risposta) return
      contesto.chiudi()
      aggiorna({
        documentiScelti: [],
        anteprima: risposta.documento ?? stato.anteprima,
      })
    },
  })
}
