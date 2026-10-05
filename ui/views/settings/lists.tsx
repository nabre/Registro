// Le liste di sistema: che cosa c'è dentro i menu a tendina del registro.
// Impostazioni del documento: sono parole della scuola e viaggiano con il `.regi`.
// Si rinomina (o ritinge) una voce, la si sposta trascinandola dalla presa (o
// con ↑ ↓ sulla presa), e solo nelle liste a testo libero se ne aggiunge o
// toglie: nelle liste chiuse un valore inventato non farebbe niente (vedi
// `domain/lists.ts`). Si salva a ogni gesto: uno spostamento è un salvataggio,
// da dove parte a dove arriva.

import { useRef, useState, type ReactElement, type ReactNode } from 'react'

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
import { classi } from '#ui/classNames.js'
import { Pastiglia, Pulsante, Scheda, Selettore } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { Suggerimento } from '#ui/components/hint.js'
import { conferma } from '#ui/components/modal.js'
import { spostaVoce, useRiordino } from '#ui/forms/common.js'
import { Input } from '#ui/fields.js'
import { Isola } from '#ui/island.js'
import { ridisegnaIsola } from '#ui/islands.js'
import { stato } from '#ui/state.js'
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
): ReactElement {
  return (
    <Input
      className="voce-lista__colore"
      type="color"
      valore={valore}
      data-fuoco={fuoco}
      aria-label={etichetta}
      title={etichetta}
      onCambio={alCambio
        ? (evento) => alCambio((evento.target as HTMLInputElement).value)
        : undefined}
    />
  )
}

