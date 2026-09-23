// Chi sta sotto: le medie per persona, e la soglia che le giudica.
//
// È la sorella di `persone.assenze`, e nasce dalla stessa mancanza. Le medie
// c'erano — `corso.presenze` le dà per un corso, `persone.scheda` per una
// persona — e la domanda con cui si comincia non ha né l'uno né l'altro id:
// «chi è sotto la sufficienza», «chi rischia», «com'è andata la classe in
// matematica». Per rispondere bisognava chiamare `corso.presenze` su ogni
// corso dell'anno e confrontare a mano venticinque righe per volta con la
// sufficienza della scala, che nessuno fa e infatti non si faceva.
//
// ------------------------------------------------------- da dove viene la media
//
// **Da `mediaAllievo()`, in una chiamata sola.** È la funzione del dominio che
// fa la media pesata di una persona su un mucchio di momenti: ogni voto pesa
// per il peso della sua prova — una verifica di peso 2 conta doppio, una di
// peso 0 non conta — e le assenze e le caselle vuote non entrano. È la stessa
// che riempie la pagella, i rapporti, le esportazioni e `matriceCorso`, e
// chiamarla qui vuol dire che la cifra della busta e quella del foglio sono la
// stessa cifra.
//
// ------------------------------------------------ e quando i corsi sono più d'uno
//
// Cambia il mucchio, non il conto: i momenti dei corsi guardati si mettono
// insieme e `mediaAllievo` li pesa tutti con lo stesso metro. Una prova di
// peso 3 in matematica vale tre prove di storia, come varrebbe tre prove
// dentro matematica.
//
// Scartata la **media delle medie** — la media di ogni corso, rifatta pesando
// sul numero di prove. Dà un altro numero: con un 2 di peso 3 in matematica e
// tre 5 di peso 1 in storia la media delle medie dice 4.25 e questa dice 3.5,
// cioè «sufficiente» contro «insufficiente», e chi ha chiesto `soloSotto` non
// se lo vedrebbe comparire. Due aritmetiche per la stessa domanda danno due
// numeri, e uno dei due finisce stampato su un rapporto.
//
// Non è la media di pagella, che pesa ogni materia uno indipendentemente da
// quante prove abbia fatto, e non pretende di esserlo: è «come sta andando
// nel complesso», il numero con cui si decide **chi guardare**, non quello con
// cui si decide qualcosa su di lui. Per quello si chiede il corso, e la busta
// risponde con la media vera di quel corso e la materia scritta accanto.
//
// L'alternativa era tornare `media: null` senza `corsoId` e obbligare a
// chiedere per corso. Scartata perché avrebbe reso inutilizzabili proprio le
// soglie: «chi è sotto quattro» sarebbe diventato una chiamata per corso più
// un'unione fatta a mano, cioè di nuovo il lavoro a mano che questa lettura
// esiste per togliere.
//
// ------------------------------------------------------------------ la sufficienza
//
// Non si chiede e non si inventa: è `impostazioni.scala.sufficienza`, la
// stessa cifra che colora i voti nelle viste. Viaggia nella busta accanto ai
// conti perché una media consegnata senza dire da dove in su è sufficiente è
// una cifra che chi legge giudica con la propria scala.
//
// ------------------------------------------------------------------- i periodi
//
// Il conto **si raggruppa per periodo**, e qui più che altrove il
// raggruppamento è quello che chi chiede si aspetta già: «periodo» vuol dire
// semestre, e il semestre è la scansione su cui il modello del dominio dice
// che il registro raggruppa le valutazioni e calcola le medie. È la scansione
// della **pagella**. Una media d'anno consegnata senza semestri risponde a una
// domanda che a scuola quasi nessuno fa: chi guarda queste cifre le guarda
// perché sta chiudendo un semestre, o perché va a un colloquio a dire com'è
// andato quello appena chiuso.
//
// E nasconde la cosa che si cerca. Un 4.8 sull'anno è un allievo da seguire;
// 5.4 nel primo semestre e 4.0 nel secondo è un allievo che sta **peggiorando**,
// che è un'altra informazione e porta a un'altra telefonata. Le due uscivano
// da questa busta con la stessa cifra.
//
// Senza chiedere niente la busta porta quindi `periodi` in cima — quali si
// sono guardati, una volta sola — e dentro ogni riga lo stesso array con le
// cifre di quella persona spezzate su quelli. `semestreId` restringe a uno
// solo; un id che non esiste **solleva**, perché «quel semestre non c'è» e «in
// quel semestre non ha prove» sono due risposte opposte e si scriverebbero
// uguali. Un anno senza semestri non perde il raggruppamento: ne esce un
// periodo solo, con `semestreId` vuoto, che copre tutto — chi legge la busta
// ha una strada sola, sempre. Tutto questo sta in `periodiDa`, in
// `common/filters.ts`, perché `persone.assenze` e `corso.presenze` spezzano lo
// stesso tempo allo stesso modo.
//
// Il **totale sulla riga resta quel che era**: `media`, `prove`, `corsi`,
// `sufficiente`, e su quelli continuano a lavorare le soglie, `soloSotto`,
// l'ordinamento e la pagina. I periodi sono roba in più.
//
// ------------------------------- quel che fra i periodi non si somma, e perché
//
// Due conti non sono additivi, e tutti e due sono il genere di cosa che
// qualcuno «semplifica» il mese dopo credendo di ripulire:
//
//   - **La media d'anno NON è la media delle due medie di periodo.** È la
//     pesata su **tutte** le prove insieme, quella che si calcolava già e che
//     continua a calcolarsi su un mucchio solo. Le due divergono ogni volta
//     che i due semestri non hanno lo stesso peso complessivo: sette prove da
//     5.4 e cinque da 4.0 fanno 4.82 sull'anno, non 4.70, che è la media delle
//     due medie. Ricavare il totale dai periodi sembra togliere un giro di
//     conti e cambia la cifra che si stampa — e la cambia di poco, che è il
//     modo peggiore, perché nessuno se ne accorge rileggendo. La stessa
//     ragione per cui qui sopra è scartata la media delle medie fra i corsi:
//     due aritmetiche per la stessa domanda danno due numeri.
//   - **`corsi` NO**: è un insieme, e il totale è l'**unione**. La somma dei
//     per-periodo è più grande ogni volta che un corso ha prove in tutti e due
//     i semestri, ed è giusto così — due semestri della stessa materia sono un
//     corso solo, e la riga dice in quanti corsi ha prove, non quante volte lo
//     si è contato.
//
// `prove` invece si somma, e si può: i semestri sono attigui per invariante —
// `allineaSemestri` fa partire il secondo il giorno dopo la fine del primo — e
// `nelPeriodo` comprende gli estremi, quindi ogni prova cade in uno e un solo
// periodo.
//
// `sufficiente` dentro una voce di periodo si giudica con la **stessa**
// `sufficienza` del registro: chi è sotto nel primo semestre è sotto anche se
// l'anno intero lo diluisce, ed è la riga per cui questo raggruppamento
// esiste.
//
// -------------------------------------------------- quel che è rimasto fuori
//
// Una busta che non racconta i propri filtri mente per omissione, e qui i
// filtri accesi di suo sono due — chi si è ritirato, le classi archiviate —
// più quello che dà il nome alla soglia, `conVoti`. Accanto alle righe
// viaggiano quindi i conti di quel che non c'è: `esclusiRitirati`,
// `esclusiArchiviate` e soprattutto **`corsiGuardati`**, che è il numero che
// distingue «non ho trovato» da «non ho guardato». Zero corsi guardati vuol
// dire che i filtri hanno chiuso tutto, e nessuna frase che cominci con «non
// ci sono voti» è lecita sotto uno zero lì. Senza quei numeri le istruzioni
// date al modello — «quando esclusiRitirati o esclusiArchiviate è maggiore di
// zero e l'elenco è vuoto, richiama con ritirati e archiviate a vero» — non
// hanno su che cosa scattare.
//
// ---------------------------------------------------------- i due id in conflitto
//
// `classeId` e `corsoId` sono due filtri che si incrociano, e quando il corso
// è di un'altra classe l'incrocio è vuoto per costruzione: il filtro delle
// classi non lascia in piedi niente, nessun conto nasce, e la busta esce a
// zero con `ok: true`. È il guasto che `persone.assenze` ha fatto davvero —
// un `corsoId` arrivato dal contesto dell'interfaccia insieme a una `classeId`
// chiesta a voce — e uno zero silenzioso lì si rilegge come «non ci sono
// voti», che è falso e detto con sicurezza. Adesso è un `ingresso-non-valido`
// che **nomina il conflitto**: il corso X è della classe Y, non della Z.

