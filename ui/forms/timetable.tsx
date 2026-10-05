// L'editor delle fasce fisse di un corso: prende un elenco di ricorrenze e ne
// rende uno modificato, senza dipendere da nessuna finestra.

import { useLayoutEffect, useReducer, useRef, type ReactElement } from 'react'

import { fineNellaGiornata } from '#core/dominio/breaks.js'
import {
  formattaDurata,
  minutiDaUd,
  minutiInUd,
  siglaUd,
  udDaMinuti,
} from '#core/dominio/dates.js'
import { creaRicorrenza } from '#core/dominio/factories.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Giornata, Ricorrenza } from '#core/dominio/models.js'
import { ricorrenzeIncatenate } from '#core/dominio/timetable.js'
import { Pastiglia, Pulsante, Tendina } from '#ui/components/base.js'
import { Input } from '#ui/fields.js'
import { stato } from '#ui/state.js'
import { PresaDiRiga, spostaVoce, useRiordino, vociGiornoSettimana } from './common.js'
import { parole } from '#core/dominio/words.testi.js'
import { testi } from './timetable.testi.js'

/**
 * La giornata del documento com'è adesso: quanto dura un'UD e dove cadono le
 * pause. Letta a ogni uso e non all'apertura, come il resto del modulo.
 */
function giornata (): Giornata {
  return stato.registro.impostazioni
}

/**
 * Rimette le fasce in fila per giorno e riattacca ciascuna alla precedente,
 * sugli stessi oggetti (le righe tengono la loro voce). L'ordinamento è stabile
 * e guarda solo il giorno; le pause della giornata stanno in mezzo.
 */
function riallinea (orario: Ricorrenza[]): Ricorrenza[] {
  const ordinato = [...orario].sort((a, b) => a.giorno - b.giorno)
  const attaccate = ricorrenzeIncatenate(ordinato, giornata())
  ordinato.forEach((r, i) => {
    r.inizio = attaccate[i].inizio
  })
  return ordinato
}

/** Il primo giorno della settimana senza fasce, a partire da quello dato. */
function giornoLibero (orario: Ricorrenza[], da: number): number {
  for (let passo = 1; passo <= 6; passo += 1) {
    const giorno = ((da - 1 + passo) % 7) + 1
    if (!orario.some((r) => r.giorno === giorno)) return giorno
  }
  return da
}

