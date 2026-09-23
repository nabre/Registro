// La mappa: dove abita e dove lavora la gente che si ha in classe.
//
// Risponde a domande che nessun elenco risponde. Tre visite in azienda in un
// pomeriggio si mettono in fila solo vedendole sulla carta. Un ritardo
// ricorrente alla prima ora si spiega da sé quando si vede da dove arriva quella
// persona. E un corso di recupero il giovedì sera lo si propone a chi sta a
// venti minuti, non a chi ne fa cinquanta di treno.
//
// La mappa è fatta di tre cose, e conviene tenerle distinte leggendo:
//
//   i **tasselli**, cioè le immagini delle strade, che arrivano da
//   OpenStreetMap passando dall'host — `registro://mappa/<z>/<x>/<y>.png`,
//   vedi `shell/protocol/tiles.ts`. La pagina non chiama fuori, come ogni altra
//   pagina del registro;
//
//   i **segnaposti**, che il dominio calcola da solo — `segniDellaMappa` — e
//   che la vista si limita a posizionare;
//
//   l'**inquadratura**: dove si sta guardando e quanto si è ingranditi. Vive
//   qui, in una variabile di modulo, e non nello stato dell'interfaccia: si
//   muove sotto le dita a sessanta fotogrammi al secondo, e farne passare
//   ognuno per `aggiorna()` vorrebbe dire ridisegnare l'intero pannello
//   trascinando la mappa.
//
// Per lo stesso motivo il trascinamento non ridisegna la vista: sposta i
// tasselli e i segnaposti dentro il riquadro, e basta. La vista si rifà quando
// cambia il registro — o un filtro — che è quel che il resto del pannello fa
// già.

import { PIF, del, quanti } from '../../domain/lexicon.js'
import {
  NOMI_GENERE,
  SEDE,
  contiDellaMappa,
  distanzaKm,
  indirizziDaRisolvere,
  indirizziUsati,
  rubricaDi,
  scriviDistanza,
  segniDellaMappa,
  type Coordinate,
  type Inquadratura,
  type Rubrica,
  type SegnoMappa,
  type StratiMappa,
  type UsoIndirizzo,
} from '../../domain/map.js'
import type { Classe } from '../../domain/models.js'
import {
  pastiglia,
  pulsante,
  selettore,
  statoVuoto,
  testataVista,
} from '../components/base.js'
import { statoVuotoAnno } from '../components/filters.js'
import { icona, type NomeIcona } from '../components/icons.js'
import { riquadroMappa, type Riquadro } from '../components/map.js'
import { h, type Figlio } from '../dom.js'
import { moduloAvvio } from '../forms.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  stato,
  type SchedaMappa,
} from '../state.js'

/**
 * Dove si stava guardando, e che cartellino era aperto.
 *
 * Il riquadro tiene il suo stato per conto suo — è un componente, e due mappe
 * nella stessa pagina non devono spostarsi a vicenda — ma la *pagina* si
 * ricostruisce a ogni salvataggio e a ogni battito dell'orologio, e con lei il
 * riquadro. Queste tre righe sono quel che sopravvive: senza, la mappa tornerebbe
 * al punto di partenza ogni minuto.
 */
let inquadratura: Inquadratura | null = null

/** Il segnaposto aperto, con il suo cartellino. */
let apertoId: string | null = null

/** Il riquadro vivo: lo comandano i gesti dell'elenco e i comandi della barra. */
let riquadro: Riquadro | null = null

// ------------------------------------------------------------------ i dati

/**
 * Le classi che la mappa guarda: tutte quelle dell'anno.
 *
 * Qui c'era una tendina per restringere a una classe, e non serviva a niente
 * che la pagina non facesse già meglio: la domanda della mappa è «chi viene da
 * dove», e la risposta si legge guardando tutti insieme — il colore dice già di
 * quale classe è ogni casa. Un filtro che nasconde due terzi dei punti
 * nascondeva anche gli indirizzi in comune, che sono quasi sempre fra classi
 * diverse: quattro tirocinanti nella stessa ditta, uno per anno.
 */
function classiDellaMappa (): Classe[] {
  return classiDellAnno().filter((c) => !c.archiviata)
}

