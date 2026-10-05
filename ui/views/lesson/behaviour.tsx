// La matrice del comportamento: gli aspetti osservati per ogni allievo
// dell'ora, con i segni che si mettono a clic e le note che li accompagnano.

import type { ReactElement, ReactNode } from 'react'

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '#core/dominio/calculations.js'
import { testoDiVoce, vociDiLista } from '#core/dominio/lists.js'
import type { Allievo, Classe, Lezione, SegnoOsservato, VoceLista } from '#core/dominio/models.js'
import { classi } from '#ui/classNames.js'
import { frecceNellaGriglia } from '#ui/components/gridArrows.js'
import { Icona } from '#ui/components/icons.js'
import { statoInVolo } from '#ui/components/inFlight.js'
import { menuContestuale } from '#ui/components/menu.js'
import { SEGNI, SegnoFermo, nomeSegno } from '#ui/components/marks.js'
import { Input } from '#ui/fields.js'
import { azione } from '#ui/bridge.js'
import type { Risposta } from '#contract/protocol.js'
import { ridisegna, stato } from '#ui/state.js'
import { minuscolo } from '#core/i18n/index.js'
import { testi } from './behaviour.testi.js'

/**
 * La casella che si è chiesto di annotare senza segno (`allievoId|aspetto`),
 * nel modulo perché resti anche cambiando scheda. Porta l'ora a cui
 * appartiene, così non ricompare in un'altra lezione.
 */
let daAnnotare: { lezioneId: string, chiave: string } | null = null

/**
 * Il segno che ogni casella ha mandato e non ha ancora visto tornare: come
 * nell'appello (`attendance.tsx`), un secondo clic rapido ripartirebbe dal segno
 * del disegno e manderebbe lo stesso. `null` è la casella svuotata.
 */
const inVolo = statoInVolo<SegnoOsservato | null>()

function chiaveCella (allievoId: string, aspetto: string): string {
  return `${allievoId}|${aspetto}`
}

/** Scrive una casella e basta: il resto della matrice non si tocca. */
function scriviCella (
  lezione: Lezione,
  allievoId: string,
  aspetto: string,
  cambio: { segno?: SegnoOsservato | null; nota?: string },
): Promise<Risposta> {
  return azione({ tipo: 'osservazione.cella', lezioneId: lezione.id, allievoId, aspetto, ...cambio })
}

/** Vuota, molto bene, da migliorare, e da capo: tre stati e un gesto solo. */
function prossimoSegno (da: SegnoOsservato | null): SegnoOsservato | null {
  return da === null ? 'positivo' : da === 'positivo' ? 'negativo' : null
}

/** Una casella della matrice: il clic gira il segno, il tasto destro apre l'elenco. */
function casella (lezione: Lezione, allievo: Allievo, aspetto: VoceLista): ReactElement {
  const cella = (lezione.matrice ?? [])
    .find((c) => c.allievoId === allievo.id && c.aspetto === aspetto.valore) ?? null
  const segno = cella?.segno ?? null
  const conNota = Boolean(cella?.nota)
  const chi = `${nomeCompleto(allievo)} · ${aspetto.testo}`
  const t = testi()
  const prossimo = prossimoSegno(segno)

  const volo = `${lezione.id}|${chiaveCella(allievo.id, aspetto.valore)}`
  const manda = (scelto: SegnoOsservato | null): void => {
    void inVolo.manda(volo, scelto, () =>
      scriviCella(lezione, allievo.id, aspetto.valore, { segno: scelto }))
  }
  const simbolo = segno ? SEGNI.find((s) => s.valore === segno)?.simbolo ?? 'piu' : null

  return (
    <button
      className={classi(
        'cella-segno',
        // testo-fisso: classe CSS
        segno && `cella-segno--${segno}`,
        conNota && 'cella-segno--annotata',
      )}
      type="button"
      // testo-fisso: chiave di fuoco
      data-fuoco={`segno-${allievo.id}-${aspetto.valore}`}
      title={[
        `${chi}: ${minuscolo(nomeSegno(segno))}`,
        cella?.nota,
        t.premiPer(minuscolo(nomeSegno(prossimo))),
      ]
        .filter(Boolean)
        .join('\n')}
      aria-label={`${chi}: ${nomeSegno(segno)}`}
      onClick={() => manda(prossimoSegno(inVolo.da(volo, segno)))}
      onContextMenu={(evento) =>
        menuContestuale(
          evento.nativeEvent,
          [
            { titolo: chi },
            ...SEGNI.map((s) => ({
              testo: s.nome,
              simbolo: s.simbolo,
              accesa: segno === s.valore,
              al: () =>
                void scriviCella(lezione, allievo.id, aspetto.valore, { segno: s.valore }),
            })),
            {
              testo: t.nienteDaSegnare,
              simbolo: 'chiudi',
              accesa: segno === null,
              al: () => void scriviCella(lezione, allievo.id, aspetto.valore, { segno: null }),
            },
            'separatore',
            {
              testo: cella?.nota ? t.modificaAnnotazione : t.annota,
              simbolo: 'matita',
              al: () => {
                // La riga della nota per una casella senza segno non c'è: la si chiede, e il
                // disegno la porta con il fuoco dentro.
                daAnnotare = {
                  lezioneId: lezione.id,
                  chiave: chiaveCella(allievo.id, aspetto.valore),
                }
                ridisegna()
              },
            },
          ],
          evento.currentTarget,
        )}
    >
      {simbolo ? <Icona nome={simbolo} /> : null}
    </button>
  )
}

