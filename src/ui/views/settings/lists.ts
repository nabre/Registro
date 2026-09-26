// Le liste di sistema: che cosa c'è dentro i menu a tendina del registro.
// Impostazioni del documento: sono parole della scuola e viaggiano con il `.regi`.
// Si rinomina (o ritinge) una voce, la si sposta, e solo nelle liste a testo
// libero se ne aggiunge o toglie: nelle liste chiuse un valore inventato non
// farebbe niente (vedi `domain/lists.ts`). Si salva a ogni gesto.

import {
  CHIAVI_LISTA,
  type ChiaveLista,
  COLORE_DI_RIPIEGO,
  coloreDiVoce,
  definizioneLista,
  listaCambiata,
  listaConColore,
  vociDiLista,
  type VoceLista,
} from '../../../domain/lists.js'
import { normalizzaTesto } from '../../../domain/text.js'
import { pastiglia, pulsante, scheda, selettore } from '../../components/base.js'
import { icona } from '../../components/icons.js'
import { suggerimento } from '../../components/hint.js'
import { h, type Figlio } from '../../dom.js'
import { conferma } from '../../components/modal.js'
import { aggiorna, stato } from '../../state.js'
import { parole } from '../../../domain/words.testi.js'
import { salvaImpostazioni } from './document.js'
import { testi } from './lists.testi.js'

/** Quante tappe, prove o momenti hanno scelto questa voce: quel che si perde. */
function quanteVolte (chiave: ChiaveLista, valore: string): number {
  const registro = stato.registro
  const attivita = registro.piani.flatMap((piano) => piano.attivita)

  switch (chiave) {
    case 'tipoAttivita':
      return attivita.filter((a) => a.tipo === valore).length
    case 'raggruppamento':
      return attivita.filter((a) => (a.raggruppamento ?? 'plenaria') === valore).length
    // Le settimane dell'anno aperto marcate con quel tipo.
    case 'tipoSettimana':
      return registro.anni.reduce(
        (somma, anno) =>
          somma + Object.values(anno.settimane ?? {}).filter((tipo) => tipo === valore).length,
        0,
      )
    case 'tipoValutazione':
      return (
        attivita.filter((a) => a.valutazione?.tipo === valore).length +
        registro.valutazioni.filter((m) => m.tipo === valore).length
      )
    // Le liste aperte finiscono in `parametri` sotto una chiave che dipende dal
    // tipo di attività: si contano i valori, così una lista nuova non chiede una
    // riga qui.
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
  // Si chiede: le voci scritte a mano per quella lista non si riavranno.
  const t = testi()
  const vai = await conferma({
    titolo: t.rimettereTitolo(etichetta),
    testo: t.rimettereTesto,
    testoConferma: t.rimetti,
    pericolo: true,
  })
  if (!vai) return
  const liste = { ...(stato.registro.impostazioni.liste ?? {}) }
  delete liste[chiave]
  void salvaImpostazioni({ liste })
}

/**
 * Il colore di una voce: selettore nativo che si salva su `change`, a scelta
 * fatta. Mostra il colore effettivo, anche quello di fabbrica se non è scritto.
 */
function campoColore (
  valore: string,
  etichetta: string,
  fuoco: string,
  alCambio: ((colore: string) => void) | null,
): HTMLElement {
  return h('input', {
    class: 'voce-lista__colore',
    type: 'color',
    value: valore,
    dataset: { fuoco },
    attr: { 'aria-label': etichetta, title: etichetta },
    onchange: alCambio
      ? (evento: Event) => alCambio((evento.target as HTMLInputElement).value)
      : undefined,
  })
}

/** La riga di una voce: si sposta, si rinomina, e — se la lista è aperta — si toglie. */
function rigaVoce (
  chiave: ChiaveLista,
  voci: VoceLista[],
  indice: number,
  aperta: boolean,
  colori: boolean,
): HTMLElement {
  const voce = voci[indice]
  const usi = quanteVolte(chiave, voce.valore)
  const t = testi()

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
        titolo: t.su,
        disabilitato: indice === 0,
        al: () => sposta(-1),
      }),
      pulsante({
        simbolo: 'giu',
        variante: 'fantasma',
        titolo: t.giu,
        disabilitato: indice === voci.length - 1,
        al: () => sposta(1),
      }),
    ),
    h('input', {
      class: 'campo__controllo voce-lista__testo',
      type: 'text',
      value: voce.testo,
      // Salvare rifà la pagina: la chiave di fuoco tiene il cursore qui.
      // testo-fisso: la chiave di fuoco, non si legge
      dataset: { fuoco: `lista-${chiave}-${voce.valore}` },
      attr: { 'aria-label': t.comeSiLegge },
      onchange: (evento: Event) => {
        const testo = (evento.target as HTMLInputElement).value.trim()
        const copia = voci.map((v, i) => (i === indice ? { ...v, testo: testo || v.valore } : v))
        salvaLista(chiave, copia)
      },
    }),
    // Il colore accanto alla parola.
    colori
      ? campoColore(
          coloreDiVoce(stato.registro.impostazioni, chiave, voce.valore),
          t.coloreDi(voce.testo),
          // testo-fisso: la chiave di fuoco, non si legge
          `lista-${chiave}-${voce.valore}-colore`,
          (colore) =>
            salvaLista(chiave, voci.map((v, i) => (i === indice ? { ...v, colore } : v))),
        )
      : null,
    // Il valore non si tocca mai, nemmeno nelle liste aperte: è quel che sta nei
    // piani già scritti. Si mostra perché distingue due voci chiamate uguale.
    h('code', { class: 'voce-lista__valore', attr: { title: t.valoreSalvato } }, voce.valore),
    h(
      'span',
      { class: 'voce-lista__usi' },
      usi > 0
        ? pastiglia(t.usata(usi), 'quiete')
        : pastiglia(t.maiUsata, 'neutro'),
    ),
    // La cella c'è sempre, anche senza cestino, per tenere le colonne allineate.
    aperta
      ? pulsante({
          simbolo: 'cestino',
          variante: 'fantasma',
          titolo: usi > 0 ? t.togliUsata : t.togli,
          al: () => salvaLista(chiave, voci.filter((_, i) => i !== indice)),
        })
      : h('span', { class: 'voce-lista__vuota', attr: { 'aria-hidden': 'true' } }),
  )
}