/**
 * Quali generi di punto disegnare: lo dice la scheda aperta, e nient'altro.
 *
 * La sede è accesa sempre: non è uno dei posti di cui si parla, è il metro con
 * cui si leggono gli altri — spegnerla vorrebbe dire una mappa di distanze
 * senza l'origine.
 */
function strati (): StratiMappa {
  return {
    domicili: stato.schedaMappa !== 'lavoro',
    lavori: stato.schedaMappa !== 'domicilio',
    sede: true,
  }
}

/** Gli usi che la scheda aperta lascia vedere. */
function generiVisti (usi: UsoIndirizzo[]): UsoIndirizzo[] {
  if (stato.schedaMappa === 'tutti') return usi
  return usi.filter((uso) => uso.genere === stato.schedaMappa)
}

/** La rubrica degli indirizzi collocati, letta dal registro di adesso. */
function rubrica (): Rubrica {
  return rubricaDi(stato.registro)
}

/**
 * Il cartellino che si apre sopra un segnaposto: che indirizzo è, e chi ci sta.
 *
 * Tutti quelli che ci stanno, uno per riga, e non solo il primo: è il punto
 * della raccolta per indirizzo. Su un capannone si legge in un colpo chi sono i
 * sei tirocinanti di quella ditta — con la loro classe — e da ognuno si va alla
 * sua scheda.
 */
function cartellino (segno: SegnoMappa): HTMLElement {
  return h(
    'div',
    { class: 'mappa__cartellino' },
    h('strong', { class: 'mappa__cartellino-titolo' }, segno.titolo),
    segno.sottotitolo ? h('span', { class: 'mappa__cartellino-riga' }, segno.sottotitolo) : null,
    h('span', { class: 'mappa__cartellino-riga' }, segno.indirizzo),
    h(
      'span',
      { class: 'mappa__cartellino-riga' },
      segno.genere === 'sede'
        ? 'Il punto rispetto a cui si leggono le distanze'
        : `${scriviDistanza(segno.distanzaKm)} dalla sede, in linea d’aria`,
    ),
    segno.usi.length > 0
      ? h(
          'ul',
          { class: 'mappa__cartellino-chi' },
          ...righeDelPunto(segno.usi).map((uso) =>
            h(
              'li',
              null,
              icona(uso.genere === 'lavoro' ? 'azienda' : 'casa'),
              h(
                'button',
                {
                  class: 'collegamento',
                  type: 'button',
                  onclick: () =>
                    aggiorna({
                      vista: 'allievo',
                      classeId: uso.classeId,
                      allievoId: uso.allievoId,
                    }),
                },
                uso.chi,
              ),
              h('small', null, uso.classe),
            ),
          ),
        )
      : null,
  )
}

/**
 * Le righe di un cartellino, in ordine di lettura: prima chi ci abita, poi chi
 * ci lavora, e dentro ognuno dei due in ordine alfabetico.
 *
 * Una persona che a quell'indirizzo abita *e* lavora compare due volte, ed è
 * giusto: sono due fatti diversi su di lei, e fonderli nasconderebbe quello meno
 * ovvio dei due.
 */
function righeDelPunto (usi: UsoIndirizzo[]): UsoIndirizzo[] {
  return [...usi].sort(
    (a, b) =>
      Number(a.genere === 'lavoro') - Number(b.genere === 'lavoro') ||
      a.chi.localeCompare(b.chi, 'it'),
  )
}

/**
 * Il punto su cui la mappa deve portarsi appena si apre.
 *
 * Lo scrive chi arriva da fuori — la scheda di una persona, con «Sulla mappa» —
 * e lo consuma il primo disegno. Una variabile e non un campo dello stato
 * perché è un gesto, non una condizione: vale una volta, e non deve
 * ripresentarsi al ridisegno dopo.
 */
let daPortare: string | null = null

/**
 * Apre la mappa su un indirizzo, con il suo cartellino già aperto.
 *
 * La chiama la scheda personale. Non porta con sé nessun filtro — non ce ne
 * sono più — e la mappa si porta sul punto: in mezzo a tutti gli altri, che è
 * il modo in cui si vede se quella persona è sola lassù o se ha tre compagni
 * nella stessa valle.
 */
export function mostraSullaMappa (chiaveIndirizzo: string): void {
  daPortare = `ind:${chiaveIndirizzo}`
  apertoId = daPortare
  aggiorna({ vista: 'mappa' })
}

