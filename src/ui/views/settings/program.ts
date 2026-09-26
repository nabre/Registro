// Le impostazioni del programma: quelle che restano su questa macchina.
// Le stesse di `src/manifest.ts` e della finestra nativa, raggruppate per
// argomento, con il nome a parole e il valore accanto al suo perché. La
// divisione in sezioni sta in `sections.ts`, senza DOM, e si prova.
// «Ritira» e non «cancella»: si smette di decidere e torna il predefinito.

import type { VoceProgramma } from '../../../protocol.js'
import {
  avviso,
  campo,
  pastiglia,
  pulsante,
  scheda,
  statoVuoto,
} from '../../components/base.js'
import { suggerimento } from '../../components/hint.js'
import type { NomeIcona } from '../../components/icons.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import { parole } from '../../../domain/words.testi.js'
import { azione } from '../../bridge.js'
import { stato } from '../../state.js'
import { sceltaConFigure } from './figures.js'
import {
  avanzateDiSezione,
  gruppiDiSezione,
  nomeVoce,
  vociMostrateDaSezione,
  type GruppoVoci,
  type SezioneProgramma,
} from './sections.js'
import { testi } from './program.testi.js'

async function scrivi (chiave: string, valore: string | number | boolean): Promise<void> {
  const risposta = await azione({ tipo: 'programma.salva', chiave, valore })
  if (!risposta.ok) return
  // Nessuna notifica di successo: il valore nuovo torna con lo stato.
}

async function ritira (chiave: string): Promise<void> {
  const risposta = await azione({ tipo: 'programma.azzera', chiave })
  if (!risposta.ok) return
  notifica(testi().tornaAlPredefinito(nomeVoce(chiave)), 'info')
}

/** Come si scrive un valore quando lo si mostra fuori dal campo. */
function comeSiLegge (voce: VoceProgramma, valore: string | number | boolean): string {
  const t = testi()
  if (voce.tipo === 'boolean') return valore ? t.acceso : t.spento
  if (String(valore) === '') return parole().vuoto
  const scelta = voce.scelte?.find((candidata) => candidata.valore === valore)
  return scelta ? String(scelta.valore) : String(valore)
}

/**
 * Il controllo giusto per il tipo dichiarato nel manifesto. Una voce sospesa si
 * mostra spenta qualunque cosa dica il file: il valore scritto resta e torna
 * quando il padre si riaccende, ma una casella spuntata sotto un interruttore
 * spento direbbe concesso quel che non lo è.
 */
function controllo (voce: VoceProgramma, spenta: boolean): Figlio {
  if (voce.tipo === 'boolean') {
    const acceso = Boolean(voce.valore) && !spenta
    return campo({
      nome: voce.chiave,
      tipo: 'checkbox',
      etichetta: acceso ? testi().Acceso : testi().Spento,
      valore: acceso,
      disabilitato: spenta,
      al: (valore) => void scrivi(voce.chiave, valore === 'true'),
    })
  }

  // Le scelte che si capiscono guardandole (il tema) a schede con figura; le
  // altre a tendina.
  const figurata = sceltaConFigure(voce, spenta, (valore) => void scrivi(voce.chiave, valore))
  if (figurata) return figurata

  if (voce.scelte) {
    return campo({
      nome: voce.chiave,
      tipo: 'select',
      valore: String(voce.valore),
      disabilitato: spenta,
      // L'aiuto di una scelta sta nella sua etichetta, visibile mentre si sceglie.
      opzioni: voce.scelte.map((scelta) => ({
        valore: String(scelta.valore),
        testo: scelta.aiuto,
      })),
      al: (valore) => {
        const scelta = voce.scelte?.find((candidata) => String(candidata.valore) === String(valore))
        if (scelta) void scrivi(voce.chiave, scelta.valore)
      },
    })
  }

  if (voce.tipo === 'number') {
    return campo({
      nome: voce.chiave,
      tipo: 'number',
      valore: Number(voce.valore),
      passo: 'any',
      // Gli estremi del manifesto arrivano al campo; il controllo vero resta
      // dall'altra parte (`valoreConMotivo`).
      min: voce.minimo ?? undefined,
      max: voce.massimo ?? undefined,
      disabilitato: spenta,
      al: (valore) => {
        const numero = Number(valore)
        if (String(valore).trim() === '' || !Number.isFinite(numero)) return
        void scrivi(voce.chiave, numero)
      },
    })
  }

  if (voce.formato === 'cartella' || voce.formato === 'eseguibile' || voce.formato === 'file') {
    return campoPercorso(voce, spenta)
  }

  return campo({
    nome: voce.chiave,
    tipo: voce.formato === 'email' ? 'email' : 'text',
    valore: String(voce.valore ?? ''),
    disabilitato: spenta,
    al: (valore) => void scrivi(voce.chiave, String(valore)),
  })
}

