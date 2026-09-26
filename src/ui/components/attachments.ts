// I posti per i PDF di un momento di valutazione (file, nome, apertura,
// sostituzione, cestino), usati da più viste. Una prova di recupero è un
// momento a sé, con i suoi posti come gli altri.

import type { Allegato, MomentoValutazione, RuoloAllegato } from '../../domain/models.js'
import { conAttesa, pulsante } from './base.js'
import { icona } from './icons.js'
import { conferma } from './modal.js'
import { notifica } from './notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'
import { parole } from '../../domain/words.testi.js'
import { testi } from './attachments.testi.js'

/** Il PDF di un ruolo, per un allievo. */
function allegatoDi (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  allievoId: string | null = null,
): Allegato | null {
  return momento.allegati.find((a) => a.ruolo === ruolo && a.allievoId === allievoId) ?? null
}

export async function allega (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  allievoId: string | null = null,
): Promise<boolean> {
  const risposta = await azione({
    tipo: 'allegato.aggiungi',
    valutazioneId: momento.id,
    ruolo,
    allievoId,
  })
  // Nessun id creato: dialogo chiuso senza scegliere, non un errore.
  if (risposta.ok && risposta.creato) {
    notifica(testi().allegato, 'successo')
    return true
  }
  return false
}

interface OpzioniPostoAllegato {
  allievoId?: string | null
  /**
   * Che cosa fare quando il PDF cambia: serve alle finestre, che non si
   * ridisegnano da sole come le viste.
   */
  dopo?: () => void
}

/**
 * Un posto per un PDF: vuoto offre di allegarlo, pieno mostra il nome (che si
 * apre col clic) e il modo di toglierlo.
 */
export function postoAllegato (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  etichetta: string,
  opzioni: OpzioniPostoAllegato = {},
): HTMLElement {
  const { allievoId = null, dopo } = opzioni
  const allegato = allegatoDi(momento, ruolo, allievoId)
  const t = testi()

  return h(
    'div',
    { class: ['allegato', !allegato && 'allegato--vuoto'] },
    h('span', { class: 'allegato__ruolo' }, etichetta),
    allegato
      ? h(
          'button',
          {
            class: 'allegato__file',
            type: 'button',
            attr: { title: t.apri(allegato.nome) },
            onclick: (evento: MouseEvent) =>
              void conAttesa(
                evento.currentTarget as HTMLButtonElement,
                azione({ tipo: 'allegato.apri', valutazioneId: momento.id, allegatoId: allegato.id }),
              ),
          },
          icona('allegato', 'icona--minuta'),
          h('span', null, allegato.nome),
        )
      : h('span', { class: 'allegato__mancante' }, t.nessunPdf),
    h(
      'span',
      { class: 'allegato__azioni' },
      pulsante({
        testo: allegato ? t.sostituisci : t.allega,
        simbolo: allegato ? undefined : 'piu',
        variante: 'fantasma',
        al: async () => {
          if (await allega(momento, ruolo, allievoId)) dopo?.()
        },
      }),
      allegato
        ? pulsante({
            simbolo: 'cestino',
            variante: 'fantasma',
            titolo: t.togliPdf,
            al: async () => {
              const sicuro = await conferma({
                titolo: t.togliereTitolo,
                testo: t.togliereTesto(allegato.nome),
                testoConferma: parole().togli,
                pericolo: true,
              })
              if (!sicuro) return
              const risposta = await azione({
                tipo: 'allegato.elimina',
                valutazioneId: momento.id,
                allegatoId: allegato.id,
              })
              if (risposta.ok) {
                notifica(t.tolto, 'info')
                dopo?.()
              }
            },
          })
        : null,
    ),
  )
}