function EditorRicorrenze ({ iniziali, allaModifica }: {
  iniziali: Ricorrenza[]
  allaModifica: (orario: Ricorrenza[]) => void
}): ReactElement {
  const t = testi()
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  // All'apertura l'ordine viene dagli orari salvati; poi lo tiene chi trascina, e
  // il riordino guarda solo il giorno. Le voci sono oggetti propri dell'editor:
  // le righe le cambiano sul posto.
  const orario = useRef<Ricorrenza[] | null>(null)
  if (orario.current === null) {
    orario.current = riallinea([...iniziali]
      .sort((a, b) => a.giorno - b.giorno || a.inizio.localeCompare(b.inizio))
      .map((r) => ({ ...r })))
  }
  const voci = (): Ricorrenza[] => orario.current ?? []
  const avvisa = useRef(allaModifica)
  useLayoutEffect(() => { avvisa.current = allaModifica })

  const notifica = () => avvisa.current(voci().map((r) => ({ ...r })))

  /** Rifà la catena, ridisegna e avvisa chi tiene l'orario. */
  const cambia = (nuovo: Ricorrenza[] = voci()) => {
    orario.current = riallinea(nuovo)
    rifai()
    notifica()
  }

  // Come per gli slot: le fasce mostrate sono già attaccate, e si salvano anche
  // senza toccare niente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { notifica() }, [])

  const riordino = useRiordino((da, a) => {
    const attuali = voci()
    if (a < 0 || a >= attuali.length || da === a) return
    // Trascinata fra le fasce di un altro giorno, la fascia passa a quel giorno.
    attuali[da].giorno = attuali[a].giorno
    cambia(spostaVoce(attuali, da, a))
  })

  const minutiUd = giornata().minutiUd

  const rigaRicorrenza = (voce: Ricorrenza, indice: number): ReactElement => {
    const elenco = voci()
    // La prima fascia del giorno dice a che ora si entra; le altre vengono dietro.
    const attaccata = indice > 0 && elenco[indice - 1].giorno === voce.giorno
    const ud = String(udDaMinuti(voce.durataMin, minutiUd))
    return (
      <div key={voce.id} className="slot-riga" {...riordino.riga(indice)}>
        <PresaDiRiga {...riordino.presa(indice)} />
        <Tendina
          voci={vociGiornoSettimana()}
          valore={String(voce.giorno)}
          etichetta={parole().giorno}
          classe="slot-riga__giorno"
          al={(scelto) => {
            voce.giorno = Number(scelto)
            // In coda al nuovo giorno: l'ordinamento stabile la lascia lì.
            cambia([...voci().filter((r) => r !== voce), voce])
          }}
        />
        <Input
          className="campo__controllo campo__controllo--ora"
          type="time"
          valore={voce.inizio}
          disabled={attaccata}
          aria-label={attaccata ? t.inizioAttaccato : t.inizioGiornata}
          title={attaccata ? t.aiutoAttaccato : t.aiutoGiornata}
          onCambio={(evento) => {
            const campo = evento.target as HTMLInputElement
            // Un'ora cancellata non vale: torna quella di prima.
            if (!campo.value) {
              campo.value = voce.inizio
              return
            }
            voce.inizio = campo.value
            // Spostare la prima fascia sposta la giornata: le altre sono attaccate.
            cambia()
          }}
        />
        <Input
          className="campo__controllo campo__controllo--numero"
          type="number"
          valore={ud}
          min="1"
          step="1"
          aria-label={Molti(lessico().unitaDidattica)}
          onCambio={(evento) => {
            const campo = evento.target as HTMLInputElement
            voce.durataMin = minutiDaUd(Number(campo.value) || 1, minutiUd)
            // Quel che si è scritto torna com'è stato letto, anche col fuoco ancora qui.
            campo.value = String(udDaMinuti(voce.durataMin, minutiUd))
            // Allungare una fascia spinge avanti quelle che le stanno dietro.
            cambia()
          }}
        />
        <span className="slot-riga__durata">{siglaUd()}</span>
        {/* La fine della lezione che ne nascerà: con una pausa in mezzo, dopo. */}
        <span className="slot-riga__durata">
          {`→ ${fineNellaGiornata(voce.inizio, voce.durataMin, giornata())}`}
        </span>
        <Input
          className="campo__controllo"
          type="text"
          valore={voce.aula ?? ''}
          placeholder={t.segnapostoAula}
          aria-label={parole().aula}
          onCambio={(evento) => {
            voce.aula = (evento.target as HTMLInputElement).value
            notifica()
          }}
        />
        <Pulsante
          simbolo="duplica"
          variante="fantasma"
          titolo={t.ripeti}
          al={() => {
            // La copia va sul primo giorno vuoto con la stessa ora e durata: un orario è
            // quasi sempre la stessa ora in giorni diversi.
            const giorno = giornoLibero(voci(), voce.giorno)
            const copia = creaRicorrenza(giorno, voce.inizio, voce.durataMin)
            copia.aula = voce.aula
            cambia([...voci(), copia])
          }}
        />
        <Pulsante
          simbolo="cestino"
          variante="fantasma"
          titolo={t.togli}
          al={() => cambia(voci().filter((r) => r.id !== voce.id))}
        />
      </div>
    )
  }

  const elenco = voci()
  const settimanali = elenco.reduce((somma, r) => somma + r.durataMin, 0)
  return (
    <div className="slot-editor">
      <div className="slot-editor__righe" ref={riordino.elenco}>
        {elenco.map(rigaRicorrenza)}
      </div>
      <div className="slot-editor__coda">
        <Pulsante
          testo={t.aggiungi}
          simbolo="piu"
          variante="sottile"
          al={() => {
            const ultima = voci().at(-1)
            cambia([
              ...voci(),
              creaRicorrenza(
                ultima?.giorno ?? 1,
                ultima?.inizio ?? stato.registro.impostazioni.oraInizioGiornata,
                minutiInUd(
                  ultima?.durataMin ?? stato.registro.impostazioni.durataSlotPredefinita,
                  giornata().minutiUd,
                ),
              ),
            ])
          }}
        />
        <span className="slot-editor__conti">
          {elenco.length > 0
            ? (
                <Pastiglia
                  testo={t.udASettimana(
                    udDaMinuti(settimanali, minutiUd),
                    siglaUd(),
                    formattaDurata(settimanali),
                  )}
                  tono="informativo"
                  simbolo="orologio"
                />
              )
            : <span className="testo-quieto">{t.senzaFasce}</span>}
        </span>
      </div>
    </div>
  )
}

/**
 * L'editor delle fasce: `allaModifica` riceve una copia dell'orario a ogni
 * cambiamento, e una subito, con le fasce già attaccate.
 */
export function editorRicorrenze (
  iniziali: Ricorrenza[],
  allaModifica: (orario: Ricorrenza[]) => void,
): ReactElement {
  return <EditorRicorrenze iniziali={iniziali} allaModifica={allaModifica} />
}
