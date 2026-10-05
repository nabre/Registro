// Le finestre del check: la data di una casella (tasto destro), il nome di una
// colonna, l'elenco delle colonne da mettere in fila. Tutte mandano le colonne
// intere e nell'ordine in cui si vedono, rilette dallo stato al salvataggio
// (come `baseViva`); l'elenco intero fonde quel che si è scritto con quel che è
// cambiato altrove.

import { nomeCompleto } from '#core/dominio/calculations.js'
import { checkDelCorso, spunteCheCadono } from '#core/dominio/check.js'
import { formattaData, oggi } from '#core/dominio/dates.js'
import { Molti } from '#core/dominio/lexicon.js'
import { lessico } from '#core/dominio/lexicon.testi.js'
import type { Allievo, ColonnaCheck, Iso } from '#core/dominio/models.js'
import { parole } from '#core/dominio/words.testi.js'
import { useLayoutEffect, useReducer, useRef, type ReactElement } from 'react'

import { Campo, Pulsante, Quieto } from '#ui/components/base.js'
import { apriModale, conferma } from '#ui/components/modal.js'
import { Input } from '#ui/fields.js'
import { stato } from '#ui/state.js'

import { PresaDiRiga, chiaveDi, salva, spostaVoce, testo, useRiordino } from './common.js'
import { testi } from './check.testi.js'

/** Le colonne del corso come sono adesso (la usa anche la griglia, il cui menu resta aperto a lungo). */
export function colonneAttuali (corsoId: string): ColonnaCheck[] {
  return checkDelCorso(stato.registro, corsoId)?.colonne ?? []
}

/** Quante caselle spuntate se ne andrebbero adesso scrivendo `colonne`. */
export function spunteCheCadonoOra (corsoId: string, colonne: readonly ColonnaCheck[]): number {
  return spunteCheCadono(checkDelCorso(stato.registro, corsoId), colonne)
}

/**
 * La frase da dire prima di togliere delle colonne, o `null` se non si perde
 * niente: la conta il dominio con la stessa regola con cui l'host toglie.
 */
export function avvisoSpunteCheCadono (
  corsoId: string,
  colonne: readonly ColonnaCheck[],
): string | null {
  const cadono = spunteCheCadonoOra(corsoId, colonne)
  if (cadono === 0) return null
  return testi().spunteCheCadono(cadono)
}

/**
 * Il giorno di una casella, scelto a mano: una vuota la spunta con quel giorno,
 * una spuntata cambia giorno (il modulo portato il venerdì e spuntato il lunedì).
 */
export function moduloDataCheck (opzioni: {
  corsoId: string
  allievo: Allievo
  colonna: ColonnaCheck
  /** Il giorno di adesso, se la casella è già spuntata. */
  data: Iso | null
}): void {
  const { corsoId, allievo, colonna, data } = opzioni
  const t = testi().data
  apriModale({
    titolo: data ? t.cambia : t.scegli,
    sottotitolo: `${nomeCompleto(allievo)} · ${colonna.titolo}`,
    larghezza: 'stretta',
    testoSalva: t.spunta,
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="data"
          etichetta={t.fattoIl}
          tipo="date"
          valore={data ?? oggi()}
          richiesto
          aiuto={t.aiuto}
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const scelta = testo(valori.data)
      if (!scelta) {
        contesto.mostraErrori([t.serveUnGiorno])
        return
      }
      await salva(
        contesto,
        { tipo: 'check.data', corsoId, allievoId: allievo.id, colonnaId: colonna.id, data: scelta },
        t.spuntataIl(formattaData(scelta, 'giorno')),
      )
    },
  })
}

/**
 * Una colonna nuova, o il nome nuovo di una che c'è. La nuova parte con l'id
 * vuoto (lo dà l'host); rinominare tiene l'id, e con lui le spunte.
 */
