// Le riconsegne: le prove svolte che non sono ancora tornate agli allievi.
// I voti si mettono nella griglia; da qui si segna solo che la prova è tornata
// alla classe, l'unica cosa che il registro non sa dedurre.

import { Uno } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import { formattaData } from '../../domain/dates.js'
import type { Lezione, MomentoValutazione } from '../../domain/models.js'
import {
  GIORNI_PER_RICONSEGNARE,
  type Riconsegna,
  type RiconsegnaAllievo,
  type StatoRiconsegna,
  riconsegnaDelMomento,
  riconsegneDegliAllievi,
} from '../../domain/returns.js'
import { formattaVoto, nomeCompleto } from '../../domain/calculations.js'
import { type Recupero, recuperiDelMomento } from '../../domain/retakes.js'
import { gruppoRecuperi } from './retakes.js'
import { grigliaVoti } from './grades.js'
import { allieviAttivi } from '../../domain/calculations.js'
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
import {
  classeDiLezione,
  classeDiMomento,
  nomeCorso,
  stato,
} from '../state.js'
import { testi } from './returns.testi.js'

type Tono = 'negativo' | 'attenzione' | 'informativo' | 'positivo' | 'quiete'

function pastiglie (): Record<StatoRiconsegna, { testo: string, tono: Tono }> {
  const t = testi()
  return {
    'da-correggere': { testo: t.daCorreggere, tono: 'attenzione' },
    'da-riconsegnare': { testo: t.daRiconsegnare, tono: 'informativo' },
    riconsegnata: { testo: t.riconsegnata, tono: 'positivo' },
  }
}

interface OpzioniRigaRiconsegna {
  mostraCorso?: boolean
  mostraProva?: boolean
  /** Il giorno che il tasto scrive: dentro un'ora quello dell'ora, altrove oggi. */
  giorno?: string
}

/** «due settimane fa», «ieri»: il ritardo si legge meglio in giorni che in date. */
function daQuanto (giorni: number): string {
  const t = testi()
  if (giorni <= 0) return t.oggi
  if (giorni === 1) return t.ieri
  if (giorni < 14) return t.giorniFa(giorni)
  const settimane = Math.floor(giorni / 7)
  return settimane < 8 ? t.settimaneFa(settimane) : t.mesiFa(Math.floor(giorni / 30))
}

/**
 * Una riga: quale prova, a che punto è, e il gesto «riconsegnata». Il titolo
 * della prova è un tasto che apre la sua griglia.
 */
function rigaRiconsegna (
  riconsegna: Riconsegna,
  opzioni: OpzioniRigaRiconsegna = {},
): HTMLElement {
  const t = testi()
  const etichetta = pastiglie()[riconsegna.stato]
  const momento = riconsegna.momento
  // Il giorno che il tasto scrive: dentro un'ora quello dell'ora, altrove oggi.
  const giorno = opzioni.giorno ?? stato.adessoData

  const segna = (il: string | null) =>
    eseguiOAvvisa(
      { tipo: 'valutazione.riconsegna', valutazioneId: momento.id, il },
      il ? t.segnata : t.diNuovoDaRiconsegnare,
    )

  return pendenza({
    classe: 'riconsegna',
    // testo-fisso: classi CSS
    stato: [`riconsegna--${riconsegna.stato}`, riconsegna.inRitardo && 'riconsegna--tardi'],
    testata: [
      opzioni.mostraProva !== false
        ? h(
            'button',
            {
              class: 'riconsegna__prova',
              attr: { type: 'button', title: t.apriProva },
              onclick: () => apriMomento({ id: momento.id, corsoId: riconsegna.corsoId }),
            },
            momento.titolo,
          )
        : null,
      opzioni.mostraCorso ? corsoPendenza('riconsegna', nomeCorso(riconsegna.corsoId)) : null,
      pastiglia(etichetta.testo, etichetta.tono),
    ],
    // I gesti tutti insieme in fondo alla riga, separati dalla descrizione.
    azioni: [
      // Niente campo di data: la riconsegna è per allievo (tabella dei nomi). La
      // scorciatoia scrive una riconsegna per allievo, tutte dello stesso giorno.
      riconsegna.daRidare === 0
        ? h(
            'span',
            { class: 'testo-quieto' },
            riconsegna.riconsegnataIl
              ? t.resaATuttiEntro(formattaData(riconsegna.riconsegnataIl, 'giorno'))
              : t.nienteDaRidare,
          )
        : pulsante({
            testo: t.resaATutti(riconsegna.daRidare),
            simbolo: 'spunta',
            variante: 'sottile',
            titolo: t.segnaIl(formattaData(giorno, 'giorno')),
            al: () => segna(giorno),
          }),
      // Il ripensamento toglie la data a tutti in un gesto.
      riconsegna.riconsegnataIl
        ? pulsante({
            simbolo: 'ricarica',
            variante: 'fantasma',
            titolo: t.nonEraQuesta,
            al: () => segna(null),
          })
        : null,
    ],
    quando: [
      t.svolta(daQuanto(riconsegna.giorniPassati), formattaData(momento.data, 'giorno')),
      // La data della riconsegna sta nel campo sopra, non si ripete.
      riconsegna.stato === 'da-correggere'
        ? h(
            'span',
            { class: 'testo-quieto' },
            ` · ${t.caselleVuote(riconsegna.attesi - riconsegna.corretti)}`,
          )
        : null,
      // Il ritardo detto una volta sola, dove si legge la data.
      riconsegna.inRitardo
        ? h(
            'span',
            { class: 'riconsegna__tardi' },
            ` · ${t.fermaDa(Math.floor(GIORNI_PER_RICONSEGNARE / 7))}`,
          )
        : null,
    ],
  })
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
    titolo ? titoloGruppo(titolo, riconsegne.length) : null,
    ...riconsegne.map((riconsegna) => rigaRiconsegna(riconsegna, opzioni)),
  )
}


