// Chi sta sotto: le medie per persona e la soglia che le giudica, per le
// domande senza id. Gemella di `persone.assenze`.
//
// La media è `mediaAllievo()`, la stessa di pagella e rapporti, pesata sulle
// prove di tutti i corsi guardati in un mucchio solo (non la media delle
// medie). Serve a decidere chi guardare; per un corso solo si chiede il corso.
// La sufficienza è `impostazioni.scala.sufficienza` e viaggia nella busta.
//
// Raggruppata per semestre (`periodiDa`), con i conti di quel che è rimasto
// fuori e gli id in conflitto come `ingresso-non-valido`, come in
// `persone.assenze`. Che cosa si somma fra i periodi è detto dove si conta.

import {
  allieviAttivi,
  mediaAllievo,
  ordinaAllievi,
} from '../../../domain/calculations.js'
import { corsiDellaClasse, materiaDelCorso } from '../../../domain/courses.js'
import type { Allievo, Classe, MomentoValutazione } from '../../../domain/models.js'
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
  CAMPI_CERCA,
  CAMPI_ESCLUSI,
  CAMPI_PAGINA,
  CAMPI_RIGA_PERSONA,
  classiGuardate,
  contaNominate,
  estremo,
  filtroTesto,
  fraSoglie,
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
import { testi as t } from './medie.testi.js'

/** Come si ordina l'elenco: la prima riga è quella che si guarda. */
const ORDINI = ['media', 'nome', 'prove'] as const

/** Quel che si conta di una persona **dentro un periodo**, prima della busta. */
interface ContoPeriodo {
  semestreId: string
  /** Le prove di quel periodo entrate nel conto. */
  prove: number
  /** I corsi con almeno una prova in quel periodo: non è una quota del totale. */
  corsi: number
  /** La pesata sulle sole prove di quel periodo. Nulla senza voti. */
  media: number | null
}

/** Quel che si conta di una persona, prima di scriverlo nella busta. */
interface Conto {
  allievo: Allievo
  classe: Classe
  /** Quel che ha detto `mediaAllievo` sui momenti guardati. Nulla senza voti. */
  media: number | null
  /** Le prove entrate nel conto: quelle di peso zero non ci sono. */
  prove: number
  /** In quanti corsi ha almeno una prova: una colonna, non un peso. */
  corsi: number
  /** Gli stessi conti, spezzati sui periodi della sua classe. */
  periodi: ContoPeriodo[]
}

const p = () => t().presentazione

