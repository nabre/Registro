// L'assistente: il registro che risponde a chi scrive una domanda in italiano.
//
// È un trasporto come il condotto, e sta qui per la stessa ragione: è un modo
// di *entrare* nel nucleo che non è una finestra. Il condotto traduce buste
// JSON-RPC; questo traduce una conversazione. Fra i due la differenza che conta
// non è il formato — è che dall'altra parte non c'è uno script che sa quel che
// vuole, c'è un modello che tira a indovinare. Tutto quel che segue discende da
// lì.
//
//   pagina (vista «Assistente»)
//      ↓  postMessage, busta `Conversazione` — vedi `protocol.ts`
//   main process (panels/panel.ts)
//      ├→ data/llm.ts → llamaCpp.ts: il .gguf caricato nel processo
//      ←  il modello chiama un attrezzo
//      ├→ questo file: whitelist, convalida, `chiama()`
//      └→ il risultato torna al modello → risposta finale
//
// ---------------------------------------------------------------- sicurezza
//
// **Solo le letture, e una pagina da aprire.** Il modello vede gli attrezzi
// costruiti dalle procedure con `genere: 'lettura'`, più quelle che dichiarano
// `assistente: true` — oggi `vista.apri`, e nient'altro. `usaAttrezzo()`
// ricontrolla *prima* di chiamare: la whitelist non è l'elenco che si è mandato,
// è il controllo che si fa al ritorno. Un modello che si inventa `presenze.riga`
// — cosa che i modelli fanno — riceve un errore e non una scrittura. Non c'è
// nessuna impostazione per allargare questo confine, e non è una dimenticanza:
// una scrittura decisa da un modello è una scrittura che nessuno ha chiesto, e
// nel registro di una classe non si disfa.
//
// La deroga vale per quel che **non tocca l'archivio**. Cambiare pagina si
// disfa con un clic, non lascia niente scritto da nessuna parte, ed è quel che
// separa un assistente da un manuale: chi chiede «fammi vedere le valutazioni
// della 4a» e riceve la spiegazione di dove cliccare chiude l'assistente.
//
// **Il genere è dichiarato dalla procedura, non da un secondo elenco** — e così
// la deroga. È la stessa scelta del condotto, e per la stessa ragione: un
// elenco a parte resterebbe indietro alla prima procedura nuova, e resterebbe
// indietro *nella direzione pericolosa*. Dichiarato dalla procedura, il valore
// assente vale `false`: quel che nasce, nasce fuori.
//
// ---------------------------------------------------------------- il contesto
//
// Al modello si dice **dove si sta guardando** prima che legga la domanda: la
// pagina, la scheda, le tendine, i filtri accesi, gli id già risolti. Senza,
// «quante ore ha perso la 4a» partiva senza la 4a — il modello chiamava un
// elenco, sceglieva una riga plausibile e rispondeva su un altro corso, che in
// un registro è indistinguibile da una risposta giusta finché non la si
// controlla. Lo compone il pannello (`assistente.contesto`), lo tiene l'host, e
// lo usano tutte e due le finestre: vedi `descriviContesto` più sotto.
//
// **La pagina non chiama niente.** Dal pannello parte una domanda in italiano e
// torna del testo; quali procedure siano esistite in mezzo il webview non lo
// decide e non lo può decidere. Il registro ha già un canale generico per il
// pannello — le `Domanda` di `protocol.ts` — ed è codice del registro che lo
// usa: questo non ci passa, perché quel che qui compone gli argomenti non è
// codice del registro.
//
// **Quel che esce non esce.** Fin qui le domande e i risultati — nomi, medie e
// assenze di persone minorenni — finivano dentro una `fetch` verso un servizio,
// e la difesa era che l'indirizzo predefinito fosse quello della macchina. Ora
// il modello è un file caricato in questo stesso processo: non c'è una
// richiesta da dirottare, non c'è un indirizzo da configurare male, e non c'è
// nessuna impostazione che possa far uscire di qui una conversazione.
//
// **Chi esegue è questo file, non la libreria.** `data/llamaCpp.ts` tiene il
// giro di attrezzi — è la libreria che sa in che formato un modello vuole
// sentirsi rispondere — ma la funzione che gli attrezzi eseguono gliela passa
// `conversa()` qui sotto, ed è `usaAttrezzo` che controlla il genere della
// procedura. La libreria chiama quel che le è stato dato; non può allargarlo.
//
// ------------------------------------------------------------- gli attrezzi
//
// Non sono scritti a mano da nessuna parte. Una procedura dichiara già il
// proprio ingresso con uno `Schema`, e `schemaJson()` lo sa stampare in JSON
// Schema — che è esattamente la forma che `/api/chat` vuole in `parameters`.
// Un attrezzo scritto a mano sarebbe una seconda verità da tenere allineata, e
// la seconda verità è quella che resta indietro.
//
// I nomi cambiano di un carattere: `corso.presenze` diventa `corso_presenze`.
// I punti nei nomi di funzione non sono vietati dal formato, ma una parte dei
// modelli li tratta come accesso a un campo e rispondono `corso` con dentro
// `presenze`. La traduzione sta in `api/tools.ts`, in un posto solo: la usano
// questo trasporto e il catalogo che la riga di comando si legge.

import { contestoDelRegistro } from '../../actions/assistant.js'
import type { Archivio } from '../../data/archive.js'
import type {
  ContestoAssistente, IdVisto, RisultatoAssistente, VoceContesto,
} from '../../protocol.js'
import {
  chatta,
  collegamento,
  conMotivo,
  type Attrezzo,
  type Battuta,
  type ChiamataAttrezzo,
  type Collegamento,
} from '../../data/llm.js'
import { daNomeFunzione, nomeFunzione, offribile } from '../tools.js'
import { registraTutte } from '../index.js'
import { chiama, procedura, procedure } from '../core.js'
import { impagina } from '../presentation.js'
import { schemaJson, type Forma } from '../schemas.js'

/**
 * Quanto di un risultato si rimanda al modello.
 *
 * `corso.presenze` di una classe da venticinque è una busta lunga: mandata
 * intera riempie la finestra di un modello da 8B e la conversazione perde il
 * proprio inizio — cioè le istruzioni. Tagliata, il modello risponde su quel
 * che ha visto e **sa di averne visto una parte**, che è la cosa che va detta.
 *
 * Il numero non si alza, e non è pigrizia: il contesto atterra fra 12288 e
 * 16384 token a seconda della memoria video, il catalogo degli attrezzi ne
 * prende già più della metà, e seimila caratteri sono circa 2200 token — cioè
 * tre letture di fila, che è il giro vero (guarda i corsi, scegline uno,
 * chiedine le presenze). Raddoppiarlo vorrebbe dire due letture invece di tre,
 * e alla terza `node-llama-cpp` non dice «non ci sta»: **cancella le chiamate
 * già fatte e i loro risultati**, cioè produce esattamente il falso negativo
 * che questo file esiste per impedire.
 *
 * Quel che si è corretto non è quindi il numero, è **come si taglia**: vedi
 * `accorcia` più sotto. Una riga di `persone.assenze` misura ormai fra i 400 e
 * i 500 caratteri — le quote sono arrotondate alla quarta cifra, ma ogni riga
 * porta anche le sue due voci di periodo — e in seimila ce ne stanno una
 * dozzina contro le cinquanta della pagina predefinita: una classe da
 * venticinque si taglia sempre. Va bene che si tagli, purché quel che arriva
 * resti leggibile e dica di essere una parte; il modo di far entrare più righe
 * è accorciarle, e quello si fa nella procedura, non qui.
 */
const LIMITE_RISULTATO = 6000

/**
 * Quante voci di un elenco si provano a mandare al massimo, prima ancora di
 * guardare quanto misurano.
 *
 * Il taglio vero lo decide `LIMITE_RISULTATO`; questo è il tetto dichiarato che
 * evita di mandare duecento righe corte solo perché ci starebbero. Al modello
 * non serve la tabella intera — quella arriva alla pagina per un'altra strada,
 * già impaginata — gli serve poter dire chi è il caso estremo.
 */
const VOCI_MASSIME = 50

// ------------------------------------------------------------ impostazioni

/**
 * Il collegamento al modello che risponde.
 *
 * Le chiavi — interruttore, modello, attesa — le legge `data/llm.ts`, che è
 * anche l'unico posto in cui il nome del modello viene risolto dentro la
 * cartella dei modelli: quel che sta scritto nelle impostazioni è un nome di
 * file, e un percorso messo a mano lì dentro non diventa un file che si apre.
 *
 * Il modello dell'OCR e questo non si toccano: sono due usi, due prefissi, due
 * interruttori. Chi guarda le scansioni con un modello che vede e conversa con
 * uno che ragiona non deve scegliere fra i due, e spegnerne uno non spegne
 * l'altro.
 *
 * Non c'è un `assistentePronto()` accanto: il motivo per cui non si può
 * chiedere niente — assistente spento, modello mai scaricato, file sparito
 * dalla cartella — lo compone `prontezza()` in `data/llm.ts`, uguale per tutti
 * gli usi, e `conMotivo` lo tira fuori quando serve: dopo un guasto, e non
 * prima di ogni giro.
 */
function collegamentoAssistente (segnale?: AbortSignal): Collegamento {
  return collegamento('assistente', segnale)
}

/**
 * Come l'assistente è collegato, per chi deve parlare al modello da fuori.
 *
 * Il condotto la pubblica sotto `$attrezzi` perché la riga di comando non può
 * leggere le impostazioni: non gira dentro Electron, e il nome del modello sta
 * nella configurazione dell'applicazione. Escono questi quattro campi e non il
 * `Collegamento` intero — il motore è un oggetto con dentro delle funzioni, e
 * non è una cosa che si mandi su un filo.
 */
export function comeCollegato (): {
  attivo: boolean
  motore: string
  modello: string
  attesaMs: number
} {
  const c = collegamentoAssistente()
  // Il nome del file e non il percorso: la riga di comando lo stampa in
  // testata, e il percorso intero direbbe a chi guarda dove abita chi lavora.
  return {
    attivo: c.attivo,
    motore: c.motore.nome,
    modello: c.modelloChiesto,
    attesaMs: c.attesaMs,
  }
}

// ------------------------------------------------------------- gli attrezzi

// Chi si può mettere in mano al modello lo dice `offribile()` in
// `api/tools.ts`, e lo dice per tutti: la finestra e la riga di comando.
// Scritta qui era una seconda verità — e le due dicevano davvero cose diverse.
// La si usa in due punti, e non è una ripetizione: `attrezzi()` per decidere
// che cosa *offrire*, `usaAttrezzo` per decidere che cosa *eseguire*. La
// whitelist vera è la seconda; la prima è un suggerimento.

/**
 * Gli attrezzi che il modello vede, costruiti dalle procedure di lettura.
 *
 * Il `titolo` della procedura diventa la descrizione dell'attrezzo: è già
 * scritto per chi non conosce il codice — è quel che dichiara `contract.ts` —
 * ed è per questo che non c'è una seconda frase da scrivere qui.
 */
