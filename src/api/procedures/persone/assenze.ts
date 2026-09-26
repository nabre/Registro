// Chi ha assenze, e quante: una riga per persona (non per corso), per le
// domande senza id. `stati` è un elenco (`['assente', 'ritardo']`), `soglia` è
// in cifra tonda 0–100 come `impostazioni.sogliaAssenza`, e il confronto lo fa
// `oltreSoglia()` di `domain/alerts.ts`, come nei rapporti.
//
// Gli id in conflitto sono `ingresso-non-valido` che nomina il conflitto; la
// busta dice quel che è rimasto fuori (`esclusi…`, `corsiGuardati`) e gli
// estremi davvero usati. Il conto si raggruppa per semestre (`periodiDa`, come
// `corso.presenze` e `persone.medie`); il totale della riga resta quello su cui
// lavorano ordine, soglia e pagina. Che cosa si somma fra i periodi è detto
// dove si conta.

import {
  allieviAttivi,
  ordinaAllievi,
  contaUd,
  statiAllineati,
} from '../../../domain/calculations.js'
import {
  annoDellaClasse,
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import { quotaAssenza } from '../../../domain/courseMatrix.js'
import type { Allievo, Classe, StatoPresenza } from '../../../domain/models.js'
import { udPrevisteDaOrario } from '../../../domain/timetable.js'
// Alias: dentro `esegui` c'è già una `const oltreSoglia` (il conto della busta).
import { oltreSoglia as superaLaSoglia } from '../../../domain/alerts.js'
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
import { stati, statiScelti, STATI_APPELLO } from '../common/rollCall.js'
import {
  CAMPI_CERCA,
  CAMPI_ESCLUSI,
  CAMPI_PAGINA,
  CAMPI_RIGA_PERSONA,
  classiGuardate,
  contaNominate,
  filtroTesto,
  fuori,
  nelPeriodo,
  pagina,
  periodo,
  type Periodo,
  periodiDa,
  periodoScelto,
  ricerca,
  rigaPersona,
  SCHEDA_PERIODO,
  taglia,
} from '../common/filters.js'
import {
  esigiClasse, esigiCorso, esigiCorsoDiClasse, esigiPersona,
} from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi as t } from './assenze.testi.js'

const p = () => t().presentazione

/** Come si ordina l'elenco: la prima riga è quella che si guarda. */
const ORDINI = ['quota', 'ud', 'nome'] as const

/**
 * Quel che si conta di una persona in un periodo. Il totale della riga è la
 * somma di questi, non un accumulatore a parte.
 */
interface ContoPeriodo {
  periodo: Periodo
  /** UD nello stato chiesto: il numeratore. */
  udSegnalate: number
  /** UD su cui l'appello è stato fatto: il denominatore onesto. */
  udConAppello: number
  /** UD che il corso prevedeva **in questo periodo**: il denominatore dei rapporti. */
  udPreviste: number
  /** Ore toccate: non UD, ore — «tre mattine» non è «sei unità». */
  ore: number
  /** I corsi in cui ha almeno una casella negli stati chiesti, qui dentro. */
  corsi: Set<string>
}

/** Quel che si conta di una persona, prima di scriverlo nella busta. */
interface Conto {
  allievo: Allievo
  classe: Classe
  /** Un conto per periodo, nell'ordine in cui i periodi si succedono. */
  periodi: Map<string, ContoPeriodo>
}