export const procedura = definisci({
  nome: 'persone.medie',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    allievoId: opzionale(identificatore({ aiuto: () => t().allievoId })),
    mediaAlmeno: estremo(() => t().mediaAlmeno),
    mediaAlPiu: estremo(() => t().mediaAlPiu),
    soloSotto: opzionale(booleano({ aiuto: () => t().soloSotto })),
    // Acceso di suo, come `conAssenze` in `persone.assenze`: le righe senza voti
    // dicono «non si sa ancora», non «va male».
    conVoti: opzionale(booleano({ aiuto: () => t().conVoti })),
    ordina: opzionale(scelta(ORDINI, { aiuto: () => t().ordina })),
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
    archiviate: opzionale(booleano({ aiuto: () => t().archiviate })),
    ...periodo(() => t().proveContate),
    ...periodoScelto(() => t().proveContate),
    ...ricerca(() => t().dove, 'dic4a'),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    // I periodi una volta sola in cima, nelle righe solo il loro id.
    periodi: elenco(oggetto(SCHEDA_PERIODO), { aiuto: () => t().periodi }),
    sufficienza: numero({ aiuto: () => t().sufficienza }),
    ...CAMPI_CERCA,
    ...CAMPI_PAGINA,
    // I conti d'insieme stanno sul periodo e non sulla pagina.
    guardate: numero({ intero: true, aiuto: () => t().guardate }),
    conVoti: numero({ intero: true, aiuto: () => t().conVotiUscita }),
    sottoSufficienza: numero({ intero: true, aiuto: () => t().sottoSufficienza }),
    // I conti di quel che è rimasto fuori: distinguono «niente da trovare» da
    // «i filtri non hanno lasciato guardare niente».
    corsiGuardati: numero({ intero: true, aiuto: () => t().corsiGuardati }),
    ...CAMPI_ESCLUSI,
    persone: elenco(oggetto({
      allievoId: testo({ aiuto: () => t().allievoIdRiga }),
      ...CAMPI_RIGA_PERSONA,
      attivo: booleano({ aiuto: () => t().attivo }),
      corso: testo({ aiuto: () => t().corso }),
      corsi: numero({ intero: true, aiuto: () => t().corsi }),
      prove: numero({ intero: true, aiuto: () => t().prove }),
      media: nullabile(numero({ aiuto: () => t().media })),
      sufficiente: booleano({ aiuto: () => t().sufficiente }),
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: () => t().periodoSemestreId }),
        prove: numero({ intero: true, aiuto: () => t().periodoProve }),
        corsi: numero({ intero: true, aiuto: () => t().periodoCorsi }),
        media: nullabile(numero({ aiuto: () => t().periodoMedia })),
        sufficiente: booleano({ aiuto: () => t().periodoSufficiente }),
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
          { campo: 'sufficienza', etichetta: () => p().sufficienza, formato: 'numero' },
          { campo: 'guardate', etichetta: () => p().personeGuardate, formato: 'numero' },
          // Accanto alle persone guardate, i corsi: due zeri dicono che non si è guardato.
          { campo: 'corsiGuardati', etichetta: () => p().corsiGuardati, formato: 'numero' },
          { campo: 'conVoti', etichetta: () => p().conAlmenoUnVoto, formato: 'numero' },
          { campo: 'sottoSufficienza', etichetta: () => p().sottoSufficienza, formato: 'numero' },
          // Nulli quando non c'è niente da dire, e il pannello non ne scrive la riga.
          { campo: 'esclusiRitirati', etichetta: () => p().ritirate, formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: () => p().archiviate, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'nomeCompleto', testo: () => p().persona },
          { campo: 'classe', testo: () => p().classe },
          { campo: 'corsi', testo: () => p().corsi, formato: 'numero' },
          { campo: 'prove', testo: () => p().prove, formato: 'numero' },
          { campo: 'media', testo: () => p().media, formato: 'numero' },
          // Le medie di semestre affiancate («5,4 · 4,0»): dicono se si sale o si scende.
          { campo: 'periodi', dentro: 'media', testo: () => p().perSemestre, formato: 'numero' },
          { campo: 'sufficiente', testo: () => p().sufficiente, formato: 'siNo' },
        ],
      },
      // I periodi, dopo la tabella delle persone: la legenda delle cifre per
      // periodo, che restano nella busta e nella colonna annidata.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: () => p().perSemestre,
        colonne: [
          { campo: 'etichetta', testo: () => parole().periodo },
          { campo: 'dal', testo: () => parole().dal, formato: 'data' },
          { campo: 'al', testo: () => parole().al, formato: 'data' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const chiesta = ingresso.classeId ? esigiClasse(ambito, ingresso.classeId) : null
    // Un id inventato è un errore, non «quella persona non ha voti».
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)
    const corso = ingresso.corsoId ? esigiCorso(ambito, ingresso.corsoId) : null
    esigiCorsoDiClasse(r, corso, chiesta)

    // Fuori dal ciclo per due motivi: la guardia su `semestreId` deve sollevare
    // anche quando nessuna classe resta in piedi, e serve da ripiego degli estremi.
    const globale = periodiDa(r, ingresso)
    const sufficienza = r.impostazioni.scala.sufficienza
    const { corrisponde, ignorato: cercaIgnorato } = filtroTesto(ingresso.cerca)

    // Un id chiesto (classe o persona) si guarda anche se archiviato: nominarlo è
    // già volerlo. `archiviate` serve a chi guarda l'anno senza nominare nessuno.
    const nominato = ingresso.classeId !== undefined || ingresso.allievoId !== undefined

    // Le archiviate restano fuori se non le si chiede, salvo quando la domanda ne
    // nomina una.
    const { classi, archiviateFuori } = classiGuardate(r, ingresso, corso, nominato)
    const somma = contaNominate(ingresso.allievoId)

    // Corsi e periodi davvero guardati: la busta li rimanda.
    const corsiGuardati = new Set<string>()
    const visti = new Map<string, Periodo>()

    const conti = new Map<string, Conto>()
    for (const classe of classi) {
      // Un id chiesto vince sul filtro dei ritirati: di chi si è ritirato si deve
      // dire «ritirato», non «non ha voti».
      const persone = ordinaAllievi(
        ingresso.ritirati === true || ingresso.allievoId !== undefined
          ? classe.allievi
          : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)
      if (persone.length === 0) continue

      // I periodi di questa classe, spezzati da `filters.ts`: senza `dal` e `al` si
      // intende l'anno della classe, non per forza uguale per tutte.
      const { dal: inizio, al: fine, periodi: suoi } = periodiDa(r, ingresso, classe)
      for (const suo of suoi) unisci(visti, suo)

      for (const allievo of persone) {
        conti.set(allievo.id, {
          allievo,
          classe,
          media: null,
          prove: 0,
          corsi: 0,
          periodi: suoi.map((suo) => ({
            semestreId: suo.semestreId,
            prove: 0,
            corsi: 0,
            media: null,
          })),
        })
      }

      // I momenti di tutti i corsi guardati, in un mucchio solo per la media.
      const tutti: MomentoValutazione[] = []
      for (const corsoSuo of corsiDellaClasse(r, classe.id)) {
        if (corso && corsoSuo.id !== corso.id) continue
        corsiGuardati.add(corsoSuo.id)
        const momenti = r.valutazioni.filter(
          (momento) => momento.corsoId === corsoSuo.id && nelPeriodo(momento.data, inizio, fine),
        )
        if (momenti.length === 0) continue
        tutti.push(...momenti)

        // `corsi` si conta qui, dove si sa di quale corso si parla. Che cosa valga come
        // prova lo dice `mediaAllievo`: peso zero e assenze non contano.
        for (const allievo of persone) {
          const conto = conti.get(allievo.id)
          if (!conto) continue
          if (mediaAllievo(momenti, allievo.id).conteggio > 0) conto.corsi += 1
          // Lo stesso dentro ogni periodo, sulle sole prove che ci cadono: un corso con
          // prove in tutti e due i semestri conta in ciascuno.
          suoi.forEach((suo, indice) => {
            const dentro = momenti.filter((momento) => nelPeriodo(momento.data, suo.dal, suo.al))
            if (mediaAllievo(dentro, allievo.id).conteggio > 0) conto.periodi[indice].corsi += 1
          })
        }
      }

      for (const allievo of persone) {
        const conto = conti.get(allievo.id)
        if (!conto) continue
        // Il totale sul mucchio intero, non dai periodi: è la cifra dei fogli.
        const { media, conteggio } = mediaAllievo(tutti, allievo.id)
        conto.media = media
        conto.prove = conteggio

        suoi.forEach((suo, indice) => {
          const dentro = tutti.filter((momento) => nelPeriodo(momento.data, suo.dal, suo.al))
          const sua = mediaAllievo(dentro, allievo.id)
          conto.periodi[indice].media = sua.media
          conto.periodi[indice].prove = sua.conteggio
        })
      }
    }

    const materia = corso ? materiaDelCorso(r, corso)?.nome ?? '' : ''
    const guardate = conti.size

    const righe = [...conti.values()]
      .map((conto) => {
        const { media } = conto
        return {
          allievoId: conto.allievo.id,
          ...rigaPersona(conto.classe, conto.allievo),
          attivo: conto.allievo.attivo,
          corso: materia,
          corsi: conto.corsi,
          prove: conto.prove,
          media,
          // Senza voti non si è «sufficienti»; per distinguere il caso c'è `prove`.
          sufficiente: media !== null && media >= sufficienza,
          periodi: conto.periodi.map((suo) => ({
            ...suo,
            // La stessa soglia del totale, sulla media del periodo.
            sufficiente: suo.media !== null && suo.media >= sufficienza,
          })),
        }
      })
      // Il totale prima del filtro di testo: «guardate» dice su quante persone si è
      // risposto, anche quando la ricerca non trova nessuno.
      .filter((riga) => corrisponde([
        riga.nomeCompleto,
        riga.classe,
        conti.get(riga.allievoId)?.allievo.azienda ?? '',
      ].join(' ')))

    const conVoti = righe.filter((riga) => riga.prove > 0).length
    const insufficienti = righe.filter((riga) => riga.media !== null && !riga.sufficiente)

    // I periodi attraversati, in ordine, e gli estremi che ne escono. Senza classi
    // guardate, il periodo dell'anno in uso.
    const percorsi = [...visti.values()].sort((uno, altro) => uno.dal.localeCompare(altro.dal))
    const periodi = percorsi.length > 0 ? percorsi : globale.periodi
    const dal = periodi[0]?.dal ?? globale.dal
    const al = periodi[periodi.length - 1]?.al ?? globale.al

    const scelte = righe
      .filter((riga) => ingresso.conVoti === false || riga.prove > 0)
      .filter((riga) => fraSoglie(riga.media, ingresso.mediaAlmeno, ingresso.mediaAlPiu))
      .filter((riga) => ingresso.soloSotto !== true || (riga.media !== null && !riga.sufficiente))
      .sort((a, b) => {
        if (ingresso.ordina === 'nome') return a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        if (ingresso.ordina === 'prove') {
          return b.prove - a.prove || a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
        }
        // Per media dal basso: chi apre questa busta cerca chi sta peggio. Chi non ha
        // voti va in coda: non è il peggiore, non se ne sa niente.
        const sua = a.media ?? Number.POSITIVE_INFINITY
        const altrui = b.media ?? Number.POSITIVE_INFINITY
        return sua - altrui || a.nomeCompleto.localeCompare(b.nomeCompleto, 'it')
      })

    const { pagina: persone, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      dal,
      al,
      periodi,
      sufficienza,
      cerca: ingresso.cerca ?? '',
      cercaIgnorato,
      quante,
      da,
      troncato,
      ancora,
      guardate,
      conVoti,
      sottoSufficienza: insufficienti.length,
      corsiGuardati: corsiGuardati.size,
      esclusiRitirati: fuori(
        somma(classi, (allievo) => !allievo.attivo),
        ingresso.ritirati === true || ingresso.allievoId !== undefined,
      ),
      // Le persone delle classi archiviate tenute fuori, contate con lo stesso filtro
      // dei ritirati: il numero è quanti rientrerebbero accendendo solo quello.
      esclusiArchiviate: fuori(
        somma(archiviateFuori, (allievo) => ingresso.ritirati === true || allievo.attivo),
        ingresso.archiviate === true,
      ),
      persone,
    }
  },
})

/**
 * Unisce un periodo attraversato a quelli già visti. I periodi si risolvono per
 * classe, e due anni possono tagliare lo stesso semestre in modo diverso: la
 * busta ne dichiara uno per id, largo quanto l'unione.
 */
function unisci (visti: Map<string, Periodo>, suo: Periodo): void {
  const gia = visti.get(suo.semestreId)
  if (!gia) {
    visti.set(suo.semestreId, { ...suo })
    return
  }
  if (suo.dal < gia.dal) gia.dal = suo.dal
  if (suo.al > gia.al) gia.al = suo.al
}

