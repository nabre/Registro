// La matrice a livelli di un progetto: criteri in colonna, persone in riga, in
// un giorno. Un clic sale di un livello (dal vuoto al primo, dall'ultimo al
// vuoto), il tasto destro sceglie il livello o scrive una nota. Ogni giorno ha
// le sue caselle: la progressione di una persona le mette in fila.

import type { MouseEvent as EventoMouse, ReactElement, ReactNode } from 'react'

import { nomeCompleto } from '#core/dominio/calculations.js'
import { formattaData } from '#core/dominio/dates.js'
import type {
  Allievo,
  CellaProgetto,
  CriterioProgetto,
  Iso,
  Lezione,
  Progetto,
  ProgettoNelCorso,
} from '#core/dominio/models.js'
import { celleDi, giornoDellaVoce, progressione } from '#core/dominio/projects.js'
import { minuscolo } from '#core/i18n/index.js'
import { classi } from '#ui/classNames.js'
import { Quieto } from '#ui/components/base.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { Tabella } from '#ui/components/table.js'
import { menuContestuale, menuSotto, type ElementoMenu } from '#ui/components/menu.js'
import { azione } from '#ui/bridge.js'
import { allieviDelProgetto, coloreLivello, moduloCella } from '#ui/forms/project.js'
import { stato } from '#ui/state.js'
import { testi } from './matrix.testi.js'

/** Il giorno della matrice: quello di un'ora (e le caselle si legano a lei) o una data. */
export type QuandoMatrice = { lezione: Lezione } | { data: Iso }

/**
 * Il livello mandato e non ancora tornato, per casella (vedi `inFlight.ts`).
 * Di modulo: due clic nello stesso giro, o un clic e un ridisegno in mezzo,
 * leggono la stessa mappa.
 */
const inVolo = statoInVolo<string | null>()

function giornoDi (quando: QuandoMatrice): Iso {
  return 'lezione' in quando ? quando.lezione.data : quando.data
}

/**
 * La casella di quella coppia nel giorno: dentro un'ora quella dell'ora, se
 * c'è; dalla pagina quella senza ora. Altrimenti la prima del giorno.
 */
function cellaDelGiorno (
  progetto: ProgettoNelCorso,
  allievoId: string,
  criterioId: string,
  quando: QuandoMatrice,
): CellaProgetto | null {
  const celle = celleDi(stato.registro, progetto, allievoId, criterioId, giornoDi(quando))
  const lezioneId = 'lezione' in quando ? quando.lezione.id : null
  return celle.find((c) => c.lezioneId === lezioneId) ?? celle[0] ?? null
}

/**
 * Dove scrivere: nell'ora della matrice; dalla pagina, nell'ora della casella
 * che c'è già (così non ne nasce una seconda nello stesso giorno), o nel giorno.
 */
function doveScrivere (
  quando: QuandoMatrice,
  cella: CellaProgetto | null,
): { lezioneId: string } | { data: Iso } {
  if ('lezione' in quando) return { lezioneId: quando.lezione.id }
  return cella?.lezioneId ? { lezioneId: cella.lezioneId } : { data: quando.data }
}

function scrivi (
  progetto: ProgettoNelCorso,
  allievoId: string,
  criterioId: string,
  dove: { lezioneId: string } | { data: Iso },
  livello: string | null,
  nota?: string,
) {
  return azione({
    tipo: 'progetto.cella',
    progettoId: progetto.id,
    corsoId: progetto.corsoId,
    allievoId,
    criterioId,
    ...dove,
    livello,
    ...(nota !== undefined ? { nota } : {}),
  })
}

/** Il quadretto colorato di un livello, col suo numero dal basso. */
function segnoLivello (progetto: Pick<Progetto, 'livelli'>, livello: string | null): ReactElement | null {
  if (livello === null) return null
  const indice = progetto.livelli.findIndex((l) => l.valore === livello)
  return (
    <span
      className="livello-progetto"
      style={{ backgroundColor: coloreLivello(progetto, livello) }}
      aria-hidden="true"
    >
      {indice < 0 ? '?' : String(indice + 1)}
    </span>
  )
}

/** Il testo di un livello, o la parola che dice che non ce n'è. */
function testoLivello (progetto: Pick<Progetto, 'livelli'>, livello: string | null): string {
  if (livello === null) return testi().senzaLivello
  return progetto.livelli.find((l) => l.valore === livello)?.testo ?? livello
}

