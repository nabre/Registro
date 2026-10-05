// Le opzioni di sviluppo nella finestra nativa: disegna lo stato che il main
// process manda (`statoSviluppo()` in `desktop/shell/windows/devTools.ts`) e
// rimanda ogni gesto come richiesta. Non tiene niente per sé: dopo ogni gesto
// arriva lo stato nuovo, e la pagina si ridisegna da quello (React, ADR-56).

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '#desktop/shell/pages/shared/titleBar.js'
import { useRef, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type {
  Collegamento,
  FinestraSviluppo,
  RichiestaSviluppo,
  StatoSviluppo,
} from '#desktop/shell/windows/devTools.js'
import type { PosizioneConsole, TipoFinestra } from '#desktop/apparato/dev.js'
import { ascolta, manda, perId } from '#desktop/shell/pages/shared/page.js'
import { Input, Select } from '#core/controlli/fields.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './dev.testi.js'

import './dev.css'

document.title = testi().titolo

function chiedi (richiesta: RichiestaSviluppo): void {
  manda(richiesta)
}

/** Le opzioni delle posizioni della console. */
function opzioniPosizione (posizioni: readonly PosizioneConsole[]): ReactElement[] {
  return posizioni.map((voce) => <option key={voce} value={voce}>{testi().posizioni[voce]}</option>)
}

function nomeDelTipo (tipo: TipoFinestra | null): string {
  return tipo ? testi().tipi[tipo] : testi().altraFinestra
}

/** Una casella con la sua scritta: si spunta, e la richiesta parte al `change`. */
function Casella ({ spuntata, testo, al, campo }: {
  spuntata: boolean
  testo: string
  al: (spuntata: boolean) => void
  campo?: { current: HTMLInputElement | null }
}): ReactElement {
  return (
    <label className="casella">
      <Input
        ref={campo ? (nodo) => { campo.current = nodo } : undefined}
        type="checkbox"
        spuntato={spuntata}
        onCambio={(evento) => al((evento.currentTarget as HTMLInputElement).checked)}
      />
      <span>{testo}</span>
    </label>
  )
}

// ------------------------------------------------------------ le finestre

function RigaFinestra ({ voce, posizioni }: {
  voce: FinestraSviluppo
  posizioni: readonly PosizioneConsole[]
}): ReactElement {
  const t = testi()
  const spunta = useRef<HTMLInputElement | null>(null)
  const scelta = useRef<HTMLSelectElement | null>(null)
  const vuole = (aperta: boolean): void => {
    chiedi({
      sviluppo: 'console',
      id: voce.id,
      aperta,
      posizione: (scelta.current?.value ?? voce.posizione) as PosizioneConsole,
    })
  }
  return (
    <li className="riga">
      <span className="riga__nome">
        <span>{nomeDelTipo(voce.tipo)}</span>
        <span className="riga__sotto">{voce.titolo}</span>
      </span>
      <Casella spuntata={voce.console} testo={t.console} al={vuole} campo={spunta} />
      <Select
        ref={scelta}
        aria-label={t.posizione}
        valore={voce.posizione}
        // Con la console aperta, cambiare posizione la sposta subito.
        onCambio={() => {
          if (spunta.current?.checked) vuole(true)
        }}
      >
        {opzioniPosizione(posizioni)}
      </Select>
      <button className="minuto" type="button" onClick={() => chiedi({ sviluppo: 'ricarica', id: voce.id })}>
        {t.ricaricaFinestra}
      </button>
    </li>
  )
}

// ------------------------------------------------------------ cartelle e ambiente

function RigaCollegamento ({ cosa, etichetta, percorso, sotto }: {
  cosa: Collegamento
  etichetta: string
  percorso: string | null
  sotto: string
}): ReactElement {
  return (
    <li className="riga">
      <span className="riga__nome" title={percorso ?? ''}>
        <span>{etichetta}</span>
        <span className="riga__sotto">{sotto}</span>
      </span>
      <button
        className="minuto"
        type="button"
        disabled={percorso === null}
        title={etichetta}
        onClick={() => chiedi({ sviluppo: 'apri', cosa })}
      >
        {parole().apri}
      </button>
    </li>
  )
}

// ----------------------------------------------------------------- la pagina

/** Lo stato ricevuto per ultimo, e il rifiuto da dire, se c'è. */
let stato: StatoSviluppo | null = null
let rifiuto: string | null = null

function Sviluppo (): ReactElement {
  const t = testi()
  const percorsi = stato?.percorsi
  return (
    <>
      <header>
        <h1>{t.titolo}</h1>
        <p className="quieto">{t.sottotitolo}</p>
      </header>
      <main>
        <p className="guasto" role="alert" hidden={rifiuto === null}>{rifiuto ?? ''}</p>

        <section>
          <h2>{t.finestreAperte}</h2>
          <ul className="righe">
            {stato && stato.finestre.length === 0 ? <li className="vuota">{t.nessunaFinestra}</li> : null}
            {stato?.finestre.map((voce) => (
              <RigaFinestra key={voce.id} voce={voce} posizioni={stato?.posizioni ?? []} />
            ))}
          </ul>
        </section>

        <section>
          <h2>{t.allAvvio}</h2>
          <p className="quieto">{t.allAvvioSpiega}</p>
          <div className="caselle">
            {stato
              ? (Object.keys(stato.impostazioni.allAvvio) as TipoFinestra[]).map((tipo) => (
                  <Casella
                    key={tipo}
                    spuntata={stato?.impostazioni.allAvvio[tipo] ?? false}
                    testo={nomeDelTipo(tipo)}
                    al={(valore) => chiedi({ sviluppo: 'allAvvio', tipo, valore })}
                  />
                ))
              : null}
          </div>
          <label className="riga-campo">
            <span>{t.posizionePredefinita}</span>
            <Select
              valore={stato?.impostazioni.posizione ?? ''}
              onCambio={(evento) => chiedi({
                sviluppo: 'posizione',
                posizione: (evento.currentTarget as HTMLSelectElement).value as PosizioneConsole,
              })}
            >
              {opzioniPosizione(stato?.posizioni ?? [])}
            </Select>
          </label>
        </section>

        <section>
          <h2>{t.ricaricaERiavvio}</h2>
          <Casella
            spuntata={stato?.impostazioni.ricaricaAutomatica ?? false}
            testo={t.ricaricaAutomatica}
            al={(valore) => chiedi({ sviluppo: 'ricaricaAutomatica', valore })}
          />
          <div className="pulsanti">
            <button type="button" onClick={() => chiedi({ sviluppo: 'ricaricaTutte' })}>{t.ricaricaTutte}</button>
            <button type="button" onClick={() => chiedi({ sviluppo: 'riavvia' })}>{t.riavvia}</button>
          </div>
          <p className="quieto">{t.riavviaSpiega}</p>
        </section>

        <section>
          <h2>{t.cartelle}</h2>
          <ul className="righe">
            {percorsi
              ? (
                  <>
                    <RigaCollegamento cosa="dati" etichetta={t.cartellaDati} percorso={percorsi.dati} sotto={percorsi.dati} />
                    <RigaCollegamento
                      cosa="documento"
                      etichetta={t.documento}
                      percorso={percorsi.documento}
                      sotto={percorsi.documento ?? t.nessunDocumento}
                    />
                    <RigaCollegamento
                      cosa="giornale"
                      etichetta={t.giornale}
                      percorso={percorsi.giornaleScritto ? percorsi.giornale : null}
                      sotto={percorsi.giornaleScritto ? percorsi.giornale : t.giornaleAssente}
                    />
                    <RigaCollegamento cosa="bundle" etichetta={t.bundle} percorso={percorsi.bundle} sotto={percorsi.bundle} />
                  </>
                )
              : null}
          </ul>
        </section>

        <section>
          <h2>{t.ambiente}</h2>
          <dl>
            {stato?.ambiente.flatMap(({ nome, valore }) => [
              <dt key={`n:${nome}`}>{nome}</dt>,
              <dd key={`v:${nome}`} className={valore === null ? 'quieto' : undefined}>{valore ?? t.variabileAssente}</dd>,
            ])}
          </dl>
        </section>
      </main>
    </>
  )
}

const radice = createRoot(perId('radice'))

function disegna (): void {
  flushSync(() => radice.render(<Sviluppo />))
}

disegna()

let mostrata = false

ascolta((messaggio) => {
  if (messaggio.sviluppo === 'rifiuto') {
    rifiuto = typeof messaggio.motivo === 'string' ? messaggio.motivo : ''
    disegna()
    return
  }
  if (messaggio.sviluppo !== 'stato') return
  stato = messaggio.stato as StatoSviluppo
  disegna()
  if (!mostrata) {
    mostrata = true
    chiedi({ sviluppo: 'pronto' })
  }
})