export function attrezzi (): Attrezzo[] {
  registraTutte()
  return procedure()
    .filter((p) => offribile(p))
    .map((p) => ({
      nome: nomeFunzione(p.nome),
      descrizione: p.titolo,
      ingresso: schemaJson(perIlModello(p.ingresso.forma)),
    }))
}

/**
 * La stessa forma, senza i campi che non si mettono in mano al modello.
 *
 * Li marca il campo con `perAssistente: false` — vedi `soloDaFuori` in
 * `api/schemas.ts` — e qui si tolgono, una volta, nel punto in cui si decide che
 * cosa il modello vede. Non è una questione di permessi: quei campi restano nel
 * contratto, `$schema` li pubblica e la riga di comando li accetta. È una
 * questione di posto, perché il catalogo precede **ogni** domanda e la finestra
 * di contesto si misura a caratteri.
 *
 * Solo il primo livello: gli oggetti annidati negli ingressi delle letture sono
 * uno, e scendere vorrebbe dire una ricorsione scritta per un caso che non c'è.
 */
function perIlModello (forma: Forma): Forma {
  if (forma.genere !== 'oggetto') return forma
  const tenuti = Object.entries(forma.campi).filter(([, campo]) => campo.perAssistente !== false)
  return { ...forma, campi: Object.fromEntries(tenuti) }
}

// -------------------------------------------------------------- istruzioni

/**
 * Quel che il modello sa prima di leggere la domanda.
 *
 * Quattro cose e non un tema: **in che lingua si risponde**, **che cosa è**,
 * **che non può scrivere**, e **che non deve inventare cifre**. L'ultima è
 * quella che fa più danno: un modello a cui si chiede una media e che non ha
 * chiamato nessun attrezzo la produce lo stesso, plausibile e sbagliata, e in
 * un registro di classe una cifra plausibile e sbagliata è il guasto peggiore
 * che ci sia — si trascrive.
 *
 * ---------------------------------------------------------------- la lingua
 *
 * La prima riga e l'ultima dicono la stessa cosa, ed è voluto. I modelli che
 * girano qui sono piccoli e locali (`data/llamaCpp.ts`), addestrati per la
 * maggior parte in inglese, e **tornano all'inglese da soli**: non tanto sulla
 * prima risposta, quanto dopo un giro di attrezzi, quando fra la domanda e la
 * frase da scrivere si sono infilate delle buste di dati con dentro dei nomi di
 * campo. Una regola detta una volta sola, in mezzo a sessanta righe, è la prima
 * che scorre via.
 *
 * Perciò sta in testa — è la prima cosa che si legge — e si ripete in coda, che
 * è l'ultima riga prima del contesto, cioè la più vicina al punto in cui il
 * modello comincia a scrivere. Costa venti parole e toglie l'unico difetto che
 * rende inservibile a chi insegna una risposta per il resto giusta.
 *
 * Esportata per le prove, e non per comodità: la stessa scelta già fatta per
 * `descriviContesto` qui sotto, e per la stessa ragione — è un testo che decide
 * com'è fatta la risposta, e va esercitato direttamente invece che attraverso
 * un modello che nelle prove non si carica.
 */
export function istruzioni (): string {
  return [
    'Scrivi in italiano. Sempre, e ogni parola della risposta: anche se la domanda è in',
    'un’altra lingua, anche se quel che ti tornano gli attrezzi non lo è, anche dopo che',
    'hai letto dei dati. I nomi delle persone, delle classi e delle materie non si',
    'traducono: si scrivono come stanno nel registro.',
    '',
    'Sei l’assistente del Registro docenti, un registro di classe italiano. Rispondi a chi',
    'insegna, breve e asciutto: niente preamboli, niente scuse, e non ripetere la domanda.',
    '',
    'Per sapere che cosa c’è nel registro usa gli attrezzi che ti sono dati: sono le sole',
    'fonti che hai.',
    '',
    'Regole che non si scavalcano:',
    '— **Ogni nome e ogni cifra viene da una busta che hai appena letto, o non si scrive.**',
    '  Qui dentro e nell’elenco degli attrezzi non c’è nessun dato di questo registro: le',
    '  parole che ci trovi spiegano la forma di un campo, e nessuno si chiama come un',
    '  esempio scritto qui. Se un attrezzo non te l’ha data, di’ che non la sai e quale',
    '  attrezzo servirebbe.',
    '— Un elenco vuoto vuol dire che **quella ricerca** non ha trovato niente, non che il',
    '  registro sia vuoto: «zero corrispondono» e «zero ce ne sono» sono due fatti diversi.',
    '  Vale sul fatto e non sui nomi dei campi: se un conto qualunque della busta —',
    '  «guardate», «esclusiRitirati», «quante» o un altro —',
    '  è maggiore di zero e le righe sono zero, togli **un filtro per volta** e richiama.',
    '  Due sono',
    '  accesi da soli e tengono fuori delle persone — chi si è ritirato e le classi',
    '  archiviate si riaprono con «ritirati» e «archiviate» a vero, e nella risposta si dice',
    '  che quelle persone stanno lì.',
    '— «cerca» c’è su quasi ogni lettura e serve per **un nome o un pezzo di nome**, non per',
    '  dire che cosa vuoi elencare: per avere tutte le persone in formazione chiama',
    '  «persone_cerca» **senza** «cerca», non cercando «allievo». Lo stesso su ogni attrezzo.',
    '— Non puoi cambiare niente nel registro: puoi solo leggere, e portarlo su una pagina',
    '  con «vista_apri». Se ti si chiede di segnare, correggere o mandare qualcosa, apri la',
    '  pagina che serve e spiega il gesto: a farlo è chi insegna.',
    '',
    'Come si scrive una risposta con dei dati dentro:',
    '— **La tabella c’è già, sempre, per intero.** Il registro la disegna sotto la tua',
    '  risposta da sé: non la alleghi, non la offri, non la togli. Mai dire che l’elenco è',
    '  lungo o che lo puoi mostrare: chi chiede lo sta già guardando.',
    '— **Non ricopiarne le righe**: ribatterle non aggiunge niente e aggiunge il rischio di',
    '  una cifra sbagliata, che in un registro di classe si trascrive. Nominane una sola',
    '  quando è la risposta — il caso estremo, chi è oltre la soglia.',
    '— Questo non vuol dire rispondere di meno: la tabella mostra i dati, tu dici che cosa',
    '  vogliono dire — quante righe, chi sta peggio, se un semestre è andato peggio',
    '  dell’altro. Rimandare a un elenco invece di leggerlo non è una risposta. Due o tre',
    '  frasi, e basta.',
    '— I numeri si riportano come te li ha dati l’attrezzo, senza rifare i conti — le quote',
    '  hanno denominatori diversi e non si sommano — e ogni campo vuol dire quel che dice',
    '  il suo nome: «guardate» sono persone e non ore, «ud» sono unità didattiche e non',
    '  ore. Un campo che non sai che cosa sia non si nomina.',
    '— Rileggi la risposta prima di darla: non può dire una cosa e la contraria. «Sette',
    '  superano la soglia» in cima e «nessuno supera la soglia» in fondo vuol dire che la',
    '  prima frase è stata scritta senza guardare la colonna. Guarda la colonna.',
    '— Nomina le cose come si leggono — cognome e nome come stanno nel registro, «I MEC A',
    '  — Matematica» — e mai con un identificatore: quelli servono a te, non a chi legge.',
    '  Su una persona in formazione niente commenti alla sua situazione: il fatto, e basta.',
    '— Di’ sempre su che cosa sono i numeri di cui parli: «su 36 UD previste» e non «%»,',
    '  se l’attrezzo non ti ha dato una percentuale.',
    '',
    'Cambiare pagina:',
    '— «vista_apri» porta il registro su una pagina, con dentro la cosa da mostrare. Usala',
    '  quando chi chiede lo domanda, e quando la risposta è qualcosa da guardare: un’ora,',
    '  una classe, un momento di valutazione.',
    '— **Mai al posto di dati già letti**: quelli sono già disegnati sotto, e cambiare',
    '  pagina porta via chi legge da quel che stava guardando.',
    '— Non serve per leggere: gli attrezzi leggono senza spostare niente. Cambia pagina una',
    '  volta sola per risposta, e di’ sempre dove hai portato il registro.',
    '',
    'E la cosa che viene prima di tutte le altre: la risposta è in italiano.',
  ].join('\n')
}

// ------------------------------------------------- gli id già visti

/**
 * Quanti id ci si ricorda di aver visto, in una conversazione.
 *
 * Il tetto c'è perché questa lista finisce nel testo che precede **ogni**
 * domanda successiva, e un elenco che cresce a ogni lettura è un elenco che a
 * un certo punto si mangia il posto dei dati. Quaranta sono una classe intera
 * più i suoi corsi: oltre, chi chiede sta facendo un'altra domanda.
 */
const VISTI_MASSIMI = 40


/**
 * Da quale campo si legge il nome di un id, e come si chiama quella cosa.
 *
 * La convenzione c'è già in tutte le buste — `classeId` sta accanto a `classe`,
 * `corsoId` accanto a `corso` — e qui si dichiara invece di indovinarla, così
 * un campo che domani cambiasse nome fa cadere una prova (vedi
 * `tests/api/assistant.test.mjs`) e non smette in silenzio di essere
 * ricordato. `nomi` è in ordine: il primo campo che c'è vince.
 */
const DA_RICORDARE: Record<string, { cosa: string, nomi: readonly string[] }> = {
  allievoId: { cosa: 'allievo', nomi: ['nomeCompleto', 'allievo', 'nome'] },
  classeId: { cosa: 'classe', nomi: ['classe', 'nome'] },
  corsoId: { cosa: 'corso', nomi: ['corso', 'titolo', 'materia'] },
  lezioneId: { cosa: 'ora', nomi: ['titolo', 'argomento', 'data'] },
  materiaId: { cosa: 'materia', nomi: ['materia', 'nome'] },
  pianoId: { cosa: 'piano', nomi: ['piano', 'titolo', 'nome'] },
  valutazioneId: { cosa: 'momento di valutazione', nomi: ['titolo', 'valutazione'] },
}

/**
 * Gli id che una busta porta, con i loro nomi, per ricordarli al turno dopo.
 *
 * Scende dentro oggetti e elenchi perché è lì che stanno: una riga di
 * `persone.assenze` porta `allievoId` e `classeId` insieme, e una busta di
 * `persone.scheda` li porta uno per corso. Quel che non ha un nome leggibile
 * accanto si lascia stare: un id da solo, nel testo che il modello legge, è una
 * stringa che non gli dice niente e che gli costa contesto.
 */
