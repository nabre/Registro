// La giornata di scuola: durata dell'unità didattica, pause, inizio e fine del
// calendario, giorni mostrati. Quattro schede numerate nell'ordine in cui le
// misure dipendono l'una dall'altra: l'UD è il passo di tutto; le pause
// ancorano la griglia all'orologio; inizio e fine si scelgono sulla griglia,
// con la giornata disegnata sotto; i giorni non dipendono da niente.
// L'UD è `Impostazioni.minutiUd`. Si salva appena si tocca un campo (vedi
// `settings/document.ts`); i campi dei controlli condivisi (`campoAnno`) dicono
// l'esito accanto a sé. In fondo, chiusi, i valori proposti per le cose nuove.

import {
  MINIMO_UD_AI_CAPI,
  fineConUd,
  fineSullaGriglia,
  inizioConUd,
  inizioSullaGriglia,
  scansioneDellaGiornata,
  udAiCapi,
} from '#core/dominio/breaks.js'
import { oreConAppello } from '#core/dominio/calculations.js'
import {
  giorniBrevi,
  giorniLunghi,
  LIMITI_UD,
  durataMinuti,
  formattaDurata,
  minutiDaUd,
  sommaMinuti,
  udDaMinuti,
} from '#core/dominio/dates.js'
import type { Impostazioni, Ora } from '#core/dominio/models.js'
import { avviso, campo, pastiglia, pulsante, riga, scheda } from '#ui/pannello/components/base.js'
import { conferma } from '#ui/pannello/components/modal.js'
import { notifica } from '#ui/pannello/components/notifications.js'
import { avanzateAnno, campoAnno, gruppoAnno, sezioneAnno, voceAnno } from '#ui/pannello/components/yearSetting.js'
import { comeElenco } from '#core/controlli/field.js'
import { h, type Figlio } from '#ui/pannello/dom.js'
import { stato } from '#ui/pannello/state.js'
import { schedaPauseGiornata } from './dayBreaks.js'
import { oraBattuta, salvaConEsito, salvaImpostazioni } from './document.js'
import { testi } from './schoolDay.testi.js'

/** I giorni della settimana con il loro numero ISO: 1 = lunedì. */
function giorni (): Array<{ numero: number, nome: string, breve: string }> {
  const brevi = giorniBrevi()
  return giorniLunghi().map((nome, indice) => ({ numero: indice + 1, nome, breve: brevi[indice] }))
}

/** Quante UD può proporre una lezione nuova: da una a una giornata piena. */
const UD_PROPOSTE = { minimo: 1, massimo: 8 } as const

/** Le durate dell'UD che le scuole usano; le altre con «Altro…». */
const DURATE_UD = [45, 50, 60, 90] as const

// ------------------------------------------------------ 1. l'unità didattica

/**
 * Chiede conferma prima di cambiare l'UD quando qualcosa la usa già: non si
 * perde niente (l'host tiene le UD di fasce e ore, `impostazioni.salva`), ma
 * cambiano gli orari di tutto l'anno.
 */
async function confermaNuovaUd (minutiUd: number): Promise<boolean> {
  const registro = stato.registro
  const fasce = registro.corsi.reduce((somma, corso) => somma + corso.orario.length, 0)
  const ore = registro.lezioni.length
  if (fasce === 0 && ore === 0) return true
  const t = testi()
  return conferma({
    titolo: t.nuovaUdTitolo(minutiUd),
    testo: t.nuovaUdTesto(fasce, ore, formattaDurata(2 * minutiUd)),
    testoConferma: t.cambia,
  })
}

