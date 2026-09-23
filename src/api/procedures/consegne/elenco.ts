// Le pendenze: quel che manca, a chi tocca, e per quando.
//
// È la pagina delle pendenze detta a chi chiede. Fin qui l'assistente non aveva
// modo di rispondere a «che cosa devo ancora fare» né a «chi non ha portato il
// foglio»: delle consegne ci sono quindici procedure, tutte di scrittura, e
// nessuna che le legga.
//
// **Chi manca esce per nome, e chi ha fatto no.** Una consegna a venticinque
// persone tornerebbe con venticinque righe, ventitré delle quali dicono «ha
// fatto» — cioè niente. Quel che si chiede a una pendenza è chi resta, e la
// quota accanto dice a che punto è il resto.
//
// **E da quanto.** Lo `stato` dice «arretrata» e si ferma lì: arretrata di un
// giorno e arretrata di due mesi sono la stessa parola, e in un elenco che non
// si svuota mai è la differenza fra quel che si recupera e quel che si è
// perso. `arretrateDaAlmeno` e `scadeEntro` tagliano sui giorni — indietro e
// avanti — e ogni riga porta il suo numero, così chi legge vede dove si è
// tagliato.

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
  CAMPI_PAGINA,
  estremo,
  filtroTesto,
  fraSoglie,
  pagina,
  ricerca,
  taglia,
} from '../common/filters.js'

/** Come sta una pendenza: le stesse quattro parole della pagina. */
const STATI = ['aperta', 'scade', 'arretrata', 'completa'] as const

/** Quanti nomi di chi manca si scrivono per riga. */
const QUANTI_NOMI = 8

