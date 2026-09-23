// Dove abitano e dove lavorano: l'anagrafica vista dalla mappa.
//
// Il registro le coordinate ce le ha — `mappa.geocodifica` le cerca in rete e
// le scrive in `coordinate` — e non le faceva uscire da nessuna parte: le
// vedeva soltanto la vista che disegna i segnaposti. Fuori di lì «chi abita
// entro cinque chilometri», «quanti vengono da Bellinzona», «di chi non
// sappiamo dove sta» erano tre domande senza un attrezzo, e l'unica strada
// era aprire venticinque schede e leggere venticinque righe d'indirizzo.
//
// **Una riga per indirizzo di una persona, non per persona.** Chi abita da una
// parte e lavora dall'altra sta sulla mappa in due punti, e sono due fatti
// diversi: «entro 5 km dalla sede» dice una cosa della casa e un'altra della
// ditta. `genere` sceglie di quale delle due si parla, e senza si parla di
// tutte e due — un predefinito che ne nascondesse metà darebbe un conto giusto
// a una domanda che nessuno ha fatto.
//
// **Chi non è collocato resta nell'elenco**, con `lat` e `lon` nulli. È il
// motivo principale per cui questa lettura esiste: «chi manca sulla mappa» è
// la lista di lavoro di chi la mappa la vuole completa, e togliere le righe
// senza punto la renderebbe invisibile proprio a chi la cerca. L'unica
// eccezione è `entroKm`: una distanza che non si può calcolare non si può
// nemmeno giudicare, quelle righe restano fuori, e la busta dice quante sono
// con `senzaCoordinate` — un filtro che butta via righe in silenzio è un
// filtro che mente.
//
// La geometria non si riscrive: la distanza è `distanzaKm` del dominio, la
// stessa che scrive i chilometri sui cartellini della mappa. Una seconda
// formula darebbe due numeri diversi per lo stesso tragitto, e chi legge non
// saprebbe quale dei due è quello stampato.

import { allieviAttivi, nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import type { Coordinate } from '../../../domain/map.js'
import {
  coordinataDi,
  distanzaKm,
  indirizzoDi,
  rubricaDi,
  scriviCoordinate,
  SEDE,
} from '../../../domain/map.js'
import { definisci } from '../../contract.js'
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
  nellaZona,
  pagina,
  ricerca,
  taglia,
  zona,
} from '../common/filters.js'
import { esigiClasse, esigiPersona } from '../common/register.js'

/** Di quale indirizzo si parla. «tutti» sono due righe per chi ne ha due. */
const GENERI = ['domicilio', 'lavoro', 'tutti'] as const

/** Come si ordina: la prima riga è quella che si guarda per prima. */
const ORDINI = ['distanza', 'nome', 'localita'] as const

/** Una riga prima che la busta la tagli: già calcolata, niente da rifare dopo. */
interface Riga {
  allievoId: string
  cognome: string
  nome: string
  nomeCompleto: string
  classeId: string
  classe: string
  attivo: boolean
  genere: 'domicilio' | 'lavoro'
  azienda: string
  indirizzo: string
  via: string
  cap: string
  localita: string
  lat: number | null
  lon: number | null
  collocato: boolean
  approssimato: boolean
  etichetta: string
  distanzaKm: number | null
}