function schedaUnitaDidattica (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const { minutiUd } = impostazioni
  const conAppello = oreConAppello(stato.registro.lezioni)
  const udProposte = udDaMinuti(impostazioni.durataSlotPredefinita, minutiUd)
  const t = testi()

  const durata = voceAnno({
    nome: t.durataUd,
    voce: 'minutiUd',
    controllo: campoAnno(() => ({
      tipo: 'tendina',
      chiave: 'minutiUd',
      nome: t.durataUd,
      valore: stato.registro.impostazioni.minutiUd,
      scelte: DURATE_UD.map((minuti) => ({ valore: minuti, nome: t.minuti(minuti) })),
      altro: t.altro,
      minimo: LIMITI_UD.minimo,
      massimo: LIMITI_UD.massimo,
      unita: t.min,
      spento: oreConAppello(stato.registro.lezioni) > 0,
    }), async (valore) => {
      const scritti = Number(valore)
      if (scritti === stato.registro.impostazioni.minutiUd) return undefined
      // «No» alla domanda: il campo torna com'era, senza dire niente.
      if (!(await confermaNuovaUd(scritti))) return ''
      return salvaConEsito({ minutiUd: scritti })
    }),
    sotto: conAppello > 0 ? avviso(t.fissata(conAppello, minutiUd), 'informativo') : null,
  })

  // Una proposta per le cose nuove, non una misura della giornata: fra le avanzate.
  const fasciaNuova = voceAnno({
    nome: t.fasciaNuova,
    voce: 'durataSlotPredefinita',
    controllo: campoAnno(() => ({
      tipo: 'numero',
      chiave: 'durataSlotPredefinita',
      nome: t.fasciaNuova,
      valore: udDaMinuti(
        stato.registro.impostazioni.durataSlotPredefinita,
        stato.registro.impostazioni.minutiUd,
      ),
      minimo: UD_PROPOSTE.minimo,
      massimo: UD_PROPOSTE.massimo,
      unita: t.unitaUd,
    }), (valore) => salvaConEsito({
      durataSlotPredefinita: minutiDaUd(Number(valore), stato.registro.impostazioni.minutiUd),
    })),
  })

  return scheda({
    titolo: t.udTitolo,
    aiuto: t.udAiuto,
    contenuto: sezioneAnno({
      stato: h(
        'p',
        { class: 'giornata-riassunto' },
        pastiglia(t.unaUd(formattaDurata(minutiUd)), 'informativo', 'orologio'),
        pastiglia(t.lezioneNuova(udProposte, formattaDurata(udProposte * minutiUd)), 'quiete'),
      ),
      scelte: gruppoAnno(null, durata),
      avanzate: avanzateAnno('giornata-ud', [fasciaNuova]),
    }),
  })
}

// -------------------------------------------- 3. l'inizio e la fine, e la griglia

/** Uno dei due estremi della giornata. */
type EstremoGiornata = 'oraInizioGiornata' | 'oraFineGiornata'

/** Salva un estremo della giornata, e solo quello. */
function salvaEstremo (chiave: EstremoGiornata, ora: string): void {
  const modifica: Partial<Pick<Impostazioni, EstremoGiornata>> = {}
  modifica[chiave] = ora
  void salvaImpostazioni(modifica)
}

/**
 * Il pulsante che porta un orario sulla griglia delle pause, se non ci sta:
 * l'inizio dove un'UD può cominciare, la fine dove finisce. Senza pause ogni
 * ora va bene.
 */
function allineaAllaGriglia (ora: string, chiave: EstremoGiornata): Figlio {
  const giornata = stato.registro.impostazioni
  if (!giornata.pause) return null
  const sullaGriglia = chiave === 'oraInizioGiornata'
    ? inizioSullaGriglia(ora, giornata)
    : fineSullaGriglia(ora, giornata)
  if (sullaGriglia === ora) return null
  const t = testi()
  return pulsante({
    testo: t.portaAlle(sullaGriglia),
    simbolo: 'orologio',
    variante: 'sottile',
    titolo: chiave === 'oraInizioGiornata' ? t.allineaInizio : t.allineaFine,
    al: () => salvaEstremo(chiave, sullaGriglia),
  })
}

// Senza pause, l'ora da cui si contano le UD ai capi: una pausa di zero
// minuti. Non è un dato del documento: vive finché il pannello è aperto, e
// all'inizio sta alla fine delle prime UD ammesse (`MINIMO_UD_AI_CAPI`).
let riferimentoSenzaPause: Ora | undefined

function riferimento (): Ora {
  if (riferimentoSenzaPause) return riferimentoSenzaPause
  const { oraInizioGiornata, minutiUd } = stato.registro.impostazioni
  return sommaMinuti(oraInizioGiornata, MINIMO_UD_AI_CAPI * minutiUd)
}

/**
 * Il capo della giornata con `ud` UD dalla sua ancora, se sta nel giorno e la
 * giornata non resta vuota.
 */
