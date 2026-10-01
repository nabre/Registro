// Utente › Posta: com'è la casella, da chi partono le mail, e se partono da
// sé. Collegare, provare, scollegare e azzerare stanno in Utente › Account, per
// capacità (`microsoft.ts`): qui si dice com'è e si rimanda là. La casella non
// si scrive a mano: il mittente si sceglie fra gli indirizzi che Microsoft dice
// dell'account. La scheda mostra `invioDiretto` accanto alla riga che ne spiega
// l'effetto (`CHIAVI_IN_SCHEDA` in `sections.ts` toglie le tre chiavi
// dall'elenco sotto).

import { campo, pastiglia, pulsante, scheda } from '#ui/pannello/components/base.js'
import { apriModale } from '#ui/pannello/components/modal.js'
import { h, type Figlio } from '#ui/pannello/dom.js'
import type { VoceProgramma } from '#contract/protocol.js'
import { azione } from '#ui/pannello/bridge.js'
import { stato, vai } from '#ui/pannello/state.js'
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
function statoCasella (posta: typeof stato.posta): HTMLElement {
  const t = testi()
  return h(
    'p',
    { class: 'posta-stato' },
    posta.exchange
      ? pastiglia(t.collegata, 'positivo', 'collegamento')
      : pastiglia(t.daCollegare, 'quiete', 'collegamento'),
    posta.exchange ? null : t.collegaInAccount,
    pulsante({
      testo: t.vaiAdAccount,
      simbolo: 'destra',
      variante: posta.exchange ? 'fantasma' : 'sottile',
      titolo: t.vaiAdAccountAiuto,
      al: () => { vai({ pagina: 'pagina.impostazioni', scheda: 'utente#account' }) },
    }),
  )
}

/**
 * Il mittente: un menu fra gli indirizzi dell'account quando ce n'è più di
 * uno, altrimenti l'indirizzo e basta. Un mittente scritto prima e che
 * l'account non dice resta in fondo, per non cambiarlo senza chiedere.
 */
function sceltaMittente (posta: typeof stato.posta): Figlio {
  const t = testi()
  const indirizzi = [...posta.indirizzi]
  if (posta.mittente && !indirizzi.some((voce) => voce.toLowerCase() === posta.mittente.toLowerCase())) {
    indirizzi.push(posta.mittente)
  }
  if (!posta.exchange || indirizzi.length < 2) return posta.mittente || t.nonDetto
  return campo({
    nome: 'mittente',
    etichetta: t.mittente,
    tipo: 'select',
    valore: posta.mittente,
    opzioni: indirizzi.map((indirizzo) => ({ valore: indirizzo, testo: indirizzo })),
    aiuto: t.mittenteAiuto,
    al: (valore) => {
      if (valore === posta.mittente) return
      void azione({ tipo: 'programma.salva', chiave: 'registroDocenti.posta.mittente', valore })
    },
  })
}

/** I parametri della casella, com'è adesso: si leggono, non si scrivono. */
function parametriCasella (posta: typeof stato.posta): HTMLElement {
  const t = testi()
  const riga = (termine: string, valore: Figlio): Figlio[] => [
    h('dt', null, termine),
    h('dd', null, valore),
  ]
  const mittente = sceltaMittente(posta)
  const conMenu = typeof mittente === 'object' && mittente !== null
  return h(
    'dl',
    { class: 'posta-parametri' },
    ...riga(t.account, posta.accesso || t.nonDetto),
    // Il menu porta la sua etichetta: la riga resta senza nome.
    ...(conMenu ? [h('dt', null, t.mittente), h('dd', null, mittente)] : riga(t.mittente, mittente)),
    ...riga(t.server, t.serverValore(posta.server, posta.porta)),
    ...riga(t.autenticazione, t.autenticazioneValore),
    ...riga(t.comunicazioni, doveFinisce(posta)),
  )
}

/**
 * La riga promossa, presa dalle stesse voci che disegna l'elenco di sotto.
 * Accesa senza casella non fa niente: lo dice una pastiglia accanto, invece di
 * lasciarlo scoprire alla prima comunicazione rimasta bozza.
 */
function scelteDellaPosta (posta: typeof stato.posta): Figlio {
  const voci = new Map(stato.programma.map((voce: VoceProgramma) => [voce.chiave, voce]))
  // Solo l'interruttore: account e mittente li mostra `parametriCasella`.
  const trovate = (CHIAVI_IN_SCHEDA.posta ?? [])
    .filter((chiave) => chiave === 'registroDocenti.posta.invioDiretto')
    .map((chiave) => voci.get(chiave))
    .filter((voce): voce is VoceProgramma => Boolean(voce))
  if (trovate.length === 0) return null
  const senzaEffetto = posta.invioDiretto && !posta.exchange
  return h(
    'section',
    { class: 'gruppo-opzioni' },
    h('h4', { class: 'gruppo-opzioni__titolo' }, testi().quandoParte),
    h('div', { class: 'voci-opzioni' }, ...trovate.map((voce) => vociProgramma(voce))),
    senzaEffetto ? h('p', { class: 'posta-stato' }, pastiglia(testi().senzaEffetto, 'attenzione')) : null,
  )
}

/** La posta: a che punto è la casella, da chi partono le mail, e se partono da sé. */
export function schedaPosta (): HTMLElement {
  const posta = stato.posta
  const t = testi()
  return scheda({
    titolo: t.posta,
    sottotitolo: doveFinisce(posta),
    contenuto: h(
      'div',
      { class: 'posta-corpo' },
      statoCasella(posta),
      parametriCasella(posta),
      scelteDellaPosta(posta),
    ),
  })
}

// ------------------------------------------------------------------ la firma
//
// Sta con la posta, ma si salva nel documento dell'anno: per questo la scheda
// porta la pastiglia «file».

/**
 * La firma di serie com'è adesso, cioè quel che parte con il campo vuoto: il
 * nome e sotto la scuola, dai dati dell'intestazione.
 */
function firmaDiSerie (): HTMLElement {
  const { docente, carte } = stato.registro.impostazioni.intestazione
  // La scuola della prima carta, la predefinita, come fa l'host.
  const sede = carte[0]?.sede ?? ''
  if (docente.trim() === '' && sede.trim() === '') {
    return h('div', null, testi().firmaDiSerieMancante)
  }
  return h(
    'div',
    null,
    docente.trim() ? h('div', null, docente) : null,
    sede.trim() ? h('div', { class: 'firma__serie-sede' }, sede) : null,
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
      corpo: () =>
        campo({
          nome: 'indirizzo',
          etichetta: parole().indirizzo,
          valore: attuale,
          segnaposto: t.indirizzoSegnaposto,
          aiuto: t.indirizzoAiuto,
        }),
      alSalva: (valori, contesto) => {
        dato = String(valori.indirizzo ?? '')
        contesto.chiudi()
      },
      allaChiusura: () => risolvi(dato),
    })
  })
}

/** La firma delle e-mail: si scrive come la si vede, e si salva nel file dell'anno. */
export function schedaFirma (): HTMLElement {
  const t = testi()
  return scheda({
    titolo: t.firma,
    aiuto: t.firmaAiuto,
    contenuto: [
      campoFirma({
        firma: stato.registro.impostazioni.intestazione.firma ?? '',
        diSerie: firmaDiSerie(),
        // Vuota vuol dire «quella di serie»: `salvaImpostazioni` la manda senza, e
        // l'host usa la sua.
        salva: (html) => void salvaImpostazioni({ intestazione: { firma: html } }),
        chiediIndirizzo,
      }),
      h('small', { class: 'campo__aiuto' }, t.firmaNota),
    ],
  })
}