/** Che cosa vuol dire un livello, se chi l'ha scritto l'ha detto. */
function descrizioneLivello (progetto: Pick<Progetto, 'livelli'>, livello: string | null): string | undefined {
  return progetto.livelli.find((l) => l.valore === livello)?.descrizione || undefined
}

function casella (
  progetto: ProgettoNelCorso,
  allievo: Allievo,
  criterio: CriterioProgetto,
  quando: QuandoMatrice,
): ReactElement {
  const t = testi()
  const cella = cellaDelGiorno(progetto, allievo.id, criterio.id, quando)
  const livello = cella?.livello ?? null
  const chi = `${nomeCompleto(allievo)} · ${criterio.titolo}`
  const dove = doveScrivere(quando, cella)
  const volo = `${progetto.id}|${allievo.id}|${criterio.id}|${giornoDi(quando)}`
  const valori = progetto.livelli.map((l) => l.valore)
  const dopo = (da: string | null): string | null => {
    const i = da === null ? -1 : valori.indexOf(da)
    return i + 1 < valori.length ? valori[i + 1] : null
  }

  const voci = (): ElementoMenu[] => [
    { titolo: chi },
    ...progetto.livelli.map((l) => ({
      testo: l.testo,
      accesa: livello === l.valore,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, l.valore) },
    })),
    {
      testo: t.senzaLivello,
      simbolo: 'chiudi' as const,
      accesa: livello === null,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, null) },
    },
    'separatore',
    {
      testo: cella?.nota ? t.modificaNota : t.annota,
      simbolo: 'matita',
      al: () => moduloCella({
        progetto,
        allievo,
        criterio,
        livello,
        nota: cella?.nota ?? '',
        quando: dove,
      }),
    },
    {
      testo: t.svuota,
      simbolo: 'cestino',
      pericolo: true,
      disabilitato: !cella,
      al: () => { void scrivi(progetto, allievo.id, criterio.id, dove, null, '') },
    },
  ]

  return (
    <button
      className={classi('cella-livello', cella?.nota && 'cella-livello--annotata')}
      type="button"
      // testo-fisso: chiave di fuoco
      data-fuoco={`livello-${allievo.id}-${criterio.id}`}
      title={[
        `${chi}: ${minuscolo(testoLivello(progetto, livello))}`,
        descrizioneLivello(progetto, livello),
        cella?.nota,
        t.premiPer(minuscolo(testoLivello(progetto, dopo(livello)))),
      ].filter(Boolean).join('\n')}
      aria-label={`${chi}: ${testoLivello(progetto, livello)}`}
      aria-haspopup="menu"
      onClick={() => {
        // Dal livello in volo, non dal disegno: il secondo clic rapido sale ancora.
        const prossimo = dopo(inVolo.da(volo, livello))
        void inVolo.manda(volo, prossimo, () =>
          scrivi(progetto, allievo.id, criterio.id, dove, prossimo))
      }}
      onContextMenu={(evento: EventoMouse<HTMLButtonElement>) => {
        if (evento.clientX === 0 && evento.clientY === 0) {
          evento.preventDefault()
          menuSotto(evento.currentTarget, voci())
          return
        }
        menuContestuale(evento.nativeEvent, voci(), evento.currentTarget)
      }}
    >
      {segnoLivello(progetto, livello)}
    </button>
  )
}