/** Porta la mappa su un punto, e ci apre sopra il cartellino. */
function vaiA (punto: Coordinate, zoomMinimo = 15): void {
  riquadro?.vaiA(punto, zoomMinimo)
}

// ------------------------------------------------------------------ la vista

/**
 * La colonna di sinistra: gli indirizzi che la scheda aperta lascia vedere.
 *
 * Sta a sinistra e la carta a destra, come una legenda accanto a una tavola: si
 * legge una riga, si guarda dove cade. Prima l'elenco stava sotto la mappa, e
 * per passare da un nome al suo segnaposto bisognava scorrere su e giù — cioè
 * perdere di vista proprio la cosa che si stava cercando.
 *
 * Le tre schede comandano insieme l'elenco e i segnaposti, e sono i tre modi in
 * cui questa pagina viene aperta: **Tutti** per guardare la classe intera,
 * **Posto di lavoro** quando si mettono in fila le visite in azienda,
 * **Domicilio** quando la domanda è da dove arriva la gente.
 */
function colonna (classi: Classe[]): Figlio {
  const schede: Array<{ valore: SchedaMappa; testo: string; simbolo: NomeIcona }> = [
    { valore: 'tutti', testo: 'Tutti', simbolo: 'segnaposto' },
    { valore: 'lavoro', testo: NOMI_GENERE.lavoro, simbolo: 'azienda' },
    { valore: 'domicilio', testo: NOMI_GENERE.domicilio, simbolo: 'casa' },
  ]

  return h(
    'aside',
    { class: 'mappa__colonna' },
    h(
      'header',
      { class: 'mappa__colonna-testata' },
      selettore(stato.schedaMappa, schede, (scelta) => {
        // Il cartellino aperto parla di un punto che la scheda nuova può non
        // mostrare più: si chiude, invece di restare appeso a un segnaposto
        // sparito.
        apertoId = null
        aggiorna({ schedaMappa: scelta })
      }),
    ),
    elencoIndirizzi(classi),
  )
}

/**
 * Gli indirizzi, e dove cadono.
 *
 * Prima quelli che non cadono da nessuna parte: sono l'unica cosa su cui si
 * agisce, e in fondo alla lista nessuno li vedrebbe. Poi quelli caduti sul
 * paese, che valgono a metà. Il resto in ordine di distanza dalla sede — è
 * l'ordine in cui la lista risponde a qualcosa: chi ha il viaggio più lungo,
 * quale azienda è dall'altra parte del Cantone.
 *
 * Una riga è un indirizzo e non una persona, e sotto ci stanno i nomi di tutti
 * quelli che ci stanno: da ognuno si va alla sua scheda.
 */
