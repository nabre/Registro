// Le impostazioni del programma nella finestra nativa: la scialuppa per quando
// nessun documento è aperto e il pannello non c'è. Riceve le voci
// (`vociImpostazioni()`: manifesto più stato attuale) e le mostra con i nomi di
// aree e sezioni del pannello (`core/controlli/areas.ts`): Utente › Posta e
// Programma; Calendario e Didattica stanno nel file dell'anno e lo dicono.
//
// I controlli sono gli stessi del pannello (`core/controlli/control.tsx`,
// ADR-52), in React (ADR-56). Scrive per messaggio: la dogana sta in
// `desktop/shell/windows/menu.ts`, e un rifiuto torna qui con il motivo, che il
// controllo dice sotto il campo. La testata e il rimando restano nel markup di
// `settings.html`; React disegna le aree dentro `#radice`.

// Per prima: la lingua della pagina, prima che qualunque altro modulo si carichi.
import '#core/i18n/page.js'
// La barra del titolo, se la finestra ne ha una propria.
import '#desktop/shell/pages/shared/titleBar.js'
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  AREE,
  AREE_DELL_ANNO,
  senzaAnno,
  sezioniDellArea,
  titoloArea,
  type Sezione,
} from '#core/controlli/areas.js'
import {
  Controllo,
  type Annuncio,
  type Esito,
  type Valore,
} from '#core/controlli/control.js'
import { idDi } from '#core/controlli/dom.js'
import type { VoceProgramma } from '#contract/protocol.js'
import type { RichiestaImpostazioni } from '#desktop/shell/windows/menu.js'
import { ascolta, manda, perId, riempi } from '#desktop/shell/pages/shared/page.js'
import { testi } from './settings.testi.js'

import './settings.css'

/** Quel che il main process manda a questa pagina. */
type Messaggio =
  | { impostazioni: 'schema', titolo: string, voci: VoceProgramma[], filtro?: string }
  | { impostazioni: 'valori', voci: VoceProgramma[] }
  | { impostazioni: 'rifiuto', chiave: string, motivo: string }
  | { impostazioni: 'filtro', testo?: string }

riempi(testi())

const cerca = perId<HTMLInputElement>('cerca')
const radice = createRoot(perId('radice'))

/** Le voci ricevute, e gli esiti arrivati senza una scrittura in volo, per chiave. */
let voci: VoceProgramma[] = []
let annunci = new Map<string, Annuncio>()
/** Lo schema ricevuto: prima la pagina è vuota. */
let ricevuto = false

function chiedi (richiesta: RichiestaImpostazioni): void {
  manda(richiesta)
}

perId('apri-pannello').addEventListener('click', () => chiedi({ impostazioni: 'apriPannello' }))

// ------------------------------------------------------------ lo scrivere

/**
 * Quanto si aspetta la risposta a una scrittura. Scrivere il valore che c'è già
 * non fa arrivare niente: allora non si dice niente.
 */
const ATTESA_MASSIMA = 4000

/** Le scritture in volo, per chiave: le chiude il `rifiuto` o i `valori` che seguono. */
const inAttesa = new Map<string, (esito: Esito) => void>()

/** Manda un valore e aspetta com'è andata: `null` scritto, un testo il motivo del rifiuto. */
function scrivi (chiave: string, valore: Valore): Promise<Esito> {
  inAttesa.get(chiave)?.(undefined)
  return new Promise<Esito>((risolvi) => {
    const chiudi = (esito: Esito): void => {
      window.clearTimeout(timer)
      if (inAttesa.get(chiave) === chiudi) inAttesa.delete(chiave)
      risolvi(esito)
    }
    const timer = window.setTimeout(() => chiudi(undefined), ATTESA_MASSIMA)
    inAttesa.set(chiave, chiudi)
    chiedi({ impostazioni: 'scrivi', chiave, valore })
  })
}

// ------------------------------------------------------------------ i nomi

/** Il nome di una voce (`etichetta`); per una chiave sconosciuta, l'ultimo pezzo a parole. */
function nomeDi (chiave: string): string {
  const voce = voci.find((candidata) => candidata.chiave === chiave)
  if (voce) return voce.etichetta
  const ultimo = chiave.split('.').pop() ?? ''
  const staccate = ultimo.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
  return staccate.charAt(0).toUpperCase() + staccate.slice(1)
}

// ------------------------------------------------------------ il filtro

/** Le parole cercate, minuscole. */
function cercate (): string[] {
  const cercato = cerca.value.trim().toLowerCase()
  return cercato ? cercato.split(/\s+/) : []
}

/**
 * Il filtro su nome, chiave e descrizione. Lo usa anche
 * `registroDocenti.impostazioniFinestra` (per esempio con `registroDocenti.ocr`).
 */
