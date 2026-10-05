// I compiti di un progetto, allievo per allievo: quando ha cominciato, fino a
// quando ha tempo (la fine comune o la sua proroga), a che punto è e la spunta
// di fatto. I compiti stanno a linguette sopra una griglia sola, quella del
// compito aperto: uno sotto l'altro allungavano la pagina di una classe intera
// per compito. La griglia è la stessa nella pagina Progetti e nella scheda
// Progetto dell'ora; dentro un'ora l'inizio si lega alla lezione.

import type { MouseEvent as EventoMouse, ReactElement } from 'react'

import { nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type { Allievo, CompitoProgetto, Iso, Lezione, ProgettoNelCorso } from '#core/dominio/models.js'
import {
  fineDelCompito,
  fineEffettiva,
  giornoDellaVoce,
  statoCompitoPerAllievo,
} from '#core/dominio/projects.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import { parole } from '#core/dominio/words.testi.js'
import type { Risposta } from '#contract/protocol.js'
import { classi } from '#ui/classNames.js'
import { Pastiglia, Pulsante, Quieto, type TonoPastiglia } from '#ui/components/base.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { Icona } from '#ui/components/icons.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { conferma } from '#ui/components/modal.js'
import { Tabella } from '#ui/components/table.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import {
  allieviDelProgetto,
  attiviDelProgetto,
  moduloCompito,
  moduloInizio,
  moduloProroga,
} from '#ui/forms/project.js'
import { aggiorna, ridisegna, stato } from '#ui/state.js'
import { testi } from './tasks.testi.js'

type StatoCompito = ReturnType<typeof statoCompitoPerAllievo>

const TONI: Record<StatoCompito, TonoPastiglia> = {
  'non-iniziato': 'quiete',
  'in-corso': 'informativo',
  fatto: 'positivo',
  scaduto: 'negativo',
}

/**
 * Le persone spuntate per un gesto di gruppo, per compito: fuori dal disegno,
 * perché ogni risposta dell'host ridisegna la griglia, e due spunte nello
 * stesso giro devono vedere l'una l'altra.
 */
const selezionati = new Map<string, Set<string>>()

function selezione (compitoId: string): Set<string> {
  let scelti = selezionati.get(compitoId)
  if (!scelti) {
    scelti = new Set()
    selezionati.set(compitoId, scelti)
  }
  return scelti
}

/** Le spunte di fatto partite e non ancora tornate (vedi `inFlight.ts`). */
const inVolo = statoInVolo<boolean>()

function spuntaFatto (
  progettoId: string,
  corsoId: string,
  compitoId: string,
  allievoId: string,
  fatto: boolean,
): Promise<Risposta> {
  return inVolo.manda(`${progettoId}|${compitoId}|${allievoId}`, fatto, () =>
    azione({ tipo: 'progetto.compito.fatto', progettoId, corsoId, compitoId, allievoId, fatto }))
}

/**
 * Comincia il compito per queste persone. Dentro un'ora si lega a lei (e
 * sposta chi aveva già cominciato); dalla pagina, senza data, vale oggi e solo
 * per chi non aveva cominciato. Con `spostaAOggi` la pagina sposta anche loro.
 */
function inizia (
  progetto: ProgettoNelCorso,
  compito: CompitoProgetto,
  allieviIds: string[],
  lezione: Lezione | null,
  spostaAOggi = false,
): Promise<Risposta> | null {
  if (allieviIds.length === 0) return null
  return azione({
    tipo: 'progetto.compito.inizia',
    progettoId: progetto.id,
    corsoId: progetto.corsoId,
    compitoId: compito.id,
    allieviIds,
    ...(lezione ? { lezioneId: lezione.id } : spostaAOggi ? { data: stato.adessoData } : {}),
  })
}

/** La fine di un compito detta in una riga: il giorno, e l'ora se è in un'ora. */
function fineDetta (compito: CompitoProgetto): string {
  const fine = fineDelCompito(stato.registro, compito)
  const t = testi()
  return fine ? t.finePerTutti(formattaData(fine, 'lungo')) : t.senzaFine
}