function elencoIndirizzi (classi: Classe[]): Figlio {
  const voci = indirizziUsati(classi, rubrica())
    .map((voce) => ({ voce, usi: generiVisti(voce.usi) }))
    .filter((riga) => riga.usi.length > 0)

  if (voci.length === 0) {
    return h(
      'p',
      { class: 'mappa__colonna-vuota' },
      stato.schedaMappa === 'lavoro'
        ? 'Nessun posto di lavoro scritto in anagrafica.'
        : stato.schedaMappa === 'domicilio'
          ? 'Nessun domicilio scritto in anagrafica.'
          : 'Nessun indirizzo scritto in anagrafica.',
    )
  }

  const ordinate = voci.sort(
    (a, b) =>
      Number(Boolean(a.voce.punto)) - Number(Boolean(b.voce.punto)) ||
      Number(!a.voce.punto?.approssimato) - Number(!b.voce.punto?.approssimato) ||
      (b.voce.punto ? distanzaKm(b.voce.punto, SEDE) : 0) -
        (a.voce.punto ? distanzaKm(a.voce.punto, SEDE) : 0),
  )

  return h(
    'ul',
    { class: 'mappa__voci', dataset: { scorrimento: 'mappa:voci' } },
    ...ordinate.map(({ voce, usi }) => {
      const persone = new Set(usi.map((uso) => uso.allievoId)).size
      const aziende = [
        ...new Set(usi.filter((uso) => uso.azienda).map((uso) => uso.azienda as string)),
      ]
      return h(
        'li',
        null,
        h(
          'div',
          {
            class: [
              'mappa__voce',
              'mappa__voce--indirizzo',
              apertoId === `ind:${voce.chiave}` && 'mappa__voce--attiva',
            ],
          },
          h(
            'button',
            {
              class: 'mappa__voce-apri',
              type: 'button',
              disabled: !voce.punto,
              attr: {
                title: voce.punto
                  ? 'Porta la mappa su questo indirizzo'
                  : 'Senza coordinate non c’è un punto su cui andare',
              },
              onclick: () => {
                if (!voce.punto) return
                apertoId = `ind:${voce.chiave}`
                vaiA(voce.punto)
              },
            },
            // Il nome dell'azienda in testa quando c'è: di un posto di lavoro
            // si cerca la ditta, e la via viene dopo.
            h('strong', null, aziende.join(' · ') || voce.indirizzo),
            h('small', null, aziende.length > 0 ? voce.indirizzo : descriviUsi(usi)),
          ),
          h(
            'span',
            { class: 'mappa__voce-stato' },
            persone > 1
              ? pastiglia(
                  usi.every((uso) => uso.genere === 'lavoro')
                    ? `${persone} in tirocinio`
                    : `${persone} persone`,
                  'informativo',
                  'classi',
                )
              : null,
            voce.punto?.approssimato ? pastiglia('solo il paese', 'attenzione') : null,
            voce.punto
              ? pastiglia(scriviDistanza(distanzaKm(voce.punto, SEDE)), 'quiete', 'segnaposto')
              : pulsante({
                  testo: 'Trova',
                  variante: 'sottile',
                  simbolo: 'segnaposto',
                  al: () =>
                    azione({
                      tipo: 'mappa.geocodifica',
                      classeIds: [usi[0].classeId],
                      allievoId: usi[0].allievoId,
                    }),
                }),
          ),
          // I nomi, ognuno con il segno del suo titolo: casa o lavoro. Nella
          // scheda «Tutti» un indirizzo può averli tutti e due, e la differenza
          // va vista senza aprire il cartellino.
          h(
            'span',
            { class: 'mappa__voce-persone' },
            ...righeDelPunto(usi).map((uso) =>
              h(
                'button',
                {
                  class: 'collegamento',
                  type: 'button',
                  attr: {
                    title: `${uso.chi} — ${uso.genere === 'lavoro' ? 'ci lavora' : 'ci abita'} · ${uso.classe}`,
                  },
                  onclick: () =>
                    aggiorna({
                      vista: 'allievo',
                      classeId: uso.classeId,
                      allievoId: uso.allievoId,
                    }),
                },
                icona(uso.genere === 'lavoro' ? 'azienda' : 'casa'),
                uso.chi,
              ),
            ),
          ),
        ),
      )
    }),
  )
}

/** I nomi di chi sta a un indirizzo, accorciati quando sono troppi da leggere. */
function nomiDegliUsi (usi: UsoIndirizzo[]): string {
  const nomi = [...new Set(usi.map((uso) => uso.chi))]
  if (nomi.length <= 2) return nomi.join(' · ')
  return `${nomi[0]} e altri ${nomi.length - 1}`
}

/** A che titolo si sta a un indirizzo: chi ci sta, e se è casa o lavoro. */
function descriviUsi (usi: UsoIndirizzo[]): string {
  const generi = new Set(usi.map((uso) => uso.genere))
  const che =
    generi.size > 1
      ? 'domicilio e posto di lavoro'
      : generi.has('lavoro')
        ? usi.find((uso) => uso.azienda)?.azienda ?? 'posto di lavoro'
        : 'domicilio'
  return `${nomiDegliUsi(usi)} · ${che}`
}

/**
 * Il riquadro della pagina: il componente, con quel che la pagina gli aggiunge.
 *
 * Il cartellino lo compone qui perché è qui che si sa che cosa serve leggerci:
 * tutti quelli che stanno a quell'indirizzo, con la loro classe, e da ognuno la
 * strada per la sua scheda. La mappa piccola della scheda personale ne vuole
 * uno molto più corto — vedi `views/student.ts`.
 */
