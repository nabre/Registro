import { allieviAttivi, ordinaAllievi } from '../../../domain/calculations.js'
import {
  annoDellaClasse,
  classeDelCorsoId,
  corsoPerId,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import { matriceCorso } from '../../../domain/courseMatrix.js'
import { udPrevisteDaOrario } from '../../../domain/timetable.js'
import { definisci, errore } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import {
  CAMPI_ESCLUSI,
  fuori,
  nelPeriodo,
  periodiDa,
  periodo,
  periodoScelto,
  SCHEDA_PERIODO,
} from '../common/filters.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './corso.testi.js'

const t = () => testi().presenze
const p = () => t().presentazione

/**
 * Presenze e medie di un corso, con i denominatori accanto ai numeri: la quota
 * di assenza si legge sulle UD previste dall'orario, quella di presenza sulle
 * UD con appello. Viaggiano insieme perché nessuno ne ricavi una terza.
 *
 * Il conto si raggruppa per semestre (la scansione delle pagelle): ogni riga
 * porta un array `periodi` con gli stessi nomi di campo del totale, e in cima
 * `periodi` dice una volta sola quali periodi e con quali denominatori.
 * Senza `semestreId` tutti quelli che toccano l'intervallo; un anno senza
 * semestri dà un periodo solo con `semestreId` vuoto (`periodiDa` in
 * `common/filters.ts`).
 *
 * I periodi partizionano l'intervallo, quindi si sommano `udPreviste`,
 * `udACalendario`, `oreGuardate`, `udConAppello`, `udPresenza`, `udAssenza`,
 * `ritardi`, `minutiRitardo`, `prove`. Non si sommano né si mediano i
 * quozienti (`assenza`, `presenza`, `frequenza`), ricalcolati per periodo, e
 * `media`/`nota` (vedi `esegui`).
 */
export const procedura = definisci({
  nome: 'corso.presenze',
  versione: 1,
  genere: 'lettura',
  // Il titolo dice anche che cosa pretende (un `corsoId`) e rimanda a
  // `persone.assenze` per l'elenco di una classe o di tutte.
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: () => t().corsoId }),
    // Il periodo condiviso (`common/filters.ts`), non campi riscritti qui.
    ...periodo(() => t().oreDelCorso),
    // Il semestre accanto alle date: `dal`/`al` dicono fin dove si guarda,
    // `semestreId` restringe a uno. Senza, ogni periodo a parte.
    ...periodoScelto(() => t().oreDelCorso),
    // Le persone ritirate restano fuori di suo: questo le riporta dentro, e la
    // busta dice quante ne sono state tolte.
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
  }),
  uscita: oggetto({
    corsoId: testo(),
    titolo: testo(),
    // Classe e materia accanto al titolo (che può essere vuoto), per non chiederle
    // con una seconda chiamata.
    classeId: testo(),
    classe: testo({ aiuto: () => t().classe }),
    materia: testo(),
    dal: testo(),
    al: testo(),
    udPreviste: numero({ aiuto: () => t().udPreviste }),
    udACalendario: numero({ aiuto: () => t().udACalendario }),
    oreGuardate: numero({ intero: true, aiuto: () => t().oreGuardate }),
    // Su questo scatta la regola del modello: elenco vuoto più un numero qui →
    // richiama con `ritirati` a vero.
    esclusiRitirati: CAMPI_ESCLUSI.esclusiRitirati,
    // I periodi guardati, una volta sola in cima, con i numeri che non dipendono
    // dall'allievo: gli stessi campi dell'intervallo intero, ristretti a un
    // semestre. `assenza` di riga del periodo X si legge sull'`udPreviste` della
    // voce con lo stesso `semestreId`.
    periodi: elenco(oggetto({
      ...SCHEDA_PERIODO,
      udPreviste: numero({ aiuto: () => t().periodoUdPreviste }),
      udACalendario: numero({ aiuto: () => t().periodoUdACalendario }),
      oreGuardate: numero({ intero: true, aiuto: () => t().periodoOreGuardate }),
    }), { aiuto: () => t().periodi }),
    righe: elenco(oggetto({
      allievoId: testo(),
      cognome: testo(),
      nome: testo(),
      udConAppello: numero({ aiuto: () => t().udConAppello }),
      udPresenza: numero(),
      udAssenza: numero(),
      assenza: nullabile(numero({ aiuto: () => t().assenza })),
      presenza: nullabile(numero({ aiuto: () => t().presenza })),
      frequenza: nullabile(numero({ aiuto: () => t().frequenza })),
      ritardi: numero({ intero: true }),
      minutiRitardo: numero({ intero: true }),
      prove: numero({ intero: true }),
      media: nullabile(numero({ aiuto: () => t().media })),
      nota: nullabile(numero({ aiuto: () => t().nota })),
      // Gli stessi conti semestre per semestre, con gli stessi nomi: il livello dice
      // se è del periodo o del totale.
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: () => t().rigaSemestreId }),
        udConAppello: numero({ intero: true }),
        udPresenza: numero({ intero: true }),
        udAssenza: numero({ intero: true }),
        assenza: nullabile(numero({ aiuto: () => t().rigaAssenza })),
        presenza: nullabile(numero({ aiuto: () => t().rigaPresenza })),
        frequenza: nullabile(numero({ aiuto: () => t().rigaFrequenza })),
        ritardi: numero({ intero: true }),
        minutiRitardo: numero({ intero: true }),
        prove: numero({ intero: true }),
        media: nullabile(numero({ aiuto: () => t().rigaMedia })),
        nota: nullabile(numero({ aiuto: () => t().rigaNota })),
      }), { aiuto: () => t().rigaPeriodi }),
    })),
  }),
  // I tre denominatori restano tre colonne anche a schermo, perché nessuno
  // debba ricavarsi la terza.
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'materia', etichetta: () => p().materia },
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
          { campo: 'udPreviste', etichetta: () => p().udPreviste, formato: 'numero' },
          { campo: 'udACalendario', etichetta: () => p().udACalendario, formato: 'numero' },
          { campo: 'oreGuardate', etichetta: () => p().oreNelPeriodo, formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: () => p().ritirate, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: () => parole().cognome },
          { campo: 'nome', testo: () => parole().nome },
          { campo: 'udAssenza', testo: () => p().udPerse, formato: 'numero' },
          { campo: 'assenza', testo: () => p().assenza, formato: 'quota' },
          // L'assenza dei semestri nella stessa cella: il totale d'anno si firma, questa
          // dice se c'è da preoccuparsi adesso.
          { campo: 'periodi', dentro: 'assenza', testo: () => p().perSemestre, formato: 'quota' },
          { campo: 'presenza', testo: () => p().presenza, formato: 'quota' },
          { campo: 'ritardi', testo: () => p().ritardi, formato: 'numero' },
          { campo: 'prove', testo: () => p().prove, formato: 'numero' },
          { campo: 'media', testo: () => p().media, formato: 'numero' },
          { campo: 'nota', testo: () => p().nota, formato: 'numero' },
        ],
      },
      // I periodi come tabella, dopo quella degli allievi: i `periodi` di riga sono
      // un array dentro un array, oltre quel che `presentation.ts` regge, e restano
      // nella busta (più la colonna annidata). Questa tabella mostra i denominatori
      // affiancati per semestre.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: () => p().perSemestre,
        colonne: [
          { campo: 'etichetta', testo: () => parole().periodo },
          { campo: 'dal', testo: () => parole().dal, formato: 'data' },
          { campo: 'al', testo: () => parole().al, formato: 'data' },
          { campo: 'udPreviste', testo: () => p().udPreviste, formato: 'numero' },
          { campo: 'udACalendario', testo: () => p().udACalendario, formato: 'numero' },
          { campo: 'oreGuardate', testo: () => p().ore, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const corso = corsoPerId(r, ingresso.corsoId)
    if (!corso) throw errore.nonTrovato('corso')
    const classe = classeDelCorsoId(r, corso.id)
    if (!classe) throw errore.rifiuta(t().senzaClasse)
    const anno = annoDellaClasse(r, classe)
    // Il periodo della classe (semestri, poi estremi dell'anno), spezzato sui
    // semestri che tocca. Un `semestreId` di un altro anno solleva in `periodiDa`.
    const { dal, al, periodi } = periodiDa(r, ingresso, classe)

    const allievi = ordinaAllievi(
      ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
    )
    const oreDelCorso = registroDelCorso(r, corso.id)

    /**
     * Il corso guardato in un intervallo. Il totale e ogni periodo passano per la
     * stessa strada, così i conti non divergono.
     *
     * `udPrevisteDaOrario` si chiama qui, una volta per periodo con i suoi
     * estremi: è il denominatore dei rapporti stampati, e non si divide.
     */
    const guarda = (da: string, a: string) => {
      const lezioni = oreDelCorso.filter((l) => nelPeriodo(l.data, da, a))
      // Le annullate restano fuori dai conti, come nella pagina, negli avvisi e nei
      // rapporti. `oreGuardate` conta invece le ore a calendario del periodo.
      const tenute = lezioni.filter((l) => l.stato !== 'annullata')
      const momenti = r.valutazioni.filter(
        (v) => v.corsoId === corso.id && nelPeriodo(v.data, da, a),
      )
      // Zero previste in un periodo: `matriceCorso` ripiega sulle UD a calendario di
      // quel periodo, come fa sul totale.
      const previste = anno
        ? udPrevisteDaOrario(anno, corso, da, a, r.impostazioni.minutiUd, r.lezioni)
        : 0
      return {
        oreGuardate: lezioni.length,
        matrice: matriceCorso(allievi, tenute, momenti, r.impostazioni, previste),
      }
    }

    // Il totale si calcola sull'intervallo intero, non sommando i periodi: la
    // media d'anno è pesata su tutte le prove, non sulle medie di semestre.
    const totale = guarda(dal, al)

    // Un periodo per volta, nell'ordine di `periodi`: i quozienti nascono dentro
    // `matriceCorso` sui denominatori del periodo.
    const contati = periodi.map((suo) => ({ suo, ...guarda(suo.dal, suo.al) }))

    /** Le righe di un periodo, per id: gli indici si allineano, gli id lo dicono. */
    const perAllievo = contati.map(({ suo, matrice }) => ({
      semestreId: suo.semestreId,
      righe: new Map(matrice.righe.map((riga) => [riga.allievo.id, riga])),
    }))

    return {
      corsoId: corso.id,
      titolo: corso.titolo,
      classeId: classe.id,
      classe: classe.nome,
      materia: materiaDelCorso(r, corso)?.nome ?? '—',
      dal,
      al,
      // Il denominatore che ha contato davvero: senza fasce fisse
      // `udPrevisteDaOrario` dà zero e `matriceCorso` ripiega sulle UD a calendario.
      udPreviste: totale.matrice.udPreviste,
      udACalendario: totale.matrice.ud,
      oreGuardate: totale.oreGuardate,
      esclusiRitirati: fuori(
        classe.allievi.filter((allievo) => !allievo.attivo).length,
        ingresso.ritirati === true,
      ),
      periodi: contati.map(({ suo, matrice, oreGuardate }) => ({
        semestreId: suo.semestreId,
        numero: suo.numero,
        etichetta: suo.etichetta,
        // Gli estremi veri (intersezione fra semestre e intervallo chiesto): il
        // denominatore deve corrispondere ai giorni contati.
        dal: suo.dal,
        al: suo.al,
        udPreviste: matrice.udPreviste,
        udACalendario: matrice.ud,
        oreGuardate,
      })),
      righe: totale.matrice.righe.map((riga) => ({
        allievoId: riga.allievo.id,
        cognome: riga.allievo.cognome,
        nome: riga.allievo.nome,
        udConAppello: riga.udConAppello,
        udPresenza: riga.udPresenza,
        udAssenza: riga.udAssenza,
        // Dalla matrice, non ricalcolati: un conto solo per numero.
        assenza: riga.assenza,
        presenza: riga.presenza,
        frequenza: riga.presenzaPreviste,
        ritardi: riga.ritardi,
        minutiRitardo: riga.minutiRitardo,
        prove: riga.prove,
        media: riga.media,
        nota: riga.nota,
        // Per id e non per indice: oggi gli indici sono allineati, ma un periodo che
        // filtrasse una riga attribuirebbe a una persona le cifre di un'altra.
        periodi: perAllievo.map(({ semestreId, righe }) => {
          const sua = righe.get(riga.allievo.id)
          return {
            semestreId,
            udConAppello: sua?.udConAppello ?? 0,
            udPresenza: sua?.udPresenza ?? 0,
            udAssenza: sua?.udAssenza ?? 0,
            assenza: sua?.assenza ?? null,
            presenza: sua?.presenza ?? null,
            frequenza: sua?.presenzaPreviste ?? null,
            // I ritardi si contano per ora (vedi `RigaCorso`) e un'ora sta in un periodo
            // solo: sono additivi.
            ritardi: sua?.ritardi ?? 0,
            minutiRitardo: sua?.minutiRitardo ?? 0,
            prove: sua?.prove ?? 0,
            // Pesata sulle prove di questo periodo (la media di pagella); non si somma né
            // si media per avere quella d'anno.
            media: sua?.media ?? null,
            nota: sua?.nota ?? null,
          }
        }),
      })),
    }
  },
})
