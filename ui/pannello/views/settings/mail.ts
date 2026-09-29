// La posta: i gesti, i parametri della casella e l'interruttore dell'invio diretto.
// Collegare una casella è un giro di autorizzazione con Microsoft, con il
// risultato nel portachiavi del sistema: per questo i gesti stanno qui. La
// casella non si scrive a mano: l'account lo chiede «Collega la casella», e il
// mittente si sceglie fra gli indirizzi che Microsoft dice dell'account. La
// scheda mostra i parametri com'è adesso e `invioDiretto` accanto alla riga che
// ne spiega l'effetto (`CHIAVI_IN_SCHEDA` in `sections.ts` toglie le tre
// chiavi dall'elenco sotto).

import { avviso, campo, pastiglia, pulsante, scheda } from '../../components/base.js'
import { apriModale } from '../../components/modal.js'
import { h, type Figlio } from '../../dom.js'
import type { Messaggio, VoceProgramma } from '../../../../contract/protocollo.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'
import { salvaImpostazioni } from './document.js'
import { campoFirma } from './signature.js'
import { vociProgramma } from './program.js'
import { CHIAVI_IN_SCHEDA } from './sections.js'
import { parole } from '../../../../core/dominio/words.testi.js'
import { testi } from './mail.testi.js'
import { testi as testiPagina } from '../settings.testi.js'

/** Scrive sotto le azioni com'è andata e lo lascia lì, da rileggere mentre si corregge. */
function mostraEsito (dove: HTMLElement, detto: Messaggio | undefined): void {
  dove.replaceChildren(
    detto
      ? avviso(
          detto.testo,
          detto.livello === 'errore'
            ? 'negativo'
            : detto.livello === 'avviso'
              ? 'attenzione'
              : 'informativo',
        )
      : avviso(testi().nessunaRisposta, 'attenzione'),
  )
}

/** Dove finisce davvero una comunicazione adesso: dipende dal collegamento e dall'invio diretto. */
function doveFinisce (posta: typeof stato.posta): string {
  return posta.invioDiretto && posta.exchange
    ? testi().partonoDalRegistro(posta.server)
    : testi().esconoComeEml
}

/** Se si è collegati: la pastiglia, e cosa fare se non lo si è. */
function statoCasella (posta: typeof stato.posta): HTMLElement {
  const t = testi()
  return h(
    'p',
    { class: 'posta-stato' },
    posta.exchange
      ? pastiglia(t.collegata, 'positivo', 'collegamento')
      : pastiglia(t.daCollegare, 'quiete', 'collegamento'),
    posta.exchange ? null : t.premiCollega,
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

/** La riga promossa, presa dalle stesse voci che disegna l'elenco di sotto. */
function scelteDellaPosta (): Figlio {
  const voci = new Map(stato.programma.map((voce: VoceProgramma) => [voce.chiave, voce]))
  // Solo l'interruttore: account e mittente li mostra `parametriCasella`.
  const trovate = (CHIAVI_IN_SCHEDA.posta ?? [])
    .filter((chiave) => chiave === 'registroDocenti.posta.invioDiretto')
    .map((chiave) => voci.get(chiave))
    .filter((voce): voce is VoceProgramma => Boolean(voce))
  if (trovate.length === 0) return null
  return h(
    'section',
    { class: 'gruppo-opzioni' },
    h('h4', { class: 'gruppo-opzioni__titolo' }, testi().quandoParte),
    h('div', { class: 'voci-opzioni' }, ...trovate.map((voce) => vociProgramma(voce))),
  )
}

/** La posta: a che punto è il collegamento, e dove vanno le comunicazioni. */
export function schedaPosta (): HTMLElement {
  const posta = stato.posta

  // L'esito delle prove resta qui sotto, da rileggere mentre si corregge.
  const esito = h('div', { class: 'posta-esito' })
  /**
   * Il riquadro vivo, cercato al clic: dopo un ridisegno `esito` può essere
   * quello scartato, e l'esito finirebbe fuori dalla pagina.
   */
  const esitoVivo = (evento: Event): HTMLElement =>
    (evento.currentTarget as HTMLElement).closest('.scheda')
      ?.querySelector<HTMLElement>('.posta-esito') ?? esito
  const t = testi()

  return scheda({
    titolo: t.posta,
    sottotitolo: doveFinisce(posta),
    azioni: [
      pulsante({
        testo: posta.exchange ? t.ricollega : t.collega,
        simbolo: 'collegamento',
        variante: posta.exchange ? 'sottile' : 'primario',
        titolo: t.collegaAiuto,
        al: async (evento) => {
          const dove = esitoVivo(evento)
          const risposta = await azione({ tipo: 'posta.collega' })
          mostraEsito(dove, risposta.messaggio)
        },
      }),
      pulsante({
        testo: t.prova,
        simbolo: 'posta',
        variante: 'sottile',
        titolo: t.provaAiuto,
        al: async (evento) => {
          const dove = esitoVivo(evento)
          const risposta = await azione({ tipo: 'posta.prova' })
          mostraEsito(dove, risposta.messaggio)
        },
      }),
      // La prova d'invio accanto a quella d'accesso: sono due permessi diversi.
      ...(posta.exchange
        ? [
            pulsante({
              testo: t.mandaProva,
              simbolo: 'posta',
              variante: 'sottile',
              titolo: t.mandaProvaAiuto,
              al: async (evento) => {
                const dove = esitoVivo(evento)
                const risposta = await azione({ tipo: 'posta.invioProva' })
                mostraEsito(dove, risposta.messaggio)
              },
            }),
            pulsante({
              testo: t.scollega,
              simbolo: 'chiudi',
              variante: 'fantasma',
              titolo: t.scollegaAiuto,
              al: async (evento) => {
                const dove = esitoVivo(evento)
                const risposta = await azione({ tipo: 'posta.scollega' })
                mostraEsito(dove, risposta.messaggio)
              },
            }),
          ]
        : []),
    ],
    contenuto: h(
      'div',
      { class: 'posta-corpo' },
      statoCasella(posta),
      parametriCasella(posta),
      esito,
      scelteDellaPosta(),
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
    azioni: h(
      'span',
      {
        class: 'sezione-voce__ambito',
        attr: { title: testiPagina().fileAiuto },
      },
      testiPagina().file,
    ),
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
