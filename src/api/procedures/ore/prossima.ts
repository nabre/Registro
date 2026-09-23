// «Qual è la prossima lezione?» — la domanda che la chat non sapeva riconoscere.
//
// C'era il conto e non c'era la porta. `prossimaLezione()` sta in
// `domain/calculations.ts` da sempre, e la vista dei corsi la usa per la riga in
// cima; da fuori invece non c'era modo di chiederla. `ore.elenco` risponde a
// «che ore ho questa settimana» — vuole un periodo, torna una pagina — e per
// avere *la prossima* bisognava chiedere l'anno intero, ordinare a mente e
// prendere la prima non ancora passata. Un modello che ci prova sbaglia in due
// modi: chiede un periodo che non c'entra, oppure risponde con la prima riga
// dell'elenco, che è la prima **dell'anno**.
//
// ---------------------------------------------------------------- da quando
//
// Questa è la prima lettura dell'API che guarda l'orologio, e va detto perché
// finora non lo faceva nessuna: una busta che dipende dall'istante in cui la si
// chiede non si può confrontare con quella di ieri. Qui però «prossima» vuol
// dire proprio «dopo adesso», e far portare il momento a chi chiama vorrebbe
// dire che il modello se lo inventa — cioè la cosa che gli si chiede di non
// fare mai.
//
// Il compromesso sta in due righe: `da` e `dalleOre` **si possono passare**, e
// quel che si è usato torna nella busta. Chi prova li passa e ha una risposta
// che non cambia; chi chiede davvero non li passa e ha adesso.
//
// ------------------------------------------------------------------ quante
//
// Una, di suo, perché la domanda è al singolare. Ma «e quella dopo?» arriva
// subito, e senza `quante` costringerebbe a richiamare con un `da` calcolato a
// mano sulla risposta precedente — cioè a rifare fuori il conto che si è appena
// chiesto. Un elenco di una voce sola si legge come una voce sola.

import {
  contaUd,
  fineLezione,
  inizioLezione,
  minutiEffettivi,
  momentoLezione,
  prossimaLezione,
} from '../../../domain/calculations.js'
import {
  classeDellaLezione,
  corsoDellaLezione,
  materiaDellaLezione,
  numeroDellaLezione,
} from '../../../domain/courses.js'
import { adesso, differenzaGiorni, oggi } from '../../../domain/dates.js'
import type { Lezione } from '../../../domain/models.js'
import { definisci } from '../../contract.js'
import {
  elenco,
  identificatore,
  iso,
  nullabile,
  numero,
  oggetto,
  opzionale,
  testo,
} from '../../schemas.js'
import { esigiClasse, esigiCorso } from '../common/register.js'

/**
 * Quante se ne possono chiedere in un colpo.
 *
 * Non è una pagina: chi ne vuole trenta sta chiedendo un elenco, e per quello
 * c'è `ore.elenco` con il suo periodo e la sua paginazione. Venti sono una
 * settimana abbondante, che è il più lontano a cui «prossima» voglia ancora
 * dire qualcosa.
 */
const QUANTE_MASSIME = 20