export function idVisti (dati: unknown, dentro: IdVisto[] = []): IdVisto[] {
  if (Array.isArray(dati)) {
    for (const voce of dati) idVisti(voce, dentro)
    return dentro
  }
  if (typeof dati !== 'object' || dati === null) return dentro

  const riga = dati as Record<string, unknown>
  for (const [campo, come] of Object.entries(DA_RICORDARE)) {
    const id = riga[campo]
    if (typeof id !== 'string' || id === '') continue
    const nome = come.nomi
      .map((quale) => riga[quale])
      .find((valore): valore is string => typeof valore === 'string' && valore !== '')
    if (nome === undefined) continue
    if (!dentro.some((visto) => visto.id === id)) dentro.push({ id, nome, cosa: come.cosa })
  }
  for (const valore of Object.values(riga)) {
    if (typeof valore === 'object' && valore !== null) idVisti(valore, dentro)
  }
  return dentro
}

/**
 * Gli id già visti, come li legge il modello.
 *
 * Due righe, e la seconda conta quanto la prima. La prima dice **a che cosa
 * servono**: a non rifare una ricerca per nome che è già stata fatta. La
 * seconda dice **che cosa non sono**: una risposta. Un elenco di nomi messo
 * davanti a un modello piccolo è un invito a rispondere con quello — «gli
 * allievi della DIC4a sono questi» — senza aprire niente, e sarebbe una lista
 * di un turno fa consegnata come se fosse di adesso.
 *
 * Perciò si dice per esteso che qui non c'è nessuna cifra e che l'elenco non è
 * né completo né aggiornato: è una rubrica, non un registro.
 */
export function ricordaIdVisti (visti: readonly IdVisto[]): string {
  if (visti.length === 0) return ''
  const righe = visti.map((v) => `${v.nome} (${v.cosa}) = ${v.id}`)
  return [
    'Id già incontrati leggendo, in questa conversazione. Servono a **una cosa sola**: se la',
    'domanda nomina uno di questi, passa il suo id all’attrezzo invece di cercarlo di nuovo',
    'per nome.',
    '',
    'Non sono una risposta, e non si rispondono. Non è un elenco completo — è quel che si è',
    'guardato finora — non è aggiornato, e non c’è dentro nessuna cifra: quante assenze,',
    'quante prove e che media si rileggono sempre con un attrezzo, perché il registro cambia',
    'mentre parliamo. Se la domanda chiede chi c’è, apri un elenco: questa non è quella lista.',
    '',
    ...righe,
  ].join('\n')
}

/**
 * I più recenti, senza doppioni: quel che si porta al turno dopo.
 *
 * I nuovi vincono sui vecchi ed è voluto — chi ha appena guardato la DIC1a sta
 * parlando di quella, non della DIC4a di dieci minuti fa — e oltre il tetto si
 * perdono i più lontani, che sono anche quelli di cui è meno probabile che si
 * stia ancora parlando.
 */
export function ultimiVisti (prima: readonly IdVisto[], adesso: readonly IdVisto[]): IdVisto[] {
  const tutti = [...adesso, ...prima]
  const tenuti: IdVisto[] = []
  for (const visto of tutti) {
    if (tenuti.length >= VISTI_MASSIMI) break
    if (!tenuti.some((gia) => gia.id === visto.id)) tenuti.push(visto)
  }
  return tenuti
}

// ------------------------------------------------------------- il contesto

/**
 * Le scelte e i filtri, una riga ciascuno, con accanto che cosa si potrebbe
 * scegliere: «Corso: DIC4a · Matematica [cor-3] · si può scegliere: …».
 *
 * Le alternative sono la metà che mancava. Il contesto diceva *dove si è*, e
 * alla domanda che viene subito dopo — «e la terza?», «e nell'altro semestre?»
 * — il modello doveva chiamare un elenco e scegliere la riga che gli sembrava:
 * cioè indovinare di nuovo proprio quel che la barra ha già scritto. Con le
 * voci della tendina accanto, quella domanda si risolve senza una seconda
 * lettura, e «la terza» è la classe che si chiama così e non un'altra.
 *
 * Le alternative però hanno un tetto, ed è dichiarato. Una tendina delle classi
 * di un istituto vero ne tiene quaranta, e quaranta nomi con l'id accanto sono
 * più di mille caratteri per **una riga sola** del contesto. Quando il prompt di
 * sistema non ci sta, `node-llama-cpp` non dice che il catalogo è troppo grande:
 * **cancella le chiamate d'attrezzo già fatte e i loro risultati**, e il modello
 * risponde «non ho trovato niente» a una domanda che una risposta ce l'aveva. È
 * lo stesso spirito di `LIMITE_RISULTATO`: si taglia, e si dice di aver
 * tagliato — «e altre N» è quel che trasforma un elenco monco in un elenco di
 * cui si sa la lunghezza.
 */
const ALTERNATIVE_MASSIME = 12

function righeDi (voci: readonly VoceContesto[]): string[] {
  return voci.map((voce) => {
    // «dentro Classe» davanti al valore, perché la gerarchia si legge prima
    // del contenuto: chi legge deve sapere che quelle alternative sono
    // ristrette a quella scelta, non che sono tutte quelle che esistono. Un
    // elenco di corsi scritto senza dire «di questa classe» si legge come
    // l'elenco dei corsi, e la scelta di sopra non conta più niente.
    const gerarchia = voce.dentro ? ` (dentro ${voce.dentro})` : ''
    const scelto = `— ${voce.campo}${gerarchia}: ${voce.valore}${voce.id ? ` [${voce.id}]` : ''}`
    // Quella scelta non si ripete fra le alternative: è già scritta davanti, e
    // rileggerla in fondo alla riga fa sembrare che ce ne siano due uguali.
    const altre = (voce.opzioni ?? [])
      .filter((o) => o.valore !== voce.valore)
      .map((o) => `${o.valore}${o.id ? ` [${o.id}]` : ''}`)
    if (altre.length === 0) return scelto
    const quali = voce.dentro ? `si può scegliere, dentro ${voce.dentro}` : 'si può scegliere'
    // Tagliate, ma con il conto di quante ne restano: un elenco accorciato in
    // silenzio si legge come intero, e «la quarantesima classe» diventerebbe
    // una che non c'è.
    const mostrate = altre.slice(0, ALTERNATIVE_MASSIME)
    const coda = altre.length > mostrate.length
      ? `, e altre ${altre.length - mostrate.length} che si vedono nella tendina`
      : ''
    return `${scelto} · ${quali}: ${mostrate.join(', ')}${coda}`
  })
}

/**
 * Dove si sta guardando, detto al modello prima della domanda.
 *
 * È la metà che mancava. Una domanda a voce dà per scontato il contesto in cui
 * è fatta — «quante ore ha perso la 4a» detto dalla pagina di quel corso, nel
 * secondo semestre, vuol dire *quel* corso e *quel* periodo — e senza dirglielo
 * il modello chiamava un elenco, sceglieva una riga plausibile e rispondeva su
 * un altro corso. In un registro una risposta sicura sul corso sbagliato è
 * indistinguibile da una giusta finché non la si controlla.
 *
 * Va in una battuta di sistema **sua**, dopo le istruzioni e prima della
 * conversazione, e non appiccicata in coda alle regole: le istruzioni non
 * cambiano mai e il contesto cambia a ogni clic, e tenerli insieme vorrebbe
 * dire rimandare tutto da capo a ogni giro — con le regole che scorrono via per
 * prime quando la finestra del modello si riempie.
 *
 * Gli id ci sono accanto ai nomi perché sono due cose diverse e servono tutte e
 * due: «DIC4a · Matematica» è la parola con cui chi chiede ne parla, `cor-0003`
 * è quel che l'attrezzo vuole.
 *
 * Esportata per le prove, e non per comodità: è il testo che decide se una
 * risposta parlerà del corso che si sta guardando o di un altro, e un testo
 * così va esercitato direttamente — non attraverso una libreria che nelle
 * prove non carica nessun modello. È la stessa scelta già fatta per
 * `usaAttrezzo` qui sotto.
 */
/**
 * Quanti id dell'elenco a schermo si scrivono, prima di dire «e altri».
 *
 * Trecento persone visibili sono tremilacinquecento caratteri di soli
 * identificatori — più di quanto pesino tutte le istruzioni — dentro un prompt
 * di sistema che nel contesto ci sta appena. Quaranta bastano per «il terzo
 * della lista» e per «questi qui», che sono i due modi in cui quell'elenco si
 * usa; il conto intero resta scritto accanto, e con quello il modello sa di
 * star guardando una parte. Vedi `ALTERNATIVE_MASSIME`, stessa ragione.
 */
const ID_VISIBILI_MASSIMI = 40

/**
 * La classe dentro cui la barra mostra il corso scelto, quando il contesto lo
 * dice.
 *
 * Si ricava dalla gerarchia delle tendine e non da un campo: la voce «Corso»
 * dichiara `dentro: 'Classe'`, e quella «Classe» porta il proprio id. È l'unica
 * informazione sul corso che il contesto porti davvero — un `corsoClasseId` in
 * `riferimenti` non c'è — e per questo qui non si deduce niente di più di quel
 * che c'è scritto: dire «di un'altra classe» indovinandolo sarebbe peggio che
 * tacere.
 */
function classeDelCorsoScelto (c: ContestoAssistente): string | null {
  const corsoId = c.riferimenti.corsoId
  if (!corsoId) return null
  const voce = c.scelte.find((v) => v.id === corsoId)
  if (!voce?.dentro) return null
  return c.scelte.find((v) => v.campo === voce.dentro)?.id ?? null
}