/**
 * Il valore di una voce nuova, ricavato da come si legge: minuscolo, senza
 * accenti, trattini al posto degli spazi, come gli altri valori del registro.
 */
function valoreDa (testo: string): string {
  return normalizzaTesto(testo).replace(/ +/g, '-')
}

/**
 * La riga per aggiungere una voce: l'ultima della tabella, con le stesse
 * colonne. Solo nelle liste a testo libero.
 */
function aggiuntaVoce (chiave: ChiaveLista, voci: VoceLista[], colori: boolean): HTMLElement {
  const t = testi()
  const campo = h('input', {
    class: 'campo__controllo voce-lista__nuova',
    type: 'text',
    placeholder: t.nuovaSegnaposto,
    // Dopo Invio la pagina si rifà: con la chiave il fuoco resta qui.
    // testo-fisso: la chiave di fuoco, non si legge
    dataset: { fuoco: `lista-nuova-${chiave}` },
    attr: { 'aria-label': t.nuovaEtichetta },
  })
  // Il valore che la voce avrà nel file, mentre la si scrive.
  const anteprima = h(
    'code',
    { class: 'voce-lista__valore', attr: { title: t.valoreCheSiSalvera } },
  )
  campo.addEventListener('input', () => {
    anteprima.textContent = valoreDa(campo.value)
  })
  // Il colore della voce nuova si sceglie prima di aggiungerla; parte dal grigio
  // dei valori sconosciuti.
  const colore = colori
    ? (campoColore(
        COLORE_DI_RIPIEGO,
        t.coloreNuova,
        // testo-fisso: la chiave di fuoco, non si legge
        `lista-nuova-${chiave}-colore`,
        null,
      ) as HTMLInputElement)
    : null

  const aggiungi = () => {
    const testo = campo.value.trim()
    if (!testo) return
    const base = valoreDa(testo)
    if (!base) return
    // Un valore già usato prende un numero in coda invece di sovrascrivere.
    const usati = new Set(voci.map((v) => v.valore))
    let valore = base
    let contatore = 2
    while (usati.has(valore)) valore = `${base}-${contatore++}`
    campo.value = ''
    salvaLista(chiave, [...voci, { valore, testo, ...(colore ? { colore: colore.value } : {}) }])
  }

  campo.addEventListener('keydown', (evento: KeyboardEvent) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    aggiungi()
  })

  return h(
    'li',
    { class: ['voce-lista', 'voce-lista--nuova'] },
    h('span', { class: 'voce-lista__segno', attr: { 'aria-hidden': 'true' } }, icona('piu', 'icona--minuta')),
    campo,
    colore,
    anteprima,
    h(
      'span',
      { class: 'voce-lista__aggiungi' },
      pulsante({ testo: parole().aggiungi, simbolo: 'piu', variante: 'sottile', al: aggiungi }),
    ),
  )
}

