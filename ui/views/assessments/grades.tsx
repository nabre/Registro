// La griglia dei voti: la casella, quel che ci si può battere dentro, e la
// tabella che le mette in fila. Separata da `views/assessments.tsx` perché la
// usano anche i pannelli dei recuperi e delle riconsegne: tenerla là creerebbe
// cicli di import, e `SIGLA_ASSENTE` (calcolata al caricamento) darebbe
// `ReferenceError` a seconda dell'ordine di valutazione di esbuild.

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
} from 'react'

import { allieviAttivi, formattaVoto, mediaAllievo, mediaMomento, nomeCompleto, notaFineSemestre, ordinaAllievi, siglaPresenza, votiDellaScala } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import { Uno, corto } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Classe, MomentoValutazione, Scala } from '#core/dominio/models.js'
import { assenteAllOra, rigaDelRecupero } from '#core/dominio/retakes.js'
import { classi } from '#ui/classNames.js'
import { CellaNome } from '#ui/components/avatar.js'
import { Collegamento, Pastiglia } from '#ui/components/base.js'
import { Tabella } from '#ui/components/table.js'
import { Vuoto, useFinestra, type Finestra } from '#ui/components/virtualList.js'
import { notifica } from '#ui/components/notifications.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import { postoCorrente, stato, vai } from '#ui/state.js'
import { testi } from './grades.testi.js'

/**
 * La sigla con cui si segna un assente: la stessa dell'appello (`X`); il
 * trattino vuol dire «nessun voto».
 */
export const SIGLA_ASSENTE = siglaPresenza('assente')

/**
 * Legge quel che è stato digitato in una casella. Vuoto e trattino valgono
 * «nessun voto», `X` assente, come nell'appello; `a`, `ass` e `assente` restano
 * accettate, ma il carattere mostrato è uno solo.
 */
export function leggiCasella (testo: string): { valore: number | null; assente: boolean } | null {
  const pulito = testo.trim().toLowerCase().replace(',', '.')
  if (pulito === '' || pulito === '-') return { valore: null, assente: false }
  if (['x', 'a', 'ass', 'assente'].includes(pulito)) return { valore: null, assente: true }
  const numero = Number(pulito)
  return Number.isFinite(numero) ? { valore: numero, assente: false } : null
}

/**
 * Il lampo rosso di una casella voto rifiutata: dura quanto basta a vederlo.
 * Torna se è acceso e il gesto che lo accende.
 */
export function useLampo (): [boolean, () => void] {
  const [acceso, accendi] = useState(false)
  const tempo = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (tempo.current) clearTimeout(tempo.current)
  }, [])
  const lampeggia = useCallback(() => {
    accendi(true)
    if (tempo.current) clearTimeout(tempo.current)
    tempo.current = setTimeout(() => {
      tempo.current = null
      accendi(false)
    }, 800)
  }, [])
  return [acceso, lampeggia]
}

/**
 * La larghezza di una colonna di prova disegnata, finché non la si è misurata:
 * quella della `th` (`.tabella__momento`, 5.75rem) con i suoi margini.
 */
const LARGHEZZA_COLONNA = 92

/**
 * Da quante prove in su la griglia si disegna a finestra: con quaranta righe,
 * trenta colonne intere costano già più di un fotogramma lungo
 * (`tests/interfaccia/misure.spec.ts`).
 */
const SOGLIA_COLONNE = 20

/**
 * La tendina dei voti da agganciare a una casella: un `datalist` e non un
 * `select`, così la casella resta scrivibile (anche con la sigla dell'assente).
 * L'`input` accanto la nomina con `list={id}`.
 */
