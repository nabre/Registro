// Gli aggiornamenti: quale versione gira, se ce n'è una nuova, e i gesti.
// Le tre impostazioni stanno nell'elenco sotto; questa scheda dice che cosa sta
// succedendo adesso. Lo stato si chiede una volta (`aggiornamenti.stato`), poi
// lo spinge l'host a ogni cambiamento (`MessaggioAggiornamenti`). Le parole
// arrivano già scritte nel `racconto` (`environment/updates.ts`), comuni a
// tutte le superfici; anche il gesto è uno solo: `gesto()`.

import type { RaccontoAggiornamenti, StatoAggiornamenti } from '../../../protocol.js'
import { barra, pastiglia, pulsante, scheda } from '../../components/base.js'
import type { NomeIcona } from '../../components/icons.js'
import { conferma } from '../../components/modal.js'
import { h, type Figlio } from '../../dom.js'
import { ascolta, azione, chiedi } from '../../bridge.js'
import { aggiorna, stato } from '../../state.js'
import { testi } from './updates.testi.js'

// ------------------------------------------------------------------ memoria
//
// Fuori dallo stato dell'interfaccia: è l'ultimo stato detto dall'host, e
// finisce con il pannello.

let ultimo: StatoAggiornamenti | null = null
let chiesto = false
let inAscolto = false

/** Se la sezione è davanti agli occhi: solo allora vale la pena ridisegnare. */
function sottoGliOcchi (): boolean {
  return (
    stato.vista === 'impostazioni' &&
    stato.ambitoImpostazioni === 'programma' &&
    stato.schedaProgramma === 'aggiornamenti'
  )
}

function ascoltaAggiornamenti (): void {
  if (inAscolto) return
  inAscolto = true
  ascolta((messaggio) => {
    if (messaggio.tipo !== 'aggiornamenti') return
    const prima = ultimo
    ultimo = messaggio.stato
    // L'ascolto dura quanto il pannello: fuori da questa sezione si ridisegna solo
    // quando cambia quel che mostrano la barra in fondo e il filetto, altrimenti
    // uno scarico ridisegnerebbe il registro di continuo.
    if (sottoGliOcchi() || cambiaFuori(prima, ultimo)) aggiorna({})
  })
}

async function leggi (): Promise<void> {
  // Di fondo: la chiede la barra in fondo a ogni avvio.
  const esito = await chiedi<StatoAggiornamenti>('aggiornamenti.stato', undefined, { diFondo: true })
  const prima = ultimo
  if (esito.ok && esito.dati) ultimo = esito.dati
  if (sottoGliOcchi() || cambiaFuori(prima, ultimo)) aggiorna({})
}

/**
 * Se fra due stati cambia quel che si vede fuori dalla sezione (barra in fondo
 * e filetto): durante lo scarico la percentuale conta a passi di cinque.
 */
function cambiaFuori (
  prima: StatoAggiornamenti | null,
  dopo: StatoAggiornamenti | null,
): boolean {
  const passo = (s: StatoAggiornamenti | null): number => Math.floor((s?.racconto.quota ?? 0) * 20)
  return prima?.fase !== dopo?.fase ||
    prima?.racconto.notizia !== dopo?.racconto.notizia ||
    passo(prima) !== passo(dopo)
}

/**
 * Lo stato degli aggiornamenti per chi sta fuori dalla sezione — la barra in
 * fondo, il filetto. La prima chiamata si mette in ascolto e chiede lo stato
 * all'host; finché non risponde vale `null`.
 */
export function statoDegliAggiornamenti (): StatoAggiornamenti | null {
  ascoltaAggiornamenti()
  if (!chiesto) {
    chiesto = true
    void leggi()
  }
  return ultimo
}

// ---------------------------------------------------------------- i gesti

type Gesto = NonNullable<RaccontoAggiornamenti['gesto']>

/** Il segno di ogni gesto, uguale dovunque lo si offra. */
const SIMBOLI: Record<Gesto['tipo'], NomeIcona> = {
  'aggiornamenti.controlla': 'ricarica',
  'aggiornamenti.scarica': 'esporta',
  'aggiornamenti.installa': 'ricarica',
  pagina: 'collegamento',
}

