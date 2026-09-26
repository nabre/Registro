// Le finestre del check: la data di una casella (tasto destro), il nome di una
// colonna, l'elenco delle colonne da mettere in fila. Tutte mandano le colonne
// intere e nell'ordine in cui si vedono, rilette dallo stato al salvataggio
// (come `baseViva`); l'elenco intero fonde quel che si è scritto con quel che è
// cambiato altrove.

import { nomeCompleto } from '../../domain/calculations.js'
import { checkDelCorso, spunteCheCadono } from '../../domain/check.js'
import { formattaData, oggi } from '../../domain/dates.js'
import { Molti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { Allievo, ColonnaCheck, Iso } from '../../domain/models.js'
import { parole } from '../../domain/words.testi.js'
import { campo, pulsante, quieto } from '../components/base.js'
import { apriModale, conferma } from '../components/modal.js'
import { h, rimpiazza } from '../dom.js'
import { stato } from '../state.js'

import { fuocoSullaPresa, presaDiRiga, riordinatore, salva, spostaVoce, testo } from './common.js'
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
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'data',
          etichetta: t.fattoIl,
          tipo: 'date',
          valore: data ?? oggi(),
          richiesto: true,
          aiuto: t.aiuto,
        }),
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
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        campo({
          nome: 'titolo',
          etichetta: t.cheCosa,
          valore: colonna?.titolo ?? '',
          richiesto: true,
          segnaposto: t.segnaposto,
        }),
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
  const righe = h('div', { class: 'colonne-check' })

  const disegna = (): void => {
    rimpiazza(righe, ...colonne.map((colonna, indice) => rigaColonna(colonna, indice)))
    if (colonne.length === 0) {
      righe.appendChild(quieto(t.nessuna))
    }
  }

  const riordina = riordinatore(righe, (da, a) => {
    if (a < 0 || a >= colonne.length || da === a) return
    colonne = spostaVoce(colonne, da, a)
    disegna()
    fuocoSullaPresa(righe, a)
  })

  const rigaColonna = (colonna: ColonnaCheck, indice: number): HTMLElement => {
    const presa = presaDiRiga()
    const riga = h(
      'div',
      { class: 'colonne-check__riga' },
      presa,
      h('input', {
        class: 'campo__controllo colonne-check__titolo',
        type: 'text',
        value: colonna.titolo,
        placeholder: t.segnaposto,
        attr: { 'aria-label': t.nomeDella(indice + 1) },
        oninput: (evento: Event) => {
          colonna.titolo = (evento.target as HTMLInputElement).value
        },
      }),
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: colonna.titolo ? t.togli(colonna.titolo) : t.togliQuesta,
        al: () => {
          colonne = colonne.filter((c) => c !== colonna)
          disegna()
        },
      }),
    )
    riordina(riga, presa, indice)
    return riga
  }

  disegna()

  apriModale({
    titolo: Molti(lessico().colonnaCheck),
    sottotitolo: t.sottotitolo,
    larghezza: 'media',
    corpo: () =>
      h(
        'div',
        { class: 'modulo' },
        righe,
        h(
          'div',
          null,
          pulsante({
            testo: t.aggiungi,
            simbolo: 'piu',
            variante: 'sottile',
            al: () => {
              colonne = [...colonne, { id: '', titolo: '' }]
              disegna()
              righe.lastElementChild?.querySelector<HTMLInputElement>('input')?.focus()
            },
          }),
        ),
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