export function moduloColonnaCheck (opzioni: {
  corsoId: string
  colonna?: ColonnaCheck
  /** Per una colonna nuova: dopo quale metterla; se non c'è più, in fondo. */
  dopo?: string
}): void {
  const { corsoId, colonna, dopo } = opzioni
  const t = testi().colonna
  apriModale({
    titolo: colonna ? t.rinomina : t.nuova,
    sottotitolo: colonna ? t.era(colonna.titolo) : undefined,
    larghezza: 'stretta',
    testoSalva: colonna ? parole().rinomina : parole().aggiungi,
    corpo: () => (
      <div className="modulo">
        <Campo
          nome="titolo"
          etichetta={t.cheCosa}
          valore={colonna?.titolo ?? ''}
          richiesto
          segnaposto={t.segnaposto}
        />
      </div>
    ),
    alSalva: async (valori, contesto) => {
      const titolo = testo(valori.titolo)
      if (!titolo) {
        contesto.mostraErrori([t.senzaNome])
        return
      }
      const attuali = colonneAttuali(corsoId)
      let colonne: ColonnaCheck[]
      if (colonna) {
        if (!attuali.some((c) => c.id === colonna.id)) {
          contesto.mostraErrori([t.toltaAltrove])
          return
        }
        colonne = attuali.map((c) => (c.id === colonna.id ? { ...c, titolo } : c))
      } else {
        // Il posto si cerca sulle colonne di adesso: l'ordine può essere cambiato altrove.
        const dove = dopo ? attuali.findIndex((c) => c.id === dopo) : -1
        colonne = dove < 0
          ? [...attuali, { id: '', titolo }]
          : [...attuali.slice(0, dove + 1), { id: '', titolo }, ...attuali.slice(dove + 1)]
      }
      await salva(
        contesto,
        { tipo: 'check.colonne', corsoId, colonne },
        colonna ? t.rinominata(titolo) : t.aggiunta(titolo),
      )
    },
  })
}

/**
 * Tutte le colonne insieme: aggiungere, rinominare, mettere in fila, togliere.
 * Le righe sono campi nudi letti dall'elenco della finestra, non da `valori`.
 * Al Salva l'elenco si fonde con le colonne di adesso (`fondi`), e spunte che
 * cadono o cambi fatti altrove si dicono prima di scrivere.
 */
export function moduloColonneCheck (corsoId: string): void {
  const t = testi().colonne
  const apertura = new Map(colonneAttuali(corsoId).map((c) => [c.id, c.titolo]))
  let colonne: ColonnaCheck[] = colonneAttuali(corsoId).map((c) => ({ ...c }))

  /**
   * Quel che la finestra ha in mano, fuso con le colonne di adesso: restano le
   * nuove della finestra; quelle dell'apertura solo se ci sono ancora, col nome
   * di adesso se qui non lo si è toccato; quelle nate altrove vanno in coda.
   */
  const fondi = (): { scritte: ColonnaCheck[], nate: string[], tolte: string[] } => {
    const attuali = colonneAttuali(corsoId)
    const perId = new Map(attuali.map((c) => [c.id, c]))
    const scritte: ColonnaCheck[] = []
    for (const c of colonne) {
      const titolo = c.titolo.trim()
      if (!titolo) continue
      if (!c.id) {
        scritte.push({ id: '', titolo })
        continue
      }
      const viva = perId.get(c.id)
      if (!viva) continue
      const toccato = titolo !== apertura.get(c.id)?.trim()
      scritte.push({ id: viva.id, titolo: toccato ? titolo : viva.titolo })
    }
    const nateAltrove = attuali.filter((c) => !apertura.has(c.id))
    const tolte = [...apertura].filter(([id]) => !perId.has(id)).map(([, titolo]) => titolo)
    return {
      scritte: [...scritte, ...nateAltrove],
      nate: nateAltrove.map((c) => c.titolo),
      tolte,
    }
  }
  apriModale({
    titolo: Molti(lessico().colonnaCheck),
    sottotitolo: t.sottotitolo,
    larghezza: 'media',
    corpo: () => (
      <ElencoColonne
        colonne={() => colonne}
        cambia={(nuove) => { colonne = nuove }}
      />
    ),
    alSalva: async (_valori, contesto) => {
      const { nate, tolte } = fondi()
      if (nate.length > 0 || tolte.length > 0) {
        const sicuro = await conferma({
          titolo: t.cambiateAltrove,
          testo: [
            nate.length > 0 ? t.nate(t.titoli(nate)) : '',
            tolte.length > 0 ? t.tolte(t.titoli(tolte)) : '',
          ].filter(Boolean).join(' '),
          testoConferma: t.salvaLoStesso,
        })
        if (!sicuro) return
      }
      // Come togliendo dalla griglia: se a finestra aperta sono cadute altre spunte,
      // si richiede.
      let detto = 0
      for (;;) {
        const { scritte } = fondi()
        const cadono = spunteCheCadonoOra(corsoId, scritte)
        if (cadono <= detto) break
        const sicuro = await conferma({
          titolo: t.togliere,
          testo: avvisoSpunteCheCadono(corsoId, scritte) ?? '',
          testoConferma: t.togliESalva,
          pericolo: true,
        })
        if (!sicuro) return
        detto = cadono
      }
      const { scritte } = fondi()
      await salva(
        contesto,
        { tipo: 'check.colonne', corsoId, colonne: scritte },
        t.salvate,
      )
    },
  })
}