// ------------------------------------------------------- una riga per allievo

/** Il nome come si scrive in un elenco: prima il cognome. */
function nomeDiAllievo (riga: RiconsegnaAllievo): string {
  return nomeCompleto(riga.allievo)
}

/** Segna, o disdice, il giorno in cui quella persona ha riavuto la sua prova. */
function segnaAllievo (riga: RiconsegnaAllievo, il: string | null): void {
  void eseguiOAvvisa({
    tipo: 'voto.riconsegna',
    valutazioneId: riga.momento.id,
    allievoId: riga.allievo.id,
    il,
  })
}

/**
 * Una riga d'elenco: a chi manca ancora la sua prova. Per il todo: la riga dice
 * da sola di che verifica si tratta.
 */
function rigaRiconsegnaAllievo (
  riga: RiconsegnaAllievo,
  opzioni: { mostraCorso?: boolean, giorno?: string } = {},
): HTMLElement {
  const t = testi()
  const giorno = opzioni.giorno ?? stato.adessoData
  return pendenza({
    classe: 'riconsegna',
    stato: ['riconsegna--allievo'],
    testata: [
      h('strong', null, nomeDiAllievo(riga)),
      h(
        'button',
        {
          class: 'riconsegna__prova',
          attr: { type: 'button', title: t.apriProva },
          onclick: () => apriMomento({ id: riga.momento.id, corsoId: riga.corsoId }),
        },
        riga.momento.titolo,
      ),
      opzioni.mostraCorso ? corsoPendenza('riconsegna', nomeCorso(riga.corsoId)) : null,
      pastiglia(
        formattaVoto(riga.voto),
        riga.voto >= riga.momento.scala.sufficienza ? 'positivo' : 'negativo',
      ),
    ],
    azioni: [
      dataInLinea({
        etichetta: t.resaIl,
        nome: `resa-${riga.momento.id}-${riga.allievo.id}`, // testo-fisso: nome del campo
        valore: riga.riconsegnataIl ?? '',
        titolo: t.ilGiornoIn(nomeDiAllievo(riga)),
        al: (valore) => segnaAllievo(riga, valore || null),
      }),
      pulsante({
        simbolo: 'spunta',
        variante: 'sottile',
        titolo: t.riconsegnataIlGiorno(formattaData(giorno, 'giorno')),
        al: () => segnaAllievo(riga, giorno),
      }),
    ],
    quando: [t.provaDel(formattaData(riga.momento.data, 'giorno'))],
  })
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
    titolo ? titoloGruppo(titolo, righe.length) : null,
    ...righe.map((riga) => rigaRiconsegnaAllievo(riga, opzioni)),
  )
}

/**
 * La tabella di chi ha riavuto la sua prova, una riga per allievo. La data di
 * classe si vede in trasparenza su chi non ne ha una propria; scriverne una la
 * sostituisce per quel nome.
 */
function tabellaRiconsegneAllievi (
  momento: MomentoValutazione,
  soloDaFare = false,
  quando?: string,
): Figlio {
  const righe = riconsegneDegliAllievi(momento, classeDiMomento(momento), soloDaFare)
  if (righe.length === 0) return null
  const giorno = quando ?? stato.adessoData
  const t = testi()
  const L = lessico()

  return tabella({
    variante: 'riconsegne',
    intestazione: [
      h('th', null, Uno(L.pif)),
      h('th', { class: 'tabella__numero' }, Uno(L.voto)),
      h('th', null, t.riconsegnataIl),
      h('th', { class: 'tabella__azioni' }, ''),
    ],
    righe: righe.map((riga) =>
      h(
        'tr',
        { class: riga.riconsegnataIl ? 'tabella__riga--spenta' : undefined },
        h('td', { class: 'tabella__nome' }, cellaNome(riga.allievo, nomeDiAllievo(riga))),
        h('td', { class: 'tabella__numero' }, formattaVoto(riga.voto)),
        h(
          'td',
          { class: 'riconsegne__data' },
          controlloData({
            nome: `riconsegna-${momento.id}-${riga.allievo.id}`, // testo-fisso: nome del campo
            valore: riga.riconsegnataIl ?? '',
            segnaposto: t.segnapostoData,
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
                titolo: t.riconsegnataOggi,
                al: () => segnaAllievo(riga, giorno),
              }),
        ),
      ),
    ),
  })
}

