// I posti per i PDF di un momento di valutazione.
//
// Stavano dentro la vista Valutazioni: qui perché non è la sola a mostrarli, e
// perché sono un pezzo compiuto — il file, il nome, l'apertura, la sostituzione,
// il cestino — che copiato una seconda volta divergerebbe al primo ritocco.
//
// Non sanno niente dei recuperi, e non devono: una prova di recupero è un
// momento di valutazione a sé, e i suoi documenti sono i suoi, negli stessi
// posti di tutti gli altri.

import type { Allegato, MomentoValutazione, RuoloAllegato } from '../../domain/models.js'
import { conAttesa, pulsante } from './base.js'
import { icona } from './icons.js'
import { conferma } from './modal.js'
import { notifica } from './notifications.js'
import { h } from '../dom.js'
import { azione } from '../bridge.js'

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
  // Nessun id creato vuol dire dialogo chiuso senza scegliere: non è un errore.
  if (risposta.ok && risposta.creato) {
    notifica('PDF allegato.', 'successo')
    return true
  }
  return false
}

interface OpzioniPostoAllegato {
  allievoId?: string | null
  /**
   * Che cosa fare quando il PDF cambia.
   *
   * Le viste non ne hanno bisogno: si ridisegnano da sole quando lo stato
   * arriva. Una finestra no — il suo corpo si costruisce una volta sola — e
   * senza questo continuerebbe a dire «nessun PDF» sopra un file appena
   * scelto.
   */
  dopo?: () => void
}

/**
 * Un posto per un PDF: vuoto mostra il pulsante per allegarlo, pieno il nome
 * del file — che si apre con un clic — e il modo di toglierlo.
 */
export function postoAllegato (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  etichetta: string,
  opzioni: OpzioniPostoAllegato = {},
): HTMLElement {
  const { allievoId = null, dopo } = opzioni
  const allegato = allegatoDi(momento, ruolo, allievoId)

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
            attr: { title: `Apri ${allegato.nome}` },
            onclick: (evento: MouseEvent) =>
              void conAttesa(
                evento.currentTarget as HTMLButtonElement,
                azione({ tipo: 'allegato.apri', valutazioneId: momento.id, allegatoId: allegato.id }),
              ),
          },
          icona('allegato', 'icona--minuta'),
          h('span', null, allegato.nome),
        )
      : h('span', { class: 'allegato__mancante' }, 'nessun PDF'),
    h(
      'span',
      { class: 'allegato__azioni' },
      pulsante({
        testo: allegato ? 'Sostituisci' : 'Allega PDF',
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
            titolo: 'Togli il PDF',
            al: async () => {
              const sicuro = await conferma({
                titolo: 'Togliere il PDF?',
                testo: `${allegato.nome} viene spostato nel cestino del sistema.`,
                testoConferma: 'Togli',
                pericolo: true,
              })
              if (!sicuro) return
              const risposta = await azione({
                tipo: 'allegato.elimina',
                valutazioneId: momento.id,
                allegatoId: allegato.id,
              })
              if (risposta.ok) {
                notifica('PDF tolto.', 'info')
                dopo?.()
              }
            },
          })
        : null,
    ),
  )
}
