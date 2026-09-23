import { allieviAttivi, ordinaAllievi } from '../../../domain/calculations.js'
import {
  annoDellaClasse,
  classeDelCorsoId,
  corsoPerId,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import { SCUOLA } from '../../../domain/lexicon.js'
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

/**
 * Presenze e medie di un corso, con **i denominatori dichiarati accanto ai
 * numeri**.
 *
 * È la regola che il dominio tiene e che un'interfaccia esterna romperebbe per
 * prima: la quota di assenza si calcola sulle UD che l'orario prevedeva, la
 * quota di presenza su quelle in cui l'appello è stato fatto davvero, e sono
 * due cifre diverse che rispondono a due domande diverse — «quante ore ha
 * perso» e «quanto è affidabile quel numero». Qui viaggiano insieme ai loro
 * denominatori proprio perché nessuno possa ricavarne una terza.
 *
 * ---------------------------------------------------------------- i periodi
 *
 * Il conto è **raggruppato per periodo**, dove periodo è il semestre: la stessa
 * scansione su cui il registro raggruppa le valutazioni, quella che finisce
 * sulle pagelle. Non è un di più, è la forma normale della risposta.
 *
 * Il guasto che lo spiega in una riga: una busta che dice «il 14% di assenza»
 * sull'anno nasconde che al primo semestre era il 4% e al secondo il 24% — e il
 * peggioramento è l'unica cosa per cui quella cifra si guarda. Un numero solo
 * spalmato su dieci mesi è matematicamente giusto e risponde a una domanda che
 * nessuno ha fatto. Peggio: rassicura.
 *
 * Questa è la lettura che guarda **un corso solo**, quindi è la busta da cui si
 * compila una pagella — e una pagella si compila per semestre. Qui il
 * raggruppamento serve più che altrove.
 *
 * La forma: ogni riga resta una riga — un allievo, una riga, i totali dove
 * erano — e si porta dentro un array `periodi`; in cima un elenco `periodi`
 * dice **una volta sola** quali si sono guardati e con quali denominatori. I
 * nomi dei campi per periodo sono gli stessi dei campi di riga, perché due nomi
 * per la stessa cosa a due livelli diversi è il modo più sicuro di far
 * sbagliare chi legge.
 *
 * Senza `semestreId` si guardano tutti i periodi che toccano l'intervallo;
 * con, uno solo. Un anno senza semestri dà comunque **un** periodo — array di
 * uno, `semestreId` vuoto — così chi legge la busta non deve scrivere due
 * strade. Tutto questo lo decide `periodiDa`, in `common/filters.ts`.
 *
 * ------------------------------------------------ che cosa si somma e che no
 *
 * I periodi partizionano l'intervallo: ogni ora, ogni prova e ogni giorno
 * d'orario cade in uno e uno solo. Quindi **si sommano**: `udPreviste`,
 * `udACalendario`, `oreGuardate`, `udConAppello`, `udPresenza`, `udAssenza`,
 * `ritardi`, `minutiRitardo`, `prove`.
 *
 * **Non si sommano e non si mediano**: `assenza`, `presenza`, `frequenza` —
 * sono quozienti, e si ricalcolano per periodo sul denominatore di quel
 * periodo — e `media`/`nota`, per cui vedi il commento in `esegui`.
 */
export const procedura = definisci({
  nome: 'corso.presenze',
  versione: 1,
  genere: 'lettura',
  // Il titolo dice anche che cosa **pretende**. Prima attirava la scelta del
  // modello a ogni domanda sulle assenze — «presenze, assenze e medie» sono le
  // parole che la domanda contiene — e poi chiedeva un `corsoId` che chi
  // domanda non ha mai in mano: una scelta sbagliata che costava due giri e
  // finiva su una busta vuota. Per l'elenco degli allievi di una classe, o di
  // tutte, l'attrezzo è `persone.assenze`, ed è detto qui.
  titolo: 'Presenze, assenze e medie di UN corso, per semestre: vuole il corsoId ' +
    '(da «corsi.elenco»). Per gli allievi di una classe intera, «persone.assenze»',
  idempotente: true,
  ingresso: oggetto({
    corsoId: identificatore({ aiuto: 'Il corso: l’id lo dà «corsi.elenco»' }),
    // Il periodo condiviso, e non due campi riscritti qui. Erano tre
    // duplicazioni in una procedura sola — lo schema, la risoluzione, il
    // confronto — proprio in quella che `common/filters.ts` cita come la regola,
    // e non erano copie fedeli: senza semestri questa ricadeva su **tutto il
    // tempo** mentre `risolviPeriodo` ricade prima sugli estremi dell'anno, e
    // gli aiuti non dicevano in che forma si scrive una data.
    ...periodo('le ore del corso'),
    // E il semestre accanto alle due date, perché sono due filtri diversi che
    // si compongono: `dal`/`al` dicono **fin dove** si guarda, `semestreId`
    // dice di **raggruppare in uno**. Senza, i periodi sono tutti quelli che
    // l'intervallo tocca, ciascuno a parte — che è la risposta che serve.
    ...periodoScelto('le ore del corso'),
    // L'interruttore che mancava. Le persone ritirate restavano fuori di suo e
    // **non c'era modo di riportarle dentro**: chi cercava le ore di chi ha
    // lasciato a febbraio riceveva una tabella senza la sua riga e nessuna
    // parola che lo dicesse. Adesso il numero di quelle tolte esce nella busta,
    // e questo campo è la porta che quel numero indica.
    ritirati: opzionale(booleano({
      aiuto: 'Vero per contare anche chi non frequenta più: di norma restano fuori',
    })),
  }),
  uscita: oggetto({
    corsoId: testo(),
    titolo: testo(),
    // Classe e materia accanto al titolo, che un corso può avere vuoto: la
    // busta esce di qui verso una risposta che chi insegna legge, e «—» al
    // posto del nome della classe rende la risposta inutilizzabile. Sono in
    // mano alla procedura — il corso è già stato risolto — e cercarli con una
    // seconda chiamata vorrebbe dire due buste per una riga di intestazione.
    classeId: testo(),
    classe: testo({ aiuto: 'Il nome della classe: «I MEC A»' }),
    materia: testo(),
    dal: testo(),
    al: testo(),
    udPreviste: numero({
      aiuto: 'Le unità didattiche (UD) che l’orario del corso prevede nel periodo',
    }),
    udACalendario: numero({ aiuto: 'Le unità didattiche delle ore effettivamente messe a calendario' }),
    oreGuardate: numero({
      intero: true,
      aiuto: 'Quante ore del corso cadono nel periodo. ZERO vuol dire che non si è guardato niente',
    }),
    // Quante persone il filtro acceso di suo ha lasciato fuori: è il campo su
    // cui scatta la regola di recupero del modello — elenco vuoto più un numero
    // qui vuol dire «richiama con ritirati a vero», non «non c'è nessuno».
    esclusiRitirati: CAMPI_ESCLUSI.esclusiRitirati,
    // I periodi guardati, detti **una volta sola** e in cima: qui stanno i
    // numeri che non dipendono dall'allievo — quanto prevedeva l'orario,
    // quanto c'era a calendario, quante ore si sono guardate — esattamente
    // come i tre campi qui sopra li dicono per l'intervallo intero. Stessi
    // nomi, un livello più in basso: una voce di `periodi` è questa busta
    // ristretta a un semestre.
    //
    // Le quote di riga hanno il loro denominatore qui: `assenza` del periodo X
    // si legge sull'`udPreviste` della voce con lo stesso `semestreId`, come
    // oggi l'`assenza` di riga si legge sull'`udPreviste` in cima.
    periodi: elenco(oggetto({
      ...SCHEDA_PERIODO,
      udPreviste: numero({ aiuto: 'Le UD che l’orario prevedeva in QUESTO periodo: il denominatore di «assenza»' }),
      udACalendario: numero({ aiuto: 'Le UD delle ore messe a calendario in questo periodo' }),
      oreGuardate: numero({
        intero: true,
        aiuto: 'Quante ore del corso cadono in questo periodo. ZERO vuol dire che non si è guardato niente',
      }),
    }), { aiuto: 'I semestri su cui si è contato a parte: la somma dei loro conti fa il totale' }),
    righe: elenco(oggetto({
      allievoId: testo(),
      cognome: testo(),
      nome: testo(),
      udConAppello: numero({
        aiuto: 'Denominatore di «presenza»: le unità didattiche su cui l’appello è stato fatto',
      }),
      udPresenza: numero(),
      udAssenza: numero(),
      assenza: nullabile(numero({
        aiuto: 'Quota di assenza sulle unità didattiche PREVISTE, da 0 a 1. ' +
          'È la cifra dei rapporti da controfirmare',
      })),
      presenza: nullabile(numero({
        aiuto: 'Quota di presenza sulle unità didattiche CON APPELLO, da 0 a 1. ' +
          'Dice quanto è affidabile la prima',
      })),
      frequenza: nullabile(numero({ aiuto: 'Il complemento di «assenza», sullo stesso denominatore' })),
      ritardi: numero({ intero: true }),
      minutiRitardo: numero({ intero: true }),
      prove: numero({ intero: true }),
      media: nullabile(numero({ aiuto: 'Media pesata dei voti; nulla se non ne ha' })),
      nota: nullabile(numero({ aiuto: 'La media portata sul passo di fine semestre' })),
      // Gli stessi conti, semestre per semestre, con gli stessi nomi.
      //
      // Gli stessi nomi apposta: un `assenzaPeriodo` accanto a un `assenza`
      // costringerebbe chi legge a ricordarsi quale dei due ha il denominatore
      // stretto, e chi legge questa busta per primo è un modello che di
      // memoria non ne ha. Il livello dice già tutto: dentro `periodi` è del
      // periodo, fuori è del totale.
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: 'Quale periodo: lo stesso id dell’elenco «periodi» in cima' }),
        udConAppello: numero({ intero: true }),
        udPresenza: numero({ intero: true }),
        udAssenza: numero({ intero: true }),
        assenza: nullabile(numero({
          aiuto: 'Quota di assenza di QUESTO periodo, sulle UD previste in questo periodo',
        })),
        presenza: nullabile(numero({ aiuto: 'Quota di presenza di questo periodo, sulle sue UD con appello' })),
        frequenza: nullabile(numero({ aiuto: 'Il complemento di «assenza» di questo periodo' })),
        ritardi: numero({ intero: true }),
        minutiRitardo: numero({ intero: true }),
        prove: numero({ intero: true }),
        media: nullabile(numero({
          aiuto: 'Media pesata sulle prove di QUESTO periodo. La media d’anno NON è la media di queste',
        })),
        nota: nullabile(numero({ aiuto: 'La media del periodo portata sul passo di fine semestre' })),
      }), { aiuto: 'Una voce per periodo, nello stesso ordine dell’elenco «periodi» in cima' }),
    })),
  }),
  // I tre denominatori restano tre colonne distinte anche a schermo: è la
  // regola che questa procedura esiste per far rispettare, e una tabella che
  // ne mostrasse una sola rimetterebbe chi legge nella condizione di ricavarsi
  // la terza — cioè il conto che non deve nascere.
  presentazione: {
    titolo: 'Presenze del corso',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classe', etichetta: 'Classe' },
          { campo: 'materia', etichetta: 'Materia' },
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'udPreviste', etichetta: 'UD previste', formato: 'numero' },
          { campo: 'udACalendario', etichetta: 'UD a calendario', formato: 'numero' },
          { campo: 'oreGuardate', etichetta: 'Ore nel periodo', formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: 'Cognome' },
          { campo: 'nome', testo: 'Nome' },
          { campo: 'udAssenza', testo: 'UD perse', formato: 'numero' },
          { campo: 'assenza', testo: 'Assenza (su previste)', formato: 'quota' },
          // L'assenza dei due semestri affiancata nella stessa cella. Il totale
          // d'anno è la cifra che si firma; questa è quella che dice se c'è da
          // preoccuparsi adesso.
          { campo: 'periodi', dentro: 'assenza', testo: 'Per semestre', formato: 'quota' },
          { campo: 'presenza', testo: 'Presenza (su appello)', formato: 'quota' },
          { campo: 'ritardi', testo: 'Ritardi', formato: 'numero' },
          { campo: 'prove', testo: 'Prove', formato: 'numero' },
          { campo: 'media', testo: 'Media', formato: 'numero' },
          { campo: 'nota', testo: 'Nota', formato: 'numero' },
        ],
      },
      // I periodi come tabella, **dopo** quella degli allievi: è la sola metà
      // del raggruppamento che si possa impaginare. I `periodi` di riga sono un
      // array dentro un array, e i tre generi che `presentation.ts` conosce —
      // `valori`, `tabella`, `elenco` — leggono una chiave sola della busta o
      // una colonna sola di una riga: `campo()` non scende nei sottoggetti, e
      // `scrivi()` di un array di oggetti darebbe «[object Object]» in ogni
      // cella. Inventare qui un quarto genere vorrebbe dire scriverlo in una
      // procedura invece che dove i generi stanno; finché non c'è, i numeri
      // per allievo e per periodo viaggiano nella busta e non sulla pagina.
      //
      // Questa tabella però regge da sola il caso per cui il raggruppamento
      // esiste: i due denominatori affiancati, che è quel che si guarda prima
      // di firmare un rapporto di semestre.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: 'Per semestre',
        colonne: [
          { campo: 'etichetta', testo: 'Periodo' },
          { campo: 'dal', testo: 'Dal', formato: 'data' },
          { campo: 'al', testo: 'Al', formato: 'data' },
          { campo: 'udPreviste', testo: 'UD previste', formato: 'numero' },
          { campo: 'udACalendario', testo: 'UD a calendario', formato: 'numero' },
          { campo: 'oreGuardate', testo: 'Ore', formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const corso = corsoPerId(r, ingresso.corsoId)
    if (!corso) throw errore.nonTrovato(SCUOLA.corso)
    const classe = classeDelCorsoId(r, corso.id)
    if (!classe) throw errore.rifiuta('Il corso non ha più una classe.')
    const anno = annoDellaClasse(r, classe)
    // Il periodo della classe, risolto dove lo risolvono tutte le altre — i
    // semestri, poi gli estremi dell'anno, poi tutto il tempo — e **spezzato**
    // sui semestri che tocca. Il ripiego di mezzo mancava, e un corso in una
    // classe senza semestri guardava dall'anno zero al nonmilanovecento
    // dichiarando quelle due date. Un `semestreId` che non è di quest'anno
    // solleva di là: una busta vuota si leggerebbe come «non ci sono assenze».
    const { dal, al, periodi } = periodiDa(r, ingresso, classe)

    const allievi = ordinaAllievi(
      ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
    )
    const oreDelCorso = registroDelCorso(r, corso.id)

    /**
     * Il corso guardato dentro un intervallo: le stesse tre cose di sempre.
     *
     * Una funzione e non tre righe ripetute, perché il totale e ogni periodo
     * devono passare **per la stessa strada**: due conti scritti due volte
     * sono due conti che il mese prossimo divergono di un'ora, e la divergenza
     * si vedrebbe solo confrontando a mano la somma dei semestri con l'anno.
     *
     * `udPrevisteDaOrario` si chiama qui dentro, cioè **una volta per
     * periodo** e con gli estremi veri di quel periodo. Non si divide il
     * totale per due: è il denominatore che finisce sui rapporti stampati, e
     * due semestri di lunghezza diversa — o uno tagliato da un `dal` a metà —
     * darebbero quote che non tornano con il foglio che qualcuno firma.
     */
    const guarda = (da: string, a: string) => {
      const lezioni = oreDelCorso.filter((l) => nelPeriodo(l.data, da, a))
      const momenti = r.valutazioni.filter(
        (v) => v.corsoId === corso.id && nelPeriodo(v.data, da, a),
      )
      // Zero previste in un periodo non è un buco: `matriceCorso` ripiega
      // sulle UD delle ore a calendario di quel periodo, che è l'unico monte
      // ore che in quel caso si conosca. La somma resta il totale, perché
      // anche il totale ripiega sullo stesso conto.
      const previste = anno ? udPrevisteDaOrario(anno, corso, da, a) : 0
      return {
        oreGuardate: lezioni.length,
        matrice: matriceCorso(allievi, lezioni, momenti, r.impostazioni, previste),
      }
    }

    // Il totale si continua a calcolare **sull'intervallo intero**, non
    // sommando i periodi. Per le UD sarebbe lo stesso numero, ma per la media
    // no: la media d'anno è pesata su tutte le prove, e la media delle medie
    // di semestre darebbe a un semestre con una prova lo stesso peso di uno
    // con sei. È la «semplificazione» che domani qualcuno farebbe credendo di
    // ripulire; questa riga esiste per impedirlo, e il commento per spiegarlo.
    const totale = guarda(dal, al)

    // Un periodo per volta, nello stesso ordine di `periodi`: i quozienti
    // nascono qui, dentro `matriceCorso`, sui denominatori di quel periodo. Non
    // si mediano fra periodi — una media di quote pesa un semestre corto come
    // uno lungo — e non si ricalcolano a mano, o sarebbero una seconda formula
    // per lo stesso numero.
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
      // Il denominatore che ha contato, non quello che si era chiesto.
      //
      // `udPrevisteDaOrario` torna zero per un corso senza fasce fisse, e
      // `matriceCorso` in quel caso ripiega sulle UD delle ore a calendario —
      // «l'unico monte ore che in quel caso si conosca». Pubblicando la cifra
      // di prima del ripiego, la busta dichiarava `udPreviste: 0` accanto a
      // un'`assenza` contata su quattro: nessun denominatore presente dava quel
      // numero, e chi legge da fuori avrebbe dovuto ricavarselo da sé. Cioè la
      // terza formula che questa procedura esiste per non far nascere.
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
        // Gli estremi **veri**, cioè l'intersezione fra il semestre e quel che
        // si è chiesto: «dal 15 gennaio» sul primo semestre dà quindici giorni,
        // e dichiarare l'inizio del semestre metterebbe accanto a quindici
        // giorni di assenze un denominatore di cinque mesi.
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
        // Presi dalla matrice e non ricalcolati: sono già il conto del
        // dominio, e rifarlo qui vorrebbe dire avere due formule per lo
        // stesso numero — che è il difetto che i tre denominatori di
        // `courseMatrix.ts` esistono apposta per non avere.
        assenza: riga.assenza,
        presenza: riga.presenza,
        frequenza: riga.presenzaPreviste,
        ritardi: riga.ritardi,
        minutiRitardo: riga.minutiRitardo,
        prove: riga.prove,
        media: riga.media,
        nota: riga.nota,
        // Si cerca per id e non per indice. Gli indici **sono** allineati —
        // ogni `matriceCorso` mappa lo stesso elenco `allievi` — ma un domani
        // in cui un periodo filtrasse una riga romperebbe l'accoppiamento in
        // silenzio, attribuendo a Rossi le cifre di Bianchi. Una busta che
        // mescola due persone è peggio di una busta che non risponde.
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
            // I ritardi si contano **per ora e non per UD** — vedi `RigaCorso`
            // — e un'ora sta in un periodo solo: qui restano additivi. Lo
            // smetterebbero di essere se un giorno un periodo potesse tagliare
            // a metà una lezione, che oggi non succede perché i semestri sono
            // attigui e una lezione ha una data sola.
            ritardi: sua?.ritardi ?? 0,
            minutiRitardo: sua?.minutiRitardo ?? 0,
            prove: sua?.prove ?? 0,
            // Pesata sulle prove **di questo periodo**, che è la media che va
            // in pagella. Sommare o mediare queste per avere quella d'anno
            // dà un altro numero: la media d'anno pesa ogni prova una volta,
            // la media delle medie pesa ogni semestre una volta.
            media: sua?.media ?? null,
            nota: sua?.nota ?? null,
          }
        }),
      })),
    }
  },
})