export const procedura = definisci({
  nome: 'consegne.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'Le pendenze aperte: consegne, documenti da raccogliere, firme',
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: 'Solo le pendenze di questo corso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo le pendenze di questa classe' })),
    stato: opzionale(scelta(STATI, { aiuto: 'Solo quelle in questo stato' })),
    complete: opzionale(booleano({
      aiuto: 'Vero per avere anche quelle finite: di norma restano fuori',
    })),
    giorno: opzionale(iso({ aiuto: 'Rispetto a quale giorno si dice «scade» o «arretrata». Senza, oggi' })),
    // Le due soglie sul tempo, e sono due domande diverse: «che cosa mi sta
    // marcendo in mano» e «che cosa devo preparare per la settimana
    // prossima». Lo `stato` non le sa dire — «arretrata» è arretrata di un
    // giorno come di due mesi — e senza di loro l'unico modo di distinguerle
    // era scorrere l'elenco guardando le date.
    arretrateDaAlmeno: estremo(
      'Giorni: solo quelle scadute da almeno tanti. Quelle senza termine restano fuori',
      { minimo: 0 },
    ),
    scadeEntro: estremo(
      'Giorni: solo quelle che scadono entro tanti, le già scadute escluse',
      { minimo: 0 },
    ),
    ...ricerca('testo, corso o nota', 'firma'),
    ...pagina(),
  }),
  uscita: oggetto({
    giorno: testo({ aiuto: 'Il giorno rispetto a cui sono stati calcolati gli stati' }),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    // Le due soglie tornano indietro come sono state applicate. Un elenco di
    // tre pendenze non dice da sé se sono tre perché tante ce n'erano o
    // perché una soglia ha tagliato il resto.
    arretrateDaAlmeno: nullabile(numero({
      aiuto: 'La soglia sull’arretrato applicata. Nulla se non se n’è chiesta',
    })),
    scadeEntro: nullabile(numero({
      aiuto: 'La soglia sulla scadenza applicata. Nulla se non se n’è chiesta',
    })),
    ...CAMPI_PAGINA,
    consegne: elenco(oggetto({
      id: testo(),
      testo: testo({ aiuto: 'Che cosa c’è da fare, come l’ha scritto chi insegna' }),
      tipo: testo(),
      stato: scelta(STATI),
      corsoId: testo(),
      corso: testo(),
      classe: testo(),
      a: testo({ aiuto: 'A chi tocca: la classe, chi insegna, o alcune persone' }),
      data: testo({ aiuto: 'Quando è stata data' }),
      scadenza: testo({ aiuto: 'Per quando, o vuoto se non ha termine' }),
      giorni: nullabile(numero({
        intero: true,
        aiuto: 'Giorni dal «giorno» alla scadenza: negativo se è scaduta. Nulla senza termine',
      })),
      fatte: numero({ intero: true, aiuto: 'Quanti l’hanno già fatta' }),
      destinatari: numero({ intero: true }),
      quota: numero({ aiuto: 'A che punto è, da 0 a 1' }),
      mancano: elenco(testo(), { aiuto: 'Chi non l’ha ancora fatta, per cognome e nome' }),
      documento: booleano({ aiuto: 'Se spuntarla vuol dire raccogliere un foglio' }),
      note: testo(),
    })),
  }),
  presentazione: {
    titolo: 'Le pendenze',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'giorno', etichetta: 'Rispetto al', formato: 'data' },
          { campo: 'quante', etichetta: 'Pendenze', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'consegne',
        colonne: [
          { campo: 'testo', testo: 'Che cosa' },
          { campo: 'corso', testo: 'Corso' },
          { campo: 'stato', testo: 'Stato' },
          { campo: 'scadenza', testo: 'Per il', formato: 'data' },
          { campo: 'giorni', testo: 'Giorni', formato: 'numero' },
          { campo: 'fatte', testo: 'Fatte', formato: 'numero' },
          { campo: 'destinatari', testo: 'Su', formato: 'numero' },
          { campo: 'mancano', testo: 'Mancano', formato: 'elenco' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const giorno = ingresso.giorno ?? giornoDiOggi()
    // I corsi dell'anno in uso: le pendenze di un anno chiuso non sono lavoro
    // che qualcuno debba ancora fare, e comparire in mezzo alle altre vorrebbe
    // dire un elenco che non si svuota mai.
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
        const mancano = avanzamento.mancano.map((chi) => nomi.get(chi) ?? 'chi insegna')

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
          // Le due date passano dal dominio: una consegna appesa a una lezione
          // si sposta con lei, e riprenderne il campo grezzo direbbe il giorno
          // in cui la lezione stava prima di essere spostata.
          data: dataConsegna(r, consegna),
          scadenza: scadenza ?? '',
          // Contati e non arrotondati a zero: un termine fra tre giorni vale
          // `3` e uno scaduto da tre vale `-3`. Schiacciare i negativi a zero
          // — che era la tentazione, per non consegnare un numero «strano» —
          // renderebbe indistinguibili «scade oggi» e «scaduta da un mese»,
          // che sono esattamente i due casi che le soglie qui sotto separano.
          giorni: scadenza === null ? null : differenzaGiorni(giorno, scadenza),
          fatte: avanzamento.fatte,
          destinatari: avanzamento.destinatari.length,
          quota: avanzamento.quota,
          mancano: mancano.length > QUANTI_NOMI
            ? [...mancano.slice(0, QUANTI_NOMI), `… e altri ${mancano.length - QUANTI_NOMI}`]
            : mancano,
          documento: raccoglieDocumento(consegna),
          note: consegna.note ?? '',
        }
      })
      .filter((consegna) => ingresso.complete === true || consegna.stato !== 'completa')
      .filter((consegna) => !ingresso.stato || consegna.stato === ingresso.stato)
      // «Scaduta da almeno N» si legge sui giorni all'incontrario, e passa da
      // `fraSoglie` come tutte le altre soglie: fra l'altro è lì che sta la
      // regola per cui un valore nullo — una pendenza senza termine — non
      // passa nessuna soglia. Che è quel che si vuole: senza scadenza non è
      // arretrata di niente, e infilarla fra le arretrate vorrebbe dire
      // segnalare per un dato che manca.
      .filter((consegna) => fraSoglie(
        consegna.giorni === null ? null : -consegna.giorni,
        ingresso.arretrateDaAlmeno,
        undefined,
      ))
      // Lo zero in basso non arriva dall'ingresso ma è messo qui, e solo
      // quando la soglia è stata chiesta: «scade entro tre giorni» è una
      // domanda sul futuro, e senza quel pavimento ci finirebbe dentro anche
      // tutto l'arretrato dell'anno. Applicarlo sempre — cioè passare `0` a
      // `fraSoglie` anche senza `scadeEntro` — toglierebbe le arretrate da
      // un elenco che nessuno ha filtrato.
      .filter((consegna) => ingresso.scadeEntro === undefined ||
        fraSoglie(consegna.giorni, 0, ingresso.scadeEntro))
      // La ricerca si applica **dopo** aver composto la riga, e non sui campi
      // grezzi: così «matematica» trova le pendenze del corso di matematica
      // anche se quella parola, nel dato, sta soltanto nella materia.
      .filter((consegna) =>
        corrisponde([consegna.testo, consegna.corso, consegna.note].join(' ')),
      )
      // Prima quel che è in ritardo, poi quel che scade prima: è l'ordine in
      // cui la pagina le mette, ed è l'ordine in cui si guardano.
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