/** Come si riordinano le righe di una lista: lo dà `useRiordino`. */
type Riordina = ReturnType<typeof useRiordino>

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
): ReactElement {
  const voce = voci[indice]
  const usi = quanteVolte(chiave, voce.valore)
  const t = testi()

  // La voce si ritrova per valore, che non cambia mai: l'indice del disegno
  // può essere già scivolato.
  const cambia = (cambio: (v: VoceLista) => VoceLista): Promise<void> =>
    salvaLista(chiave, vociAttuali(chiave).map((v) => (v.valore === voce.valore ? cambio(v) : v)))

  const togli = async (): Promise<void> => {
    // Si conta di nuovo: fra il disegno e il clic può essere stata scelta.
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

  return (
    <li key={voce.valore} className="voce-lista" {...riordina.riga(indice)}>
      <div className="voce-lista__ordine">
        {/* La presa: si trascina, o ↑ ↓ quando ha il fuoco. Salvare rifà la pagina:
            la chiave di fuoco segue la voce, così il fuoco resta sulla sua presa. */}
        <Pulsante
          {...riordina.presa(indice)}
          simbolo="presa"
          variante="fantasma"
          classe="presa-riga"
          titolo={t.presaAiuto(voce.testo)}
          // testo-fisso: la chiave di fuoco, non si legge
          fuoco={`lista-${chiave}-${voce.valore}-presa`}
        />
      </div>
      <Input
        className="campo__controllo voce-lista__testo"
        type="text"
        valore={voce.testo}
        // Salvare rifà la pagina: la chiave di fuoco tiene il cursore qui.
        // testo-fisso: la chiave di fuoco, non si legge
        data-fuoco={`lista-${chiave}-${voce.valore}`}
        aria-label={t.comeSiLegge}
        onCambio={(evento) => {
          const vivo = evento.target as HTMLInputElement
          const testo = vivo.value.trim()
          // Svuotato, si legge come il valore. Se il valore è anche il testo di
          // adesso lo stato non cambia, e il campo resterebbe vuoto: lo si
          // rimette qui.
          if (!testo) vivo.value = voce.valore
          void cambia((v) => ({ ...v, testo: testo || v.valore }))
        }}
      />
      {/* Il colore accanto alla parola. */}
      {colori
        ? campoColore(
            coloreDiVoce(stato.registro.impostazioni, chiave, voce.valore),
            t.coloreDi(voce.testo),
            // testo-fisso: la chiave di fuoco, non si legge
            `lista-${chiave}-${voce.valore}-colore`,
            (colore) => void cambia((v) => ({ ...v, colore })),
          )
        : null}
      {/* Il valore non si tocca mai, nemmeno nelle liste aperte: è quel che sta nei
          piani già scritti. Si mostra perché distingue due voci chiamate uguale. */}
      <code className="voce-lista__valore" title={t.valoreSalvato}>{voce.valore}</code>
      <span className="voce-lista__usi">
        {usi > 0
          ? <Pastiglia testo={t.usata(usi)} tono="quiete" />
          : <Pastiglia testo={t.maiUsata} tono="neutro" />}
      </span>
      {/* La cella c'è sempre, anche senza cestino, per tenere le colonne allineate. */}
      {aperta
        ? (
            <Pulsante
              simbolo="cestino"
              variante="fantasma"
              titolo={usi > 0 ? t.togliUsata : t.togli}
              al={togli}
            />
          )
        : <span className="voce-lista__vuota" aria-hidden="true" />}
    </li>
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
function AggiuntaVoce ({ chiave, colori }: { chiave: ChiaveLista, colori: boolean }): ReactElement {
  const t = testi()
  const campo = useRef<HTMLInputElement | null>(null)
  const colore = useRef<HTMLInputElement | null>(null)
  // Il valore che la voce avrà nel file, mentre la si scrive.
  const [anteprima, impostaAnteprima] = useState('')

  const aggiungi = (): Promise<void> | undefined => {
    const vivo = campo.current
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
    const scelto = colore.current?.value
    vivo.value = ''
    // Il colore riparte dal grigio per la voce dopo: il valore dello stato è
    // sempre quello, e da sé il campo non tornerebbe.
    if (colore.current) colore.current.value = COLORE_DI_RIPIEGO
    impostaAnteprima('')
    return salvaLista(chiave, [
      ...voci,
      { valore, testo, ...(scelto ? { colore: scelto } : {}) },
    ])
  }

  return (
    <li className="voce-lista voce-lista--nuova">
      <span className="voce-lista__segno" aria-hidden="true"><Icona nome="piu" classe="icona--minuta" /></span>
      <input
        ref={campo}
        className="campo__controllo voce-lista__nuova"
        type="text"
        placeholder={t.nuovaSegnaposto}
        // Dopo Invio la pagina si rifà: con la chiave il fuoco resta qui.
        // testo-fisso: la chiave di fuoco, non si legge
        data-fuoco={`lista-nuova-${chiave}`}
        aria-label={t.nuovaEtichetta}
        onInput={(evento) => impostaAnteprima(valoreDa(evento.currentTarget.value))}
        onKeyDown={(evento) => {
          if (evento.key !== 'Enter') return
          evento.preventDefault()
          void aggiungi()
        }}
      />
      {/* Il colore della voce nuova si sceglie prima di aggiungerla; parte dal grigio
          dei valori sconosciuti. */}
      {colori
        ? (
            <Input
              ref={colore}
              className="voce-lista__colore"
              type="color"
              valore={COLORE_DI_RIPIEGO}
              // testo-fisso: la chiave di fuoco, non si legge
              data-fuoco={`lista-nuova-${chiave}-colore`}
              aria-label={t.coloreNuova}
              title={t.coloreNuova}
            />
          )
        : null}
      <code className="voce-lista__valore" title={t.valoreCheSiSalvera}>{anteprima}</code>
      <span className="voce-lista__aggiungi">
        <Pulsante testo={parole().aggiungi} simbolo="piu" variante="sottile" al={() => aggiungi()} />
      </span>
    </li>
  )
}

/**
 * I nomi delle colonne in cima alla tabella; dove si vede il colore lo spiega
 * la «i» (`Suggerimento`), non un'avvertenza.
 */
function intestazioneVoci (colori: boolean): ReactElement {
  const t = testi()
  return (
    <li className="voce-lista voce-lista--intestazione">
      <span />
      <span>{t.colonnaVoce}</span>
      {colori
        ? (
            <span className="voce-lista__titolo-colore">
              {parole().colore}
              <Suggerimento testo={t.colonnaColoreAiuto} etichetta={parole().colore} />
            </span>
          )
        : null}
      <span className="voce-lista__titolo-valore">{t.colonnaValore}</span>
      <span>{t.colonnaUsi}</span>
      <span />
    </li>
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
function BloccoLista ({ chiave }: { chiave: ChiaveLista }): ReactElement {
  const definizione = definizioneLista(chiave)
  const voci = vociDiLista(stato.registro.impostazioni, chiave)
  const cambiata = listaCambiata(stato.registro.impostazioni, chiave)
  const colori = listaConColore(chiave)
  const t = testi()
  // Senza `elenco`: in questa tabella la prima riga è l'intestazione, e il fuoco
  // dopo uno spostamento lo rimette la chiave di fuoco della presa, che segue la voce.
  const riordina = useRiordino((da, a) => spostaNellaLista(chiave, voci, da, a))

  return (
    <section className="lista-sistema" aria-label={definizione.etichetta}>
      <header className="lista-sistema__testata">
        <h4>{definizione.etichetta}</h4>
        {definizione.aperta
          ? <Pastiglia testo={t.vociLibere} tono="quiete" />
          : <Pastiglia testo={t.vociFisse} tono="neutro" />}
        {cambiata
          ? (
              <Pulsante
                testo={t.rimettiFabbrica}
                simbolo="ricarica"
                variante="sottile"
                al={() => azzeraLista(chiave, definizione.etichetta)}
              />
            )
          : null}
      </header>
      {/* Dove si vede la lista, sotto il titolo. */}
      <p className="lista-sistema__dove testo-quieto">
        <strong>{t.doveCompare}</strong>
        {definizione.descrizione}
        {'.'}
      </p>
      {/* Nelle liste chiuse si cambiano solo parola e ordine: lo si dice. */}
      {definizione.aperta
        ? null
        : (
            <p className="lista-sistema__vincolo testo-quieto">
              <Icona nome="informazione" classe="icona--minuta" />
              <span>{t.vincolo(colori)}</span>
            </p>
          )}
      {/* La colonna del colore solo nelle liste che lo dichiarano. */}
      <ul className={classi('lista-sistema__voci', colori && 'lista-sistema__voci--con-colore')}>
        {intestazioneVoci(colori)}
        {voci.map((_, indice) => rigaVoce(chiave, voci, indice, definizione.aperta, colori, riordina))}
        {definizione.aperta ? <AggiuntaVoce key={`nuova:${chiave}`} chiave={chiave} colori={colori} /> : null}
      </ul>
    </section>
  )
}

/** Le linguette, una per lista, con il numero di voci e un asterisco sulle cambiate. */
function linguetteListe (): ReactElement {
  const impostazioni = stato.registro.impostazioni
  return (
    <div className="liste-schede">
      <Selettore<ChiaveLista>
        valore={listaScelta}
        voci={LISTE_DELLA_DIDATTICA.map((chiave) => ({
          valore: chiave,
          testo:
            `${definizioneLista(chiave).etichetta} · ${vociDiLista(impostazioni, chiave).length}` +
            (listaCambiata(impostazioni, chiave) ? ' *' : ''),
        }))}
        al={(scelta) => {
          listaScelta = scelta
          // Una scelta della pagina, non dello stato: si rifà solo la scheda.
          ridisegnaIsola(ISOLA)
        }}
        etichetta={testi().listaDaModificare}
      />
    </div>
  )
}

/** La lista dei tipi di settimana da sola, sotto la griglia delle settimane. */
export function listaTipiSettimana (): ReactElement {
  return <div className="liste-sistema"><BloccoLista chiave={LISTA_DELLE_SETTIMANE} /></div>
}

/** La scheda intera: una lista alla volta, scelta da una fila di linguette. */
export function schedaListe (): ReactNode {
  const t = testi()
  return (
    // La spiegazione dietro la «i»: togliere una voce non fa danni (le tappe la tengono).
    <Scheda titolo={t.titolo} aiuto={<span>{t.aiuto}{t.aiutoDentro}</span>}>
      <Isola
        chiave={ISOLA}
        className="liste-sistema"
        disegna={() => (
          <>
            {linguetteListe()}
            {/* Una lista per chiave: cambiando linguetta non si porta dietro i campi dell'altra. */}
            <BloccoLista key={listaScelta} chiave={listaScelta} />
          </>
        )}
      />
    </Scheda>
  )
}
