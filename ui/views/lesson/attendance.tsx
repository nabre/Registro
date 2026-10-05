// L'appello dell'ora: la matrice delle presenze, persone in riga e unità
// didattiche in colonna, con il pulsante che gira gli stati a ogni clic e il
// menu che li nomina tutti a pressione lunga.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent as EventoFuoco,
  type KeyboardEvent as EventoTastiera,
  type ReactElement,
} from 'react'

import {
  SIGLE_PRESENZA,
  allieviAttivi,
  ammetteRitardo,
  minutiRitardoUd,
  nomeCompleto,
  ordinaAllievi,
  riepilogaPresenze,
  segnato,
  statiAllineati,
  unitaDidattiche,
} from '#core/dominio/calculations.js'
import { Uno, corto } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { minuscolo } from '#core/i18n/index.js'
import type { Allievo, Lezione, StatoPresenza } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { Pulsante, Scheda, StatoVuoto } from '#ui/components/base.js'
import { Icona } from '#ui/components/icons.js'
import { eseguiOAvvisa } from '#ui/components/filters.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { menuContestuale } from '#ui/components/menu.js'
import { conferma } from '#ui/components/modal.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import type { Risposta } from '#contract/protocol.js'
import { classeDiLezione, stato as statoPannello, vai } from '#ui/state.js'
import { testi } from './attendance.testi.js'

/**
 * Gli stati dell'appello, nell'ordine in cui il pulsante li gira. Si parte da
 * «–» (non detto), che distingue un appello mai cominciato da uno con tutti
 * presenti; poi presente, assente, ritardo, esonero, e di nuovo «–».
 */
const STATI = SIGLE_PRESENZA

const SIGLE = new Map(STATI.map((v) => [v.valore, v.sigla]))
// Le parole dell'appello nella lingua della pagina: le sigle restano quelle.
const NOMI = new Map(STATI.map((v) => [v.valore, lessico().presenze[v.valore]]))

/** Gli stati che una casella offre: senza ritardo dove non si può arrivare tardi. */
function statiDi (conRitardo: boolean): typeof STATI {
  return conRitardo ? STATI : STATI.filter((v) => v.valore !== 'ritardo')
}

/** Lo stato dopo questo, girando in tondo fra quelli offerti. */
function prossimoStato (stato: StatoPresenza, conRitardo = true): StatoPresenza {
  const giro = statiDi(conRitardo)
  const posto = STATI.findIndex((v) => v.valore === stato)
  // Il seguente nel giro completo che la casella offre: da una «R» già scritta
  // dove non va si prosegue come se ci fosse.
  for (let passo = 1; passo <= STATI.length; passo++) {
    const candidato = STATI[(posto + passo) % STATI.length]
    if (giro.includes(candidato)) return candidato.valore
  }
  return 'non-impostato'
}

/** Lo stato di un gruppo di caselle se è uno solo; nullo se sono mescolate. */
function statoUniforme (stati: StatoPresenza[]): StatoPresenza | null {
  const primo = stati[0]
  if (primo === undefined) return null
  return stati.every((s) => s === primo) ? primo : null
}

/** Quanto va tenuto premuto un pulsante prima che si apra il menu, in ms. */
const PRESSIONE_LUNGA = 450

/**
 * Il menu degli stati, a pressione lunga: si sceglie lo stato per nome senza
 * girare il pulsante. La spunta segna quello di adesso.
 */
function menuStati (
  evento: MouseEvent,
  attuale: StatoPresenza | null,
  conRitardo: boolean,
  al: (stato: StatoPresenza) => void,
): void {
  menuContestuale(
    evento,
    statiDi(conRitardo).map((v) => ({
      testo: `${v.sigla} — ${NOMI.get(v.valore) ?? v.nome}`,
      simbolo: v.valore === attuale ? ('spunta' as const) : undefined,
      al: () => al(v.valore),
    })),
  )
}

/**
 * Lo stato che ogni casella ha mandato e non ha ancora visto tornare. `stato`
 * resta quello del disegno finché l'host non rispinge il registro, e un
 * secondo clic rapido (anche nello stesso giro, prima che React ridisegni)
 * ricalcolerebbe lo stesso stato del primo: si riparte da quel che si è
 * mandato. Vale anche per le caselle di riga e di colonna. Sta nel modulo:
 * sopravvive al cambio di pagina con un clic in volo.
 */
const inVolo = statoInVolo<StatoPresenza>()

