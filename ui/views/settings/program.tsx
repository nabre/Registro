// Le impostazioni del programma: quelle che restano su questa macchina.
// Le stesse di `contract/manifest.ts` e della finestra nativa, raggruppate per
// argomento, con il nome a parole e il valore accanto al suo perché. La
// divisione in sezioni sta in `sections.ts`, senza DOM, e si prova.
// «Ripristina» riporta al predefinito le voci di un'area, dagli elenchi soltanto.

import type { ReactElement, ReactNode } from 'react'

import type { VoceProgramma } from '#contract/protocol.js'
import { Controllo, type Esito, type Valore } from '#core/controlli/control.js'
import { classi } from '#ui/classNames.js'
import {
  Avviso,
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
} from '#ui/components/base.js'
import { Suggerimento } from '#ui/components/hint.js'
import type { NomeIcona } from '#ui/components/icons.js'
import { conferma } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { azione, invia } from '#ui/bridge.js'
import type { AreaImpostazioni } from '#ui/place.js'
import { stato, vai } from '#ui/state.js'
import {
  avanzateDiSezione,
  daRipristinare,
  gruppiDiSezione,
  nomeVoce,
  titoloArea,
  vociMostrateDaSezione,
  type GruppoVoci,
  type SezioneProgramma,
} from './sections.js'
import { testi } from './program.testi.js'

/**
 * Scrive un valore e dice com'è andata, per la riga sotto il campo: `null`
 * salvato, o il motivo della dogana. Con `invia` e non `azione`: il rifiuto si
 * legge accanto al campo, non in una notifica. Il valore nuovo torna con lo stato.
 */
async function scrivi (chiave: string, valore: Valore): Promise<Esito> {
  const risposta = await invia({ tipo: 'programma.salva', chiave, valore })
  if (risposta.ok) return null
  return risposta.errori?.join(' ') || undefined
}

async function ritira (chiave: string): Promise<void> {
  const risposta = await azione({ tipo: 'programma.azzera', chiave })
  if (!risposta.ok) return
  notifica(testi().tornaAlPredefinito(nomeVoce(chiave)), 'info')
}

/** Il rimando di serie alla sezione dei modelli; chi ha un filtro aperto passa il suo. */
function apriModelli (): void {
  vai({ pagina: 'pagina.impostazioni', scheda: 'programma#modelli' })
}

async function sfoglia (chiave: string): Promise<void> {
  await azione({ tipo: 'programma.sfoglia', chiave })
}

/** La riga di una voce: vedi `vociProgramma`. */
function RigaProgramma ({ voce, aiModelli }: {
  voce: VoceProgramma
  aiModelli: () => void
}): ReactElement {
  // Già decisa da chi ha costruito l'elenco, con la stessa regola della finestra nativa.
  const spenta = voce.sospesa
  // Un interruttore a cui manca quel che richiede arriva spento e non si
  // accende: una casella che torna indietro da sola sembrerebbe un guasto.
  const bloccata = voce.bloccata
  const t = testi()
  return (
    <div
      // Una voce decisa a mano non si evidenzia: cambiare un'impostazione è
      // normale, non un avviso. Una figlia (`dipendeDa`) sta rientrata sotto il padre.
      className={classi('voce-opzione', spenta && 'voce-opzione--sospesa', voce.dipendeDa && 'voce-opzione--figlia')}
      // L'ancora dell'indirizzo `programma#<chiave>`: il filtro e Ctrl+K arrivano qui.
      data-voce={voce.chiave}
    >
      <div className="voce-opzione__testata">
        {/* La descrizione del manifesto sta dietro la «i» accanto al nome; il filtro
            la guarda comunque (`corrisponde`). */}
        <span className="voce-opzione__nome">
          {nomeVoce(voce.chiave)}
          {voce.descrizione
            ? <Suggerimento testo={voce.descrizione} etichetta={nomeVoce(voce.chiave)} />
            : null}
        </span>
        {/* Perché non si può toccare, detto accanto al campo. */}
        {spenta
          ? <Pastiglia testo={t.sospesa(nomeVoce(voce.dipendeDa ?? ''))} tono="quiete" />
          : null}
        {bloccata && !spenta ? <Pastiglia testo={t.nonSiAccende} tono="attenzione" /> : null}
        {/* Il registro la legge solo partendo: detto qui, non soltanto nella «i». */}
        {voce.alProssimoAvvio
          ? (
              <span className="voce-opzione__avvio" title={t.alProssimoAvvioAiuto}>
                <Pastiglia testo={t.alProssimoAvvio} tono="quiete" simbolo="ricarica" />
              </span>
            )
          : null}
      </div>
      {/* Il controllo è lo stesso della finestra nativa (`core/controlli/`). */}
      <div className="voce-opzione__campo">
        <Controllo
          voce={voce}
          quandoCambia={(valore: Valore) => scrivi(voce.chiave, valore)}
          sfoglia={() => void sfoglia(voce.chiave)}
          svuota={() => void ritira(voce.chiave)}
          aiModelli={aiModelli}
        />
      </div>
      {bloccata && !spenta ? <p className="voce-opzione__aiuto">{bloccata}</p> : null}
    </div>
  )
}