function capoConUd (chiave: EstremoGiornata, ud: number, rif: Ora): Ora | null {
  const giornata = stato.registro.impostazioni
  if (chiave === 'oraInizioGiornata') {
    const ora = inizioConUd(giornata, ud, rif)
    return ora !== null && ora < giornata.oraFineGiornata ? ora : null
  }
  const ora = fineConUd(giornata, ud, rif)
  return ora !== null && ora > giornata.oraInizioGiornata ? ora : null
}

/**
 * Un contatore di UD a un capo della giornata: − e + tolgono e aggiungono
 * un'UD intera. Fuori griglia il primo gesto porta sulla griglia: − toglie
 * l'avanzo con l'UD spezzata, + la completa.
 */
function contatoreCapo (chiave: EstremoGiornata, etichetta: string, esatte: number, rif: Ora): HTMLElement {
  const t = testi()
  const intere = Math.floor(esatte)
  const meno = capoConUd(chiave, Math.ceil(esatte) - 1, rif)
  const piu = capoConUd(chiave, intere + 1, rif)
  return h(
    'div',
    { class: ['campo', 'campo--quarto'] },
    h('span', { class: 'campo__etichetta' }, etichetta),
    h(
      'div',
      { class: 'contatore-ud', attr: { role: 'group', 'aria-label': etichetta } },
      pulsante({
        simbolo: 'meno',
        variante: 'sottile',
        titolo: t.unaUdInMeno(etichetta),
        disabilitato: meno === null,
        al: () => { if (meno !== null) salvaEstremo(chiave, meno) },
      }),
      h('output', { class: 'contatore-ud__valore' }, String(intere)),
      pulsante({
        simbolo: 'piu',
        variante: 'sottile',
        titolo: t.unaUdInPiu(etichetta),
        disabilitato: piu === null,
        al: () => { if (piu !== null) salvaEstremo(chiave, piu) },
      }),
    ),
  )
}

/**
 * Senza pause, l'ora di riferimento: spostarla sposta la giornata intera,
 * con le stesse UD intere prima e dopo, come si sposterebbe una pausa.
 */
function campoRiferimento (conti: { prima: number, dopo: number }): HTMLElement {
  const t = testi()
  return campo({
    nome: 'riferimentoGiornata',
    etichetta: t.oraRiferimento,
    aiuto: t.oraRiferimentoAiuto,
    tipo: 'time',
    valore: riferimento(),
    larghezza: 'quarto',
    al: (valore, evento) => {
      const campoOra = evento.target as HTMLInputElement
      const ora = oraBattuta(valore, t.oraRiferimento)
      if (ora === null) return
      const giornata = stato.registro.impostazioni
      const ud = (esatte: number) => Math.max(MINIMO_UD_AI_CAPI, Math.floor(esatte))
      const inizio = inizioConUd(giornata, ud(conti.prima), ora)
      const fine = fineConUd(giornata, ud(conti.dopo), ora)
      if (inizio === null || fine === null || inizio >= fine) {
        notifica(t.fuoriDalGiorno, 'avviso')
        campoOra.value = riferimento()
        return
      }
      riferimentoSenzaPause = ora
      void salvaImpostazioni({ oraInizioGiornata: inizio, oraFineGiornata: fine })
    },
  })
}

/** I contatori di UD ai due capi, e senza pause l'ora da cui si contano. */
function capiInUd (): HTMLElement {
  const giornata = stato.registro.impostazioni
  const rif = riferimento()
  const conti = udAiCapi(giornata, giornata.oraInizioGiornata, giornata.oraFineGiornata, rif)
  const t = testi()
  const conPause = Boolean(giornata.pause)
  return riga(
    conPause ? null : campoRiferimento(conti),
    contatoreCapo('oraInizioGiornata', conPause ? t.udPrimaPausa : t.udPrimaRiferimento, conti.prima, rif),
    contatoreCapo('oraFineGiornata', conPause ? t.udDopoPausa : t.udDopoRiferimento, conti.dopo, rif),
  )
}

/**
 * La giornata disegnata: UD numerate, pause, minuti che avanzano. Un avanzo
 * segnala un inizio fuori griglia o una giornata che finisce a metà UD: non è
 * un errore, ma le lezioni lì cominciano sfasate.
 */
