// Le pause della giornata (ricreazione, pranzo), dentro il documento.
// La prima si dichiara con l'orario, le altre con quante UD stanno dopo la
// fine della precedente: così la distanza è sempre un multiplo dell'UD. Accanto
// a ogni riga l'orario risultante. Seconda scheda di `settings/schoolDay.ts`:
// si salva a ogni campo, e l'host rifiuta quel che non torna (`validaPause`).
// In fondo la durata proposta per una pausa nuova.

import { LIMITI_PAUSE, pauseDellaGiornata } from '../../../domain/breaks.js'
import { sommaMinuti } from '../../../domain/dates.js'
import type { PausaSeguente, PauseGiornata } from '../../../domain/models.js'
import { campo, pastiglia, pulsante, riga, scheda, statoVuoto } from '../../components/base.js'
import { h } from '../../dom.js'
import { stato } from '../../state.js'
import { numeroBattuto, oraBattuta, salvaImpostazioni } from './document.js'
import { testi } from './dayBreaks.testi.js'

/** Quante UD si propongono fra una pausa nuova e quella prima: un blocco di due ore. */
const DISTANZA_PROPOSTA = 2

/** Le pause di adesso, non quelle del disegno: due campi cambiati di fila partono prima del ridisegno. */
function pauseVive (): PauseGiornata | undefined {
  return stato.registro.impostazioni.pause
}

function salvaPause (pause: PauseGiornata | undefined): void {
  void salvaImpostazioni({ pause })
}

/** Quanto dura un'UD adesso: le pause seguenti si contano in UD. */
function minutiUd (): number {
  return stato.registro.impostazioni.minutiUd
}

/** Le pause con il loro orario, contate sulle UD del documento. */
function orariDelle (pause: PauseGiornata): ReturnType<typeof pauseDellaGiornata> {
  return pauseDellaGiornata({ minutiUd: minutiUd(), pause })
}

/**
 * La prima pausa proposta: due UD dopo la prima ora mostrata, lunga quanto la
 * pausa predefinita. Un punto di partenza da correggere.
 */
function primaProposta (): PauseGiornata {
  const impostazioni = stato.registro.impostazioni
  return {
    prima: {
      inizio: sommaMinuti(
        impostazioni.oraInizioGiornata,
        DISTANZA_PROPOSTA * impostazioni.minutiUd,
      ),
      durataMin: impostazioni.durataPausaPredefinita,
    },
    seguenti: [],
  }
}

/**
 * Le pause senza quella in posizione `indice`. Togliendone una in mezzo, la
 * successiva si conta dalla precedente sommando le distanze; togliendo la
 * prima, la seconda prende il suo orario attuale. Nessuna si sposta.
 */
function senzaLaPausa (pause: PauseGiornata, indice: number): PauseGiornata | undefined {
  if (indice === 0) {
    const [nuovaPrima, ...resto] = pause.seguenti
    if (!nuovaPrima) return undefined
    return {
      prima: { inizio: orariDelle(pause)[1].inizio, durataMin: nuovaPrima.durataMin },
      seguenti: resto.map((s) => ({ ...s })),
    }
  }
  const seguenti = pause.seguenti.map((s) => ({ ...s }))
  const [tolta] = seguenti.splice(indice - 1, 1)
  const dopo = seguenti[indice - 1]
  if (dopo) dopo.dopoUd += tolta.dopoUd
  return { prima: { ...pause.prima }, seguenti }
}

/** Le pause con una seguente cambiata. */
function conSeguente (
  pause: PauseGiornata,
  indice: number,
  modifica: Partial<PausaSeguente>,
): PauseGiornata {
  return {
    prima: { ...pause.prima },
    seguenti: pause.seguenti.map((s, i) => (i === indice ? { ...s, ...modifica } : { ...s })),
  }
}

/** Il campo della durata, uguale per tutte le pause. */
function campoDurata (
  indice: number,
  durataMin: number,
  al: (minuti: number) => void,
): HTMLElement {
  const { durata } = LIMITI_PAUSE
  return campo({
    nome: 'durataMin',
    // testo-fisso: il prefisso dei nomi dei campi, non si legge
    scope: `pausa-giornata-${indice}`,
    etichetta: testi().durataMinuti,
    tipo: 'number',
    valore: durataMin,
    min: durata.minimo,
    max: durata.massimo,
    passo: 1,
    larghezza: 'quarto',
    al: (valore) => {
      const minuti = numeroBattuto(valore, testi().durataDella(indice))
      if (minuti !== null) al(minuti)
    },
  })
}

