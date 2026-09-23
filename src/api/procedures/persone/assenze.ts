// Chi ha assenze, e quante: la domanda che il registro non sapeva leggere.
//
// C'erano i pezzi e non la risposta. `corso.presenze` sa dire come sta una
// classe **in un corso**, e vuole il `corsoId`; `persone.scheda` sa dire come
// sta **una persona**, e vuole l'`allievoId`. «Chi ha assenze» non ha né l'uno
// né l'altro: è la domanda con cui si comincia, quella che si fa prima di
// sapere di chi si sta parlando, e l'unico modo di rispondere era chiamare
// `corso.presenze` per ogni corso dell'anno e sommare a mano — sommando anche
// due volte la stessa persona, che in due corsi c'è due volte.
//
// Qui la somma la fa il registro, e la fa **per persona e non per corso**: una
// riga per chi ha almeno una casella negli stati chiesti, con il conto dei
// corsi dentro. Chi non ne ha resta fuori di suo — è quel che vuol dire «gli
// allievi che hanno assenze» — e `conAssenze: false` lo riporta dentro per chi
// sta guardando la classe intera.
//
// ------------------------------------------------------------------ gli stati
//
// `stati` è un **elenco**, e non è un dettaglio: «chi ha problemi di
// frequenza» è `['assente', 'ritardo']`, «chi ha un permesso» è
// `['esonerato']`, «su chi non si è mai segnato niente» è `['non-impostato']`
// — la domanda con cui ci si accorge di un registro tenuto male. Con un valore
// solo sarebbero tre chiamate e una somma a mano, e una somma a mano conta due
// volte chi ha due stati diversi nella stessa ora.
//
// ------------------------------------------------------------------ la soglia
//
// `soglia` si dice **in cifra tonda, da 0 a 100**: 20 è il venti per cento. È
// la scala di tutto il resto del registro — `impostazioni.sogliaAssenza` sta
// fra 0 e 100, `validation.ts` la taglia a 100, i modelli dei rapporti
// scrivono `{{sogliaAssenza}}%` — e senza soglia chiesta vale proprio quella.
// Le due cose insieme in una busta sola: `oltreSoglia` dice chi la supera,
// `sogliaUsata` dice quale si è applicata. Una quota consegnata senza dire su
// che soglia è stata giudicata è una cifra che chi legge giudica con la
// propria.
//
// Qui c'erano **due scale nello stesso campo**, ed è il guasto che questa
// riga ha fatto davvero. L'ingresso dichiarava «da 0 a 1» e il confronto era
// `quota > soglia` con la quota fra 0 e 1; il ripiego però prendeva
// `impostazioni.sogliaAssenza`, che è 20. `0.065 > 20` è falso per chiunque:
// la busta rispondeva «Con almeno una: 7» e «Oltre soglia: 0», con sette
// righe dall'1,7% al 6,5% e la colonna che diceva «no» a tutte — e in cima
// «Soglia 2000%», perché `sogliaUsata` usciva 20 dichiarata come quota e la
// presentazione la moltiplicava per cento. Nessuno è mai stato segnalato, e
// il campo che avrebbe dovuto dirlo sembrava funzionare.
//
// Il confronto non si riscrive più qui: lo fa `oltreSoglia()` di
// `domain/alerts.ts`, la stessa funzione dei due rapporti stampati e
// delle pendenze. Due conti scritti in due posti sono due occasioni di
// segnalare persone diverse, e il giorno in cui non tornano chi legge non sa
// a quale credere — che è, alla lettera, quel che è successo.
//
// -------------------------------------------------------------- i tre id
//
// `classeId`, `corsoId` e `allievoId` passano tutti e tre da una guardia, e
// non è pignoleria: è il guasto che questa procedura ha fatto davvero. «Elenco
// degli allievi con assenze» tornava «non sono state trovate assenze per
// nessun allievo», con la busta in ordine e `ok: true`, perché il contesto
// dell'interfaccia aveva infilato il `corsoId` di un corso di un'**altra**
// classe: l'incrocio fra i due filtri non lasciava in piedi nessuna classe, e
// zero classi guardate uscivano identiche a zero assenze trovate. Adesso i due
// id in conflitto sono un `ingresso-non-valido` che **nomina il conflitto** —
// il corso X è della classe Y, non della Z — perché un errore che dice quale
// dei due è di troppo è la sola risposta che chi chiama possa correggere.
// `allievoId` era il terzo caso, e il peggiore: un filtro senza guardia, con
// cui un id inventato dava una busta buona e vuota, cioè «quella persona non
// ha assenze» detto di una persona che non esiste.
//
// -------------------------------------------------- quel che è rimasto fuori
//
// Una busta che non racconta i propri filtri è una busta che mente per
// omissione, e qui i filtri accesi di suo sono due — chi si è ritirato, le
// classi archiviate — più quello che dà il nome alla lettura, `conAssenze`.
// Quindi accanto alle righe viaggiano i conti di quel che non c'è: quante
// persone hanno tolto i due interruttori (`esclusiRitirati`,
// `esclusiArchiviate`), quante righe a zero ha tolto `conAssenze`
// (`escluseSenzaAssenze`), e soprattutto **`corsiGuardati`**. Quell'ultimo è
// il numero che distingue «non ho trovato» da «non ho guardato»: zero corsi
// guardati vuol dire che i filtri hanno chiuso tutto, e nessuna frase che
// cominci con «non ci sono assenze» è lecita sotto uno zero lì.
//
// ------------------------------------------------------------- il periodo
//
// `dal` e `al` che escono sono gli estremi **davvero usati**, non quelli
// chiesti. Il periodo si risolve per classe — `risolviPeriodo(r, ingresso,
// classe)` — perché senza `dal` e `al` si intende l'anno *di quella classe*, e
// in un registro con più anni aperti non è lo stesso per tutte; la busta
// rimanda allora il minimo degli inizi e il massimo delle fini di quel che si
// è guardato. Prima dichiarava il periodo dell'anno in uso avendo contato su
// un altro: la presentazione lo stampa in cima come «Dal / Al», e chi legge
// attribuiva a un periodo cifre di un altro.
//
// ------------------------------------------------------------- i periodi
//
// Il conto **si raggruppa per periodo**, e non è un'opzione da accendere: è
// la forma normale della risposta. «Periodo» qui vuol dire semestre — la
// scansione su cui il registro raggruppa le valutazioni e su cui si compilano
// le pagelle — e senza chiedere niente la busta porta `periodi` in cima, che
// dice una volta sola quali si sono guardati, e dentro ogni riga lo stesso
// array con le cifre di quella persona spezzate su quelli.
//
// Un numero solo spalmato sull'anno nasconde esattamente la cosa che si
// guarda. Quattordici UD in un anno sono una quota media che non allarma
// nessuno; undici nel primo semestre e tre nel secondo sono una persona che
// si è ripresa, tre e undici sono una persona che si sta perdendo, e le due
// uscivano da questa busta con la stessa cifra e lo stesso `oltreSoglia`. Chi
// legge non legge l'anno: legge il semestre che sta chiudendo, perché è
// quello che va sulla pagella e quello di cui si parla al colloquio.
//
// `semestreId` restringe a uno solo, e un id che non esiste **solleva**
// invece di dare una busta vuota — «quel semestre non c'è» e «in quel
// semestre non ci sono assenze» sono due risposte opposte scritte uguali. Un
// anno senza semestri non perde il raggruppamento: ne esce un periodo solo,
// con `semestreId` vuoto, che copre tutto. Così chi legge la busta ha una
// strada sola, sempre. Tutto questo sta in `periodiDa`, in `common/filters.ts`,
// e non qui: `corso.presenze` e `persone.medie` spezzano lo stesso tempo.
//
// Il **totale sulla riga resta quel che era** — `ud`, `quota`, `oltreSoglia`,
// `corsi` — e su quello continuano a lavorare l'ordinamento, la soglia e la
// pagina: chi leggeva questa busta ieri la rilegge oggi senza cambiare niente,
// e i periodi sono roba in più.
//
// ------------------------------------- quel che fra i periodi non si somma
//
// Tre avvertenze, perché due di queste sono il genere di cosa che qualcuno
// «corregge» il mese dopo:
//
//   - **`udPreviste` si ricalcola**, non si divide. `udPrevisteDaOrario` va
//     chiamata una volta per periodo con gli estremi *di quel periodo*: è il
//     denominatore che si stampa sui rapporti, e un monte ore spalmato a metà
//     su due semestri di lunghezza diversa darebbe due quote che non tornano
//     con nessun foglio firmato. Sommate danno il totale perché i periodi
//     partizionano l'intervallo, non perché siano state divise.
//   - **`ore` si somma**, e si può: i semestri sono attigui per invariante —
//     `allineaSemestri` fa partire il secondo il giorno dopo la fine del
//     primo — e `nelPeriodo` comprende gli estremi, quindi ogni lezione cade
//     in uno e un solo periodo. Nessun doppio conteggio.
//   - **`corsi` NO**: è un insieme, e il totale è l'**unione**. La somma dei
//     per-periodo è più grande ogni volta che un corso ha caselle in tutti e
//     due i semestri, ed è giusto così — due semestri della stessa materia
//     sono un corso, e la riga dice in quanti corsi diversi ha assenze, non
//     quante volte lo si è contato. Non è una svista da sistemare.
//
// `oltreSoglia` dentro una voce di periodo si giudica sulla quota di quel
// periodo, con la stessa `sogliaUsata`: chi supera il venti per cento nel
// primo semestre lo supera anche se l'anno intero lo diluisce, ed è la riga
// per cui questo raggruppamento esiste. Il campo omonimo **in cima** continua
// a contare le *persone* oltre soglia sul totale: stesso nome, due piani
// diversi, e il secondo è quello che c'era prima e che nessuno deve trovarsi
// cambiato sotto i piedi.