import {
  allieviAttivi,
  mediaAllievo,
  nomeCompleto,
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
  SCHEDA_PERIODO,
  taglia,
} from '../common/filters.js'
import {
  esigiClasse, esigiCorso, esigiCorsoDiClasse, esigiPersona,
} from '../common/register.js'

/** Come si ordina l'elenco: la prima riga è quella che si guarda. */
const ORDINI = ['media', 'nome', 'prove'] as const

/** Quel che si conta di una persona **dentro un periodo**, prima della busta. */
interface ContoPeriodo {
  semestreId: string
  /** Le prove di quel periodo entrate nel conto. */
  prove: number
  /** I corsi con almeno una prova **in quel periodo**: non è una quota del totale. */
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

export const procedura = definisci({
  nome: 'persone.medie',
  versione: 1,
  genere: 'lettura',
  titolo: 'Le medie per persona, con le soglie di profitto',
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: 'Solo le persone di questa classe' })),
    corsoId: opzionale(identificatore({
      aiuto: 'Solo i voti di questo corso: allora la media è quella vera del corso',
    })),
    allievoId: opzionale(identificatore({
      aiuto: 'Una persona sola, per confrontarla con le altre',
    })),
    mediaAlmeno: estremo('Solo chi arriva almeno a questa media. Chi non ha voti resta fuori'),
    mediaAlPiu: estremo('Solo chi non supera questa media: è l’elenco di chi sta sotto'),
    soloSotto: opzionale(booleano({
      aiuto: 'Vero per avere solo chi è sotto la sufficienza della scala del registro',
    })),
    // Acceso di suo, come `conAssenze` in `persone.assenze`: chi chiede le
    // medie non vuole in mezzo dieci righe senza nessun voto, che non dicono
    // «va male» ma «non si sa ancora». Chi guarda la classe intera — per
    // vedere proprio su chi non c'è niente — lo spegne di proposito.
    conVoti: opzionale(booleano({
      aiuto: 'Falso per avere anche chi non ha nessun voto. Senza, solo chi ne ha',
    })),
    ordina: opzionale(scelta(ORDINI, {
      aiuto: 'Per «media» dal basso (senza, è questo), per «nome» o per «prove»',
    })),
    ritirati: opzionale(booleano({ aiuto: 'Vero per contare anche chi non frequenta più' })),
    archiviate: opzionale(booleano({ aiuto: 'Vero per guardare anche nelle classi archiviate' })),
    ...periodo('le prove contate'),
    ...periodoScelto('le prove contate'),
    ...ricerca('nome, classe o azienda', 'dic4a'),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    // I periodi una volta sola in cima, e dentro le righe solo il loro id: la
    // stessa etichetta ripetuta su venticinque righe è il modo più facile di
    // riempire la busta che il modello legge di parole già dette.
    periodi: elenco(oggetto(SCHEDA_PERIODO), {
      aiuto: 'I semestri su cui si è contato, in ordine di tempo: le righe li richiamano per id',
    }),
    sufficienza: numero({ aiuto: 'Da qui in su si è sufficienti: la scala del registro' }),
    ...CAMPI_CERCA,
    ...CAMPI_PAGINA,
    // I conti d'insieme stanno sul periodo e non sulla pagina: sono la
    // risposta corta a «quanto è grave», e si leggono prima delle righe.
    guardate: numero({ intero: true, aiuto: 'Quante persone sono state guardate in tutto' }),
    conVoti: numero({ intero: true, aiuto: 'Quante hanno almeno un voto nel periodo' }),
    sottoSufficienza: numero({ intero: true, aiuto: 'Quante stanno sotto la sufficienza' }),
    // I tre conti di quel che è rimasto fuori. Senza, una busta a zero dice la
    // stessa cosa in due casi opposti: «ho guardato e non c'è niente» e «i
    // filtri non mi hanno lasciato guardare niente».
    corsiGuardati: numero({
      intero: true,
      aiuto: 'In quanti corsi si è contato. ZERO vuol dire che i filtri non hanno ' +
        'lasciato guardare niente: non è «nessun voto»',
    }),
    ...CAMPI_ESCLUSI,
    persone: elenco(oggetto({
      allievoId: testo({ aiuto: 'Da passare a «persone.scheda» per vedere prova per prova' }),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo(),
      classeId: testo(),
      classe: testo(),
      attivo: booleano({ aiuto: 'Falso per chi si è ritirato: resta nel registro' }),
      corso: testo({ aiuto: 'La materia, quando se n’è chiesta una sola. Vuoto altrimenti' }),
      corsi: numero({ intero: true, aiuto: 'In quanti corsi ha almeno una prova' }),
      prove: numero({ intero: true, aiuto: 'Quante prove hanno un voto suo, in tutto' }),
      media: nullabile(numero({
        aiuto: 'Pesata sul peso di ogni prova, su tutti i corsi guardati insieme',
      })),
      sufficiente: booleano({
        aiuto: 'Falso anche per chi non ha voti: non è un giudizio, è un fatto',
      }),
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: 'Quale periodo: si ritrova in «periodi», in cima alla busta' }),
        prove: numero({ intero: true, aiuto: 'Quante prove sue cadono in questo periodo' }),
        corsi: numero({
          intero: true,
          aiuto: 'Corsi con almeno una prova QUI: la somma dei periodi non fa «corsi», ' +
            'che è l’unione',
        }),
        media: nullabile(numero({
          aiuto: 'Pesata sulle sole prove di questo periodo. La media in alto NON è ' +
            'la media di queste: è la pesata su tutte le prove insieme',
        })),
        sufficiente: booleano({ aiuto: 'Con la stessa sufficienza del registro' }),
      }), {
        aiuto: 'Le stesse cifre spezzate per semestre: è qui che si vede chi è peggiorato',
      }),
    })),
  }),
  presentazione: {
    titolo: 'Le medie',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'sufficienza', etichetta: 'Sufficienza', formato: 'numero' },
          { campo: 'guardate', etichetta: 'Persone guardate', formato: 'numero' },
          // Accanto alle persone guardate, i corsi: due zeri di fila sono il
          // modo in cui si vede a colpo d'occhio che la risposta non è «non
          // ce ne sono», ed è la riga che mancava a chi rileggeva la busta.
          { campo: 'corsiGuardati', etichetta: 'Corsi guardati', formato: 'numero' },
          { campo: 'conVoti', etichetta: 'Con almeno un voto', formato: 'numero' },
          { campo: 'sottoSufficienza', etichetta: 'Sotto la sufficienza', formato: 'numero' },
          // I due conti di quel che è rimasto fuori: nulli quando non c'è
          // niente da dire, e allora il pannello non ne scrive la riga.
          { campo: 'esclusiRitirati', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: 'In classi archiviate, fuori', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'nomeCompleto', testo: 'Persona' },
          { campo: 'classe', testo: 'Classe' },
          { campo: 'corsi', testo: 'Corsi', formato: 'numero' },
          { campo: 'prove', testo: 'Prove', formato: 'numero' },
          { campo: 'media', testo: 'Media', formato: 'numero' },
          // Le medie di semestre affiancate: «5,4 · 4,0». La media d'anno da sola
          // non dice se si sta salendo o scendendo, che è quel che si guarda prima
          // di uno scrutinio.
          { campo: 'periodi', dentro: 'media', testo: 'Per semestre', formato: 'numero' },
          { campo: 'sufficiente', testo: 'Sufficiente', formato: 'siNo' },
        ],
      },
      // I periodi, **dopo** la tabella delle persone: è la sola metà del
      // raggruppamento che si possa impaginare. Le cifre per periodo di ogni
      // persona sono un array dentro un array, e i tre generi che
      // `presentation.ts` conosce — `valori`, `tabella`, `elenco` — leggono
      // una chiave sola della busta o una colonna sola di una riga:
      // `campo()` non scende nei sottoggetti. Inventare qui un quarto genere
      // vorrebbe dire scriverlo in una procedura invece che dove i generi
      // stanno; finché non c'è, quei numeri viaggiano nella busta e non sulla
      // pagina. Questa tabella dice almeno **su che cosa** sono stati spezzati.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: 'Per semestre',
        colonne: [
          { campo: 'etichetta', testo: 'Periodo' },
          { campo: 'dal', testo: 'Dal', formato: 'data' },
          { campo: 'al', testo: 'Al', formato: 'data' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const chiesta = ingresso.classeId ? esigiClasse(ambito, ingresso.classeId) : null
    // Un id inventato è un errore e non un elenco vuoto. Una busta vuota qui
    // si leggerebbe come «quella persona non ha voti», che è una risposta, e
    // sbagliata: chi la riceve smette di cercare l'id buono.
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)
    const corso = ingresso.corsoId ? esigiCorso(ambito, ingresso.corsoId) : null
    esigiCorsoDiClasse(r, corso, chiesta)

    // Chiamata qui e non solo dentro il ciclo, per due cose: è la guardia su
    // `semestreId` — un id inventato deve sollevare **anche** quando nessuna
    // classe resta in piedi, o l'errore comparirebbe o no a seconda di che
    // altro si è chiesto — ed è il ripiego degli estremi quando non si è
    // guardato niente.
    const globale = periodiDa(r, ingresso)
    const sufficienza = r.impostazioni.scala.sufficienza
    const { corrisponde, ignorato: cercaIgnorato } = filtroTesto(ingresso.cerca)

    // Un id chiesto — la classe o la persona — si guarda dov'è, archiviato o
    // no: scriverlo è già dire di volerlo, e lasciarlo cadere tornerebbe
    // proprio la busta vuota che i rifiuti qui sopra esistono per non dare.
    // `archiviate` serve a chi **non** ha nominato nessuno e guarda l'anno.
    const nominato = ingresso.classeId !== undefined || ingresso.allievoId !== undefined

    // Le classi in cui si guarda: una, o tutte quelle dell'anno. Le archiviate
    // restano fuori se non le si chiede — sono anni finiti, e le loro medie
    // non sono più una cosa su cui qualcuno possa intervenire — ma quante ne
    // restano fuori si conta **prima** di toglierle, o dopo non ci sono più.
    const candidate = r.classi
      .filter((classe) => !ingresso.classeId || classe.id === ingresso.classeId)
      .filter((classe) => !corso || classe.id === corso.classeId)
    const archiviateFuori = candidate.filter(
      (classe) => classe.archiviata && ingresso.archiviate !== true && !nominato,
    )
    const classi = candidate.filter(
      (classe) => ingresso.archiviate === true || nominato || !classe.archiviata,
    )

    /** Le persone di una classe che l'ingresso nomina, prima dei filtri accesi di suo. */
    const nominate = (classe: Classe): Allievo[] =>
      classe.allievi.filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)
    const somma = (dove: Classe[], passa: (allievo: Allievo) => boolean): number =>
      dove.reduce((quante, classe) => quante + nominate(classe).filter(passa).length, 0)

    // I corsi in cui si è davvero guardato e i periodi davvero attraversati:
    // due cose che si sanno solo percorrendo il ciclo, e che la busta rimanda
    // perché chi legge distingua «non ho trovato» da «non ho guardato».
    const corsiGuardati = new Set<string>()
    const visti = new Map<string, Periodo>()

    const conti = new Map<string, Conto>()
    for (const classe of classi) {
      // Come sopra: un id chiesto vince sul filtro acceso di suo, o di chi si è
      // ritirato a febbraio si direbbe «non ha voti» invece di «si è ritirato».
      const persone = ordinaAllievi(
        ingresso.ritirati === true || ingresso.allievoId !== undefined
          ? classe.allievi
          : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)
      if (persone.length === 0) continue

      // I periodi di **questa** classe, spezzati da `filters.ts` e non qui:
      // senza `dal` e `al` si intende l'anno *di quella classe*, che in un
      // registro con più anni aperti non è per forza lo stesso per tutte.
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

      // I momenti di tutti i corsi guardati, in un mucchio solo: la media si fa
      // una volta sopra questo, e non corso per corso con una somma sopra.
      const tutti: MomentoValutazione[] = []
      for (const corsoSuo of corsiDellaClasse(r, classe.id)) {
        if (corso && corsoSuo.id !== corso.id) continue
        corsiGuardati.add(corsoSuo.id)
        const momenti = r.valutazioni.filter(
          (momento) => momento.corsoId === corsoSuo.id && nelPeriodo(momento.data, inizio, fine),
        )
        if (momenti.length === 0) continue
        tutti.push(...momenti)

        // `corsi` è una colonna e non un peso: dice in quanti corsi ha
        // qualcosa, e si conta qui, dove si sa ancora di quale corso si parla.
        // Che cosa valga come prova lo dice `mediaAllievo` e non una regola
        // riscritta qui: peso zero e assenze non contano.
        for (const allievo of persone) {
          const conto = conti.get(allievo.id)
          if (!conto) continue
          if (mediaAllievo(momenti, allievo.id).conteggio > 0) conto.corsi += 1
          // E lo stesso dentro ogni periodo, sulle sole prove che ci cadono:
          // un corso con prove in tutti e due i semestri conta una volta in
          // ciascuno, e la somma dei due è più del totale. È l'unione, non una
          // ripartizione.
          suoi.forEach((suo, indice) => {
            const dentro = momenti.filter((momento) => nelPeriodo(momento.data, suo.dal, suo.al))
            if (mediaAllievo(dentro, allievo.id).conteggio > 0) conto.periodi[indice].corsi += 1
          })
        }
      }

      for (const allievo of persone) {
        const conto = conti.get(allievo.id)
        if (!conto) continue
        // Il totale, sul mucchio intero. **Non** si ricava dai periodi: la
        // pesata su tutte le prove insieme e la media delle medie di periodo
        // sono due numeri diversi appena i semestri non pesano uguale, e
        // questo è quello che sta sui fogli. Vedi il § qui in testa.
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
          cognome: conto.allievo.cognome,
          nome: conto.allievo.nome,
          nomeCompleto: nomeCompleto(conto.allievo),
          classeId: conto.classe.id,
          classe: conto.classe.nome,
          attivo: conto.allievo.attivo,
          corso: materia,
          corsi: conto.corsi,
          prove: conto.prove,
          media,
          // Chi non ha voti non è «sufficiente»: non si sa. Il booleano dice
          // il fatto — non ha raggiunto la sufficienza — e chi deve
          // distinguere i due casi guarda `prove`, che è lì apposta.
          sufficiente: media !== null && media >= sufficienza,
          periodi: conto.periodi.map((suo) => ({
            ...suo,
            // La stessa soglia del totale, applicata alla media di qui: è la
            // cifra per cui questo raggruppamento esiste — chi è sotto nel
            // primo semestre lo è anche se l'anno intero lo diluisce.
            sufficiente: suo.media !== null && suo.media >= sufficienza,
          })),
        }
      })
      // Il totale si prende **prima** del filtro di testo: «guardate» dice su
      // quante persone si è risposto, e contarlo dopo faceva dire «0 guardate»
      // a una ricerca che non trova nessuno — cioè togliere proprio il numero
      // che impedisce di leggere «zero righe» come «non c’è nessuno».
      .filter((riga) => corrisponde([
        riga.nomeCompleto,
        riga.classe,
        conti.get(riga.allievoId)?.allievo.azienda ?? '',
      ].join(' ')))

    const conVoti = righe.filter((riga) => riga.prove > 0).length
    const insufficienti = righe.filter((riga) => riga.media !== null && !riga.sufficiente)

    // I periodi davvero attraversati, in ordine di tempo, e gli estremi che ne
    // escono: il primo giorno del primo e l'ultimo dell'ultimo. Senza nessuna
    // classe guardata resta il periodo dell'anno in uso — quel che si sarebbe
    // guardato se un filtro non avesse chiuso la porta.
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
        // Per media, **dal basso**: al contrario di tutti gli altri elenchi, e
        // apposta. Chi apre questa busta cerca chi sta peggio, e metterlo in
        // fondo vorrebbe dire scorrere venticinque righe per trovarlo. Chi non
        // ha voti va in coda e non in testa: non è il peggiore, è uno di cui
        // non si sa niente, e in cima sembrerebbe un caso disperato.
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
      // Le persone che stanno in una classe archiviata tenuta fuori, contate
      // come sarebbero state contate: con lo stesso filtro dei ritirati qui
      // sopra, o il numero direbbe quante ne rientrerebbero con **due**
      // interruttori invece che con quello che nomina.
      esclusiArchiviate: fuori(
        somma(archiviateFuori, (allievo) => ingresso.ritirati === true || allievo.attivo),
        ingresso.archiviate === true,
      ),
      persone,
    }
  },
})

/**
 * Un periodo che si è attraversato, messo insieme a quello che c'era già.
 *
 * I periodi si risolvono **per classe**, e due classi di anni diversi possono
 * dare lo stesso semestre tagliato in modo diverso: la busta ne dichiara uno
 * solo per id, largo quanto l'unione di quel che si è davvero guardato.
 * Dichiararne due con lo stesso id farebbe cadere il richiamo per id dalle
 * righe, che è il motivo per cui l'elenco sta in cima.
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

