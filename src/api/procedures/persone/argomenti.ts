// Che cosa si è fatto nelle ore in cui una persona non c'era.
//
// È la domanda che si fa il lunedì dopo una settimana di assenze — «che cosa
// deve recuperare Rossi?» — e fin qui l'API non sapeva rispondere. Gli
// argomenti stanno in `ore.elenco`, l'appello in `ore.appello.leggi`, e
// metterli insieme voleva dire una chiamata per ogni ora del periodo e un
// incrocio fatto a mano da chi legge: un modello quel giro non lo fa, e chi lo
// facesse rischierebbe di incrociare la riga sbagliata.
//
// **Con e senza assenza dalla stessa porta.** `presenza` sceglie che cosa
// mostrare — le ore perse, quelle seguite, quelle a metà, tutte — perché le
// due domande sono la stessa domanda girata: «che cosa ha perso» prepara un
// recupero, «che cosa ha fatto» prepara un colloquio o una certificazione. Una
// lettura sola con un filtro, e non due letture che si somigliano e si
// contraddicono al primo cambiamento.
//
// I conti non si rifanno qui: gli stati per unità didattica li allinea
// `statiAllineati`, e che cosa valga come ora persa lo dice `contaComeAssenza`
// — la stessa funzione da cui escono le percentuali dei rapporti. Un'ora
// contata in due modi diversi in due punti del registro è il difetto che si
// scopre sei mesi dopo, davanti a un genitore.

