// Le liste di sistema: che cosa c'è dentro i menu a tendina del registro.
// Impostazioni del documento: sono parole della scuola e viaggiano con il `.regi`.
// Si rinomina (o ritinge) una voce, la si sposta trascinandola dalla presa (o
// con ↑ ↓ sulla presa), e solo nelle liste a testo libero se ne aggiunge o
// toglie: nelle liste chiuse un valore inventato non farebbe niente (vedi
// `domain/lists.ts`). Si salva a ogni gesto: uno spostamento è un salvataggio,
// da dove parte a dove arriva.

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
} from '#core/dominio/lists.js'
import { normalizzaTesto } from '#core/dominio/text.js'
import { pastiglia, pulsante, scheda, selettore } from '#ui/pannello/components/base.js'
import { icona } from '#ui/pannello/components/icons.js'
import { suggerimento } from '#ui/pannello/components/hint.js'
import { gestisci, h, type Figlio } from '#ui/pannello/dom.js'
import { conferma } from '#ui/pannello/components/modal.js'
import { presaDiRiga, riordinatore, spostaVoce } from '#ui/pannello/forms/common.js'
import { isola, ridisegnaIsola } from '#ui/pannello/islands.js'
import { stato } from '#ui/pannello/state.js'
import { parole } from '#core/dominio/words.testi.js'
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

/**
 * Scrive una lista intera, lasciando le altre come stanno. Torna la promessa
 * perché il pulsante resti spento finché la scrittura non è tornata.
 */
function salvaLista (chiave: ChiaveLista, voci: VoceLista[]): Promise<void> {
  return salvaImpostazioni({
    liste: { ...(stato.registro.impostazioni.liste ?? {}), [chiave]: voci },
  })
}

/**
 * Le voci come sono adesso nel registro, lette al momento del gesto: quelle
 * del ridisegno sarebbero vecchie se un'altra modifica è appena tornata, e due
 * gesti rapidi si annullerebbero a vicenda.
 */