/**
 * I nomi delle colonne in cima alla tabella; dove si vede il colore lo spiega
 * la «i» (`suggerimento`), non un'avvertenza.
 */
function intestazioneVoci (colori: boolean): HTMLElement {
  const t = testi()
  return h(
    'li',
    { class: ['voce-lista', 'voce-lista--intestazione'] },
    h('span', null),
    h('span', null, t.colonnaVoce),
    colori
      ? h(
          'span',
          { class: 'voce-lista__titolo-colore' },
          parole().colore,
          suggerimento(t.colonnaColoreAiuto, { etichetta: parole().colore }),
        )
      : null,
    h('span', { class: 'voce-lista__titolo-valore' }, t.colonnaValore),
    h('span', null, t.colonnaUsi),
    h('span', null),
  )
}

/** La lista che si sta guardando: ricordo di questa scheda, fuori dallo stato. */
let listaScelta: ChiaveLista = CHIAVI_LISTA[0]

/** Una lista intera: il suo nome, dove si vede, e le voci. */
function bloccoLista (chiave: ChiaveLista): HTMLElement {
  const definizione = definizioneLista(chiave)
  const voci = vociDiLista(stato.registro.impostazioni, chiave)
  const cambiata = listaCambiata(stato.registro.impostazioni, chiave)
  const colori = listaConColore(chiave)
  const t = testi()

  return h(
    'section',
    { class: 'lista-sistema', attr: { 'aria-label': definizione.etichetta } },
    h(
      'header',
      { class: 'lista-sistema__testata' },
      h('h4', null, definizione.etichetta),
      definizione.aperta
        ? pastiglia(t.vociLibere, 'quiete')
        : pastiglia(t.vociFisse, 'neutro'),
      cambiata
        ? pulsante({
            testo: t.rimettiFabbrica,
            simbolo: 'ricarica',
            variante: 'sottile',
            al: () => azzeraLista(chiave, definizione.etichetta),
          })
        : null,
    ),
    // Dove si vede la lista, sotto il titolo.
    h(
      'p',
      { class: 'lista-sistema__dove testo-quieto' },
      h('strong', null, t.doveCompare),
      definizione.descrizione,
      '.',
    ),
    // Nelle liste chiuse si cambiano solo parola e ordine: lo si dice.
    definizione.aperta
      ? null
      : h(
          'p',
          { class: 'lista-sistema__vincolo testo-quieto' },
          icona('informazione', 'icona--minuta'),
          h('span', null, t.vincolo(colori)),
        ),
    // La colonna del colore solo nelle liste che lo dichiarano.
    h(
      'ul',
      { class: ['lista-sistema__voci', colori && 'lista-sistema__voci--con-colore'] },
      intestazioneVoci(colori),
      ...voci.map((_, indice) => rigaVoce(chiave, voci, indice, definizione.aperta, colori)),
      definizione.aperta ? aggiuntaVoce(chiave, voci, colori) : null,
    ),
  )
}

/** Le linguette, una per lista, con il numero di voci e un asterisco sulle cambiate. */
function linguetteListe (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  return h(
    'div',
    { class: 'liste-schede' },
    selettore<ChiaveLista>(
      listaScelta,
      CHIAVI_LISTA.map((chiave) => ({
        valore: chiave,
        testo:
          `${definizioneLista(chiave).etichetta} · ${vociDiLista(impostazioni, chiave).length}` +
          (listaCambiata(impostazioni, chiave) ? ' *' : ''),
      })),
      (scelta) => {
        listaScelta = scelta
        aggiorna({})
      },
      testi().listaDaModificare,
    ),
  )
}

/** La scheda intera: una lista alla volta, scelta da una fila di linguette. */
export function schedaListe (): Figlio {
  const t = testi()
  return scheda({
    titolo: t.titolo,
    // La spiegazione dietro la «i»: togliere una voce non fa danni (le tappe la tengono).
    aiuto: h('span', null, t.aiuto, t.aiutoDentro),
    contenuto: h(
      'div',
      { class: 'liste-sistema' },
      linguetteListe(),
      bloccoLista(listaScelta),
    ),
  })
}
