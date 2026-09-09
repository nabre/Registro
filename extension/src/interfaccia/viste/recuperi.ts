// I recuperi: le prove da rifare a chi non c'era.
//
// Sono l'unico buco del registro che non si chiude da solo. Una consegna non
// spuntata torna a galla a ogni ora; un'assenza a una verifica invece resta
// una casella vuota, e le caselle vuote non chiedono niente a nessuno — finché
// a giugno la media di quell'allievo è fatta su tre voti invece che su cinque.
//
// Qui compaiono senza essere stati scritti: l'appello dell'ora dice già chi non
// c'era, e da lì nasce la riga. Quel che si aggiunge è la decisione — quando si
// rifà, o che non si rifà — ed è tutto quello che questa pagina chiede.
//
// Due forme, per due posti. Nel todo e nel registro dell'ora una riga per
// recupero, con il corso e la prova, perché lì si mescolano prove diverse di
// classi diverse. Dentro la prova invece una tabella: gli assenti di *quella*
// verifica sono due o tre nomi, con le stesse quattro colonne per tutti —
// quando si rifà, che voto ne è uscito, dov'è la scansione — e una tabella si
// legge in orizzontale mentre un elenco di schede va letto una alla volta.

import { formattaData } from '../../dominio/date.js'
import type { Lezione, MomentoValutazione } from '../../dominio/modelli.js'
import {
  type Recupero,
  type StatoRecupero,
  recuperiDelMomento,
  recuperiDellaLezione,
} from '../../dominio/recuperi.js'
import { postoAllegato } from '../componenti/allegati.js'
import { controlloData, dataInLinea, pastiglia, pulsante, scheda } from '../componenti/base.js'
import { eseguiOAvvisa } from '../componenti/filtri.js'
import { h, type Figlio } from '../dom.js'
import { moduloRecupero } from '../moduli.js'
import { azione } from '../ponte.js'
import {
  aggiorna,
  classeDelCorsoId,
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '../stato.js'
import { elencoVoti, grigliaVoti } from './valutazioni.js'

const PASTIGLIE: Record<
  StatoRecupero,
  { testo: string, tono: 'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete' }
> = {
  'da-fissare': { testo: 'da fissare', tono: 'attenzione' },
  scaduto: { testo: 'non rifatta', tono: 'negativo' },
  oggi: { testo: 'oggi', tono: 'attenzione' },
  fissato: { testo: 'fissato', tono: 'informativo' },
  fatto: { testo: 'recuperata', tono: 'positivo' },
  dispensato: { testo: 'non si recupera', tono: 'quiete' },
}

/**
 * La prossima ora del corso in cui il recupero potrebbe stare.
 *
 * È la risposta giusta quasi sempre — «lo rifai la prossima volta» — ed è il
 * motivo per cui fissare un recupero deve costare un clic e non una finestra.
 * Si cerca dopo oggi e non dopo la prova: un recupero fissato in una data già
 * passata nasce arretrato, che è peggio di non averlo fissato.
 */
export function prossimaOraDelCorso (corsoId: string): Lezione | null {
  return (
    stato.registro.lezioni
      .filter(
        (l) => l.corsoId === corsoId && l.data > stato.adessoData && l.stato !== 'annullata',
      )
      .sort((a, b) => a.data.localeCompare(b.data))[0] ?? null
  )
}

export interface OpzioniRigaRecupero {
  mostraCorso?: boolean
  mostraProva?: boolean
  mostraVoto?: boolean
  /**
   * Il giorno che i tasti scrivono, quando scrivono una data.
   *
   * Dentro un'ora è quella dell'ora: si sta guardando il registro di giovedì,
   * e «riconsegnata» vuol dire giovedì — non oggi, che è il giorno in cui si
   * sta sistemando il registro. Altrove vale oggi.
   */
  giorno?: string
}

function nomeAllievo (recupero: Recupero): string {
  return `${recupero.allievo.cognome} ${recupero.allievo.nome}`.trim()
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

/** Segna, o disdice, il giorno in cui la prova rifatta è tornata all'allievo. */
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
 * Il giorno in cui la prova rifatta è tornata all'allievo: un campo, non una
 * spunta.
 *
 * Una spunta scrive una data che nessuno ha scelto, e la data della riconsegna
 * non è un dettaglio contabile: da lì si contano i termini di un ricorso, ed è
 * la sola prova che quell'allievo ha visto il proprio voto. Il campo la mostra
 * e la lascia correggere; il tasto accanto la riempie con il giorno da cui si
 * sta guardando — l'ora aperta nel registro, o oggi se si sta altrove.
 */
function dataRiconsegnaRecupero (recupero: Recupero): HTMLElement {
  return dataInLinea({
    etichetta: 'resa il',
    nome: `resa-${recupero.momento.id}-${recupero.allievo.id}`,
    valore: recupero.riconsegnataIl ?? '',
    titolo: `Il giorno in cui ${nomeAllievo(recupero)} ha riavuto la prova rifatta`,
    al: (valore) => riconsegna(recupero, valore || null),
  })
}

/**
 * I gesti che chiudono un recupero, sempre gli stessi e sempre in
 * quest'ordine: fissalo alla prossima ora, aprilo per scegliere, dichiara che
 * non si fa. Sono tre perché tre sono le uscite, e toglierne uno vorrebbe dire
 * un mucchio di casi che resta aperto per sempre.
 *
 * `giorno` è la data che i tasti scrivono: dentro un'ora è quella dell'ora —
 * si sta guardando il registro di giovedì, e «riconsegnata» vuol dire giovedì —
 * altrimenti oggi.
 */
function comandiRecupero (
  recupero: Recupero,
  giorno: string,
  // Nella tabella la riconsegna ha già la sua colonna: ripeterla in fondo
  // vorrebbe dire lo stesso campo due volte nella stessa riga, a dieci
  // centimetri di distanza, con due date che possono divergere sotto gli occhi
  // di chi guarda.
  conRiconsegna = true,
): Figlio[] {
  const prossima = prossimaOraDelCorso(recupero.corsoId)
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return [
    chiuso || !prossima
      ? null
      : pulsante({
          simbolo: 'calendario',
          variante: 'fantasma',
          titolo: `Rifà la prova il ${formattaData(prossima.data, 'giorno')}, prossima ora del corso`,
          al: () => fissa(recupero, prossima.data, recupero.nota, false),
        }),
    pulsante({
      simbolo: 'matita',
      variante: 'fantasma',
      titolo: 'Fissa il giorno, scrivi una nota, o dichiara che non si recupera',
      al: () => moduloRecupero(recupero),
    }),
    // Rifatta e valutata: quel che resta è ridarla. Il campo porta la data,
    // il tasto la riempie con il giorno da cui si sta guardando.
    conRiconsegna && recupero.stato === 'fatto' ? dataRiconsegnaRecupero(recupero) : null,
    conRiconsegna && recupero.stato === 'fatto' && !recupero.riconsegnataIl
      ? pulsante({
          simbolo: 'spunta',
          variante: 'fantasma',
          titolo: `Riconsegnata il ${formattaData(giorno, 'giorno')}`,
          al: () => riconsegna(recupero, giorno),
        })
      : null,
    conRiconsegna && recupero.stato === 'fatto' && recupero.riconsegnataIl
      ? pulsante({
          simbolo: 'ricarica',
          variante: 'fantasma',
          titolo: 'Non era tornata: rimettila fra quelle da riconsegnare',
          al: () => riconsegna(recupero, null),
        })
      : null,
    recupero.stato === 'dispensato'
      ? pulsante({
          simbolo: 'ricarica',
          variante: 'fantasma',
          titolo: 'Torna a recuperarla',
          al: () => fissa(recupero, recupero.previstoIl, recupero.nota, false),
        })
      : recupero.stato === 'fatto'
        ? null
        : pulsante({
            simbolo: 'chiudi',
            variante: 'fantasma',
            titolo: 'Non si recupera: la casella resta vuota',
            al: () => fissa(recupero, null, recupero.nota, true),
          }),
  ]
}

/**
 * La casella in cui si mette il voto del recupero.
 *
 * È la casella della griglia, raggiunta da dove serve. Un recupero si fa un
 * altro giorno, in un'altra ora: chi lo corregge sta guardando questa riga —
 * nel todo, o entrando in aula — e mandarlo a cercare la colonna giusta nella
 * griglia della prova originale è il giro lungo di una cifra da battere. Il
 * voto è di quella prova e finisce nella sua colonna: qui cambia solo da dove
 * lo si digita.
 *
 * Vuoto lo toglie e riporta la riga fra quelle da recuperare: è il modo di
 * disfare una battuta sbagliata senza cercare altrove.
 */
function campoVotoRecupero (recupero: Recupero): HTMLElement {
  const mostrato = recupero.voto !== null ? String(recupero.voto) : ''
  // La stessa tendina della griglia: i voti che la scala di questa prova
  // ammette, sul suo passo. Si può scrivere o scegliere, come là.
  const lista = elencoVoti(recupero.momento.scala)

  const campo = h('input', {
    class: 'cella-voto cella-voto--recupero',
    type: 'text',
    value: mostrato,
    placeholder: '—',
    attr: {
      'aria-label': `Voto del recupero di ${nomeAllievo(recupero)}`,
      title: 'Il voto preso rifacendo la prova: va nella colonna di questa verifica',
      inputmode: 'decimal',
      list: lista.id,
    },
    onchange: async (evento: Event) => {
      const elemento = evento.target as HTMLInputElement
      const scritto = elemento.value.trim().replace(',', '.')
      // Vuoto vuol dire «non ancora»: la casella torna assente, e la riga
      // torna fra quelle da rifare. Non è la stessa cosa che uno zero.
      const numero = scritto === '' ? null : Number(scritto)
      if (numero !== null && !Number.isFinite(numero)) {
        elemento.value = mostrato
        elemento.classList.add('cella-voto--errata')
        setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
        return
      }

      const risposta = await azione({
        tipo: 'voto.imposta',
        valutazioneId: recupero.momento.id,
        allievoId: recupero.allievo.id,
        valore: numero,
        assente: numero === null,
      })
      if (!risposta.ok) {
        elemento.value = mostrato
        elemento.classList.add('cella-voto--errata')
        setTimeout(() => elemento.classList.remove('cella-voto--errata'), 800)
      }
    },
  })

  return h('span', { class: 'cella-voto__guscio' }, campo, lista.elemento)
}

/**
 * La data in cui la prova rifatta è tornata in mano a quell'allievo.
 *
 * Una per allievo, e non quella della classe: la verifica è stata ridata a
 * tutti il giorno in cui la si è ridistribuita, ma il compito di chi l'ha
 * rifatta a gennaio non esisteva ancora — segnarci sopra la data della classe
 * sarebbe una data falsa, e da quella si contano i termini di un ricorso.
 *
 * Si scrive prima di chiudere del tutto la faccenda, e non è un dettaglio
 * contabile: è la sola prova che quell'allievo ha visto il proprio voto.
 */
function campoRiconsegnaRecupero (recupero: Recupero): HTMLElement {
  return controlloData({
    nome: `riconsegna-${recupero.momento.id}-${recupero.allievo.id}`,
    valore: recupero.riconsegnataIl ?? '',
    segnaposto: 'gg.mm.aaaa',
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
 * La graffetta della scansione: apre il PDF se c'è, lo chiede se non c'è.
 *
 * Un tasto solo e non due perché in una riga di elenco lo spazio è quello che
 * è, e le due cose non capitano mai insieme: finché il foglio non c'è si può
 * solo aggiungerlo, e quando c'è quel che serve è aprirlo. Sostituirlo e
 * toglierlo si fanno dalla tabella dentro la prova, dove c'è posto.
 */
function graffettaRecupero (recupero: Recupero): Figlio {
  const foglio = recupero.documento
  return pulsante({
    simbolo: 'allegato',
    variante: 'fantasma',
    classe: foglio ? 'recupero__con-file' : undefined,
    titolo: foglio
      ? `Apri ${foglio.nome}`
      : `Allega la scansione del recupero di ${nomeAllievo(recupero)}`,
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
 * Una riga: chi, quale prova, a che punto è, e i gesti che la chiudono.
 *
 * È la forma per il todo e per il registro dell'ora, dove i recuperi di prove
 * diverse stanno uno sotto l'altro: ogni riga deve dire da sola di che prova
 * si tratta, perché la colonna che lo direbbe non c'è.
 */
export function rigaRecupero (
  recupero: Recupero,
  opzioni: OpzioniRigaRecupero = {},
): HTMLElement {
  const etichetta = PASTIGLIE[recupero.stato]
  // Il giorno che i tasti scrivono: quello dell'ora da cui si guarda, o oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  return h(
    'article',
    { class: ['recupero', `recupero--${recupero.stato}`] },
    h(
      'header',
      { class: 'recupero__testata' },
      h('strong', { class: 'recupero__allievo' }, nomeAllievo(recupero)),
      opzioni.mostraProva !== false
        ? h(
            'button',
            {
              class: 'recupero__prova',
              attr: { type: 'button', title: 'Apri il momento di valutazione' },
              onclick: () =>
                aggiorna({
                  vista: 'valutazioni',
                  valutazioneId: recupero.momento.id,
                  filtroClasseId: classeDelCorsoId(recupero.corsoId)?.id ?? stato.filtroClasseId,
                }),
            },
            recupero.momento.titolo,
          )
        : null,
      opzioni.mostraCorso
        ? h('span', { class: 'recupero__corso' }, nomeCorso(recupero.corsoId))
        : null,
      pastiglia(etichetta.testo, etichetta.tono),
      // Quel che si fa, tutto insieme e in fondo: a sinistra chi e che cosa, a
      // destra i gesti. Mescolati, il campo della data spariva fra le
      // pastiglie e i tasti si leggevano come etichette.
      h(
        'div',
        { class: 'recupero__azioni' },
        opzioni.mostraVoto === false ? null : campoVotoRecupero(recupero),
        graffettaRecupero(recupero),
        ...comandiRecupero(recupero, giorno),
      ),
    ),
    h(
      'p',
      { class: 'recupero__quando' },
      `prova del ${formattaData(recupero.momento.data, 'giorno')}`,
      recupero.previstoIl
        ? h(
            'span',
            {
              class: [
                'recupero__data',
                recupero.stato === 'scaduto' && 'recupero__data--tardi',
              ],
            },
            ` · si rifà il ${formattaData(recupero.previstoIl, 'giorno')}`,
          )
        : recupero.stato === 'da-fissare'
          ? h('span', { class: 'testo-quieto' }, ' · nessuna data')
          : null,
      // Da dove viene l'assenza: dichiarata nella griglia, o letta
      // nell'appello. Chi guarda deve poter distinguere il fatto registrato
      // dall'ipotesi ragionevole, prima di andare a chiedere all'allievo.
      recupero.daAppello ? h('span', { class: 'testo-quieto' }, ' · dall’appello') : null,
      recupero.riconsegnataIl
        ? h(
            'span',
            { class: 'testo-quieto' },
            ` · riconsegnata il ${formattaData(recupero.riconsegnataIl, 'giorno')}`,
          )
        : null,
      recupero.nota ? h('span', { class: 'testo-quieto' }, ` · ${recupero.nota}`) : null,
    ),
  )
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
    titolo ? h('h4', { class: 'recuperi__titolo' }, `${titolo} · ${recuperi.length}`) : null,
    ...recuperi.map((recupero) => rigaRecupero(recupero, opzioni)),
  )
}

/** Una riga della tabella dentro la prova. */
function rigaTabella (recupero: Recupero): HTMLElement {
  const etichetta = PASTIGLIE[recupero.stato]
  const chiuso = recupero.stato === 'fatto' || recupero.stato === 'dispensato'

  return h(
    'tr',
    { class: chiuso ? 'tabella__riga--spenta' : undefined },
    h('td', { class: 'tabella__nome' }, nomeAllievo(recupero)),
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
    // Il voto si scrive qui, accanto al giorno in cui la prova è stata
    // rifatta: è la stessa casella della griglia, a due centimetri da quel
    // che serve per riempirla.
    h('td', { class: 'tabella__numero' }, campoVotoRecupero(recupero)),
    // Fra il voto e lo stato: è il passo che viene dopo aver corretto, e
    // prima di poter dire che la faccenda è chiusa.
    h(
      'td',
      { class: 'recuperi__riconsegna' },
      campoRiconsegnaRecupero(recupero),
      // La spunta sta nella stessa cella della data, non in fondo alla riga:
      // è il modo veloce di riempire *quel* campo, e va dove il campo è.
      recupero.stato === 'fatto' && !recupero.riconsegnataIl
        ? pulsante({
            simbolo: 'spunta',
            variante: 'fantasma',
            titolo: `Riconsegnata il ${formattaData(stato.adessoData, 'giorno')}`,
            al: () => riconsegna(recupero, stato.adessoData),
          })
        : null,
    ),
    h('td', null, pastiglia(etichetta.testo, etichetta.tono)),
    h(
      'td',
      { class: 'recuperi__scansione' },
      postoAllegato(recupero.momento, 'recupero', 'Scansione', {
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
 * La tabella dei recuperi di una prova.
 *
 * È il posto in cui la domanda nasce: si guarda la griglia, si vedono le
 * caselle vuote, e la domanda è «di questi che ne faccio». Non si mostra
 * quando non ce n'è: un riquadro che dice «nessun assente» è un riquadro che
 * si impara a saltare.
 *
 * In cima, staccato, il testo della prova di recupero: è uno solo per tutti
 * quelli che la rifanno — di norma un compito diverso dall'originale — e
 * ripeterlo su ogni riga vorrebbe dire caricarlo tre volte.
 */
export function pannelloRecuperi (momento: MomentoValutazione): Figlio {
  const classe = classeDiMomento(momento)
  const recuperi = recuperiDelMomento(stato.registro, momento, classe, stato.adessoData)
  if (recuperi.length === 0) return null

  const aperti = recuperi.filter((r) => r.stato !== 'fatto' && r.stato !== 'dispensato')
  const daFissare = aperti.filter((r) => r.stato === 'da-fissare')

  return scheda({
    titolo: 'Recuperi',
    sottotitolo:
      daFissare.length > 0
        ? `${daFissare.length} da fissare · ${aperti.length} in sospeso`
        : aperti.length > 0
          ? `${aperti.length} in sospeso`
          : 'tutti sistemati',
    classe: 'scheda--recuperi',
    contenuto: h(
      'div',
      { class: 'recuperi' },
      postoAllegato(momento, 'recupero', 'Testo della prova di recupero'),
      postoAllegato(momento, 'recupero-soluzione', 'Soluzione del recupero'),
      h(
        'div',
        { class: 'tabella-contenitore' },
        h(
          'table',
          { class: 'tabella tabella--recuperi' },
          h(
            'thead',
            null,
            h(
              'tr',
              null,
              h('th', null, 'Allievo'),
              h('th', null, 'Si rifà il'),
              h('th', { class: 'tabella__numero' }, 'Voto'),
              h('th', null, 'Riconsegnata il'),
              h('th', null, 'Stato'),
              h('th', null, 'Scansione'),
              h('th', { class: 'tabella__azioni' }, ''),
            ),
          ),
          h('tbody', null, ...recuperi.map(rigaTabella)),
        ),
      ),
      h(
        'p',
        { class: 'testo-quieto' },
        'Il voto scritto qui è il voto di questa prova: finisce nella sua colonna, nella ' +
          'griglia, e fa media come quello di chi l’ha fatta il primo giorno.',
      ),
    ),
  })
}

/**
 * I recuperi previsti in un'ora, dentro la scheda Valutazioni di quell'ora.
 *
 * Fissare una data serve a questo e a nient'altro: che entrando in aula il
 * giovedì il registro dica «oggi Rossi rifà la verifica del 12». Senza questo
 * pezzo la data sarebbe un promemoria che nessuno rilegge.
 *
 * Sta dentro le valutazioni dell'ora e non in una scheda accanto, perché è
 * esattamente quello: quel che in quest'ora si valuta. La scheda Valutazioni
 * mostrava solo le prove *nate* in quest'ora, e nell'ora di un recupero
 * diceva «in quest'ora non si è valutato niente» mentre due allievi rifacevano
 * una verifica — la sola pagina che avrebbe dovuto dirlo era quella che lo
 * negava.
 *
 * In cima la griglia della prova che si rifà, ristretta ai nomi che la
 * rifanno: è la stessa griglia della vista Valutazioni e della lezione in cui
 * la prova si era fatta — stesse caselle, stesso modo di scrivere un voto — ma
 * con due righe invece di venticinque. Con la classe intera davanti, le due
 * che contano si cercano; qui ci sono solo quelle.
 *
 * Sotto, le righe con quel che la griglia non sa dire: da quale prova viene il
 * recupero, che giorno era stato fissato, dov'è la scansione, e i comandi per
 * spostarlo o dichiarare che non si fa. Il voto lì non si ripete: due caselle
 * per lo stesso numero nella stessa scheda sono due occasioni di sbagliarlo.
 */
export function bloccoRecuperiDellOra (lezione: Lezione): Figlio {
  const recuperi = recuperiDellaLezione(stato.registro, lezione)
  if (recuperi.length === 0) return null

  const classe = classeDiLezione(lezione)
  // Le prove che oggi si rifanno, ognuna una volta sola: due allievi che
  // recuperano la stessa verifica sono due righe della stessa colonna.
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
      `Recuperi di oggi · ${recuperi.length}`,
    ),
    classe ? grigliaVoti(classe, momenti, { soloAllievi: chi, medie: false }) : null,
    // I tasti di queste righe scrivono la data di quest'ora: è il giorno che
    // si sta verbalizzando, e non necessariamente quello in cui lo si scrive.
    gruppoRecuperi('', recuperi, {
      mostraCorso: false,
      mostraVoto: false,
      giorno: lezione.data,
    }),
  )
}