/**
 * Una riga di impostazione: che cos'è, com'è adesso, e perché non si tocca
 * quando non si tocca. `aiModelli` porta alla sezione dei modelli: il filtro
 * passa il suo, che si svuota. La chiave è la voce: in un elenco ognuna tiene
 * il suo controllo, con l'esito («Salvato», il motivo) fra due disegni.
 */
export function vociProgramma (
  voce: VoceProgramma,
  aiModelli: () => void = apriModelli,
): ReactElement {
  return <RigaProgramma key={voce.chiave} voce={voce} aiModelli={aiModelli} />
}

/**
 * Un gruppo di impostazioni con il suo titolo, scritto solo quando aggiunge
 * qualcosa (non per una voce sola con lo stesso nome).
 */
function disegnaGruppo (gruppo: GruppoVoci): ReactElement {
  const titoloUtile =
    gruppo.voci.length > 1 || nomeVoce(gruppo.voci[0]?.chiave ?? '') !== gruppo.titolo

  return (
    <section key={gruppo.prefisso} className="gruppo-opzioni">
      {titoloUtile ? <h3 className="gruppo-opzioni__titolo">{gruppo.titolo}</h3> : null}
      <div className="voci-opzioni">{gruppo.voci.map((voce) => vociProgramma(voce))}</div>
    </section>
  )
}

/**
 * Quali gruppi avanzati stanno aperti, per sezione. Fuori dal componente:
 * lasciando la pagina e tornando restano come li si era lasciati, e non è una
 * preferenza da salvare.
 */
const avanzateAperte = new Set<string>()

/**
 * Che cosa si legge quando una sezione non ha niente da mostrare. Tre casi: la
 * sezione che solo raccoglie è vuota per natura; un'altra sezione vuota vuol
 * dire impostazioni non ancora arrivate dall'host; oppure il filtro.
 */
function vuotoDi (
  sezione: SezioneProgramma,
): { simbolo: NomeIcona, titolo: string, testo: string } {
  const t = testi()
  if (sezione.raccoglie && sezione.prefissi.length === 0) {
    return {
      simbolo: 'impostazioni',
      titolo: t.nienteDaRaccogliere,
      testo: t.nienteDaRaccogliereTesto,
    }
  }
  return { simbolo: 'impostazioni', titolo: t.nonArrivate, testo: t.nonArrivateTesto }
}

/** Il gruppo delle voci rare, in fondo: chiuso, si apre a mano. */
export function disegnaAvanzate (sezione: { id: string }, voci: VoceProgramma[]): ReactNode {
  if (voci.length === 0) return null
  return (
    <details
      // testo-fisso: una chiave, non un testo
      key={`avanzate:${sezione.id}`}
      className="gruppo-opzioni gruppo-opzioni--avanzate"
      open={avanzateAperte.has(sezione.id)}
      onToggle={(evento) => {
        if (evento.currentTarget.open) avanzateAperte.add(sezione.id)
        else avanzateAperte.delete(sezione.id)
      }}
    >
      <summary className="gruppo-opzioni__titolo">{testi().avanzate(voci.length)}</summary>
      <div className="voci-opzioni">{voci.map((voce) => vociProgramma(voce))}</div>
    </details>
  )
}

/**
 * Le voci di una sezione: prima l'avvertenza, se concedono qualcosa ad altri,
 * poi i gruppi, poi le avanzate chiuse. Senza titolo: nome e riassunto li dice
 * già la testata della sezione.
 */
export function schedaProgramma (sezione: SezioneProgramma): ReactElement {
  const voci = vociMostrateDaSezione(stato.programma, sezione)
  return (
    <Scheda classe="scheda--opzioni">
      <div>
        {/* L'avvertenza prima delle caselle: qui si concede qualcosa ad altri programmi. */}
        {sezione.avvertenza
          ? <Avviso tono="attenzione"><div>{sezione.avvertenza.replace(/\*\*/g, '')}</div></Avviso>
          : null}
        {voci.length === 0
          ? <StatoVuoto {...vuotoDi(sezione)} />
          : (
              <div className="gruppi-opzioni">
                {gruppiDiSezione(stato.programma, sezione).map((gruppo) => disegnaGruppo(gruppo))}
                {disegnaAvanzate(sezione, avanzateDiSezione(stato.programma, sezione))}
              </div>
            )}
      </div>
    </Scheda>
  )
}

/**
 * «Ripristina» di un'area: dice quante voci tocca, chiede, e le riporta al
 * predefinito. Solo quelle degli elenchi (`daRipristinare`); niente se non ce
 * n'è nessuna decisa a mano.
 */
export function ripristinaArea (area: AreaImpostazioni): ReactElement | null {
  const voci = daRipristinare(stato.programma, area)
  if (voci.length === 0) return null
  const t = testi()
  const nome = titoloArea(area)
  return (
    <Pulsante
      testo={t.ripristinaQuante(voci.length)}
      simbolo="ricarica"
      variante="sottile"
      titolo={t.ripristinaAiuto}
      al={async () => {
        const sicuro = await conferma({
          titolo: t.ripristinare(nome),
          testo: t.tornano(voci.length),
          testoConferma: t.ripristina,
        })
        if (!sicuro) return
        for (const voce of voci) {
          await azione({ tipo: 'programma.azzera', chiave: voce.chiave })
        }
        notifica(t.ripristinata(nome), 'info')
      }}
    />
  )
}
