// Il dialogo «Informazioni documento»: quale file è aperto, dove sta, che cosa
// contiene e se i riferimenti tornano. Le azioni di file (aprire, un anno nuovo,
// OneDrive) stanno nel menu «File» e in Ctrl+K, non qui né nelle impostazioni
// (`docs/PIANO-IMPOSTAZIONI.md` § 3.1); qui restano i gesti su questo file.

import { useLayoutEffect, useReducer, type ReactElement } from 'react'

import { Avviso, Pulsante } from '#ui/components/base.js'
import { SintesiIncassata } from '#ui/components/filters.js'
import { apriModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione } from '#ui/bridge.js'
import { stato } from '#ui/state.js'
import { testi } from './documentInfo.testi.js'

/** Il nome del file, staccato dal percorso: è quel che si riconosce. */
function nomeDelFile (percorso: string): string {
  return percorso.split(/[\\/]/).pop() ?? percorso
}

/** Il documento aperto, con il percorso per esteso: dice quale copia è. */
function documento (): ReactElement {
  const t = testi()
  const corrente = stato.documenti.corrente
  if (!corrente) return <Avviso tono="attenzione">{t.nessunDocumento}</Avviso>
  if (stato.documenti.provvisorio) {
    return (
      <div>
        <Avviso tono="attenzione">{t.provvisorio(nomeDelFile(corrente))}</Avviso>
        <Pulsante
          testo={t.salvaConNome}
          simbolo="spunta"
          variante="primario"
          al={() => azione({ tipo: 'stato.salva' })}
        />
      </div>
    )
  }
  // La cartella la dice l'host: confrontare percorsi è una regola del sistema.
  const cartella = stato.documenti.elenco.find((voce) => voce.aperto)?.cartella
  return (
    <div className="documento-aperto">
      <strong>{nomeDelFile(corrente)}</strong>
      <code className="documento-aperto__percorso">{corrente}</code>
      {cartella ? <small className="testo-quieto">{t.cartella(cartella)}</small> : null}
      <small className="testo-quieto">{t.formato(stato.registro.versione)}</small>
    </div>
  )
}

/**
 * Quel che c'è dentro, e i riferimenti che non tornano. È una fotografia: la
 * modale vive fuori dal ridisegno, quindi dopo «Ricarica» la si rifà a mano
 * (`giro.rifai`).
 */
function Contenuto ({ giro }: { giro: { rifai: (() => void) | null } }): ReactElement {
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  useLayoutEffect(() => {
    giro.rifai = rifai
    return () => { giro.rifai = null }
  }, [giro])
  const t = testi()
  const registro = stato.registro
  return (
    <div className="modulo">
      {documento()}
      <SintesiIncassata
        campi={[
          { etichetta: t.sintesi.anni, valore: String(registro.anni.length) },
          { etichetta: t.sintesi.classi, valore: String(registro.classi.length) },
          { etichetta: t.sintesi.lezioni, valore: String(registro.lezioni.length) },
          { etichetta: t.sintesi.piani, valore: String(registro.piani.length) },
          { etichetta: t.sintesi.valutazioni, valore: String(registro.valutazioni.length) },
        ]}
      />
      {stato.avvisi.length > 0
        ? (
            <Avviso tono="attenzione">
              <div>
                <strong>{t.riferimenti}</strong>
                {/* Una lista fissa di testi: l'indice è una chiave stabile. */}
                <ul>{stato.avvisi.slice(0, 8).map((testo, i) => <li key={i}>{testo}</li>)}</ul>
                {stato.avvisi.length > 8 ? <p>{t.eAltri(stato.avvisi.length - 8)}</p> : null}
              </div>
            </Avviso>
          )
        : <Avviso tono="informativo">{t.tuttiTornano}</Avviso>}
    </div>
  )
}

/** Apre il dialogo. */
export function apriInformazioniDocumento (): void {
  const t = testi()
  const giro: { rifai: (() => void) | null } = { rifai: null }

  apriModale({
    titolo: t.titolo,
    aiuto: <span>{t.aiuto}{t.dentro}</span>,
    corpo: () => <Contenuto giro={giro} />,
    azioniSecondarie: () => stato.documenti.corrente
      ? (
          <>
            <Pulsante
              testo={t.mostraNellaCartella}
              simbolo="cartella"
              variante="sottile"
              al={() => azione({ tipo: 'sistema.apriCartella' })}
            />
            <Pulsante
              testo={t.ricarica}
              simbolo="ricarica"
              variante="sottile"
              titolo={t.ricaricaAiuto}
              al={async () => {
                const risposta = await azione({ tipo: 'stato.ricarica' })
                if (!risposta.ok) return
                giro.rifai?.()
                notifica(t.ricaricati, 'info')
              }}
            />
          </>
        )
      : null,
  })
}