/** Una riga: che pausa è, come la si dichiara, e l'orario che ne viene fuori. */
function rigaPausa (pause: PauseGiornata, indice: number): HTMLElement {
  const orario = orariDelle(pause)[indice]
  const { distanza } = LIMITI_PAUSE
  const t = testi()

  const dichiarazione = indice === 0
    ? [
        campo({
          nome: 'inizio',
          scope: 'pausa-giornata-0',
          etichetta: t.inizio,
          tipo: 'time',
          valore: pause.prima.inizio,
          larghezza: 'quarto',
          al: (valore) => {
            const ora = oraBattuta(valore, t.inizioPrima)
            const vive = pauseVive()
            if (ora !== null && vive) salvaPause({ ...vive, prima: { ...vive.prima, inizio: ora } })
          },
        }),
        campoDurata(0, pause.prima.durataMin, (durataMin) => {
          const vive = pauseVive()
          if (vive) salvaPause({ ...vive, prima: { ...vive.prima, durataMin } })
        }),
      ]
    : [
        campo({
          nome: 'dopoUd',
          // testo-fisso: il prefisso dei nomi dei campi, non si legge
          scope: `pausa-giornata-${indice}`,
          etichetta: t.dopoUd(minutiUd()),
          tipo: 'number',
          valore: pause.seguenti[indice - 1].dopoUd,
          min: distanza.minimo,
          max: distanza.massimo,
          passo: 1,
          larghezza: 'quarto',
          al: (valore) => {
            const ud = numeroBattuto(valore, t.distanzaDella(indice))
            const vive = pauseVive()
            if (ud !== null && vive) salvaPause(conSeguente(vive, indice - 1, { dopoUd: ud }))
          },
        }),
        campoDurata(indice, pause.seguenti[indice - 1].durataMin, (durataMin) => {
          const vive = pauseVive()
          if (vive) salvaPause(conSeguente(vive, indice - 1, { durataMin }))
        }),
      ]

  return h(
    'li',
    { class: 'pause-giornata__voce' },
    h(
      'div',
      { class: 'pause-giornata__testata' },
      h('strong', null, t.nomePausa(indice)),
      orario ? pastiglia(`${orario.inizio}–${orario.fine}`, 'quiete', 'pausa') : null,
      pulsante({
        simbolo: 'cestino',
        variante: 'fantasma',
        titolo: indice === 0 ? t.togliPrima : t.togliQuesta,
        classe: 'pause-giornata__togli',
        al: () => {
          const vive = pauseVive()
          if (vive) salvaPause(senzaLaPausa(vive, indice))
        },
      }),
    ),
    riga(...dichiarazione),
  )
}

export function schedaPauseGiornata (): HTMLElement {
  const pause = stato.registro.impostazioni.pause
  const quante = pause ? 1 + pause.seguenti.length : 0
  const t = testi()

  const aggiungi = pulsante({
    testo: quante === 0 ? t.aggiungiPrima : t.aggiungiUna,
    simbolo: 'piu',
    variante: quante === 0 ? 'primario' : 'sottile',
    disabilitato: quante >= LIMITI_PAUSE.quante,
    titolo: quante >= LIMITI_PAUSE.quante ? t.alMassimo(LIMITI_PAUSE.quante) : undefined,
    al: () => {
      const vive = pauseVive()
      if (!vive) {
        salvaPause(primaProposta())
        return
      }
      const durataMin = stato.registro.impostazioni.durataPausaPredefinita
      salvaPause({
        prima: { ...vive.prima },
        seguenti: [
          ...vive.seguenti.map((s) => ({ ...s })),
          { dopoUd: DISTANZA_PROPOSTA, durataMin },
        ],
      })
    },
  })

  return scheda({
    titolo: t.titolo,
    aiuto: t.aiuto,
    azioni: quante > 0 ? aggiungi : null,
    contenuto: h(
      'div',
      { class: 'modulo' },
      pause
        ? h(
            'ol',
            { class: 'pause-giornata' },
            ...Array.from({ length: quante }, (_, indice) => rigaPausa(pause, indice)),
          )
        : statoVuoto({
            simbolo: 'pausa',
            titolo: t.nessuna,
            testo: t.nessunaTesto,
            azione: aggiungi,
          }),
      riga(campoDurataProposta()),
    ),
  })
}

/**
 * I minuti proposti per una pausa nuova: quella aggiunta qui sopra e quella
 * messa a mano dentro un'ora.
 */
function campoDurataProposta (): HTMLElement {
  const { durata } = LIMITI_PAUSE
  const t = testi()
  return campo({
    nome: 'durataPausaPredefinita',
    etichetta: t.pausaNuovaMinuti,
    aiuto: t.pausaNuovaAiuto,
    tipo: 'number',
    valore: stato.registro.impostazioni.durataPausaPredefinita,
    min: durata.minimo,
    max: durata.massimo,
    passo: 1,
    larghezza: 'quarto',
    al: (valore) => {
      const minuti = numeroBattuto(valore, t.pausaNuova)
      if (minuti !== null) void salvaImpostazioni({ durataPausaPredefinita: minuti })
    },
  })
}