import {
  allieviAttivi,
  nomeCompleto,
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
// Con un alias, e non per gusto: dentro `esegui` c'è già un `oltreSoglia` —
// il conto delle persone che la superano, che è un campo della busta — e due
// nomi uguali nello stesso corpo vorrebbero dire chiamare la funzione prima
// della `const` che la copre, cioè un errore che si vede solo a programma
// avviato.
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
  filtroTesto,
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
const ORDINI = ['quota', 'ud', 'nome'] as const

/**
 * Quel che si conta di una persona **in un periodo**.
 *
 * È l'unità in cui si accumula: il totale della riga non è un accumulatore a
 * parte ma la somma di questi, così non ci sono due strade per arrivare allo
 * stesso numero — e quindi non c'è il giorno in cui una delle due si ferma
 * indietro e nessuno se ne accorge, che è come si sbagliano i totali.
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
  // Il titolo è la sola riga che il modello legge prima di scegliere, e questo
  // non conteneva nessuna delle parole con cui la domanda arriva davvero —
  // «allievi», «studenti», «elenco», «classe». Intanto `corso.presenze` ne
  // aveva di più adatte e si prendeva la scelta, per poi pretendere un
  // `corsoId` che chi chiede non ha. Dice anche che cosa fa **senza
  // parametri**, che è il modo in cui va chiamata la prima volta.
  titolo: 'Elenco degli allievi (studenti) con assenze: quante ne ha ciascuno e chi supera la soglia. ' +
    'Di una classe, o di tutte le classi dell’anno se non si passa niente',
  idempotente: true,
  ingresso: oggetto({
    classeId: opzionale(identificatore({ aiuto: 'Solo le persone di questa classe' })),
    corsoId: opzionale(identificatore({ aiuto: 'Solo le assenze fatte in questo corso' })),
    allievoId: opzionale(identificatore({ aiuto: 'Una persona sola, per confrontarla con le altre' })),
    ...stati('il conto'),
    soglia: opzionale(numero({
      minimo: 0,
      massimo: 100,
      aiuto: 'La percentuale oltre cui si è «oltre soglia». In cifra tonda: 20 è il venti ' +
        'per cento. Senza, quella del registro',
    })),
    // Il filtro che dà il nome a questa lettura. Acceso di suo: chi chiede
    // «chi ha assenze» non vuole in mezzo venticinque righe a zero, e chi
    // guarda la classe intera lo spegne di proposito.
    conAssenze: opzionale(booleano({
      aiuto: 'Falso per avere anche chi non ne ha nessuna. Senza, solo chi ne ha',
    })),
    soloOltreSoglia: opzionale(booleano({
      aiuto: 'Vero per avere solo chi supera la soglia: è l’elenco di chi va seguito',
    })),
    ritirati: opzionale(booleano({ aiuto: 'Vero per contare anche chi non frequenta più' })),
    archiviate: opzionale(booleano({ aiuto: 'Vero per guardare anche nelle classi archiviate' })),
    ordina: opzionale(scelta(ORDINI, {
      // La sigla si scioglie qui perché il catalogo che arriva al modello non
      // la spiega da nessun'altra parte: «ud» da solo è una parola che non
      // vuol dire niente a chi non ha aperto il registro.
      aiuto: 'Per «quota» (senza, è questo), per «ud» (unità didattiche contate) o per «nome»',
    })),
    ...periodo('le ore contate'),
    // Senza, i periodi sono tutti quelli che l'intervallo tocca e ciascuno
    // porta le sue cifre: restringere a uno è la domanda stretta — «com'è
    // andato il primo semestre» — non il modo normale di chiamare.
    ...periodoScelto('il conto'),
    ...ricerca('nome, classe o azienda', 'dic4a'),
    ...pagina(),
  }),
  uscita: oggetto({
    dal: testo(),
    al: testo(),
    // I periodi detti una volta sola, in cima: le righe dentro `persone`
    // portano lo stesso ordine e solo il `semestreId`, perché ripetere
    // etichetta ed estremi su ogni persona vorrebbe dire scrivere venticinque
    // volte due date che non cambiano — e questa busta la legge per primo un
    // modello a cui il JSON viene tagliato a seimila caratteri.
    periodi: elenco(oggetto(SCHEDA_PERIODO), {
      aiuto: 'I pezzi di tempo su cui si è contato a parte: uno per semestre, nell’ordine',
    }),
    stati: elenco(scelta(STATI_APPELLO), { aiuto: 'Le caselle che sono state contate' }),
    sogliaUsata: numero({
      aiuto: 'La percentuale oltre cui una riga è «oltre soglia»: 20 è il venti per cento',
    }),
    sogliaDelRegistro: numero({
      aiuto: 'Quella delle impostazioni, in cifra tonda: si vede se è stata scavalcata',
    }),
    ...CAMPI_CERCA,
    ...CAMPI_PAGINA,
    // I due conti d'insieme, sul periodo e non sulla pagina: sono la risposta
    // corta a «quanto è grave», e si leggono prima delle righe.
    conSegnalazioni: numero({ intero: true, aiuto: 'Quante persone ne hanno almeno una' }),
    oltreSoglia: numero({ intero: true, aiuto: 'Quante superano la soglia' }),
    guardate: numero({ intero: true, aiuto: 'Quante persone sono state guardate in tutto' }),
    // I quattro conti di quel che è rimasto fuori. Senza, una busta a zero
    // dice la stessa cosa in due casi opposti: «ho guardato e non c'è niente»
    // e «i filtri non mi hanno lasciato guardare niente». Il secondo caso è
    // quello che ha fatto rispondere «non ci sono assenze» su una classe che
    // ne aveva.
    corsiGuardati: numero({
      intero: true,
      aiuto: 'In quanti corsi si è contato. ZERO vuol dire che i filtri non hanno ' +
        'lasciato guardare niente: non è «nessuna assenza»',
    }),
    escluseSenzaAssenze: nullabile(numero({
      intero: true,
      aiuto: 'Quante persone restano fuori perché non ne hanno nessuna: con «conAssenze» a falso rientrano',
    })),
    ...CAMPI_ESCLUSI,
    persone: elenco(oggetto({
      allievoId: testo({ aiuto: 'Da passare a «persone.argomenti» per sapere che cosa ha perso' }),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo(),
      classeId: testo(),
      classe: testo(),
      attivo: booleano({ aiuto: 'Falso per chi si è ritirato: resta nel registro' }),
      ud: numero({ intero: true, aiuto: 'Unità didattiche (UD) nelle caselle contate' }),
      ore: numero({ intero: true, aiuto: 'Quante ore sono state toccate: non è lo stesso numero' }),
      udConAppello: numero({ intero: true, aiuto: 'Su quante unità didattiche qualcuno ha segnato qualcosa' }),
      udPreviste: numero({ intero: true, aiuto: 'Quante ne prevedeva il calendario nel periodo' }),
      quota: nullabile(numero({ aiuto: 'Sulle unità didattiche previste, da 0 a 1. Nulla se non ce n’erano' })),
      quotaSuAppello: nullabile(numero({
        aiuto: 'Sulle sole unità didattiche con l’appello fatto, da 0 a 1',
      })),
      oltreSoglia: booleano(),
      corsi: numero({ intero: true, aiuto: 'In quanti corsi diversi ha caselle contate' }),
      // Le stesse cifre, un pezzo di tempo per volta e nello stesso ordine di
      // `periodi` in cima. Gli aiuti qui sotto dicono solo quel che cambia
      // rispetto alla riga: il resto è già scritto qui sopra, e ripeterlo
      // raddoppierebbe il catalogo che il modello legge.
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: 'Quale periodo: l’id che sta in «periodi», in cima' }),
        ud: numero({ intero: true }),
        ore: numero({ intero: true }),
        udConAppello: numero({ intero: true }),
        udPreviste: numero({
          intero: true,
          aiuto: 'Quante ne prevedeva il calendario in QUESTO periodo: non il totale diviso',
        }),
        quota: nullabile(numero({ aiuto: 'Sulle previste di questo periodo, da 0 a 1' })),
        quotaSuAppello: nullabile(numero()),
        oltreSoglia: booleano({ aiuto: 'Se la quota di questo periodo supera la soglia, la stessa' }),
        corsi: numero({
          intero: true,
          aiuto: 'Corsi con caselle in questo periodo: la somma NON fa quello della riga, ' +
            'che è l’unione',
        }),
      }), { aiuto: 'Il conto spezzato per periodo: è qui che si vede chi è peggiorato' }),
    })),
  }),
  presentazione: {
    titolo: 'Chi ha assenze',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'stati', etichetta: 'Caselle contate', formato: 'elenco' },
          // In cifra tonda e non come quota: è un numero da 0 a 100, e
          // `formato: 'quota'` lo moltiplicava per cento — «Soglia 2000%»,
          // stampato in cima a una risposta per il resto giusta.
          { campo: 'sogliaUsata', etichetta: 'Soglia (%)', formato: 'numero' },
          { campo: 'guardate', etichetta: 'Persone guardate', formato: 'numero' },
          // Accanto alle persone guardate, i corsi: due zeri di fila sono il
          // modo in cui si vede a colpo d'occhio che la risposta non è «non
          // ce ne sono», ed è la riga che mancava a chi rileggeva la busta.
          { campo: 'corsiGuardati', etichetta: 'Corsi guardati', formato: 'numero' },
          { campo: 'conSegnalazioni', etichetta: 'Con almeno una', formato: 'numero' },
          { campo: 'oltreSoglia', etichetta: 'Oltre soglia', formato: 'numero' },
          // I tre conti di quel che è rimasto fuori: nulli quando non c'è
          // niente da dire, e allora il pannello non ne scrive la riga.
          { campo: 'escluseSenzaAssenze', etichetta: 'Senza assenze, fuori dal filtro', formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: 'In classi archiviate, fuori', formato: 'numero' },
        ],
      },
      // I periodi guardati, con gli estremi **veri** di ciascuno: è la
      // legenda delle cifre che stanno dentro le righe, e senza di lei
      // «sem-1» in una busta non vuol dire niente a chi legge.
      //
      // Qui si ferma quel che la presentazione sa fare: i conti per periodo
      // di **ciascuna persona** sono un array dentro un array, e nessuno dei
      // tre generi di blocco lo regge — `valori` legge una chiave sola,
      // `elenco` scrive stringhe, `tabella` scende di un livello solo. La
      // tabella per persona resta quindi sui totali, che è quel che era, e i
      // per-periodo viaggiano nella busta per chi la legge come dati.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: 'I periodi contati',
        colonne: [
          { campo: 'etichetta', testo: 'Periodo' },
          { campo: 'dal', testo: 'Dal', formato: 'data' },
          { campo: 'al', testo: 'Al', formato: 'data' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'nomeCompleto', testo: 'Persona' },
          { campo: 'classe', testo: 'Classe' },
          { campo: 'ud', testo: 'UD', formato: 'numero' },
          { campo: 'ore', testo: 'Ore', formato: 'numero' },
          { campo: 'quota', testo: 'Quota', formato: 'quota' },
          // Le due quote di semestre affiancate nella stessa cella: «4,2% · 24,0%».
          // È la colonna per cui questo raggruppamento esiste — un totale d'anno
          // che dice 14% non distingue chi è sempre stato così da chi ha smesso
          // di venire dopo gennaio, e distinguerli è l'unica ragione per guardare.
          { campo: 'periodi', dentro: 'quota', testo: 'Per semestre', formato: 'quota' },
          { campo: 'oltreSoglia', testo: 'Oltre soglia', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const chiesta = ingresso.classeId ? esigiClasse(ambito, ingresso.classeId) : null
    // Un id inventato è un errore, non un elenco vuoto. Senza questa riga
    // `allievoId` era il solo dei tre id a passare per un `.filter`, e un id
    // che non esiste tornava una busta buona con `persone: []` — che chi legge
    // riceve come «quella persona non ha assenze». La guardia è la stessa di
    // `persone.medie`, e il rimedio è già scritto dentro `esigiPersona`.
    if (ingresso.allievoId) esigiPersona(ambito, ingresso.allievoId)
    const corso = ingresso.corsoId ? esigiCorso(ambito, ingresso.corsoId) : null
    esigiCorsoDiClasse(r, corso, chiesta)

    const quali = statiScelti(ingresso.stati)
    const conta = (stato: StatoPresenza): boolean => quali.includes(stato)
    const soglia = ingresso.soglia ?? r.impostazioni.sogliaAssenza
    const { corrisponde, ignorato: cercaIgnorato } = filtroTesto(ingresso.cerca)

    // Le classi in cui si guarda: una, o tutte quelle dell'anno. Le archiviate
    // restano fuori se non le si chiede — sono anni finiti, e le loro assenze
    // non sono lavoro che qualcuno debba ancora fare — ma quante ne restano
    // fuori si conta **prima** di toglierle, o dopo non ci sono più.
    const candidate = r.classi
      .filter((classe) => !ingresso.classeId || classe.id === ingresso.classeId)
      .filter((classe) => !corso || classe.id === corso.classeId)
    const archiviateFuori = candidate.filter(
      (classe) => classe.archiviata && ingresso.archiviate !== true,
    )
    const classi = candidate.filter((classe) => ingresso.archiviate === true || !classe.archiviata)

    /** Le persone di una classe che l'ingresso nomina, prima dei filtri accesi di suo. */
    const nominate = (classe: Classe): Allievo[] =>
      classe.allievi.filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)
    const somma = (dove: Classe[], passa: (allievo: Allievo) => boolean): number =>
      dove.reduce((quante, classe) => quante + nominate(classe).filter(passa).length, 0)

    // I corsi in cui si è davvero contato, e i periodi davvero usati: due cose
    // che si sanno solo attraversando il ciclo, e che la busta rimanda perché
    // chi legge possa distinguere «non ho trovato» da «non ho guardato».
    const corsiGuardati = new Set<string>()
    const estremi: Array<{ dal: string, al: string }> = []
    // I periodi visti, in ordine e senza doppioni: le classi guardate possono
    // stare in anni diversi, e il `periodi` in cima è l'unione di quel che si
    // è spezzato. Con un anno solo — il caso di tutti i giorni — sono i suoi
    // due semestri e basta.
    const periodiVisti = new Map<string, Periodo>()

    const conti = new Map<string, Conto>()
    for (const classe of classi) {
      const persone = ordinaAllievi(
        ingresso.ritirati === true ? classe.allievi : allieviAttivi(classe),
      ).filter((allievo) => !ingresso.allievoId || allievo.id === ingresso.allievoId)

      const anno = annoDellaClasse(r, classe)
      // Il periodo di **questa** classe, spezzato sui suoi semestri da
      // `filters.ts` e non qui: è lo stesso conto di prima, tolto di mano alla
      // procedura perché la busta possa rimandare per costruzione quel che il
      // filtro ha usato. Un `semestreId` che quell'anno non conosce solleva di
      // là, e la busta non esce mai vuota per un id sbagliato.
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
          // Le annullate non contano per nessuno: un'ora che non si è tenuta
          // non è un'ora persa. Vale qui come in `persone.argomenti`.
          .filter((lezione) => lezione.stato !== 'annullata')

        // Un giro per periodo, e non un giro solo poi diviso: i periodi
        // partizionano l'intervallo — attigui per invariante, estremi
        // compresi — quindi ogni lezione cade in uno e uno soltanto, e le
        // somme tornano senza che nessuno le rimetta a posto.
        for (const pezzo of suoi) {
          const chiave = chiaveDi(pezzo)
          const lezioni = delCorso.filter(
            (lezione) => nelPeriodo(lezione.data, pezzo.dal, pezzo.al),
          )

          // Le UD previste vengono dall'orario, come nei rapporti: è il
          // denominatore che si consegna, e ricontarlo sulle ore a calendario
          // direbbe una quota diversa da quella stampata sul foglio. Chiamata
          // **con gli estremi di questo periodo**: due semestri lunghi diverso
          // hanno due monte ore diversi, e spalmarne uno solo a metà darebbe
          // due quote che non tornano con nessun foglio.
          const previste = anno ? udPrevisteDaOrario(anno, suo, pezzo.dal, pezzo.al, r.lezioni) : 0
          const aCalendario = lezioni.reduce((somma, l) => somma + contaUd(l), 0)
          const monteOre = previste > 0 ? previste : aCalendario

          for (const conto of conti.values()) {
            if (conto.classe.id !== classe.id) continue
            const dentro = conto.periodi.get(chiave)
            if (dentro) dentro.udPreviste += monteOre
          }

          for (const lezione of lezioni) {
            const quante = contaUd(lezione)
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
          cognome: conto.allievo.cognome,
          nome: conto.allievo.nome,
          nomeCompleto: nomeCompleto(conto.allievo),
          classeId: conto.classe.id,
          classe: conto.classe.nome,
          attivo: conto.allievo.attivo,
          ud: udSegnalate,
          ore: sommaDi(pezzi, (pezzo) => pezzo.ore),
          udConAppello,
          udPreviste,
          quota,
          quotaSuAppello: aQuattroCifre(quotaAssenza(udSegnalate, udConAppello, false)),
          // Il confronto lo fa il dominio, con la scala del dominio: la soglia
          // è da 0 a 100, la quota da 0 a 1, e scriverlo qui una seconda volta
          // è già costato sette righe segnalate a nessuno. Con soglia a zero
          // nessuno è «oltre»: zero vuol dire «non segnalare», ed è così che
          // si spegne l'avviso nei rapporti.
          oltreSoglia: superaLaSoglia(soglia, quota),
          // L'**unione** dei corsi dei periodi, e non la somma: due semestri
          // della stessa materia sono un corso solo.
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
              // Sulla quota di questo periodo e con la stessa soglia: è la
              // colonna per cui il raggruppamento esiste, perché chi sfonda
              // nel primo semestre lo sfonda anche se l'anno lo diluisce.
              oltreSoglia: superaLaSoglia(soglia, sua),
              corsi: pezzo.corsi.size,
            }
          }),
        }
      })
      .filter((riga) => corrisponde([riga.nomeCompleto, riga.classe, conti.get(riga.allievoId)?.allievo.azienda ?? ''].join(' ')))

    const conSegnalazioni = righe.filter((riga) => riga.ud > 0).length
    const oltreSoglia = righe.filter((riga) => riga.oltreSoglia).length

    // Gli estremi **effettivi**: il minimo degli inizi e il massimo delle fini
    // fra le classi guardate. Le date ISO si ordinano come si succedono, e
    // senza nessuna classe guardata resta il periodo dell'anno in uso — che è
    // quel che si sarebbe guardato se un filtro non avesse chiuso la porta.
    //
    // Il ripiego si calcola **solo se serve**: `periodiDa` solleva su un
    // `semestreId` che non esiste, e chiamarla qui sempre vorrebbe dire
    // sollevare per l'anno in uso anche quando le classi guardate erano di un
    // altro anno e l'hanno già trovato, il loro semestre.
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
        // Per quota, dal peggio: chi guarda questa busta cerca chi sta
        // peggio, e trovarlo in fondo vuol dire scorrere venticinque righe.
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
      // Le persone che stanno in una classe archiviata tenuta fuori, contate
      // come sarebbero state contate: con lo stesso filtro dei ritirati qui
      // sopra, o il numero direbbe quante ne rientrerebbero con **due**
      // interruttori invece che con quello che nomina.
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
 * Come si nomina un periodo mentre si conta.
 *
 * L'id del semestre, quando c'è. Quando non c'è — l'anno senza semestri, dove
 * `periodiDa` torna un periodo solo con l'id vuoto — sono i suoi estremi: due
 * anni diversi, tutti e due senza semestri, darebbero altrimenti la stessa
 * chiave, e i conti dell'uno finirebbero sommati a quelli dell'altro senza che
 * niente lo dica.
 */
