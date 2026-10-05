// La finestra che sfoglia OneDrive: le cartelle di un account e i documenti
// `.regi` che contengono, o tutti quelli che Microsoft trova cercando. Aprire
// un documento lo passa all'host, che sceglie fra la copia sincronizzata e una
// scaricata (`data/onedrive.ts`).

import { useEffect, useRef, useState, type ReactElement } from 'react'

import { Avviso, Campo, Pulsante, quantoMisura } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { apriModale, type ContestoModale } from '#ui/components/modal.js'
import { azione, chiedi } from '#ui/bridge.js'
import { stato, vai as vaiNelPannello } from '#ui/state.js'
import { formattaData } from '#core/dominio/dates.js'
import type { VoceOneDrive } from '#core/dominio/onedrive.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './oneDrive.testi.js'

/** Quel che torna da `onedrive.elenco`. */
interface Cartella {
  /** Letta dalle cartelle sincronizzate sul computer, non da Graph. */
  locale: boolean
  account: string
  drive: string
  cartella: string | null
  nome: string
  percorso: string[]
  superiore: string | null
  voci: VoceOneDrive[]
  altri: number
  troncato: boolean
}

/** Dove si sta guardando: una cartella di un drive, o i risultati di una ricerca. */
type Veduta =
  | { genere: 'cartella', drive?: string, cartella?: string }
  | { genere: 'ricerca' }

/** Quel che la finestra mostra sotto la scelta dell'account. */
type Vista =
  | { tipo: 'attesa' }
  | { tipo: 'guasto' }
  | { tipo: 'voci', cartella: Cartella | null, voci: VoceOneDrive[], piede: string }

/** Gli account di cui si può leggere OneDrive adesso: sincronizzati qui, o collegati. */
function accountCollegati (): string[] {
  return stato.microsoft.account
    .filter((account) => account.sulComputer || account.onedrive)
    .map((account) => account.indirizzo)
}

/** La data di un'ultima modifica, senza l'ora: basta a riconoscere il documento giusto. */
function quando (modificato: string): string {
  return modificato ? formattaData(modificato.slice(0, 10)) : ''
}

/** Chi non ha ancora un account collegato: lo si manda a collegarne uno. */
function SenzaAccount ({ contesto }: { contesto: ContestoModale }): ReactElement {
  const t = testi()
  return (
    <div className="modulo">
      <Avviso tono="informativo">{t.nessunAccount}</Avviso>
      <div className="onedrive__gesti">
        <Pulsante
          testo={t.collega}
          simbolo="collegamento"
          variante="primario"
          al={async () => {
            const risposta = await azione({ tipo: 'microsoft.aggiungi' })
            if (!risposta.ok || accountCollegati().length === 0) return
            contesto.chiudi()
            apriOneDrive()
          }}
        />
        <Pulsante
          testo={t.impostazioni}
          simbolo="impostazioni"
          variante="sottile"
          al={() => {
            contesto.chiudi()
            vaiNelPannello({ pagina: 'pagina.impostazioni', scheda: 'utente#account' })
          }}
        />
      </div>
    </div>
  )
}