/** Una casella dell'appello: il clic gira lo stato, pressione lunga e tasto destro aprono il menu. */
function PulsanteStato (opzioni: {
  stato: StatoPresenza | null
  titolo: string
  fuoco: string
  /** Il nome della casella fra due disegni, per lo stato in volo; di norma `fuoco`. */
  chiave?: string
  classe?: string
  /** Falso dove non si può arrivare in ritardo: il giro e il menu saltano «R». */
  conRitardo?: boolean
  al: (prossimo: StatoPresenza) => Promise<Risposta>
}): ReactElement {
  const { stato, titolo, fuoco, classe, conRitardo = true, al } = opzioni
  const chiave = opzioni.chiave ?? fuoco

  // Pressione lunga e clic partono dallo stesso tocco: se il tempo arriva in
  // fondo si apre il menu e il clic che segue è marcato come speso, così la
  // casella non gira. Il marchio si azzera al tocco dopo. Riferimenti e non
  // stato: li leggono i gestori dello stesso gesto.
  const attesa = useRef<number | null>(null)
  const clicSpeso = useRef(false)
  const [premuto, impostaPremuto] = useState(false)

  useEffect(() => () => {
    if (attesa.current !== null) clearTimeout(attesa.current)
  }, [])

  /** Lo stato da cui parte un gesto: quello in volo, o il disegnato. */
  const attuale = (): StatoPresenza | null => inVolo.da(chiave, stato)
  const manda = (prossimo: StatoPresenza): void => {
    void inVolo.manda(chiave, prossimo, () => al(prossimo))
  }

  const fermaAttesa = (): void => {
    if (attesa.current !== null) {
      clearTimeout(attesa.current)
      attesa.current = null
    }
    impostaPremuto(false)
  }

  return (
    <button
      className={classi(
        'stato-presenza',
        // testo-fisso: classe CSS
        stato ? `stato-presenza--${stato}` : 'stato-presenza--misto',
        classe,
        premuto && 'stato-presenza--premuto',
      )}
      type="button"
      data-fuoco={fuoco}
      title={testi().suggerimento(
        titolo,
        (stato ? NOMI.get(stato) : undefined) ?? testi().misto,
        minuscolo(NOMI.get(prossimoStato(stato ?? 'non-impostato', conRitardo)) ?? ''),
      )}
      aria-label={titolo}
      aria-haspopup="menu"
      // Nessuna rotella: l'appello si fa a raffica e la conferma è la lettera che
      // cambia al disegno.
      onClick={() => {
        if (clicSpeso.current) {
          clicSpeso.current = false
          return
        }
        manda(prossimoStato(attuale() ?? 'non-impostato', conRitardo))
      }}
      onPointerDown={(evento) => {
        clicSpeso.current = false
        if (evento.button !== 0) return
        fermaAttesa()
        impostaPremuto(true)
        const nativo = evento.nativeEvent
        attesa.current = window.setTimeout(() => {
          attesa.current = null
          clicSpeso.current = true
          impostaPremuto(false)
          menuStati(nativo, attuale(), conRitardo, manda)
        }, PRESSIONE_LUNGA)
      }}
      onPointerUp={fermaAttesa}
      onPointerLeave={fermaAttesa}
      onPointerCancel={fermaAttesa}
      // Il tasto destro apre lo stesso menu.
      onContextMenu={(evento) => {
        fermaAttesa()
        clicSpeso.current = true
        menuStati(evento.nativeEvent, attuale(), conRitardo, manda)
      }}
    >
      {stato ? SIGLE.get(stato) ?? '?' : '·'}
    </button>
  )
}

/**
 * Minuti e nota di una riga, mandati da soli: rimandare tutta
 * `presenze.imposta` con gli allievi attivi cancellerebbe l'appello di chi si
 * è ritirato.
 */
async function scriviRiga (
  lezione: Lezione,
  allievoId: string,
  campi: { ud?: number; minuti?: number; nota?: string },
): Promise<void> {
  await azione({ tipo: 'presenze.campi', lezioneId: lezione.id, allievoId, ...campi })
}

/**
 * Un campo che sta chiuso dietro un pulsante e si apre al clic, preso il
 * fuoco. Uscendone si richiude se `chiudi` lo dice: la tabella resta stretta
 * finché non c'è niente da scrivere. Aperto o chiuso è dello stato del
 * componente, come prima era del nodo.
 *
 * Chiuso con Invio o Esc, il fuoco torna sul pulsante che prende il posto del
 * campo: altrimenti il campo sparisce col fuoco dentro e la tastiera riparte
 * dal fondo della pagina.
 */