function telaDellaPagina (): HTMLElement {
  const vivo = riquadroMappa({
    segni: () => segniDellaMappa(classiDellaMappa(), strati(), rubrica()),
    cartellino,
    inquadratura,
    aperto: apertoId,
    alloSpostamento: (dove) => {
      inquadratura = dove
    },
    allApertura: (id) => {
      apertoId = id
    },
  })
  riquadro = vivo

  // Chi è arrivato qui da una scheda ha chiesto un punto: la richiesta vale una
  // volta sola, e la si consuma appena il riquadro è in piedi.
  if (daPortare) {
    const cercato = daPortare
    daPortare = null
    const segno = segniDellaMappa(classiDellaMappa(), strati(), rubrica()).find(
      (s) => s.id === cercato,
    )
    if (segno) {
      vivo.apri(cercato)
      vivo.vaiA(segno)
    }
  }

  return vivo.elemento
}

export function vistaMappa (): Figlio {
  if (!annoCorrente()) {
    return h(
      'div',
      null,
      testataVista({ titolo: 'Mappa' }),
      statoVuotoAnno({
        simbolo: 'mappa',
        testo: 'La mappa disegna gli indirizzi delle classi di un anno scolastico.',
        avvia: () => moduloAvvio(),
      }),
    )
  }

  const classi = classiDellaMappa()
  const elenchi = rubrica()
  const segni = segniDellaMappa(classi, strati(), elenchi)
  const numeri = contiDellaMappa(classi, elenchi)
  const daTrovare = numeri.scritti - numeri.collocati

  const testata = testataVista({
    compatta: true,
    titolo: 'Mappa',
    sottotitolo:
      numeri.scritti === 0
        ? 'Nessun indirizzo scritto nell’anagrafica'
        : `${numeri.collocati} ${numeri.collocati === 1 ? 'indirizzo' : 'indirizzi'} su ${numeri.scritti} sulla mappa` +
          (numeri.condivisi > 0
            ? ` · ${numeri.condivisi} in comune`
            : '') +
          (numeri.senzaIndirizzo > 0
            ? ` · ${quanti(numeri.senzaIndirizzo, PIF)} senza indirizzo`
            : ''),
  })

  if (segni.filter((s) => s.genere !== 'sede').length === 0) {
    return h(
      'div',
      { class: 'mappa' },
      testata,
      statoVuoto({
        simbolo: 'segnaposto',
        titolo: numeri.scritti === 0 ? 'Nessun indirizzo da mettere in mappa' : 'Indirizzi ancora da trovare',
        testo:
          numeri.scritti === 0
            ? `Gli indirizzi si scrivono nella scheda ${del(PIF)}, in Classi: domicilio e posto di lavoro.`
            : 'Il registro chiede le coordinate a OpenStreetMap, una volta per indirizzo, e se le tiene.',
        azione:
          daTrovare > 0
            ? pulsante({
                testo: 'Trova gli indirizzi',
                variante: 'primario',
                simbolo: 'segnaposto',
                al: () => azione({ tipo: 'mappa.geocodifica' }),
              })
            : null,
      }),
    )
  }

  return h(
    'div',
    { class: 'mappa' },
    testata,
    // La colonna prima della carta, nell'ordine del DOM come in quello della
    // lettura: si scorre un elenco e si guarda dove cade quel che si è letto.
    h('div', { class: 'mappa__corpo' }, colonna(classi), telaDellaPagina()),
    h(
      'p',
      { class: 'mappa__nota' },
      icona('informazione'),
      h(
        'span',
        null,
        `Le distanze sono in linea d’aria dalla sede di ${SEDE.nome}. ` +
          'Un segnaposto è un indirizzo, non una persona: dove stanno in più lo dice il cartellino. ' +
          'Le righe tratteggiate uniscono la casa al posto di lavoro: il mouse sopra ne accende una sola, ' +
          'e un clic la tiene accesa smorzando il resto della carta. ' +
          (daTrovare > 0
            ? `${daTrovare} ${daTrovare === 1 ? 'indirizzo' : 'indirizzi'} ${daTrovare === 1 ? 'aspetta' : 'aspettano'} ancora le coordinate: «Trova gli indirizzi».`
            : 'Tutti gli indirizzi scritti hanno il loro punto.'),
      ),
    ),
  )
}

/** Riporta la mappa su tutti i punti visibili: lo chiama il comando «Inquadra tutto». */
export function inquadraTutto (): void {
  riquadro?.inquadraTutto()
}

/** Quanti indirizzi aspettano ancora le coordinate: lo legge il comando. */
export function indirizziInAttesa (): number {
  return indirizziDaRisolvere(classiDellaMappa(), rubrica()).length
}