/**
 * Esegue il gesto proposto dal racconto. Solo «Riavvia e aggiorna» chiede
 * prima, perché chiude il registro; gli altri vanno e basta.
 */
async function esegui (gesto: Gesto, versione: string): Promise<void> {
  if (gesto.tipo === 'pagina') {
    // La guardia delle finestre la manda al browser di sistema
    // (`environment/navigation.ts`).
    window.open(ultimo?.pagina, '_blank', 'noopener')
    return
  }
  if (gesto.tipo === 'aggiornamenti.installa') {
    const sicuro = await conferma({
      titolo: testi().installare(versione),
      testo: testi().installareTesto,
      testoConferma: gesto.testo,
    })
    if (!sicuro) return
  }
  await azione({ tipo: gesto.tipo })
}

/** Il pulsante del gesto che ha senso adesso, o niente: lo usano la scheda e il filetto. */
export function pulsanteDelGesto (
  s: StatoAggiornamenti,
  variante: 'primario' | 'sottile' = 'sottile',
): HTMLButtonElement | null {
  const gesto = s.racconto.gesto
  if (!gesto) return null
  return pulsante({
    testo: gesto.testo,
    simbolo: SIMBOLI[gesto.tipo],
    // Scaricare e installare sono il gesto principale; ricontrollare e le release restano quieti.
    variante: gesto.tipo === 'aggiornamenti.scarica' || gesto.tipo === 'aggiornamenti.installa'
      ? variante
      : 'sottile',
    disabilitato: gesto.spento,
    al: () => esegui(gesto, s.nuova?.versione ?? ''),
  })
}

// --------------------------------------------------------------- la scheda

function corpo (s: StatoAggiornamenti): Figlio[] {
  const r = s.racconto
  const pezzi: Figlio[] = [
    h(
      'div',
      { class: 'opzioni__rimando' },
      h('p', { class: 'opzioni__rimando-testo' }, r.frase),
      pulsanteDelGesto(s, 'primario'),
    ),
  ]

  // Lo scarico: la barra sotto la frase.
  if (s.fase === 'scarico') {
    pezzi.push(barra(r.quota ?? 0, 'informativo', testi().scarico(s.nuova?.versione ?? '')))
  }

  // Le note della release, chiuse: sono lunghe.
  if (s.nuova?.note && s.fase !== 'aggiornato') {
    pezzi.push(h(
      'details',
      { class: 'aggiornamenti__note' },
      h('summary', null, testi().cheCosaCambia(s.nuova.versione)),
      h('p', { class: 'aggiornamenti__note-testo' }, s.nuova.note),
    ))
  }

  return pezzi
}

/** Dove si scarica a mano: il ripiego che c'è sempre. */
function allaPagina (s: StatoAggiornamenti): HTMLElement {
  return h(
    'a',
    {
      class: 'aggiornamenti__collegamento',
      // La guardia delle finestre la manda al browser di sistema
      // (`environment/navigation.ts`).
      attr: { href: s.pagina, target: '_blank', rel: 'noopener noreferrer' },
    },
    testi().paginaRelease,
  )
}

/** La scheda in testa alla sezione «Aggiornamenti». */
export function schedaAggiornamenti (): HTMLElement {
  const s = statoDegliAggiornamenti()
  const t = testi()
  if (!s) {
    return scheda({
      titolo: t.versioneRegistro,
      classe: 'scheda--opzioni',
      contenuto: h('p', { class: 'opzioni__rimando-testo' }, t.stoLeggendo),
    })
  }

  return scheda({
    titolo: t.versione(s.versione),
    aiuto: t.versioneAiuto,
    classe: 'scheda--opzioni',
    azioni: pastiglia(s.racconto.breve, s.racconto.tono),
    contenuto: h(
      'div',
      { class: 'aggiornamenti' },
      ...corpo(s),
      // Senza aggiornamento automatico il gesto è già «Apri le release»: niente piede.
      s.supportato
        ? h(
            'p',
            { class: 'aggiornamenti__piede' },
            t.daGithub,
            allaPagina(s),
          )
        : null,
    ),
  })
}
