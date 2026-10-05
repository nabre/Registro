// I piani lezione: la libreria delle scalette.
// Un piano non appartiene a una lezione: si prepara una volta e si assegna a
// più ore, anche di classi diverse. La scaletta si vede come striscia di tempo,
// per capire subito se le attività stanno nell'ora. Fra le ore del corso si va
// col navigatore in testata (`plansNavigator.tsx`); il piano prende tutta la
// larghezza.

import {
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  attivitaConPendenza,
  attivitaValutata,
  colonneCheckDi,
  conColonnaCheck,
  verificaColonna,
} from '#core/dominio/activities.js'
import {
  avanzamentoConsegna,
  consegneDelCorso,
  scadenzaConsegna,
} from '#core/dominio/assignments.js'
import { checkDelCorso } from '#core/dominio/check.js'
import { confrontaLezioni, udDaMinutiAttivita } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import { creaAttivita, creaPiano } from '#core/dominio/factories.js'
import type { Attivita, Consegna, Corso, Lezione, MomentoValutazione, PianoLezione } from '#core/dominio/models.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { testi } from './plans.testi.js'
import {
  Avviso,
  Collegamento,
  Pastiglia,
  Pulsante,
  Scheda,
  StatoVuoto,
  TestataVista,
} from '#ui/components/base.js'
import { notifica } from '#ui/components/notifications.js'
import { StatoVuotoAnno } from '#ui/components/filters.js'
import { corsoDelContesto } from '#ui/context.js'
import { Icona } from '#ui/components/icons.js'
import { DataDiLezione } from '#ui/components/lessonDate.js'
import { editorPiano, moduloAnno, moduloAssegnaPiano } from '#ui/forms.js'
import { azione, invia } from '#ui/bridge.js'
import { apriMomento } from '#ui/calendarNavigation.js'
import {
  annoCorrente,
  classeDelCorsoId,
  classeDiMomento,
  lezioneDiPiano,
  lezionePerId,
  nomeClasseDiLezione,
  nomeDiLezione,
  pianoPerId,
  stato,
  vai,
} from '#ui/state.js'
import { apriLezione } from '#ui/pages.js'
import { telaioVista } from '#ui/viewFrame.js'
import { navigatorePiani, oreDelCorso, pianiSciolti, pianiSenzaCorso } from './plansNavigator.js'

/**
 * Quanto vale un'unità didattica quando il piano non sta su nessun'ora: il
 * cambio lo dà il documento.
 */
function minutiPerUd (): number {
  return stato.registro.impostazioni.minutiUd
}

/**
 * Apre nella pagina dei piani la scaletta scelta con l'ora accanto; senza
 * scaletta, l'ora del corso che ne aspetta una. Com'era con `aggiorna`: il
 * giorno e il semestre li porta solo la scaletta chiesta per nome.
 */
function apriNeiPiani (pianoId: string | null, lezione: Lezione | null = null): void {
  const oraAccanto = lezione ? { lezioneId: lezione.id } : {}
  if (pianoId) {
    vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: pianoId } }, { contesto: oraAccanto })
    return
  }
  const corsoId = lezione?.corsoId ?? stato.contesto.corsoId
  vai(
    corsoId
      ? { pagina: 'pagina.corso.piani', soggetto: { tipo: 'corso', id: corsoId } }
      : { pagina: 'pagina.corso.piani' },
    { contesto: { pianoId: null, ...oraAccanto }, elementoChiesto: false },
  )
}

/** Il corso di cui si guardano i piani: quello della tendina in cima, come nella vista Corsi. */
function corsoScelto (): Corso | null {
  return corsoDelContesto()
}

/**
 * L'editor del piano aperto, tenuto vivo fra un disegno e l'altro: si
 * costruisce una volta per piano e resta nella pagina, così non si perde quel
 * che si sta scrivendo. Si tiene solo se il piano arrivato è uno che conosce
 * (quello di partenza o uno che ha mandato lui) o se ci si sta scrivendo;
 * altrimenti il piano è cambiato altrove e l'editor si rifà, perché `componi()`
 * rimanderebbe la scaletta vecchia. Un editor rifatto ha un numero nuovo nella
 * chiave di React, così non prende il posto del vecchio.
 */