export function descriviContesto (c: ContestoAssistente): string {
  const r = c.riferimenti
  const periodo = c.periodo
  const righe = [
    'Dove si sta guardando adesso, nel registro:',
    // Niente riga della pagina quando chi chiede l'ha spenta: è una parte del
    // contesto come le altre, e una riga che dicesse «pagina: non detta»
    // sarebbe un invito a chiedere quale — cioè il contrario di quel che ha
    // chiesto chi l'ha spenta. Il resto della busta resta e si legge da sé.
    ...(c.pagina ? [`— Pagina: ${c.pagina}${c.vista ? ` (vista «${c.vista}»)` : ''}`] : []),
    ...(c.scheda ? [`— Scheda aperta: ${c.scheda}`] : []),
    ...(c.sezione ? [`— Sezione aperta: ${c.sezione}`] : []),
    ...righeDi(c.scelte),
    ...(c.filtri.length > 0 ? ['Filtri accesi nella pagina:', ...righeDi(c.filtri)] : []),
    // Il periodo in date, e non il solo nome: è la riga che rende chiamabile
    // `corso.presenze`, che vuole `dal` e `al` e non sa niente di semestri.
    // Detto per nome soltanto, «rispondi sul periodo che si vede» era un
    // ordine che il modello non aveva modo di eseguire.
    ...(periodo
      ? [
          periodo.dal && periodo.al
            ? `— Periodo dei conti: ${periodo.etichetta}, dal ${periodo.dal} al ${periodo.al}.`
            : `— Periodo dei conti: ${periodo.etichetta}.`,
        ]
      // Niente riga: chi chiede ha spento quella parte nella testata, e una
      // riga che dicesse «periodo: non detto» sarebbe un invito a chiederlo.
      : []),
    `— Giorno mostrato: ${c.data}. Oggi è ${c.oggi}.`,
    ...(c.ricerca ? [`— Ricerca battuta: «${c.ricerca}»`] : []),
  ]

  // Gli id in **due gruppi e con due frasi diverse**, e non in un elenco piatto
  // con sopra scritto «passali agli attrezzi».
  //
  // Il guasto da cui questa divisione nasce: a «elenco degli allievi con
  // assenze» il modello riceveva otto id e un ordine incondizionato, aveva
  // davanti `persone_assenze` con quindici caselle da riempire, e li passava
  // tutti — `corsoId` compreso, che nessuno aveva nominato. La procedura
  // restringe in cascata, la busta tornava vuota, e la risposta era «non sono
  // state trovate assenze per nessun allievo»: una frase falsa che si legge
  // come vera, che è il modo peggiore di sbagliare in un registro.
  //
  // `annoId` e `classeId` dicono **dove si è** e restringono quel che una
  // domanda dà comunque per scontato. Gli altri dicono **che cosa è aperto**, e
  // aprire un corso non vuol dire che la domanda parli di quel corso: quelli si
  // passano solo se la domanda li nomina.
  //
  // `semestreId` è stato nel primo gruppo, e ci stava perché nessun attrezzo lo
  // accettava: era una riga di prosa senza effetto. Da quando le quattro
  // letture che contano nel tempo lo accettano, passarlo di suo vuol dire
  // rispondere su **mezzo anno** a chi ha chiesto dell'anno — «dal 31 agosto al
  // 22 gennaio» consegnato come se fosse tutto — ed è lo stesso guasto del
  // `corsoId`, con un altro id. Vale di più il contrario: quelle quattro
  // letture, senza `semestreId`, tornano i periodi **tutti, ciascuno a parte**,
  // che è più di quel che darebbe il filtro e non di meno.
  const nomi = (coppie: Array<[string, string | null]>): string[] =>
    coppie.filter(([, valore]) => valore !== null).map(([nome, valore]) => `${nome}=${valore}`)

  const suaClasse = classeDelCorsoScelto(c)
  const dove = nomi([['annoId', r.annoId], ['classeId', r.classeId]])
  const seNominata = [
    ...(r.corsoId
      ? [`corsoId=${r.corsoId}${suaClasse ? ` (della classe ${suaClasse})` : ''}`]
      : []),
    ...nomi([
      ['semestreId', r.semestreId], ['lezioneId', r.lezioneId], ['allievoId', r.allievoId],
      ['pianoId', r.pianoId], ['valutazioneId', r.valutazioneId],
    ]),
  ]

  if (dove.length > 0) {
    righe.push(
      `Gli id di dove si sta guardando, da passare quando la domanda non dice altro: ${dove.join(', ')}.`,
    )
  }
  if (seNominata.length > 0) {
    righe.push(
      `Questi altri sono quel che è aperto in cima, e si passano **solo se la domanda nomina quella cosa**: ${seNominata.join(', ')}.`,
      'Una domanda che dice «gli allievi», «la classe» o «chi ha assenze» senza nominare una',
      'materia o un corso **non prende corsoId**; una che non nomina una persona non prende',
      '«allievoId»; una che non nomina un semestre **non prende semestreId** — le letture',
      'che contano nel tempo, senza, rispondono per **tutti** i periodi, ciascuno a parte,',
      'ed è più di quel che il filtro darebbe. Un id in più non restringe un po’: restringe',
      'in cascata, e mezza risposta consegnata come intera non si distingue da una intera.',
    )
  }
  // Quando il corso in cima non è di quella classe — succede: nel pannello del
  // docente di classe la classe della barra e il corso del contesto vengono da
  // due strade diverse — i due id insieme non lasciano passare niente. Oggi le
  // due metà del contesto le compone la stessa funzione e non possono
  // divergere; il giorno in cui divergono, o in cui `riferimenti` porterà la
  // classe vera del corso, questa riga lo dice apertamente invece di lasciare
  // che il modello se ne accorga da un elenco vuoto.
  if (suaClasse && r.classeId && suaClasse !== r.classeId) {
    righe.push(
      `Attenzione: il corso scelto in cima è di un’altra classe (${suaClasse}) rispetto a`,
      `classeId=${r.classeId}: non passarli insieme, o non corrisponderà niente. Scegli`,
      'quello dei due di cui parla la domanda.',
    )
  }

  if (c.visibili) {
    const { cosa, quanti, ids, troncato } = c.visibili
    // Tagliati anche qui, e con il conto intero accanto: trecento id sono
    // tremilacinquecento caratteri di contesto, e il contesto che trabocca non
    // si vede — si vede una risposta che dice di non aver trovato niente. Vedi
    // `ID_VISIBILI_MASSIMI`.
    const mostrati = ids.slice(0, ID_VISIBILI_MASSIMI)
    const restano = troncato || mostrati.length < ids.length
    righe.push(
      `A schermo ci sono ${quanti} ${cosa}, già filtrati come si vedono: ` +
      `${mostrati.join(', ')}${restano ? `, e altri fino a ${quanti}` : ''}.`,
    )
  }

  righe.push(
    '',
    'Che cosa farne:',
    '— «questo corso», «la classe», «quest’ora», «questa persona» vogliono dire quel che è',
    '  scritto qui sopra: **quando la domanda le nomina**, passa quegli id agli attrezzi',
    '  invece di cercarli con un elenco. Quando non le nomina, quegli id non entrano nella',
    '  chiamata: sono il posto in cui si sta, non il filtro che si è chiesto.',
    '— Le scelte scendono per gradi: l’anno tiene le classi, la classe tiene i corsi, il corso',
    '  tiene le ore. «(dentro …)» dice da che cosa dipende una scelta, e le alternative',
    '  elencate sono soltanto quelle ammesse lì dentro. «E la terza?» vuol dire un’altra voce',
    '  dello stesso elenco, non una qualunque del registro.',
    ...(periodo?.dal && periodo.al
      ? [
          `— Quando un attrezzo chiede «dal» e «al», passa dal=${periodo.dal} e al=${periodo.al}:`,
          '  sono le date del periodo che si sta guardando, e il periodo non si passa per nome.',
          '  Una risposta sull’anno intero a chi sta guardando un semestre è una risposta sbagliata.',
        ]
      : periodo
        ? ['— Non c’è ancora un anno scolastico con delle date: non c’è nessun periodo da passare.']
        : []),
    '— Se l’elenco a schermo è ristretto, rispondi su quello e di’ che è quello che si vede.',
    // La regola che allarga, che qui non c'era. Le altre tre dicono tutte di
    // restringere — passa gli id, passa dal/al, rispondi su quel che si vede —
    // e un elenco di sole regole che restringono è un elenco che insegna a
    // restringere sempre. Il caso da cui nasce: «elenco degli allievi con
    // assenze» non nomina nessun corso, e la risposta giusta era sulla classe
    // intera, detta come tale.
    '— E la regola che va nell’altro senso: se la domanda non nomina né sottintende il corso',
    '  o la classe di qui, rispondi **in generale** — senza quei filtri — e dillo nella',
    '  risposta: «su tutto il registro», «su tutte le classi», «in tutti i corsi». Allargare',
    '  e dirlo è una risposta che chi legge può correggere con una parola; restringere senza',
    '  dirlo è una risposta sbagliata che si legge come giusta.',
    '— Dove c’è scritto «si può scegliere», quelle sono le altre voci della tendina che',
    '  chi chiede ha davanti: usa quegli id per rispondere su un altro corso, un’altra',
    '  classe o un altro periodo senza chiamare un elenco e senza chiedere quale sia.',
    '  Non cambiarli tu: le tendine le muove chi insegna, tu rispondi e basta.',
    '— Se la domanda riguarda qualcosa che in questa pagina non c’è, dillo: puoi aprirne',
    '  un’altra con «vista_apri», oppure chiedere di che corso o classe si parla.',
  )
  return righe.join('\n')
}

// ------------------------------------------------------------ l'esecuzione

/**
 * Che cosa dire a un modello che sbaglia **la stessa cosa** un'altra volta.
 *
 * Dal giornale, una conversazione vera: dieci `persone.scheda` di fila, tutte
 * `non-trovato`, tutte con un id inventato da capo. Il modello non stava
 * insistendo per testardaggine — riceveva «non trovata, forse è sparita», che
 * è una frase in cui l'unica strada che resta è riprovare. Il rimedio vero è
 * che la procedura dica dove si cerca (`errore.nonTrovato` prende un
 * `rimedio`), e questo è il secondo giro di rete: quando la stessa coppia
 * attrezzo–guasto torna, glielo si dice che è già successo.
 *
 * Si conta per **attrezzo e codice**, non per argomenti: dieci id diversi sullo
 * stesso attrezzo sono lo stesso errore dieci volte, ed è esattamente il caso
 * da prendere.
 *
 * ------------------------------------------------- un consiglio per ogni guasto
 *
 * Il racconto qui sopra è quello di `non-trovato`, e per quello il consiglio —
 * «prendi l'id da un attrezzo che elenca» — è giusto. Ma questa funzione la
 * chiama `rifiuta`, cioè **ogni** codice, e il più frequente non è quello: è
 * `ingresso-non-valido`, il modello che sbaglia la *forma* di un campo —
 * `soglia: 25` invece di `0.25`, `dal: "settembre"`, `quanti: 1000`. A quello
 * si diceva di non riprovare con un altro identificatore e di cercarne uno in
 * un elenco: un consiglio senza senso, che manda a chiamare l'attrezzo
 * sbagliato invece di correggere il campo — e l'attrezzo sbagliato è un altro
 * giro buttato su una finestra che ne regge tre.
 *
 * Peggio faceva la quarta volta: «smetti di provare e rispondi». Su un id
 * inventato è la cosa giusta — non c'è niente da trovare e insistere è un giro
 * a vuoto — ma su un errore di forma il modello *può* riuscire al tentativo
 * dopo, e glielo si stava impedendo con un ordine. La frase che chi insegna si
 * è visto arrivare — «non sono state trovate assenze» — è la forma che un
 * modello piccolo dà a quell'ordine: gli si era detto di smettere e di dire che
 * cosa gli serviva, e lui ha detto quel che sapeva dire.
 *
 * Perciò: si ramifica sul codice, e **«basta, smetti» non si dice mai su un
 * errore di ingresso**. La resa si ordina solo dove riprovare non può
 * funzionare.
 */