function passa (voce: VoceProgramma, parole: string[]): boolean {
  const dove = `${voce.chiave} ${voce.etichetta} ${voce.descrizione}`.toLowerCase()
  return parole.every((parola) => dove.includes(parola))
}

/** Un contenitore si nasconde quando tutte le voci che ha dentro sono nascoste. */
function vuoto (dentro: readonly VoceProgramma[], parole: string[]): boolean {
  return dentro.length > 0 && dentro.every((voce) => !passa(voce, parole))
}

// ------------------------------------------------------------ la spiegazione

/**
 * Il tracciato della «i», copiato da `ui/components/icons.tsx`: da `ui`
 * questa pagina importa solo tipi (`npm run layers`).
 */
function SegnoInformazione (): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="voce__icona">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.1" />
    </svg>
  )
}

// ---------------------------------------------------------------- la voce

/**
 * Una voce intera: nome con la sua «i», perché non si tocca, da quando vale,
 * controllo, aiuto. La «i» apre e chiude la descrizione sotto il campo (nel
 * pannello è un fumetto, `ui/components/hint.tsx`, che qui non si può
 * importare). Chiusa resta nel DOM (`hidden`): il campo la nomina con
 * `aria-describedby`.
 */
function Voce ({ voce, nascosta }: { voce: VoceProgramma, nascosta: boolean }): ReactElement {
  const t = testi()
  const [aperta, impostaAperta] = useState(false)
  const idDescrizione = voce.descrizione ? idDi(voce.chiave, 'descrizione') : undefined
  // Perché non si può toccare, detto accanto al nome, dove lo si cerca.
  const bloccata = voce.sospesa ? null : voce.bloccata
  const pastiglia = voce.sospesa
    ? t.sospesa(nomeDi(voce.dipendeDa ?? ''))
    : bloccata !== null ? t.nonSiAccende : ''
  // Una figlia (`dipendeDa`) rientra sotto il padre, come nel pannello.
  const classe = ['voce', voce.dipendeDa && 'voce--figlia', voce.sospesa && 'voce--sospesa'].filter(Boolean).join(' ')
  return (
    <div className={classe} hidden={nascosta}>
      <div className="voce__testata">
        <span className="voce__nome">
          {voce.etichetta}
          {idDescrizione
            ? (
                <button
                  className="voce__segno"
                  type="button"
                  aria-label={t.spiegazione(voce.etichetta)}
                  aria-controls={idDescrizione}
                  aria-expanded={aperta ? 'true' : 'false'}
                  onClick={() => impostaAperta(!aperta)}
                >
                  <SegnoInformazione />
                </button>
              )
            : null}
        </span>
        <span className="voce__pastiglia" hidden={!pastiglia}>{pastiglia}</span>
        {/* Il registro la legge solo partendo: detto accanto al nome, come nel pannello. */}
        {voce.alProssimoAvvio
          ? <span className="voce__pastiglia" title={t.alProssimoAvvioAiuto}>{t.alProssimoAvvio}</span>
          : null}
      </div>
      <Controllo
        voce={voce}
        quandoCambia={(valore) => scrivi(voce.chiave, valore)}
        sfoglia={() => chiedi({ impostazioni: 'sfoglia', chiave: voce.chiave })}
        svuota={() => chiedi({ impostazioni: 'azzera', chiave: voce.chiave })}
        descrittoDa={idDescrizione}
        annuncio={annunci.get(voce.chiave)}
      />
      {idDescrizione
        ? <p className="voce__aiuto" id={idDescrizione} hidden={!aperta}>{voce.descrizione}</p>
        : null}
      <p className="voce__aiuto" hidden={bloccata === null}>{bloccata ?? ''}</p>
    </div>
  )
}

// ----------------------------------------------------------------- la pagina

/**
 * Le avanzate, chiuse: si aprono a mano, o cercando quel che c'è dentro. Una
 * ricerca le apre e non le richiude: chi le ha aperte le tiene aperte.
 */
function Avanzate ({ voci: dentro, parole }: { voci: VoceProgramma[], parole: string[] }): ReactElement {
  const riquadro = useRef<HTMLDetailsElement | null>(null)
  const nascosto = vuoto(dentro, parole)
  useLayoutEffect(() => {
    if (parole.length > 0 && !nascosto && riquadro.current) riquadro.current.open = true
  })
  return (
    <details ref={riquadro} className="avanzate" hidden={nascosto}>
      <summary className="avanzate__titolo">{testi().avanzate(dentro.length)}</summary>
      {dentro.map((voce) => <Voce key={voce.chiave} voce={voce} nascosta={!passa(voce, parole)} />)}
    </details>
  )
}