/**
 * La matrice: persone in riga, aspetti in colonna. Un clic gira la casella
 * (vuota, molto bene, da migliorare); la nota si scrive sotto. Il tasto destro
 * apre l'elenco dei segni e «Annota», per una nota senza segno.
 */
export function matriceOsservata (lezione: Lezione, classe: Classe | null): ReactNode {
  const allievi = classe ? ordinaAllievi(allieviAttivi(classe)) : []
  const aspetti = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato')
  if (allievi.length === 0 || aspetti.length === 0) return null
  const t = testi()

  // Un segno messo non riporta la matrice a sinistra: il nodo resta, e
  // `data-scorrimento` rimette il punto se no.
  return (
    <div
      className="matrice__telaio"
      data-telaio="matrice"
      // testo-fisso: una chiave, non un testo
      data-scorrimento={`matrice:${lezione.id}`}
      onKeyDown={frecceNellaGriglia('.cella-segno')}
    >
      <table className="matrice" aria-label={t.aspetti}>
        <thead>
          <tr>
            <th scope="col" />
            {aspetti.map((aspetto) => (
              <th key={aspetto.valore} className="matrice__aspetto" scope="col">{aspetto.testo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allievi.map((allievo) => (
            <tr key={allievo.id}>
              <th className="matrice__chi" scope="row">{nomeCompleto(allievo)}</th>
              {aspetti.map((aspetto) => (
                <td key={aspetto.valore}>{casella(lezione, allievo, aspetto)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Le annotazioni delle caselle segnate, una riga per casella, sotto la matrice:
 * nella griglia non c'è posto per scrivere, e segnare non deve fermarsi.
 */
export function noteDellaMatrice (lezione: Lezione, classe: Classe | null): ReactNode {
  const aspetti = vociDiLista(stato.registro.impostazioni, 'aspettoOsservato')
  const nomi = new Map(classe?.allievi.map((a) => [a.id, nomeCompleto(a)]) ?? [])
  const nomeAspetto = (valore: string) =>
    aspetti.find((a) => a.valore === valore)?.testo ??
    testoDiVoce(stato.registro.impostazioni, 'aspettoOsservato', valore)

  const righe = [...(lezione.matrice ?? [])]
  const t = testi()
  // La casella chiesta da annotare non è ancora nel registro: la si aggiunge.
  const chiesta = daAnnotare?.lezioneId === lezione.id ? daAnnotare.chiave : null
  if (chiesta && !righe.some((c) => chiaveCella(c.allievoId, c.aspetto) === chiesta)) {
    const [allievoId, aspetto] = chiesta.split('|')
    if (allievoId && aspetto) righe.push({ allievoId, aspetto, segno: null })
  }
  if (righe.length === 0) return null

  righe.sort(
    (a, b) =>
      (nomi.get(a.allievoId) ?? '').localeCompare(nomi.get(b.allievoId) ?? '', 'it') ||
      nomeAspetto(a.aspetto).localeCompare(nomeAspetto(b.aspetto), 'it'),
  )

  return (
    <ul className="matrice-note">
      {righe.map((cella) => {
        const chiave = chiaveCella(cella.allievoId, cella.aspetto)
        return (
          <li key={chiave} className="matrice-note__riga">
            <SegnoFermo segno={cella.segno} />
            <span className="matrice-note__chi">
              {`${nomi.get(cella.allievoId) ?? t.pifNonInElenco} · ${nomeAspetto(cella.aspetto)}`}
            </span>
            <Input
              className="campo__controllo matrice-note__testo"
              type="text"
              valore={cella.nota ?? ''}
              placeholder={t.cheCosaESuccesso}
              // Il fuoco rientra da sé dopo il disegno.
              // testo-fisso: chiave di fuoco
              data-fuoco={`nota-cella-${chiave}`}
              aria-label={t.annotazioneSu(
                nomi.get(cella.allievoId) ?? '?',
                nomeAspetto(cella.aspetto),
              )}
              onCambio={(evento) => {
                daAnnotare = null
                void scriviCella(lezione, cella.allievoId, cella.aspetto, {
                  nota: (evento.target as HTMLInputElement).value,
                })
              }}
            />
          </li>
        )
      })}
    </ul>
  )
}
