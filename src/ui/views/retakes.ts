// I recuperi: le prove da rifare a chi non c'era.
// Nascono dall'appello dell'ora; qui si decide quando si rifà, o che non si
// rifà. Due forme: una riga per recupero nel todo e nel registro della lezione
// (prove diverse mescolate), una tabella dentro la prova (pochi nomi, stesse
// colonne).

import { Molti, Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { nomeCompleto } from '../../domain/calculations.js'
import { formattaData } from '../../domain/dates.js'
import type { Lezione, MomentoValutazione } from '../../domain/models.js'
import {
  type Recupero,
  type StatoRecupero,
  recuperiDelMomento,
  recuperiDellaLezione,
} from '../../domain/retakes.js'
import { postoAllegato } from '../components/attachments.js'
import {
  controlloData,
  dataInLinea,
  pastiglia,
  pulsante,
  scheda,
  titoloGruppo,
} from '../components/base.js'
import { eseguiOAvvisa } from '../components/filters.js'
import { h, type Figlio } from '../dom.js'
import { apriMomento } from '../calendarNavigation.js'
import { corsoPendenza, pendenza } from '../components/pending.js'
import { tabella } from '../components/table.js'
import { cellaNome } from '../components/avatar.js'
import { moduloRecupero } from '../forms.js'
import { notifica } from '../components/notifications.js'
import { azione } from '../bridge.js'
import {
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '../state.js'
import { SIGLA_ASSENTE, elencoVoti, grigliaVoti, lampeggiaErrore, leggiCasella } from './grades.js'
import { parole } from '../../domain/words.testi.js'
import { testi as testiVoti } from './grades.testi.js'
import { testi } from './retakes.testi.js'

/** Il tono della pastiglia di ogni stato; le parole stanno nel catalogo. */
const TONI: Record<
  StatoRecupero,
  'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete'
> = {
  'da-fissare': 'attenzione',
  scaduto: 'negativo',
  oggi: 'attenzione',
  fissato: 'informativo',
  fatto: 'positivo',
  dispensato: 'quiete',
}

/** La pastiglia dello stato di un recupero. */
function pastigliaStato (recupero: Recupero): HTMLElement {
  return pastiglia(testi().stati[recupero.stato], TONI[recupero.stato])
}

/**
 * La prossima ora del corso dopo oggi (non dopo la prova: un recupero fissato
 * nel passato nascerebbe arretrato). Fissarlo lì costa un clic.
 */
function prossimaOraDelCorso (corsoId: string): Lezione | null {
  return (
    stato.registro.lezioni
      .filter(
        (l) => l.corsoId === corsoId && l.data > stato.adessoData && l.stato !== 'annullata',
      )
      .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null
  )
}

interface OpzioniRigaRecupero {
  mostraCorso?: boolean
  mostraProva?: boolean
  mostraVoto?: boolean
  /**
   * Il giorno che i tasti scrivono: dentro un'ora quello dell'ora che si sta
   * verbalizzando, altrove oggi.
   */
  giorno?: string
}

function nomeAllievo (recupero: Recupero): string {
  return nomeCompleto(recupero.allievo)
}

/** Manda la decisione all'host: è lo stesso comando per tutte e tre le uscite. */
function fissa (
  recupero: Recupero,
  previstoIl: string | null,
  nota: string,
  dispensato: boolean,
): void {
  void eseguiOAvvisa({
    tipo: 'recupero.imposta',
    valutazioneId: recupero.momento.id,
    allievoId: recupero.allievo.id,
    previstoIl,
    nota,
    dispensato,
  })
}

/** Segna, o disdice, il giorno in cui la prova rifatta è tornata a chi l'ha fatta. */
function riconsegna (recupero: Recupero, il: string | null): void {
  void eseguiOAvvisa({
    tipo: 'recupero.imposta',
    valutazioneId: recupero.momento.id,
    allievoId: recupero.allievo.id,
    previstoIl: recupero.previstoIl,
    nota: recupero.nota,
    dispensato: false,
    riconsegnataIl: il,
  })
}

/**
 * Il giorno in cui la prova rifatta è tornata indietro: un campo e non una
 * spunta, perché la data conta (termini di ricorso) e va corretta. Il tasto
 * accanto la riempie con il giorno da cui si guarda.
 */
function dataRiconsegnaRecupero (recupero: Recupero): HTMLElement {
  const t = testi()
  return dataInLinea({
    etichetta: t.resaIl,
    // testo-fisso: nome del campo, non si legge
    nome: `resa-${recupero.momento.id}-${recupero.allievo.id}`,
    valore: recupero.riconsegnataIl ?? '',
    titolo: t.giornoRiavuta(nomeAllievo(recupero)),
    al: (valore) => riconsegna(recupero, valore || null),
  })
}

/**
 * I gesti che chiudono un recupero, sempre in quest'ordine: fissalo alla
 * prossima ora, aprilo per scegliere, dichiara che non si fa. `giorno` è la
 * data che i tasti scrivono.
 */
function comandiRecupero (
  recupero: Recupero,
  giorno: string,
  // Nella tabella la riconsegna ha già la sua colonna.
  conRiconsegna = true,
): Figlio[] {
  const t = testi()
  const prossima = prossimaOraDelCorso(recupero.corsoId)
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return [
    chiuso || !prossima
      ? null
      : pulsante({
          simbolo: 'calendario',
          variante: 'fantasma',
          titolo: t.rifaIl(formattaData(prossima.data, 'giorno')),
          al: () => fissa(recupero, prossima.data, recupero.nota, false),
        }),
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: t.decidi,
      al: () => moduloRecupero(recupero),
    }),
    // Rifatta e valutata: resta da ridarla.
    conRiconsegna && recupero.stato === 'fatto' ? dataRiconsegnaRecupero(recupero) : null,
    conRiconsegna && recupero.stato === 'fatto' && !recupero.riconsegnataIl
      ? pulsante({
          simbolo: 'spunta',
          variante: 'fantasma',
          titolo: t.riconsegnataIl(formattaData(giorno, 'giorno')),
          al: () => riconsegna(recupero, giorno),
        })
      : null,
    conRiconsegna && recupero.stato === 'fatto' && recupero.riconsegnataIl
      ? pulsante({
          simbolo: 'ricarica',
          variante: 'fantasma',
          titolo: t.nonEraTornata,
          al: () => riconsegna(recupero, null),
        })
      : null,
    recupero.stato === 'dispensato'
      ? pulsante({
          simbolo: 'ricarica',
          variante: 'fantasma',
          titolo: t.tornaARecuperarla,
          al: () => fissa(recupero, recupero.previstoIl, recupero.nota, false),
        })
      : recupero.stato === 'fatto'
        ? null
        : pulsante({
            simbolo: 'chiudi',
            variante: 'fantasma',
            titolo: t.nonSiRecupera,
            al: () => fissa(recupero, null, recupero.nota, true),
          }),
  ]
}

