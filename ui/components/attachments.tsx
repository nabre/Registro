// I posti per i PDF di un momento di valutazione in React (file, nome,
// apertura, sostituzione, cestino), usati da più viste. Una prova di recupero è
// un momento a sé, con i suoi posti come gli altri.

import type { ReactElement } from 'react'

import type { Allegato, MomentoValutazione, RuoloAllegato } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { azione } from '#ui/bridge.js'
import { classi } from '#ui/classNames.js'
import { testi } from '#ui/components/attachments.testi.js'
import { notifica } from '#ui/components/notifications.js'
import { conAttesa, Pulsante } from './base.js'
import { Icona } from './icons.js'
import { conferma } from './modal.js'

/** Il PDF di un ruolo, per un allievo. */
function allegatoDi (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  allievoId: string | null,
): Allegato | null {
  return momento.allegati.find((a) => a.ruolo === ruolo && a.allievoId === allievoId) ?? null
}

async function allega (
  momento: MomentoValutazione,
  ruolo: RuoloAllegato,
  allievoId: string | null,
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

/**
 * Un posto per un PDF: vuoto offre di allegarlo, pieno mostra il nome (che si
 * apre col clic) e il modo di toglierlo.
 */
export function PostoAllegato ({ momento, ruolo, etichetta, allievoId = null, dopo }: {
  momento: MomentoValutazione
  ruolo: RuoloAllegato
  etichetta: string
  allievoId?: string | null
  /**
   * Che cosa fare quando il PDF cambia: serve alle finestre, che non si
   * ridisegnano da sole come le viste.
   */
  dopo?: () => void
}): ReactElement {
  const allegato = allegatoDi(momento, ruolo, allievoId)
  const t = testi()

  return (
    <div className={classi('allegato', !allegato && 'allegato--vuoto')}>
      <span className="allegato__ruolo">{etichetta}</span>
      {allegato
        ? (
            <button
              className="allegato__file"
              type="button"
              title={t.apri(allegato.nome)}
              onClick={(evento) =>
                void conAttesa(
                  evento.currentTarget,
                  azione({ tipo: 'allegato.apri', valutazioneId: momento.id, allegatoId: allegato.id }),
                )}
            >
              <Icona nome="allegato" classe="icona--minuta" />
              <span>{allegato.nome}</span>
            </button>
          )
        : <span className="allegato__mancante">{t.nessunPdf}</span>}
      <span className="allegato__azioni">
        <Pulsante
          testo={allegato ? t.sostituisci : t.allega}
          simbolo={allegato ? undefined : 'piu'}
          variante="fantasma"
          al={async () => {
            if (await allega(momento, ruolo, allievoId)) dopo?.()
          }}
        />
        {allegato
          ? (
              <Pulsante
                simbolo="cestino"
                variante="fantasma"
                titolo={t.togliPdf}
                al={async () => {
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
                }}
              />
            )
          : null}
      </span>
    </div>
  )
}