function insisti (
  ricadute: Map<string, number> | undefined,
  nome: string,
  codice?: string,
): string {
  if (!ricadute) return ''
  const chiave = `${nome}|${codice ?? 'ignoto'}`
  const quante = (ricadute.get(chiave) ?? 0) + 1
  ricadute.set(chiave, quante)
  if (quante < 2) return ''
  const volte = `«${nome}» ha già risposto così ${quante} volte in questa conversazione.`

  // La forma di un campo: il messaggio del nucleo dice già quale e come lo
  // vuole, e qui si dice soltanto di rileggerlo e di correggere **quello**.
  // Nessun invito a cambiare attrezzo: cambiare attrezzo non aggiusta un campo.
  if (codice === 'ingresso-non-valido') {
    return (
      `\n\n[${volte} Non è l’attrezzo a essere sbagliato: è un campo. Il messaggio qui ` +
      'sopra dice quale e in che forma lo vuole. Rifai **questa stessa chiamata** con ' +
      'quel campo corretto — una quota si scrive 0.25 e non 25, una data si scrive ' +
      '2027-02-01 e non «settembre» — e lascia fuori del tutto i campi che non ti servono. ' +
      'Non cambiare attrezzo: nessun altro risponde a questa domanda.]'
    )
  }

  // Una scrittura: non c'è nessun giro che la faccia passare, e insistere è
  // l'unica cosa che di sicuro non serve.
  if (codice === 'non-permesso') {
    return (
      `\n\n[${volte} L’assistente può soltanto leggere, e nessun tentativo cambierà ` +
      'questo. Non riprovare: rispondi a parole, di’ quale gesto lo farebbe e in quale ' +
      'pagina si fa, ed eventualmente portaci il registro con «vista_apri».]'
    )
  }

  // L'id inventato e l'attrezzo inventato: qui riprovare **non può** riuscire,
  // e dopo quattro giri la resa è il consiglio giusto.
  if (codice === 'non-trovato' || codice === 'procedura-sconosciuta') {
    if (quante < 4) {
      return (
        `\n\n[${volte} ` +
        'Non riprovare con un altro identificatore: prendilo da un attrezzo che elenca o cerca, ' +
        'oppure chiedi a chi ti sta parlando di quale si tratta.]'
      )
    }
    return (
      `\n\n[Basta con «${nome}»: ${quante} tentativi, sempre lo stesso esito. ` +
      'Smetti di provare e rispondi dicendo che cosa ti serve sapere per continuare.]'
    )
  }

  // Tutti gli altri — `non-disponibile`, `conflitto`, quel che verrà: si dice
  // il fatto e non si ordina niente, perché non si sa che cosa consigliare e un
  // consiglio a caso è quello che manda il modello dalla parte sbagliata.
  return (
    `\n\n[${volte} Ripeterla uguale darà lo stesso esito: cambia quel che passi, ` +
    'oppure rispondi con quel che hai già letto dicendo che cosa non sei riuscito a sapere.]'
  )
}

/**
 * Quel che un attrezzo aveva sbagliato, dimenticato appena riesce.
 *
 * Il conto serve a riconoscere un **giro a vuoto**, e un giro a vuoto è fatto
 * di tentativi che falliscono di fila. «Sbaglio, sbaglio, riesco, sbaglio»
 * arrivava a quattro e si sentiva ordinare di smettere, benché la strada buona
 * fosse già stata trovata una volta: il conto non si azzerava mai, nemmeno
 * dopo una chiamata riuscita dello stesso attrezzo.
 *
 * Si azzerano tutti i codici di quell'attrezzo e non solo quello appena
 * riuscito: una chiamata andata bene dice che il modello ha capito come si
 * chiama, e i tentativi di prima non sono più la prova di niente.
 */
function dimentica (ricadute: Map<string, number> | undefined, nome: string): void {
  if (!ricadute) return
  for (const chiave of [...ricadute.keys()]) {
    if (chiave.startsWith(`${nome}|`)) ricadute.delete(chiave)
  }
}

/**
 * Gli argomenti di una chiamata, districati.
 *
 * Arrivano in due forme e tutte e due sono normali: un oggetto già decodificato
 * — la libreria costruisce una griglia sullo schema, quindi quasi sempre è
 * questo — o una stringa JSON. Quel che JSON non è diventa un errore che
 * **torna al modello**, non un'eccezione: un modello a cui si dice che cosa ha
 * sbagliato quasi sempre riprova giusto, e uno a cui si chiude la conversazione
 * in faccia non impara niente.
 *
 * Le quattro storture che un modello produce quando **non** c'è una griglia a
 * tenerlo dritto si districano invece di diventare un errore: il testo attorno
 * al JSON («Ecco la chiamata: {…}»), il recinto ` ```json `, la doppia codifica
 * — una stringa che contiene una stringa che contiene l'oggetto — e l'oggetto
 * solo dentro un array. Oggi non capitano, perché `perGriglia` genera già la
 * forma giusta; capitano il giorno in cui qualcuno collega un motore che la
 * griglia non ce l'ha, ed è un giorno previsto: `Motore.chatta` è un punto di
 * estensione dichiarato in `data/llm.ts`. Tre righe difensive costano meno di
 * una conversazione che si rifiuta per una spaziatura, e senza di loro il
 * commento qui sopra prometteva una tolleranza che il codice non aveva.
 */
type Argomenti = { ok: true, valore: unknown } | { ok: false, perche: string }

/**
 * Il JSON dentro una stringa che ne contiene anche dell'altro.
 *
 * Prima si prova la stringa intera — è il caso normale e non deve costare
 * niente — e solo se non passa si va a cercare la prima parentesi e l'ultima.
 * Cercarle sempre vorrebbe dire accettare come argomenti un pezzo di frase che
 * per caso contiene delle graffe.
 */