/** Il menu sulla casella dell'inizio di una persona. */
function vociInizio (
  progetto: ProgettoNelCorso,
  compito: CompitoProgetto,
  allievo: Allievo,
  lezione: Lezione | null,
  data: Iso | null,
): ElementoMenu[] {
  const t = testi()
  const voci: ElementoMenu[] = [{ titolo: `${nomeCompleto(allievo)} · ${compito.titolo}` }]
  const inizio = compito.inizi.find((i) => i.allievoId === allievo.id)
  if (lezione && inizio?.lezioneId !== lezione.id) {
    voci.push({
      testo: t.iniziaInLezione,
      simbolo: 'lezione',
      al: () => { void inizia(progetto, compito, [allievo.id], lezione) },
    })
  }
  if (!lezione && (!inizio || data !== stato.adessoData)) {
    voci.push({
      testo: t.iniziaOggi,
      simbolo: 'orologio',
      al: () => { void inizia(progetto, compito, [allievo.id], null, true) },
    })
  }
  voci.push({
    testo: t.scegliGiorno,
    simbolo: 'calendario',
    al: () => moduloInizio({ progettoId: progetto.id, corsoId: progetto.corsoId, compito, allievi: [allievo], data }),
  })
  if (inizio) {
    voci.push('separatore', {
      testo: t.togliInizio,
      simbolo: 'chiudi',
      pericolo: true,
      al: () => {
        void azione({
          tipo: 'progetto.compito.togliInizio',
          progettoId: progetto.id,
          corsoId: progetto.corsoId,
          compitoId: compito.id,
          allieviIds: [allievo.id],
        })
      },
    })
  }
  return voci
}

/** Apre un menu dove l'ha chiesto il gesto; dal tasto Menu, sotto la casella. */
function apriMenu (evento: EventoMouse<HTMLButtonElement>, voci: ElementoMenu[]): void {
  const origine = evento.currentTarget
  if (evento.clientX === 0 && evento.clientY === 0) {
    evento.preventDefault()
    menuSotto(origine, voci)
    return
  }
  menuContestuale(evento.nativeEvent, voci, origine)
}

/** Una riga della griglia: scelta, nome, inizio, fine, stato, fatto. */
function rigaAllievo (
  progetto: ProgettoNelCorso,
  compito: CompitoProgetto,
  allievo: Allievo,
  lezione: Lezione | null,
): ReactElement {
  const t = testi()
  const scelti = selezione(compito.id)
  const inizio = compito.inizi.find((i) => i.allievoId === allievo.id) ?? null
  const dataInizio = inizio ? giornoDellaVoce(stato.registro, inizio) : null
  const proroga = compito.proroghe.find((p) => p.allievoId === allievo.id) ?? null
  const fine = fineEffettiva(stato.registro, compito, allievo.id)
  const fatto = compito.fatti.find((f) => f.allievoId === allievo.id) ?? null
  const giorno = lezione?.data ?? stato.adessoData
  const situazione = statoCompitoPerAllievo(stato.registro, compito, allievo.id, giorno)
  const chi = nomeCompleto(allievo)
  const volo = `${progetto.id}|${compito.id}|${allievo.id}`

  return (
    <tr
      key={allievo.id}
      className={classi(!allievo.attivo && 'check__riga--ritirata')}
      data-chiave={allievo.id}
    >
      <td>
        <Input
          type="checkbox"
          spuntato={scelti.has(allievo.id)}
          aria-label={t.scegli(chi)}
          onCambio={(evento) => {
            if ((evento.target as HTMLInputElement).checked) scelti.add(allievo.id)
            else scelti.delete(allievo.id)
            ridisegna()
          }}
        />
      </td>
      <th className="check__chi" scope="row">
        {chi}
        {allievo.attivo ? null : <small className="check__nota">{t.nonFrequentaPiu}</small>}
      </th>
      <td>
        <button
          className={classi(
            'casella-check',
            inizio && 'casella-check--fatta',
            inizio && lezione && inizio.lezioneId !== lezione.id && 'casella-check--altrove',
          )}
          type="button"
          // testo-fisso: chiave del fuoco, non si legge
          data-fuoco={`inizio-${compito.id}-${allievo.id}`}
          title={dataInizio ? t.cominciatoIl(chi, formattaData(dataInizio, 'lungo')) : t.clicPerIniziare(chi, Boolean(lezione))}
          aria-haspopup="menu"
          onClick={(evento) => {
            if (!inizio) {
              void inizia(progetto, compito, [allievo.id], lezione)
              return
            }
            apriMenu(evento, vociInizio(progetto, compito, allievo, lezione, dataInizio))
          }}
          onContextMenu={(evento) =>
            apriMenu(evento, vociInizio(progetto, compito, allievo, lezione, dataInizio))}
        >
          {dataInizio
            ? lezione && inizio?.lezioneId === lezione.id
              ? <Icona nome="spunta" />
              : <span className="casella-check__data">{formattaData(dataInizio, 'corto')}</span>
            : null}
        </button>
      </td>
      <td>
        <button
          className={classi('casella-check', 'compito-progetto__fine', proroga && 'compito-progetto__fine--proroga')}
          type="button"
          // testo-fisso: chiave del fuoco, non si legge
          data-fuoco={`fine-${compito.id}-${allievo.id}`}
          title={[
            proroga ? t.prorogaFino(formattaData(proroga.fine, 'lungo')) : t.fineComune,
            proroga?.nota,
            t.clicPerProroga,
          ].filter(Boolean).join('\n')}
          onClick={() => moduloProroga({
            progettoId: progetto.id,
            corsoId: progetto.corsoId,
            compito,
            allievo,
            fineComune: fineDelCompito(stato.registro, compito),
          })}
        >
          {fine ? formattaData(fine, 'corto') : '—'}
        </button>
      </td>
      <td><Pastiglia testo={t.stati[situazione]} tono={TONI[situazione]} /></td>
      <td>
        <button
          className={classi('casella-check', fatto && 'casella-check--fatta')}
          type="button"
          // testo-fisso: chiave del fuoco, non si legge
          data-fuoco={`fatto-${compito.id}-${allievo.id}`}
          title={fatto ? t.fattoIl(chi, formattaData(fatto.fattoIl.slice(0, 10), 'lungo')) : t.daFare(chi)}
          aria-pressed={Boolean(fatto)}
          aria-label={t.fattoDi(chi)}
          onClick={() => {
            // Dalla spunta in volo, non dal disegno: il secondo clic rapido la toglie.
            void spuntaFatto(progetto.id, progetto.corsoId, compito.id, allievo.id, !inVolo.da(volo, Boolean(fatto)))
          }}
        >
          {fatto ? <Icona nome="spunta" /> : null}
        </button>
      </td>
    </tr>
  )
}