export const procedura = definisci({
  nome: 'persone.assenze',
  versione: 1,
  genere: 'lettura',
  // Il titolo è l'unica riga che il modello legge prima di scegliere: contiene le
  // parole con cui arriva la domanda e dice che cosa fa senza parametri.
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    allievoId: opzionale(identificatore({ aiuto: () => t().allievoId })),
    ...stati(() => t().ilConto),
    soglia: opzionale(numero({ minimo: 0, massimo: 100, aiuto: () => t().soglia })),
    // Acceso di suo: chi chiede «chi ha assenze» non vuole le righe a zero.
    conAssenze: opzionale(booleano({ aiuto: () => t().conAssenze })),
    soloOltreSoglia: opzionale(booleano({ aiuto: () => t().soloOltreSoglia })),
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
    archiviate: opzionale(booleano({ aiuto: () => t().archiviate })),
    ordina: opzionale(scelta(ORDINI, {
      // L'aiuto scioglie la sigla «ud», che il catalogo non spiega altrove.
      aiuto: () => t().ordina,
    })),
    ...periodo(() => t().oreContate),
    // Senza, ogni periodo toccato porta le sue cifre; restringere a uno è la
    // domanda stretta.
    ...periodoScelto(() => t().ilConto),
    ...ricerca(() => t().dove, 'dic4a'),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    // I periodi detti una volta sola, in cima: le righe portano solo il
    // `semestreId`, nello stesso ordine, per non ripetere date su ogni persona.
    periodi: elenco(oggetto(SCHEDA_PERIODO), { aiuto: () => t().periodi }),
    stati: elenco(scelta(STATI_APPELLO), { aiuto: () => t().stati }),
    sogliaUsata: numero({ aiuto: () => t().sogliaUsata }),
    sogliaDelRegistro: numero({ aiuto: () => t().sogliaDelRegistro }),
    ...CAMPI_CERCA,
    ...CAMPI_PAGINA,
    // I due conti d'insieme, sul periodo e non sulla pagina.
    conSegnalazioni: numero({ intero: true, aiuto: () => t().conSegnalazioni }),
    oltreSoglia: numero({ intero: true, aiuto: () => t().oltreSoglia }),
    guardate: numero({ intero: true, aiuto: () => t().guardate }),
    // I conti di quel che è rimasto fuori: distinguono «niente da trovare» da
    // «i filtri non hanno lasciato guardare niente».
    corsiGuardati: numero({ intero: true, aiuto: () => t().corsiGuardati }),
    escluseSenzaAssenze: nullabile(numero({ intero: true, aiuto: () => t().escluseSenzaAssenze })),
    ...CAMPI_ESCLUSI,
    persone: elenco(oggetto({
      allievoId: testo({ aiuto: () => t().allievoIdRiga }),
      ...CAMPI_RIGA_PERSONA,
      attivo: booleano({ aiuto: () => t().attivo }),
      ud: numero({ intero: true, aiuto: () => t().ud }),
      ore: numero({ intero: true, aiuto: () => t().ore }),
      udConAppello: numero({ intero: true, aiuto: () => t().udConAppello }),
      udPreviste: numero({ intero: true, aiuto: () => t().udPreviste }),
      quota: nullabile(numero({ aiuto: () => t().quota })),
      quotaSuAppello: nullabile(numero({ aiuto: () => t().quotaSuAppello })),
      oltreSoglia: booleano(),
      corsi: numero({ intero: true, aiuto: () => t().corsi }),
      // Le stesse cifre per periodo, nell'ordine di `periodi` in cima. Gli aiuti
      // dicono solo quel che cambia rispetto alla riga.
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: () => t().periodoSemestreId }),
        ud: numero({ intero: true }),
        ore: numero({ intero: true }),
        udConAppello: numero({ intero: true }),
        udPreviste: numero({ intero: true, aiuto: () => t().periodoUdPreviste }),
        quota: nullabile(numero({ aiuto: () => t().periodoQuota })),
        quotaSuAppello: nullabile(numero()),
        oltreSoglia: booleano({ aiuto: () => t().periodoOltreSoglia }),
        corsi: numero({ intero: true, aiuto: () => t().periodoCorsi }),
      }), { aiuto: () => t().periodiRiga }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
          { campo: 'stati', etichetta: () => p().caselleContate, formato: 'elenco' },
          // In cifra tonda: `formato: 'quota'` la moltiplicherebbe per cento.
          { campo: 'sogliaUsata', etichetta: () => p().soglia, formato: 'numero' },
          { campo: 'guardate', etichetta: () => p().personeGuardate, formato: 'numero' },
          // Accanto alle persone guardate, i corsi: due zeri dicono che non si è guardato.
          { campo: 'corsiGuardati', etichetta: () => p().corsiGuardati, formato: 'numero' },
          { campo: 'conSegnalazioni', etichetta: () => p().conAlmenoUna, formato: 'numero' },
          { campo: 'oltreSoglia', etichetta: () => p().oltreSoglia, formato: 'numero' },
          // Nulli quando non c'è niente da dire, e il pannello non ne scrive la riga.
          { campo: 'escluseSenzaAssenze', etichetta: () => p().senzaAssenze, formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: () => p().ritirate, formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: () => p().archiviate, formato: 'numero' },
        ],
      },
      // I periodi guardati con i loro estremi: la legenda di «sem-1».
      //
      // I conti per periodo di ciascuna persona sono un array dentro un array, che la
      // presentazione non regge: la tabella resta sui totali, più la colonna
      // annidata qui sotto.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: () => p().periodiContati,
        colonne: [
          { campo: 'etichetta', testo: () => parole().periodo },
          { campo: 'dal', testo: () => parole().dal, formato: 'data' },
          { campo: 'al', testo: () => parole().al, formato: 'data' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'nomeCompleto', testo: () => p().persona },
          { campo: 'classe', testo: () => p().classe },
          { campo: 'ud', testo: () => p().ud, formato: 'numero' },
          { campo: 'ore', testo: () => p().ore, formato: 'numero' },
          { campo: 'quota', testo: () => p().quota, formato: 'quota' },
          // Le quote di semestre nella stessa cella («4,2% · 24,0%»): distinguono chi è
          // sempre stato così da chi ha smesso di venire.
          { campo: 'periodi', dentro: 'quota', testo: () => p().perSemestre, formato: 'quota' },
          { campo: 'oltreSoglia', testo: () => p().oltreSoglia, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const chiesta = ingresso.classeId ? esigiClasse(ambito, ingresso.classeId) : null
    // Un id inventato è un errore, non un elenco vuoto («quella persona non ha
    // assenze»). Stessa guardia di `persone.medie`.
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)
    const corso = ingresso.corsoId ? esigiCorso(ambito, ingresso.corsoId) : null
    esigiCorsoDiClasse(r, corso, chiesta)

    const quali = statiScelti(ingresso.stati)
    const conta = (stato: StatoPresenza): boolean => quali.includes(stato)
    const soglia = ingresso.soglia ?? r.impostazioni.sogliaAssenza
    const { corrisponde, ignorato: cercaIgnorato } = filtroTesto(ingresso.cerca)

    // Le archiviate restano fuori se non le si chiede.
    const { classi, archiviateFuori } = classiGuardate(r, ingresso, corso)
    const somma = contaNominate(ingresso.allievoId)

    // Corsi e periodi davvero guardati: la busta li rimanda.
    const corsiGuardati = new Set<string>()
    const estremi: Array<{ dal: string, al: string }> = []
    // I periodi visti, in ordine e senza doppioni: le classi possono stare in anni
    // diversi, e `periodi` in cima è l'unione.
    const periodiVisti = new Map<string, Periodo>()

    const conti = new Map<string, Conto>()
    for (const classe of classi) {
      const persone = ordinaAllievi(
        ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)

      const anno = annoDellaClasse(r, classe)
      // Il periodo di questa classe, spezzato sui suoi semestri da `filters.ts`, così
      // la busta rimanda per costruzione quel che il filtro ha usato.
      const { dal: inizio, al: fine, periodi: suoi } = periodiDa(r, ingresso, classe)
      estremi.push({ dal: inizio, al: fine })
      for (const pezzo of suoi) {
        if (!periodiVisti.has(chiaveDi(pezzo))) periodiVisti.set(chiaveDi(pezzo), pezzo)
      }

      for (const allievo of persone) {
        conti.set(allievo.id, {
          allievo,
          classe,
          periodi: new Map(suoi.map((pezzo) => [chiaveDi(pezzo), contoVuoto(pezzo)])),
        })
      }

      for (const suo of corsiDellaClasse(r, classe.id)) {
        if (corso && suo.id !== corso.id) continue
        corsiGuardati.add(suo.id)
        const delCorso = registroDelCorso(r, suo.id)
          // Le annullate non contano: un'ora non tenuta non è persa. Come in `persone.argomenti`.
          .filter((lezione) => lezione.stato !== 'annullata')

        // Un giro per periodo: i periodi partizionano l'intervallo, e le somme tornano.
        for (const pezzo of suoi) {
          const chiave = chiaveDi(pezzo)
          const lezioni = delCorso.filter(
            (lezione) => nelPeriodo(lezione.data, pezzo.dal, pezzo.al),
          )

          // Le UD previste vengono dall'orario, come nei rapporti, con gli estremi di
          // questo periodo: la quota deve coincidere con quella stampata.
          const { minutiUd } = r.impostazioni
          const previste = anno
            ? udPrevisteDaOrario(anno, suo, pezzo.dal, pezzo.al, minutiUd, r.lezioni)
            : 0
          const aCalendario = lezioni.reduce((somma, l) => somma + contaUd(l, minutiUd), 0)
          const monteOre = previste > 0 ? previste : aCalendario

          for (const conto of conti.values()) {
            if (conto.classe.id !== classe.id) continue
            const dentro = conto.periodi.get(chiave)
            if (dentro) dentro.udPreviste += monteOre
          }

          for (const lezione of lezioni) {
            const quante = contaUd(lezione, minutiUd)
            for (const conto of conti.values()) {
              if (conto.classe.id !== classe.id) continue
              const dentro = conto.periodi.get(chiave)
              if (!dentro) continue
              const presenza = lezione.presenze.find((p) => p.allievoId === conto.allievo.id)
              const stati = statiAllineati(presenza, quante)
              const segnalate = stati.filter(conta).length
              dentro.udConAppello += stati.filter((stato) => stato !== 'non-impostato').length
              if (segnalate === 0) continue
              dentro.udSegnalate += segnalate
              dentro.ore += 1
              dentro.corsi.add(suo.id)
            }
          }
        }
      }
    }

    const righe = [...conti.values()]
      .map((conto) => {
        const pezzi = [...conto.periodi.values()]
        const udSegnalate = sommaDi(pezzi, (pezzo) => pezzo.udSegnalate)
        const udPreviste = sommaDi(pezzi, (pezzo) => pezzo.udPreviste)
        const udConAppello = sommaDi(pezzi, (pezzo) => pezzo.udConAppello)
        const quota = aQuattroCifre(quotaAssenza(udSegnalate, udPreviste, false))
        return {
          allievoId: conto.allievo.id,
          ...rigaPersona(conto.classe, conto.allievo),
          attivo: conto.allievo.attivo,
          ud: udSegnalate,
          ore: sommaDi(pezzi, (pezzo) => pezzo.ore),
          udConAppello,
          udPreviste,
          quota,
          quotaSuAppello: aQuattroCifre(quotaAssenza(udSegnalate, udConAppello, false)),
          // Il confronto lo fa il dominio (soglia 0–100, quota 0–1). Con soglia a zero
          // nessuno è «oltre»: zero spegne l'avviso.
          oltreSoglia: superaLaSoglia(soglia, quota),
          // L'unione dei corsi dei periodi, non la somma.
          corsi: new Set(pezzi.flatMap((pezzo) => [...pezzo.corsi])).size,
          periodi: pezzi.map((pezzo) => {
            const sua = aQuattroCifre(quotaAssenza(pezzo.udSegnalate, pezzo.udPreviste, false))
            return {
              semestreId: pezzo.periodo.semestreId,
              ud: pezzo.udSegnalate,
              ore: pezzo.ore,
              udConAppello: pezzo.udConAppello,
              udPreviste: pezzo.udPreviste,
              quota: sua,
              quotaSuAppello: aQuattroCifre(
                quotaAssenza(pezzo.udSegnalate, pezzo.udConAppello, false),
              ),
              // Sulla quota di questo periodo, con la stessa soglia.
              oltreSoglia: superaLaSoglia(soglia, sua),
              corsi: pezzo.corsi.size,
            }
          }),
        }
      })
      .filter((riga) => corrisponde([riga.nomeCompleto, riga.classe, conti.get(riga.allievoId)?.allievo.azienda ?? ''].join(' ')))

    const conSegnalazioni = righe.filter((riga) => riga.ud > 0).length
    const oltreSoglia = righe.filter((riga) => riga.oltreSoglia).length

    // Gli estremi effettivi: minimo degli inizi e massimo delle fini fra le classi
    // guardate (le date ISO si ordinano come stringhe). Senza classi guardate,
    // il periodo dell'anno in uso.
    //
    // Il ripiego si calcola solo se serve: `periodiDa` solleva su un `semestreId`
    // che l'anno in uso non ha, anche quando le classi guardate l'hanno trovato.
    const globale = periodiVisti.size === 0 ? periodiDa(r, ingresso) : null
    const inizi = estremi.map((suo) => suo.dal).sort()
    const fini = estremi.map((suo) => suo.al).sort()
    const dal = inizi[0] ?? globale?.dal ?? ''
    const al = fini[fini.length - 1] ?? globale?.al ?? ''
    const periodi = globale
      ? globale.periodi
      : [...periodiVisti.values()].sort((uno, altro) => uno.dal.localeCompare(altro.dal))

    const scelte = righe
      .filter((riga) => ingresso.conAssenze === false || riga.ud > 0)
      .filter((riga) => ingresso.soloOltreSoglia !== true || riga.oltreSoglia)
      .sort((a, b) => {
        if (ingresso.ordina === 'nome') return a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        if (ingresso.ordina === 'ud') return b.ud - a.ud || a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        // Per quota, dal peggio: chi guarda cerca chi sta peggio.
        return (b.quota ?? -1) - (a.quota ?? -1) || b.ud - a.ud ||
          a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
      })

    const { pagina: persone, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      dal,
      al,
      periodi,
      stati: quali,
      sogliaUsata: soglia,
      sogliaDelRegistro: r.impostazioni.sogliaAssenza,
      cerca: ingresso.cerca ?? '',
      cercaIgnorato,
      quante,
      da,
      troncato,
      ancora,
      conSegnalazioni,
      oltreSoglia,
      guardate: righe.length,
      corsiGuardati: corsiGuardati.size,
      escluseSenzaAssenze: fuori(
        righe.filter((riga) => riga.ud === 0).length,
        ingresso.conAssenze === false,
      ),
      esclusiRitirati: fuori(
        somma(classi, (allievo) => !allievo.attivo),
        ingresso.ritirati === true,
      ),
      // Le persone delle classi archiviate tenute fuori, contate con lo stesso filtro
      // dei ritirati: il numero è quanti rientrerebbero accendendo solo quello.
      esclusiArchiviate: fuori(
        somma(archiviateFuori, (allievo) => ingresso.ritirati === true || allievo.attivo),
        ingresso.archiviate === true,
      ),
      persone: persone.map((riga) => ({
        ...riga,
        classe: classeDettaDa(riga.classe, corso ? materiaDelCorso(r, corso)?.nome : null),
      })),
    }
  },
})