function jsonDentro (testo: string): { ok: true, valore: unknown } | { ok: false } {
  try {
    return { ok: true, valore: JSON.parse(testo) as unknown }
  } catch {
    // Non è JSON da sola: forse lo è un pezzo. Vedi sotto.
  }
  const inizio = testo.search(/[{[]/)
  const fine = Math.max(testo.lastIndexOf('}'), testo.lastIndexOf(']'))
  if (inizio >= 0 && fine > inizio) {
    try {
      return { ok: true, valore: JSON.parse(testo.slice(inizio, fine + 1)) as unknown }
    } catch {
      // Nemmeno quello: è un errore da rimandare al modello, non un'eccezione.
    }
  }
  return { ok: false }
}

function argomenti (grezzi: unknown): Argomenti {
  if (grezzi === undefined || grezzi === null) return { ok: true, valore: {} }
  if (typeof grezzi === 'object' && !Array.isArray(grezzi)) return { ok: true, valore: grezzi }
  // Un array di un oggetto solo: lo scrivono i modelli che hanno imparato le
  // chiamate parallele e le usano anche quando la chiamata è una.
  if (Array.isArray(grezzi) && grezzi.length === 1) return argomenti(grezzi[0])
  if (typeof grezzi === 'string') {
    const testo = grezzi.trim()
    if (testo === '') return { ok: true, valore: {} }
    const letto = jsonDentro(testo)
    if (!letto.ok) return { ok: false, perche: 'Gli argomenti non sono JSON valido.' }
    // Una stringa dentro la stringa, o un array attorno all'oggetto: si ripassa
    // da capo. Ogni giro districa uno strato e ne resta sempre uno in meno,
    // quindi si ferma — su una stringa che non è JSON, al giro dopo.
    if (typeof letto.valore === 'string' || Array.isArray(letto.valore)) {
      return argomenti(letto.valore)
    }
    if (typeof letto.valore !== 'object' || letto.valore === null) {
      return { ok: false, perche: 'Gli argomenti devono essere un oggetto JSON.' }
    }
    return { ok: true, valore: letto.valore }
  }
  return { ok: false, perche: 'Gli argomenti devono essere un oggetto JSON.' }
}

/**
 * I `null` che la griglia costringe il modello a scrivere, tolti di mezzo.
 *
 * ------------------------------------------------------------- che cosa succede
 *
 * La griglia di `node-llama-cpp` — la grammatica che durante la generazione
 * lascia passare soltanto un JSON della forma giusta — **esige tutte le
 * proprietà che dichiara**: `required` si può scrivere nello schema e non ha
 * effetto, sta scritto nei tipi della libreria. Un attrezzo con quattro filtri
 * opzionali è quindi un attrezzo che il modello deve riempire in quattro punti
 * anche quando non vuole filtrare niente, e `perGriglia` gli dà l'unica uscita
 * che la griglia conosce: `oneOf: [null, …]`, cioè «o un valore, o niente».
 *
 * Quel «niente» arriva qui come `null`, e il nucleo lo rifiuta — giustamente:
 * un campo opzionale si omette, non lo si mette a `null`. Il risultato, prima
 * di questa funzione, era che quasi **ogni** chiamata del modello tornava
 * indietro con «annoId: Serve un identificatore. cerca: Serve del testo.» per
 * dei campi che il modello non voleva usare. Non si vedeva un attrezzo rotto:
 * si vedeva un assistente che chiama due procedure, le prende rifiutate tutte
 * e due, e poi **inventa la risposta** — che è il guasto peggiore che questo
 * file esiste per impedire.
 *
 * ------------------------------------------------------------- perché non altrove
 *
 * Non in `perGriglia`: là non c'è niente da cambiare, perché la griglia non sa
 * fare un campo facoltativo e `oneOf: [null, …]` è la traduzione giusta. Non in
 * `data/llm.ts`: là è scritto, ed è la regola che tiene separati quei due file,
 * che decidere che cosa sia un argomento accettabile per una procedura del
 * registro è mestiere di chi esegue. Chi esegue è questo file.
 *
 * ------------------------------------------------------------- e i null veri
 *
 * `null` non è sempre di troppo: un campo `nullabile()` lo accetta come valore,
 * e per quelli `null` vuol dire «qui non c'è», che è un fatto e non un silenzio.
 * Si riconoscono dallo schema — `schemaJson` li stampa `type: ["string",
 * "null"]` — e si lasciano stare. Togliere un `null` legittimo vorrebbe dire
 * cambiare quel che il modello ha chiesto, ed è esattamente quel che questa
 * funzione non deve fare.
 *
 * Si scende anche negli oggetti annidati, perché la griglia li obbliga allo
 * stesso modo: un ingresso con dentro un oggetto ha lo stesso problema un
 * gradino più giù, e mezza pulizia sarebbe una pulizia che non si vede.
 *
 * Esportata per le prove, e non per comodità: oggi nessuna lettura ha un campo
 * `nullabile()` nell'ingresso, quindi la metà che *conserva* i `null` non si
 * può esercitare attraverso un attrezzo vero — e senza una prova diretta
 * resterebbe una promessa che si scopre rotta il giorno in cui quella lettura
 * viene scritta. È la stessa scelta già fatta per `usaAttrezzo` e
 * `descriviContesto`.
 */
export function senzaNulliDiTroppo (valore: unknown, schema: unknown): unknown {
  if (Array.isArray(valore)) {
    const dentro = (schema as { items?: unknown } | null)?.items
    // I `null` **dentro** un elenco sono lo stesso silenzio un piano più giù, e
    // sopravvivevano: `stati: [null]` arrivava al nucleo e si faceva rifiutare
    // con «voce 1: Serve una scelta» — per una casella che il modello non
    // voleva riempire. Si tolgono, a meno che le voci di quell'elenco non
    // ammettano `null` come valore, che è la stessa regola dei campi.
    return valore
      .filter((voce) => voce !== null || ammetteNiente(dentro))
      .map((voce) => senzaNulliDiTroppo(voce, dentro))
  }
  if (typeof valore !== 'object' || valore === null) return valore

  const forme = ((schema as { properties?: Record<string, unknown> } | null)?.properties) ?? {}
  const pulito: Record<string, unknown> = {}
  for (const [chiave, dato] of Object.entries(valore as Record<string, unknown>)) {
    const forma = forme[chiave]
    if (dato === null && !ammetteNiente(forma)) continue
    pulito[chiave] = senzaNulliDiTroppo(dato, forma)
  }
  return pulito
}

/**
 * Se per quel campo `null` è un valore e non un silenzio.
 *
 * Tre casi e non due. `type: ["string", "null"]` è quel che `schemaJson`
 * stampa per un `nullabile()`; `type: "null"` è un campo che *solo* `null`
 * accetta; e una forma **senza `type`** è quel che stampa `qualunque()`, che
 * accetta tutto, `null` compreso — sta scritto in `schemas.ts`, dove il ramo
 * `qualunque` torna il solo `description`. Quest'ultimo tornava `false`, cioè
 * il `null` veniva tolto da un campo che lo accetta: è la metà gemella del
 * caso per cui questa funzione esiste, e sbagliata nella stessa direzione —
 * si cambia quel che il modello ha chiesto.
 *
 * Una forma che non c'è resta `false`, ed è un'altra cosa: un campo che lo
 * schema non dichiara non è un campo che accetta tutto, è un campo di troppo.
 * Quelli li prende `chiaviEstranee`.
 */
function ammetteNiente (forma: unknown): boolean {
  if (typeof forma !== 'object' || forma === null) return false
  if (!('type' in forma)) return true
  const tipo = (forma as { type?: unknown }).type
  return Array.isArray(tipo) ? tipo.includes('null') : tipo === 'null'
}

/**
 * I campi che la procedura non ha mai dichiarato, presi prima che spariscano.
 *
 * `oggetto()` scarta in silenzio le chiavi che non conosce. Per del codice è
 * una tolleranza voluta — è quel che lascia parlare un pannello più nuovo con
 * un host più vecchio, e il campo in più è un campo che *esisterà* — ma chi
 * compone gli argomenti qui non è codice: è un modello che tira a indovinare i
 * nomi. Chi scrive `{"classe": "I MEC A", "conAssenze": true}` invece di
 * `classeId` non riceve nessun errore, riceve **il registro intero**, e ci
 * scrive sopra una risposta sicura; chi scrive `corsoID` invece di `corsoId`
 * ottiene la stessa cosa nella direzione opposta. Nessuna delle due si vede: si
 * vede una risposta plausibile sulla domanda sbagliata.
 *
 * Perciò per l'assistente si è severi dove il protocollo è tollerante, e il
 * posto è questo per la stessa regola scritta in `senzaNulliDiTroppo`: decidere
 * che cosa sia un argomento accettabile per una procedura del registro è
 * mestiere di chi esegue. Non ci si regola su `additionalProperties`, che dice
 * un'altra cosa — da quando racconta quel che il runtime fa davvero, vale
 * `true` su ogni `oggetto()` tollerante — ma sull'unico fatto che serve: quel
 * nome, nella forma dichiarata, non c'è.
 *
 * Si guarda solo il primo piano, dove i filtri stanno, e solo dove la forma
 * dichiara dei campi: una forma che non ne nomina nessuno non ha niente da cui
 * dire che una chiave è di troppo.
 */
function chiaviEstranee (valore: unknown, schema: unknown): string[] {
  if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) return []
  const forma = schema as { properties?: Record<string, unknown> } | null
  const ammesse = Object.keys(forma?.properties ?? {})
  if (ammesse.length === 0) return []
  return Object.keys(valore).filter((chiave) => !ammesse.includes(chiave))
}

/**
 * Il campo che il modello voleva dire, quando si riesce a indovinarlo.
 *
 * Due sole somiglianze, e tutte e due sono quelle che i modelli producono
 * davvero: la maiuscola sbagliata (`corsoID` per `corsoId`) e il nome senza il
 * suffisso (`classe` per `classeId`). Più in là non si va: un suggerimento
 * preso a caso manda il modello a filtrare per un campo che non c'entra, che è
 * peggio del non suggerire niente. Senza un candidato resta l'elenco dei campi
 * veri, che è comunque tutto quel che serve per riscrivere la chiamata.
 */
function forseVolevi (chiave: string, ammesse: readonly string[]): string | null {
  const bassa = chiave.toLowerCase()
  const uguale = ammesse.find((a) => a.toLowerCase() === bassa)
  if (uguale) return uguale
  if (bassa.length < 3) return null
  return ammesse.find((a) => {
    const sua = a.toLowerCase()
    return sua.startsWith(bassa) || bassa.startsWith(sua)
  }) ?? null
}

/** Il rifiuto che spiega, con dentro il nome giusto quando si sa qual è. */
function spiegaEstranee (
  attrezzo: string,
  estranee: readonly string[],
  schema: unknown,
): string {
  const ammesse = Object.keys((schema as { properties?: Record<string, unknown> }).properties ?? {})
  const dette = estranee.map((chiave) => {
    const forse = forseVolevi(chiave, ammesse)
    return `il campo «${chiave}» non esiste su «${attrezzo}»${forse ? `; forse volevi «${forse}»` : ''}`
  })
  return (
    `${dette.join('. ')}. I campi di questo attrezzo sono: ${ammesse.join(', ')}. ` +
    'Rifai la chiamata con i nomi giusti, e senza i campi che non ti servono.'
  )
}

/**
 * I filtri che il modello ha lasciato vuoti, tolti invece che fatti rifiutare.
 *
 * Stessa radice dei `null` di `senzaNulliDiTroppo`: la griglia rende
 * obbligatoria ogni proprietà dichiarata, e con quindici caselle da riempire un
 * modello da 7B riempie quel che può — `cerca: ""`, `stati: []`, un oggetto
 * senza niente dentro. Il `null` era l'uscita che la griglia offre; questi sono
 * l'uscita che il modello si inventa quando quella non gli basta, e costano
 * uguale: `stati: []` torna dal nucleo come «L'elenco deve avere almeno 1
 * voci.», `cerca: ""` arriva a `filtroTesto` come una ricerca vera e non
 * filtra niente ma *dice* di filtrare.
 *
 * **Solo i campi facoltativi.** Un campo che lo schema dichiara obbligatorio e
 * che arriva vuoto è uno sbaglio del modello, non il rumore della griglia:
 * toglierlo vorrebbe dire trasformare «vista: """» in una chiamata senza
 * `vista`, cioè nascondere l'errore invece di raccontarlo. Il rifiuto del
 * nucleo, lì, è la risposta giusta.
 *
 * `da: 0` non si tocca, ed è voluto: zero è un valore legittimo — la prima
 * pagina — e vale esattamente quanto non passarlo. Togliere gli zeri perché
 * «sembrano vuoti» vorrebbe dire togliere anche `soglia: 0`, che è una domanda
 * vera («chi ha almeno un'assenza»).
 */
function senzaFiltriVuoti (valore: unknown, schema: unknown): unknown {
  if (typeof valore !== 'object' || valore === null || Array.isArray(valore)) return valore
  const forma = schema as { required?: unknown } | null
  const richiesti = Array.isArray(forma?.required) ? (forma.required as string[]) : []
  const pulito: Record<string, unknown> = {}
  for (const [chiave, dato] of Object.entries(valore as Record<string, unknown>)) {
    if (!richiesti.includes(chiave) && senzaNiente(dato)) continue
    pulito[chiave] = dato
  }
  return pulito
}

/** Un valore che c'è e non dice niente: testo vuoto, elenco vuoto, busta vuota. */
function senzaNiente (dato: unknown): boolean {
  if (typeof dato === 'string') return dato.trim() === ''
  if (Array.isArray(dato)) return dato.length === 0
  if (typeof dato === 'object' && dato !== null) return Object.keys(dato).length === 0
  return false
}

/**
 * Quanto può misurare un testo dentro una busta prima di essere accorciato.
 *
 * Non è il caso delle tabelle — quelle si accorciano a righe intere — è il caso
 * di `modelli.prova`, che torna un PDF in base64: un campo solo, lungo
 * centomila caratteri, che al modello non dice assolutamente niente. Tagliarlo
 * è l'unico modo di tenere la promessa di questa funzione, cioè che quel che
 * arriva al modello sia sempre JSON che si apre.
 */
const TESTO_MASSIMO = 1000

/**
 * Che cosa dire a chi ha ricevuto mezzo elenco.
 *
 * Non nomina più «da»: la pagina è uscita dal catalogo del modello — vedi
 * `perIlModello` — perché due campi su dieci letture valevano duemila caratteri
 * di contesto. Consigliare un campo che nel suo elenco non c'è più vorrebbe
 * dire mandarlo a comporre una chiamata che il nucleo rifiuta, e poi a
 * chiedersi perché.
 *
 * Quel che resta gli basta: i conti d'insieme sono tutti nella busta e il
 * taglio non li tocca mai, quindi «ventisei su quarantasette» lo può dire
 * comunque, e restringere con un filtro che la domanda nomina è la strada che
 * porta a una risposta invece che a una pagina.
 */
const AVVISO_ACCORCIATO =
  'Elenco accorciato per farlo stare nella tua finestra: i campi d’insieme ci sono tutti ' +
  'e valgono su tutte le righe, le righe no — dì quante ne hai viste su quante ce n’erano. ' +
  'Per vederne di più restringi con un filtro che la domanda nomina. Non accorciare il ' +
  'periodo: su una domanda di assenze guardare meno giorni vuol dire trovarne meno, non ' +
  'vederle meglio.'

/**
 * La busta rimandata al modello, accorciata **per voci intere**.
 *
 * ----------------------------------------------------------------- il guasto
 *
 * Prima si tagliava la stringa a `LIMITE_RISULTATO` caratteri, e il taglio
 * cadeva dove capitava: a metà di un numero (`…,"quota":0.085714285`), a metà
 * di un cognome (`{"righe":[{"cognome":"Ross`). Quel che arrivava al modello
 * era JSON rotto più un avviso, e un modello piccolo che non riesce ad aprire
 * la busta non dice «non ho capito la busta»: ricade sulla frase più sicura che
 * conosce, che è «non ho trovato niente». La tabella intera intanto era già
 * sotto gli occhi di chi aveva chiesto — arriva alla pagina per un'altra strada
 * — e diceva il contrario.
 *
 * ----------------------------------------------------------------- il rimedio
 *
 * Si mandano **tutti i campi d'insieme** — `quante`, `guardate`, `oltreSoglia`,
 * `dal`, `al`, la soglia usata: sono quelli che rispondono a «quanti sono» e
 * valgono su tutte le righe — più le prime N righe, con il conto onesto di
 * quante se ne vedono su quante ce n'erano. Al modello non serve la tabella
 * intera: gli serve poter dire chi è il caso estremo, e le righe arrivano già
 * ordinate dalla procedura.
 *
 * N non è un numero scritto qui: è il più grande che ci sta. Si prova a
 * scendere finché la busta non entra nel limite, così una lettura di righe
 * corte ne manda cinquanta e una di righe lunghe quindici, invece di
 * accontentarsi del peggio delle due.
 *
 * Il consiglio che accompagna il taglio è cambiato con il taglio. Diceva
 * «restringi la domanda, per esempio con un periodo più corto», che su una
 * domanda di assenze vuol dire *guarda meno giorni*, cioè **trovane meno**: si
 * consigliava al modello di far sparire proprio quel che gli era stato chiesto
 * di cercare. Il rimedio vero — `da` e `quanti`, che ci sono su tutte le
 * letture paginate — non era nominato, e per questo quei due campi restano fra
 * quelli che il modello vede: sono la strada per la pagina dopo.
 */
function accorcia (dati: unknown): string {
  const intero = JSON.stringify(dati) ?? 'null'
  if (intero.length <= LIMITE_RISULTATO) return intero
  // Una busta che non è un oggetto non ha elenchi da accorciare. Non capita —
  // `uscita` è sempre un `oggetto()` — e se capitasse, una busta intera e
  // grande è comunque meglio di una busta spezzata a metà parola.
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) return intero

  const insieme: Record<string, unknown> = {}
  const elenchi: Array<[string, unknown[]]> = []
  for (const [chiave, dato] of Object.entries(dati as Record<string, unknown>)) {
    if (Array.isArray(dato)) elenchi.push([chiave, dato])
    else insieme[chiave] = senzaCoda(dato)
  }

  let ultima = ''
  for (const quante of [VOCI_MASSIME, 30, 20, 15, 10, 6, 4, 2, 1, 0]) {
    ultima = JSON.stringify(componi(insieme, elenchi, quante))
    if (ultima.length <= LIMITE_RISULTATO) return ultima
  }
  return ultima
}