export const procedura = definisci({
  nome: 'ore.prossima',
  versione: 1,
  genere: 'lettura',
  titolo:
    'La prossima lezione: quando comincia, di quale corso e con quale classe. ' +
    'Senza filtri è la prossima in assoluto',
  idempotente: true,
  ingresso: oggetto({
    corsoId: opzionale(identificatore({ aiuto: 'Solo le ore di questo corso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo le ore di questa classe' })),
    da: opzionale(iso({ aiuto: 'Da quale giorno guardare avanti. Senza, oggi' })),
    dalleOre: opzionale(testo({
      modello: /^([01]\d|2[0-3]):[0-5]\d$/,
      aiuto: 'Da che ora guardare avanti, «HH:MM». Senza, adesso',
      esempio: '08:15',
    })),
    quante: opzionale(numero({
      intero: true,
      minimo: 1,
      massimo: QUANTE_MASSIME,
      aiuto: `Quante ore a venire, da 1 a ${QUANTE_MASSIME}. Senza, solo la prossima`,
    })),
  }),
  uscita: oggetto({
    da: testo({ aiuto: 'Il giorno da cui si è guardato avanti' }),
    dalleOre: testo({ aiuto: 'L’ora da cui si è guardato avanti' }),
    // Il conto che distingue «non ne hai più» da «non ho guardato». Con un
    // `corsoId` che a calendario non ha niente, `prossime` esce vuoto in tutti
    // e due i casi, e le due frasi da dire sono diverse.
    aCalendario: numero({
      intero: true,
      aiuto:
        'Quante ore non annullate ci sono in tutto con i filtri chiesti. Zero vuol dire che ' +
        'il calendario è vuoto, non che le lezioni siano finite',
    }),
    prossime: elenco(oggetto({
      id: testo({ aiuto: 'Da passare a «ore.leggi» per vedere l’ora per intero' }),
      data: testo(),
      inizio: nullabile(testo({ aiuto: 'Quando comincia. Nulla se quell’ora non ha un orario' })),
      fine: nullabile(testo()),
      fraGiorni: numero({ intero: true, aiuto: 'Zero è oggi, uno è domani' }),
      momento: nullabile(testo({
        aiuto:
          'Solo sulla prima: «in-corso» se è cominciata e non è finita, «futura» se deve ' +
          'ancora cominciare. Nulla sulle altre',
      })),
      corsoId: testo(),
      corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica»' }),
      classeId: testo(),
      classe: testo(),
      // Nulla quando quell'ora nel calendario del corso non c'è: numerarla
      // lo stesso vorrebbe dire inventare una posizione in una sequenza.
      numero: nullabile(numero({ intero: true, aiuto: 'La quantesima di quel corso' })),
      stato: testo(),
      ud: numero({ intero: true, aiuto: 'Unità didattiche previste per quell’ora' }),
      minuti: numero({ intero: true }),
      aula: testo(),
      argomenti: testo({ aiuto: 'Quel che c’è scritto: vuoto se non è ancora stato segnato' }),
    })),
  }),
  presentazione: {
    titolo: 'La prossima lezione',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'da', etichetta: 'Da', formato: 'data' },
          { campo: 'dalleOre', etichetta: 'Dalle', formato: 'ora' },
          { campo: 'aCalendario', etichetta: 'Ore a calendario', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'prossime',
        colonne: [
          { campo: 'data', testo: 'Giorno', formato: 'data' },
          { campo: 'inizio', testo: 'Dalle', formato: 'ora' },
          { campo: 'corso', testo: 'Corso' },
          { campo: 'aula', testo: 'Aula' },
          { campo: 'argomenti', testo: 'Argomento' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)
    if (ingresso.corsoId) esigiCorso(ambito, ingresso.corsoId)

    const da = ingresso.da ?? oggi()
    const dalleOre = ingresso.dalleOre ?? adesso()
    const quante = ingresso.quante ?? 1

    // I filtri si applicano **prima** di cercare, non dopo: cercare prima e
    // filtrare poi darebbe «non ce n'è nessuna» ogni volta che la prossima in
    // assoluto è di un altro corso.
    const suoi = r.lezioni
      .filter((lezione) => lezione.stato !== 'annullata')
      .filter((lezione) => !ingresso.corsoId || lezione.corsoId === ingresso.corsoId)
      .filter((lezione) =>
        !ingresso.classeId || classeDellaLezione(r, lezione)?.id === ingresso.classeId,
      )

    // Una per volta, ripartendo dalla precedente. `prossimaLezione` sa già
    // ordinare e sa già che cosa vuol dire «passata»: rifare quell'ordine qui
    // vorrebbe dire due regole su quando un'ora è finita, ed è il genere di
    // conto che scritto due volte, un giorno, non torna.
    const trovate: Lezione[] = []
    let restano = suoi
    let giorno = da
    let ora: string | undefined = dalleOre
    while (trovate.length < quante) {
      const prossima = prossimaLezione(restano, giorno, ora)
      if (!prossima) break
      trovate.push(prossima)
      restano = restano.filter((lezione) => lezione.id !== prossima.id)
      // Dalla seconda in poi non c'è più un'ora da cui ripartire: si riparte
      // dal giorno di quella trovata, e le sue sorelle dello stesso giorno le
      // ha già tolte `restano`.
      giorno = prossima.data
      ora = undefined
    }

    return {
      da,
      dalleOre,
      aCalendario: suoi.length,
      prossime: trovate.map((lezione, indice) => {
        const classe = classeDellaLezione(r, lezione)
        const materia = materiaDellaLezione(r, lezione)
        return {
          id: lezione.id,
          data: lezione.data,
          inizio: inizioLezione(lezione),
          fine: fineLezione(lezione),
          fraGiorni: differenzaGiorni(da, lezione.data),
          // Solo sulla prima: per le altre «in corso» non vuol dire niente, e
          // un campo che risponde a una domanda che nessuno ha fatto si legge
          // come un dato.
          momento: indice === 0 ? momentoLezione(lezione, da, dalleOre) : null,
          corsoId: lezione.corsoId,
          corso: [classe?.nome, materia?.nome].filter(Boolean).join(' — ') ||
            corsoDellaLezione(r, lezione)?.titolo || '—',
          classeId: classe?.id ?? '',
          classe: classe?.nome ?? '—',
          numero: numeroDellaLezione(r, lezione),
          stato: lezione.stato,
          ud: contaUd(lezione),
          minuti: minutiEffettivi(lezione),
          aula: lezione.aula ?? '',
          argomenti: lezione.argomenti ?? '',
        }
      }),
    }
  },
})