/**
 * La chiave di un periodo mentre si conta: l'id del semestre, o gli estremi se
 * non c'è, perché due anni senza semestri non finiscano sommati.
 */
function chiaveDi (periodo: Periodo): string {
  return periodo.semestreId || `${periodo.dal}→${periodo.al}`
}

/** Un conto di periodo appena aperto: tutto a zero, il periodo dentro. */
function contoVuoto (periodo: Periodo): ContoPeriodo {
  return { periodo, udSegnalate: 0, udConAppello: 0, udPreviste: 0, ore: 0, corsi: new Set() }
}

/** La somma di una cifra su tutti i periodi: il totale della riga si ricava da qui. */
function sommaDi (pezzi: readonly ContoPeriodo[], quale: (pezzo: ContoPeriodo) => number): number {
  return pezzi.reduce((somma, pezzo) => somma + quale(pezzo), 0)
}


/**
 * La quota tagliata alla quarta cifra: la busta la legge il modello, che riceve
 * JSON limitato, e quattro cifre bastano per una percentuale con un decimale.
 * Non in `quotaAssenza`, che serve anche ai rapporti stampati.
 */
function aQuattroCifre (quota: number | null): number | null {
  return quota === null ? null : Math.round(quota * 10_000) / 10_000
}

/**
 * La classe come si legge nella riga; con un corso chiesto, la materia accanto,
 * perché le assenze sono solo quelle del corso.
 */
function classeDettaDa (classe: string, materia: string | null | undefined): string {
  return materia ? `${classe} — ${materia}` : classe
}

