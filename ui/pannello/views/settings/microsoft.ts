// Utente › Account: gli account Microsoft, uno per riga, e per ognuno le due
// capacità che il registro sa usare — la Posta e OneDrive — con com'è adesso e
// il gesto che serve. Collegare, provare, scollegare e azzerare la casella
// stanno qui e solo qui: la sezione Posta dice com'è e rimanda.
//
// I permessi restano separati, un gettone per capacità: collegare la posta non
// apre OneDrive, e viceversa. Il gettone resta nel portachiavi dell'host: qui
// arrivano solo indirizzi. Un account che il client di OneDrive sincronizza sul
// computer compare da sé e si sfoglia senza accesso; la casella della posta
// compare anche prima di essere collegata, perché è il primo account che si
// vorrà usare.

import { avviso, pastiglia, pulsante, scheda } from '../../components/base.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import type { Messaggio } from '../../../../contract/protocol.js'
import type { AccountMicrosoft } from '../../../../core/dominio/onedrive.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'
import { testi as testiPosta } from './mail.testi.js'
import { testi } from './microsoft.testi.js'

/** Le chiavi che la casella si porta dietro: «Azzera» le ritira insieme al gettone. */
const CHIAVI_DELLA_CASELLA = [
  'registroDocenti.posta.utente',
  'registroDocenti.posta.mittente',
  'registroDocenti.posta.invioDiretto',
]

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
      : avviso(testiPosta().nessunaRisposta, 'attenzione'),
  )
}

/**
 * Il riquadro dell'esito vivo, cercato al clic: dopo un ridisegno quello del
 * disegno può essere lo scartato, e l'esito finirebbe fuori dalla pagina.
 */
function esitoVivo (evento: Event): HTMLElement | null {
  return (evento.currentTarget as HTMLElement).closest('.account-microsoft')
    ?.querySelector<HTMLElement>('.posta-esito')
    ?? (evento.currentTarget as HTMLElement).closest('.scheda')?.querySelector<HTMLElement>('.posta-esito')
    ?? null
}

/** Un gesto della posta: manda l'azione e scrive l'esito sotto la riga. */
function gestoPosta (
  testo: string,
  titolo: string,
  tipo: 'posta.collega' | 'posta.prova' | 'posta.invioProva' | 'posta.scollega',
  variante: 'primario' | 'sottile' | 'fantasma',
  simbolo: 'collegamento' | 'posta' | 'chiudi',
): HTMLElement {
  return pulsante({
    testo,
    simbolo,
    variante,
    titolo,
    al: async (evento) => {
      const dove = esitoVivo(evento)
      const risposta = await azione({ tipo })
      if (dove) mostraEsito(dove, risposta.messaggio)
    },
  })
}

/**
 * «Azzera»: toglie il gettone e, con lui, la casella scritta, il mittente e
 * l'invio diretto. Con conferma, perché il collegamento va rifatto da capo;
 * l'autorizzazione nel profilo Microsoft si revoca di là.
 */
async function azzeraPosta (): Promise<void> {
  const t = testi()
  const sicuro = await conferma({
    titolo: t.azzerare,
    testo: t.azzerareTesto,
    testoConferma: t.azzera,
    pericolo: true,
  })
  if (!sicuro) return
  await azione({ tipo: 'posta.scollega' })
  for (const chiave of CHIAVI_DELLA_CASELLA) await azione({ tipo: 'programma.azzera', chiave })
  notifica(t.postaAzzerata, 'info')
}

/** Una capacità di un account: il nome, com'è, e i gesti che le si addicono. */
function capacita (nome: string, come: HTMLElement, spiegazione: Figlio, gesti: Figlio[]): HTMLElement {
  return h(
    'div',
    { class: 'account-microsoft__capacita' },
    h('span', { class: 'account-microsoft__capacita-nome' }, nome),
    come,
    h('div', { class: 'account-microsoft__azioni' }, ...gesti),
    spiegazione,
  )
}