export const procedura = definisci({
  nome: 'mappa.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'Dove abitano: indirizzi collocati, per zona e per distanza',
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: 'Solo gli indirizzi di questa classe' })),
    allievoId: opzionale(identificatore({ aiuto: 'Solo gli indirizzi di questa persona' })),
    genere: opzionale(scelta(GENERI, {
      aiuto: 'Quale indirizzo: «domicilio», «lavoro» o «tutti». Senza, tutti e due',
    })),
    ...zona(),
    entroKm: opzionale(numero({
      minimo: 0,
      aiuto: 'Solo chi sta entro tanti km in linea d’aria dal punto. Chi non ha coordinate esce',
    })),
    // Un punto e non due numeri sciolti: una latitudine senza la sua
    // longitudine non è mezzo punto, è un errore, e due campi separati
    // lascerebbero passare la chiamata che ne porta uno solo.
    attornoA: opzionale(oggetto({
      lat: numero({ minimo: -90, massimo: 90, aiuto: 'Latitudine in gradi' }),
      lon: numero({ minimo: -180, massimo: 180, aiuto: 'Longitudine in gradi' }),
    }, { aiuto: 'Il punto da cui si misura. Senza, la sede della scuola' })),
    ritirati: opzionale(booleano({ aiuto: 'Vero per avere anche chi non frequenta più' })),
    archiviate: opzionale(booleano({ aiuto: 'Vero per guardare anche nelle classi archiviate' })),
    ordina: opzionale(scelta(ORDINI, {
      aiuto: 'Per «distanza» (senza, è questo), per «nome» o per «localita»',
    })),
    ...ricerca('nome, classe, azienda o indirizzo', 'lugano'),
    ...pagina(),
  }),
  uscita: oggetto({
    genere: testo({ aiuto: 'Di quali indirizzi si è risposto' }),
    comune: testo({ aiuto: 'Il comune chiesto. Vuoto quando non se n’è chiesto' }),
    cap: testo({ aiuto: 'Il NAP chiesto, anche a metà. Vuoto quando non se n’è chiesto' }),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    entroKm: nullabile(numero({
      aiuto: 'Il raggio applicato, in km. Nullo quando non se n’è chiesto',
    })),
    // Da dove si è misurato, sempre e non solo quando lo si è chiesto: una
    // colonna di chilometri senza il punto di partenza è una colonna di
    // numeri, e chi legge la misura dalla propria sede.
    attorno: testo({ aiuto: 'Da dove si misura la distanza: la sede, o il punto chiesto' }),
    attornoLat: numero({ aiuto: 'La latitudine del punto da cui si misura' }),
    attornoLon: numero({ aiuto: 'La longitudine del punto da cui si misura' }),
    guardate: numero({ intero: true, aiuto: 'Quanti indirizzi scritti sono stati guardati' }),
    senzaIndirizzo: numero({
      intero: true,
      aiuto: 'Quante caselle d’indirizzo sono vuote: non sono qui dentro, e vanno compilate',
    }),
    collocati: numero({
      intero: true,
      aiuto: 'Quanti fra quelli che corrispondono hanno un punto',
    }),
    senzaCoordinate: numero({
      intero: true,
      aiuto: 'Quanti non l’hanno: con «entroKm» sono quelli lasciati fuori, non giudicabili',
    }),
    lontane: nullabile(numero({
      intero: true,
      aiuto: 'Quanti il raggio ha lasciato fuori perché lontani. Nullo senza «entroKm»',
    })),
    // Il contraltare delle due guardie. `esigiPersona` dice che l'id esiste, e
    // poi il filtro dei ritirati toglieva quella persona senza una parola: la
    // busta rispondeva «zero indirizzi, zero guardati», che si rilegge come
    // «non ha l'indirizzo scritto» di uno che ce l'ha. Nulli e non zero quando
    // non c'è nessuno da escludere, come `escluse` di `classe.persone`.
    escluse: nullabile(numero({
      intero: true,
      aiuto: 'Quante persone restano fuori perché non frequentano più: con «ritirati» rientrano',
    })),
    classiEscluse: nullabile(numero({
      intero: true,
      aiuto: 'Quante classi restano fuori perché archiviate: con «archiviate» rientrano',
    })),
    ...CAMPI_PAGINA,
    indirizzi: elenco(oggetto({
      allievoId: testo({ aiuto: 'Da passare a «persone.scheda» per il resto' }),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo(),
      classeId: testo(),
      classe: testo(),
      attivo: booleano({ aiuto: 'Falso per chi si è ritirato: resta nel registro' }),
      genere: testo({ aiuto: '«domicilio» o «lavoro»' }),
      azienda: testo({ aiuto: 'Il nome della ditta. Vuoto quando la riga è il domicilio' }),
      indirizzo: testo({ aiuto: 'In una riga, come si scrive su una busta' }),
      via: testo({ aiuto: 'La via con il civico, da sola: è la casella, non la frase' }),
      cap: testo({ aiuto: 'Il NAP: si ordina e si raggruppa, la riga composta no' }),
      localita: testo({ aiuto: 'Il comune: è quel che si conta in «chi viene da dove»' }),
      lat: nullabile(numero({
        aiuto: 'Nullo per chi non è collocato: «mappa.geocodifica» lo cerca',
      })),
      lon: nullabile(numero({ aiuto: 'Nullo per chi non è ancora collocato' })),
      collocato: booleano({
        aiuto: 'Vero quando il punto c’è: è il filtro di «chi manca sulla mappa»',
      }),
      approssimato: booleano({
        aiuto: 'Vero quando il punto è il centro del paese e non il portone',
      }),
      etichetta: testo({
        aiuto: 'Come ha capito l’indirizzo il geocodificatore: serve a non fidarsi',
      }),
      distanzaKm: nullabile(numero({
        aiuto: 'In linea d’aria dal punto. Nulla senza coordinate',
      })),
    })),
  }),
  presentazione: {
    titolo: 'Dove abitano',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'genere', etichetta: 'Indirizzi' },
          { campo: 'comune', etichetta: 'Comune' },
          { campo: 'cap', etichetta: 'NAP' },
          { campo: 'attorno', etichetta: 'Distanze da' },
          { campo: 'entroKm', etichetta: 'Entro km', formato: 'numero' },
          { campo: 'quante', etichetta: 'Indirizzi che corrispondono', formato: 'numero' },
          { campo: 'collocati', etichetta: 'Con un punto', formato: 'numero' },
          { campo: 'senzaCoordinate', etichetta: 'Senza punto', formato: 'numero' },
          { campo: 'senzaIndirizzo', etichetta: 'Senza indirizzo scritto', formato: 'numero' },
          { campo: 'escluse', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
          { campo: 'classiEscluse', etichetta: 'Classi archiviate, fuori', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'indirizzi',
        colonne: [
          { campo: 'nomeCompleto', testo: 'Persona' },
          { campo: 'classe', testo: 'Classe' },
          { campo: 'genere', testo: 'Che cos’è' },
          { campo: 'via', testo: 'Via' },
          { campo: 'cap', testo: 'NAP' },
          { campo: 'localita', testo: 'Località' },
          { campo: 'distanzaKm', testo: 'Km dal punto', formato: 'numero' },
          { campo: 'collocato', testo: 'Sulla mappa', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Le due guardie prima di tutto: un id sbagliato deve dire «non trovato» e
    // non tornare zero righe, che si legge come «non abita nessuno da nessuna
    // parte» e manda chi chiede a cercare il difetto altrove.
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)

    const rubrica = rubricaDi(r)
    const quali: Array<'domicilio' | 'lavoro'> =
      ingresso.genere === 'domicilio' || ingresso.genere === 'lavoro'
        ? [ingresso.genere]
        : ['domicilio', 'lavoro']
    // Il punto c'è sempre, anche senza `entroKm`: la distanza dalla sede è la
    // colonna per cui questa busta si guarda — chi fa la spola e chi no — e
    // darla solo a chi filtra vorrebbe dire filtrare per poterla leggere.
    const punto: Coordinate = ingresso.attornoA ?? SEDE

    const chieste = r.classi
      .filter((classe) => !ingresso.classeId || classe.id === ingresso.classeId)
    // Le archiviate restano fuori se non le si chiede: sono anni finiti, e
    // un indirizzo di tre anni fa non è un posto dove qualcuno abita oggi.
    const classi = chieste.filter((classe) => ingresso.archiviate === true || !classe.archiviata)

    const righe: Riga[] = []
    let senzaIndirizzo = 0
    let ritirate = 0

    for (const classe of classi) {
      const persone = ordinaAllievi(
        ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)

      // Contate sull'insieme chiesto e non sulla classe intera: chiedendo una
      // persona sola, «una ritirata» è quella persona lì, e il conto della
      // classe direbbe un numero che non parla della domanda fatta.
      if (ingresso.ritirati !== true) {
        ritirate += classe.allievi.filter((allievo) =>
          !allievo.attivo && (!ingresso.allievoId || allievo.id === ingresso.allievoId),
        ).length
      }

      for (const allievo of persone) {
        for (const genere of quali) {
          const caselle = genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore
          // La riga composta viene da `indirizzoDi`, che è la stessa con cui la
          // mappa ha chiesto le coordinate: ricomporla qui a modo nostro
          // vorrebbe dire una chiave che nella rubrica non c'è, e una busta che
          // dice «non collocato» di un indirizzo che il suo punto ce l'ha.
          const indirizzo = indirizzoDi(allievo, genere)
          if (!indirizzo) {
            // Niente scritto non è «manca sulla mappa»: è una casella da
            // riempire, e sta nel conto in cima e non fra le righe, dove
            // sarebbe una riga vuota per ogni persona senza azienda.
            senzaIndirizzo += 1
            continue
          }

          const dove = coordinataDi(rubrica, indirizzo)
          righe.push({
            allievoId: allievo.id,
            cognome: allievo.cognome,
            nome: allievo.nome,
            nomeCompleto: nomeCompleto(allievo),
            classeId: classe.id,
            classe: classe.nome,
            attivo: allievo.attivo,
            genere,
            azienda: genere === 'lavoro' ? allievo.azienda ?? '' : '',
            indirizzo,
            via: caselle?.via ?? '',
            cap: caselle?.cap ?? '',
            localita: caselle?.localita ?? '',
            lat: dove?.lat ?? null,
            lon: dove?.lon ?? null,
            collocato: Boolean(dove),
            approssimato: dove?.approssimato === true,
            etichetta: dove?.etichetta ?? '',
            distanzaKm: dove ? distanzaKm(dove, punto) : null,
          })
        }
      }
    }

    const { corrisponde } = filtroTesto(ingresso.cerca)
    const trovate = righe
      .filter((riga) => nellaZona(riga, ingresso))
      .filter((riga) => corrisponde(
        [riga.nomeCompleto, riga.classe, riga.azienda, riga.indirizzo].join(' '),
      ))

    // Contate prima del raggio, e apposta: sono le righe che il raggio non ha
    // potuto giudicare, e dopo il filtro non ci sarebbe più niente da contare.
    const senzaCoordinate = trovate.filter((riga) => !riga.collocato).length

    const scelte = trovate
      .filter((riga) => ingresso.entroKm === undefined ||
        (riga.distanzaKm !== null && riga.distanzaKm <= ingresso.entroKm))
      .sort((a, b) => {
        if (ingresso.ordina === 'nome') return a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        if (ingresso.ordina === 'localita') {
          return a.localita.localeCompare(b.localita, 'it') ||
            a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        }
        // Per distanza, dal più vicino, e chi non ha il punto va in fondo: non
        // è a distanza zero né a distanza infinita, è una riga di cui non si sa
        // — e in cima farebbe passare per vicinissimo chi non è sulla mappa.
        return (a.distanzaKm ?? Infinity) - (b.distanzaKm ?? Infinity) ||
          a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
      })

    // Scartati dal raggio perché **lontani**, che è un'altra cosa dal non
    // essere collocati: senza questo numero la busta si contraddiceva — i
    // collocati erano contati prima del raggio e «quante» dopo, e la
    // differenza non aveva nome. Chi legge «dodici collocati, tre righe» non
    // deve dover sottrarre per capire dove sono finiti gli altri nove.
    const raggio = ingresso.entroKm
    const lontane = raggio === undefined
      ? null
      : trovate.filter((riga) => riga.distanzaKm !== null && riga.distanzaKm > raggio).length

    const { pagina: indirizzi, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      genere: ingresso.genere ?? 'tutti',
      comune: ingresso.comune ?? '',
      cap: ingresso.cap ?? '',
      cerca: ingresso.cerca ?? '',
      entroKm: ingresso.entroKm ?? null,
      // `scriviCoordinate` e non una riga composta qui: è la stessa che scrive
      // le coordinate su una scheda, e due modi di scrivere lo stesso punto si
      // rileggono come due punti.
      attorno: ingresso.attornoA ? scriviCoordinate(punto) : SEDE.nome,
      attornoLat: punto.lat,
      attornoLon: punto.lon,
      guardate: righe.length,
      senzaIndirizzo,
      collocati: trovate.length - senzaCoordinate,
      senzaCoordinate,
      lontane,
      escluse: ingresso.ritirati === true ? null : ritirate || null,
      classiEscluse: ingresso.archiviate === true ? null : chieste.length - classi.length || null,
      quante,
      da,
      troncato,
      ancora,
      indirizzi,
    }
  },
})
