// Le pause della giornata (ricreazione, pranzo), dentro il documento.
// La prima si dichiara con l'orario, le altre con quante UD stanno dopo la
// fine della precedente: così la distanza è sempre un multiplo dell'UD. Accanto
// a ogni riga l'orario risultante. Seconda scheda di `settings/schoolDay.ts`:
// si salva a ogni campo, e l'host rifiuta quel che non torna (`validaPause`):
// il rifiuto si legge accanto al campo. Togliere una pausa non chiede niente,
// e la notifica ha «Annulla». In fondo, fra le avanzate, la durata proposta
// per una pausa nuova.

import { LIMITI_PAUSE, pauseDellaGiornata } from '../../../../core/dominio/breaks.js'
import { sommaMinuti } from '../../../../core/dominio/dates.js'
import type { Esito } from '../../../../core/controlli/control.js'
import type { PausaSeguente, PauseGiornata } from '../../../../core/dominio/models.js'
import { notificaAnnullabile } from '../../components/undoable.js'
import { campo, pastiglia, pulsante, riga, scheda, statoVuoto } from '../../components/base.js'
import { notifica } from '../../components/notifications.js'
import { avanzateAnno, campoAnno, voceAnno } from '../../components/yearSetting.js'
import { h } from '../../dom.js'
import { stato } from '../../state.js'
import { oraBattuta, salvaConEsito } from './document.js'
import { testi } from './dayBreaks.testi.js'

/** Quante UD si propongono fra una pausa nuova e quella prima: un blocco di due ore. */
const DISTANZA_PROPOSTA = 2

/** Le pause di adesso, non quelle del disegno: due campi cambiati di fila partono prima del ridisegno. */
function pauseVive (): PauseGiornata | undefined {
  return stato.registro.impostazioni.pause
}

/** Salva le pause: l'esito lo dice il campo che le ha cambiate. */
function salvaPause (pause: PauseGiornata | undefined): Promise<Esito> {
  return salvaConEsito({ pause })
}

/**
 * Salva le pause da un gesto che non ha un campo accanto (aggiungere, togliere,
 * l'orario della prima): un rifiuto va in una notifica. Torna se è andata.
 */
async function salvaPauseDaGesto (pause: PauseGiornata | undefined): Promise<boolean> {
  const esito = await salvaPause(pause)
  if (esito) notifica(esito, 'errore')
  return esito === null
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

/**
 * Un numero di una pausa con l'etichetta sopra, come gli altri campi della
 * riga, e l'unità accanto. `nome` è il nome accessibile, che dice di quale
 * pausa si parla.
 */
function numeroDiPausa (
  chiave: string,
  etichetta: string,
  nome: string,
  dati: { valore: () => number, minimo: number, massimo: number, unita: string },
  al: (quanto: number) => Promise<Esito> | undefined,
): HTMLElement {
  return h(
    'div',
    { class: ['campo', 'campo--quarto'] },
    h('span', { class: 'campo__etichetta', attr: { 'aria-hidden': 'true' } }, etichetta),
    campoAnno(() => ({
      tipo: 'numero',
      chiave,
      nome,
      valore: dati.valore(),
      minimo: dati.minimo,
      massimo: dati.massimo,
      unita: dati.unita,
    }), (valore) => al(Number(valore))),
  )
}

/** Il campo della durata, uguale per tutte le pause. */
function campoDurata (
  indice: number,
  durataMin: () => number,
  al: (minuti: number) => Promise<Esito> | undefined,
): HTMLElement {
  const { durata } = LIMITI_PAUSE
  const t = testi()
  return numeroDiPausa(
    // testo-fisso: il nome del campo, non si legge
    `pausa-giornata-${indice}-durataMin`,
    t.durata,
    t.durataDella(indice),
    { valore: durataMin, minimo: durata.minimo, massimo: durata.massimo, unita: t.min },
    al,
  )
}

/** Toglie una pausa, e la notifica ha «Annulla», che rimette le pause di prima. */
async function togliPausa (indice: number): Promise<void> {
  const prima = pauseVive()
  if (!prima) return
  if (!(await salvaPauseDaGesto(senzaLaPausa(prima, indice)))) return
  notificaAnnullabile(testi().tolta(indice), () => salvaPauseDaGesto(prima))
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
            if (ora === null || !vive) return
            void salvaPauseDaGesto({ ...vive, prima: { ...vive.prima, inizio: ora } })
          },
        }),
        campoDurata(0, () => pauseVive()?.prima.durataMin ?? pause.prima.durataMin, (durataMin) => {
          const vive = pauseVive()
          return vive ? salvaPause({ ...vive, prima: { ...vive.prima, durataMin } }) : undefined
        }),
      ]
    : [
        // L'etichetta dice la durata dell'UD del documento: la distanza si conta in quella.
        numeroDiPausa(
          // testo-fisso: il nome del campo, non si legge
          `pausa-giornata-${indice}-dopoUd`,
          t.dopoUd(minutiUd()),
          t.dopoUd(minutiUd()),
          {
            valore: () => pauseVive()?.seguenti[indice - 1]?.dopoUd ?? pause.seguenti[indice - 1].dopoUd,
            minimo: distanza.minimo,
            massimo: distanza.massimo,
            unita: t.unitaUd,
          },
          (ud) => {
            const vive = pauseVive()
            return vive ? salvaPause(conSeguente(vive, indice - 1, { dopoUd: ud })) : undefined
          },
        ),
        campoDurata(
          indice,
          () => pauseVive()?.seguenti[indice - 1]?.durataMin ?? pause.seguenti[indice - 1].durataMin,
          (durataMin) => {
            const vive = pauseVive()
            return vive ? salvaPause(conSeguente(vive, indice - 1, { durataMin })) : undefined
          },
        ),
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
        // Niente domanda: si toglie subito, e la notifica ha «Annulla».
        al: () => togliPausa(indice),
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
        void salvaPauseDaGesto(primaProposta())
        return
      }
      const durataMin = stato.registro.impostazioni.durataPausaPredefinita
      void salvaPauseDaGesto({
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
      avanzateAnno('giornata-pause', [campoDurataProposta()]),
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
  return voceAnno({
    nome: t.pausaNuova,
    aiuto: t.pausaNuovaAiuto,
    voce: 'durataPausaPredefinita',
    controllo: campoAnno(() => ({
      tipo: 'numero',
      chiave: 'durataPausaPredefinita',
      nome: t.pausaNuova,
      valore: stato.registro.impostazioni.durataPausaPredefinita,
      minimo: durata.minimo,
      massimo: durata.massimo,
      unita: t.min,
    }), (valore) => salvaConEsito({ durataPausaPredefinita: Number(valore) })),
  })
}