/**
 * Le righe di `moduloColonneCheck`. L'elenco sta fuori, dove il Salva lo legge:
 * qui lo si legge e lo si cambia subito, e si ridisegna dopo.
 */
function ElencoColonne ({ colonne, cambia }: {
  colonne: () => ColonnaCheck[]
  cambia: (colonne: ColonnaCheck[]) => void
}): ReactElement {
  const t = testi().colonne
  const [, rifai] = useReducer((n: number) => n + 1, 0)
  const righe = useRef<HTMLDivElement | null>(null)
  const fuocoInFondo = useRef(false)
  const riordino = useRiordino((da, a) => {
    const attuali = colonne()
    if (a < 0 || a >= attuali.length || da === a) return
    cambia(spostaVoce(attuali, da, a))
    rifai()
  })

  useLayoutEffect(() => {
    if (!fuocoInFondo.current) return
    fuocoInFondo.current = false
    righe.current?.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
  })

  const elenco = colonne()
  return (
    <div className="modulo">
      <div
        className="colonne-check"
        ref={(nodo) => {
          righe.current = nodo
          riordino.elenco(nodo)
        }}
      >
        {elenco.map((colonna, indice) => (
          <div key={chiaveDi(colonna)} className="colonne-check__riga" {...riordino.riga(indice)}>
            <PresaDiRiga {...riordino.presa(indice)} />
            <Input
              className="campo__controllo colonne-check__titolo"
              type="text"
              valore={colonna.titolo}
              placeholder={t.segnaposto}
              aria-label={t.nomeDella(indice + 1)}
              onInput={(evento) => {
                colonna.titolo = evento.currentTarget.value
              }}
            />
            <Pulsante
              simbolo="cestino"
              variante="fantasma"
              titolo={colonna.titolo ? t.togli(colonna.titolo) : t.togliQuesta}
              al={() => {
                cambia(colonne().filter((c) => c !== colonna))
                rifai()
              }}
            />
          </div>
        ))}
        {elenco.length === 0 ? <Quieto>{t.nessuna}</Quieto> : null}
      </div>
      <div>
        <Pulsante
          testo={t.aggiungi}
          simbolo="piu"
          variante="sottile"
          al={() => {
            cambia([...colonne(), { id: '', titolo: '' }])
            fuocoInFondo.current = true
            rifai()
          }}
        />
      </div>
    </div>
  )
}