let inLavorazione: {
  pianoId: string
  lezioneId: string | null
  numero: number
  /** Il contenitore nella pagina, per sapere se ci si sta scrivendo. */
  corpo: HTMLElement | null
  noti: Set<string>
} | null = null

/** Quanti editor si sono costruiti: il numero nella chiave dell'ultimo. */
let editorCostruiti = 0

/** I legami col check in corso, uno dopo l'altro (`inserisciAttivitaCheck`). */
let legamiDelCheck: Promise<void> = Promise.resolve()

/**
 * Il piano ridotto a quel che l'editor scrive, per riconoscerlo: senza i timbri
 * dell'host e con le chiavi in ordine, perché l'host può riordinarle.
 */
function impronta (piano: PianoLezione): string {
  const ordinato = (valore: unknown): unknown =>
    Array.isArray(valore)
      ? valore.map(ordinato)
      : valore && typeof valore === 'object'
        ? Object.fromEntries(
            Object.keys(valore)
              .sort()
              .map((k) => [k, ordinato((valore as Record<string, unknown>)[k])]),
          )
        : valore
  return JSON.stringify(ordinato({ ...piano, creatoIl: '', aggiornatoIl: '' }))
}

/** Scorda l'editor tenuto da parte: il piano che modificava non c'è più. */
export function scordaEditorDelPiano (): void {
  inLavorazione = null
}

/**
 * La chiave dell'editor per il piano e l'ora che la pagina ha davanti: la
 * stessa finché l'editor si tiene, nuova quando va rifatto.
 */
function chiaveEditor (piano: PianoLezione, lezione: Lezione | null): string {
  const lezioneId = lezione?.id ?? null
  const tenuto = inLavorazione?.pianoId === piano.id &&
    inLavorazione.lezioneId === lezioneId &&
    (Boolean(inLavorazione.corpo?.contains(document.activeElement)) ||
      inLavorazione.noti.has(impronta(piano)))
  if (!tenuto || !inLavorazione) {
    inLavorazione = {
      pianoId: piano.id, lezioneId, numero: ++editorCostruiti, corpo: null, noti: new Set([impronta(piano)]),
    }
  }
  // testo-fisso: chiave dell'editor, non si legge
  return `piano:${piano.id}:${inLavorazione.numero}`
}

/**
 * Salva da sé a ogni modifica confermata (campo lasciato, tappa spostata),
 * come il registro dell'ora. Gli errori non passano da `azione` (niente
 * notifica rossa: un piano a metà è normale); restano scritti sopra i campi
 * finché valgono, e quel che l'host rifiuta resta nei campi. Il piano arriva
 * a ogni disegno, ma l'editor lo legge solo nascendo: chi lo cambia altrove
 * cambia la chiave (`chiaveEditor`).
 */
function EditorDelPiano ({ piano, lezione }: { piano: PianoLezione, lezione: Lezione | null }): ReactElement {
  const [errori, impostaErrori] = useState<string[] | null>(null)
  const corpo = useRef<HTMLDivElement | null>(null)
  const [editor] = useState(() => editorPiano({
    piano,
    lezione,
    // Il corso lo dice la tendina in cima: qui è solo da leggere.
    corsoDettato: true,
    allaModifica: () => {
      void salvaOra()
    },
  }))

  const salvaOra = async (): Promise<void> => {
    // Tolto altrove mentre era aperto: salvarlo adesso lo farebbe rinascere.
    if (!pianoPerId(editor.base.id)) {
      impostaErrori([testi().toltoAltrove])
      return
    }
    const mandato = editor.componi()
    if (inLavorazione && inLavorazione.corpo === corpo.current) inLavorazione.noti.add(impronta(mandato))
    const risposta = await invia({ tipo: 'piano.salva', piano: mandato })
    impostaErrori(risposta.ok ? null : risposta.errori ?? [testi().nonSalvato])
  }

  return (
    <div
      className="piano-editor"
      ref={(nodo) => {
        corpo.current = nodo
        if (nodo && inLavorazione?.pianoId === editor.base.id) inLavorazione.corpo = nodo
      }}
    >
      <div>
        {errori
          ? (
              <Avviso tono="attenzione">
                <ul className="elenco-avviso">{errori.map((e) => <li key={e}>{e}</li>)}</ul>
              </Avviso>
            )
          : null}
      </div>
      {editor.corpo}
    </div>
  )
}