function lineaDellaGiornata (): HTMLElement {
  const giornata = stato.registro.impostazioni
  const tratti = scansioneDellaGiornata(
    giornata,
    giornata.oraInizioGiornata,
    giornata.oraFineGiornata,
  )
  const totale = tratti.reduce((somma, t) => somma + durataMinuti(t.inizio, t.fine), 0)
  let numero = 0
  const avanzi = tratti.filter((t) => t.tipo === 'avanzo').length
  const detti = testi()

  return h(
    'div',
    { class: 'giornata-linea' },
    h(
      'ol',
      { class: 'giornata-linea__tratti', attr: { 'aria-label': detti.lineaEtichetta } },
      ...tratti.map((tratto) => {
        const quanto = durataMinuti(tratto.inizio, tratto.fine)
        if (tratto.tipo === 'ud') numero += 1
        const nome = tratto.tipo === 'ud'
          ? detti.trattoUd(numero)
          : tratto.tipo === 'pausa' ? detti.pausa : detti.avanzo
        return h(
          'li',
          {
            class: ['giornata-linea__tratto', `giornata-linea__tratto--${tratto.tipo}`],
            style: { flexGrow: String(quanto) },
            attr: { title: `${nome} · ${tratto.inizio}–${tratto.fine} · ${formattaDurata(quanto)}` },
          },
          tratto.tipo === 'ud' ? String(numero) : null,
        )
      }),
    ),
    h(
      'div',
      { class: 'giornata-linea__estremi' },
      h('span', null, giornata.oraInizioGiornata),
      h(
        'span',
        { class: 'testo-quieto' },
        detti.udIntere(numero, formattaDurata(totale)),
      ),
      h('span', null, giornata.oraFineGiornata),
    ),
    avanzi > 0
      ? h(
          'p',
          { class: 'giornata-linea__nota' },
          pastiglia(detti.avanzi(avanzi), 'attenzione', 'avviso'),
          detti.avanziNota,
        )
      : null,
  )
}

function schedaOrari (): HTMLElement {
  const impostazioni = stato.registro.impostazioni
  const campoOra = (chiave: EstremoGiornata, etichetta: string): HTMLElement => {
    const involucro = campo({
      nome: chiave,
      etichetta,
      tipo: 'time',
      valore: impostazioni[chiave],
      larghezza: 'quarto',
      al: (valore) => {
        const ora = oraBattuta(valore, etichetta)
        if (ora !== null) salvaEstremo(chiave, ora)
      },
    })
    const allinea = allineaAllaGriglia(impostazioni[chiave], chiave)
    if (allinea) involucro.append(h('div', { class: 'campo__sotto' }, allinea))
    return involucro
  }

  const t = testi()
  return scheda({
    titolo: t.orariTitolo,
    aiuto: t.orariAiuto,
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campoOra('oraInizioGiornata', t.primaOra),
        campoOra('oraFineGiornata', t.ultimaOra),
      ),
      capiInUd(),
      lineaDellaGiornata(),
    ),
  })
}

// ------------------------------------------------------------ 4. i giorni

function schedaGiorni (): HTMLElement {
  const t = testi()
  return scheda({
    titolo: t.giorniTitolo,
    aiuto: t.giorniAiuto,
    contenuto: gruppoAnno(null, voceAnno({
      nome: t.giorniSettimana,
      aiuto: t.giorniSettimanaAiuto,
      voce: 'giorniVisibili',
      // I giorni che si mandano li leggono i pulsanti vivi (`multipli`): due clic
      // rapidi partono prima del ridisegno, e il secondo tiene conto del primo.
      controllo: campoAnno(() => ({
        tipo: 'multipli',
        chiave: 'giorniVisibili',
        nome: t.giorniSettimana,
        valore: stato.registro.impostazioni.giorniVisibili,
        scelte: giorni().map((giorno) => ({ valore: giorno.numero, nome: giorno.breve, aiuto: giorno.nome })),
        almeno: { quante: 1, motivo: t.almenoUno },
      }), (valore) => salvaConEsito({
        giorniVisibili: comeElenco(valore).map(Number).sort((a, b) => a - b),
      })),
    })),
  })
}

/**
 * Le quattro schede della giornata, in ordine. Il numero davanti ai titoli lo
 * mette il foglio di stile contandole.
 */
export function contenutoGiornata (): Figlio[] {
  return [
    h(
      'div',
      { class: 'giornata-passi' },
      schedaUnitaDidattica(),
      schedaPauseGiornata(),
      schedaOrari(),
      schedaGiorni(),
    ),
  ]
}