/**
 * La casella del voto del recupero: la stessa della griglia, raggiunta da qui.
 * Il voto finisce nella colonna della prova. Vuota lo toglie e riporta la riga
 * fra quelle da recuperare.
 */
function campoVotoRecupero (recupero: Recupero): HTMLElement {
  const t = testi()
  const mostrato = recupero.voto !== null ? String(recupero.voto) : ''
  // La stessa tendina della griglia: i voti della scala della prova, più la
  // sigla dell'assente.
  const lista = elencoVoti(recupero.momento.scala, [SIGLA_ASSENTE])

  const campo = h('input', {
    class: 'cella-voto cella-voto--recupero',
    type: 'text',
    value: mostrato,
    placeholder: '—',
    // Un `fuoco` riconoscibile, come nella griglia, perché i ridisegni continui non
    // sostituiscano il campo mentre si batte. Prefisso diverso da quello della
    // griglia, o il fuoco tornerebbe sulla casella sbagliata.
    // testo-fisso: chiave del fuoco, non si legge
    dataset: { fuoco: `recupero-${recupero.momento.id}-${recupero.allievo.id}` },
    attr: {
      'aria-label': t.votoDelRecuperoDi(nomeAllievo(recupero)),
      title: t.votoAiuto,
      inputmode: 'decimal',
      list: lista.id,
    },
    onchange: async (evento: Event) => {
      const elemento = evento.target as HTMLInputElement
      // Lo stesso lettore della griglia (`leggiCasella`): stessi significati di
      // vuoto e della sigla dell'assente.
      const letto = leggiCasella(elemento.value)
      if (!letto) {
        // Il valore battuto resta nel campo invece di tornare al voto di prima, come
        // per le date in `components/base.ts`.
        lampeggiaErrore(elemento)
        notifica(testiVoti().nonEUnVoto(elemento.value), 'errore')
        return
      }

      const risposta = await azione({
        tipo: 'voto.imposta',
        valutazioneId: recupero.momento.id,
        allievoId: recupero.allievo.id,
        valore: letto.valore,
        assente: letto.assente,
      })
      if (!risposta.ok) {
        elemento.value = mostrato
        lampeggiaErrore(elemento)
      }
    },
  })

  return h('span', { class: 'cella-voto__guscio' }, campo, lista.elemento)
}

/**
 * La data in cui la prova rifatta è tornata a chi l'ha fatta: una per allievo,
 * non quella della classe (da qui si contano i termini di un ricorso).
 */
