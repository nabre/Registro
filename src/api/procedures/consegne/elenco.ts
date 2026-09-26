// Le pendenze: quel che manca, a chi tocca e per quando («che cosa devo ancora
// fare», «chi non ha portato il foglio»).
//
// Escono per nome solo quelli che mancano; la quota dice a che punto è il
// resto. `arretrateDaAlmeno` e `scadeEntro` tagliano sui giorni, e ogni riga
// porta i suoi: «arretrata» da sola non distingue un giorno da due mesi.

import { nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import {
  avanzamentoConsegna,
  dataConsegna,
  raccoglieDocumento,
  scadenzaConsegna,
  statoConsegna,
} from '../../../domain/assignments.js'
import { classeDelCorsoId, corsiDellAnno, materiaDelCorso } from '../../../domain/courses.js'
import { differenzaGiorni, oggi as giornoDiOggi } from '../../../domain/dates.js'
import { definisci } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import {
  CAMPI_CERCA,
  CAMPI_PAGINA,
  estremo,
  filtroTesto,
  fraSoglie,
  pagina,
  ricerca,
  taglia,
} from '../common/filters.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './consegne.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

/** Come sta una pendenza: le stesse quattro parole della pagina. */
const STATI = ['aperta', 'scade', 'arretrata', 'completa'] as const

/** Quanti nomi di chi manca si scrivono per riga. */
const QUANTI_NOMI = 8

export const procedura = definisci({
  nome: 'consegne.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    stato: opzionale(scelta(STATI, { aiuto: () => t().stato })),
    complete: opzionale(booleano({ aiuto: () => t().complete })),
    giorno: opzionale(iso({ aiuto: () => t().giorno })),
    // Due soglie sul tempo, all'indietro e in avanti: lo `stato` non le distingue.
    arretrateDaAlmeno: estremo(() => t().arretrateDaAlmeno, { minimo: 0 }),
    scadeEntro: estremo(() => t().scadeEntro, { minimo: 0 }),
    ...ricerca(() => t().dove, 'firma'),
    ...pagina(),
  }),
  uscita: oggetto({
    giorno: testo({ aiuto: () => t().giornoUscita }),
    cerca: CAMPI_CERCA.cerca,
    // Le soglie tornano come applicate: la busta dice se il resto è stato tagliato.
    arretrateDaAlmeno: nullabile(numero({ aiuto: () => t().arretrateDaAlmenoUscita })),
    scadeEntro: nullabile(numero({ aiuto: () => t().scadeEntroUscita })),
    ...CAMPI_PAGINA,
    consegne: elenco(oggetto({
      id: testo(),
      testo: testo({ aiuto: () => t().testo }),
      tipo: testo(),
      stato: scelta(STATI),
      corsoId: testo(),
      corso: testo(),
      classe: testo(),
      a: testo({ aiuto: () => t().a }),
      data: testo({ aiuto: () => t().data }),
      scadenza: testo({ aiuto: () => t().scadenza }),
      giorni: nullabile(numero({ intero: true, aiuto: () => t().giorni })),
      fatte: numero({ intero: true, aiuto: () => t().fatte }),
      destinatari: numero({ intero: true }),
      quota: numero({ aiuto: () => t().quota }),
      mancano: elenco(testo(), { aiuto: () => t().mancano }),
      documento: booleano({ aiuto: () => t().documento }),
      note: testo(),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'giorno', etichetta: () => p().rispettoAl, formato: 'data' },
          { campo: 'quante', etichetta: () => p().pendenze, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'consegne',
        colonne: [
          { campo: 'testo', testo: () => parole().cheCosa },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'stato', testo: () => parole().stato },
          { campo: 'scadenza', testo: () => p().perIl, formato: 'data' },
          { campo: 'giorni', testo: () => p().giorni, formato: 'numero' },
          { campo: 'fatte', testo: () => p().fatte, formato: 'numero' },
          { campo: 'destinatari', testo: () => p().su, formato: 'numero' },
          { campo: 'mancano', testo: () => p().mancano, formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const giorno = ingresso.giorno ?? giornoDiOggi()
    // Solo i corsi dell'anno in uso: le pendenze di un anno chiuso non sono lavoro
    // da fare.
    const corsi = corsiDellAnno(r, r.annoCorrenteId)
    const ammessi = new Map(corsi.map((corso) => [corso.id, corso]))

    const { corrisponde } = filtroTesto(ingresso.cerca)

    const scelte = r.consegne
      .filter((consegna) => ammessi.has(consegna.corsoId))
      .filter((consegna) => !ingresso.corsoId || consegna.corsoId === ingresso.corsoId)
      .filter((consegna) =>
        !ingresso.classeId || classeDelCorsoId(r, consegna.corsoId)?.id === ingresso.classeId,
      )
      .map((consegna) => {
        const scadenza = scadenzaConsegna(r, consegna)
        const classe = classeDelCorsoId(r, consegna.corsoId)
        const corso = ammessi.get(consegna.corsoId) ?? null
        const avanzamento = avanzamentoConsegna(consegna, classe)
        const nomi = new Map(
          ordinaAllievi(classe?.allievi ?? []).map((a) => [a.id, nomeCompleto(a)]),
        )
        const mancano = avanzamento.mancano.map((chi) => nomi.get(chi) ?? t().chiInsegna)

        return {
          id: consegna.id,
          testo: consegna.testo,
          tipo: consegna.tipo,
          stato: statoConsegna(r, consegna, classe, giorno),
          corsoId: consegna.corsoId,
          corso: [classe?.nome, corso ? materiaDelCorso(r, corso)?.nome : null]
            .filter(Boolean).join(' — ') || corso?.titolo || '—',
          classe: classe?.nome ?? '—',
          a: consegna.a,
          // Le date passano dal dominio: una consegna appesa a una lezione si sposta con
          // lei.
          data: dataConsegna(r, consegna),
          scadenza: scadenza ?? '',
          // Con il segno: fra tre giorni `3`, scaduta da tre `-3`. Senza, «scade oggi» e
          // «scaduta da un mese» sarebbero uguali.
          giorni: scadenza === null ? null : differenzaGiorni(giorno, scadenza),
          fatte: avanzamento.fatte,
          destinatari: avanzamento.destinatari.length,
          quota: avanzamento.quota,
          mancano: mancano.length > QUANTI_NOMI
            ? [...mancano.slice(0, QUANTI_NOMI), t().eAltri(mancano.length - QUANTI_NOMI)]
            : mancano,
          documento: raccoglieDocumento(consegna),
          note: consegna.note ?? '',
        }
      })
      .filter((consegna) => ingresso.complete === true || consegna.stato !== 'completa')
      .filter((consegna) => !ingresso.stato || consegna.stato === ingresso.stato)
      // «Scaduta da almeno N» sui giorni all'incontrario, via `fraSoglie`: una
      // pendenza senza termine non passa nessuna soglia.
      .filter((consegna) => fraSoglie(
        consegna.giorni === null ? null : -consegna.giorni,
        ingresso.arretrateDaAlmeno,
        undefined,
      ))
      // Il pavimento a zero solo con `scadeEntro` chiesto: tiene fuori l'arretrato
      // da «scade entro», senza toglierlo da un elenco non filtrato.
      .filter((consegna) => ingresso.scadeEntro === undefined ||
        fraSoglie(consegna.giorni, 0, ingresso.scadeEntro))
      // La ricerca sulla riga composta: «matematica» trova le pendenze del corso
      // anche se la parola sta solo nella materia.
      .filter((consegna) =>
        corrisponde([consegna.testo, consegna.corso, consegna.note].join(' ')),
      )
      // Prima quel che è in ritardo, poi quel che scade prima, come nella pagina.
      .sort((a, b) => (a.scadenza || '9999-12-31').localeCompare(b.scadenza || '9999-12-31'))

    const { pagina: consegne, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      giorno,
      cerca: ingresso.cerca ?? '',
      arretrateDaAlmeno: ingresso.arretrateDaAlmeno ?? null,
      scadeEntro: ingresso.scadeEntro ?? null,
      quante,
      da,
      troncato,
      ancora,
      consegne,
    }
  },
})