/** La capacità Posta: la casella del registro, o un account che non lo è. */
function capacitaPosta (account: AccountMicrosoft, qualcunaPosta: boolean): HTMLElement {
  const t = testi()
  const p = testiPosta()
  const collegata = stato.posta.exchange
  if (!account.posta) {
    // Una casella sola: un altro account diventa la casella solo se non ce n'è una.
    return capacita(
      t.posta,
      pastiglia(t.nonLaCasella, 'quiete', 'posta'),
      null,
      qualcunaPosta ? [] : [gestoPosta(p.collega, p.collegaAiuto, 'posta.collega', 'sottile', 'collegamento')],
    )
  }
  return capacita(
    t.posta,
    collegata
      ? pastiglia(p.collegata, 'positivo', 'collegamento')
      : pastiglia(p.daCollegare, 'quiete', 'collegamento'),
    collegata ? null : h('small', { class: 'campo__aiuto' }, p.premiCollega),
    [
      gestoPosta(
        collegata ? p.ricollega : p.collega,
        p.collegaAiuto,
        'posta.collega',
        collegata ? 'sottile' : 'primario',
        'collegamento',
      ),
      gestoPosta(p.prova, p.provaAiuto, 'posta.prova', 'sottile', 'posta'),
      // La prova d'invio accanto a quella d'accesso: sono due permessi diversi.
      collegata ? gestoPosta(p.mandaProva, p.mandaProvaAiuto, 'posta.invioProva', 'sottile', 'posta') : null,
      collegata ? gestoPosta(p.scollega, p.scollegaAiuto, 'posta.scollega', 'fantasma', 'chiudi') : null,
      pulsante({
        testo: t.azzera,
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: t.azzeraAiuto,
        al: () => azzeraPosta(),
      }),
    ],
  )
}

/** La capacità OneDrive: sincronizzato sul computer, collegato, o da collegare. */
function capacitaOneDrive (account: AccountMicrosoft): HTMLElement {
  const t = testi()
  const come = account.sulComputer
    ? pastiglia(t.sulComputer, 'positivo', 'cartella')
    : account.onedrive
      ? pastiglia(t.onedriveCollegato, 'positivo', 'collegamento')
      : pastiglia(t.onedriveDaCollegare, 'quiete', 'collegamento')
  return capacita(t.onedrive, come, null, [
    account.onedrive
      ? pulsante({
          testo: t.scollega,
          simbolo: 'chiudi',
          variante: 'fantasma',
          titolo: t.scollegaAiuto,
          al: async () => {
            const sicuro = await conferma({
              titolo: t.scollegare(account.indirizzo),
              testo: t.scollegareTesto,
              testoConferma: t.scollega,
            })
            if (!sicuro) return
            await azione({ tipo: 'microsoft.togli', indirizzo: account.indirizzo })
          },
        })
      : null,
    // Sincronizzato sul computer non serve collegarlo: si sfoglia già.
    !account.onedrive && !account.sulComputer
      ? pulsante({
          testo: t.collega,
          simbolo: 'collegamento',
          variante: 'sottile',
          titolo: t.collegaAiuto,
          al: () => azione({ tipo: 'microsoft.aggiungi', indirizzo: account.indirizzo }),
        })
      : null,
  ])
}

/** Una riga dell'elenco: chi è, e le sue due capacità. */
function rigaAccount (account: AccountMicrosoft, qualcunaPosta: boolean): HTMLElement {
  return h(
    'li',
    { class: 'account-microsoft' },
    h(
      'div',
      { class: 'account-microsoft__chi' },
      h('strong', null, account.nome || account.indirizzo),
      account.nome ? h('small', null, account.indirizzo) : null,
    ),
    capacitaPosta(account, qualcunaPosta),
    capacitaOneDrive(account),
    // L'esito delle prove della posta resta sotto la sua riga, da rileggere mentre si corregge.
    account.posta ? h('div', { class: 'posta-esito' }) : null,
  )
}

/** La scheda degli account: l'elenco, e i gesti per aggiungerne uno o collegare la posta. */
export function schedaAccountMicrosoft (): HTMLElement {
  const t = testi()
  const p = testiPosta()
  const account = stato.microsoft.account
  const qualcunaPosta = account.some((voce) => voce.posta)

  return scheda({
    titolo: t.titolo,
    aiuto: t.aiuto,
    azioni: [
      // Senza nessuna casella, collegarla è il primo gesto: sta qui in cima.
      qualcunaPosta
        ? null
        : gestoPosta(p.collega, p.collegaAiuto, 'posta.collega', 'primario', 'collegamento'),
      pulsante({
        testo: t.aggiungi,
        simbolo: 'piu',
        variante: account.length === 0 && qualcunaPosta ? 'primario' : 'sottile',
        titolo: t.aggiungiAiuto,
        al: () => azione({ tipo: 'microsoft.aggiungi' }),
      }),
    ],
    contenuto: h(
      'div',
      { class: 'posta-corpo' },
      account.length === 0
        ? avviso(t.nessuno, 'informativo')
        : h(
            'ul',
            { class: 'elenco-account-microsoft' },
            ...account.map((voce) => rigaAccount(voce, qualcunaPosta)),
          ),
      // Gli esiti di «Collega la casella» quando nessun account lo è ancora.
      qualcunaPosta ? null : h('div', { class: 'posta-esito' }),
      h('small', { class: 'campo__aiuto' }, t.nota),
      // Aprire è un gesto di file: sta nel menu «File» e in Ctrl+K, qui solo il rimando.
      h('small', { class: 'campo__aiuto' }, t.apriDaFile),
    ),
  })
}
