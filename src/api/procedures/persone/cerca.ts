// Trovare una persona per nome, come al telefono.
//
// È la lettura che mancava, e il giornale lo ha scritto per esteso: dieci
// `persone.scheda` di fila, tutte `non-trovato`, tutte con un `allievoId` che
// il modello si era inventato. Non era testardaggine — era l'unica strada che
// aveva: la scheda vuole un id, il contesto lo manda solo quando una persona è
// aperta, e a «come sta Rossi» non restava che indovinarlo.
//
// Si cerca **a pezzi**, come nella pagina: «rossi dic» trova Rossi della DIC4a
// e non tutti i Rossi più tutta la DIC4a. È il modo in cui si restringe una
// ricerca aggiungendo una parola invece di allargarla, e vale per il nome, la
// classe e l'azienda insieme — al telefono si dice «la mamma di Damiano della
// quarta», non un identificatore.

import { nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import type { Allievo } from '../../../domain/models.js'
import { pezziDiRicerca } from '../../../domain/text.js'
import { definisci } from '../../contract.js'
import {
  booleano,
  elenco,
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
  pagina,
  nellaZona,
  passaPresenza,
  presenzaDi,
  taglia,
  zona,
} from '../common/filters.js'


/**
 * Le parole che nominano la categoria, e che quindi non sono un filtro.
 *
 * Dal giornale, due volte: a «mi dai l'elenco degli allievi» il modello chiama
 * `persone.cerca` con `cerca: 'allievo'`, riceve zero e risponde che non ce ne
 * sono. Gliel'hanno già vietato le istruzioni — «non cercare a parole quel che
 * si chiede senza» — e un modello da otto miliardi di parametri lo fa lo
 * stesso: una regola scritta nel prompt è un consiglio, e i consigli si
 * scordano a metà conversazione.
 *
 * Qui la regola è codice. Nessuna di queste parole è il nome di una persona —
 * sono il nome dell'insieme a cui appartiene — quindi cercarle vuol dire
 * sempre e soltanto «tutte». Si tolgono dai pezzi della ricerca e si dice che
 * sono state tolte: togliere in silenzio sarebbe rispondere a una domanda
 * diversa da quella fatta senza avvisare.
 *
 * Restano fuori le parole che potrebbero essere il nome di qualcuno o di una
 * classe: «meccanico», «prima», «donna». Il confine è questo, e non
 * «quanto è generica».
 */
const PAROLE_CATEGORIA: ReadonlySet<string> = new Set([
  'allievo', 'allieva', 'allievi', 'allieve',
  'studente', 'studentessa', 'studenti', 'studentesse',
  'alunno', 'alunna', 'alunni', 'alunne',
  'persona', 'persone', 'pif', 'formazione',
  'iscritto', 'iscritta', 'iscritti', 'iscritte',
  'tutti', 'tutte', 'tutto',
])

/**
 * I campi di una persona che possono restare vuoti.
 *
 * Non sono tutti quelli dell'anagrafica: cognome e nome ci sono sempre, e un
 * filtro su di loro risponderebbe «tutte» o «nessuna» qualunque cosa si
 * chieda. Qui stanno i recapiti e i dati che si raccolgono strada facendo —
 * quelli che il giorno prima di una comunicazione alla classe si scopre che
 * mancano a tre persone, e che fin qui si trovavano soltanto scorrendo
 * venticinque schede una per una.
 */
const CAMPI_PERSONA = [
  'email', 'emailTutore', 'emailDatore', 'telefono', 'indirizzo',
  'azienda', 'dataNascita', 'foto',
] as const

/**
 * La persona come la vede il filtro: un valore per campo, e basta che `pieno`
 * sappia dire se c'è.
 *
 * Due campi non si leggono come sono scritti. Un telefono senza numero è una
 * riga di rubrica aperta e mai compilata — il contatto c'è, la cifra da
 * comporre no — e contarlo come telefono manderebbe chi chiama a cercare un
 * numero che non esiste. Un indirizzo con la via vuota è quel che resta
 * quando si è salvata la sola località: su una busta non ci si scrive niente,
 * e `scriviIndirizzo` ne farebbe una riga con il NAP e nient'altro.
 */
function valoriDi (allievo: Allievo): Record<string, unknown> {
  return {
    email: allievo.email,
    emailTutore: allievo.emailTutore,
    emailDatore: allievo.emailDatore,
    telefono: allievo.telefoni.filter((telefono) => telefono.numero.trim() !== ''),
    indirizzo: allievo.indirizzo?.via,
    azienda: allievo.azienda,
    dataNascita: allievo.dataNascita,
    foto: allievo.foto,
  }
}

/**
 * La riga che dice a chi legge che cosa fare adesso.
 *
 * Vuota quando non c'è niente da fare: una busta piena non ha bisogno di
 * consigli, e un consiglio dato sempre non si legge più quando serve.
 *
 * L'ordine dei casi è l'ordine in cui vanno detti — prima quel che il
 * chiamante ha sbagliato, poi quel che il filtro nasconde — perché chi legge
 * agisce sulla prima frase.
 */
function suggerimento (stato: {
  quante: number
  inRegistro: number
  cerca: string
  tolti: readonly string[]
  ha: readonly string[]
  senza: readonly string[]
  escluseRitirate: number | null
  escluseArchiviate: number | null
}): string {
  const frasi: string[] = []

  if (stato.tolti.length > 0) {
    const parole = stato.tolti.map((t) => `«${t}»`).join(', ')
    frasi.push(
      stato.cerca === ''
        ? `${parole} nomina la categoria e non una persona: ho risposto come senza filtro.`
        : `${parole} nomina la categoria e non una persona: l’ho tolta, e ho cercato «${stato.cerca}».`,
    )
  }

  if (stato.quante === 0 && stato.inRegistro > 0) {
    // Quale filtro ha svuotato l'elenco, detto per nome. «Richiama senza
    // «cerca» per averle tutte» era vero finché `cerca` era l'unico filtro:
    // con `ha` o `senza` accesi manda a rifare una chiamata che torna vuota
    // lo stesso, e chi legge la rifà due volte prima di sospettare i campi.
    const chiesti = [...stato.ha, ...stato.senza].map((campo) => `«${campo}»`).join(', ')
    if (chiesti !== '') {
      const fra = stato.cerca === '' ? '' : ` fra quelle che corrispondono a «${stato.cerca}»`
      frasi.push(
        `Nel registro ci sono ${stato.inRegistro} persone, e nessuna${fra} ha i campi ` +
        `${chiesti} come chiesto: richiama «persone.cerca» senza «ha» e «senza» per allargare.`,
      )
    } else {
      frasi.push(
        stato.cerca === ''
          ? `Nel registro ci sono ${stato.inRegistro} persone, e nessuna passa i filtri.`
          : `Nessuna corrisponde a «${stato.cerca}», ma nel registro ce ne sono ${stato.inRegistro}: ` +
            'richiama «persone.cerca» senza «cerca» per averle tutte.',
      )
    }
  }

  const rientri: string[] = []
  if (stato.escluseRitirate !== null) rientri.push('«ritirati» a vero')
  if (stato.escluseArchiviate !== null) rientri.push('«archiviate» a vero')
  if (rientri.length > 0 && stato.quante === 0) {
    frasi.push(`Con ${rientri.join(' e ')} rientrano quelle che il filtro tiene fuori.`)
  }

  return frasi.join(' ')
}

export const procedura = definisci({
  nome: 'persone.cerca',
  versione: 1,
  genere: 'lettura',
  titolo: 'Trova una persona in formazione per nome, classe o azienda',
  idempotente: true,
  ingresso: oggetto({
    // Senza `cerca` escono tutte, ed è la correzione di un difetto vero: il
    // campo era obbligatorio, e a «elencami le persone in formazione» il
    // modello ha cercato la parola «allievo». Zero risultati, e la risposta
    // che ne ha tratto — «ci sono 0 persone in questo registro» — era falsa e
    // detta con sicurezza, che è il modo peggiore di sbagliare che ci sia.
    // Un attrezzo che non sa dire «tutte» costringe chi lo usa a inventarsi un
    // filtro, e un filtro inventato torna sempre vuoto.
    cerca: opzionale(testo({
      // L'esempio non è un cognome, e non è pignoleria: un cognome plausibile
      // scritto qui arriva al modello dentro il catalogo, e un modello piccolo
      // lo ricopia nella risposta come se fosse una persona del registro. È
      // successo: «Rossi Mario» non esisteva fra gli allievi e stava in una
      // nostra riga d'esempio. Un pezzo di sigla di classe mostra la stessa
      // forma — corta, minuscola, incompleta — e non somiglia a nessuno.
      aiuto: 'Pezzi di cognome, classe o azienda: ogni pezzo deve trovarsi, «dic4a» e ' +
        'un pezzo di cognome insieme restringono. Senza, tornano tutte',
      esempio: 'dic4a',
    })),
    ritirati: opzionale(booleano({
      aiuto: 'Vero per cercare anche fra chi non frequenta più: di norma restano fuori',
    })),
    // Le classi archiviate hanno una porta, altrimenti quelle persone non si
    // raggiungono affatto: «la Rossi dell'anno scorso» è una domanda vera, e
    // un attrezzo che non sa rispondere «non c'è» da «non la cerco» è lo
    // stesso difetto di prima visto da un'altra parte.
    archiviate: opzionale(booleano({
      aiuto: 'Vero per cercare anche nelle classi archiviate: di norma restano fuori',
    })),
    // «Chi non ha l'e-mail» era la domanda che si faceva a voce il giorno
    // prima di scrivere alla classe, e a cui si rispondeva aprendo le schede
    // una per una. I due campi si compongono: `ha: ['telefono']` con
    // `senza: ['email']` è l'elenco di chi va chiamato invece che scritto.
    ...presenzaDi(CAMPI_PERSONA, 'le persone'),
    // La zona sta qui e non solo nella scheda: «chi abita a Lugano» si chiede
    // cercando, non aprendo una persona per volta. I due campi c'erano nelle
    // altre due letture e non in questa, e passati qui lo schema li scartava
    // in silenzio — la busta tornava con tutte le persone e nessuna parola su
    // un filtro che non era stato applicato, che è il modo peggiore di non
    // rispondere: chi legge crede di aver chiesto e crede di aver ricevuto.
    ...zona(),
    ...pagina(),
  }),
  uscita: oggetto({
    cerca: testo({ aiuto: 'Il filtro applicato davvero. Vuoto quando non si è filtrato niente' }),
    // Che cosa è stato tolto dalla ricerca, e perché: la busta non deve mai
    // rispondere a una domanda diversa da quella fatta senza dirlo.
    ignorato: testo({
      aiuto: 'Le parole tolte dal filtro perché nominano la categoria, non una persona',
    }),
    comune: testo({ aiuto: 'Il comune su cui si è filtrato. Vuoto quando non se n’è chiesto' }),
    cap: testo({ aiuto: 'Il NAP su cui si è filtrato. Vuoto quando non se n’è chiesto' }),
    // Rimandati come `cerca`, e per la stessa ragione: una busta deve dire su
    // che cosa ha risposto, o chi la rilegge il giorno dopo non sa più se
    // quelle tre righe sono tutta la classe o quel che restava dopo un
    // filtro. Vuoti quando non se n’è chiesto nessuno, mai nulli: un elenco
    // vuoto dice «non ho filtrato» senza costringere a distinguere due casi
    // che sono lo stesso.
    ha: elenco(scelta(CAMPI_PERSONA), { aiuto: 'I campi che si sono chiesti pieni' }),
    senza: elenco(scelta(CAMPI_PERSONA), { aiuto: 'I campi che si sono chiesti vuoti' }),
    // Il totale accanto al risultato: è la riga che impedisce di dire «non ce
    // n'è nessuna» dopo una ricerca che non ha trovato niente. Sono due fatti
    // diversi — «zero corrispondono» e «zero ce ne sono» — e senza il secondo
    // il primo si legge come se fosse l'altro.
    // «In tutto» vuol dire **in tutto**, non «in tutto fra quelle che si
    // stavano guardando». Contato dentro il filtro, questo numero andava a
    // zero insieme al risultato proprio nel caso che doveva coprire: un
    // registro le cui classi sono tutte archiviate rispondeva «0 trovate, 0
    // nel registro», e di lì «non c'è nessuno» è una deduzione corretta da
    // una premessa falsa. Adesso conta tutte le persone di tutte le classi, e
    // `esclusi` dice quante ne tiene fuori il filtro e quale interruttore le
    // riporta dentro.
    inRegistro: numero({
      intero: true,
      aiuto: 'Quante persone ci sono in tutto nel registro, filtri compresi',
    }),
    // Piatti e non dentro un `esclusi: {…}`: la presentazione legge una chiave
    // sola — `campo()` non scende nei sottoggetti — e un numero che il pannello
    // non sa mostrare sarebbe visto dal modello e non da chi ha chiesto.
    //
    // Nulli e non zero quando non c'è niente da escludere: il pannello scrive
    // una riga per ogni valore che c'è, e due righe che dicono «0» sotto una
    // risposta buona sono due righe che parlano di un problema che non esiste.
    esclusiRitirati: nullabile(numero({
      intero: true,
      aiuto: 'Quante restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
    })),
    esclusiArchiviate: nullabile(numero({
      intero: true,
      aiuto: 'Quante restano fuori perché la classe è archiviata: con «archiviate» a vero rientrano',
    })),
    // La frase che dice a chi legge che cosa fare adesso. È la stessa cosa che
    // `errore.nonTrovato` fa con il rimedio, portata dove il rifiuto non c'è:
    // una busta vuota ma valida è il punto in cui un modello si ferma, e una
    // riga che dice quale chiamata rifare lo rimette in moto.
    suggerimento: testo({ aiuto: 'Che cosa chiamare per avere quel che manca. Vuoto se non manca niente' }),
    ...CAMPI_PAGINA,
    persone: elenco(oggetto({
      id: testo({ aiuto: 'Da passare a «persone.scheda»' }),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo(),
      classeId: testo(),
      classe: testo(),
      azienda: testo(),
      attivo: booleano({ aiuto: 'Falso per chi si è ritirato' }),
    })),
  }),
  presentazione: {
    titolo: 'Chi corrisponde',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'cerca', etichetta: 'Cercando' },
          { campo: 'ha', etichetta: 'Con', formato: 'elenco' },
          { campo: 'senza', etichetta: 'Senza', formato: 'elenco' },
          { campo: 'quante', etichetta: 'Trovate', formato: 'numero' },
          { campo: 'inRegistro', etichetta: 'Nel registro', formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: 'In classi archiviate, fuori', formato: 'numero' },
          { campo: 'ignorato', etichetta: 'Parole tolte dal filtro' },
          { campo: 'suggerimento', etichetta: 'Da sapere' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'cognome', testo: 'Cognome' },
          { campo: 'nome', testo: 'Nome' },
          { campo: 'classe', testo: 'Classe' },
          { campo: 'azienda', testo: 'Azienda' },
          { campo: 'attivo', testo: 'Frequenta', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Normalizzato prima di spezzare: minuscolo, senza accenti e senza
    // punteggiatura. «MÜLLER», «muller» e «Müller» sono la stessa ricerca —
    // e chi cerca scrive quello che ha sotto le dita, non quello che c'è
    // scritto nel registro.
    const chiesti = pezziDiRicerca(ingresso.cerca ?? '')
    // Le parole che nominano la categoria si tolgono: cercare «allievo» fra i
    // nomi degli allievi non è una ricerca stretta, è una ricerca impossibile.
    const pezzi = chiesti.filter((pezzo) => !PAROLE_CATEGORIA.has(pezzo))
    const tolti = chiesti.filter((pezzo) => PAROLE_CATEGORIA.has(pezzo))

    // I due conti che il filtro non deve poter spegnere: quante persone ci
    // sono davvero, e quante ne lascia fuori ciascun interruttore. Si contano
    // prima di filtrare, perché dopo non ci sono più.
    const tutteLeClassi = r.classi.flatMap((classe) =>
      classe.allievi.map((allievo) => ({ classe, allievo })),
    )
    const inRegistro = tutteLeClassi.length
    const esclusi = {
      ritirati: tutteLeClassi.filter(({ allievo }) => !allievo.attivo).length,
      archiviate: tutteLeClassi.filter(({ classe }) => classe.archiviata).length,
    }

    const candidate = r.classi
      // Le classi archiviate restano fuori se non le si chiede: chi cerca sta
      // quasi sempre parlando di chi c'è adesso, e un omonimo di tre anni fa
      // in mezzo ai risultati è un modo di aprire la scheda sbagliata.
      .filter((classe) => ingresso.archiviate === true || !classe.archiviata)
      .flatMap((classe) =>
        ordinaAllievi(classe.allievi)
          .filter((allievo) => ingresso.ritirati === true || allievo.attivo)
          .map((allievo) => ({ classe, allievo })),
      )
    // Lo stesso filtro di tutte le altre letture: `filtroTesto` normalizza la
    // paglia con la funzione che ha ridotto i pezzi — due normalizzazioni
    // diverse ai due capi del confronto funzionano finché nessuno ha l'accento
    // nel cognome. I pezzi qui sono già stati ripuliti dalle parole di
    // categoria, quindi si passano quelli e non `ingresso.cerca`.
    const { corrisponde } = filtroTesto(pezzi.join(' '))
    const tutte = candidate
      .filter(({ classe, allievo }) =>
        corrisponde([allievo.cognome, allievo.nome, classe.nome, allievo.azienda ?? ''].join(' ')),
      )
      // I campi vuoti si guardano dopo il testo, sulla stessa riga: `ha` e
      // `senza` restringono quel che la ricerca ha già trovato, e la ricerca
      // è la più cara delle due — farla per ultima vorrebbe dire
      // normalizzare il nome anche di chi il filtro sta per buttare via.
      .filter(({ allievo }) => passaPresenza(valoriDi(allievo), ingresso.ha, ingresso.senza))
      // La zona per ultima: è il filtro più stretto dei tre — un comune toglie
      // quasi tutti — e metterlo dopo gli altri due vuol dire confrontarlo
      // sulle sole righe rimaste.
      .filter(({ allievo }) => nellaZona(allievo.indirizzo, ingresso))

    const { pagina: persone, quante, da, troncato, ancora } = taglia(tutte, ingresso)

    // Nullo quando l'interruttore è già acceso o quando non c'è nessuno da
    // escludere: quel che è dentro non è «escluso», e un «0» scritto lo stesso
    // manderebbe il modello a riaccendere un interruttore acceso.
    const fuori = (quanti: number, acceso: boolean) => (acceso || quanti === 0 ? null : quanti)
    const escluseRitirate = fuori(esclusi.ritirati, ingresso.ritirati === true)
    const escluseArchiviate = fuori(esclusi.archiviate, ingresso.archiviate === true)

    return {
      // Quel che si è cercato davvero, non quel che è stato chiesto: se le due
      // cose differiscono lo dice `ignorato`, riga per riga.
      cerca: pezzi.join(' '),
      ignorato: tolti.join(' '),
      ha: ingresso.ha ?? [],
      senza: ingresso.senza ?? [],
      comune: ingresso.comune ?? '',
      cap: ingresso.cap ?? '',
      quante,
      da,
      troncato,
      ancora,
      inRegistro,
      esclusiRitirati: escluseRitirate,
      esclusiArchiviate: escluseArchiviate,
      suggerimento: suggerimento({
        quante: tutte.length,
        inRegistro,
        cerca: pezzi.join(' '),
        tolti,
        ha: ingresso.ha ?? [],
        senza: ingresso.senza ?? [],
        escluseRitirate,
        escluseArchiviate,
      }),
      persone: persone.map(({ classe, allievo }) => ({
        id: allievo.id,
        cognome: allievo.cognome,
        nome: allievo.nome,
        nomeCompleto: nomeCompleto(allievo),
        classeId: classe.id,
        classe: classe.nome,
        azienda: allievo.azienda ?? '',
        attivo: allievo.attivo,
      })),
    }
  },
})
