// La giornata di scuola: durata dell'unità didattica, pause, inizio e fine del
// calendario, giorni mostrati. Quattro schede numerate nell'ordine in cui le
// misure dipendono l'una dall'altra: l'UD è il passo di tutto; le pause
// ancorano la griglia all'orologio; inizio e fine si scelgono sulla griglia,
// con la giornata disegnata sotto; i giorni non dipendono da niente.
// L'UD è `Impostazioni.minutiUd`. Si salva appena si tocca un campo (vedi
// `settings/document.ts`).

import {
  fineSullaGriglia,
  inizioSullaGriglia,
  scansioneDellaGiornata,
} from '../../../domain/breaks.js'
import { oreConAppello } from '../../../domain/calculations.js'
import {
  giorniBrevi,
  giorniLunghi,
  LIMITI_UD,
  durataMinuti,
  formattaDurata,
  minutiDaUd,
  udDaMinuti,
} from '../../../domain/dates.js'
import type { Impostazioni } from '../../../domain/models.js'
import { avviso, campo, pastiglia, pulsante, riga, scheda } from '../../components/base.js'
import { suggerimento } from '../../components/hint.js'
import { conferma } from '../../components/modal.js'
import { notifica } from '../../components/notifications.js'
import { h, type Figlio } from '../../dom.js'
import { stato } from '../../state.js'
import { schedaPauseGiornata } from './dayBreaks.js'
import { numeroBattuto, oraBattuta, salvaImpostazioni } from './document.js'
import { testi } from './schoolDay.testi.js'

/** I giorni della settimana con il loro numero ISO: 1 = lunedì. */
function giorni (): Array<{ numero: number, nome: string, breve: string }> {
  const brevi = giorniBrevi()
  return giorniLunghi().map((nome, indice) => ({ numero: indice + 1, nome, breve: brevi[indice] }))
}

/** Quante UD può proporre una lezione nuova: da una a una giornata piena. */
const UD_PROPOSTE = { minimo: 1, massimo: 8 } as const

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

  return scheda({
    titolo: t.udTitolo,
    aiuto: t.udAiuto,
    contenuto: h(
      'div',
      { class: 'modulo' },
      riga(
        campo({
          nome: 'minutiUd',
          etichetta: t.durataUdMinuti,
          tipo: 'number',
          valore: minutiUd,
          min: LIMITI_UD.minimo,
          max: LIMITI_UD.massimo,
          passo: 1,
          larghezza: 'quarto',
          disabilitato: conAppello > 0,
          al: (valore, evento) => {
            const campoUd = evento.target as HTMLInputElement
            const scritti = numeroBattuto(valore, t.durataUd)
            if (scritti === null || scritti === stato.registro.impostazioni.minutiUd) return
            void confermaNuovaUd(scritti).then((si) => {
              if (si) void salvaImpostazioni({ minutiUd: scritti })
              else campoUd.value = String(stato.registro.impostazioni.minutiUd)
            })
          },
        }),
        campo({
          nome: 'durataSlotPredefinita',
          etichetta: t.fasciaNuovaUd,
          tipo: 'number',
          valore: udProposte,
          min: UD_PROPOSTE.minimo,
          max: UD_PROPOSTE.massimo,
          passo: 1,
          larghezza: 'quarto',
          al: (valore) => {
            const ud = numeroBattuto(valore, t.fasciaNuova)
            if (ud === null) return
            const { minutiUd: attuali } = stato.registro.impostazioni
            void salvaImpostazioni({ durataSlotPredefinita: minutiDaUd(ud, attuali) })
          },
        }),
      ),
      h(
        'p',
        { class: 'giornata-riassunto' },
        pastiglia(t.unaUd(formattaDurata(minutiUd)), 'informativo', 'orologio'),
        pastiglia(t.lezioneNuova(udProposte, formattaDurata(udProposte * minutiUd)), 'quiete'),
      ),
      conAppello > 0
        ? avviso(t.fissata(conAppello, minutiUd), 'informativo')
        : null,
    ),
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
      lineaDellaGiornata(),
    ),
  })
}

// ------------------------------------------------------------ 4. i giorni

function schedaGiorni (): HTMLElement {
  const visibili = stato.registro.impostazioni.giorniVisibili
  const t = testi()

  return scheda({
    titolo: t.giorniTitolo,
    aiuto: t.giorniAiuto,
    contenuto: h(
      'div',
      { class: 'campo' },
      h(
        'span',
        { class: 'campo__etichetta' },
        t.giorniSettimana,
        suggerimento(t.giorniSettimanaAiuto, { etichetta: t.giorniSettimana }),
      ),
      h(
        'div',
        { class: 'scelta-giorni' },
        ...giorni().map((giorno) =>
          h(
            'button',
            {
              class: [
                'scelta-giorni__voce',
                visibili.includes(giorno.numero) && 'scelta-giorni__voce--attiva',
              ],
              type: 'button',
              attr: {
                'aria-pressed': visibili.includes(giorno.numero),
                title: giorno.nome,
              },
              onclick: () => {
                // I giorni di adesso, non quelli del disegno: due clic rapidi partono prima
                // del ridisegno.
                const attuali = new Set(stato.registro.impostazioni.giorniVisibili)
                if (attuali.has(giorno.numero)) attuali.delete(giorno.numero)
                else attuali.add(giorno.numero)
                if (attuali.size === 0) {
                  notifica(t.almenoUno, 'avviso')
                  return
                }
                void salvaImpostazioni({ giorniVisibili: [...attuali].sort((a, b) => a - b) })
              },
            },
            giorno.breve,
          ),
        ),
      ),
    ),
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