/** Una sezione: il titolo, il riassunto, l'avvertenza, i gruppi, le avanzate chiuse. */
function BloccoSezione ({ sezione, parole }: { sezione: Sezione, parole: string[] }): ReactElement {
  const tutte = [...sezione.gruppi.flatMap((gruppo) => gruppo.voci), ...sezione.avanzate]
  return (
    <section className="sezione" hidden={vuoto(tutte, parole)}>
      <h3 className="sezione__titolo">{sezione.titolo}</h3>
      <p className="sezione__sottotitolo">{sezione.sottotitolo}</p>
      {/* L'avvertenza prima delle caselle: qui si concede qualcosa ad altri programmi. */}
      {sezione.avvertenza
        ? <p className="sezione__avvertenza">{sezione.avvertenza.replace(/\*\*/g, '')}</p>
        : null}
      {sezione.gruppi.map((gruppo, indice) => (
        // Gruppi fissi per sezione: l'indice è stabile.
        <div key={gruppo.titolo ?? indice} className="gruppo" hidden={vuoto(gruppo.voci, parole)}>
          {gruppo.titolo ? <h4 className="gruppo__titolo">{gruppo.titolo}</h4> : null}
          {gruppo.voci.map((voce) => <Voce key={voce.chiave} voce={voce} nascosta={!passa(voce, parole)} />)}
        </div>
      ))}
      {sezione.avanzate.length > 0 ? <Avanzate voci={sezione.avanzate} parole={parole} /> : null}
    </section>
  )
}

function Pagina (): ReactElement | null {
  if (!ricevuto) return null
  const parole = cercate()
  const visibili = voci.filter((voce) => passa(voce, parole)).length
  // Le aree nell'ordine delle schede del pannello. Quelle dell'anno non hanno
  // niente da regolare qui: una riga lo dice, e dice come arrivarci.
  return (
    <>
      {AREE.map((area) => {
        const dellAnno = AREE_DELL_ANNO.includes(area)
        const sezioni = dellAnno ? [] : sezioniDellArea(area, voci)
        const passano = sezioni.some((sezione) =>
          [...sezione.gruppi.flatMap((gruppo) => gruppo.voci), ...sezione.avanzate]
            .some((voce) => passa(voce, parole)))
        return (
          <section
            key={area}
            className={dellAnno ? 'area area--dell-anno' : 'area'}
            data-area={area}
            // Cercando, le aree senza niente che passa (quelle dell'anno comprese) si tolgono.
            hidden={parole.length > 0 && !passano}
          >
            <h2 className="area__titolo">{titoloArea(area)}</h2>
            {dellAnno
              ? <p className="area__senza-anno">{senzaAnno()}</p>
              : sezioni.map((sezione) => <BloccoSezione key={sezione.id} sezione={sezione} parole={parole} />)}
          </section>
        )
      })}
      {visibili === 0 ? <p className="vuoto">{testi().nessunaCorrisponde}</p> : null}
    </>
  )
}

/** Disegna subito: chi manda un messaggio trova la pagina già al passo. */
function disegna (): void {
  flushSync(() => radice.render(<Pagina />))
}

cerca.addEventListener('input', disegna)

ascolta((arrivato) => {
  const messaggio = arrivato as Messaggio
  switch (messaggio.impostazioni) {
    case 'schema':
      document.title = messaggio.titolo
      perId('titolo').textContent = messaggio.titolo
      voci = messaggio.voci
      annunci = new Map()
      cerca.value = messaggio.filtro ?? ''
      ricevuto = true
      disegna()
      chiedi({ impostazioni: 'pronto' })
      break

    case 'valori': {
      // Le scritture in volo sono andate: se una fosse stata rifiutata, il
      // `rifiuto` sarebbe arrivato prima.
      for (const chiudi of [...inAttesa.values()]) chiudi(null)
      // L'elenco intero dopo ogni scrittura, anche dell'altra finestra: un cambio
      // può toccare altre voci (spegnere `vassoio.attivo` ne sospende due).
      const arrivate = new Map(messaggio.voci.map((voce) => [voce.chiave, voce]))
      voci = voci.map((voce) => {
        const nuova = arrivate.get(voce.chiave)
        return nuova ? { ...voce, ...nuova } : voce
      })
      disegna()
      break
    }

    case 'rifiuto': {
      // Il valore non è stato scritto: lo dice il controllo, sotto il campo, e
      // si rimette com'era. Il `valori` che segue lo allinea al file. Un
      // percorso scelto con «Sfoglia…» non ha una scrittura in volo.
      const chiudi = inAttesa.get(messaggio.chiave)
      if (chiudi) {
        chiudi(messaggio.motivo)
      } else {
        annunci = new Map(annunci).set(messaggio.chiave, { motivo: messaggio.motivo })
        disegna()
      }
      break
    }

    case 'filtro':
      cerca.value = messaggio.testo ?? ''
      disegna()
      break
  }
})