/**
 * Un percorso: si mostra e si sceglie con il dialogo del sistema, non si batte.
 * Vuoto vuol dire «ci pensa il registro», e lo si dice.
 */
function campoPercorso (voce: VoceProgramma, spenta: boolean): Figlio {
  const t = testi()
  const scritto = String(voce.valore ?? '')
  return h(
    'div',
    { class: 'campo-percorso' },
    h(
      'span',
      {
        class: ['campo-percorso__valore', scritto === '' && 'campo-percorso__valore--vuoto'],
        attr: { title: scritto || null },
      },
      scritto || t.ciPensaIlRegistro,
    ),
    pulsante({
      testo: parole().sfoglia,
      simbolo: 'cartella',
      variante: 'sottile',
      disabilitato: spenta,
      titolo: t.sceglieConDialogo(voce.formato === 'cartella'),
      al: () => void sfoglia(voce.chiave),
    }),
    scritto !== ''
      ? pulsante({
          testo: t.svuota,
          variante: 'fantasma',
          disabilitato: spenta,
          titolo: t.svuotaAiuto,
          al: () => void ritira(voce.chiave),
        })
      : null,
  )
}

async function sfoglia (chiave: string): Promise<void> {
  await azione({ tipo: 'programma.sfoglia', chiave })
}

/**
 * Una riga di impostazione: che cos'è, com'è adesso, e da dove viene il valore.
 * La chiave resta scritta in piccolo: è quella dei messaggi d'errore e della guida.
 */
export function vociProgramma (voce: VoceProgramma): HTMLElement {
  // Già decisa da chi ha costruito l'elenco, con la stessa regola della finestra nativa.
  const spenta = voce.sospesa
  // Un interruttore a cui manca quel che richiede arriva spento e non si
  // accende: una casella che torna indietro da sola sembrerebbe un guasto.
  const bloccata = voce.bloccata
  const t = testi()
  return h(
    'div',
    {
      class: [
        'voce-opzione',
        voce.scritta && 'voce-opzione--scritta',
        spenta && 'voce-opzione--sospesa',
      ],
    },
    h(
      'div',
      { class: 'voce-opzione__testata' },
      // La descrizione del manifesto sta dietro la «i» accanto al nome; il filtro
      // la guarda comunque (`corrisponde`).
      h(
        'span',
        { class: 'voce-opzione__nome' },
        nomeVoce(voce.chiave),
        voce.descrizione
          ? suggerimento(voce.descrizione, { etichetta: nomeVoce(voce.chiave) })
          : null,
      ),
      // Perché non si può toccare, detto accanto al campo.
      spenta
        ? pastiglia(t.sospesa(nomeVoce(voce.dipendeDa ?? '')), 'quiete')
        : null,
      bloccata && !spenta ? pastiglia(t.nonSiAccende, 'attenzione') : null,
      // Modificata: si dice anche il predefinito, per decidere se ritirarla.
      voce.scritta
        ? pastiglia(t.modificata(comeSiLegge(voce, voce.predefinito)), 'attenzione')
        : pastiglia(t.predefinito(comeSiLegge(voce, voce.valore)), 'quiete'),
      h('code', { class: 'voce-opzione__chiave' }, voce.chiave),
      voce.scritta
        ? pulsante({
            testo: t.ritira,
            simbolo: 'ricarica',
            variante: 'fantasma',
            titolo: t.ritiraAiuto(comeSiLegge(voce, voce.predefinito)),
            al: () => void ritira(voce.chiave),
          })
        : null,
    ),
    h('div', { class: 'voce-opzione__campo' }, controllo(voce, spenta || bloccata !== null)),
    bloccata && !spenta ? h('p', { class: 'voce-opzione__aiuto' }, bloccata) : null,
  )
}

/**
 * Le voci che una sezione mostra, elenco e scheda dedicata insieme: chi chiama
 * conta o ritira, e le chiavi della scheda vanno comprese.
 */