/** Un testo lunghissimo — un PDF in base64 — accorciato dicendolo. */
function senzaCoda (dato: unknown): unknown {
  if (typeof dato !== 'string' || dato.length <= TESTO_MASSIMO) return dato
  return `${dato.slice(0, TESTO_MASSIMO)}… [accorciato: ${dato.length} caratteri in tutto]`
}

function componi (
  insieme: Record<string, unknown>,
  elenchi: ReadonlyArray<[string, unknown[]]>,
  quante: number,
): Record<string, unknown> {
  const busta: Record<string, unknown> = { ...insieme }
  const conti: Record<string, { mostrate: number, di: number }> = {}
  for (const [chiave, voci] of elenchi) {
    const prime = voci.slice(0, quante)
    busta[chiave] = prime
    if (prime.length < voci.length) conti[chiave] = { mostrate: prime.length, di: voci.length }
  }
  // Il conto sta **dentro** la busta e non in una riga appiccicata dopo: così
  // quel che il modello riceve resta un JSON solo, che si apre tutto intero, e
  // il fatto di averne visto una parte è un campo come gli altri invece di una
  // frase da notare in fondo.
  if (Object.keys(conti).length > 0) {
    busta.perIlModello = { avviso: AVVISO_ACCORCIATO, elenchi: conti }
  }
  return busta
}

/** Com'è andato un attrezzo: lo mostra la pagina mentre si aspetta. */
export interface AttrezzoUsato {
  /** Il nome della procedura, con il punto: `corso.presenze`. */
  nome: string
  ok: boolean
  /** Il codice dell'API quando non è andata: `non-trovato`, `rifiutato`… */
  codice?: string
  /**
   * Perché non è andata, con le parole che si leggono.
   *
   * Il codice dice il genere del guasto e basta. Questa è la frase del nucleo,
   * col rimedio dentro — «la classe non è in questo semestre», «le classi
   * dell'anno le elenca «classi.elenco»» — ed è la sola delle due che serva a
   * chi guarda la pagina. Finché non c'era, quella frase andava al modello e a
   * nessun altro: sullo schermo restava una pastiglia rossa con il motivo nel
   * solo attributo `title`, cioè invisibile a chi usa il trackpad e a chi si fa
   * leggere lo schermo.
   */
  messaggio?: string
}

/**
 * Esegue quel che il modello ha chiesto, e torna il testo da rimandargli.
 *
 * **Non solleva mai.** Ogni cosa che va storta — un attrezzo che non esiste,
 * una procedura che scrive, argomenti malformati, un rifiuto del nucleo —
 * diventa testo dentro la risposta. È l'unico modo in cui la conversazione può
 * continuare: un modello che riceve «non esiste» cambia strada, un modello che
 * non riceve niente resta fermo su quel che aveva immaginato.
 *
 * Esportata per le prove, e non per comodità: è **la riga che decide** se un
 * modello può scrivere nel registro di una classe, e una riga così va
 * esercitata direttamente — non attraverso una libreria che nelle prove non
 * carica nessun modello. È la stessa scelta già fatta per `permessoMancante`
 * nel condotto.
 */
export async function usaAttrezzo (
  archivio: Archivio,
  chiamata: ChiamataAttrezzo,
  tracciato = 'chat-prova',
  ricadute?: Map<string, number>,
  segnale?: AbortSignal,
): Promise<{
  testo: string
  usato: AttrezzoUsato
  risultato?: RisultatoAssistente
  /** Gli id che la busta portava, con i loro nomi. Vedi `idVisti`. */
  visti?: IdVisto[]
}> {
  // Il nome come il motore lo consegna, e non è detto che ci sia: una busta
  // senza `function.name` arriva davvero, e qui dentro non deve diventare
  // un'eccezione — `usaAttrezzo` non solleva mai. Vedi `rifiuta` qui sotto.
  const chiesto = typeof chiamata.nome === 'string' ? chiamata.nome : ''
  const rifiuta = (nome: string, perche: string, codice?: string) => ({
    testo: `Errore: ${perche}${insisti(ricadute, nome, codice)}`,
    // `perche` e non `testo`: a quest'ultimo è già attaccato l'`insisti(...)`,
    // che è un ordine scritto per il modello e non una frase da mostrare.
    usato: { nome, ok: false, ...(codice ? { codice } : {}), messaggio: perche },
  })

  if (chiesto === '') return rifiuta('(senza nome)', 'La chiamata non dice quale attrezzo usare.')

  const nome = daNomeFunzione(chiesto)
  if (!nome) {
    return rifiuta(
      // Con il punto, come `AttrezzoUsato.nome` dichiara di essere: la pagina
      // disegna quella riga accanto a «corso.presenze» e «classi.elenco», e
      // `presenze_riga` in mezzo si legge come un guasto del registro invece
      // che come un nome che il modello si è inventato. Nel messaggio invece
      // resta scritto com'è arrivato: è quello che il modello deve smettere di
      // usare, e riscriverglielo in un'altra forma glielo farebbe riprovare.
      chiesto.replace(/_/g, '.'),
      `L’attrezzo «${chiesto}» non esiste. Usa soltanto quelli che ti sono stati dati.`,
      'procedura-sconosciuta',
    )
  }

  // La whitelist vera è questa riga, non l'elenco che si è mandato: quel che si
  // manda è un suggerimento, quel che si esegue è un controllo.
  const p = procedura(nome)
  if (!p || !offribile(p)) {
    return rifiuta(
      nome,
      `«${nome}» cambia il registro, e l’assistente può solo leggere.`,
      'non-permesso',
    )
  }

  const letti = argomenti(chiamata.argomenti)
  if (!letti.ok) return rifiuta(nome, letti.perche, 'ingresso-non-valido')

  const forma = schemaJson(p.ingresso.forma)

  // I `null` che la griglia ha costretto il modello a scrivere sui campi che
  // non voleva usare: si tolgono prima della convalida, o il nucleo rifiuta la
  // chiamata per dei filtri che nessuno ha chiesto. Vedi `senzaNulliDiTroppo`.
  // Poi i filtri rimasti vuoti in un altro modo — `cerca: ""`, `stati: []` —
  // che sono la stessa cosa detta con un'altra uscita: vedi `senzaFiltriVuoti`.
  const puliti = senzaFiltriVuoti(senzaNulliDiTroppo(letti.valore, forma), forma)

  // E i campi che la procedura non ha mai avuto. Qui e non più in basso: più in
  // basso `oggetto()` li scarta in silenzio e la chiamata **riesce**, larga
  // quanto tutto il registro, senza che nessuno dica al modello che il filtro
  // che credeva di aver messo non c'è. Vedi `chiaviEstranee`.
  const estranee = chiaviEstranee(puliti, forma)
  if (estranee.length > 0) {
    return rifiuta(nome, spiegaEstranee(chiesto, estranee, forma), 'ingresso-non-valido')
  }

  // Chi ha chiuso la pagina o annullato non aspetta più niente: una lettura
  // avviata adesso costerebbe soltanto. Il segnale non arriva più in basso di
  // qui — `chiama()` non lo prende — e finché le letture sono sincrone e
  // veloci questa è la fermata che si può fare.
  if (segnale?.aborted) {
    return rifiuta(nome, 'La domanda è stata fermata: non c’è più niente da leggere.', 'annullato')
  }

  const esito = await chiama(archivio, nome, puliti, {
    origine: 'assistente',
    // Lo stesso tracciato per tutta la conversazione: nel giornale, le chiamate
    // di un giro si ritrovano insieme invece che sparse fra quelle del pannello.
    tracciato,
  })

  if (!esito.ok) {
    return rifiuta(nome, esito.messaggi.join(' '), esito.codice)
  }

  // Riuscita: quel che quell'attrezzo aveva sbagliato prima non conta più. Vedi
  // `dimentica` — senza, «sbaglio, sbaglio, riesco, sbaglio» arrivava a quattro
  // e si sentiva ordinare di smettere con la strada buona già in mano.
  dimentica(ricadute, nome)

  // La busta va in due direzioni, e sono due mestieri diversi. **Al modello**
  // il JSON, perché è con quello che ragiona — chi ha più assenze, quante ore
  // mancano. **Alla pagina** la stessa busta impaginata: colonne, allineamenti
  // e valori scritti come si leggono. Così i numeri non passano dal modello per
  // arrivare sotto gli occhi di chi ha chiesto, e non c'è nessuna cifra
  // ribattuta da controllare. Vedi `api/presentation.ts`.
  const risultato = impagina(p, esito.dati) ?? undefined

  // Accorciata per voci intere e non per caratteri: quel che arriva al modello
  // è sempre un JSON che si apre. Vedi `accorcia`.
  const testo = accorcia(esito.dati)

  // E gli id che la busta portava, per il turno dopo: vedi `idVisti`. Si
  // prendono da `esito.dati` e non dal testo accorciato — le righe tagliate via
  // sono lette quanto le altre, e la memoria non deve dipendere da dove è
  // caduto il taglio.
  const visti = idVisti(esito.dati)

  return {
    testo,
    usato: { nome, ok: true },
    ...(risultato ? { risultato } : {}),
    ...(visti.length > 0 ? { visti } : {}),
  }
}

