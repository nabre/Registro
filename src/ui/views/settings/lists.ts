// Le liste di sistema: che cosa c'è dentro i menu a tendina del registro.
//
// Sono impostazioni del **documento** — viaggiano con il `.registro` — perché
// sono parole della scuola, non del computer: chi apre lo stesso anno da
// un'altra macchina deve trovare le stesse voci, e un anno chiuso deve restare
// leggibile con le parole con cui è stato scritto.
//
// La pagina fa tre cose e nessun'altra: rinomina una voce, la sposta, e — dove
// il valore è testo libero — ne aggiunge o ne toglie. Quel che non fa è
// altrettanto importante: non lascia inventare valori dentro le liste chiuse.
// Il tipo di un'attività non è un'etichetta, decide quali campi la tappa chiede
// e di che tinta è nella striscia del tempo; un tipo inventato sarebbe una voce
// che si può scegliere e che non fa niente. Il perché è scritto per esteso in
// `domain/lists.ts`.
//
// Si salva a ogni gesto, come tutto il resto della pagina: sono valori
// indipendenti, e un pulsante «salva» vorrebbe dire lasciare in sospeso una
// riga già trascinata.

import {
  CHIAVI_LISTA,
  type ChiaveLista,
  definizioneLista,
  listaCambiata,
  vociDiLista,
  type VoceLista,
} from '../../../domain/lists.js'
import { normalizzaTesto } from '../../../domain/text.js'
import { pastiglia, pulsante, scheda } from '../../components/base.js'
import { icona } from '../../components/icons.js'
import { h, type Figlio } from '../../dom.js'
import { conferma } from '../../components/modal.js'
import { stato } from '../../state.js'
import { salvaImpostazioni } from './document.js'

/** Quante tappe, prove o momenti hanno scelto questa voce: quel che si perde. */
function quanteVolte (chiave: ChiaveLista, valore: string): number {
  const registro = stato.registro
  const attivita = registro.piani.flatMap((piano) => piano.attivita)

  switch (chiave) {
    case 'tipoAttivita':
      return attivita.filter((a) => a.tipo === valore).length
    case 'raggruppamento':
      return attivita.filter((a) => (a.raggruppamento ?? 'plenaria') === valore).length
    case 'tipoValutazione':
      return (
        attivita.filter((a) => a.valutazione?.tipo === valore).length +
        registro.valutazioni.filter((m) => m.tipo === valore).length
      )
    // Le liste aperte finiscono dentro `parametri`, sotto una chiave che
    // dipende dal tipo dell'attività: si conta guardando i valori, che è
    // l'unico modo per cui una lista nuova non chiede una riga qui.
    default:
      return attivita.filter((a) =>
        Object.values(a.parametri ?? {}).some((scritto) => scritto === valore),
      ).length
  }
}

/** Scrive una lista intera, lasciando le altre come stanno. */
function salvaLista (chiave: ChiaveLista, voci: VoceLista[]): void {
  void salvaImpostazioni({
    liste: { ...(stato.registro.impostazioni.liste ?? {}), [chiave]: voci },
  })
}

/** Rimette la lista com'era nata: la chiave sparisce, e torna la predefinita. */
async function azzeraLista (chiave: ChiaveLista, etichetta: string): Promise<void> {
  // Si chiede, come per ogni altro gesto che toglie: qui se ne vanno tutte le
  // voci scritte a mano per quella lista, e non c'è modo di riaverle.
  const vai = await conferma({
    titolo: `Rimettere le voci di fabbrica in «${etichetta}»?`,
    testo:
      'Le voci aggiunte o rinominate spariscono e torna l’elenco di partenza. ' +
      'Quel che è già stato segnato con le voci di adesso non cambia.',
    testoConferma: 'Rimetti',
    pericolo: true,
  })
  if (!vai) return
  const liste = { ...(stato.registro.impostazioni.liste ?? {}) }
  delete liste[chiave]
  void salvaImpostazioni({ liste })
}

/** La riga di una voce: si sposta, si rinomina, e — se la lista è aperta — si toglie. */
function rigaVoce (
  chiave: ChiaveLista,
  voci: VoceLista[],
  indice: number,
  aperta: boolean,
): HTMLElement {
  const voce = voci[indice]
  const usi = quanteVolte(chiave, voce.valore)

  const sposta = (verso: number) => {
    const destinazione = indice + verso
    if (destinazione < 0 || destinazione >= voci.length) return
    const copia = [...voci]
    ;[copia[indice], copia[destinazione]] = [copia[destinazione], copia[indice]]
    salvaLista(chiave, copia)
  }

  return h(
    'li',
    { class: 'voce-lista' },
    h(
      'div',
      { class: 'voce-lista__ordine' },
      pulsante({
        simbolo: 'su',
        variante: 'fantasma',
        titolo: 'Su',
        disabilitato: indice === 0,
        al: () => sposta(-1),
      }),
      pulsante({
        simbolo: 'giu',
        variante: 'fantasma',
        titolo: 'Giù',
        disabilitato: indice === voci.length - 1,
        al: () => sposta(1),
      }),
    ),
    h('input', {
      class: 'campo__controllo voce-lista__testo',
      type: 'text',
      value: voce.testo,
      attr: { 'aria-label': 'Come si legge questa voce' },
      onchange: (evento: Event) => {
        const testo = (evento.target as HTMLInputElement).value.trim()
        const copia = voci.map((v, i) => (i === indice ? { ...v, testo: testo || v.valore } : v))
        salvaLista(chiave, copia)
      },
    }),
    // Il valore non si tocca mai, nemmeno nelle liste aperte: è quel che sta
    // scritto nei piani già preparati, e cambiarlo li lascerebbe con un valore
    // che nessuna voce spiega più. Si vede perché è quel che finisce nel file,
    // ed è l'unica cosa che distingue due voci chiamate uguale.
    h('code', { class: 'voce-lista__valore', attr: { title: 'Il valore salvato nel file' } }, voce.valore),
    usi > 0
      ? pastiglia(usi === 1 ? 'usata una volta' : `usata ${usi} volte`, 'quiete')
      : pastiglia('mai usata', 'neutro'),
    aperta
      ? pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo:
            usi > 0
              ? 'Togli la voce: quel che l’ha già scelta resta com’è'
              : 'Togli la voce',
          al: () => salvaLista(chiave, voci.filter((_, i) => i !== indice)),
        })
      : null,
  )
}