/** Un compito aperto: la riga dei dettagli, i gesti di gruppo e la griglia. */
function bloccoCompito (
  progetto: ProgettoNelCorso,
  compito: CompitoProgetto,
  lezione: Lezione | null,
): ReactElement {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  const attivi = attiviDelProgetto(progetto)
  const scelti = selezione(compito.id)
  // Chi non c'è più nella griglia non resta scelto.
  for (const id of [...scelti]) if (!allievi.some((a) => a.id === id)) scelti.delete(id)
  const fatti = attivi.filter((a) => compito.fatti.some((f) => f.allievoId === a.id)).length
  const senzaInizio = attivi.filter((a) => !compito.inizi.some((i) => i.allievoId === a.id))

  const tuttiScelti = allievi.length > 0 && allievi.every((a) => scelti.has(a.id))

  return (
    <section
      key={compito.id}
      className="compito-progetto"
      id={idPannello(progetto)}
      role="tabpanel"
      aria-labelledby={idLinguetta(compito)}
      data-telaio={`compito:${compito.id}`} // testo-fisso: una chiave, non un testo
    >
      {/* I dettagli in una riga: la fine comune, la descrizione accorciata, «Modifica». */}
      <div className="compito-progetto__testata">
        <span className="testo-quieto">{fineDetta(compito)}</span>
        {compito.descrizione
          ? <p className="compito-progetto__descrizione" title={compito.descrizione}>{compito.descrizione}</p>
          : null}
        <Pulsante
          testo={parole().modifica}
          simbolo="matita"
          variante="fantasma"
          al={() => moduloCompito({ progetto, compito })}
        />
      </div>
      <div className="compito-progetto__gesti">
        <Pulsante
          testo={lezione ? t.iniziaSceltiInLezione(scelti.size) : t.iniziaSceltiOggi(scelti.size)}
          simbolo="orologio"
          variante="sottile"
          disabilitato={scelti.size === 0}
          al={async () => {
            const ids = [...scelti]
            if (await inizia(progetto, compito, ids, lezione, true)) scelti.clear()
          }}
        />
        <Pulsante
          testo={t.iniziaATutti(senzaInizio.length)}
          simbolo="utente"
          variante="sottile"
          disabilitato={senzaInizio.length === 0}
          titolo={t.iniziaATuttiAiuto}
          al={() => { void inizia(progetto, compito, senzaInizio.map((a) => a.id), lezione) }}
        />
        <Pulsante
          testo={t.fattoATutti}
          simbolo="spunta"
          variante="sottile"
          disabilitato={fatti === attivi.length}
          al={() => {
            void azione({
              tipo: 'progetto.compito.fattoTutti',
              progettoId: progetto.id,
              corsoId: progetto.corsoId,
              compitoId: compito.id,
              fatto: true,
            })
          }}
        />
        <Pulsante
          testo={t.togliSpunte}
          simbolo="chiudi"
          variante="fantasma"
          disabilitato={compito.fatti.length === 0}
          al={async () => {
            const sicuro = await conferma({
              titolo: t.togliereSpunte,
              testo: t.togliereSpunteTesto(compito.fatti.length),
              testoConferma: t.togliSpunte,
              pericolo: true,
            })
            if (!sicuro) return
            void azione({
              tipo: 'progetto.compito.fattoTutti',
              progettoId: progetto.id,
              corsoId: progetto.corsoId,
              compitoId: compito.id,
              fatto: false,
            })
          }}
        />
      </div>
      {allievi.length > 0
        ? (
            <Tabella
              classi={{ telaio: 'check__telaio', tabella: 'check compito-progetto__griglia' }}
              telaio={`compito:${compito.id}`} // testo-fisso: una chiave, non un testo
              // testo-fisso: una chiave, non un testo
              scorrimento={`compito:${compito.id}:${lezione?.id ?? ''}`}
              // Le frecce fra le caselle della griglia.
              onKeyDown={frecceNellaGriglia('.casella-check')}
              etichetta={compito.titolo}
              intestazione={(
                <>
                  <th scope="col">
                    <Input
                      type="checkbox"
                      spuntato={tuttiScelti}
                      aria-label={t.scegliTutti}
                      onCambio={(evento) => {
                        scelti.clear()
                        if ((evento.target as HTMLInputElement).checked) for (const a of allievi) scelti.add(a.id)
                        ridisegna()
                      }}
                    />
                  </th>
                  <th className="check__angolo" scope="col">{parole().chi}</th>
                  <th scope="col">{t.inizio}</th>
                  <th scope="col">{t.fine}</th>
                  <th scope="col">{parole().stato}</th>
                  <th scope="col">{parole().fatto}</th>
                </>
              )}
              righe={allievi.map((allievo) => rigaAllievo(progetto, compito, allievo, lezione))}
            />
          )
        : <Quieto>{t.classeVuota}</Quieto>}
    </section>
  )
}

