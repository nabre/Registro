// La finestra che sfoglia OneDrive: le cartelle di un account e i documenti
// `.regi` che contengono, o tutti quelli che Microsoft trova cercando. Aprire
// un documento lo passa all'host, che sceglie fra la copia sincronizzata e una
// scaricata (`data/onedrive.ts`).

import { avviso, campo, pulsante, quantoMisura } from '../components/base.js'
import { icona } from '../components/icons.js'
import { apriModale, type ContestoModale } from '../components/modal.js'
import { h } from '../dom.js'
import { azione, chiedi } from '../bridge.js'
import { stato, vai as vaiNelPannello } from '../state.js'
import { formattaData } from '../../../core/dominio/dates.js'
import type { VoceOneDrive } from '../../../core/dominio/onedrive.js'
import { parole } from '../../../core/dominio/words.testi.js'
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

/**
 * Apre la finestra. Senza account collegati propone di collegarne uno; con
 * `account` parte da quello, altrimenti dal primo.
 */
export function apriOneDrive (account?: string): void {
  const t = testi()
  const collegati = accountCollegati()
  let scelto = account && collegati.includes(account) ? account : collegati[0] ?? ''
  let veduta: Veduta = { genere: 'cartella' }
  /** Ogni lettura prende un numero: una risposta arrivata dopo un'altra richiesta è vecchia. */
  let giro = 0
  let contesto: ContestoModale | null = null

  const testata = h('div', { class: 'onedrive__testata' })
  const elenco = h('div', { class: 'onedrive__elenco' })
  const piede = h('p', { class: 'campo__aiuto onedrive__piede' })

  function vai (nuova: Veduta): void {
    veduta = nuova
    void leggi()
  }

  async function leggi (): Promise<void> {
    const mio = ++giro
    contesto?.mostraErrori([])
    piede.textContent = ''
    elenco.replaceChildren(h('p', { class: 'testo-quieto' }, veduta.genere === 'ricerca' ? t.cerco : t.leggo))
    contesto?.occupato(true)

    if (veduta.genere === 'ricerca') {
      const esito = await chiedi<{
        voci: VoceOneDrive[]
        troncato: boolean
        /** Perché si è fermata; un host più vecchio non lo manda. */
        motivo?: 'troppi' | 'tempo' | null
        locale: boolean
      }>('onedrive.cerca', { account: scelto })
      if (mio !== giro) return
      contesto?.occupato(false)
      if (!esito.ok || !esito.dati) return guasto(esito.errori)
      disegnaTestata(null)
      disegnaVoci(esito.dati.voci, true)
      piede.textContent = [
        t.trovati(esito.dati.voci.length),
        esito.dati.troncato ? (esito.dati.motivo === 'tempo' ? t.tempoScaduto : t.troppi) : '',
        // Solo Graph si appoggia all'indice di Microsoft; il disco si legge com'è.
        esito.dati.locale ? t.dalComputer : t.indiceMicrosoft,
      ].filter(Boolean).join(' ')
      return
    }

    const esito = await chiedi<Cartella>('onedrive.elenco', {
      account: scelto,
      ...(veduta.drive ? { drive: veduta.drive } : {}),
      ...(veduta.cartella ? { cartella: veduta.cartella } : {}),
    })
    if (mio !== giro) return
    contesto?.occupato(false)
    if (!esito.ok || !esito.dati) return guasto(esito.errori)
    disegnaTestata(esito.dati)
    disegnaVoci(esito.dati.voci, false)
    piede.textContent = [
      esito.dati.altri > 0 ? t.altriFile(esito.dati.altri) : '',
      esito.dati.troncato ? t.troppi : '',
    ].filter(Boolean).join(' ')
  }

  function guasto (errori: string[]): void {
    elenco.replaceChildren()
    contesto?.mostraErrori(errori.length > 0 ? errori : [t.nonSiLegge])
  }

  /** Dove si è, e i gesti per spostarsi: la radice, la cartella di sopra, la ricerca. */
  function disegnaTestata (cartella: Cartella | null): void {
    const dove = cartella
      ? ['OneDrive', ...cartella.percorso, cartella.nome].filter(Boolean).join(' › ')
      : t.risultati
    testata.replaceChildren(
      h('span', { class: 'onedrive__dove' }, dove),
      h(
        'div',
        { class: 'onedrive__gesti' },
        pulsante({
          testo: t.radice,
          simbolo: 'casa',
          variante: 'sottile',
          // Già alla radice del proprio OneDrive.
          disabilitato: veduta.genere === 'cartella' && !veduta.drive && !veduta.cartella,
          al: () => vai({ genere: 'cartella' }),
        }),
        cartella
          ? pulsante({
              testo: t.su,
              simbolo: 'su',
              variante: 'sottile',
              disabilitato: cartella.superiore === null,
              al: () => vai({
                genere: 'cartella',
                drive: cartella.drive,
                ...(cartella.superiore ? { cartella: cartella.superiore } : {}),
              }),
            })
          : null,
        pulsante({
          testo: t.cercaTutti,
          simbolo: 'lente',
          variante: veduta.genere === 'ricerca' ? 'primario' : 'sottile',
          titolo: t.cercaTuttiAiuto,
          al: () => vai({ genere: 'ricerca' }),
        }),
      ),
    )
  }

  function disegnaVoci (voci: VoceOneDrive[], conPercorso: boolean): void {
    if (voci.length === 0) {
      elenco.replaceChildren(avviso(conPercorso ? t.nessunoTrovato : t.cartellaVuota, 'informativo'))
      return
    }
    elenco.replaceChildren(
      h('ul', { class: 'onedrive__voci' }, ...voci.map((voce) => rigaVoce(voce, conPercorso))),
    )
  }

  function rigaVoce (voce: VoceOneDrive, conPercorso: boolean): HTMLElement {
    if (voce.genere === 'cartella') {
      return h(
        'li',
        { class: 'onedrive__voce' },
        h(
          'button',
          {
            type: 'button',
            class: 'onedrive__nome',
            onclick: () => vai({ genere: 'cartella', drive: voce.drive, cartella: voce.id }),
          },
          icona('cartella'),
          h('span', null, voce.nome),
        ),
        h('small', { class: 'testo-quieto' }, voce.figli === null ? '' : t.elementi(voce.figli)),
      )
    }
    const dettagli = [
      conPercorso && voce.percorso.length > 0 ? voce.percorso.join(' › ') : '',
      quando(voce.modificato),
      quantoMisura(voce.dimensione),
    ].filter(Boolean).join(' · ')
    return h(
      'li',
      { class: ['onedrive__voce', 'onedrive__voce--regi'] },
      h(
        'span',
        { class: 'onedrive__nome' },
        icona('documento'),
        h('span', null, h('strong', null, voce.nome), h('small', null, dettagli)),
      ),
      pulsante({
        testo: parole().apri,
        simbolo: 'destra',
        variante: 'primario',
        titolo: t.apriAiuto,
        al: async () => {
          const risposta = await azione({ tipo: 'onedrive.apri', account: scelto, drive: voce.drive, id: voce.id })
          if (risposta.ok) contesto?.chiudi()
        },
      }),
    )
  }

  /** Chi non ha ancora un account collegato: lo si manda a collegarne uno. */
  function senzaAccount (): HTMLElement {
    return h(
      'div',
      { class: 'modulo' },
      avviso(t.nessunAccount, 'informativo'),
      h(
        'div',
        { class: 'onedrive__gesti' },
        pulsante({
          testo: t.collega,
          simbolo: 'collegamento',
          variante: 'primario',
          al: async () => {
            const risposta = await azione({ tipo: 'microsoft.aggiungi' })
            if (!risposta.ok || accountCollegati().length === 0) return
            contesto?.chiudi()
            apriOneDrive()
          },
        }),
        pulsante({
          testo: t.impostazioni,
          simbolo: 'impostazioni',
          variante: 'sottile',
          al: () => {
            contesto?.chiudi()
            vaiNelPannello({ pagina: 'pagina.impostazioni', scheda: 'utente#account' })
          },
        }),
      ),
    )
  }

  const sceltaAccount = collegati.length > 1
    ? campo({
        nome: 'account',
        etichetta: t.account,
        tipo: 'select',
        valore: scelto,
        opzioni: collegati.map((indirizzo) => ({ valore: indirizzo, testo: indirizzo })),
        al: (valore) => {
          scelto = valore
          vai({ genere: 'cartella' })
        },
      })
    : null

  contesto = apriModale({
    titolo: t.titolo,
    larghezza: 'larga',
    aiuto: t.aiuto,
    corpo: () =>
      collegati.length === 0
        ? senzaAccount()
        : h(
            'div',
            { class: ['modulo', 'onedrive'] },
            sceltaAccount ?? h('p', { class: 'campo__aiuto' }, t.comeAccount(scelto)),
            testata,
            elenco,
            piede,
          ),
  })
  if (collegati.length > 0) void leggi()
}