export function vociDellaSezione (sezione: SezioneProgramma): VoceProgramma[] {
  return vociMostrateDaSezione(stato.programma, sezione)
}

/**
 * Un gruppo di impostazioni con il suo titolo, scritto solo quando aggiunge
 * qualcosa (non per una voce sola con lo stesso nome).
 */
function disegnaGruppo (gruppo: GruppoVoci): HTMLElement {
  const titoloUtile =
    gruppo.voci.length > 1 || nomeVoce(gruppo.voci[0]?.chiave ?? '') !== gruppo.titolo

  return h(
    'section',
    { class: 'gruppo-opzioni' },
    titoloUtile ? h('h4', { class: 'gruppo-opzioni__titolo' }, gruppo.titolo) : null,
    h('div', { class: 'voci-opzioni' }, ...gruppo.voci.map((voce) => vociProgramma(voce))),
  )
}

/** Quante voci di una sezione sono state decise a mano. */
function quanteScritte (voci: VoceProgramma[]): number {
  return voci.filter((voce) => voce.scritta).length
}

/**
 * Quali gruppi avanzati stanno aperti, per sezione. Fuori da stato e DOM: il
 * ridisegno ricreerebbe chiuso il `<details>`, e non è una preferenza da
 * salvare.
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

function disegnaAvanzate (sezione: SezioneProgramma, voci: VoceProgramma[]): Figlio {
  if (voci.length === 0) return null
  const scritte = quanteScritte(voci)
  return h(
    'details',
    {
      class: 'gruppo-opzioni gruppo-opzioni--avanzate',
      // Aperto da sé quando qualcosa lì dentro è stato deciso a mano.
      open: avanzateAperte.has(sezione.id) || scritte > 0,
      ontoggle: (evento: Event) => {
        const suo = evento.currentTarget as HTMLDetailsElement
        if (suo.open) avanzateAperte.add(sezione.id)
        else avanzateAperte.delete(sezione.id)
      },
    },
    h(
      'summary',
      { class: 'gruppo-opzioni__titolo' },
      testi().giaInstallati(voci.length),
    ),
    h('div', { class: 'voci-opzioni' }, ...voci.map((voce) => vociProgramma(voce))),
  )
}

/**
 * Una sezione intera, con il gesto che la riporta com'era. «Ripristina» chiede
 * prima e dice quante voci tocca.
 */
export function schedaProgramma (sezione: SezioneProgramma): HTMLElement {
  const voci = vociDellaSezione(sezione)
  const scritte = quanteScritte(voci)
  const t = testi()

  return scheda({
    titolo: sezione.titolo,
    // Dietro la «i»: lo stesso riassunto sta già sotto il nome nella colonna di sinistra.
    aiuto: sezione.sottotitolo,
    classe: 'scheda--opzioni',
    azioni:
      scritte > 0
        ? pulsante({
            testo: t.ripristinaQuante(scritte),
            simbolo: 'ricarica',
            variante: 'sottile',
            titolo: t.ripristinaAiuto,
            al: async () => {
              const sicuro = await conferma({
                titolo: t.ripristinare(sezione.titolo),
                testo: t.tornano(scritte),
                testoConferma: t.ripristina,
              })
              if (!sicuro) return
              for (const voce of voci.filter((candidata) => candidata.scritta)) {
                await azione({ tipo: 'programma.azzera', chiave: voce.chiave })
              }
              notifica(t.ripristinata(sezione.titolo), 'info')
            },
          })
        : null,
    contenuto: h(
      'div',
      null,
      // L'avvertenza prima delle caselle: qui si concede qualcosa ad altri programmi.
      sezione.avvertenza
        ? avviso(h('div', null, sezione.avvertenza.replace(/\*\*/g, '')), 'attenzione')
        : null,
      voci.length === 0
        ? statoVuoto(vuotoDi(sezione))
        : h(
            'div',
            { class: 'gruppi-opzioni' },
            ...gruppiDiSezione(stato.programma, sezione).map((gruppo) => disegnaGruppo(gruppo)),
            disegnaAvanzate(sezione, avanzateDiSezione(stato.programma, sezione)),
          ),
    ),
  })
}

/** Dove finiscono questi valori (ambito «Programma»): sta dietro la «i» accanto al titolo. */
export function dovVannoLeOpzioni (): HTMLElement {
  const t = testi()
  return h('span', null, h('strong', null, t.restanoQui), t.restanoQuiTesto)
}