/**
 * Il valore con cui una voce nuova si salva, ricavato da come si legge.
 *
 * Minuscolo, senza accenti, con i trattini al posto degli spazi: è la forma che
 * hanno tutti gli altri valori del registro — `in-classe`, `docenza-di-classe` —
 * e che regge la rilettura da un file scritto a mano.
 */
function valoreDa (testo: string): string {
  return normalizzaTesto(testo).replace(/ +/g, '-')
}

/** Il campo per aggiungere una voce: c'è solo dove il valore è testo libero. */
function aggiuntaVoce (chiave: ChiaveLista, voci: VoceLista[]): HTMLElement {
  const campo = h('input', {
    class: 'campo__controllo voce-lista__nuova',
    type: 'text',
    placeholder: 'una voce nuova',
    attr: { 'aria-label': 'Come si legge la voce nuova' },
  })

  const aggiungi = () => {
    const testo = campo.value.trim()
    if (!testo) return
    const base = valoreDa(testo)
    if (!base) return
    // Due voci con lo stesso valore sarebbero la stessa voce scritta due volte:
    // la seconda si prende un numero in coda invece di sovrascrivere la prima.
    const usati = new Set(voci.map((v) => v.valore))
    let valore = base
    let contatore = 2
    while (usati.has(valore)) valore = `${base}-${contatore++}`
    campo.value = ''
    salvaLista(chiave, [...voci, { valore, testo }])
  }

  campo.addEventListener('keydown', (evento: KeyboardEvent) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    aggiungi()
  })

  return h(
    'div',
    { class: 'voce-lista__aggiunta' },
    campo,
    pulsante({ testo: 'Aggiungi', simbolo: 'piu', variante: 'sottile', al: aggiungi }),
  )
}

/** Una lista intera: il suo nome, dove si vede, e le voci. */
function bloccoLista (chiave: ChiaveLista): HTMLElement {
  const definizione = definizioneLista(chiave)
  const voci = vociDiLista(stato.registro.impostazioni, chiave)
  const cambiata = listaCambiata(stato.registro.impostazioni, chiave)

  return h(
    'section',
    { class: 'lista-sistema' },
    h(
      'header',
      { class: 'lista-sistema__testata' },
      h('h4', null, definizione.etichetta),
      h('p', { class: 'testo-quieto' }, definizione.descrizione),
      cambiata
        ? pulsante({
            testo: 'Rimetti le voci di fabbrica',
            simbolo: 'ricarica',
            variante: 'sottile',
            al: () => azzeraLista(chiave, definizione.etichetta),
          })
        : null,
    ),
    // Delle liste chiuse si cambiano la parola e l'ordine, e basta: si dice
    // qui, invece di lasciar cercare il pulsante «aggiungi» che non c'è.
    definizione.aperta
      ? null
      : h(
          'p',
          { class: 'lista-sistema__vincolo testo-quieto' },
          icona('informazione', 'icona--minuta'),
          h(
            'span',
            null,
            'Queste voci le usa il programma — decidono quali campi compaiono e come si ' +
              'conta — e non se ne possono aggiungere. Si cambiano la parola che si legge e ' +
              'l’ordine in cui si offrono.',
          ),
        ),
    h(
      'ul',
      { class: 'lista-sistema__voci' },
      ...voci.map((_, indice) => rigaVoce(chiave, voci, indice, definizione.aperta)),
    ),
    definizione.aperta ? aggiuntaVoce(chiave, voci) : null,
  )
}

/**
 * La scheda intera.
 *
 * Le liste stanno una sotto l'altra e non dietro una tendina che le seleziona:
 * sono sette, ci stanno in una pagina, e chi arriva qui di solito non sa in
 * quale delle sette sta la voce che vuole cambiare — la cerca scorrendo.
 */
export function schedaListe (): Figlio {
  return scheda({
    titolo: 'Liste dei menu a tendina',
    sottotitolo: 'le voci fra cui si sceglie preparando un piano lezione',
    contenuto: h(
      'div',
      { class: 'liste-sistema' },
      h(
        'p',
        { class: 'testo-quieto' },
        'Stanno dentro il documento: chi apre questo anno da un’altra macchina trova le ' +
          'stesse voci. Togliendone una, le tappe che l’avevano scelta restano come sono — ' +
          'la tendina se la ritrova in coda finché qualcuno non ne sceglie un’altra.',
      ),
      ...CHIAVI_LISTA.map((chiave) => bloccoLista(chiave)),
    ),
  })
}
