// La mappa: dove abita e dove lavora la gente che si ha in classe.
// Tre parti: i tasselli OpenStreetMap passano dall'host
// (`registro://mappa/<z>/<x>/<y>.png`, `desktop/shell/protocol/tiles.ts`); i segnaposti
// li calcola il dominio (`segniDellaMappa`); l'inquadratura vive nel riquadro
// (`RiquadroMappa`) e non nello stato, perché si muove a ogni fotogramma.
// Il riquadro ha una chiave fissa e un posto fisso nella pagina: un ridisegno
// della vista non lo ricrea, e non perde tasselli e inquadratura.

import { useLayoutEffect, type ReactElement, type ReactNode } from 'react'

import { parole } from '#core/dominio/words.testi.js'
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
  type Rubrica,
  type SegnoMappa,
  type StratiMappa,
  type UsoIndirizzo,
} from '#core/dominio/map.js'
import type { Classe } from '#core/dominio/models.js'
import { classi as classiCss } from '#ui/classNames.js'
import {
  Collegamento,
  Pastiglia,
  Pulsante,
  Selettore,
  StatoVuoto,
  TestataVista,
} from '#ui/components/base.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { Icona, type NomeIcona } from '#ui/components/icons.js'
import { RiquadroMappa, type ComandiMappa } from '#ui/components/map.js'
import { moduloAnno } from '#ui/forms.js'
import { azione } from '#ui/bridge.js'
import {
  aggiorna,
  annoCorrente,
  classiDellAnno,
  ridisegna,
  stato,
  vai,
  type SchedaMappa,
} from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import { testi } from './map.testi.js'

/**
 * Il segnaposto aperto, con il suo cartellino: lo decidono anche l'elenco e le
 * schede, e il riquadro lo riprende al disegno.
 */
let apertoId: string | null = null

/**
 * I comandi del riquadro della pagina, finché è montato: lo comandano anche i
 * gesti dell'elenco e i comandi della barra.
 */
const comandiPagina: { current: ComandiMappa | null } = { current: null }

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

/** Chi usa un indirizzo, e a che titolo: unico fra le righe di un punto. */
function chiaveUso (uso: UsoIndirizzo): string {
  return `${uso.classeId}:${uso.allievoId}:${uso.genere}` // testo-fisso: chiave della riga, non si legge
}

/**
 * Il cartellino sopra un segnaposto: che indirizzo è e tutti quelli che ci
 * stanno, con classe e collegamento alla scheda.
 */
function cartellino (segno: SegnoMappa): ReactNode {
  return (
    <div className="mappa__cartellino">
      <strong className="mappa__cartellino-titolo">{segno.titolo}</strong>
      {segno.sottotitolo ? <span className="mappa__cartellino-riga">{segno.sottotitolo}</span> : null}
      <span className="mappa__cartellino-riga">{segno.indirizzo}</span>
      <span className="mappa__cartellino-riga">
        {segno.genere === 'sede'
          ? testi().sedeRiferimento
          : testi().dallaSede(scriviDistanza(segno.distanzaKm))}
      </span>
      {segno.usi.length > 0
        ? (
            <ul className="mappa__cartellino-chi">
              {righeDelPunto(segno.usi).map((uso) => (
                <li key={chiaveUso(uso)}>
                  <Icona nome={uso.genere === 'lavoro' ? 'azienda' : 'casa'} />
                  <Collegamento testo={uso.chi} al={() => apriScheda(uso)} />
                  <small>{uso.classe}</small>
                </li>
              ))}
            </ul>
          )
        : null}
    </div>
  )
}