export const ElencoVoti = memo(function ElencoVoti ({ id, scala, sigleInPiu = '' }: {
  id: string
  scala: Scala
  /** Le sigle in più, separate da spazi: una stringa, perché `memo` la confronti. */
  sigleInPiu?: string
}): ReactElement {
  const voci = [...votiDellaScala(scala), ...sigleInPiu.split(' ').filter(Boolean)]
  return (
    <datalist id={id}>
      {voci.map((voto) => <option key={voto} value={voto} />)}
    </datalist>
  )
})

/** Il campo di una casella della griglia, o `null` se fuori dai bordi. */
function campoVoto (tabella: HTMLElement, riga: number, colonna: number): HTMLInputElement | null {
  return tabella.querySelector<HTMLInputElement>(`input[data-riga="${riga}"][data-colonna="${colonna}"]`)
}

/**
 * Frecce e Invio spostano il fuoco come in un foglio di calcolo. Torna vero se
 * il campo c'era: chi chiama deve saperlo prima di togliere il fuoco da quello
 * di partenza.
 */
function spostaFuoco (tabella: HTMLElement, riga: number, colonna: number, vista?: Finestra | null): boolean {
  let bersaglio = campoVoto(tabella, riga, colonna)
  // Una colonna fuori dalla finestra non c'è ancora: la si disegna, poi la si cerca.
  if (!bersaglio && vista?.attiva && tabella.querySelector(`input[data-riga="${riga}"]`) &&
    vista.portaInVista(colonna)) {
    bersaglio = campoVoto(tabella, riga, colonna)
  }
  if (!bersaglio) return false
  bersaglio.focus()
  bersaglio.select()
  return true
}

/**
 * Il foglio dei voti: allievi in riga, momenti in colonna, medie in fondo.
 * Esportata perché si compila sia nella lezione sia in questa vista (recuperi,
 * correzioni, voti in ritardo): una griglia sola, un solo modo di scrivere un voto.
 */
interface OpzioniGriglia {
  /**
   * Solo questi allievi invece della classe (p. es. i due di un recupero). Sono
   * id: ordine e frequenza restano decisi qui.
   */
  soloAllievi?: string[]
  /**
   * Le due colonne in coda, media del semestre e nota. Si tolgono dove la griglia
   * mostra una prova sola, perché lì non sono un bilancio.
   */
  medie?: boolean
}

/**
 * Sceglie un momento, o nessuno, senza lasciare la pagina: in quella delle
 * valutazioni diventa quel che si guarda; altrove (l'ora, i recuperi) resta
 * nel contesto e la griglia lo evidenzia.
 */
export function scegliMomento (valutazioneId: string | null): void {
  const qui = postoCorrente()
  if (qui.pagina !== 'pagina.corso.valutazioni') {
    vai(qui, { contesto: { valutazioneId }, elementoChiesto: false })
    return
  }
  const corsoId = stato.contesto.corsoId
  vai(
    valutazioneId
      ? { pagina: qui.pagina, soggetto: { tipo: 'valutazione', id: valutazioneId } }
      : corsoId
        ? { pagina: qui.pagina, soggetto: { tipo: 'corso', id: corsoId } }
        : { pagina: qui.pagina },
    { contesto: { valutazioneId }, elementoChiesto: valutazioneId !== null },
  )
}

/**
 * Una casella della griglia. Le proprietà sono tutte valori semplici: con
 * duecento prove e quaranta persone un voto scritto ridisegna la pagina, e le
 * caselle che non cambiano non si rifanno.
 */
