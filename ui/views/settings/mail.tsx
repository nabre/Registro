// Utente › Posta: com'è la casella, da chi partono le mail, e se partono da
// sé. Collegare, provare, scollegare e azzerare stanno in Utente › Account, per
// capacità (`microsoft.tsx`): qui si dice com'è e si rimanda là. La casella non
// si scrive a mano: il mittente si sceglie fra gli indirizzi che Microsoft dice
// dell'account. La scheda mostra `invioDiretto` accanto alla riga che ne spiega
// l'effetto (`CHIAVI_IN_SCHEDA` in `sections.ts` toglie le tre chiavi
// dall'elenco sotto).

import type { ReactElement, ReactNode } from 'react'

import { Campo, Pastiglia, Pulsante, Scheda } from '#ui/components/base.js'
import { apriModale } from '#ui/components/modal.js'
import type { VoceProgramma } from '#contract/protocol.js'
import { azione } from '#ui/bridge.js'
import { stato, vai } from '#ui/state.js'
import { salvaImpostazioni } from './document.js'
import { campoFirma } from './signature.js'
import { vociProgramma } from './program.js'
import { CHIAVI_IN_SCHEDA } from './sections.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './mail.testi.js'

/** Dove finisce davvero una comunicazione adesso: dipende dal collegamento e dall'invio diretto. */
function doveFinisce (posta: typeof stato.posta): string {
  return posta.invioDiretto && posta.exchange
    ? testi().partonoDalRegistro(posta.server)
    : testi().esconoComeEml
}

/** Se si è collegati: la pastiglia, e dove si collega se non lo si è. */
function statoCasella (posta: typeof stato.posta): ReactElement {
  const t = testi()
  return (
    <p className="posta-stato">
      {posta.exchange
        ? <Pastiglia testo={t.collegata} tono="positivo" simbolo="collegamento" />
        : <Pastiglia testo={t.daCollegare} tono="quiete" simbolo="collegamento" />}
      {posta.exchange ? null : t.collegaInAccount}
      <Pulsante
        testo={t.vaiAdAccount}
        simbolo="destra"
        variante={posta.exchange ? 'fantasma' : 'sottile'}
        titolo={t.vaiAdAccountAiuto}
        al={() => { vai({ pagina: 'pagina.impostazioni', scheda: 'utente#account' }) }}
      />
    </p>
  )
}

/**
 * Il mittente: un menu fra gli indirizzi dell'account quando ce n'è più di
 * uno, altrimenti l'indirizzo e basta. Un mittente scritto prima e che
 * l'account non dice resta in fondo, per non cambiarlo senza chiedere.
 */
function sceltaMittente (posta: typeof stato.posta): ReactNode {
  const t = testi()
  const indirizzi = [...posta.indirizzi]
  if (posta.mittente && !indirizzi.some((voce) => voce.toLowerCase() === posta.mittente.toLowerCase())) {
    indirizzi.push(posta.mittente)
  }
  if (!posta.exchange || indirizzi.length < 2) return posta.mittente || t.nonDetto
  return (
    <Campo
      nome="mittente"
      etichetta={t.mittente}
      tipo="select"
      valore={posta.mittente}
      opzioni={indirizzi.map((indirizzo) => ({ valore: indirizzo, testo: indirizzo }))}
      aiuto={t.mittenteAiuto}
      al={(valore) => {
        if (valore === posta.mittente) return
        void azione({ tipo: 'programma.salva', chiave: 'registroDocenti.posta.mittente', valore })
      }}
    />
  )
}

/** I parametri della casella, com'è adesso: si leggono, non si scrivono. */
function parametriCasella (posta: typeof stato.posta): ReactElement {
  const t = testi()
  const riga = (termine: string, valore: ReactNode): ReactNode => (
    <>
      <dt>{termine}</dt>
      <dd>{valore}</dd>
    </>
  )
  const mittente = sceltaMittente(posta)
  return (
    <dl className="posta-parametri">
      {riga(t.account, posta.accesso || t.nonDetto)}
      {/* Il menu porta la sua etichetta: la riga resta senza nome. */}
      {riga(t.mittente, mittente)}
      {riga(t.server, t.serverValore(posta.server, posta.porta))}
      {riga(t.autenticazione, t.autenticazioneValore)}
      {riga(t.comunicazioni, doveFinisce(posta))}
    </dl>
  )
}