/** Le cartelle e i documenti di un account, con i gesti per spostarsi. */
function Sfoglia ({ contesto, collegati, iniziale }: {
  contesto: ContestoModale
  collegati: string[]
  iniziale: string
}): ReactElement {
  const t = testi()
  const scelto = useRef(iniziale)
  const [veduta, impostaVeduta] = useState<Veduta>({ genere: 'cartella' })
  const [vista, impostaVista] = useState<Vista>({ tipo: 'attesa' })
  /** La testata dell'ultima lettura riuscita: fra una lettura e l'altra resta. */
  const [testa, impostaTesta] = useState<{ cartella: Cartella | null } | null>(null)
  /** Ogni lettura prende un numero: una risposta arrivata dopo un'altra richiesta è vecchia. */
  const giro = useRef(0)

  function guasto (errori: string[]): void {
    impostaVista({ tipo: 'guasto' })
    contesto.mostraErrori(errori.length > 0 ? errori : [t.nonSiLegge])
  }

  async function leggi (dove: Veduta): Promise<void> {
    const mio = ++giro.current
    contesto.mostraErrori([])
    impostaVista({ tipo: 'attesa' })
    contesto.occupato(true)

    if (dove.genere === 'ricerca') {
      const esito = await chiedi<{
        voci: VoceOneDrive[]
        troncato: boolean
        /** Perché si è fermata; un host più vecchio non lo manda. */
        motivo?: 'troppi' | 'tempo' | null
        locale: boolean
      }>('onedrive.cerca', { account: scelto.current })
      if (mio !== giro.current) return
      contesto.occupato(false)
      if (!esito.ok || !esito.dati) return guasto(esito.errori)
      impostaTesta({ cartella: null })
      impostaVista({
        tipo: 'voci',
        cartella: null,
        voci: esito.dati.voci,
        piede: [
          t.trovati(esito.dati.voci.length),
          esito.dati.troncato ? (esito.dati.motivo === 'tempo' ? t.tempoScaduto : t.troppi) : '',
          // Solo Graph si appoggia all'indice di Microsoft; il disco si legge com'è.
          esito.dati.locale ? t.dalComputer : t.indiceMicrosoft,
        ].filter(Boolean).join(' '),
      })
      return
    }

    const esito = await chiedi<Cartella>('onedrive.elenco', {
      account: scelto.current,
      ...(dove.drive ? { drive: dove.drive } : {}),
      ...(dove.cartella ? { cartella: dove.cartella } : {}),
    })
    if (mio !== giro.current) return
    contesto.occupato(false)
    if (!esito.ok || !esito.dati) return guasto(esito.errori)
    impostaTesta({ cartella: esito.dati })
    impostaVista({
      tipo: 'voci',
      cartella: esito.dati,
      voci: esito.dati.voci,
      piede: [
        esito.dati.altri > 0 ? t.altriFile(esito.dati.altri) : '',
        esito.dati.troncato ? t.troppi : '',
      ].filter(Boolean).join(' '),
    })
  }

  function vai (nuova: Veduta): void {
    impostaVeduta(nuova)
    void leggi(nuova)
  }

  // La prima lettura all'apertura.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void leggi({ genere: 'cartella' }) }, [])

  /** Dove si è, e i gesti per spostarsi: la radice, la cartella di sopra, la ricerca. */
  function testata (cartella: Cartella | null): ReactElement {
    const dove = cartella
      ? ['OneDrive', ...cartella.percorso, cartella.nome].filter(Boolean).join(' › ')
      : t.risultati
    return (
      <>
        <span className="onedrive__dove">{dove}</span>
        <div className="onedrive__gesti">
          <Pulsante
            testo={t.radice}
            simbolo="casa"
            variante="sottile"
            // Già alla radice del proprio OneDrive.
            disabilitato={veduta.genere === 'cartella' && !veduta.drive && !veduta.cartella}
            al={() => vai({ genere: 'cartella' })}
          />
          {cartella
            ? (
                <Pulsante
                  testo={t.su}
                  simbolo="su"
                  variante="sottile"
                  disabilitato={cartella.superiore === null}
                  al={() => vai({
                    genere: 'cartella',
                    drive: cartella.drive,
                    ...(cartella.superiore ? { cartella: cartella.superiore } : {}),
                  })}
                />
              )
            : null}
          <Pulsante
            testo={t.cercaTutti}
            simbolo="lente"
            variante={veduta.genere === 'ricerca' ? 'primario' : 'sottile'}
            titolo={t.cercaTuttiAiuto}
            al={() => vai({ genere: 'ricerca' })}
          />
        </div>
      </>
    )
  }

  function rigaVoce (voce: VoceOneDrive, conPercorso: boolean): ReactElement {
    if (voce.genere === 'cartella') {
      return (
        <li key={voce.id} className="onedrive__voce">
          <button
            type="button"
            className="onedrive__nome"
            onClick={() => vai({ genere: 'cartella', drive: voce.drive, cartella: voce.id })}
          >
            <Icona nome="cartella" />
            <span>{voce.nome}</span>
          </button>
          <small className="testo-quieto">{voce.figli === null ? '' : t.elementi(voce.figli)}</small>
        </li>
      )
    }
    const dettagli = [
      conPercorso && voce.percorso.length > 0 ? voce.percorso.join(' › ') : '',
      quando(voce.modificato),
      quantoMisura(voce.dimensione),
    ].filter(Boolean).join(' · ')
    return (
      <li key={voce.id} className="onedrive__voce onedrive__voce--regi">
        <span className="onedrive__nome">
          <Icona nome="documento" />
          <span><strong>{voce.nome}</strong><small>{dettagli}</small></span>
        </span>
        <Pulsante
          testo={parole().apri}
          simbolo="destra"
          variante="primario"
          titolo={t.apriAiuto}
          al={async () => {
            const risposta = await azione({
              tipo: 'onedrive.apri', account: scelto.current, drive: voce.drive, id: voce.id,
            })
            if (risposta.ok) contesto.chiudi()
          }}
        />
      </li>
    )
  }

  function elenco (): ReactElement | null {
    if (vista.tipo === 'attesa') {
      return <p className="testo-quieto">{veduta.genere === 'ricerca' ? t.cerco : t.leggo}</p>
    }
    if (vista.tipo === 'guasto') return null
    const conPercorso = vista.cartella === null
    if (vista.voci.length === 0) {
      return <Avviso tono="informativo">{conPercorso ? t.nessunoTrovato : t.cartellaVuota}</Avviso>
    }
    return <ul className="onedrive__voci">{vista.voci.map((voce) => rigaVoce(voce, conPercorso))}</ul>
  }

  return (
    <div className="modulo onedrive">
      {collegati.length > 1
        ? (
            <Campo
              nome="account"
              etichetta={t.account}
              tipo="select"
              valore={iniziale}
              opzioni={collegati.map((indirizzo) => ({ valore: indirizzo, testo: indirizzo }))}
              al={(valore) => {
                scelto.current = valore
                vai({ genere: 'cartella' })
              }}
            />
          )
        : <p className="campo__aiuto">{t.comeAccount(scelto.current)}</p>}
      <div className="onedrive__testata">{testa ? testata(testa.cartella) : null}</div>
      <div className="onedrive__elenco">{elenco()}</div>
      <p className="campo__aiuto onedrive__piede">{vista.tipo === 'voci' ? vista.piede : ''}</p>
    </div>
  )
}

/**
 * Apre la finestra. Senza account collegati propone di collegarne uno; con
 * `account` parte da quello, altrimenti dal primo.
 */
export function apriOneDrive (account?: string): void {
  const t = testi()
  const collegati = accountCollegati()
  const scelto = account && collegati.includes(account) ? account : collegati[0] ?? ''

  apriModale({
    titolo: t.titolo,
    larghezza: 'larga',
    aiuto: t.aiuto,
    corpo: (contesto) =>
      collegati.length === 0
        ? <SenzaAccount contesto={contesto} />
        : <Sfoglia contesto={contesto} collegati={collegati} iniziale={scelto} />,
  })
}