// testo-fisso: prefisso di id del DOM, non si legge
const idLinguetta = (compito: CompitoProgetto): string => `compito-linguetta-${compito.id}`
// testo-fisso: prefisso di id del DOM, non si legge
const idPannello = (progetto: ProgettoNelCorso): string => `compiti-pannello-${progetto.id}`

/**
 * Chi ha chiesto un compito nuovo da questo progetto, con i compiti che
 * c'erano: quando l'host lo rimanda, la linguetta si apre su di lui.
 */
const nuoviAttesi = new Map<string, Set<string>>()

/** Il compito aperto: quello scelto, se c'è ancora; altrimenti il primo. */
function compitoAperto (progetto: ProgettoNelCorso): CompitoProgetto | null {
  const attesi = nuoviAttesi.get(progetto.id)
  const nuovo = attesi ? progetto.compiti.find((c) => !attesi.has(c.id)) : undefined
  if (nuovo) {
    nuoviAttesi.delete(progetto.id)
    // Dentro il disegno non si ridisegna: lo stato si allinea e basta.
    stato.compitiScelti = conScelta(progetto.id, nuovo.id)
    return nuovo
  }
  const scelto = stato.compitiScelti[progetto.id]
  return progetto.compiti.find((c) => c.id === scelto) ?? progetto.compiti[0] ?? null
}

/** Le scelte con questa in fondo: la memoria tiene le ultime. */
function conScelta (progettoId: string, compitoId: string): Record<string, string> {
  const scelte = { ...stato.compitiScelti }
  delete scelte[progettoId]
  scelte[progettoId] = compitoId
  return scelte
}

/**
 * Il modulo di un compito nuovo; salvato, la sua linguetta si apre. Lo usa
 * anche il comando della barra.
 */
export function nuovoCompito (progetto: ProgettoNelCorso): void {
  nuoviAttesi.set(progetto.id, new Set(progetto.compiti.map((c) => c.id)))
  moduloCompito({ progetto })
}

/** Quanti hanno finito e quanti sono oltre la fine, fra chi frequenta. */
function contoDelCompito (
  progetto: ProgettoNelCorso,
  compito: CompitoProgetto,
  giorno: Iso,
): { fatti: number, tutti: number, scaduti: number } {
  const attivi = attiviDelProgetto(progetto)
  return {
    fatti: attivi.filter((a) => compito.fatti.some((f) => f.allievoId === a.id)).length,
    tutti: attivi.length,
    scaduti: attivi.filter((a) =>
      statoCompitoPerAllievo(stato.registro, compito, a.id, giorno) === 'scaduto').length,
  }
}