function useApribile (chiudi: (campo: HTMLInputElement) => boolean) {
  const [aperto, impostaAperto] = useState(false)
  const campo = useRef<HTMLInputElement | null>(null)
  const pulsante = useRef<HTMLButtonElement | null>(null)
  const daSelezionare = useRef(false)
  const daRifocalizzare = useRef(false)
  useEffect(() => {
    if (!aperto && daRifocalizzare.current) {
      daRifocalizzare.current = false
      pulsante.current?.focus()
      return
    }
    if (!aperto || !daSelezionare.current || !campo.current) return
    daSelezionare.current = false
    campo.current.focus()
    campo.current.select()
  }, [aperto])
  const richiudi = useCallback(() => impostaAperto(false), [])
  return {
    aperto,
    campo,
    pulsante,
    apri: () => {
      daSelezionare.current = true
      impostaAperto(true)
    },
    richiudi,
    gesti: {
      onBlur: (evento: EventoFuoco<HTMLInputElement>) => {
        if (chiudi(evento.currentTarget)) impostaAperto(false)
      },
      onKeyDown: (evento: EventoTastiera<HTMLInputElement>) => {
        const el = evento.currentTarget
        if (evento.key === 'Enter') {
          // L'uscita manda il `change`; se il campo resta aperto (una nota
          // scritta) il fuoco ci torna subito, già salvato. Senza
          // `preventDefault` il tasto arriverebbe al pulsante appena preso il
          // fuoco e riaprirebbe il campo.
          evento.preventDefault()
          const resta = !chiudi(el)
          daRifocalizzare.current = !resta
          el.blur()
          if (resta) el.focus()
        }
        if (evento.key === 'Escape') {
          daRifocalizzare.current = true
          impostaAperto(false)
        }
      },
    },
  }
}

/**
 * I minuti di ritardo di una casella, in apice sul suo pulsante: «+» finché
 * non sono detti, poi il numero. Al clic diventa il campo; uscendo si torna
 * all'apice, e il disegno porta il numero nuovo.
 */
function ApiceMinuti ({ minuti, titolo, fuoco, al }: {
  minuti: number
  titolo: string
  fuoco: string
  al: (minuti: number) => void
}): ReactElement {
  const { aperto, campo, pulsante, apri, gesti } = useApribile(() => true)
  if (aperto) {
    return (
      <Input
        ref={campo}
        className="campo__controllo campo__controllo--minuti appello__apice-campo"
        type="number"
        valore={minuti > 0 ? String(minuti) : ''}
        data-fuoco={fuoco}
        // Senza passo: con un passo il browser rifiuterebbe i sette minuti.
        min={0}
        max={600}
        step="any"
        aria-label={titolo}
        onCambio={(evento) => {
          const scritti = Number((evento.target as HTMLInputElement).value)
          al(Number.isFinite(scritti) ? Math.max(0, Math.round(scritti)) : 0)
        }}
        {...gesti}
      />
    )
  }
  return (
    <button
      ref={pulsante}
      className={classi('appello__apice', minuti > 0 && 'appello__apice--detto')}
      type="button"
      data-fuoco={fuoco}
      title={titolo}
      aria-label={titolo}
      onClick={apri}
    >
      {/* testo-fisso: i minuti con il loro segno */}
      {minuti > 0 ? `${minuti}′` : <Icona nome="piu" />}
    </button>
  )
}

/**
 * La nota di una riga: un «+» finché è vuota, il campo quando c'è. Aperto e
 * lasciato vuoto, al primo clic fuori torna «+».
 */
function CampoNota ({ nota, titolo, segnaposto, fuoco, al }: {
  nota: string
  titolo: string
  segnaposto: string
  fuoco: string
  al: (nota: string) => void
}): ReactElement {
  const { aperto, campo, pulsante, apri, richiudi, gesti } =
    useApribile((aperta) => !aperta.value.trim())
  // Aperta e lasciata con un testo resta aperta; se poi la nota si svuota da
  // fuori (annulla, un'altra lezione nella stessa riga) torna «+», salvo che
  // la si stia scrivendo.
  useEffect(() => {
    if (!nota && campo.current !== document.activeElement) richiudi()
  }, [nota, campo, richiudi])
  if (nota || aperto) {
    return (
      <Input
        ref={campo}
        className="campo__controllo"
        type="text"
        valore={nota}
        placeholder={segnaposto}
        data-fuoco={fuoco}
        aria-label={titolo}
        onCambio={(evento) => al((evento.target as HTMLInputElement).value)}
        // Svuotato, uscendone torna «+» (anche se la nota c'era); Invio ed Esc
        // valgono solo per il campo appena aperto.
        onBlur={gesti.onBlur}
        onKeyDown={nota ? undefined : gesti.onKeyDown}
      />
    )
  }
  return (
    <button
      ref={pulsante}
      className="appello__aggiungi-nota"
      type="button"
      data-fuoco={fuoco}
      title={titolo}
      aria-label={titolo}
      onClick={apri}
    >
      <Icona nome="piu" />
    </button>
  )
}

