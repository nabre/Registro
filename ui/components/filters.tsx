// Pezzi ripetuti in più viste: «manda e avvisa se va storto», lo stato vuoto
// di un registro senza anno, la fila di numeri in cima a una scheda.

import type { ReactElement } from 'react'

import type { Azione, Risposta } from '#contract/protocol.js'
import { azione } from '#ui/bridge.js'
import { testi } from '#ui/components/filters.testi.js'
import { DatoSintetico, Pulsante, StatoVuoto, type TonoPastiglia } from './base.js'
import type { NomeIcona } from './icons.js'
import { notifica } from './notifications.js'

/**
 * Manda un'azione e avvisa: il rifiuto lo notifica `azione`, qui si aggiunge
 * il messaggio di successo se l'host non ne dà uno suo.
 */
export async function eseguiOAvvisa (comando: Azione, messaggioOk?: string): Promise<Risposta> {
  const risposta = await azione(comando)
  if (risposta.ok && messaggioOk && !risposta.messaggio) notifica(messaggioOk, 'successo')
  return risposta
}

/**
 * Come si parte, detto una volta per tutte le viste vuote. Una costante: la
 * pagina si ricarica quando cambia lingua (`core/i18n/page.ts`).
 */
export const COME_SI_PARTE = testi().comeSiParte

/**
 * Lo stato vuoto di un registro senza anno scolastico: il testo lo sceglie la
 * vista, sotto c'è sempre come si parte.
 */
export function StatoVuotoAnno (opzioni: {
  simbolo?: NomeIcona
  testo?: string
  crea: () => void
  /** La chiave di telaio, quando è la radice di una vista (`telaioVista()`). */
  telaio?: string
}): ReactElement {
  return (
    <StatoVuoto
      telaio={opzioni.telaio}
      simbolo={opzioni.simbolo ?? 'calendario'}
      titolo={testi().nessunAnno}
      testo={[opzioni.testo, COME_SI_PARTE].filter(Boolean).join(' ')}
      azione={(
        <Pulsante
          testo={testi().creaAnno}
          variante="primario"
          simbolo="piu"
          al={() => opzioni.crea()}
        />
      )}
    />
  )
}

/**
 * La fila di numeri in cima a una scheda, nel suo riquadro grigio. Le voci
 * `null` si saltano.
 */
export function SintesiIncassata ({ campi }: {
  campi: ReadonlyArray<{ etichetta: string; valore: string; tono?: TonoPastiglia } | null | false>
}): ReactElement {
  return (
    <div className="sintesi sintesi--incassata">
      {campi.map((voce, indice) => (voce
        // Una lista fissa, scritta dalla vista: l'indice è una chiave stabile.
        ? <DatoSintetico key={indice} {...voce} />
        : null))}
    </div>
  )
}