const CellaVoto = memo(function CellaVoto (p: {
  momentoId: string
  allievoId: string
  mostrato: string
  insufficiente: boolean
  assente: boolean
  mancava: boolean
  riga: number
  colonna: number
  etichetta: string
  titolo: string
  lista: string
  virtuale: string
  indiceVirtuale: string
  chiave?: string
  colonnaAria?: number
  /** Il titolo della «R», o `null` se il voto non viene da un recupero. */
  recupero: string | null
  dispensato: boolean
  alTasto: (evento: KeyboardEvent<HTMLInputElement>) => void
}): ReactElement {
  const t = testi()
  const [errata, lampeggia] = useLampo()

  const cambia = async (elemento: HTMLInputElement): Promise<void> => {
    const letto = leggiCasella(elemento.value)
    if (!letto) {
      // Il valore battuto resta nel campo, invece di tornare al voto di prima: il
      // fuoco è già sulla riga dopo quando arriva il `change`. Come per le date in
      // `components/base.tsx`.
      lampeggia()
      notifica(t.nonEUnVoto(elemento.value), 'errore')
      return
    }
    const risposta = await azione({
      tipo: 'voto.imposta',
      valutazioneId: p.momentoId,
      allievoId: p.allievoId,
      valore: letto.valore,
      assente: letto.assente,
    })
    if (!risposta.ok) {
      elemento.value = p.mostrato
      lampeggia()
    }
  }

  return (
    // Il posto della «R» resta anche senza lettera, per tenere incolonnate le cifre.
    <td
      className="tabella__cella tabella__cella--voto"
      data-virtuale={p.virtuale}
      data-virtuale-indice={p.indiceVirtuale}
      data-chiave={p.chiave}
      aria-colindex={p.colonnaAria}
    >
      {/* I tre pezzi in un contenitore e non sulla cella: una `td` in flex smette di
          essere una cella di tabella. */}
      <div className="cella-voto__riga">
        <Input
          className={classi(
            'cella-voto',
            p.insufficiente && 'cella-voto--insufficiente',
            p.assente && 'cella-voto--assente',
            p.mancava && 'cella-voto--mancava',
            errata && 'cella-voto--errata',
          )}
          type="text"
          valore={p.mostrato}
          placeholder={p.mancava ? SIGLA_ASSENTE : ''}
          data-riga={p.riga}
          data-colonna={p.colonna}
          // testo-fisso: chiave del fuoco, non si legge
          data-fuoco={`voto-${p.momentoId}-${p.allievoId}`}
          aria-label={p.etichetta}
          title={p.titolo}
          inputMode="decimal"
          list={p.lista}
          onKeyDown={p.alTasto}
          onCambio={(evento) => { void cambia(evento.target as HTMLInputElement) }}
        />
        {/* La «R» accanto alla casella e non dentro, dove andrebbe cancellata; il posto
            resta anche senza lettera. */}
        <span
          className={classi(
            'cella-voto__tag',
            p.recupero === null && 'cella-voto__tag--vuoto',
            p.dispensato && 'cella-voto__tag--dispensato',
          )}
          aria-hidden={p.recupero === null ? 'true' : 'false'}
          title={p.recupero ?? ''}
        >
          {t.siglaRecupero}
        </span>
      </div>
    </td>
  )
})