/** La legenda: ogni livello col suo colore e il suo numero. */
export function legendaLivelli (progetto: Pick<Progetto, 'livelli'>): ReactElement {
  return (
    <ul className="legenda-livelli">
      {progetto.livelli.map((l) => (
        <li key={l.valore} title={l.descrizione || undefined}>
          {segnoLivello(progetto, l.valore)}
          <span>{l.testo}</span>
          {l.descrizione ? <small className="legenda-livelli__descrizione">{l.descrizione}</small> : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * La matrice del giorno: le caselle di quel giorno (o di quell'ora), una per
 * persona e criterio. Le note stanno sotto, una riga per casella annotata.
 */
export function matriceProgetto (progetto: ProgettoNelCorso, quando: QuandoMatrice): ReactNode {
  const t = testi()
  const allievi = allieviDelProgetto(progetto)
  if (progetto.criteri.length === 0) return <Quieto>{t.nessunCriterio}</Quieto>
  if (allievi.length === 0) return <Quieto>{t.classeVuota}</Quieto>

  const nomi = new Map(allievi.map((a) => [a.id, nomeCompleto(a)]))
  const annotate = progetto.matrice.filter((c) =>
    c.nota && giornoDellaVoce(stato.registro, c) === giornoDi(quando))
  return (
    <div
      className="colonna"
      data-telaio={`matrice-progetto:${progetto.id}:colonna`} // testo-fisso: una chiave, non un testo
    >
      <Tabella
        classi={{ telaio: 'matrice__telaio', tabella: 'matrice matrice--progetto' }}
        telaio={`matrice-progetto:${progetto.id}`} // testo-fisso: una chiave, non un testo
        // Le frecce fra le caselle della matrice.
        onKeyDown={frecceNellaGriglia('.cella-livello')}
        // testo-fisso: una chiave, non un testo
        scorrimento={`matrice-progetto:${progetto.id}:${'lezione' in quando ? quando.lezione.id : quando.data}`}
        etichetta={t.matriceDel(formattaData(giornoDi(quando), 'lungo'))}
        intestazione={(
          <>
            <th scope="col" />
            {progetto.criteri.map((c) => (
              <th key={c.id} className="matrice__aspetto" scope="col" title={c.descrizione ?? c.titolo}>
                {c.titolo}
              </th>
            ))}
          </>
        )}
        righe={allievi.map((allievo) => (
          <tr key={allievo.id} data-chiave={allievo.id}>
            <th className="matrice__chi" scope="row">{nomeCompleto(allievo)}</th>
            {progetto.criteri.map((criterio) => (
              <td key={criterio.id}>{casella(progetto, allievo, criterio, quando)}</td>
            ))}
          </tr>
        ))}
      />
      {legendaLivelli(progetto)}
      {annotate.length === 0
        ? null
        : (
            <ul className="matrice-note">
              {annotate.map((c) => (
                <li key={`${c.allievoId}|${c.criterioId}|${c.lezioneId ?? c.data}`} className="matrice-note__riga">
                  {segnoLivello(progetto, c.livello)}
                  <span className="matrice-note__chi">
                    {`${nomi.get(c.allievoId) ?? '?'} · ${progetto.criteri.find((k) => k.id === c.criterioId)?.titolo ?? '?'}`}
                  </span>
                  <span>{c.nota}</span>
                </li>
              ))}
            </ul>
          )}
    </div>
  )
}

/**
 * La progressione di una persona: per ogni criterio i livelli dati, giorno
 * dopo giorno. Le colonne sono i giorni in cui c'è almeno una casella.
 */
export function progressioneAllievo (progetto: ProgettoNelCorso, allievo: Allievo): ReactNode {
  const t = testi()
  const righe = progressione(stato.registro, progetto, allievo.id)
  const date = righe.flatMap((r) => r.celle.map((c) => giornoDellaVoce(stato.registro, c)))
  const giorni = [...new Set(date)].sort()
  if (giorni.length === 0) return <Quieto>{t.nienteAncora(nomeCompleto(allievo))}</Quieto>
  return (
    <Tabella
      classi={{ telaio: 'matrice__telaio', tabella: 'matrice matrice--progetto' }}
      telaio={`progressione:${progetto.id}`} // testo-fisso: una chiave, non un testo
      // testo-fisso: una chiave, non un testo
      scorrimento={`progressione:${progetto.id}:${allievo.id}`}
      etichetta={t.progressioneDi(nomeCompleto(allievo))}
      intestazione={(
        <>
          <th scope="col" />
          {giorni.map((g) => <th key={g} scope="col" title={formattaData(g, 'lungo')}>{formattaData(g, 'corto')}</th>)}
        </>
      )}
      righe={righe.map(({ criterio, celle }) => (
        <tr key={criterio.id}>
          <th className="matrice__chi" scope="row">{criterio.titolo}</th>
          {giorni.map((g) => {
            const cella = celle.filter((c) => giornoDellaVoce(stato.registro, c) === g).pop()
            return (
              <td
                key={g}
                title={cella
                  ? [
                      testoLivello(progetto, cella.livello),
                      descrizioneLivello(progetto, cella.livello),
                      cella.nota,
                    ].filter(Boolean).join('\n')
                  : ''}
              >
                {cella ? segnoLivello(progetto, cella.livello) ?? '•' : ''}
              </td>
            )
          })}
        </tr>
      ))}
    />
  )
}
