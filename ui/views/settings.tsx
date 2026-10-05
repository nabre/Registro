// Impostazioni: quattro aree fisse in testata (Calendario, Didattica, Utente,
// Programma), ognuna una pagina sola che scorre, con l'indice delle sezioni a
// sinistra che segue lo scorrimento. Livelli: area › sezione › gruppo.
// Ogni blocco dice dove sta con una pastiglia, «Questo anno» o «Questo
// computer»: è l'unica cosa che qui si può sbagliare senza accorgersene.
// Ogni voce ha un indirizzo, `impostazioni/<area>#<voce>` (`place.ts`): chi ci
// arriva — un rimando, il filtro, Ctrl+K — scorre fin lì e la vede accendersi.
// La finestra nativa resta per quando non c'è un documento aperto.

import {
  useEffect,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import { classi } from '#ui/classNames.js'
import { Pulsante, Scheda, StatoVuoto, TestataVista } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { andaturaScorrimento } from '#ui/focus.js'
import { Input, Select } from '#ui/fields.js'
import { Isola } from '#ui/island.js'
import { testi } from './settings.testi.js'
import { ridisegnaIsola } from '#ui/islands.js'
import {
  areaDellaScheda,
  chiaveDelPosto,
  voceDellaScheda,
  type AreaImpostazioni,
  type Scheda as SchedaPosto,
  type SezioneImpostazioni,
} from '#ui/place.js'
import { riprendi, seguiScorrimento } from '#ui/bookmark.js'
import { ricorda, ridisegna, stato, vai } from '#ui/state.js'
import { telaioVista } from '#ui/viewFrame.js'
import {
  schedaAnnoAperto,
  schedaChiusure,
  schedaSettimane,
} from './settings/year.js'
import { schedaValutazione } from './settings/document.js'
import { contenutoGiornata } from './settings/schoolDay.js'
import { listaTipiSettimana, schedaListe } from './settings/lists.js'
import { schedaCalendarioIcs } from './settings/icsCalendar.js'
import { schedaFirma, schedaPosta } from './settings/mail.js'
import { schedaAccountMicrosoft } from './settings/microsoft.js'
import { schedaAggiornamenti } from './settings/updates.js'
import { schedeCalendariUfficiali } from './settings/officialCalendars.js'
import { contenutoModelliLinguistici } from './languageModels.js'
import { schedaCarte, schedaChiFirma } from './settings/letterhead.js'
import { ripristinaArea, schedaProgramma, vociProgramma } from './settings/program.js'
import {
  AREE,
  cercaImpostazioni,
  daSistemare,
  nomeAmbito,
  scritteNellArea,
  sezioneDi,
  sezioneProgramma,
  sezioniDellArea,
  titoloArea,
  type AmbitoBlocco,
  type Sezione,
  type Trovata,
} from './settings/sections.js'

// ------------------------------------------------------------------ i blocchi

/**
 * Un blocco di una sezione: il suo ambito, e quel che disegna. `voce` è
 * l'ancora di un blocco che si raggiunge per nome (`calendario#calendari`).
 */
interface Blocco {
  ambito: AmbitoBlocco
  disegna: () => ReactNode
  voce?: string
}

/** Le voci di una sezione del programma, se la sezione ne ha. */
function vociDi (id: SezioneImpostazioni): ReactNode {
  const sezione = sezioneProgramma(id)
  return sezione ? schedaProgramma(sezione) : null
}

/**
 * Che cosa disegna ciascuna sezione, blocco per blocco, sempre nello stesso
 * ordine: prima lo stato e i gesti, poi le scelte, e in fondo le avanzate,
 * chiuse (skill `impostazione`, § «Il sistema delle pagine»).
 */
const BLOCCHI: Readonly<Record<SezioneImpostazioni, readonly Blocco[]>> = {
  // «Questo file» è il dialogo «Informazioni documento», aprire e creare un
  // anno stanno nel menu «File»: un file non è un'impostazione.
  anno: [{ ambito: 'anno', disegna: schedaAnnoAperto }],
  chiusure: [
    { ambito: 'anno', disegna: schedaChiusure },
    { ambito: 'computer', disegna: schedeCalendariUfficiali, voce: 'calendari' },
  ],
  settimane: [
    { ambito: 'anno', disegna: schedaSettimane },
    { ambito: 'anno', disegna: listaTipiSettimana, voce: 'tipiSettimana' },
  ],
  // La giornata di scuola in quattro passi numerati: `settings/schoolDay.tsx`.
  giornata: [{ ambito: 'anno', disegna: contenutoGiornata }],
  ics: [{ ambito: 'anno', disegna: schedaCalendarioIcs }],
  valutazione: [{ ambito: 'anno', disegna: schedaValutazione }],
  liste: [{ ambito: 'anno', disegna: schedaListe }],
  chiSei: [{ ambito: 'anno', disegna: schedaChiFirma }],
  stampa: [{ ambito: 'anno', disegna: schedaCarte }],
  // Collegare, provare, scollegare e azzerare stanno qui, per account e per
  // capacità: la Posta dice solo com'è, e rimanda.
  account: [{ ambito: 'computer', disegna: schedaAccountMicrosoft }],
  // Com'è la casella e il mittente, poi i recapiti, poi la firma, che è dell'anno.
  posta: [
    { ambito: 'computer', disegna: schedaPosta },
    { ambito: 'computer', disegna: () => vociDi('posta') },
    { ambito: 'anno', disegna: schedaFirma, voce: 'firma' },
  ],
  aspetto: [{ ambito: 'computer', disegna: () => vociDi('aspetto') }],
  avvio: [{ ambito: 'computer', disegna: () => vociDi('avvio') }],
  // Tutte le chiavi dei modelli stanno nelle righe d'uso e in «Sul computer».
  modelli: [{ ambito: 'computer', disegna: contenutoModelliLinguistici }],
  aggiornamenti: [
    { ambito: 'computer', disegna: schedaAggiornamenti },
    { ambito: 'computer', disegna: () => vociDi('aggiornamenti') },
  ],
  condotto: [{ ambito: 'computer', disegna: () => vociDi('condotto') }],
}

/** La pastiglia d'ambito: dove sta quel che le sta accanto. */
function pastigliaAmbito (ambito: AmbitoBlocco): ReactElement {
  const { nome, aiuto } = nomeAmbito(ambito)
  return (
    <span
      className={classi('ambito', `ambito--${ambito}`)} // testo-fisso: classi CSS
      title={aiuto}
    >
      <Icona nome={ambito === 'anno' ? 'documento' : 'schermo'} classe="icona--minuta" />
      {nome}
    </span>
  )
}

/** L'id DOM di una sezione: l'indice ci salta, il titolo la nomina. */
function idSezione (id: SezioneImpostazioni): string {
  return `impostazioni-sezione-${id}` // testo-fisso: id DOM, non si legge
}

/**
 * Una sezione: la testata con il nome e il riassunto; poi i blocchi, con la
 * pastiglia d'ambito su una riga sua sopra il primo, e sopra ognuno se sono di
 * due ambiti. Sempre nello stesso posto: accanto al titolo in una sezione e su
 * una riga nell'altra, l'occhio la cercherebbe in due posti.
 */
function disegnaSezione (sezione: Sezione): ReactElement {
  const blocchi = BLOCCHI[sezione.id]
  const misto = new Set(blocchi.map((blocco) => blocco.ambito)).size > 1
  const idTitolo = `${idSezione(sezione.id)}-titolo` // testo-fisso: id DOM, non si legge
  return (
    <section
      key={sezione.id}
      className="impostazioni__sezione"
      id={idSezione(sezione.id)}
      data-sezione={sezione.id}
      data-voce={sezione.id}
      aria-labelledby={idTitolo}
    >
      <header className="impostazioni__sezione-testa">
        <h2 className="impostazioni__sezione-titolo" id={idTitolo}>{sezione.titolo}</h2>
        <p className="impostazioni__sezione-sotto">{sezione.sottotitolo}</p>
      </header>
      {blocchi.map((blocco, indice) => (
        // Blocchi fissi per sezione: la chiave è il posto.
        <div key={indice} className="impostazioni__blocco" data-ambito={blocco.ambito} data-voce={blocco.voce}>
          {misto || indice === 0
            ? <div className="impostazioni__blocco-ambito">{pastigliaAmbito(blocco.ambito)}</div>
            : null}
          {blocco.disegna()}
        </div>
      ))}
    </section>
  )
}

// ------------------------------------------------------------------ la testata

/** L'area aperta: la dice il posto. */
function areaAperta (): AreaImpostazioni {
  return stato.posto.scheda ? areaDellaScheda(stato.posto.scheda) : stato.areaImpostazioni
}

/** Movimento APG dentro la fila delle aree, con attivazione automatica. */
function muoviFraAree (evento: KeyboardEvent<HTMLButtonElement>): void {
  const tasti = [...evento.currentTarget
    .closest('[role="tablist"]')
    ?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []]
  if (tasti.length === 0) return
  const corrente = tasti.indexOf(evento.currentTarget)
  let prossimo: number | null = null
  if (evento.key === 'ArrowRight' || evento.key === 'ArrowDown') prossimo = (corrente + 1) % tasti.length
  if (evento.key === 'ArrowLeft' || evento.key === 'ArrowUp') prossimo = (corrente - 1 + tasti.length) % tasti.length
  if (evento.key === 'Home') prossimo = 0
  if (evento.key === 'End') prossimo = tasti.length - 1
  if (prossimo === null) return
  evento.preventDefault()
  const tasto = tasti[prossimo]
  // Il disegno ricorda il `data-fuoco` dell'elemento attivo.
  tasto.focus()
  tasto.click()
}

/**
 * Apre un'area dalla testata, in cima, e svuota il filtro, che resterebbe su
 * un elenco non più visibile.
 */
function apriArea (area: AreaImpostazioni): void {
  const svuota = cercato !== ''
  svuotaFiltro()
  vai({ pagina: 'pagina.impostazioni', scheda: area })
  // Sull'area già aperta `vai` non ridisegna: il filtro va svuotato a vista, la
  // casella compresa, che sta fuori dall'isola.
  if (svuota) ridisegna()
}

/**
 * Una scheda d'area: icona, nome, quante voci sono decise a mano (tono
 * neutro: cambiare un'impostazione è normale) e un punto se lì qualcosa
 * chiede attenzione.
 */
function schedaArea (area: (typeof AREE)[number], attiva: boolean): ReactElement {
  const t = testi()
  const scritte = scritteNellArea(stato.programma, area.id)
  const motivi = daSistemare(area.id, stato.programma, stato.posta)
  return (
    <button
      key={area.id}
      className={classi('area-voce', attiva && 'area-voce--attiva')}
      type="button"
      // testo-fisso: la chiave di fuoco, non la legge nessuno
      data-fuoco={`area-${area.id}`}
      id={`impostazioni-area-${area.id}`} // testo-fisso: id DOM, non si legge
      role="tab"
      aria-selected={attiva ? 'true' : 'false'}
      aria-controls="impostazioni-pannello" // testo-fisso: id DOM, non si legge
      tabIndex={attiva ? 0 : -1}
      onClick={() => apriArea(area.id)}
      onKeyDown={muoviFraAree}
    >
      <Icona nome={area.simbolo} />
      <span>{area.titolo}</span>
      {scritte > 0
        ? (
            <span className="area-voce__segno" title={t.modificate(scritte)} aria-label={t.modificate(scritte)}>
              {String(scritte)}
            </span>
          )
        : null}
      {motivi.length > 0
        ? <span className="area-voce__punto" role="img" title={motivi.join(' · ')} aria-label={motivi.join(' · ')} />
        : null}
    </button>
  )
}

/**
 * Che cosa si cerca fra le impostazioni. Fuori dallo stato persistito: non va
 * ritrovato alla prossima apertura.
 */
let cercato = ''

/**
 * Quante volte il filtro è stato svuotato da un gesto altrove. La casella non
 * si ridisegna mentre si scrive (si rifà solo l'isola), quindi non ha mai visto
 * il testo battuto: il valore '' le sembrerebbe quello di sempre e il testo
 * resterebbe. Con questo nella chiave rinasce vuota.
 */
let svuotature = 0

function svuotaFiltro (): void {
  if (cercato === '') return
  cercato = ''
  svuotature += 1
}

/**
 * Quel che sta sotto la testata: a ogni lettera del filtro si rifà lui solo
 * (ADR-48), la casella resta dov'è col suo cursore e le aree non cambiano.
 */
const ISOLA_CORPO = 'impostazioni-corpo'

function campoCerca (): ReactElement {
  const t = testi()
  return (
    <div className="opzioni__cerca">
      <Input
        key={svuotature}
        className="campo__controllo"
        type="search"
        valore={cercato}
        placeholder={t.filtraSegnaposto}
        data-fuoco="impostazioni-cerca"
        aria-label={t.filtraEtichetta}
        autoComplete="off"
        // Su `input` e non su `change`: il filtro risponde mentre si scrive.
        onInput={(evento) => {
          cercato = evento.currentTarget.value
          ridisegnaIsola(ISOLA_CORPO)
          requestAnimationFrame(dopoIlDisegno)
        }}
      />
    </div>
  )
}

/**
 * La testata appiccicata: le aree, il filtro e «Ripristina» dell'area aperta,
 * che si vede solo se lì qualcosa è stato deciso a mano.
 */
function fascia (): ReactElement {
  const t = testi()
  const qui = areaAperta()
  return (
    <div className="impostazioni__fascia">
      <nav className="impostazioni__aree" role="tablist" aria-label={t.aree}>
        {AREE.map((area) => schedaArea(area, area.id === qui))}
      </nav>
      <div className="impostazioni__strumenti">
        {campoCerca()}
        {ripristinaArea(qui)}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ l'indice

/**
 * Chi segue la sezione che si sta guardando: l'indice, che si rifà da solo
 * quando lo scorrimento la cambia, senza ridisegnare la pagina.
 */
const seguaci = new Set<() => void>()

function seguiSezione (seguace: () => void): () => void {
  seguaci.add(seguace)
  return () => { seguaci.delete(seguace) }
}

/** Salta a una sezione senza ridisegnare: scorre, e l'indice la accende. */
function salta (id: SezioneImpostazioni): void {
  const bersaglio = document.getElementById(idSezione(id))
  if (!bersaglio) return
  bersaglio.scrollIntoView({ behavior: andaturaScorrimento(), block: 'start' })
  segna(id)
}

/**
 * L'indice delle sezioni dell'area: una colonna a sinistra, e su schermo
 * stretto una tendina in cima. Un clic scorre, non ridisegna.
 */
function Indice ({ area }: { area: AreaImpostazioni }): ReactElement {
  const t = testi()
  const accesa = useSyncExternalStore(seguiSezione, () => stato.sezioneImpostazioni)
  const sezioni = sezioniDellArea(area)
  const qui = sezioni.some((sezione) => sezione.id === accesa) ? accesa : sezioni[0]?.id
  return (
    <nav className="impostazioni__indice" aria-label={t.indice}>
      <Select
        className="campo__controllo impostazioni__indice-tendina"
        valore={qui}
        aria-label={t.indiceTendina}
        onCambio={(evento) => salta((evento.target as HTMLSelectElement).value as SezioneImpostazioni)}
      >
        {sezioni.map((sezione) => <option key={sezione.id} value={sezione.id}>{sezione.titolo}</option>)}
      </Select>
      <ul className="impostazioni__indice-voci">
        {sezioni.map((sezione) => (
          <li key={sezione.id}>
            <button
              className={classi('impostazioni__indice-voce', sezione.id === qui && 'impostazioni__indice-voce--qui')}
              type="button"
              data-sezione={sezione.id}
              aria-current={sezione.id === qui ? 'location' : undefined}
              onClick={() => salta(sezione.id)}
            >
              {sezione.titolo}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Accende nell'indice la sezione che si sta guardando, e la ricorda. */
function segna (id: string): void {
  const sezione = sezioneDi(id)
  if (sezione.id !== id) return
  if (stato.sezioneImpostazioni === sezione.id) return
  // Diretto e non da `aggiorna`: segue lo scorrimento, e non si ridisegna la
  // pagina, solo l'indice. È una preferenza, quindi `ricorda`.
  stato.sezioneImpostazioni = sezione.id
  ricorda()
  for (const seguace of seguaci) seguace()
}

// ------------------------------------------------------------------ il filtro

/** Porta a un'impostazione trovata: svuota il filtro e arriva sulla voce. */
export function vaiAllImpostazione (scheda: SchedaPosto): void {
  svuotaFiltro()
  // Anche sullo stesso posto si arriva di nuovo: la voce si riaccende.
  arrivato = null
  vai({ pagina: 'pagina.impostazioni', scheda })
  ridisegna()
}

/** Dal filtro alla sezione dei modelli, dove un modello si sceglie davvero. */
function aiModelliDalFiltro (): void {
  vaiAllImpostazione('programma#modelli')
}

/** Un risultato che porta altrove: una sezione, o una voce disegnata da una scheda. */
function rigaSezione (trovata: Trovata): ReactElement {
  const sezione = sezioneDi(trovata.sezione)
  return (
    <div className="risultato-impostazioni">
      <span className="risultato-impostazioni__testo">
        <strong>{trovata.titolo}</strong>
        <small>{sezione.sottotitolo}</small>
      </span>
      {trovata.ambito ? pastigliaAmbito(trovata.ambito) : null}
      <Pulsante
        testo={testi().vaiAllaSezione}
        simbolo="destra"
        variante="sottile"
        al={() => vaiAllImpostazione(trovata.scheda)}
      />
    </div>
  )
}

/**
 * Quel che si trova, area per area, al posto della pagina dell'area: le voci
 * del computer si cambiano lì dove sono, le sezioni portano al loro posto.
 */
function risultati (): ReactElement {
  const trovate = cercaImpostazioni(stato.programma, cercato)
  const t = testi()

  if (trovate.length === 0) {
    return (
      <Scheda titolo={t.nessunaCorrispondenza} classe="scheda--opzioni">
        <StatoVuoto simbolo="impostazioni" titolo={t.nienteCosi} testo={t.nienteCosiTesto} />
      </Scheda>
    )
  }

  return (
    <Scheda titolo={t.trovate(trovate.length)} aiuto={t.trovateAiuto} classe="scheda--opzioni">
      <div className="gruppi-opzioni">
        {AREE.map((area) => {
          const qui = trovate.filter((trovata) => trovata.area === area.id)
          if (qui.length === 0) return null
          return (
            <section key={area.id} className="gruppo-opzioni">
              <h2 className="gruppo-opzioni__titolo">{titoloArea(area.id)}</h2>
              <div className="voci-opzioni">
                {qui.map((trovata) =>
                  trovata.voce && voceDellaScheda(trovata.scheda) === trovata.voce.chiave
                    ? (
                        <div key={`voce:${trovata.voce.chiave}`} className="risultato-impostazioni__voce">
                          <small className="testo-quieto">{sezioneDi(trovata.sezione).titolo}</small>
                          {vociProgramma(trovata.voce, aiModelliDalFiltro)}
                        </div>
                      )
                    : <RigaTrovata key={`posto:${trovata.scheda}`} trovata={trovata} />,
                )}
              </div>
            </section>
          )
        })}
      </div>
    </Scheda>
  )
}

/** `rigaSezione` come elemento di un elenco, con la sua chiave. */
function RigaTrovata ({ trovata }: { trovata: Trovata }): ReactElement {
  return rigaSezione(trovata)
}

// ------------------------------------------------------------------ la pagina

/** La pagina di un'area: l'indice e le sezioni una sotto l'altra. */
function paginaArea (area: AreaImpostazioni): ReactElement {
  return (
    <>
      <Indice area={area} />
      <div className="impostazioni__pagina">{sezioniDellArea(area).map(disegnaSezione)}</div>
    </>
  )
}

function corpo (): ReactElement {
  const area = areaAperta()
  const filtrando = cercato.trim() !== ''
  return (
    <div
      className={classi('impostazioni__corpo', filtrando && 'impostazioni__corpo--risultati')}
      id="impostazioni-pannello" // testo-fisso: id DOM, non si legge
      role="tabpanel"
      aria-labelledby={`impostazioni-area-${area}`} // testo-fisso: id DOM, non si legge
    >
      {filtrando ? risultati() : paginaArea(area)}
    </div>
  )
}

function VistaImpostazioni (): ReactElement {
  // Arrivando su un posto nuovo il filtro si svuota: la voce chiesta deve vedersi.
  if (chiaveDelPosto(stato.posto) !== arrivato) svuotaFiltro()

  // Gli effetti dopo ogni disegno, mai dal disegno. Il fotogramma dopo quello
  // del disegno: misure e ancore sono quelle nuove.
  useEffect(() => {
    const fotogramma = requestAnimationFrame(dopoIlDisegno)
    return () => cancelAnimationFrame(fotogramma)
  })

  // Lasciando la pagina l'indice smette di seguire, e tornando si arriva di nuovo.
  useEffect(() => () => {
    osservatore?.disconnect()
    osservatore = null
    arrivato = null
  }, [])

  return (
    <div className="vista vista--impostazioni" data-telaio={telaioVista()}>
      {/* Il titolo prima della testata; che cosa dicono le pastiglie sta dietro la «i». */}
      <TestataVista titolo={testi().titolo} aiuto={testi().aiutoPagina} />
      {fascia()}
      <Isola chiave={ISOLA_CORPO} disegna={corpo} className="impostazioni__isola" />
    </div>
  )
}

export function vistaImpostazioni (): ReactElement {
  return <VistaImpostazioni />
}

// ------------------------------------------------------------------ dopo il disegno

/** Il posto su cui si è già arrivati: arrivarci di nuovo a ogni ridisegno riporterebbe lì. */
let arrivato: string | null = null

let osservatore: IntersectionObserver | null = null

/**
 * Dopo ogni disegno: misura la testata appiccicata (le ancore si fermano sotto
 * di lei), rimette in ascolto l'indice sulle sezioni e, se il posto è nuovo,
 * ci arriva.
 */
function dopoIlDisegno (): void {
  const vista = document.querySelector<HTMLElement>('.vista--impostazioni')
  if (!vista) return
  const fasciaAlta = vista.querySelector<HTMLElement>('.impostazioni__fascia')?.offsetHeight ?? 0
  // testo-fisso: una misura CSS
  vista.style.setProperty('--impostazioni-fascia-alto', `${fasciaAlta}px`)
  // Su schermo stretto l'indice è una tendina appiccicata sotto la testata:
  // anche lei copre il titolo di una sezione raggiunta. Largo sta di fianco e
  // non conta.
  const tendina = vista.querySelector<HTMLElement>('.impostazioni__indice-tendina')
  const indice = tendina && tendina.offsetParent ? tendina.closest<HTMLElement>('.impostazioni__indice') : null
  const indiceAlto = indice?.offsetHeight ?? 0
  // testo-fisso: una misura CSS
  vista.style.setProperty('--impostazioni-indice-alto', `${indiceAlto}px`)
  const alto = fasciaAlta + indiceAlto

  osservatore?.disconnect()
  osservatore = null
  const sezioni = [...vista.querySelectorAll<HTMLElement>('.impostazioni__sezione')]
  if (sezioni.length > 0) {
    // La fascia alta della pagina, sotto la testata: la sezione che ci passa è
    // quella che si sta guardando.
    osservatore = new IntersectionObserver((voci) => {
      const prima = voci
        .filter((voce) => voce.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      const id = (prima?.target as HTMLElement | undefined)?.dataset.sezione
      if (id) segna(id)
    // testo-fisso: una misura CSS
    }, { root: document.querySelector('main.contenuto'), rootMargin: `-${alto}px 0px -60% 0px` })
    for (const sezione of sezioni) osservatore.observe(sezione)
  }

  const chiave = chiaveDelPosto(stato.posto)
  if (chiave === arrivato || !stato.posto.scheda) return
  arrivato = chiave
  const voce = voceDellaScheda(stato.posto.scheda)
  // Riaprendo l'area, o la sezione da cui si era usciti, si riprende dal punto
  // di lettura; un rimando a un'altra voce ci arriva e basta.
  const segno = stato.segnalibri[segnalibroDellArea(areaAperta())]
  const riaperta = voce === undefined || voce === stato.sezioneImpostazioni
  if (riaperta && !cercato && riprendi(sezioni, segno)) {
    if (segno) segna(segno.sezione)
    return
  }
  arriva(voce)
}

/** Sotto che nome si ricorda il punto di lettura di un'area. */
function segnalibroDellArea (area: AreaImpostazioni): string {
  // testo-fisso: una chiave della memoria, non si legge
  return `impostazioni.${area}`
}

// Il punto di lettura segue lo scorrimento dell'area intera, non dei risultati
// del filtro.
seguiScorrimento(
  () => stato.vista === 'impostazioni' && !cercato ? segnalibroDellArea(areaAperta()) : null,
  () => [...document.querySelectorAll<HTMLElement>('.vista--impostazioni .impostazioni__sezione')],
)

/**
 * Porta alla voce dell'indirizzo. Una sezione si mette in cima; un controllo
 * si porta al centro, si accende un attimo e prende il fuoco. Senza voce, o
 * con una voce che non c'è più, l'area si apre dall'inizio.
 */
function arriva (voce: string | undefined): void {
  const contenitore = document.querySelector<HTMLElement>('main.contenuto')
  const bersaglio = voce
    ? document.querySelector<HTMLElement>(`.vista--impostazioni [data-voce="${CSS.escape(voce)}"]`)
    : null
  if (!bersaglio) {
    if (contenitore) contenitore.scrollTop = 0
    const prima = document.querySelector<HTMLElement>('.impostazioni__sezione')?.dataset.sezione
    if (prima) segna(prima)
    return
  }
  const sezione = bersaglio.closest<HTMLElement>('.impostazioni__sezione')?.dataset.sezione
  if (sezione) segna(sezione)
  if (bersaglio.classList.contains('impostazioni__sezione')) {
    // La prima sezione è già in cima: la pagina parte dall'inizio, testata compresa.
    if (!bersaglio.previousElementSibling && contenitore) contenitore.scrollTop = 0
    else bersaglio.scrollIntoView({ block: 'start' })
    return
  }
  bersaglio.scrollIntoView({ block: 'center' })
  // Un lampo passeggero, fuori dal disegno: la classe si toglie e si rimette a mano.
  bersaglio.classList.remove('impostazioni--lampo')
  // Rileggere la misura fa ripartire l'animazione anche sulla stessa voce.
  void bersaglio.offsetWidth
  bersaglio.classList.add('impostazioni--lampo')
  const controllo = bersaglio.querySelector<HTMLElement>(
    'input:not([type="hidden"]), select, textarea, [role="radio"][tabindex="0"], button',
  )
  controllo?.focus({ preventScroll: true })
}
