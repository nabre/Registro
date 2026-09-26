// La mappa: dove abita e dove lavora la gente che si ha in classe.
// Tre parti: i tasselli OpenStreetMap passano dall'host
// (`registro://mappa/<z>/<x>/<y>.png`, `shell/protocol/tiles.ts`); i segnaposti
// li calcola il dominio (`segniDellaMappa`); l'inquadratura vive in una
// variabile di modulo e non nello stato, perché si muove a ogni fotogramma.
// Il trascinamento sposta solo tasselli e segnaposti, senza ridisegnare la vista.

import { parole } from '../../domain/words.testi.js'
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
  collegamento,
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
import { moduloAnno } from '../forms.js'
import { azione } from '../bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  stato,
  type SchedaMappa,
} from '../state.js'
import { testi } from './map.testi.js'

/**
 * Dove si stava guardando: la pagina si ricostruisce a ogni salvataggio e
 * battito dell'orologio, e il riquadro con lei. Queste variabili sopravvivono.
 */
let inquadratura: Inquadratura | null = null

/** Il segnaposto aperto, con il suo cartellino. */
let apertoId: string | null = null

/** Il riquadro vivo: lo comandano i gesti dell'elenco e i comandi della barra. */
let riquadro: Riquadro | null = null

// ------------------------------------------------------------------ i dati

/**
 * Le classi che la mappa guarda: tutte quelle dell'anno, o quella scelta nella
 * tendina «Classe» (`classeMappaId`).
 */
function classiDellaMappa (): Classe[] {
  const classi = classiDellAnno().filter((c) => !c.archiviata)
  const scelta = classi.find((c) => c.id === stato.classeMappaId)
  return scelta ? [scelta] : classi
}

/**
 * Quali generi di punto disegnare, secondo la scheda aperta. La sede è sempre
 * accesa: è l'origine delle distanze.
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
 * Il cartellino sopra un segnaposto: che indirizzo è e tutti quelli che ci
 * stanno, con classe e collegamento alla scheda.
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
        ? testi().sedeRiferimento
        : testi().dallaSede(scriviDistanza(segno.distanzaKm)),
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
              collegamento({
                testo: uso.chi,
                al: () =>
                  aggiorna({
                    vista: 'allievo',
                    classeId: uso.classeId,
                    allievoId: uso.allievoId,
                  }),
              }),
              h('small', null, uso.classe),
            ),
          ),
        )
      : null,
  )
}

/**
 * Le righe di un cartellino: prima chi ci abita, poi chi ci lavora, in ordine
 * alfabetico. Chi abita e lavora lì compare due volte.
 */
function righeDelPunto (usi: UsoIndirizzo[]): UsoIndirizzo[] {
  return [...usi].sort(
    (a, b) =>
      Number(a.genere === 'lavoro') - Number(b.genere === 'lavoro') ||
      a.chi.localeCompare(b.chi, 'it'),
  )
}

/**
 * Il punto su cui portarsi appena la mappa si apre (da «Sulla mappa» della
 * scheda personale). Vale una volta: lo consuma il primo disegno.
 */
let daPortare: string | null = null

/** Apre la mappa su un indirizzo con il cartellino aperto, in mezzo a tutti gli altri punti. */
export function mostraSullaMappa (chiaveIndirizzo: string): void {
  // testo-fisso: l'identificatore del segnaposto
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
 * La colonna di sinistra: gli indirizzi che la scheda aperta lascia vedere,
 * accanto alla carta come una legenda. Le schede (Tutti, Posto di lavoro,
 * Domicilio) comandano insieme elenco e segnaposti.
 */
function colonna (classi: Classe[]): Figlio {
  const schede: Array<{ valore: SchedaMappa; testo: string; simbolo: NomeIcona }> = [
    { valore: 'tutti', testo: parole().tutti, simbolo: 'segnaposto' },
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
        // Il cartellino aperto può parlare di un punto che la scheda nuova non mostra: si chiude.
        apertoId = null
        aggiorna({ schedaMappa: scelta })
      }),
    ),
    elencoIndirizzi(classi),
  )
}

/**
 * Gli indirizzi, e dove cadono: prima quelli senza punto (da sistemare), poi
 * quelli caduti sul paese, poi per distanza dalla sede. Una riga per
 * indirizzo, con sotto i nomi di chi ci sta.
 */