/**
 * La matrice dell'appello: persone in riga, unità didattiche in colonna, una
 * casella per UD. La testata di colonna applica lo stato a tutta la classe, il
 * pulsante di riga a tutta l'ora di una persona. Le pause non sono colonne, ma
 * uno stacco fra le colonne.
 */
function PannelloAppello ({ lezione }: { lezione: Lezione }): ReactElement {
  const classe = classeDiLezione(lezione)
  const t = testi()
  if (!classe) {
    return (
      <Scheda titolo={t.appello}>
        <StatoVuoto simbolo="classi" titolo={t.classeSparita} />
      </Scheda>
    )
  }
  const L = lessico()

  const allievi = ordinaAllievi(allieviAttivi(classe))
  const ud = unitaDidattiche(lezione, statoPannello.registro.impostazioni.minutiUd)
  const perId = new Map(lezione.presenze.map((p) => [p.allievoId, p]))
  const statiDiAllievo = (allievoId: string) => statiAllineati(perId.get(allievoId), ud.length)
  const riepilogo = riepilogaPresenze(allievi.map((a) => ({
    allievoId: a.id,
    stati: statiDiAllievo(a.id),
  })))

  // Quel che manca si dice per primo: con caselle vuote i conti dei presenti ingannano.
  const daFare = riepilogo.udSenzaAppello
  const sottotitolo =
    (daFare > 0 ? t.daFare(daFare) : '') +
    t.presenti(riepilogo.presenti, riepilogo.totale - riepilogo.senzaAppello, ud.length) +
    (riepilogo.udAssenza > 0 ? t.udAssenza(riepilogo.udAssenza) : '')

  /**
   * Una riga di allievo: il nome, il pulsante di riga, una casella per UD con
   * i minuti di ritardo in apice, e la nota.
   */
  const rigaAllievo = (allievo: Allievo): ReactElement => {
    const presenza = perId.get(allievo.id)
    const stati = statiDiAllievo(allievo.id)
    const storta = stati.some(segnato)
    const nome = nomeCompleto(allievo)

    return (
      <tr key={allievo.id} className={classi('appello__riga', storta && 'appello__riga--segnata')}>
        <th className="appello__nome" scope="row">
          <PulsanteStato
            stato={statoUniforme(stati)}
            titolo={t.tuttaLOra(nome)}
            // testo-fisso: chiave di fuoco
            fuoco={`riga-${allievo.id}`}
            chiave={`${lezione.id}|riga-${allievo.id}`}
            classe="stato-presenza--riga"
            // Una riga copre tutta l'ora: il ritardo va solo sulla sua UD.
            conRitardo={ud.every(ammetteRitardo)}
            al={(stato) =>
              azione({ tipo: 'presenze.riga', lezioneId: lezione.id, allievoId: allievo.id, stato })}
          />
          <span className="appello__cognome">{nome}</span>
        </th>
        {ud.map((unita) => (
          <td
            key={unita.indice}
            className={classi('appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco')}
          >
            <span className={classi('appello__casella', ammetteRitardo(unita) && 'appello__casella--ritardo')}>
              <PulsanteStato
                stato={stati[unita.indice]}
                titolo={t.cella(nome, unita.indice + 1, unita.inizio, unita.fine)}
                // testo-fisso: chiave di fuoco
                fuoco={`ud-${allievo.id}-${unita.indice}`}
                chiave={`${lezione.id}|ud-${allievo.id}-${unita.indice}`}
                conRitardo={ammetteRitardo(unita)}
                al={(stato) =>
                  azione({
                    tipo: 'presenze.ud',
                    lezioneId: lezione.id,
                    allievoId: allievo.id,
                    ud: unita.indice,
                    stato,
                  })}
              />
              {/* I minuti solo dove c'è un ritardo: uno per UD, perché in un'ora
                  si può arrivare tardi più d'una volta. */}
              {stati[unita.indice] === 'ritardo'
                ? (
                    <ApiceMinuti
                      minuti={minutiRitardoUd(presenza, unita.indice)}
                      titolo={t.minutiRitardo(nome, unita.indice + 1)}
                      // testo-fisso: chiave di fuoco
                      fuoco={`minuti-${allievo.id}-${unita.indice}`}
                      al={(minuti) =>
                        void scriviRiga(lezione, allievo.id, { ud: unita.indice, minuti })}
                    />
                  )
                : null}
            </span>
          </td>
        ))}
        <td className="appello__nota">
          <CampoNota
            nota={presenza?.nota ?? ''}
            titolo={t.notaSu(nome)}
            segnaposto={t.nota}
            // testo-fisso: chiave di fuoco
            fuoco={`nota-${allievo.id}`}
            al={(nota) => void scriviRiga(lezione, allievo.id, { nota })}
          />
        </td>
      </tr>
    )
  }

  const nonImpostato = minuscolo(L.presenze['non-impostato'])
  return (
    <Scheda
      telaio="appello"
      titolo={t.appello}
      sottotitolo={sottotitolo}
      classe="scheda--appello"
      azioni={(
        <>
          <Pulsante
            testo={t.tuttiPresenti}
            variante="sottile"
            simbolo="spunta"
            al={() =>
              eseguiOAvvisa(
                { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'presente' },
                t.fatto,
              )}
          />
          {/* Rimettere tutto a non detto cancella l'appello intero: si chiede conferma. */}
          <Pulsante
            testo={t.azzera}
            variante="sottile"
            simbolo="ricarica"
            titolo={t.azzeraTitolo(nonImpostato)}
            al={async () => {
              const sicuro = await conferma({
                titolo: t.azzerareTitolo,
                testo: t.azzerareTesto(nonImpostato),
                testoConferma: t.azzera,
                pericolo: true,
              })
              if (!sicuro) return
              await eseguiOAvvisa(
                { tipo: 'presenze.tutti', lezioneId: lezione.id, stato: 'non-impostato' },
                t.azzerato,
              )
            }}
          />
        </>
      )}
    >
      {allievi.length === 0
        ? (
            <StatoVuoto
              simbolo="utente"
              titolo={t.nessuno}
              azione={(
                <Pulsante
                  testo={t.vaiAllaClasse}
                  variante="primario"
                  al={() => { vai({ pagina: 'pagina.classi', soggetto: { tipo: 'classe', id: classe.id } }) }}
                />
              )}
            />
          )
        : (
            // Le frecce fra le caselle, pulsante di riga compreso; nei minuti e
            // nella nota restano del campo. Lo scorrimento di lato resta fra due
            // clic: il nodo è lo stesso, e `data-scorrimento` lo rimette se no.
            <div
              className="appello__telaio"
              data-telaio="appello"
              // testo-fisso: una chiave, non un testo
              data-scorrimento={`appello:${lezione.id}`}
              onKeyDown={frecceNellaGriglia('.stato-presenza')}
            >
              <table className="appello">
                <thead>
                  <tr>
                    <th className="appello__nome" scope="col">{Uno(L.pif)}</th>
                    {ud.map((unita) => {
                      const colonna = allievi.map((a) => statiDiAllievo(a.id)[unita.indice])
                      return (
                        <th
                          key={unita.indice}
                          className={classi('appello__cella', unita.dopoUnaPausa && 'appello__cella--stacco')}
                          scope="col"
                        >
                          {/* La stessa casella del corpo: testata e caselle restano in colonna
                              anche dove c'è il posto per l'apice. */}
                          <span className={classi('appello__casella', ammetteRitardo(unita) && 'appello__casella--ritardo')}>
                            <span className="appello__ud">{`${corto(L.unitaDidattica)} ${unita.indice + 1}`}</span>
                            <span className="appello__ora">{unita.inizio}</span>
                            <PulsanteStato
                              stato={statoUniforme(colonna)}
                              titolo={t.colonna(unita.indice + 1, unita.inizio, unita.fine)}
                              // testo-fisso: chiave di fuoco
                              fuoco={`colonna-${unita.indice}`}
                              chiave={`${lezione.id}|colonna-${unita.indice}`}
                              classe="stato-presenza--colonna"
                              conRitardo={ammetteRitardo(unita)}
                              al={(stato) =>
                                azione({
                                  tipo: 'presenze.colonna',
                                  lezioneId: lezione.id,
                                  ud: unita.indice,
                                  stato,
                                })}
                            />
                          </span>
                        </th>
                      )
                    })}
                    <th className="appello__nota" scope="col">{t.nota}</th>
                  </tr>
                </thead>
                <tbody>{allievi.map(rigaAllievo)}</tbody>
              </table>
            </div>
          )}
    </Scheda>
  )
}

export function pannelloAppello (lezione: Lezione): ReactElement {
  return <PannelloAppello lezione={lezione} />
}