/** La scheda di chi usa un indirizzo, nella sua classe. */
function apriScheda (uso: UsoIndirizzo): void {
  vai(
    { pagina: 'pagina.allievo', soggetto: { tipo: 'allievo', id: uso.allievoId } },
    { contesto: { classeId: uso.classeId } },
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
 * scheda personale). Vale una volta: lo consuma il primo disegno col riquadro.
 */
let daPortare: string | null = null

/** Apre la mappa su un indirizzo con il cartellino aperto, in mezzo a tutti gli altri punti. */
export function mostraSullaMappa (chiaveIndirizzo: string): void {
  // testo-fisso: l'identificatore del segnaposto
  daPortare = `ind:${chiaveIndirizzo}`
  apertoId = daPortare
  vai({ pagina: 'pagina.mappa' })
  // Già sulla mappa `vai` non ridisegnerebbe: il punto da portare non è stato.
  ridisegna()
}

/** Porta la mappa su un punto, e ci apre sopra il cartellino. */
function vaiA (id: string, punto: Coordinate, zoomMinimo = 15): void {
  apertoId = id
  comandiPagina.current?.apri(id)
  comandiPagina.current?.vaiA(punto, zoomMinimo)
}

// ------------------------------------------------------------------ la vista

/**
 * La colonna di sinistra: gli indirizzi che la scheda aperta lascia vedere,
 * accanto alla carta come una legenda. Le schede (Tutti, Posto di lavoro,
 * Domicilio) comandano insieme elenco e segnaposti.
 */
function colonna (classi: Classe[]): ReactElement {
  const schede: Array<{ valore: SchedaMappa; testo: string; simbolo: NomeIcona }> = [
    { valore: 'tutti', testo: parole().tutti, simbolo: 'segnaposto' },
    { valore: 'lavoro', testo: NOMI_GENERE.lavoro, simbolo: 'azienda' },
    { valore: 'domicilio', testo: NOMI_GENERE.domicilio, simbolo: 'casa' },
  ]

  return (
    // Anello della catena di telaio fino all'elenco che scorre.
    <aside className="mappa__colonna" data-telaio="mappa-colonna">
      <header className="mappa__colonna-testata">
        <Selettore
          valore={stato.schedaMappa}
          voci={schede}
          al={(scelta) => {
            // Il cartellino aperto può parlare di un punto che la scheda nuova non mostra: si chiude.
            apertoId = null
            aggiorna({ schedaMappa: scelta })
            ridisegna()
          }}
        />
      </header>
      {elencoIndirizzi(classi)}
    </aside>
  )
}

/**
 * Gli indirizzi, e dove cadono: prima quelli senza punto (da sistemare), poi
 * quelli caduti sul paese, poi per distanza dalla sede. Una riga per
 * indirizzo, con sotto i nomi di chi ci sta.
 */
function elencoIndirizzi (classi: Classe[]): ReactElement {
  const voci = indirizziUsati(classi, rubrica())
    .map((voce) => ({ voce, usi: generiVisti(voce.usi) }))
    .filter((riga) => riga.usi.length > 0)
  const t = testi()

  if (voci.length === 0) {
    return (
      <p className="mappa__colonna-vuota">
        {stato.schedaMappa === 'lavoro'
          ? t.nessunLavoro
          : stato.schedaMappa === 'domicilio'
            ? t.nessunDomicilio
            : t.nessunIndirizzo}
      </p>
    )
  }

  const ordinate = voci.sort(
    (a, b) =>
      Number(Boolean(a.voce.punto)) - Number(Boolean(b.voce.punto)) ||
      Number(!a.voce.punto?.approssimato) - Number(!b.voce.punto?.approssimato) ||
      (b.voce.punto ? distanzaKm(b.voce.punto, SEDE) : 0) -
        (a.voce.punto ? distanzaKm(a.voce.punto, SEDE) : 0),
  )

  return (
    <ul className="mappa__voci" data-scorrimento="mappa:voci" data-telaio="mappa-voci">
      {ordinate.map(({ voce, usi }) => {
        const persone = new Set(usi.map((uso) => uso.allievoId)).size
        const aziende = [
          ...new Set(usi.filter((uso) => uso.azienda).map((uso) => uso.azienda as string)),
        ]
        // testo-fisso: l'identificatore del segnaposto
        const id = `ind:${voce.chiave}`
        return (
          <li key={voce.chiave}>
            <div
              className={classiCss(
                'mappa__voce',
                'mappa__voce--indirizzo',
                apertoId === id && 'mappa__voce--attiva',
              )}
            >
              <button
                className="mappa__voce-apri"
                type="button"
                disabled={!voce.punto}
                title={voce.punto ? t.portaQui : t.senzaCoordinate}
                onClick={() => {
                  if (!voce.punto) return
                  vaiA(id, voce.punto)
                }}
              >
                {/* Il nome dell'azienda in testa quando c'è; la via dopo. */}
                <strong>{aziende.join(' · ') || voce.indirizzo}</strong>
                <small>{aziende.length > 0 ? voce.indirizzo : descriviUsi(usi)}</small>
              </button>
              <span className="mappa__voce-stato">
                {persone > 1
                  ? (
                      <Pastiglia
                        testo={usi.every((uso) => uso.genere === 'lavoro')
                          ? t.inTirocinio(persone)
                          : t.persone(persone)}
                        tono="informativo"
                        simbolo="classi"
                      />
                    )
                  : null}
                {voce.punto?.approssimato ? <Pastiglia testo={t.soloPaese} tono="attenzione" /> : null}
                {voce.punto
                  ? <Pastiglia testo={scriviDistanza(distanzaKm(voce.punto, SEDE))} tono="quiete" simbolo="segnaposto" />
                  : (
                      <Pulsante
                        testo={t.trova}
                        variante="sottile"
                        simbolo="segnaposto"
                        al={() =>
                          azione({
                            tipo: 'mappa.geocodifica',
                            classeIds: [usi[0].classeId],
                            allievoId: usi[0].allievoId,
                          })}
                      />
                    )}
              </span>
              {/* I nomi, ognuno con il segno casa o lavoro. */}
              <span className="mappa__voce-persone">
                {righeDelPunto(usi).map((uso) => (
                  <Collegamento
                    key={chiaveUso(uso)}
                    testo={<><Icona nome={uso.genere === 'lavoro' ? 'azienda' : 'casa'} />{uso.chi}</>}
                    titolo={
                      `${uso.chi} — ${uso.genere === 'lavoro' ? t.ciLavora : t.ciAbita} · ` +
                      uso.classe
                    }
                    al={() => apriScheda(uso)}
                  />
                ))}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
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
 * La richiesta di un punto vale una volta: la si consuma appena il riquadro è
 * in piedi (i suoi comandi ci sono già: gli effetti dei figli vengono prima).
 */
function portaAlPuntoChiesto (): void {
  const comandi = comandiPagina.current
  if (!daPortare || !comandi) return
  const cercato = daPortare
  daPortare = null
  const segno = segniDellaMappa(classiDellaMappa(), strati(), rubrica()).find(
    (s) => s.id === cercato,
  )
  if (segno) {
    comandi.apri(cercato)
    comandi.vaiA(segno)
  }
}

function VistaMappa (): ReactElement {
  useLayoutEffect(portaAlPuntoChiesto)

  const t = testi()
  if (!annoCorrente()) {
    return (
      <div data-telaio={telaioVista()}>
        <TestataVista titolo={t.titolo} />
        <StatoVuotoAnno simbolo="mappa" testo={t.vuotoAnno} crea={() => moduloAnno()} />
      </div>
    )
  }

  const classi = classiDellaMappa()
  const elenchi = rubrica()
  const segni = segniDellaMappa(classi, strati(), elenchi)
  const numeri = contiDellaMappa(classi, elenchi)
  const daTrovare = numeri.scritti - numeri.collocati

  const testata = (
    <TestataVista
      titolo={t.titolo}
      // Come si legge la carta sta dietro la «i»; sotto resta quel che cambia.
      aiuto={t.aiuto(SEDE.nome)}
      sottotitolo={
        numeri.scritti === 0
          ? t.nessunIndirizzoAnagrafica
          : t.sullaMappa(numeri.collocati, numeri.scritti) +
            (numeri.condivisi > 0 ? t.inComune(numeri.condivisi) : '') +
            (numeri.senzaIndirizzo > 0 ? t.senzaIndirizzo(numeri.senzaIndirizzo) : '')
      }
    />
  )

  if (segni.filter((s) => s.genere !== 'sede').length === 0) {
    return (
      <div className="mappa" data-telaio={telaioVista()}>
        {testata}
        <StatoVuoto
          simbolo="segnaposto"
          titolo={numeri.scritti === 0 ? t.vuotoNessuno : t.vuotoDaTrovare}
          testo={numeri.scritti === 0 ? t.vuotoScrivi : t.vuotoCoordinate}
          // Senza indirizzi scritti il gesto è andare dove si scrivono: la scheda
          // della persona, in Persone in formazione.
          azione={daTrovare > 0
            ? (
                <Pulsante
                  testo={t.trovaIndirizzi}
                  variante="primario"
                  simbolo="segnaposto"
                  al={() => azione({ tipo: 'mappa.geocodifica' })}
                />
              )
            : numeri.scritti === 0
              ? (
                  <Pulsante
                    testo={t.apriPersone}
                    variante="primario"
                    simbolo="utente"
                    al={() => { vai({ pagina: 'pagina.persone' }) }}
                  />
                )
              : null}
        />
      </div>
    )
  }

  return (
    // La vista si dà la sua chiave di telaio, come prima: le prove la leggono.
    <div className="mappa" data-telaio="mappa">
      {testata}
      {/* La colonna prima della carta, anche nell'ordine del DOM. */}
      <div className="mappa__corpo" data-telaio="mappa-corpo">
        {colonna(classi)}
        {/* Il riquadro della pagina, con il cartellino composto qui (quello della
            scheda personale è più corto). Chiave e posto fissi: non si ricrea. */}
        <RiquadroMappa
          // testo-fisso: la sorgente del nodo tenuto
          key="mappa:pagina"
          chiave="mappa:pagina"
          segni={segni}
          cartellino={cartellino}
          aperto={apertoId}
          allApertura={(id) => {
            apertoId = id
          }}
          comandi={comandiPagina}
        />
      </div>
      <p className="mappa__nota">
        <Icona nome="informazione" />
        <span>{daTrovare > 0 ? t.inAttesa(daTrovare, t.trovaIndirizzi) : t.tuttiTrovati}</span>
      </p>
    </div>
  )
}

export function vistaMappa (): ReactElement {
  return <VistaMappa />
}

/** Riporta la mappa su tutti i punti visibili: lo chiama il comando «Inquadra tutto». */
export function inquadraTutto (): void {
  comandiPagina.current?.inquadraTutto()
}

/** Quanti indirizzi aspettano ancora le coordinate: lo legge il comando. */
export function indirizziInAttesa (): number {
  return indirizziDaRisolvere(classiDellaMappa(), rubrica()).length
}

/** Quanti indirizzi sono scritti nelle schede delle persone delle classi in mappa. */
export function indirizziScritti (): number {
  return contiDellaMappa(classiDellaMappa(), rubrica()).scritti
}