/**
 * La riga promossa, presa dalle stesse voci che disegna l'elenco di sotto.
 * Accesa senza casella non fa niente: lo dice una pastiglia accanto, invece di
 * lasciarlo scoprire alla prima comunicazione rimasta bozza.
 */
function scelteDellaPosta (posta: typeof stato.posta): ReactNode {
  const voci = new Map(stato.programma.map((voce: VoceProgramma) => [voce.chiave, voce]))
  // Solo l'interruttore: account e mittente li mostra `parametriCasella`.
  const trovate = (CHIAVI_IN_SCHEDA.posta ?? [])
    .filter((chiave) => chiave === 'registroDocenti.posta.invioDiretto')
    .map((chiave) => voci.get(chiave))
    .filter((voce): voce is VoceProgramma => Boolean(voce))
  if (trovate.length === 0) return null
  const senzaEffetto = posta.invioDiretto && !posta.exchange
  return (
    <section className="gruppo-opzioni">
      <h4 className="gruppo-opzioni__titolo">{testi().quandoParte}</h4>
      <div className="voci-opzioni">{trovate.map((voce) => vociProgramma(voce))}</div>
      {senzaEffetto
        ? <p className="posta-stato"><Pastiglia testo={testi().senzaEffetto} tono="attenzione" /></p>
        : null}
    </section>
  )
}

/**
 * La posta: a che punto è la casella, da chi partono le mail, e se partono da
 * sé. Il nome non è «Posta», che è già la sezione; dove finiscono le
 * comunicazioni lo dice la riga sua, non anche un sottotitolo.
 */
export function schedaPosta (): ReactElement {
  const posta = stato.posta
  const t = testi()
  return (
    <Scheda titolo={t.casellaEInvio}>
      <div className="posta-corpo">
        {statoCasella(posta)}
        {parametriCasella(posta)}
        {scelteDellaPosta(posta)}
      </div>
    </Scheda>
  )
}

// ------------------------------------------------------------------ la firma
//
// Sta con la posta, ma si salva nel documento dell'anno: per questo la scheda
// porta la pastiglia «file».

/**
 * La firma di serie com'è adesso, cioè quel che parte con il campo vuoto: il
 * nome e sotto la scuola, dai dati dell'intestazione.
 */
function firmaDiSerie (): ReactElement {
  const { docente, carte } = stato.registro.impostazioni.intestazione
  // La scuola della prima carta, la predefinita, come fa l'host.
  const sede = carte[0]?.sede ?? ''
  if (docente.trim() === '' && sede.trim() === '') {
    return <div>{testi().firmaDiSerieMancante}</div>
  }
  return (
    <div>
      {docente.trim() ? <div>{docente}</div> : null}
      {sede.trim() ? <div className="firma__serie-sede">{sede}</div> : null}
    </div>
  )
}

/** Chiede l'indirizzo di un collegamento in una finestra piccola. */
function chiediIndirizzo (attuale: string): Promise<string | null> {
  return new Promise((risolvi) => {
    let dato: string | null = null
    const t = testi()
    apriModale({
      titolo: t.collegamento,
      larghezza: 'stretta',
      testoSalva: t.collegaIndirizzo,
      corpo: () => (
        <Campo
          nome="indirizzo"
          etichetta={parole().indirizzo}
          valore={attuale}
          segnaposto={t.indirizzoSegnaposto}
          aiuto={t.indirizzoAiuto}
        />
      ),
      alSalva: (valori, contesto) => {
        dato = String(valori.indirizzo ?? '')
        contesto.chiudi()
      },
      allaChiusura: () => risolvi(dato),
    })
  })
}

/** La firma delle e-mail: si scrive come la si vede, e si salva nel file dell'anno. */
export function schedaFirma (): ReactElement {
  const t = testi()
  return (
    <Scheda titolo={t.firma} aiuto={t.firmaAiuto}>
      {campoFirma({
        firma: stato.registro.impostazioni.intestazione.firma ?? '',
        diSerie: firmaDiSerie(),
        // Vuota vuol dire «quella di serie»: `salvaImpostazioni` la manda senza, e
        // l'host usa la sua.
        salva: (html) => void salvaImpostazioni({ intestazione: { firma: html } }),
        chiediIndirizzo,
      })}
      <small className="campo__aiuto">{t.firmaNota}</small>
    </Scheda>
  )
}
