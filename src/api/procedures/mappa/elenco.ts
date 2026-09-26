// Dove abitano e dove lavorano: l'anagrafica vista dalla mappa («chi abita
// entro cinque chilometri», «quanti vengono da Bellinzona», «chi non è sulla
// mappa»). Le coordinate le scrive `mappa.geocodifica`.
//
// Una riga per indirizzo, non per persona: casa e ditta sono due punti.
// `genere` sceglie quale; senza, tutti e due.
//
// Chi non è collocato resta nell'elenco con `lat` e `lon` nulli: è la lista di
// lavoro per completare la mappa. Solo `entroKm` lo toglie, e la busta dice
// quanti con `senzaCoordinate`.
//
// La distanza è `distanzaKm` del dominio, la stessa dei cartellini della mappa.

import { allieviAttivi, ordinaAllievi } from '../../../domain/calculations.js'
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
  CAMPI_RIGA_PERSONA,
  classiGuardate,
  contaNominate,
  filtroTesto,
  nellaZona,
  pagina,
  ricerca,
  rigaPersona,
  taglia,
  zona,
} from '../common/filters.js'
import { esigiClasse, esigiPersona } from '../common/register.js'
import { testi } from './mappa.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

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
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    allievoId: opzionale(identificatore({ aiuto: () => t().allievoId })),
    genere: opzionale(scelta(GENERI, {
      aiuto: () => t().genere,
    })),
    ...zona(),
    entroKm: opzionale(numero({
      minimo: 0,
      aiuto: () => t().entroKm,
    })),
    // Un punto e non due numeri sciolti: una latitudine senza longitudine non deve
    // passare.
    attornoA: opzionale(oggetto({
      lat: numero({ minimo: -90, massimo: 90, aiuto: () => t().lat }),
      lon: numero({ minimo: -180, massimo: 180, aiuto: () => t().lon }),
    }, { aiuto: () => t().attornoA })),
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
    archiviate: opzionale(booleano({ aiuto: () => t().archiviate })),
    ordina: opzionale(scelta(ORDINI, {
      aiuto: () => t().ordina,
    })),
    ...ricerca(() => t().dove, 'lugano'),
    ...pagina(),
  }),
  uscita: oggetto({
    genere: testo({ aiuto: () => t().genereRisposto }),
    comune: testo({ aiuto: () => t().comune }),
    cap: testo({ aiuto: () => t().cap }),
    cerca: testo({ aiuto: () => t().cerca }),
    entroKm: nullabile(numero({
      aiuto: () => t().raggio,
    })),
    // Il punto di partenza sempre, anche se non chiesto: senza, i chilometri non
    // dicono da dove.
    attorno: testo({ aiuto: () => t().attorno }),
    attornoLat: numero({ aiuto: () => t().attornoLat }),
    attornoLon: numero({ aiuto: () => t().attornoLon }),
    guardate: numero({ intero: true, aiuto: () => t().guardate }),
    senzaIndirizzo: numero({
      intero: true,
      aiuto: () => t().senzaIndirizzo,
    }),
    collocati: numero({
      intero: true,
      aiuto: () => t().collocati,
    }),
    senzaCoordinate: numero({
      intero: true,
      aiuto: () => t().senzaCoordinate,
    }),
    lontane: nullabile(numero({
      intero: true,
      aiuto: () => t().lontane,
    })),
    // Quanti ritirati sono stati esclusi, anche quando la persona chiesta esiste:
    // «zero indirizzi» non vuol dire «non ha l'indirizzo». Nulli e non zero quando
    // non c'è nessuno da escludere, come `escluse` di `classe.persone`.
    escluse: nullabile(numero({
      intero: true,
      aiuto: () => t().escluse,
    })),
    classiEscluse: nullabile(numero({
      intero: true,
      aiuto: () => t().classiEscluse,
    })),
    ...CAMPI_PAGINA,
    indirizzi: elenco(oggetto({
      allievoId: testo({ aiuto: () => t().rigaAllievoId }),
      ...CAMPI_RIGA_PERSONA,
      attivo: booleano({ aiuto: () => t().attivo }),
      genere: testo({ aiuto: () => t().rigaGenere }),
      azienda: testo({ aiuto: () => t().azienda }),
      indirizzo: testo({ aiuto: () => t().indirizzo }),
      via: testo({ aiuto: () => t().via }),
      cap: testo({ aiuto: () => t().rigaCap }),
      localita: testo({ aiuto: () => t().localita }),
      lat: nullabile(numero({
        aiuto: () => t().rigaLat,
      })),
      lon: nullabile(numero({ aiuto: () => t().rigaLon })),
      collocato: booleano({
        aiuto: () => t().collocato,
      }),
      approssimato: booleano({
        aiuto: () => t().approssimato,
      }),
      etichetta: testo({
        aiuto: () => t().etichetta,
      }),
      distanzaKm: nullabile(numero({
        aiuto: () => t().distanzaKm,
      })),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'genere', etichetta: () => p().indirizzi },
          { campo: 'comune', etichetta: () => p().comune },
          { campo: 'cap', etichetta: () => p().nap },
          { campo: 'attorno', etichetta: () => p().distanzeDa },
          { campo: 'entroKm', etichetta: () => p().entroKm, formato: 'numero' },
          { campo: 'quante', etichetta: () => p().corrispondono, formato: 'numero' },
          { campo: 'collocati', etichetta: () => p().conPunto, formato: 'numero' },
          { campo: 'senzaCoordinate', etichetta: () => p().senzaPunto, formato: 'numero' },
          { campo: 'senzaIndirizzo', etichetta: () => p().senzaIndirizzo, formato: 'numero' },
          { campo: 'escluse', etichetta: () => p().escluse, formato: 'numero' },
          { campo: 'classiEscluse', etichetta: () => p().classiEscluse, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'indirizzi',
        colonne: [
          { campo: 'nomeCompleto', testo: () => p().persona },
          { campo: 'classe', testo: () => p().classe },
          { campo: 'genere', testo: () => p().cheCose },
          { campo: 'via', testo: () => p().via },
          { campo: 'cap', testo: () => p().nap },
          { campo: 'localita', testo: () => p().localita },
          { campo: 'distanzaKm', testo: () => p().km, formato: 'numero' },
          { campo: 'collocato', testo: () => p().sullaMappa, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Prima le guardie: un id sbagliato dice «non trovato», non zero righe.
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)

    const rubrica = rubricaDi(r)
    const quali: Array<'domicilio' | 'lavoro'> =
      ingresso.genere === 'domicilio' || ingresso.genere === 'lavoro'
        ? [ingresso.genere]
        : ['domicilio', 'lavoro']
    // Il punto c'è sempre, anche senza `entroKm`: la distanza dalla sede è la
    // colonna che si guarda.
    const punto: Coordinate = ingresso.attornoA ?? SEDE

    // Le archiviate restano fuori se non le si chiede.
    const { classi, archiviateFuori } = classiGuardate(r, ingresso, null)
    const conta = contaNominate(ingresso.allievoId)

    const righe: Riga[] = []
    let senzaIndirizzo = 0
    let ritirate = 0

    for (const classe of classi) {
      const persone = ordinaAllievi(
        ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)

      // Contate sull'insieme chiesto, non sulla classe intera.
      if (ingresso.ritirati !== true) {
        ritirate += conta([classe], (allievo) => !allievo.attivo)
      }

      for (const allievo of persone) {
        for (const genere of quali) {
          const caselle = genere === 'domicilio' ? allievo.indirizzo : allievo.indirizzoDatore
          // La riga composta viene da `indirizzoDi`, la stessa con cui la mappa ha
          // chiesto le coordinate: è la chiave della rubrica.
          const indirizzo = indirizzoDi(allievo, genere)
          if (!indirizzo) {
            // Nessun indirizzo scritto va nel conto in cima, non fra le righe.
            senzaIndirizzo += 1
            continue
          }

          const dove = coordinataDi(rubrica, indirizzo)
          righe.push({
            allievoId: allievo.id,
            ...rigaPersona(classe, allievo),
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

    // Contate prima del raggio: sono le righe che il raggio non può giudicare.
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
        // Per distanza dal più vicino; chi non ha il punto va in fondo, non in cima.
        return (a.distanzaKm ?? Infinity) - (b.distanzaKm ?? Infinity) ||
          a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
      })

    // Quanti il raggio ha scartato perché lontani, distinti dai non collocati: la
    // busta spiega dove sono finite le righe mancanti.
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
      // `scriviCoordinate`, come sulla scheda: un punto scritto in due modi
      // sembrerebbe due punti.
      attorno: ingresso.attornoA ? scriviCoordinate(punto) : SEDE.nome,
      attornoLat: punto.lat,
      attornoLon: punto.lon,
      guardate: righe.length,
      senzaIndirizzo,
      collocati: trovate.length - senzaCoordinate,
      senzaCoordinate,
      lontane,
      escluse: ingresso.ritirati === true ? null : ritirate || null,
      classiEscluse: ingresso.archiviate === true ? null : archiviateFuori.length || null,
      quante,
      da,
      troncato,
      ancora,
      indirizzi,
    }
  },
})