/**
 * I momenti nati da questo piano: quelli che lo dichiarano, più quelli attaccati
 * a una lezione che lo usa (momenti creati prima del legame).
 */
function momentiDelPiano (piano: PianoLezione): MomentoValutazione[] {
  const lezioni = new Set(
    stato.registro.lezioni.filter((l) => l.pianoId === piano.id).map((l) => l.id),
  )
  return stato.registro.valutazioni
    .filter((v) => v.pianoId === piano.id || (v.lezioneId !== null && lezioni.has(v.lezioneId)))
    .sort((a, b) => b.data.localeCompare(a.data))
}

/** Dove questo piano si ritrova: le ore che lo usano e i voti che ne sono usciti. */
function collegamentiDelPiano (piano: PianoLezione): ReactNode {
  const usiInLezioni = stato.registro.lezioni
    .filter((l) => l.pianoId === piano.id)
    .sort((a, b) => b.data.localeCompare(a.data))
  const momenti = momentiDelPiano(piano)
  if (usiInLezioni.length <= 1 && momenti.length === 0) return null

  const valutate = new Set(momenti.map((m) => m.lezioneId))
  // Il piano prevede almeno una prova: serve a segnare le ore che non ce l'hanno ancora.
  const conProva = piano.attivita.some(attivitaValutata)
  const t = testi()

  return (
    <Scheda titolo={t.doveFinisce}>
      <div>
        {usiInLezioni.length > 1
          ? (
              <section className="blocco-testo" aria-labelledby="piano-usi">
                <h4 id="piano-usi">{t.usatoNelleLezioni}</h4>
                <ul className="elenco-collegamenti">
                  {usiInLezioni.slice(0, 12).map((lezione) => (
                    <li key={lezione.id} className="elenco-collegamenti__voce">
                      <Collegamento
                        testo={<><DataDiLezione iso={lezione.data} />{` · ${nomeClasseDiLezione(lezione)}`}</>}
                        al={() => apriLezione(lezione.id)}
                      />
                      {/* Prova prevista e non ancora fatta in quell'ora: lo si dice. Il momento
                          nasce dalla tappa dentro la lezione, non da qui. */}
                      {conProva && !valutate.has(lezione.id)
                        ? <Pastiglia testo={t.provaDaFare} tono="attenzione" simbolo="valutazioni" />
                        : null}
                    </li>
                  ))}
                </ul>
              </section>
            )
          : null}
        {momenti.length > 0
          ? (
              <section className="blocco-testo" aria-labelledby="piano-valutazioni">
                <h4 id="piano-valutazioni">{t.valutazioniUscite}</h4>
                <ul className="elenco-collegamenti">
                  {momenti.slice(0, 12).map((momento) => (
                    <li key={momento.id} className="elenco-collegamenti__voce">
                      <Collegamento
                        testo={
                          `${formattaData(momento.data)} · ` +
                          `${classeDiMomento(momento)?.nome ?? t.senzaClasse} — ${momento.titolo}`
                        }
                        al={() => apriMomento(momento)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )
          : null}
      </div>
    </Scheda>
  )
}

/**
 * Strumenti del corso collegabili al piano: le pendenze aperte e le colonne del
 * check, con la possibilità di inserirle al volo nella scaletta come attività dedicata.
 */
function pannelloPendenzeECheckPiano (piano: PianoLezione, lezione: Lezione | null): ReactNode {
  const corsoId = piano.corsoId ?? lezione?.corsoId ?? null
  if (!corsoId) return null
  const corso = stato.registro.corsi.find((c) => c.id === corsoId)
  if (!corso) return null

  const classe = classeDelCorsoId(corsoId)
  const consegne = consegneDelCorso(stato.registro, corsoId)
  const pendenzeAperte = consegne.filter((c) => !avanzamentoConsegna(c, classe).completa)
  const check = checkDelCorso(stato.registro, corsoId)
  const colonneCheck = check?.colonne ?? []

  if (pendenzeAperte.length === 0 && colonneCheck.length === 0) return null

  const t = testi()
  const perUd = minutiPerUd()

  const inserisciAttivitaPendenza = async (c: Consegna): Promise<void> => {
    const nuova = creaAttivita(t.ritiroConsegna(c.testo), udDaMinutiAttivita(5, perUd))
    nuova.tipo = 'compito'
    nuova.parametri = { consegnaId: c.id }
    scordaEditorDelPiano()
    const aggiornato: PianoLezione = {
      ...piano,
      attivita: [...piano.attivita, nuova],
    }
    const risposta = await invia({ tipo: 'piano.salva', piano: aggiornato })
    if (risposta.ok) {
      notifica(t.inseritaInScaletta(c.testo), 'successo')
    }
  }

  // Il check si verifica in un momento solo dell'ora: se la scaletta ha già una
  // tappa che ne verifica una colonna, le altre si legano a quella invece di
  // aggiungere una tappa per colonna.
  const tappaDelCheckDi = (p: PianoLezione): Attivita | null =>
    p.attivita.find((a) => colonneCheckDi(a).length > 0) ?? null
  const tappaDelCheck = tappaDelCheckDi(piano)
  const titoloDelCheck = (colonne: string[]): string =>
    t.verificaCheck(
      colonne.map((id) => colonneCheck.find((c) => c.id === id)?.titolo ?? id).join(', '),
    )

  // In fila, e col piano com'è al proprio turno: due clic su due colonne prima
  // del ridisegno non si cancellano a vicenda (`piano.salva` scrive il piano intero).
  const inserisciAttivitaCheck = (colonnaId: string, colonnaTitolo: string): Promise<void> => {
    legamiDelCheck = legamiDelCheck.then(() => legaAlCheck(colonnaId, colonnaTitolo), () => undefined)
    return legamiDelCheck
  }

  const legaAlCheck = async (colonnaId: string, colonnaTitolo: string): Promise<void> => {
    const attuale = stato.registro.piani.find((p) => p.id === piano.id) ?? piano
    const tappaDelCheck = tappaDelCheckDi(attuale)
    let attivita: Attivita[]
    let avviso: string
    if (tappaDelCheck) {
      const legata = conColonnaCheck(tappaDelCheck, colonnaId)
      // Il titolo scritto dal programma segue le colonne; uno scritto a mano resta.
      if (tappaDelCheck.titolo === titoloDelCheck(colonneCheckDi(tappaDelCheck))) {
        legata.titolo = titoloDelCheck(colonneCheckDi(legata))
      }
      attivita = attuale.attivita.map((a) => (a.id === tappaDelCheck.id ? legata : a))
      avviso = t.legataAllaTappa(colonnaTitolo, legata.titolo)
    } else {
      const nuova = creaAttivita(t.verificaCheck(colonnaTitolo), udDaMinutiAttivita(5, perUd))
      nuova.tipo = 'verifica'
      nuova.parametri = { checkColonnaId: colonnaId }
      attivita = [...attuale.attivita, nuova]
      avviso = t.inseritaInScaletta(colonnaTitolo)
    }
    scordaEditorDelPiano()
    const risposta = await invia({ tipo: 'piano.salva', piano: { ...attuale, attivita } })
    if (risposta.ok) notifica(avviso, 'successo')
  }

  return (
    <Scheda titolo={t.strumentiCollegati} sottotitolo={t.spazioInScaletta}>
      <div className="strumenti-piano">
        {pendenzeAperte.length > 0
          ? (
              <section className="blocco-testo" aria-labelledby="piano-pendenze">
                <h4 id="piano-pendenze">{t.pendenzeDelCorso}</h4>
                <ul className="elenco-collegamenti">
                  {pendenzeAperte.map((c) => {
                    const avanzamento = avanzamentoConsegna(c, classe)
                    const giaCollegata = piano.attivita.some((a) => {
                      const p = attivitaConPendenza(a)
                      return p === c.id || p === 'tutte'
                    })
                    const scadenza = scadenzaConsegna(stato.registro, c)
                    return (
                      <li key={c.id} className="elenco-collegamenti__voce strumenti-piano__riga">
                        <div className="strumenti-piano__info">
                          <Icona nome="allegato" classe="icona--minuta" />
                          <strong>{c.testo}</strong>
                          <Pastiglia testo={`${avanzamento.fatte}/${avanzamento.destinatari.length}`} tono="quiete" />
                          {scadenza ? <Pastiglia testo={formattaData(scadenza, 'giorno')} tono="attenzione" /> : null}
                        </div>
                        {giaCollegata
                          ? <Pastiglia testo={t.giaInScaletta} tono="positivo" />
                          : (
                              <Pulsante
                                testo={t.inserisciNellaScaletta}
                                simbolo="piu"
                                variante="sottile"
                                al={() => {
                                  void inserisciAttivitaPendenza(c)
                                }}
                              />
                            )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          : null}
        {colonneCheck.length > 0
          ? (
              <section className="blocco-testo" aria-labelledby="piano-check">
                <h4 id="piano-check">{t.checkDelCorso}</h4>
                <ul className="elenco-collegamenti">
                  {colonneCheck.map((col) => {
                    const giaCollegata = piano.attivita.some((a) => verificaColonna(a, col.id))
                    return (
                      <li key={col.id} className="elenco-collegamenti__voce strumenti-piano__riga">
                        <div className="strumenti-piano__info">
                          <Icona nome="spunta" classe="icona--minuta" />
                          <strong>{col.titolo}</strong>
                        </div>
                        {giaCollegata
                          ? <Pastiglia testo={t.giaInScaletta} tono="positivo" />
                          : (
                              <Pulsante
                                testo={tappaDelCheck ? t.legaAllaTappa : t.inserisciNellaScaletta}
                                simbolo={tappaDelCheck ? 'collegamento' : 'piu'}
                                variante="sottile"
                                titolo={tappaDelCheck ? t.legaAllaTappaTitolo(tappaDelCheck.titolo) : undefined}
                                al={() => inserisciAttivitaCheck(col.id, col.titolo)}
                              />
                            )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          : null}
      </div>
    </Scheda>
  )
}

/** La colonna del piano aperto: l'editor e gli strumenti collegati. */
function dettaglioPiano (piano: PianoLezione, lezione: Lezione | null): ReactElement {
  const t = testi()
  // Il corso e la data li dicono già la tendina e il navigatore sopra: qui
  // basta il nome dell'ora, su una riga.
  const titolo = lezione ? nomeDiLezione(lezione) : lezioneDiPiano(piano)

  return (
    <div className="colonna">
      {/* Niente pulsanti: duplicare, eliminare e andare al registro sono comandi della pagina. */}
      <Scheda
        classe="piano-scheda"
        titolo={titolo}
        aiuto={t.aiutoPiano}
        azioni={(
          <span className="piano-scheda__salvataggio">
            <Icona nome="spunta" classe="icona--minuta" />
            {t.siSalva}
          </span>
        )}
      >
        <EditorDelPiano key={chiaveEditor(piano, lezione)} piano={piano} lezione={lezione} />
      </Scheda>
      {pannelloPendenzeECheckPiano(piano, lezione)}
      {collegamentiDelPiano(piano)}
    </div>
  )
}


/**
 * Il piano che la pagina ha davanti: quello aperto o, senza scelta, il primo
 * (la prima ora preparata, poi la prima bozza). Esportato perché i comandi della
 * barra agiscono su questo, e `stato.pianoId` da solo non basta.
 */
export function pianoMostrato (): PianoLezione | null {
  const corso = corsoScelto()
  if (corso) {
    const perPianoId = pianoPerId(stato.pianoId)
    if (perPianoId && perPianoId.corsoId === corso.id) {
      return perPianoId
    }
    if (stato.lezioneId) {
      const l = lezionePerId(stato.lezioneId)
      if (l && l.corsoId === corso.id) {
        return l.pianoId ? (pianoPerId(l.pianoId) ?? null) : null
      }
    }
    const delCorso = [
      ...oreDelCorso(corso).map((l) => pianoPerId(l.pianoId)),
      ...pianiSciolti(corso),
    ].find((x): x is PianoLezione => x !== null)
    if (delCorso) return delCorso
  }
  return pianoPerId(stato.pianoId) ?? pianiSenzaCorso()[0] ?? null
}

/**
 * La prima ora, in ordine di giorno, su cui questo piano sta: è dove porta
 * «vai al registro» quando il piano è assegnato a più ore.
 */
export function primaOraDelPiano (piano: PianoLezione): Lezione | null {
  // `confrontaLezioni` ordina anche per ora d'inizio, come il calendario: così
  // «la prima» è la stessa ovunque.
  return (
    stato.registro.lezioni
      .filter((l) => l.pianoId === piano.id)
      .sort(confrontaLezioni)[0] ?? null
  )
}

/**
 * Un piano vuoto per l'ora, nato sul suo corso e subito assegnato: si scrive
 * nella pagina, come ogni piano. Due passi, come «Nuovo per la lezione» nella
 * scelta del piano.
 */
async function creaPianoPerLOra (lezione: Lezione): Promise<void> {
  const piano = creaPiano(lezione.corsoId)
  const creato = await azione({ tipo: 'piano.salva', piano })
  if (!creato.ok) return
  const assegnato = await azione({ tipo: 'piano.assegna', lezioneId: lezione.id, pianoId: piano.id })
  if (!assegnato.ok) return
  notifica(testi().creatoEAssegnato, 'successo')
  apriNeiPiani(piano.id, lezione)
}

export function vistaPiani (): ReactElement {
  return <VistaPiani />
}

function VistaPiani (): ReactElement {
  const anno = annoCorrente()
  if (!anno) {
    return <StatoVuotoAnno simbolo="piano" crea={() => moduloAnno()} />
  }

  const corso = corsoScelto()
  const ore = corso ? oreDelCorso(corso) : []
  const piano = pianoMostrato()

  // L'ora che la pagina ha davanti: quella chiesta, se porta il piano aperto (o
  // nessuno), se no la prima che lo usa. Un piano che nessuna ora usa non ne ha.
  const chiesta = stato.lezioneId ? ore.find((l) => l.id === stato.lezioneId) ?? null : null
  const lezioneAttiva: Lezione | null = piano
    ? (chiesta?.pianoId === piano.id ? chiesta : ore.find((l) => l.pianoId === piano.id) ?? null)
    : chiesta ?? ore.find((l) => !l.pianoId && l.stato !== 'annullata') ?? ore[0] ?? null

  // Le ore che aspettano ancora una scaletta, contate in testata.
  const daPreparare = ore.filter((l) => !l.pianoId && l.stato !== 'annullata').length
  const t = testi()
  return (
    <div className="vista vista--piani" data-telaio={telaioVista()}>
      <TestataVista
        titolo={Molti(lessico().pianoLezione)}
        sottotitolo={
          !corso
            ? t.nessunCorsoDaPreparare
            : daPreparare > 0
              ? t.senzaScaletta(daPreparare)
              : t.tutteConScaletta
        }
        contorno={corso
          ? navigatorePiani({ corso, lezioneAttiva, pianoAttivo: piano, apri: apriNeiPiani })
          : null}
      />
      {piano
        ? dettaglioPiano(piano, lezioneAttiva)
        : (
            <div className="colonna">
              <StatoVuoto
                simbolo="piano"
                titolo={t.nessunPiano}
                testo={lezioneAttiva
                  ? t.nessunPianoLezione(nomeDiLezione(lezioneAttiva))
                  : t.nessunPianoTesto}
                azione={lezioneAttiva
                  ? (
                      <>
                        <Pulsante
                          testo={t.creaPiano}
                          variante="primario"
                          simbolo="piu"
                          al={() => creaPianoPerLOra(lezioneAttiva)}
                        />
                        <Pulsante
                          testo={t.assegnaPiano}
                          variante="sottile"
                          simbolo="piano"
                          al={() => moduloAssegnaPiano(lezioneAttiva)}
                        />
                      </>
                    )
                  : undefined}
              />
            </div>
          )}
    </div>
  )
}