// ------------------------------------------------------------ il giro vero

/** Che cosa succede mentre si aspetta: lo riceve la pagina, uno per volta. */
type Evento =
  | { genere: 'attrezzo', attrezzo: AttrezzoUsato }
  /** Quel che quella procedura ha letto, già impaginato: lo disegna la pagina. */
  | { genere: 'risultato', risultato: RisultatoAssistente }
  /**
   * Gli attrezzi sono finiti: la risposta che segue è scritta con quel che si
   * era già letto.
   *
   * Il tetto — dieci chiamate per messaggio — sta in `data/llamaCpp.ts` ed è
   * giusto che stia lì: è il motore a tenere il giro. Quel che non andava è che
   * lo raccontasse **soltanto al modello**: chi guardava vedeva la barra ferma
   * su dieci attrezzi e poi una risposta, senza sapere che l'assistente si era
   * dovuto fermare a metà — cioè senza avere il solo dato che dice se fidarsi
   * di quella risposta o rifare la domanda più stretta.
   *
   * Questa è la metà che sta qui: il fatto ha una strada per arrivare a chi
   * risponde e alla pagina. L'altra metà — l'avviso che parte dal motore quando
   * il budget finisce — sta in `llamaCpp.ts` e in `Passo` di `data/llm.ts`, e
   * finché non c'è questo evento non parte mai.
   */
  | { genere: 'limite', chiamate: number }
  | { genere: 'testo', testo: string }

interface OpzioniConversazione {
  /** La conversazione fin qui: alterna utente e assistente, senza le istruzioni. */
  storia: readonly Battuta[]
  /**
   * Gli id già incontrati in questa conversazione, con i loro nomi.
   *
   * Li tiene chi ha chiesto — viaggiano nei turni e muoiono quando la
   * conversazione si svuota — e li rimanda a ogni domanda: senza, «e quante ne
   * ha Bernasconi?» costringeva a rifare la ricerca per nome che era già stata
   * fatta un turno prima. Solo id e nomi, mai le cifre: vedi `IdVisto`.
   */
  visti?: readonly IdVisto[]
  /**
   * Dove si sta guardando, quando lo si vuole dire a mano.
   *
   * Nel programma non lo passa nessuno: si legge l'ultimo che il pannello ha
   * mandato, ed è giusto così — la finestra staccata dell'assistente il registro
   * non ce l'ha e non saprebbe comporlo. Il campo esiste per le prove, che di
   * pannelli non ne hanno nessuno e devono poter esercitare una veduta precisa.
   */
  contesto?: ContestoAssistente | null
  /** Da fuori, per fermare: lo preme chi chiude la pagina o annulla. */
  segnale?: AbortSignal
  /** Che cosa sta succedendo, mentre succede. */
  al?: (evento: Evento) => void
}

/**
 * Una domanda, i suoi giri di attrezzi, e la risposta.
 *
 * Il giro lo tiene il motore — `data/llamaCpp.ts`, che sa in che formato un
 * modello vuole sentirsi rispondere e quante volte può ancora chiedere — e
 * questo file gli passa due cose: gli attrezzi che si possono offrire, e la
 * funzione che li esegue. **Il controllo sta nella seconda**, che è `usaAttrezzo`
 * e non cambia di una riga: il motore chiama quel che gli si è dato.
 *
 * Solleva solo su quel che riguarda il *modello* — l'assistente spento, il file
 * dei pesi mai scaricato, l'attesa scaduta — perché quelle sono cose che chi
 * guarda deve poter distinguere da una risposta. Tutto il resto è
 * conversazione, e la conversazione non fallisce: fallisce un attrezzo, e il
 * modello ne prende atto.
 */
export async function conversa (
  archivio: Archivio,
  opzioni: OpzioniConversazione,
): Promise<{
  testo: string
  attrezzi: AttrezzoUsato[]
  risultati: RisultatoAssistente[]
  /**
   * Vero se il motore ha finito gli attrezzi prima della risposta: chi
   * risponde lo può dire, invece di consegnare una risposta parziale che si
   * legge come intera. Vedi l'evento `limite`.
   */
  esaurito: boolean
  /**
   * Gli id incontrati leggendo, uniti a quelli che si sapevano già.
   *
   * Chi ha chiesto li tiene nel turno e li rimanda con la domanda dopo: è così
   * che «e quante ne ha Bernasconi?» costa una lettura invece di due, perché
   * l'id per cercarlo c'è già. Vedi `IdVisto`.
   */
  visti: IdVisto[]
}> {
  const llm = collegamentoAssistente(opzioni.segnale)
  if (!llm.attivo) {
    throw new Error('L’assistente è spento: si accende nelle impostazioni del programma.')
  }

  const usati: AttrezzoUsato[] = []
  const letti: RisultatoAssistente[] = []
  // Gli id che si sapevano entrando, più quelli che si imparano leggendo.
  let imparati = ultimiVisti(opzioni.visti ?? [], [])
  let esaurito = false
  // Quante volte lo stesso attrezzo ha già fallito allo stesso modo: una per
  // conversazione, perché è lì che il giro a vuoto si forma. Vedi `insisti`.
  const ricadute = new Map<string, number>()
  const tracciato = `chat-${Date.now().toString(36)}`

  // Il contesto dell'ultima battuta e non quello di quando la conversazione è
  // cominciata: chi chiede apre l'assistente, poi cambia corso, poi scrive. Una
  // veduta congelata all'apertura direbbe il corso di prima, che è il modo più
  // sicuro di rispondere con precisione sulla classe sbagliata.
  // `!== undefined` e non `??`: adesso il contesto viaggia dentro la busta
  // della domanda, e `null` è una risposta — «l'interruttore è spento, non
  // dirgli niente di dove si sta guardando». Con `??` quel `null` ricadeva
  // sulla veduta di modulo, cioè su quel che l'utente aveva appena tolto.
  // Resta `undefined` per la finestra staccata, che una veduta non la compone.
  const veduta = opzioni.contesto !== undefined ? opzioni.contesto : contestoDelRegistro()

  const testo = await conMotivo(llm, () => chatta(llm, {
    battute: [
      { ruolo: 'sistema', testo: istruzioni() },
      ...(veduta ? [{ ruolo: 'sistema' as const, testo: descriviContesto(veduta) }] : []),
      // Dopo il contesto e prima della conversazione: è una rubrica di nomi, e
      // vale meno di dove si sta guardando ma più di quel che si è detto.
      ...(imparati.length > 0
        ? [{ ruolo: 'sistema' as const, testo: ricordaIdVisti(imparati) }]
        : []),
      ...opzioni.storia,
    ],
    attrezzi: attrezzi(),
    // Quel che il motore racconta mentre gira. Oggi un `Passo` porta il solo
    // nome dell'attrezzo e questo non fa niente; il giorno in cui `llamaCpp.ts`
    // dirà anche di aver esaurito le chiamate, il fatto trova la strada già
    // aperta fino alla pagina e fino a chi compone la risposta. Vedi l'evento
    // `limite`.
    al: (passo) => {
      if (!('esaurito' in passo) || passo.esaurito !== true) return
      esaurito = true
      opzioni.al?.({ genere: 'limite', chiamate: usati.length })
    },
    esegui: async (chiamata) => {
      const { testo, usato, risultato, visti } = await usaAttrezzo(
        archivio, chiamata, tracciato, ricadute, opzioni.segnale,
      )
      usati.push(usato)
      if (visti) imparati = ultimiVisti(imparati, visti)
      if (risultato) {
        letti.push(risultato)
        // Appena letto, e non alla fine con la risposta: la parte lenta è il
        // modello che scrive, e i dati sono già pronti da venti secondi. Chi
        // ha chiesto li legge mentre la frase si compone.
        opzioni.al?.({ genere: 'risultato', risultato })
      }
      // Quel che si mostra mentre si aspetta non sono le parole della risposta
      // — arrivano in un colpo alla fine — ma quali procedure il registro sta
      // aprendo: è l'unica cosa che distingue un'attesa da una macchina ferma.
      opzioni.al?.({ genere: 'attrezzo', attrezzo: usato })
      return testo
    },
  }))

  const risposta = testo.trim()
  opzioni.al?.({ genere: 'testo', testo: risposta })
  return {
    testo: risposta,
    attrezzi: usati,
    risultati: ultimiPerProcedura(letti),
    esaurito,
    visti: imparati,
  }
}

/**
 * Un risultato per procedura, e il vincitore è l'ultimo.
 *
 * Ogni chiamata riuscita produce una tabella, e le tabelle finiscono tutte
 * sotto la stessa risposta. Il modello che chiama `persone_assenze` con un
 * `corsoId` che non c'entra — busta vuota — e poi la richiama con gli argomenti
 * giusti lasciava sotto la risposta **due** tabelle «Chi ha assenze» senza
 * nessun segno di quale fosse quella di cui la risposta parla: nel caso da cui
 * tutto questo parte, una tabella vuota sotto la frase «non sono state trovate
 * assenze» — cioè la prova apparente che la frase fosse vera.
 *
 * Il prezzo, dichiarato: chi confronta due corsi con due chiamate della stessa
 * procedura si tiene solo la seconda tabella. È il meno peggio finché un
 * risultato non può dire di sé di essere stato superato — per quello serve un
 * campo in `RisultatoAssistente`, che sta in `protocol.ts` — e nel frattempo
 * una tabella in meno è un fastidio, mentre una tabella vuota sotto una frase
 * sbagliata è una risposta sbagliata che si crede.
 *
 * Vale su quel che **resta** nel turno, non su quel che si è già visto
 * scorrere: gli eventi partono appena i dati sono pronti — è quel che
 * distingue un'attesa da una macchina ferma — e un evento non si richiama
 * indietro.
 *
 * Esportata per le prove, e non per comodità: `conversa` non si esercita senza
 * caricare un modello, e questa è la riga che decide quali tabelle chi ha
 * chiesto si ritrova sotto la risposta. È la stessa scelta già fatta per
 * `usaAttrezzo` e `descriviContesto` — che però sono anche nell'elenco di
 * `tests/helpers/api.ts`, ed è quella riga che le rende raggiungibili da una
 * prova. Finché questo nome non ci sta dentro, l'esportazione è una porta
 * aperta su un corridoio chiuso.
 */
export function ultimiPerProcedura (
  letti: readonly RisultatoAssistente[],
): RisultatoAssistente[] {
  const ultimi = new Map<string, RisultatoAssistente>()
  for (const risultato of letti) ultimi.set(risultato.procedura, risultato)
  return [...ultimi.values()]
}