import {
  contaComeAssenza,
  contaUd,
  inizioLezione,
  nomeCompleto,
  statiAllineati,
} from '../../../domain/calculations.js'
import {
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import type { Lezione } from '../../../domain/models.js'
import { definisci, errore } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import {
  CAMPI_PAGINA,
  filtroTesto,
  nelPeriodo,
  pagina,
  periodo,
  ricerca,
  risolviPeriodo,
  taglia,
} from '../common/filters.js'
import { esigiCorso, esigiPersona } from '../common/register.js'

/**
 * Come si è stati in un'ora, in una parola.
 *
 * Quattro e non due, perché due mentirebbero. `parziale` è l'ora cominciata in
 * ritardo o lasciata a metà: qualcosa di quell'argomento lo ha sentito, e
 * metterla fra le perse manderebbe a recuperare una lezione che ha quasi
 * fatto. `ignota` è l'ora di cui nessuno ha fatto l'appello: non è una
 * presenza e non è un'assenza, ed è la sola casella onesta per una lezione su
 * cui il registro non sa niente.
 */
const PRESENZE = ['persa', 'parziale', 'seguita', 'ignota'] as const

/** Che cosa si vuole vedere: il filtro che rende utile questa lettura. */
const FILTRI = ['perse', 'parziali', 'seguite', 'ignote', 'tutte'] as const

/** Come si legge una presenza quando la si sceglie nel filtro. */
const QUALI: Record<(typeof FILTRI)[number], readonly (typeof PRESENZE)[number][]> = {
  perse: ['persa'],
  parziali: ['parziale'],
  seguite: ['seguita'],
  ignote: ['ignota'],
  tutte: PRESENZE,
}

export const procedura = definisci({
  nome: 'persone.argomenti',
  versione: 1,
  genere: 'lettura',
  titolo: 'Gli argomenti delle ore di una persona, con e senza assenza',
  idempotente: true,
  ingresso: oggetto({
    allievoId: identificatore({ aiuto: 'La persona di cui si guardano le ore' }),
    corsoId: opzionale(identificatore({ aiuto: 'Solo le ore di questo corso' })),
    // Il filtro per cui questa lettura esiste. Predefinito «perse»: è la
    // domanda che si fa nove volte su dieci — chi apre questa porta sta
    // preparando un recupero — e un predefinito che risponde alla domanda
    // vera vale più di un predefinito neutro che le costringe tutte a
    // passare da un secondo giro.
    presenza: opzionale(scelta(FILTRI, {
      aiuto: 'Quali ore: «perse» (senza, è questo), «parziali», «seguite», «ignote», «tutte»',
    })),
    ...periodo('le ore'),
    ...ricerca('argomento, materia o aula', 'frazioni'),
    ...pagina(),
  }),
  uscita: oggetto({
    allievoId: testo(),
    allievo: testo({ aiuto: 'Come si scrive parlandone: «Rossi Maria»' }),
    classe: testo(),
    dal: testo(),
    al: testo(),
    presenza: scelta(FILTRI, { aiuto: 'Il filtro con cui si è risposto' }),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    ...CAMPI_PAGINA,
    // I tre conti stanno **sul periodo intero**, non sulla pagina: una
    // risposta che dicesse «tre ore perse» avendone mandate tre di cinquanta
    // sarebbe una risposta falsa detta da una busta onesta.
    orePerse: numero({ intero: true, aiuto: 'Ore mancate per intero nel periodo, filtro a parte' }),
    udPerse: numero({ intero: true, aiuto: 'Unità didattiche perse nel periodo, filtro a parte' }),
    senzaArgomento: numero({
      intero: true,
      aiuto: 'Quante delle ore in elenco non dicono che cosa si è fatto: non si recuperano al buio',
    }),
    ore: elenco(oggetto({
      lezioneId: testo({ aiuto: 'Da passare a «ore.leggi» per materiali e consuntivo' }),
      data: testo(),
      inizio: nullabile(testo()),
      corsoId: testo(),
      corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica»' }),
      materia: testo(),
      aula: testo(),
      argomenti: testo({ aiuto: 'Che cosa si è fatto, come l’ha scritto chi insegna' }),
      presenza: scelta(PRESENZE),
      ud: numero({ intero: true, aiuto: 'Quante unità didattiche durava l’ora' }),
      udAssenza: numero({ intero: true, aiuto: 'Quante ne ha perse di quelle' }),
      udPresenza: numero({ intero: true, aiuto: 'Quante ne ha seguite' }),
      nota: testo({ aiuto: 'La nota dell’appello su quell’ora, se c’è' }),
      conAppello: booleano({ aiuto: 'Se su quell’ora qualcuno ha segnato qualcosa' }),
    })),
  }),
  presentazione: {
    titolo: 'Le ore di una persona',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'allievo', etichetta: 'Persona' },
          { campo: 'classe', etichetta: 'Classe' },
          { campo: 'presenza', etichetta: 'Filtro' },
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'quante', etichetta: 'Ore che corrispondono', formato: 'numero' },
          { campo: 'orePerse', etichetta: 'Ore perse nel periodo', formato: 'numero' },
          { campo: 'udPerse', etichetta: 'UD perse nel periodo', formato: 'numero' },
          { campo: 'senzaArgomento', etichetta: 'Senza argomento scritto', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'ore',
        colonne: [
          { campo: 'data', testo: 'Giorno', formato: 'data' },
          { campo: 'inizio', testo: 'Dalle', formato: 'ora' },
          { campo: 'corso', testo: 'Corso' },
          { campo: 'presenza', testo: 'Com’è andata' },
          { campo: 'udAssenza', testo: 'UD perse', formato: 'numero' },
          { campo: 'argomenti', testo: 'Argomenti' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const { classe, allievo } = esigiPersona(ambito, ingresso.allievoId)
    // Il corso nominato deve esistere **e** essere di questa classe: un corso
    // di un'altra classe tornerebbe zero ore, e zero ore si leggono come «non
    // ha mai perso niente» invece che come «hai chiesto il corso sbagliato».
    if (ingresso.corsoId) {
      const corso = esigiCorso(ambito, ingresso.corsoId)
      if (corso.classeId !== classe.id) {
        throw errore.rifiuta(
          `«${corso.titolo}» non è un corso della ${classe.nome}: ` +
          'i corsi di una classe li elenca «corsi.elenco».',
        )
      }
    }

    const { dal, al } = risolviPeriodo(r, ingresso)
    const quali = QUALI[ingresso.presenza ?? 'perse']
    const { corrisponde } = filtroTesto(ingresso.cerca)

    const corsi = corsiDellaClasse(r, classe.id)
      .filter((corso) => !ingresso.corsoId || corso.id === ingresso.corsoId)

    const righe = corsi
      .flatMap((corso) => {
        const materia = materiaDelCorso(r, corso)?.nome ?? ''
        const nome = [classe.nome, materia].filter(Boolean).join(' — ') || corso.titolo
        return registroDelCorso(r, corso.id)
          // Le annullate restano fuori sempre: un'ora che non si è tenuta non
          // è un'ora persa da nessuno, e metterla fra quelle da recuperare
          // manderebbe a recuperare una lezione che non è mai esistita.
          .filter((lezione) => lezione.stato !== 'annullata')
          .filter((lezione) => nelPeriodo(lezione.data, dal, al))
          .map((lezione) => voce(lezione, corso.id, nome, materia, ingresso.allievoId))
      })
      // Stesso ordine di `confrontaLezioni`, che qui non si può chiamare perché
      // queste sono righe costruite e non lezioni: il pareggio sull'id è la
      // ragione per cui due ore della stessa data alla stessa ora escono sempre
      // nello stesso ordine.
      .sort((a, b) =>
        a.data.localeCompare(b.data) ||
        (a.inizio ?? '').localeCompare(b.inizio ?? '') ||
        a.lezioneId.localeCompare(b.lezioneId),
      )

    // I due conti del periodo si fanno **prima** dei filtri: dicono come sta
    // la persona, non che cosa si è chiesto di vedere.
    const orePerse = righe.filter((riga) => riga.presenza === 'persa').length
    const udPerse = righe.reduce((somma, riga) => somma + riga.udAssenza, 0)

    const scelte = righe
      .filter((riga) => quali.includes(riga.presenza))
      .filter((riga) => corrisponde([riga.argomenti, riga.materia, riga.aula].join(' ')))

    const { pagina: ore, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      allievoId: allievo.id,
      allievo: nomeCompleto(allievo),
      classe: classe.nome,
      dal,
      al,
      presenza: ingresso.presenza ?? 'perse',
      cerca: ingresso.cerca ?? '',
      quante,
      da,
      troncato,
      ancora,
      orePerse,
      udPerse,
      // Sulle righe scelte e non su tutte: è un avvertimento su quel che si
      // sta guardando — «di queste, tre non dicono che cosa si è fatto» — e
      // contarlo sul periodo intero direbbe di ore che non sono in elenco.
      senzaArgomento: scelte.filter((riga) => riga.argomenti === '').length,
      ore,
    }
  },
})

/** Una riga: l'ora vista dalla parte di una persona sola. */
function voce (
  lezione: Lezione,
  corsoId: string,
  corso: string,
  materia: string,
  allievoId: string,
): {
  lezioneId: string
  data: string
  inizio: string | null
  corsoId: string
  corso: string
  materia: string
  aula: string
  argomenti: string
  presenza: (typeof PRESENZE)[number]
  ud: number
  udAssenza: number
  udPresenza: number
  nota: string
  conAppello: boolean
} {
  const ud = contaUd(lezione)
  const presenza = lezione.presenze.find((p) => p.allievoId === allievoId)
  const stati = statiAllineati(presenza, ud)
  const udAssenza = stati.filter(contaComeAssenza).length
  const conAppello = stati.some((stato) => stato !== 'non-impostato')

  return {
    lezioneId: lezione.id,
    data: lezione.data,
    inizio: inizioLezione(lezione),
    corsoId,
    corso,
    materia,
    aula: lezione.aula ?? '',
    argomenti: lezione.argomenti ?? '',
    // Si guarda **quante UD** sono andate perse e non il riassunto dell'ora:
    // è la differenza che questa lettura serve a dire. Chi è entrato alla
    // terza UD di quattro ha perso metà argomento, e mandarlo a recuperare
    // tutto — o niente — sono due modi diversi di sbagliare.
    presenza:
      !conAppello ? 'ignota'
        : udAssenza === 0 ? 'seguita'
          : udAssenza === ud ? 'persa'
            : 'parziale',
    ud,
    udAssenza,
    udPresenza: stati.filter((stato) => stato === 'presente' || stato === 'ritardo').length,
    nota: presenza?.nota ?? '',
    conAppello,
  }
}