function elencoIndirizzi (classi: Classe[]): Figlio {
  const voci = indirizziUsati(classi, rubrica())
    .map((voce) => ({ voce, usi: generiVisti(voce.usi) }))
    .filter((riga) => riga.usi.length > 0)
  const t = testi()

  if (voci.length === 0) {
    return h(
      'p',
      { class: 'mappa__colonna-vuota' },
      stato.schedaMappa === 'lavoro'
        ? t.nessunLavoro
        : stato.schedaMappa === 'domicilio'
          ? t.nessunDomicilio
          : t.nessunIndirizzo,
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
              // testo-fisso: l'identificatore del segnaposto
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
                title: voce.punto ? t.portaQui : t.senzaCoordinate,
              },
              onclick: () => {
                if (!voce.punto) return
                // testo-fisso: l'identificatore del segnaposto
                apertoId = `ind:${voce.chiave}`
                vaiA(voce.punto)
              },
            },
            // Il nome dell'azienda in testa quando c'è; la via dopo.
            h('strong', null, aziende.join(' · ') || voce.indirizzo),
            h('small', null, aziende.length > 0 ? voce.indirizzo : descriviUsi(usi)),
          ),
          h(
            'span',
            { class: 'mappa__voce-stato' },
            persone > 1
              ? pastiglia(
                  usi.every((uso) => uso.genere === 'lavoro')
                    ? t.inTirocinio(persone)
                    : t.persone(persone),
                  'informativo',
                  'classi',
                )
              : null,
            voce.punto?.approssimato ? pastiglia(t.soloPaese, 'attenzione') : null,
            voce.punto
              ? pastiglia(scriviDistanza(distanzaKm(voce.punto, SEDE)), 'quiete', 'segnaposto')
              : pulsante({
                  testo: t.trova,
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
          // I nomi, ognuno con il segno casa o lavoro.
          h(
            'span',
            { class: 'mappa__voce-persone' },
            ...righeDelPunto(usi).map((uso) =>
              collegamento({
                testo: [icona(uso.genere === 'lavoro' ? 'azienda' : 'casa'), uso.chi],
                titolo:
                  `${uso.chi} — ${uso.genere === 'lavoro' ? t.ciLavora : t.ciAbita} · ` +
                  uso.classe,
                al: () =>
                  aggiorna({
                    vista: 'allievo',
                    classeId: uso.classeId,
                    allievoId: uso.allievoId,
                  }),
              }),
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
  return testi().eAltri(nomi[0], nomi.length - 1)
}

/** A che titolo si sta a un indirizzo: chi ci sta, e se è casa o lavoro. */
function descriviUsi (usi: UsoIndirizzo[]): string {
  const generi = new Set(usi.map((uso) => uso.genere))
  const t = testi()
  const che =
    generi.size > 1
      ? t.domicilioELavoro
      : generi.has('lavoro')
        ? usi.find((uso) => uso.azienda)?.azienda ?? t.postoDiLavoro
        : t.domicilio
  return `${nomiDegliUsi(usi)} · ${che}`
}

/**
 * Il riquadro della pagina, con il cartellino composto qui (quello della scheda
 * personale è più corto: `views/student/registry.ts`).
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

  // La richiesta di un punto vale una volta: la si consuma appena il riquadro è in piedi.
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
  const t = testi()
  if (!annoCorrente()) {
    return h(
      'div',
      null,
      testataVista({ titolo: t.titolo }),
      statoVuotoAnno({
        simbolo: 'mappa',
        testo: t.vuotoAnno,
        crea: () => moduloAnno(),
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
    titolo: t.titolo,
    // Come si legge la carta sta dietro la «i»; sotto resta quel che cambia.
    aiuto: t.aiuto(SEDE.nome),
    sottotitolo:
      numeri.scritti === 0
        ? t.nessunIndirizzoAnagrafica
        : t.sullaMappa(numeri.collocati, numeri.scritti) +
          (numeri.condivisi > 0 ? t.inComune(numeri.condivisi) : '') +
          (numeri.senzaIndirizzo > 0 ? t.senzaIndirizzo(numeri.senzaIndirizzo) : ''),
  })

  if (segni.filter((s) => s.genere !== 'sede').length === 0) {
    return h(
      'div',
      { class: 'mappa' },
      testata,
      statoVuoto({
        simbolo: 'segnaposto',
        titolo: numeri.scritti === 0 ? t.vuotoNessuno : t.vuotoDaTrovare,
        testo:
          numeri.scritti === 0
            ? t.vuotoScrivi
            : t.vuotoCoordinate,
        azione:
          daTrovare > 0
            ? pulsante({
                testo: t.trovaIndirizzi,
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
    // La colonna prima della carta, anche nell'ordine del DOM.
    h('div', { class: 'mappa__corpo' }, colonna(classi), telaDellaPagina()),
    h(
      'p',
      { class: 'mappa__nota' },
      icona('informazione'),
      h(
        'span',
        null,
        daTrovare > 0
          ? t.inAttesa(daTrovare, t.trovaIndirizzi)
          : t.tuttiTrovati,
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