function campoRiconsegnaRecupero (recupero: Recupero): HTMLElement {
  return controlloData({
    // testo-fisso: nome del campo, non si legge
    nome: `riconsegna-${recupero.momento.id}-${recupero.allievo.id}`,
    valore: recupero.riconsegnataIl ?? '',
    segnaposto: testi().formatoData,
    al: (valore) =>
      void eseguiOAvvisa({
        tipo: 'recupero.imposta',
        valutazioneId: recupero.momento.id,
        allievoId: recupero.allievo.id,
        previstoIl: recupero.previstoIl,
        nota: recupero.nota,
        dispensato: recupero.stato === 'dispensato',
        riconsegnataIl: String(valore) || null,
      }),
  })
}

/**
 * La graffetta della scansione: apre il PDF se c'è, lo chiede se manca.
 * Sostituirlo e toglierlo si fa dalla tabella dentro la prova.
 */
function graffettaRecupero (recupero: Recupero): Figlio {
  const t = testi()
  const foglio = recupero.documento
  return pulsante({
    simbolo: 'allegato',
    variante: 'fantasma',
    classe: foglio ? 'recupero__con-file' : undefined,
    titolo: foglio ? t.apri(foglio.nome) : t.allegaScansione(nomeAllievo(recupero)),
    al: () =>
      void (foglio
        ? azione({
            tipo: 'allegato.apri',
            valutazioneId: recupero.momento.id,
            allegatoId: foglio.id,
          })
        : azione({
            tipo: 'allegato.aggiungi',
            valutazioneId: recupero.momento.id,
            ruolo: 'recupero',
            allievoId: recupero.allievo.id,
          })),
  })
}

/**
 * Una riga: chi, quale prova, a che punto è, e i gesti che la chiudono. Per il
 * todo e il registro della lezione, dove ogni riga deve dire da sé di che prova si tratta.
 */
function rigaRecupero (
  recupero: Recupero,
  opzioni: OpzioniRigaRecupero = {},
): HTMLElement {
  const t = testi()
  // Il giorno che i tasti scrivono: quello dell'ora da cui si guarda, o oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  return pendenza({
    classe: 'recupero',
    // testo-fisso: classe CSS
    stato: [`recupero--${recupero.stato}`],
    testata: [
      h('strong', { class: 'recupero__allievo' }, nomeAllievo(recupero)),
      opzioni.mostraProva !== false
        ? h(
            'button',
            {
              class: 'recupero__prova',
              attr: { type: 'button', title: t.apriMomento },
              onclick: () => apriMomento({ id: recupero.momento.id, corsoId: recupero.corsoId }),
            },
            recupero.momento.titolo,
          )
        : null,
      opzioni.mostraCorso ? corsoPendenza('recupero', nomeCorso(recupero.corsoId)) : null,
      pastigliaStato(recupero),
    ],
    // I gesti tutti insieme in fondo, separati da chi e che cosa.
    azioni: [
      opzioni.mostraVoto === false ? null : campoVotoRecupero(recupero),
      graffettaRecupero(recupero),
      ...comandiRecupero(recupero, giorno),
    ],
    quando: [
      t.provaDel(formattaData(recupero.momento.data, 'giorno')),
      recupero.previstoIl
        ? h(
            'span',
            {
              class: [
                'recupero__data',
                recupero.stato === 'scaduto' && 'recupero__data--tardi',
              ],
            },
            t.siRifaIl(formattaData(recupero.previstoIl, 'giorno')),
          )
        : recupero.stato === 'da-fissare'
          ? h('span', { class: 'testo-quieto' }, t.nessunaData)
          : null,
      // Da dove viene l'assenza: dichiarata nella griglia, o dedotta dall'appello.
      recupero.daAppello ? h('span', { class: 'testo-quieto' }, t.dallAppello) : null,
      recupero.riconsegnataIl
        ? h(
            'span',
            { class: 'testo-quieto' },
            t.riconsegnataIlQuieto(formattaData(recupero.riconsegnataIl, 'giorno')),
          )
        : null,
      recupero.nota ? h('span', { class: 'testo-quieto' }, ` · ${recupero.nota}`) : null,
    ],
  })
}

/** Un mucchio di recuperi con il suo titolo e il suo conto. */
export function gruppoRecuperi (
  titolo: string,
  recuperi: Recupero[],
  opzioni: OpzioniRigaRecupero = {},
): Figlio {
  if (recuperi.length === 0) return null
  return h(
    'section',
    { class: 'recuperi__gruppo' },
    titolo ? titoloGruppo(titolo, recuperi.length) : null,
    ...recuperi.map((recupero) => rigaRecupero(recupero, opzioni)),
  )
}