function GrigliaVoti ({ classe, momenti, opzioni }: {
  classe: Classe
  momenti: MomentoValutazione[]
  opzioni: OpzioniGriglia
}): ReactElement {
  const medie = opzioni.medie !== false
  const scelti = opzioni.soloAllievi ? new Set(opzioni.soloAllievi) : null
  const allievi = ordinaAllievi(allieviAttivi(classe)).filter(
    (allievo) => scelti === null || scelti.has(allievo.id),
  )
  /**
   * La scala su cui leggere media e nota. Ogni momento ha la sua scala, copiata
   * alla creazione, e quella del registro può essere cambiata: si usa quella dei
   * momenti se è una sola. Con scale diverse la media resta indicativa e la nota
   * non si scrive.
   */
  const scaleInUso = [...new Map(momenti.map((m) => [
    `${m.scala.min}-${m.scala.max}-${m.scala.sufficienza}-${m.scala.passo}`,
    m.scala,
  ])).values()]
  const scala = scaleInUso.length === 1 ? scaleInUso[0] : stato.registro.impostazioni.scala
  const scaleMescolate = scaleInUso.length > 1
  // Il passo con cui la media diventa nota di pagella: una regola della scuola,
  // nelle impostazioni.
  const passoNota = stato.registro.impostazioni.passoFineSemestre
  const t = testi()
  const L = lessico()
  // testo-fisso: chiave della memoria di scorrimento, non si legge
  const chiaveScorrimento = `voti:${stato.corsoId ?? ''}:${stato.semestreId ?? ''}`
  const medieDi = new Map(allievi.map((allievo) => [allievo.id, mediaAllievo(momenti, allievo.id).media]))
  // Le colonne a finestra (`components/virtualList.tsx`): con duecento prove
  // la griglia intera costava secondi a ogni voto scritto.
  const colonneFisse = medie ? 3 : 1
  const f = useFinestra({
    chiave: `${chiaveScorrimento}:${medie ? 'medie' : 'prove'}`,
    conto: momenti.length,
    orizzontale: true,
    // La larghezza di una colonna di prova disegnata: una casella e la «R».
    stima: () => LARGHEZZA_COLONNA,
    chiaveDi: (indice) => momenti[indice].id,
    // Una colonna sono quaranta caselle: la finestra conviene presto, e ai
    // lati basta poco.
    soglia: SOGLIA_COLONNE,
    oltre: 2,
  })
  // Gli elenchi dei voti, uno per colonna e unici nella pagina: la griglia può
  // comparire più volte (l'ora, i recuperi, le riconsegne).
  const base = useId().replace(/[^\w-]/g, '')
  // testo-fisso: id dell'elenco, non si legge
  const idElenco = (momento: MomentoValutazione) => `voti-${base}-${momento.id}`

  // L'ultima finestra disegnata: la tastiera ci porta le colonne non ancora in vista.
  const vista = useRef<Finestra>(f)
  vista.current = f

  // La navigazione da foglio di calcolo, sulle caselle. Una funzione sola per
  // tutto il disegno, così le caselle che non cambiano non si rifanno.
  const alTasto = useCallback((evento: KeyboardEvent<HTMLInputElement>) => {
    const bersaglio = evento.currentTarget
    const griglia = bersaglio.closest('table')
    if (!griglia || !bersaglio.dataset.riga) return
    const finestra = vista.current
    const riga = Number(bersaglio.dataset.riga)
    const colonna = Number(bersaglio.dataset.colonna)

    // Tab e Maiusc+Tab da una casella all'altra, solo con la finestra: le
    // colonne non disegnate il browser non le conosce. A un capo della
    // griglia Tab esce come sempre.
    if (evento.key === 'Tab' && finestra.attiva) {
      const avanti = !evento.shiftKey
      const [dopoRiga, dopoColonna] = avanti
        ? colonna + 1 < finestra.conto ? [riga, colonna + 1] : [riga + 1, 0]
        : colonna > 0 ? [riga, colonna - 1] : [riga - 1, finestra.conto - 1]
      if (spostaFuoco(griglia, dopoRiga, dopoColonna, finestra)) evento.preventDefault()
      return
    }

    const passi: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      Enter: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const passo = passi[evento.key]
    if (!passo) return
    // Frecce orizzontali dentro un campo con testo: si sta muovendo il cursore.
    if ((evento.key === 'ArrowLeft' || evento.key === 'ArrowRight') && bersaglio.value.length > 0) {
      const inizio = bersaglio.selectionStart ?? 0
      if (evento.key === 'ArrowLeft' && inizio > 0) return
      if (evento.key === 'ArrowRight' && inizio < bersaglio.value.length) return
    }
    evento.preventDefault()

    // Il bersaglio si cerca prima di lasciare questo campo, o Invio sull'ultima
    // riga perderebbe il fuoco. A fine colonna si passa in cima a quella dopo.
    if (!spostaFuoco(griglia, riga + passo[0], colonna + passo[1], finestra) && passo[0] > 0) {
      spostaFuoco(griglia, 0, colonna + passo[1] + 1, finestra)
    }
    // Il `blur` sempre, anche senza dove andare: `preventDefault` ha tolto a Invio
    // il suo effetto, e senza `change` un ridisegno perderebbe la cifra.
    bersaglio.blur()
  }, [])

  /** Le celle delle prove in una riga, con i vuoti al posto di quelle fuori vista. */
  const colonne = (
    cella: (momento: MomentoValutazione, indice: number) => ReactElement,
    come: 'th' | 'td',
    primo = false,
  ): ReactElement[] =>
    f.pezzi.map((pezzo, n) => pezzo.indice === undefined
      ? (
          <Vuoto
            // testo-fisso: chiave di React, non si legge
            key={`vuoto-${n}`}
            come={come}
            misura={pezzo.vuoto}
            orizzontale
            classe="tabella__vuoto"
            {...(primo && n === 0 ? f.inizio : {})}
          />
        )
      : cella(momenti[pezzo.indice], pezzo.indice))

  /** `aria-colindex` di una colonna di prova, solo se la tabella è a finestra. */
  const posto = (indice: number) => f.attiva ? indice + 2 : undefined
  const ultima = f.attiva ? momenti.length + 2 : undefined
  const dopoUltima = f.attiva ? momenti.length + 3 : undefined
  const prima = f.attiva ? 1 : undefined

  const intestazione = (
    <>
      <th className="tabella__nome" scope="col" aria-colindex={prima}>{Uno(L.pif)}</th>
      {colonne((momento, indice) => (
        <th
          key={f.chiave(indice)}
          className={classi('tabella__momento', stato.valutazioneId === momento.id && 'tabella__momento--scelto')}
          scope="col"
          {...f.testata(indice)}
          aria-colindex={posto(indice)}
        >
          <Collegamento
            titolo={t.titoloMomento(momento.titolo, formattaData(momento.data), momento.peso)}
            al={() => scegliMomento(momento.id)}
            testo={(
              <>
                <span className="tabella__momento-titolo">{momento.titolo}</span>
                <small>{`${formattaData(momento.data, 'corto')}${momento.peso !== 1 ? ` ×${momento.peso}` : ''}`}</small>
              </>
            )}
          />
          {/* Un elenco di voti per colonna, non per casella: con quaranta righe
              sarebbero quaranta copie uguali. */}
          <ElencoVoti id={idElenco(momento)} scala={momento.scala} sigleInPiu={SIGLA_ASSENTE} />
        </th>
      ), 'th', true)}
      {/* Due colonne: la media è il conto, la nota è quel che va in pagella. */}
      {/* Ferme a destra come il nome a sinistra (`lists.css`): con molte prove la
          media resta in vista accanto ai voti che scorrono. */}
      {medie ? <th className="tabella__media" scope="col" aria-colindex={ultima}>{Uno(L.media)}</th> : null}
      {medie ? <th className="tabella__media tabella__nota" scope="col" aria-colindex={dopoUltima}>{corto(L.nota)}</th> : null}
    </>
  )

  /** La nota di fine semestre di una media, o perché non c'è. */
  const notaDi = (media: number | null): ReactElement => {
    if (scaleMescolate) return <span className="testo-quieto" title={t.scaleDiverse}>≠</span>
    const nota = notaFineSemestre(media, scala, passoNota)
    return nota === null
      ? <span className="testo-quieto">—</span>
      : <Pastiglia testo={formattaVoto(nota)} tono={nota >= scala.sufficienza ? 'positivo' : 'negativo'} />
  }

  const righe = allievi.map((allievo, indiceRiga) => {
    const media = medieDi.get(allievo.id) ?? null
    const nome = nomeCompleto(allievo)
    return (
      <tr key={allievo.id}>
        {/* `th` di riga: lo schermo vocale dice di chi è il voto. */}
        <th className="tabella__nome" scope="row" aria-colindex={prima}>
          <CellaNome persona={allievo} nome={nome} />
        </th>
        {colonne((momento, indiceColonna) => {
          const voto = momento.voti.find((v) => v.allievoId === allievo.id)
          const mostrato = voto?.assente
            ? SIGLA_ASSENTE
            : voto?.valore === null || voto?.valore === undefined
              ? ''
              : String(voto.valore)
          // Casella vuota ma assente all'appello: lo si mostra.
          const mancava = mostrato === '' && assenteAllOra(stato.registro, momento, allievo.id)
          const insufficiente =
            typeof voto?.valore === 'number' && !voto.assente && voto.valore < momento.scala.sufficienza
          // La riga nella tabella dei recuperi: il voto non è della giornata della prova.
          const recupero = rigaDelRecupero(momento, allievo.id)
          const dati = f.voce(indiceColonna)
          return (
            <CellaVoto
              key={f.chiave(indiceColonna)}
              momentoId={momento.id}
              allievoId={allievo.id}
              mostrato={mostrato}
              insufficiente={insufficiente}
              assente={Boolean(voto?.assente)}
              mancava={mancava}
              riga={indiceRiga}
              colonna={indiceColonna}
              etichetta={`${nome} — ${momento.titolo}`}
              titolo={mancava ? t.assenteAllAppello : voto?.nota ?? ''}
              lista={idElenco(momento)}
              virtuale={dati['data-virtuale']}
              indiceVirtuale={dati['data-virtuale-indice']}
              chiave={dati['data-chiave']}
              colonnaAria={posto(indiceColonna)}
              recupero={!recupero
                ? null
                : recupero.dispensato
                  ? t.nonSiRecupera
                  : recupero.previstoIl
                    ? t.recuperoDel(formattaData(recupero.previstoIl, 'giorno')) +
                      (recupero.nota ? ` · ${recupero.nota}` : '')
                    : t.recuperoDaFissare}
              dispensato={Boolean(recupero?.dispensato)}
              alTasto={alTasto}
            />
          )
        }, 'td')}
        {medie
          ? (
              <td className="tabella__media" aria-colindex={ultima}>
                <span className="testo-quieto">{media === null ? '—' : formattaVoto(media)}</span>
              </td>
            )
          : null}
        {medie ? <td className="tabella__media tabella__nota" aria-colindex={dopoUltima}>{notaDi(media)}</td> : null}
      </tr>
    )
  })

  const piede = (
    <>
      <th className="tabella__nome" scope="row">{t.mediaDellaClasse}</th>
      {colonne((momento, indice) => {
        const media = mediaMomento(momento)
        return (
          <td key={f.chiave(indice)} className="tabella__cella tabella__cella--totale" {...f.voce(indice)}>
            {media === null ? '—' : formattaVoto(media)}
          </td>
        )
      }, 'td')}
      {/* Due celle vuote in coda (media e nota): il piede ha la media di ogni prova,
          non di ogni allievo. */}
      {medie ? <td className="tabella__media" /> : null}
      {medie ? <td className="tabella__media tabella__nota" /> : null}
    </>
  )

  // Con memoria di scorrimento: ogni voto scritto ridisegna la tabella.
  return (
    <Tabella
      variante="voti"
      griglia
      scorrimento={chiaveScorrimento}
      // Dove la catena di telaio arriva fin qui (la pagina delle valutazioni),
      // un voto scritto non ferma lo scorrimento in corsa.
      telaio="voti"
      attr={{ 'aria-colcount': f.attiva ? momenti.length + colonneFisse : undefined }}
      intestazione={intestazione}
      righe={righe}
      piede={piede}
    />
  )
}

export function grigliaVoti (
  classe: Classe,
  momenti: MomentoValutazione[],
  opzioni: OpzioniGriglia = {},
): ReactElement {
  return <GrigliaVoti classe={classe} momenti={momenti} opzioni={opzioni} />
}