function vociAttuali (chiave: ChiaveLista): VoceLista[] {
  return vociDiLista(stato.registro.impostazioni, chiave)
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
  await salvaImpostazioni({ liste })
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

/** Come si riordinano le righe di una lista: lo dà `riordinatore`. */
type Riordina = ReturnType<typeof riordinatore>

/**
 * Porta la voce che sta in `da` in `a` e salva, in un gesto solo. Le voci sono
 * quelle di adesso: `da` e `a` vengono dal disegno, e si ritrovano per valore.
 */
function spostaNellaLista (chiave: ChiaveLista, voci: VoceLista[], da: number, a: number): void {
  const attuali = vociAttuali(chiave)
  const partita = voci[da]
  const arrivo = voci[a]
  if (!partita || !arrivo) return
  const daOra = attuali.findIndex((v) => v.valore === partita.valore)
  const aOra = attuali.findIndex((v) => v.valore === arrivo.valore)
  if (daOra < 0 || aOra < 0 || daOra === aOra) return
  void salvaLista(chiave, spostaVoce(attuali, daOra, aOra))
}

/** La riga di una voce: si sposta, si rinomina, e — se la lista è aperta — si toglie. */
function rigaVoce (
  chiave: ChiaveLista,
  voci: VoceLista[],
  indice: number,
  aperta: boolean,
  colori: boolean,
  riordina: Riordina,
): HTMLElement {
  const voce = voci[indice]
  const usi = quanteVolte(chiave, voce.valore)
  const t = testi()

  // La voce si ritrova per valore, che non cambia mai: l'indice del ridisegno
  // può essere già scivolato.
  const cambia = (cambio: (v: VoceLista) => VoceLista): Promise<void> =>
    salvaLista(chiave, vociAttuali(chiave).map((v) => (v.valore === voce.valore ? cambio(v) : v)))

  const togli = async (): Promise<void> => {
    // Si conta di nuovo: fra il ridisegno e il clic può essere stata scelta.
    const volte = quanteVolte(chiave, voce.valore)
    if (volte > 0) {
      const vai = await conferma({
        titolo: t.togliereTitolo(voce.testo),
        testo: t.togliereTesto(volte),
        testoConferma: t.togli,
        pericolo: true,
      })
      if (!vai) return
    }
    await salvaLista(chiave, vociAttuali(chiave).filter((v) => v.valore !== voce.valore))
  }

  // La presa: si trascina, o ↑ ↓ quando ha il fuoco. Salvare rifà la pagina:
  // la chiave di fuoco segue la voce, così il fuoco resta sulla sua presa.
  const presa = presaDiRiga()
  presa.title = t.presaAiuto(voce.testo)
  presa.setAttribute('aria-label', t.presaAiuto(voce.testo))
  // testo-fisso: la chiave di fuoco, non si legge
  presa.dataset.fuoco = `lista-${chiave}-${voce.valore}-presa`

  const riga = h(
    'li',
    { class: 'voce-lista' },
    h('div', { class: 'voce-lista__ordine' }, presa),
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
        void cambia((v) => ({ ...v, testo: testo || v.valore }))
      },
    }),
    // Il colore accanto alla parola.
    colori
      ? campoColore(
          coloreDiVoce(stato.registro.impostazioni, chiave, voce.valore),
          t.coloreDi(voce.testo),
          // testo-fisso: la chiave di fuoco, non si legge
          `lista-${chiave}-${voce.valore}-colore`,
          (colore) => void cambia((v) => ({ ...v, colore })),
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
          al: togli,
        })
      : h('span', { class: 'voce-lista__vuota', attr: { 'aria-hidden': 'true' } }),
  )
  riordina(riga, presa, indice)
  return riga
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
function aggiuntaVoce (chiave: ChiaveLista, colori: boolean): HTMLElement {
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
  // I gestori prendono il campo vivo dall'evento: `campo` e `anteprima` sono
  // quelli di questo disegno, e un ridisegno può averli scartati tenendo i vecchi.
  gestisci(campo, 'input', (evento) => {
    const vivo = evento.currentTarget as HTMLInputElement
    const valore = vivo.parentElement?.querySelector('.voce-lista__valore')
    if (valore) valore.textContent = valoreDa(vivo.value)
  })
  // Il colore della voce nuova si sceglie prima di aggiungerla; parte dal grigio
  // dei valori sconosciuti.
  const colore = colori
    ? campoColore(
        COLORE_DI_RIPIEGO,
        t.coloreNuova,
        // testo-fisso: la chiave di fuoco, non si legge
        `lista-nuova-${chiave}-colore`,
        null,
      )
    : null

  const aggiungi = (vivo: HTMLInputElement | null | undefined): Promise<void> | undefined => {
    if (!vivo) return
    const testo = vivo.value.trim()
    if (!testo) return
    const base = valoreDa(testo)
    if (!base) return
    const voci = vociAttuali(chiave)
    // Un valore già usato prende un numero in coda invece di sovrascrivere.
    const usati = new Set(voci.map((v) => v.valore))
    let valore = base
    let contatore = 2
    while (usati.has(valore)) valore = `${base}-${contatore++}`
    const scelto = vivo.parentElement?.querySelector<HTMLInputElement>('input[type=color]')
    vivo.value = ''
    return salvaLista(chiave, [
      ...voci,
      { valore, testo, ...(scelto ? { colore: scelto.value } : {}) },
    ])
  }

  gestisci(campo, 'keydown', (evento) => {
    if (evento.key !== 'Enter') return
    evento.preventDefault()
    void aggiungi(evento.currentTarget as HTMLInputElement)
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
      pulsante({
        testo: parole().aggiungi,
        simbolo: 'piu',
        variante: 'sottile',
        al: (evento) => aggiungi(
          (evento.currentTarget as HTMLElement).closest('li')
            ?.querySelector<HTMLInputElement>('.voce-lista__nuova'),
        ),
      }),
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

/** Linguette e lista aperta: cambiando linguetta si rifanno loro sole. */
const ISOLA = 'liste-sistema'

/**
 * I tipi di settimana stanno con le settimane che marcano (Calendario ›
 * Settimane): le linguette della Didattica mostrano le altre liste.
 */
const LISTA_DELLE_SETTIMANE: ChiaveLista = 'tipoSettimana'
const LISTE_DELLA_DIDATTICA = CHIAVI_LISTA.filter((chiave) => chiave !== LISTA_DELLE_SETTIMANE)

/** Una lista intera: il suo nome, dove si vede, e le voci. */
function bloccoLista (chiave: ChiaveLista): HTMLElement {
  const definizione = definizioneLista(chiave)
  const voci = vociDiLista(stato.registro.impostazioni, chiave)
  const cambiata = listaCambiata(stato.registro.impostazioni, chiave)
  const colori = listaConColore(chiave)
  const t = testi()

  // L'elenco nasce prima delle righe: il riordinatore vuole il contenitore, le
  // righe vogliono il riordinatore.
  const elenco = h('ul', {
    class: ['lista-sistema__voci', colori && 'lista-sistema__voci--con-colore'],
  })
  const riordina = riordinatore(elenco, (da, a) => spostaNellaLista(chiave, voci, da, a))
  elenco.append(
    intestazioneVoci(colori),
    ...voci.map((_, indice) => rigaVoce(chiave, voci, indice, definizione.aperta, colori, riordina)),
  )
  if (definizione.aperta) elenco.append(aggiuntaVoce(chiave, colori))

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
    elenco,
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
      LISTE_DELLA_DIDATTICA.map((chiave) => ({
        valore: chiave,
        testo:
          `${definizioneLista(chiave).etichetta} · ${vociDiLista(impostazioni, chiave).length}` +
          (listaCambiata(impostazioni, chiave) ? ' *' : ''),
      })),
      (scelta) => {
        listaScelta = scelta
        // Una scelta della pagina, non dello stato: si rifà solo la scheda.
        ridisegnaIsola(ISOLA)
      },
      testi().listaDaModificare,
    ),
  )
}

/** La lista dei tipi di settimana da sola, sotto la griglia delle settimane. */
export function listaTipiSettimana (): HTMLElement {
  return h('div', { class: 'liste-sistema' }, bloccoLista(LISTA_DELLE_SETTIMANE))
}

/** La scheda intera: una lista alla volta, scelta da una fila di linguette. */
export function schedaListe (): Figlio {
  const t = testi()
  return scheda({
    titolo: t.titolo,
    // La spiegazione dietro la «i»: togliere una voce non fa danni (le tappe la tengono).
    aiuto: h('span', null, t.aiuto, t.aiutoDentro),
    contenuto: isola(
      ISOLA,
      () => [linguetteListe(), bloccoLista(listaScelta)],
      { class: 'liste-sistema' },
    ),
  })
}