function chiaveDi (periodo: Periodo): string {
  return periodo.semestreId || `${periodo.dal}→${periodo.al}`
}

/** Un conto di periodo appena aperto: tutto a zero, il periodo dentro. */
function contoVuoto (periodo: Periodo): ContoPeriodo {
  return { periodo, udSegnalate: 0, udConAppello: 0, udPreviste: 0, ore: 0, corsi: new Set() }
}

/**
 * La somma di una cifra su tutti i periodi.
 *
 * Il totale della riga si ricava dai pezzi e non si accumula a parte: un
 * secondo accumulatore è una seconda strada per lo stesso numero, e prima o
 * poi una delle due resta indietro di un `continue`.
 */
function sommaDi (pezzi: readonly ContoPeriodo[], quale: (pezzo: ContoPeriodo) => number): number {
  return pezzi.reduce((somma, pezzo) => somma + quale(pezzo), 0)
}


/**
 * La quota, tagliata alla quarta cifra.
 *
 * Non è pignoleria estetica: `4 / 47` scritto per intero è
 * `0.08510638297872342`, diciannove caratteri, e ogni riga ne porta due. Chi
 * legge questa busta per primo è il modello dell'assistente, che di JSON ne
 * riceve seimila caratteri e poi viene tagliato — e trenta caratteri per riga
 * sono la differenza fra una ventina di righe e una ventina e mezzo: su una
 * classe da venticinque, fra vedere tutti e vedere fino alla lettera M.
 *
 * Quattro cifre sono lo 0,01% su una quota che si stampa come percentuale con
 * un decimale: niente che qualcuno possa leggere va perduto. Si taglia **qui**
 * e non in `quotaAssenza`, che la calcola anche per i rapporti stampati, dove
 * arrotondare vorrebbe dire cambiare un foglio che qualcuno firma.
 */
function aQuattroCifre (quota: number | null): number | null {
  return quota === null ? null : Math.round(quota * 10_000) / 10_000
}

/**
 * La classe come si legge nella riga.
 *
 * Con un corso chiesto ci si mette la materia accanto: la busta parla delle
 * assenze **in quel corso**, e una colonna che dice soltanto «I MEC A» si
 * rilegge il giorno dopo come se fossero tutte.
 */
function classeDettaDa (classe: string, materia: string | null | undefined): string {
  return materia ? `${classe} — ${materia}` : classe
}