/** Una riga della tabella dentro la prova. */
function rigaTabella (recupero: Recupero): HTMLElement {
  const t = testi()
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return h(
    'tr',
    { class: chiuso ? 'tabella__riga--spenta' : undefined },
    h('td', { class: 'tabella__nome' }, cellaNome(recupero.allievo, nomeAllievo(recupero))),
    h(
      'td',
      null,
      recupero.previstoIl
        ? h(
            'span',
            { class: recupero.stato === 'scaduto' ? 'recupero__data--tardi' : undefined },
            formattaData(recupero.previstoIl, 'giorno'),
          )
        : h('span', { class: 'testo-quieto' }, '—'),
    ),
    // Il voto accanto al giorno in cui la prova è stata rifatta.
    h('td', { class: 'tabella__numero' }, campoVotoRecupero(recupero)),
    // La riconsegna fra voto e stato: è il passo dopo la correzione.
    h(
      'td',
      { class: 'recuperi__riconsegna' },
      campoRiconsegnaRecupero(recupero),
      // La spunta sta nella cella della data: riempie quel campo.
      recupero.stato === 'fatto' && !recupero.riconsegnataIl
        ? pulsante({
            simbolo: 'spunta',
            variante: 'fantasma',
            titolo: t.riconsegnataIl(formattaData(stato.adessoData, 'giorno')),
            al: () => riconsegna(recupero, stato.adessoData),
          })
        : null,
    ),
    h('td', null, pastigliaStato(recupero)),
    h(
      'td',
      { class: 'recuperi__scansione' },
      postoAllegato(recupero.momento, 'recupero', t.scansione, {
        allievoId: recupero.allievo.id,
      }),
    ),
    h(
      'td',
      { class: 'tabella__azioni' },
      ...comandiRecupero(recupero, stato.adessoData, false),
    ),
  )
}

/**
 * La tabella dei recuperi di una prova, assente se non ce ne sono. In cima il
 * testo della prova di recupero, unico per tutti.
 */
export function pannelloRecuperi (momento: MomentoValutazione): Figlio {
  const classe = classeDiMomento(momento)
  const recuperi = recuperiDelMomento(stato.registro, momento, classe, stato.adessoData)
  if (recuperi.length === 0) return null

  const aperti = recuperi.filter((r) => r.stato !== 'fatto' && r.stato !== 'dispensato')
  const daFissare = aperti.filter((r) => r.stato === 'da-fissare')
  const t = testi()
  const L = lessico()

  return scheda({
    titolo: Molti(L.recupero),
    sottotitolo:
      daFissare.length > 0
        ? t.daFissareInSospeso(daFissare.length, aperti.length)
        : aperti.length > 0
          ? t.inSospeso(aperti.length)
          : t.tuttiSistemati,
    aiuto: t.aiuto,
    classe: 'scheda--recuperi',
    contenuto: h(
      'div',
      { class: 'recuperi' },
      postoAllegato(momento, 'recupero', t.testoDelRecupero),
      postoAllegato(momento, 'recupero-soluzione', L.ruoliAllegato['recupero-soluzione']),
      tabella({
        variante: 'recuperi',
        intestazione: [
          h('th', null, Uno(L.pif)),
          h('th', null, t.colonnaSiRifaIl),
          h('th', { class: 'tabella__numero' }, Uno(L.voto)),
          h('th', null, t.colonnaRiconsegnataIl),
          h('th', null, parole().stato),
          h('th', null, t.scansione),
          h('th', { class: 'tabella__azioni' }, ''),
        ],
        righe: recuperi.map(rigaTabella),
      }),
    ),
  })
}

/**
 * I recuperi previsti in un'ora, dentro la scheda Valutazioni dell'ora. In
 * cima la griglia della prova che si rifà, ristretta a chi la rifà; sotto, le
 * righe con provenienza, data fissata, scansione e comandi. Il voto non si
 * ripete nelle righe.
 */
export function bloccoRecuperiDellOra (lezione: Lezione): Figlio {
  const recuperi = recuperiDellaLezione(stato.registro, lezione)
  if (recuperi.length === 0) return null

  const classe = classeDiLezione(lezione)
  // Le prove che oggi si rifanno, ognuna una volta sola.
  const momenti: MomentoValutazione[] = []
  for (const recupero of recuperi) {
    if (!momenti.some((m) => m.id === recupero.momento.id)) momenti.push(recupero.momento)
  }
  const chi = [...new Set(recuperi.map((r) => r.allievo.id))]

  return h(
    'div',
    { class: 'recuperi recuperi--ora' },
    h(
      'h5',
      { class: 'recuperi__intestazione' },
      testi().recuperiDiOggi(recuperi.length),
    ),
    classe ? grigliaVoti(classe, momenti, { soloAllievi: chi, medie: false }) : null,
    // Qui i tasti scrivono la data di quest'ora, il giorno che si verbalizza.
    gruppoRecuperi('', recuperi, {
      mostraCorso: false,
      mostraVoto: false,
      giorno: lezione.data,
    }),
  )
}
