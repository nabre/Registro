// Quel che ogni modulo rifà, scritto una volta: mandare l'azione con gli errori
// in cima al modulo, chiedere conferma prima di cancellare, riempire le
// tendine di classi e corsi, riordinare le righe trascinandole.

import {
  useCallback,
  useLayoutEffect,
  useReducer,
  useRef,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react'

import { tipiDiAttivita } from '#core/dominio/activities.js'
import { type VoceLista } from '#core/dominio/lists.js'
import type {
  AnnoScolastico,
  CategoriaDocumento,
  Consegna,
  Fascicolo,
  Iso,
  Lezione,
  Osservazione,
  Ricorrenza,
} from '#core/dominio/models.js'
import { formattaData, giorniLunghi } from '#core/dominio/dates.js'
import { confrontaNomi } from '#core/dominio/text.js'
import { Maiuscola } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import { Campo, Pulsante, type OpzioneSelezione, type OpzioniCampo } from '#ui/components/base.js'
import { conferma, type ContestoModale } from '#ui/components/modal.js'
import { notifica } from '#ui/components/notifications.js'
import { invia } from '#ui/bridge.js'
import { annoCorrente, classePerId, corsiDi, iscriviti, stato } from '#ui/state.js'
import { corsiDellAnno } from '#core/dominio/courses.js'
import { eliminazione, occupazione, type Bersaglio } from '#core/dominio/deletions.js'

import { testi } from './common.testi.js'

export const testo = (valore: unknown): string => String(valore ?? '').trim()

/**
 * Un numero da un campo del modulo, con un predefinito quando il campo è
 * vuoto: `Number('')` vale zero, e svuotare un campo non deve azzerarlo.
 */
export const numero = (valore: unknown, predefinito: number): number => {
  if (valore === '' || valore === null || valore === undefined) return predefinito
  // La virgola vale come punto: «1,5» è quel che si batte.
  const scritto = typeof valore === 'string' ? valore.trim().replace(',', '.') : valore
  // Il vuoto non è uno zero.
  if (scritto === '') return predefinito
  const n = Number(scritto)
  return Number.isFinite(n) ? n : predefinito
}

/** La guardia dei moduli che senza anno scolastico non avrebbero a chi appendersi. */
export function richiedeAnno (seNonCe: () => void): AnnoScolastico | null {
  const anno = annoCorrente()
  if (anno) return anno
  notifica(testi().primaLAnno, 'avviso')
  seNonCe()
  return null
}

/**
 * La base da salvare in un modulo di modifica: l'entità com'è adesso, non la
 * fotografia dell'apertura (il modulo vive fuori dal ridisegno, e rimandare la
 * fotografia riscriverebbe campi cambiati altrove, o farebbe rinascere
 * un'entità tolta). Se non c'è più lo dice in cima al modulo e torna `null`.
 * Per un'entità nuova la base è quella del modulo.
 */
export function baseViva<T> (
  contesto: ContestoModale,
  modifica: boolean,
  base: T,
  attuale: T | null | undefined,
  tolta = testi().toltaAltrove,
): T | null {
  if (!modifica) return base
  if (attuale) return attuale
  contesto.mostraErrori([tolta])
  return null
}

/**
 * Manda l'azione dal modulo aperto: occupato finché torna, errori in cima se
 * non passa. Rende la risposta, o `null` se gli errori sono già mostrati o se
 * nel frattempo la finestra è stata chiusa (chi chiama non fa altro).
 */
export async function inviaDalModulo (
  contesto: ContestoModale,
  azione: Parameters<typeof invia>[0],
  ripiego = testi().nonRiuscito,
): Promise<Awaited<ReturnType<typeof invia>> | null> {
  contesto.occupato(true)
  let risposta
  try {
    risposta = await invia(azione)
  } finally {
    contesto.occupato(false)
  }
  if (!contesto.aperta()) return null
  if (!risposta.ok) {
    contesto.mostraErrori(risposta.errori ?? [ripiego])
    return null
  }
  return risposta
}

/** Manda l'azione, e se non passa rimette gli errori in cima al modulo. */
export async function salva (
  contesto: ContestoModale,
  azione: Parameters<typeof invia>[0],
  messaggio: string,
  /**
   * Che cosa fare dopo, con l'id di quel che è nato. Può essere asincrona, e
   * `salva` la aspetta: i suoi errori hanno così qualcuno a cui arrivare.
   */
  dopo?: (idCreato: string | null) => void | Promise<void>,
): Promise<void> {
  const risposta = await inviaDalModulo(contesto, azione, testi().salvataggioNonRiuscito)
  if (!risposta) return
  contesto.chiudi()
  notifica(messaggio, 'successo')
  await dopo?.(risposta.creato?.id ?? null)
}

/**
 * Il cestino di un bersaglio, da stendere su un pulsante o una voce di menu:
 * spento e col motivo se qualcosa lo occupa, acceso col suo titolo se no. Chi
 * sia occupato lo decide il dominio (`occupazione`), lo stesso che poi rifiuta.
 */
export function cestinoPer (
  bersaglio: Bersaglio,
  titolo?: string,
): { disabilitato: boolean, titolo: string | undefined } {
  const occupato = occupazione(stato.registro, bersaglio)
  return occupato ? { disabilitato: true, titolo: occupato.motivo } : { disabilitato: false, titolo }
}

/**
 * La domanda prima di eliminare, con quel che l'eliminazione si porta via
 * davvero («12 lezioni con l'appello, 5 momenti con 60 voti»): il registro non
 * rifiuta di cancellare quel che è libero, avvisa. L'elenco lo calcola il
 * dominio, lo stesso che poi esegue.
 */
export async function chiediEliminazione (bersaglio: Bersaglio): Promise<boolean> {
  const t = testi()
  // Un cestino acceso da una fotografia vecchia: nel frattempo la cosa si è occupata.
  const occupato = occupazione(stato.registro, bersaglio)
  if (occupato) {
    notifica(occupato.motivo, 'avviso')
    return false
  }
  const piano = eliminazione(stato.registro, bersaglio)
  if (!piano) {
    notifica(t.nienteDaEliminare, 'avviso')
    return false
  }

  const elenco = (voci: string[]) => voci.map((v) => `• ${v}`).join('\n')
  const parti = [
    piano.perdite.length > 0
      ? t.seNeVaAnche(elenco(piano.perdite))
      : t.nienteAltro,
    piano.staccati.length > 0 ? t.restaStaccato(elenco(piano.staccati)) : null,
    piano.invece,
  ].filter((riga): riga is string => Boolean(riga))

  return conferma({
    titolo: t.eliminare(piano.nome),
    testo: parti.join('\n\n'),
    testoConferma: parole().elimina,
    pericolo: true,
  })
}

export interface OpzioniTastoElimina {
  contesto: ContestoModale
  chiedi: Bersaglio | { titolo: string, testo: string, testoConferma?: string }
  azione: Parameters<typeof invia>[0]
  /** Che cosa si dice dopo: «Lezione eliminata.» */
  fatto: string
  /** L'etichetta, quando «Elimina» non è la parola giusta. */
  etichetta?: string
  /** Da fare dopo, di solito staccare la vista da quel che non c'è più. */
  poi?: () => void
}

/**
 * Il tasto «Elimina» in fondo a una modale: domanda, azione, errori in cima,
 * notifica. La domanda viene da un `Bersaglio` (l'elenco lo fa il dominio) o
 * da un testo scritto a mano.
 */
export function TastoElimina (opzioni: OpzioniTastoElimina): ReactElement {
  const cestino = 'genere' in opzioni.chiedi ? cestinoPer(opzioni.chiedi) : null
  return (
    <Pulsante
      testo={opzioni.etichetta ?? parole().elimina}
      simbolo="cestino"
      variante="pericolo"
      disabilitato={cestino?.disabilitato}
      titolo={cestino?.titolo}
      al={async () => {
        const sicuro =
          'genere' in opzioni.chiedi
            ? await chiediEliminazione(opzioni.chiedi)
            : await conferma({ ...opzioni.chiedi, pericolo: true })
        if (!sicuro) return
        if (!(await inviaDalModulo(opzioni.contesto, opzioni.azione))) return
        opzioni.contesto.chiudi()
        opzioni.poi?.()
        notifica(opzioni.fatto, 'info')
      }}
    />
  )
}

/** `<TastoElimina>` per chi lo vuole da una chiamata. */
export function tastoElimina (opzioni: OpzioniTastoElimina): ReactElement {
  return <TastoElimina {...opzioni} />
}

export interface OpzioniTastoDuplica {
  contesto: ContestoModale
  azione: Parameters<typeof invia>[0]
  /** Che cosa si dice dopo: «Piano duplicato.» */
  fatto: string
  etichetta?: string
  /** Da fare con l'id del duplicato: di solito aprirsi lì. */
  poi?: (idCreato: string) => void
}

/** Il gemello di `TastoElimina`, per la duplicazione: stessa attesa, stessi errori mostrati. */
export function TastoDuplica (opzioni: OpzioniTastoDuplica): ReactElement {
  return (
    <Pulsante
      testo={opzioni.etichetta ?? parole().duplica}
      simbolo="duplica"
      variante="sottile"
      al={async () => {
        const risposta = await inviaDalModulo(opzioni.contesto, opzioni.azione)
        if (!risposta) return
        opzioni.contesto.chiudi()
        notifica(opzioni.fatto, 'successo')
        if (risposta.creato) opzioni.poi?.(risposta.creato.id)
      }}
    />
  )
}

/** `<TastoDuplica>` per chi lo vuole da una chiamata. */
export function tastoDuplica (opzioni: OpzioniTastoDuplica): ReactElement {
  return <TastoDuplica {...opzioni} />
}

/**
 * Le voci di una tendina da un elenco del lessico: il valore che si salva e la
 * parola che si legge, nell'ordine in cui il lessico le scrive.
 */
function vociDa<T extends string> (
  nomi: Readonly<Record<T, string>>,
): Array<{ valore: T; testo: string }> {
  return (Object.keys(nomi) as T[]).map((valore) => ({ valore, testo: nomi[valore] }))
}

/** I giorni della settimana per le tendine dell'orario: 1 = lunedì, come vuole l'ISO 8601. */
export function vociGiornoSettimana (): OpzioneSelezione[] {
  return giorniLunghi().map((nome, i) => ({ valore: String(i + 1), testo: Maiuscola(nome) }))
}

/** I tipi di attività di un piano lezione, nell'ordine scelto dalla scuola. */
export function vociTipoAttivita (): VoceLista[] {
  return tipiDiAttivita(stato.registro.impostazioni)
}

/** I tipi di osservazione sull'andamento di una persona in formazione o della classe. */
export const VOCI_TIPO_OSSERVAZIONE: Array<{ valore: Osservazione['tipo']; testo: string }> =
  vociDa(lessico().tipiOsservazione)

/** Gli stati di un'ora di lezione. */
export const VOCI_STATO_LEZIONE: Array<{ valore: Lezione['stato']; testo: string }> =
  vociDa(lessico().statiLezione)

/** I tipi di consegna. */
export const VOCI_TIPO_CONSEGNA: Array<{ valore: Consegna['tipo']; testo: string }> =
  vociDa(lessico().tipiConsegna)

/**
 * Aspetta lo stato nuovo con dentro quel che si è appena creato: la risposta
 * all'azione arriva prima, e una tendina riempita subito non troverebbe la voce.
 */
function alloStatoNuovo (pronto: () => boolean, poi: () => void): void {
  if (pronto()) {
    poi()
    return
  }
  // Un tetto ai tentativi, se la voce non arriva mai.
  let rimasti = 20
  const smetti = iscriviti(() => {
    if (!pronto()) {
      rimasti -= 1
      if (rimasti <= 0) smetti()
      return
    }
    smetti()
    poi()
  })
}

export interface OpzioniCampoCollegato {
  nome: string
  etichetta: string
  valore: string
  aiuto?: string
  richiesto?: boolean
  /** Spenta, col «+» accanto: si legge e non si cambia. */
  disabilitato?: boolean
  larghezza?: OpzioniCampo['larghezza']
  /** La voce di testa, quando la scelta può restare vuota. */
  vuoto?: string
  voci: () => OpzioneSelezione[]
  titoloNuovo: string
  /** Apre il modulo che crea la voce mancante, e richiama con l'id creato. */
  apriNuovo: (fatto: (id: string) => void) => void
  al?: (valore: string) => void
  /** Riceve il modo di rifare l'elenco: serve alle tendine che dipendono da un'altra. */
  riferimento?: (rinfresca: (scelto?: string) => void) => void
  /** Una riga dentro il riquadro, sotto la tendina (`sotto` di `Campo`). */
  sotto?: ReactNode
}

/**
 * Una tendina col «+» che crea al volo la voce che manca: senza lasciare il
 * modulo, e la scelta passa da sola sulla voce nuova.
 */
export function CampoCollegato (opzioni: OpzioniCampoCollegato): ReactElement {
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  const piu = useRef<HTMLButtonElement | null>(null)
  /** La scelta da mettere dopo il prossimo disegno, con le voci già nuove. */
  const daScegliere = useRef<{ valore: string | undefined } | null>(null)

  const voci = (): OpzioneSelezione[] => [
    ...(opzioni.vuoto === undefined ? [] : [{ valore: '', testo: opzioni.vuoto }]),
    ...opzioni.voci(),
  ]

  const rinfresca = useCallback((scelto?: string) => {
    daScegliere.current = { valore: scelto }
    rifai()
  }, [])

  useLayoutEffect(() => {
    opzioni.riferimento?.(rinfresca)
  })

  // Dopo i figli: `Select` ha già messo le voci nuove, qui si sceglie e si avvisa.
  useLayoutEffect(() => {
    const chiesta = daScegliere.current
    // La tendina sta accanto al «+», nello stesso gruppo di `Campo`.
    const campo = piu.current?.parentElement?.querySelector('select')
    if (!chiesta || !campo) return
    daScegliere.current = null
    const valore = chiesta.valore ?? campo.value
    campo.value = voci().some((v) => v.valore === valore) ? valore : ''
    // Con `bubbles`, perché chi ascolta su un contenitore più in alto se ne
    // accorga; è anche il `change` che fa tenere la scelta a `Select`.
    campo.dispatchEvent(new Event('change', { bubbles: true }))
  })

  return (
    <Campo
      nome={opzioni.nome}
      etichetta={opzioni.etichetta}
      tipo="select"
      valore={opzioni.valore}
      opzioni={voci()}
      aiuto={opzioni.aiuto}
      richiesto={opzioni.richiesto}
      disabilitato={opzioni.disabilitato}
      larghezza={opzioni.larghezza}
      al={opzioni.al ? (valore) => opzioni.al?.(valore) : undefined}
      sotto={opzioni.sotto}
      azione={(
        <Pulsante
          ref={piu}
          simbolo="piu"
          variante="sottile"
          titolo={opzioni.titoloNuovo}
          disabilitato={opzioni.disabilitato}
          al={() =>
            opzioni.apriNuovo((idCreato) =>
              alloStatoNuovo(
                () => opzioni.voci().some((v) => v.valore === idCreato),
                () => rinfresca(idCreato),
              ),
            )}
        />
      )}
    />
  )
}

/** `<CampoCollegato>` per chi lo vuole da una chiamata. */
/** Le materie del registro come opzioni di una tendina. */
export function opzioniMaterie () {
  return [...stato.registro.materie]
    .sort((a, b) => confrontaNomi(a.nome, b.nome))
    .map((m) => ({ valore: m.id, testo: m.sigla ? `${m.nome} (${m.sigla})` : m.nome }))
}

/** I corsi che si possono scegliere per una lezione: quelli dell'anno, classi archiviate escluse. */
export function opzioniCorsi () {
  const anno = annoCorrente()
  return corsiDellAnno(stato.registro, anno?.id ?? null)
    .filter((corso) => !classePerId(corso.classeId)?.archiviata)
    .map((corso) => ({ valore: corso.id, testo: corso.titolo }))
    .sort((a, b) => confrontaNomi(a.testo, b.testo))
}

/** Il corso da proporre quando non ne arriva uno: quello del filtro, o il primo. */
export function corsoProposto (classeId?: string): string {
  const opzioni = opzioniCorsi()
  const preferita = classeId ?? stato.filtroClasseId
  if (preferita) {
    const suo = corsiDi(preferita)[0]
    if (suo && opzioni.some((o) => o.valore === suo.id)) return suo.id
  }
  return opzioni[0]?.valore ?? ''
}

/**
 * Il corso da cui partire, dato quel che passa chi chiama: un id che non è di
 * nessun corso ricade sulla proposta, invece di arrivare al salvataggio
 * agganciato al nulla.
 */
export function corsoBuono (suggerito?: string): string {
  if (suggerito && stato.registro.corsi.some((c) => c.id === suggerito)) return suggerito
  return corsoProposto()
}

/** Il campo con questo nome dentro un contenitore: al posto di ripetere il selettore ovunque serva leggerlo o scriverlo a mano. */
export function campoDi<T extends HTMLElement = HTMLInputElement> (
  contenitore: ParentNode,
  nome: string,
): T | null {
  return contenitore.querySelector<T>(`[name="${nome}"]`)
}

/** Le spunte dei recapiti fissi di una classe: le stesse in ogni modulo che manda qualcosa «anche a». */
export function campiRecapiti (
  fascicolo: Fascicolo,
  scelti: string[],
  disabilitato = false,
): ReactElement[] {
  return fascicolo.recapiti.map((recapito) => (
    <Campo
      key={recapito.id}
      // testo-fisso: il nome del campo, lo rilegge recapitiScelti
      nome={`recapito-${recapito.id}`}
      tipo="checkbox"
      etichetta={recapito.etichetta}
      valore={scelti.includes(recapito.id)}
      disabilitato={disabilitato}
      larghezza="quarto"
    />
  ))
}

/** Quali recapiti sono spuntati, letti dai valori del modulo. */
export function recapitiScelti (
  fascicolo: Fascicolo,
  valori: Record<string, string | number | boolean>,
): string[] {
  return fascicolo.recapiti.filter((r) => Boolean(valori[`recapito-${r.id}`])).map((r) => r.id)
}

/**
 * Applica un orario a un corso: lo salva e, se chiesto, genera le lezioni,
 * leggendo davvero l'esito delle due chiamate.
 */
export async function applicaOrario (
  corsoId: string,
  orario: Ricorrenza[],
  genera: boolean,
  dal: string,
  al: string,
): Promise<{ ok: boolean, errori?: string[] }> {
  if (orario.length === 0) return { ok: true }
  const impostato = await invia({ tipo: 'orario.imposta', corsoId, orario })
  if (!impostato.ok) return { ok: false, errori: impostato.errori }
  if (!genera) return { ok: true }
  const generato = await invia({ tipo: 'orario.genera', corsoId, dal, al })
  return { ok: generato.ok, errori: generato.errori }
}


const chiaviDiVoce = new WeakMap<object, number>()
let ultimaChiave = 0

/**
 * Una chiave di lista per una voce che un id suo non l'ha ancora (una riga
 * appena aggiunta, con l'id vuoto finché non la salva l'host): l'oggetto stesso,
 * che le righe tengono in mano finché la finestra è aperta.
 */
export function chiaveDi (voce: object): number {
  let chiave = chiaviDiVoce.get(voce)
  if (chiave === undefined) {
    ultimaChiave += 1
    chiave = ultimaChiave
    chiaviDiVoce.set(voce, chiave)
  }
  return chiave
}

/** Lo stesso elenco con la voce che sta in `da` portata in `a`. */
export function spostaVoce<T> (elenco: T[], da: number, a: number): T[] {
  if (a < 0 || a >= elenco.length || da === a) return elenco
  const copia = [...elenco]
  const [voce] = copia.splice(da, 1)
  copia.splice(a, 0, voce)
  return copia
}

/** Quel che `useRiordino` stende su una riga. */
export interface AttributiRiga {
  'data-riordina': ''
  onDragStart: (evento: DragEvent<HTMLElement>) => void
  onDragOver: (evento: DragEvent<HTMLElement>) => void
  onDragLeave: (evento: DragEvent<HTMLElement>) => void
  onDrop: (evento: DragEvent<HTMLElement>) => void
  onDragEnd: (evento: DragEvent<HTMLElement>) => void
}

/** Quel che `useRiordino` stende sulla presa (`<PresaDiRiga>`). */
export interface AttributiPresa {
  onPointerDown: (evento: PointerEvent<HTMLElement>) => void
  onPointerUp: (evento: PointerEvent<HTMLElement>) => void
  onKeyDown: (evento: KeyboardEvent<HTMLElement>) => void
}

/**
 * Righe che si riordinano trascinandole dalla presa: `draggable` si accende
 * solo sotto il dito, perché sulla riga intera toglierebbe il mouse ai campi.
 * `dragover` non legge quel che viaggia, quindi la riga di partenza sta qui. La
 * presa è un pulsante: con ↑ e ↓ fa lo stesso da tastiera. Le classi
 * (`riga-in-viaggio`, `riga-posa-*`) valgono per ogni elenco riordinabile.
 *
 * `elenco` va come `ref` sul contenitore delle righe, `riga(i)` su ogni riga
 * (figlia diretta del contenitore), `presa(i)` sulla sua `<PresaDiRiga>`. Dopo
 * uno spostamento il fuoco torna da sé sulla presa della riga spostata: il
 * gesto continua (spostando il nodo, il browser gli toglie il fuoco).
 */
export function useRiordino (
  /** Sposta la riga `da` in `a`; `false` se lo spostamento non si fa (il fuoco resta). */
  posa: (da: number, a: number) => void | boolean,
): {
  elenco: (nodo: HTMLElement | null) => void
  riga: (indice: number) => AttributiRiga
  presa: (indice: number) => AttributiPresa
} {
  const partenza = useRef<number | null>(null)
  const contenitore = useRef<HTMLElement | null>(null)
  const daFocalizzare = useRef<number | null>(null)
  const elenco = useCallback((nodo: HTMLElement | null) => { contenitore.current = nodo }, [])

  // Dopo il disegno con l'ordine nuovo.
  useLayoutEffect(() => {
    const indice = daFocalizzare.current
    if (indice === null || !contenitore.current) return
    daFocalizzare.current = null
    fuocoSullaPresa(contenitore.current, indice)
  })

  const sposta = (da: number, a: number) => {
    const quante = contenitore.current?.children.length ?? 0
    if (a >= 0 && a < quante && da !== a) daFocalizzare.current = a
    if (posa(da, a) === false) daFocalizzare.current = null
  }

  const pulisci = (viva: HTMLElement) => {
    partenza.current = null
    for (const riga of (viva.parentElement ?? contenitore.current)?.children ?? []) {
      riga.classList.remove('riga-in-viaggio', 'riga-posa-sopra', 'riga-posa-sotto')
    }
  }
  const suaRiga = (evento: { currentTarget: EventTarget }) =>
    (evento.currentTarget as HTMLElement).closest<HTMLElement>('[data-riordina]') ??
    (evento.currentTarget as HTMLElement)

  return {
    elenco,
    riga: (indice) => ({
      'data-riordina': '',
      onDragStart: (evento) => {
        partenza.current = indice
        suaRiga(evento).classList.add('riga-in-viaggio')
        evento.dataTransfer.effectAllowed = 'move'
        // Un contenuto ci vuole, o il trascinamento non parte.
        evento.dataTransfer.setData('text/plain', String(indice))
      },
      onDragOver: (evento) => {
        if (partenza.current === null || partenza.current === indice) return
        evento.preventDefault()
        evento.dataTransfer.dropEffect = 'move'
        suaRiga(evento).classList.add(partenza.current < indice ? 'riga-posa-sotto' : 'riga-posa-sopra')
      },
      onDragLeave: (evento) => {
        suaRiga(evento).classList.remove('riga-posa-sopra', 'riga-posa-sotto')
      },
      onDrop: (evento) => {
        evento.preventDefault()
        const da = partenza.current
        const viva = suaRiga(evento)
        pulisci(viva)
        viva.draggable = false
        if (da !== null) sposta(da, indice)
      },
      onDragEnd: (evento) => {
        const viva = suaRiga(evento)
        pulisci(viva)
        viva.draggable = false
      },
    }),
    presa: (indice) => ({
      onPointerDown: (evento) => { suaRiga(evento).draggable = true },
      onPointerUp: (evento) => { suaRiga(evento).draggable = false },
      onKeyDown: (evento) => {
        const verso = evento.key === 'ArrowUp' ? -1 : evento.key === 'ArrowDown' ? 1 : 0
        if (verso === 0) return
        evento.preventDefault()
        sposta(indice, indice + verso)
      },
    }),
  }
}

/** Rimette il fuoco sulla presa della riga in `indice`: il gesto continua. */
function fuocoSullaPresa (righe: HTMLElement, indice: number): void {
  righe.children[indice]?.querySelector<HTMLElement>('.presa-riga')?.focus()
}

/** Quel che una presa riceve: i gesti di `useRiordino`, e come nasconderla. */
type OpzioniPresa = Partial<AttributiPresa> & { style?: CSSProperties, tabIndex?: number }

/** La presa a cui si afferra una riga per rimetterla in ordine; i gesti li dà `useRiordino`. */
export function PresaDiRiga (gesti: OpzioniPresa): ReactElement {
  return (
    <Pulsante
      {...gesti}
      simbolo="presa"
      variante="fantasma"
      classe="presa-riga"
      titolo={testi().presaDiRiga}
    />
  )
}

export const VOCI_CATEGORIA_DOCUMENTO: Array<{ valore: CategoriaDocumento; testo: string }> =
  vociDa(lessico().categorieDocumento)

/**
 * Riscrive una data in un campo già disegnato, quando la corregge il registro
 * (un «al» prima del «dal»): aggiorna l'ISO nascosto e la forma leggibile.
 */
export function scriviData (campoData: HTMLElement, iso: Iso): void {
  const nascosto = campoData.querySelector<HTMLInputElement>('input[type="hidden"]')
  const visibile = campoData.querySelector<HTMLInputElement>('input[type="text"]')
  if (nascosto) nascosto.value = iso
  if (visibile) visibile.value = formattaData(iso)
}