/**
 * Le linguette dei compiti, una per compito con il conto di chi ha finito e un
 * pallino se qualcuno è oltre la fine, e il «+» per uno nuovo. Si comportano
 * come il `Selettore`: le frecce, Inizio e Fine scelgono e il fuoco segue.
 */
function linguette (progetto: ProgettoNelCorso, aperto: CompitoProgetto, giorno: Iso): ReactElement {
  const t = testi()
  const compiti = progetto.compiti
  const scegli = (compito: CompitoProgetto): void => {
    if (compito.id !== aperto.id) aggiorna({ compitiScelti: conScelta(progetto.id, compito.id) })
  }
  return (
    <div className="compiti-progetto__schede">
      <div
        className="selettore compiti-progetto__linguette"
        role="tablist"
        aria-label={Molti(lessico().compitoProgetto)}
        onKeyDown={(evento) => {
          const voci = Array.from(evento.currentTarget.children)
          // Da dove sta il fuoco e non dal disegno: due tasti nello stesso giro
          // partono uno dopo l'altro.
          const qui = voci.indexOf(document.activeElement as Element)
          const dove = qui >= 0 ? qui : compiti.findIndex((c) => c.id === aperto.id)
          const tasto = evento.key
          const indice = tasto === 'ArrowRight' || tasto === 'ArrowDown'
            ? (dove + 1) % compiti.length
            : tasto === 'ArrowLeft' || tasto === 'ArrowUp'
              ? (dove - 1 + compiti.length) % compiti.length
              : tasto === 'Home' ? 0 : tasto === 'End' ? compiti.length - 1 : -1
          if (indice < 0) return
          evento.preventDefault()
          // Il fuoco passa prima alla linguetta nuova, così il ridisegno lo ritrova lì.
          ;(voci[indice] as HTMLElement | undefined)?.focus()
          scegli(compiti[indice])
        }}
      >
        {compiti.map((compito) => {
          const acceso = compito.id === aperto.id
          const conto = contoDelCompito(progetto, compito, giorno)
          const finiti = conto.tutti > 0 && conto.fatti === conto.tutti
          return (
            <button
              key={compito.id}
              className={classi('selettore__voce', 'linguetta-compito', acceso && 'selettore__voce--attiva')}
              type="button"
              id={idLinguetta(compito)}
              role="tab"
              aria-selected={acceso}
              aria-controls={acceso ? idPannello(progetto) : undefined}
              tabIndex={acceso ? 0 : -1}
              title={[
                compito.titolo,
                t.contoFatti(conto.fatti, conto.tutti),
                conto.scaduti > 0 ? t.scadutoPer(conto.scaduti) : null,
              ].filter(Boolean).join(' · ')}
              // Una chiave per linguetta: il fuoco la ritrova dopo il ridisegno che la accende.
              // testo-fisso: chiave di fuoco, non si legge
              data-fuoco={`compito-linguetta:${compito.id}`}
              onClick={() => scegli(compito)}
            >
              <span className="linguetta-compito__titolo">{compito.titolo}</span>
              <span className={classi('linguetta-compito__conto', finiti && 'linguetta-compito__conto--finito')}>
                {`${conto.fatti}/${conto.tutti}`}
              </span>
              {conto.scaduti > 0 ? <span className="linguetta-compito__allarme" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
      <Pulsante
        simbolo="piu"
        variante="fantasma"
        titolo={t.nuovoCompito}
        al={() => nuovoCompito(progetto)}
      />
    </div>
  )
}

/**
 * I compiti del progetto a linguette, con la griglia di quello aperto. Dentro
 * un'ora l'inizio si lega all'ora e lo stato si legge nel suo giorno.
 */
export function compitiDelProgetto (progetto: ProgettoNelCorso, lezione: Lezione | null): ReactElement {
  const t = testi()
  const aperto = compitoAperto(progetto)
  return (
    <div
      className="compiti-progetto"
      data-telaio={`compiti:${progetto.id}`} // testo-fisso: una chiave, non un testo
    >
      {aperto
        ? (
            <>
              {linguette(progetto, aperto, lezione?.data ?? stato.adessoData)}
              {bloccoCompito(progetto, aperto, lezione)}
            </>
          )
        : (
            <>
              <Quieto>{t.nessunCompito}</Quieto>
              <div>
                <Pulsante
                  testo={t.nuovoCompito}
                  simbolo="piu"
                  variante="sottile"
                  al={() => nuovoCompito(progetto)}
                />
              </div>
            </>
          )}
    </div>
  )
}