/**
 * Le prove del corso ancora da ridare, nell'amministrazione dell'ora: si
 * ridistribuiscono in aula. I tasti scrivono la data di quest'ora, non di oggi.
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
    // Le prove non ancora fatte a quest'ora non c'entrano.
    const riconsegna = riconsegnaDelMomento(momento, classe, giorno)
    if (!riconsegna) continue
    const singoli = riconsegneDegliAllievi(momento, classe, true)
    // Anche i recuperi valutati e non ancora ridati: stessa pila.
    const daRidare = recuperiDelMomento(stato.registro, momento, classe, giorno).filter(
      (r) => r.stato === 'fatto' && !r.riconsegnataIl,
    )
    // Una prova già tornata alla classe resta finché a qualcuno manca la sua.
    if (riconsegna.stato === 'riconsegnata' && singoli.length === 0 && daRidare.length === 0) {
      continue
    }
    aperte.push({ riconsegna, singoli, recuperi: daRidare })
  }

  if (aperte.length === 0) return null

  const daCorreggere = aperte.filter((v) => v.riconsegna.stato === 'da-correggere').length
  const pronte = aperte.filter((v) => v.riconsegna.stato !== 'da-correggere').length
  const t = testi()

  return scheda({
    titolo: t.proveDaRiconsegnare,
    sottotitolo: [
      pronte > 0 ? t.daRidare(pronte) : null,
      daCorreggere > 0 ? t.quanteDaCorreggere(daCorreggere) : null,
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
 * Una prova non ancora finita, con quel che le manca sotto: la riga con lo
 * stato e la riconsegna; la griglia, se ci sono caselle vuote; la tabella di
 * chi non l'ha ancora riavuta.
 */
function bloccoProvaDaChiudere (
  riconsegna: Riconsegna,
  singoli: RiconsegnaAllievo[],
  recuperi: Recupero[],
  giorno: string,
): HTMLElement {
  const t = testi()
  const momento = riconsegna.momento
  const classe = classeDiMomento(momento)
  // Chi ha la casella vuota (né voto né assenza): rende la prova «da correggere».
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
          titoloGruppo(t.daCompletare, daRiempire.length, 'h5'),
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
          titoloGruppo(t.daRidareA, singoli.length, 'h5'),
          tabellaRiconsegneAllievi(momento, true, giorno),
        )
      : null,
    // I recuperi di questa prova valutati e ancora da ridare: stessa pila, stesso gesto.
    recuperi.length > 0
      ? h(
          'div',
          { class: 'riconsegne__singoli' },
          titoloGruppo(t.recuperiDaRidare, recuperi.length, 'h5'),
          gruppoRecuperi('', recuperi, { mostraProva: false, mostraVoto: false, giorno }),
        )
      : null,
  )
}

/**
 * La riconsegna di una prova, dentro la scheda della prova, accanto alla
 * griglia. Non compare per una prova ancora da svolgere.
 */
export function pannelloRiconsegna (momento: MomentoValutazione): Figlio {
  const riconsegna = riconsegnaDelMomento(
    momento,
    classeDiMomento(momento),
    stato.adessoData,
  )
  if (!riconsegna) return null

  const t = testi()
  return scheda({
    titolo: Uno(lessico().riconsegna),
    sottotitolo: (() => {
      // Chi non l'ha ancora riavuta conta quanto lo stato della prova.
      const restano = riconsegna.daRidare
      const coda = restano > 0 ? ` · ${t.daRidareAChiMancava(restano)}` : ''
      if (riconsegna.stato === 'riconsegnata') {
        const quando = formattaData(riconsegna.riconsegnataIl ?? momento.data, 'giorno')
        return `${t.tornataATutti(quando)}${coda}`
      }
      if (riconsegna.stato === 'da-correggere') {
        return `${t.caselleVuote(riconsegna.attesi - riconsegna.corretti)}${coda}`
      }
      return `${t.corretta}${coda}`
    })(),
    classe: 'scheda--riconsegna',
    contenuto: h(
      'div',
      { class: 'riconsegne' },
      rigaRiconsegna(riconsegna, { mostraProva: false }),
      // Sotto, nome per nome: chi mancava riavrà la sua un altro giorno.
      tabellaRiconsegneAllievi(momento),
    ),
  })
}
