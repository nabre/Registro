// Le riconsegne: le prove svolte che non sono ancora tornate agli allievi.
//
// Una verifica svolta sparisce da tutto il registro: il calendario l'ha
// passata, la scaletta di quell'ora è chiusa, la griglia dei voti sta ferma
// dove è sempre stata. L'unico posto in cui esiste è la pila sulla scrivania,
// e una pila non chiede niente a nessuno. Qui torna a chiedere.
//
// Due gesti, come sono due i lavori: mettere i voti — e quello si fa nella
// griglia, che è dove i voti stanno — e dire che la prova è tornata in mano
// alla classe, che è l'unica cosa che il registro non sa dedurre e l'unica
// che si spunta da qui.

import { formattaData } from '../../dominio/date.js'
import type { Lezione, MomentoValutazione } from '../../dominio/modelli.js'
import {
  GIORNI_PER_RICONSEGNARE,
  type Riconsegna,
  type RiconsegnaAllievo,
  type StatoRiconsegna,
  riconsegnaDelMomento,
  riconsegneDegliAllievi,
} from '../../dominio/riconsegne.js'
import { formattaVoto } from '../../dominio/calcoli.js'
import { type Recupero, recuperiDelMomento } from '../../dominio/recuperi.js'
import { gruppoRecuperi } from './recuperi.js'
import { grigliaVoti } from './valutazioni.js'
import { allieviAttivi } from '../../dominio/calcoli.js'
import { controlloData, dataInLinea, pastiglia, pulsante, scheda } from '../componenti/base.js'
import { eseguiOAvvisa } from '../componenti/filtri.js'
import { h, type Figlio } from '../dom.js'
import {
  aggiorna,
  classeDelCorsoId,
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '../stato.js'

const PASTIGLIE: Record<
  StatoRiconsegna,
  { testo: string, tono: 'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete' }
> = {
  'da-correggere': { testo: 'da correggere', tono: 'attenzione' },
  'da-riconsegnare': { testo: 'da riconsegnare', tono: 'informativo' },
  riconsegnata: { testo: 'riconsegnata', tono: 'positivo' },
}

export interface OpzioniRigaRiconsegna {
  mostraCorso?: boolean
  mostraProva?: boolean
  /**
   * Il giorno che il tasto scrive.
   *
   * Dentro un'ora è quella dell'ora: si sta verbalizzando giovedì, e la prova
   * è tornata alla classe giovedì — non oggi, che è il giorno in cui si sta
   * sistemando il registro. Altrove vale oggi.
   */
  giorno?: string
}

/** «due settimane fa», «ieri»: il ritardo si legge meglio in giorni che in date. */
function daQuanto (giorni: number): string {
  if (giorni <= 0) return 'oggi'
  if (giorni === 1) return 'ieri'
  if (giorni < 14) return `${giorni} giorni fa`
  const settimane = Math.floor(giorni / 7)
  return settimane < 8 ? `${settimane} settimane fa` : `${Math.floor(giorni / 30)} mesi fa`
}

/**
 * Una riga: quale prova, a che punto è, e il gesto che la chiude.
 *
 * Il gesto è uno solo — «riconsegnata» — perché uno solo è quel che non si
 * deduce. I voti si mettono nella griglia, e un pulsante che li chiedesse da
 * qui porterebbe comunque là: al suo posto c'è il titolo della prova, che è un
 * tasto e apre proprio quella griglia.
 */
export function rigaRiconsegna (
  riconsegna: Riconsegna,
  opzioni: OpzioniRigaRiconsegna = {},
): HTMLElement {
  const etichetta = PASTIGLIE[riconsegna.stato]
  const momento = riconsegna.momento
  // Il giorno che il tasto scrive: dentro un'ora è quella dell'ora — si sta
  // verbalizzando giovedì, e «riconsegnata» vuol dire giovedì — altrove oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  const segna = (il: string | null) =>
    eseguiOAvvisa(
      { tipo: 'valutazione.riconsegna', valutazioneId: momento.id, il },
      il ? 'Prova segnata come riconsegnata.' : 'Prova di nuovo da riconsegnare.',
    )

  return h(
    'article',
    {
      class: [
        'riconsegna',
        `riconsegna--${riconsegna.stato}`,
        riconsegna.inRitardo && 'riconsegna--tardi',
      ],
    },
    h(
      'header',
      { class: 'riconsegna__testata' },
      opzioni.mostraProva !== false
        ? h(
            'button',
            {
              class: 'riconsegna__prova',
              attr: { type: 'button', title: 'Apri la prova e la sua griglia dei voti' },
              onclick: () =>
                aggiorna({
                  vista: 'valutazioni',
                  valutazioneId: momento.id,
                  filtroClasseId: classeDelCorsoId(riconsegna.corsoId)?.id ?? stato.filtroClasseId,
                }),
            },
            momento.titolo,
          )
        : null,
      opzioni.mostraCorso
        ? h('span', { class: 'riconsegna__corso' }, nomeCorso(riconsegna.corsoId))
        : null,
      pastiglia(etichetta.testo, etichetta.tono),
      // Quel che si fa, tutto insieme e in fondo alla riga: a sinistra si legge
      // di che prova si tratta, a destra la si sistema. Prima erano mescolati,
      // e in mezzo a tre pastiglie il campo della data sembrava un'etichetta.
      h(
        'div',
        { class: 'riconsegna__azioni' },
        // Niente campo di data qui: la riconsegna è per allievo, e le date
        // stanno nella tabella dei nomi. Qui resta la scorciatoia — la pila
        // ridistribuita è un gesto solo — che però scrive quel che è vero:
        // venti riconsegne dello stesso giorno, una per riga.
        riconsegna.daRidare === 0
          ? h(
              'span',
              { class: 'testo-quieto' },
              riconsegna.riconsegnataIl
                ? `resa a tutti entro il ${formattaData(riconsegna.riconsegnataIl, 'giorno')}`
                : 'niente da ridare',
            )
          : pulsante({
              testo: `Resa a tutti · ${riconsegna.daRidare}`,
              simbolo: 'spunta',
              variante: 'sottile',
              titolo:
                `Segna il ${formattaData(giorno, 'giorno')} su chi non ha ancora la sua data`,
              al: () => segna(giorno),
            }),
        // Il ripensamento toglie la data a tutti: con due prove nello stesso
        // giorno si spunta la riga sbagliata, e senza questo non si torna
        // indietro se non riga per riga.
        riconsegna.riconsegnataIl
          ? pulsante({
              simbolo: 'ricarica',
              variante: 'fantasma',
              titolo: 'Non era questa: togli la data a tutti',
              al: () => segna(null),
            })
          : null,
      ),
    ),
    h(
      'p',
      { class: 'riconsegna__quando' },
      `svolta ${daQuanto(riconsegna.giorniPassati)}, il ${formattaData(momento.data, 'giorno')}`,
      // La data della riconsegna non si ripete qui: sta nel campo, un
      // centimetro sopra, e scritta due volte fa dubitare che siano due cose.
      riconsegna.stato === 'da-correggere'
        ? h(
            'span',
            { class: 'testo-quieto' },
            ` · ${riconsegna.attesi - riconsegna.corretti} caselle ancora vuote`,
          )
        : null,
      // Il ritardo detto una volta sola, dove si legge la data: è la riga che
      // spiega perché quella prova sta in cima.
      riconsegna.inRitardo
        ? h(
            'span',
            { class: 'riconsegna__tardi' },
            ` · ferma da più di ${Math.floor(GIORNI_PER_RICONSEGNARE / 7)} settimane`,
          )
        : null,
    ),
  )
}

/** Un mucchio di riconsegne con il suo titolo e il suo conto. */
export function gruppoRiconsegne (
  titolo: string,
  riconsegne: Riconsegna[],
  opzioni: OpzioniRigaRiconsegna = {},
): Figlio {
  if (riconsegne.length === 0) return null
  return h(
    'section',
    { class: 'riconsegne__gruppo' },
    titolo ? h('h4', { class: 'riconsegne__titolo' }, `${titolo} · ${riconsegne.length}`) : null,
    ...riconsegne.map((riconsegna) => rigaRiconsegna(riconsegna, opzioni)),
  )
}


// ------------------------------------------------------- una riga per allievo

/** Il nome come si scrive in un elenco: prima il cognome. */
function nomeDiAllievo (riga: RiconsegnaAllievo): string {
  return `${riga.allievo.cognome} ${riga.allievo.nome}`.trim()
}

/** Segna, o disdice, il giorno in cui quell'allievo ha riavuto la sua prova. */
function segnaAllievo (riga: RiconsegnaAllievo, il: string | null): void {
  void eseguiOAvvisa({
    tipo: 'voto.riconsegna',
    valutazioneId: riga.momento.id,
    allievoId: riga.allievo.id,
    il,
  })
}

/**
 * Una riga d'elenco: a chi manca ancora la sua prova.
 *
 * Serve nel todo, dove le prove di corsi diversi stanno una sotto l'altra: la
 * riga dice da sola di che verifica si tratta, perché la colonna che lo direbbe
 * non c'è.
 */
export function rigaRiconsegnaAllievo (
  riga: RiconsegnaAllievo,
  opzioni: { mostraCorso?: boolean, giorno?: string } = {},
): HTMLElement {
  const giorno = opzioni.giorno ?? stato.adessoData
  return h(
    'article',
    { class: 'riconsegna riconsegna--allievo' },
    h(
      'header',
      { class: 'riconsegna__testata' },
      h('strong', null, nomeDiAllievo(riga)),
      h(
        'button',
        {
          class: 'riconsegna__prova',
          attr: { type: 'button', title: 'Apri la prova e la sua griglia dei voti' },
          onclick: () =>
            aggiorna({
              vista: 'valutazioni',
              valutazioneId: riga.momento.id,
              filtroClasseId: classeDelCorsoId(riga.corsoId)?.id ?? stato.filtroClasseId,
            }),
        },
        riga.momento.titolo,
      ),
      opzioni.mostraCorso
        ? h('span', { class: 'riconsegna__corso' }, nomeCorso(riga.corsoId))
        : null,
      pastiglia(
        formattaVoto(riga.voto),
        riga.voto >= riga.momento.scala.sufficienza ? 'positivo' : 'negativo',
      ),
      h(
        'div',
        { class: 'riconsegna__azioni' },
        dataInLinea({
          etichetta: 'resa il',
          nome: `resa-${riga.momento.id}-${riga.allievo.id}`,
          valore: riga.riconsegnataIl ?? '',
          titolo: `Il giorno in cui ${nomeDiAllievo(riga)} ha riavuto la sua prova`,
          al: (valore) => segnaAllievo(riga, valore || null),
        }),
        pulsante({
          simbolo: 'spunta',
          variante: 'sottile',
          titolo: `Riconsegnata il ${formattaData(giorno, 'giorno')}`,
          al: () => segnaAllievo(riga, giorno),
        }),
      ),
    ),
    h(
      'p',
      { class: 'riconsegna__quando' },
      `prova del ${formattaData(riga.momento.data, 'giorno')}`,
    ),
  )
}

/** Un mucchio di righe per allievo, con il suo titolo e il suo conto. */
export function gruppoRiconsegneAllievi (
  titolo: string,
  righe: RiconsegnaAllievo[],
  opzioni: { mostraCorso?: boolean, giorno?: string } = {},
): Figlio {
  if (righe.length === 0) return null
  return h(
    'section',
    { class: 'riconsegne__gruppo' },
    titolo ? h('h4', { class: 'riconsegne__titolo' }, `${titolo} · ${righe.length}`) : null,
    ...righe.map((riga) => rigaRiconsegnaAllievo(riga, opzioni)),
  )
}

/**
 * La tabella di chi ha riavuto la sua prova, dentro la scheda della prova.
 *
 * Una riga per allievo, perché la riconsegna non è un fatto solo: la pila
 * torna indietro un giorno, ma chi mancava riavrà la sua un'altra volta. La
 * data di classe si vede in trasparenza su chi non ne ha una propria — non si
 * scrive la stessa data venticinque volte per dire che la lezione è andata
 * come al solito — e scriverne una la sostituisce per quel nome.
 */
function tabellaRiconsegneAllievi (
  momento: MomentoValutazione,
  soloDaFare = false,
  quando?: string,
): Figlio {
  const righe = riconsegneDegliAllievi(momento, classeDiMomento(momento), soloDaFare)
  if (righe.length === 0) return null
  const giorno = quando ?? stato.adessoData

  return h(
    'div',
    { class: 'tabella-contenitore' },
    h(
      'table',
      { class: 'tabella tabella--riconsegne' },
      h(
        'thead',
        null,
        h(
          'tr',
          null,
          h('th', null, 'Allievo'),
          h('th', { class: 'tabella__numero' }, 'Voto'),
          h('th', null, 'Riconsegnata il'),
          h('th', { class: 'tabella__azioni' }, ''),
        ),
      ),
      h(
        'tbody',
        null,
        ...righe.map((riga) =>
          h(
            'tr',
            { class: riga.riconsegnataIl ? 'tabella__riga--spenta' : undefined },
            h('td', { class: 'tabella__nome' }, nomeDiAllievo(riga)),
            h('td', { class: 'tabella__numero' }, formattaVoto(riga.voto)),
            h(
              'td',
              { class: 'riconsegne__data' },
              controlloData({
                nome: `riconsegna-${momento.id}-${riga.allievo.id}`,
                valore: riga.riconsegnataIl ?? '',
                segnaposto: 'gg.mm.aaaa',
                al: (valore) => segnaAllievo(riga, String(valore) || null),
              }),
            ),
            h(
              'td',
              { class: 'tabella__azioni' },
              riga.riconsegnataIl
                ? null
                : pulsante({
                    simbolo: 'spunta',
                    variante: 'fantasma',
                    titolo: 'Riconsegnata oggi',
                    al: () => segnaAllievo(riga, giorno),
                  }),
            ),
          ),
        ),
      ),
    ),
  )
}

/**
 * Le prove del corso ancora in mano a chi insegna, dentro il registro dell'ora.
 *
 * Sta nell'amministrazione dell'ora e non nelle valutazioni perché è quel
 * genere di cosa: la pila da ridare indietro, come le consegne da ritirare.
 * Ed è lì che il gesto capita davvero — si entra in aula, si distribuiscono i
 * compiti corretti, e in quel momento il registro di quell'ora è già aperto.
 *
 * I tasti scrivono la data *di quest'ora*, non quella di oggi: chi sistema il
 * registro il lunedì per la settimana prima non deve correggere a mano una
 * data che il registro ha scritto al posto suo.
 */
export function pannelloRiconsegneDellOra (lezione: Lezione): Figlio {
  const classe = classeDiLezione(lezione)
  const giorno = lezione.data

  /** Le prove del corso che a quest'ora hanno ancora qualcosa in sospeso. */
  const aperte: Array<{
    riconsegna: Riconsegna
    singoli: RiconsegnaAllievo[]
    recuperi: Recupero[]
  }> = []
  for (const momento of stato.registro.valutazioni) {
    if (momento.corsoId !== lezione.corsoId) continue
    // Le prove che a quest'ora non si erano ancora fatte non c'entrano: il
    // registro di giovedì non parla della verifica del giovedì dopo.
    const riconsegna = riconsegnaDelMomento(momento, classe, giorno)
    if (!riconsegna) continue
    const singoli = riconsegneDegliAllievi(momento, classe, true)
    // I recuperi valutati e non ancora ridati: sono fogli di questa prova come
    // gli altri, e stanno nella stessa pila. Che siano stati fatti un altro
    // giorno non cambia chi li deve riavere.
    const daRidare = recuperiDelMomento(stato.registro, momento, classe, giorno).filter(
      (r) => r.stato === 'fatto' && !r.riconsegnataIl,
    )
    // Una prova già tornata alla classe resta qui finché a qualcuno manca la
    // sua: è il caso di chi quel giorno non c'era, ed è quello che senza un
    // elenco che lo nomini non reclama nessuno.
    if (riconsegna.stato === 'riconsegnata' && singoli.length === 0 && daRidare.length === 0) {
      continue
    }
    aperte.push({ riconsegna, singoli, recuperi: daRidare })
  }

  if (aperte.length === 0) return null

  const daCorreggere = aperte.filter((v) => v.riconsegna.stato === 'da-correggere').length
  const pronte = aperte.filter((v) => v.riconsegna.stato !== 'da-correggere').length

  return scheda({
    titolo: 'Prove da riconsegnare',
    sottotitolo: [
      pronte > 0 ? `${pronte} da ridare` : null,
      daCorreggere > 0 ? `${daCorreggere} da correggere` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    classe: 'scheda--riconsegna',
    contenuto: h(
      'div',
      { class: 'riconsegne' },
      ...aperte.map((voce) =>
        bloccoProvaDaChiudere(voce.riconsegna, voce.singoli, voce.recuperi, giorno),
      ),
    ),
  })
}

/**
 * Una prova che non è ancora finita, con tutto quel che le manca sotto.
 *
 * Tre pezzi, e ognuno risponde a una domanda diversa. La riga in cima dice a
 * che punto è e permette di segnarne la riconsegna. La griglia sotto — solo
 * quando ci sono caselle vuote — è la prova da completare: ci si mettono i voti
 * che mancano senza andare a cercarla in un'altra pagina, ed è il lavoro che
 * viene prima di poterla ridare indietro. La tabella in fondo è chi non l'ha
 * ancora riavuta, nome per nome.
 *
 * Stavano in tre elenchi separati — «da riconsegnare», «da correggere», «da
 * ridare a» — e la stessa verifica compariva in due posti mentre il terzo
 * parlava di nomi senza dire di quale prova. Qui ogni prova è un blocco, e
 * quel che le manca sta sotto di lei.
 */
function bloccoProvaDaChiudere (
  riconsegna: Riconsegna,
  singoli: RiconsegnaAllievo[],
  recuperi: Recupero[],
  giorno: string,
): HTMLElement {
  const momento = riconsegna.momento
  const classe = classeDiMomento(momento)
  // Chi ha ancora la casella vuota: né un voto, né un'assenza. È quel che
  // rende la prova «da correggere», e sono le righe da riempire.
  const daRiempire = (classe ? allieviAttivi(classe) : []).filter((allievo) => {
    const voto = momento.voti.find((v) => v.allievoId === allievo.id)
    return !voto || (!voto.assente && voto.valore === null)
  })

  return h(
    'section',
    { class: 'riconsegne__prova' },
    rigaRiconsegna(riconsegna, { mostraProva: true, giorno }),
    classe && daRiempire.length > 0
      ? h(
          'div',
          { class: 'riconsegne__griglia' },
          h(
            'h5',
            { class: 'riconsegne__titolo' },
            `Da completare · ${daRiempire.length}`,
          ),
          grigliaVoti(classe, [momento], {
            soloAllievi: daRiempire.map((allievo) => allievo.id),
            medie: false,
          }),
        )
      : null,
    singoli.length > 0
      ? h(
          'div',
          { class: 'riconsegne__singoli' },
          h('h5', { class: 'riconsegne__titolo' }, `Da ridare a · ${singoli.length}`),
          tabellaRiconsegneAllievi(momento, true, giorno),
        )
      : null,
    // I recuperi di questa prova già valutati e ancora nella cartella: stessa
    // pila, stesso gesto, e senza questa riga si chiudono solo passando dalla
    // scheda della valutazione.
    recuperi.length > 0
      ? h(
          'div',
          { class: 'riconsegne__singoli' },
          h(
            'h5',
            { class: 'riconsegne__titolo' },
            `Recuperi da ridare · ${recuperi.length}`,
          ),
          gruppoRecuperi('', recuperi, { mostraProva: false, mostraVoto: false, giorno }),
        )
      : null,
  )
}

/**
 * La riconsegna di una prova, dentro la scheda della prova.
 *
 * Una riga sola, dove si sta già guardando la griglia: è lì che ci si accorge
 * che i voti ci sono tutti, ed è lì che si vuole poter dire «fatto, gliel'ho
 * ridata» senza passare dal todo. Non compare per una prova che deve ancora
 * svolgersi: di quella non c'è niente da riconsegnare.
 */
export function pannelloRiconsegna (momento: MomentoValutazione): Figlio {
  const riconsegna = riconsegnaDelMomento(
    momento,
    classeDiMomento(momento),
    stato.adessoData,
  )
  if (!riconsegna) return null

  return scheda({
    titolo: 'Riconsegna',
    sottotitolo: (() => {
      // Chi non l'ha ancora riavuta conta quanto lo stato della prova: una
      // verifica «riconsegnata» con due compiti ancora nella cartella è una
      // mezza verità, e la metà che manca è quella che qualcuno reclamerà.
      const restano = riconsegna.daRidare
      const coda = restano > 0 ? ` · ${restano} da ridare a chi mancava` : ''
      if (riconsegna.stato === 'riconsegnata') {
        const quando = formattaData(riconsegna.riconsegnataIl ?? momento.data, 'giorno')
        return `tornata a tutti entro il ${quando}${coda}`
      }
      if (riconsegna.stato === 'da-correggere') {
        return `${riconsegna.attesi - riconsegna.corretti} caselle ancora vuote${coda}`
      }
      return `corretta, e ancora in mano a chi insegna${coda}`
    })(),
    classe: 'scheda--riconsegna',
    contenuto: h(
      'div',
      { class: 'riconsegne' },
      rigaRiconsegna(riconsegna, { mostraProva: false }),
      // Sotto la riga della classe, nome per nome: la pila torna indietro un
      // giorno solo, ma chi mancava riavrà la sua un'altra volta — e senza
      // questa tabella quei due o tre fogli non li reclamava nessuno.
      tabellaRiconsegneAllievi(momento),
    ),
  })
}
