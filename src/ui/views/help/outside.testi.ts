// I testi della guida, parte «Fuori dalla finestra»: icona accanto
// all'orologio, promemoria, proiezione, riga di comando. Una chiave per sezione
// (`TestiSezione`, testa di `types.ts`); struttura in `outside.ts`. I nomi
// delle impostazioni sono le etichette di `manifest.testi.ts`, lettera per lettera.

import { catalogo } from '../../../i18n/index.js'
import { CARTE, PIF, Uno, quanti } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  vassoio: {
    titolo: 'L’icona accanto all’orologio',
    sommario:
      'Il registro a portata di tasto destro, anche a finestre chiuse. Ed è da lì che si esce.',
    scritte: {
      titoloMenu: 'Regiclass — 2 lezioni da chiudere',
      adesso: 'Adesso: ▶ oggi · 10:10–10:55 · …',
      daCompilare: '⚠ Da compilare: I MEC A — Matematica …',
      corsoUno: '⚠ I MEC A — Matematica',
      corsoDue: '▶ II ELE B — Fisica',
      corsoTre: '· III INF C — Informatica',
      apri: 'Apri il registro',
      vaiAOggi: 'Vai a oggi',
      esci: 'Esci dal registro',
      riepilogo: '2 da chiudere · 12 svolte',
      daChiudere: 'Da chiudere (2)',
      ieri: '⚠ ieri · 08:20–09:05 · senza appello',
      lunedi: '⚠ lun 19 · 08:20–09:05 · non segnata svolta',
      svolte: 'Svolte (12)',
      venerdi: '✓ ven 16 · 08:20–09:05 · 2 assenti',
      altre: 'e altre 7…',
      apriCorso: 'Apri il corso',
    },
    figure: [
      {
        didascalia:
          'Il menu dell’icona, con il sottomenu di un corso aperto. Le righe grigie non si ' +
          'premono: dicono come stanno le cose.',
        legenda: [
          'L’icona: un clic riporta davanti il registro — o il benvenuto, senza un anno ' +
            'aperto —, il tasto destro apre il menu.',
          'Quante lezioni dell’anno restano da chiudere.',
          'Dove andare adesso: l’ora in corso, poi quella da compilare — o la prossima.',
          'Un corso per riga, con il segno della sua ora più urgente.',
          'Le lezioni del corso in gruppi, con il numero vero fra parentesi.',
          'L’uscita vera anche a finestre chiuse; a registro aperto c’è anche **Esci** nel menu.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Il suggerimento',
        testo:
          'Fermandosi sull’icona senza premere si legge l’ora in corso — o quella da ' +
          'compilare — e quante lezioni restano da chiudere.',
      },
      {
        termine: 'Le lezioni di un corso',
        testo:
          'Il sottomenu divide le lezioni in **In corso**, **Da chiudere**, **Prossime**, ' +
          '**Svolte**, **Annullate**; oltre le prime righe dice «e altre N…», e per vederle ' +
          'tutte c’è **Apri il corso**. Un clic su un’ora apre la sua pagina **Lezione**.',
      },
      {
        termine: 'I segni',
        testo:
          '▶ l’ora che si sta facendo, ⚠ un registro rimasto aperto, ✓ un’ora a posto, ○ ' +
          'un’ora futura senza piano o con la scaletta corta, · una futura preparata, × una ' +
          'annullata. Il segno davanti al corso è quello della sua ora più urgente: fra ' +
          'dodici ore svolte e un buco, dal primo livello si vede il buco.',
      },
      {
        termine: 'Il motivo accanto alla lezione',
        testo:
          '«senza appello» o «non segnata svolta» per un’ora da chiudere, «senza piano» o ' +
          '«scaletta corta» per una da preparare, «2 assenti» o «tutti presenti» per una ' +
          'svolta, e «verifica» quando c’è una prova. Così si sceglie quale ora aprire ' +
          'senza aprirle tutte.',
      },
      {
        termine: 'La X mette via',
        testo:
          'Con l’icona accesa, chiudere l’ultima finestra non chiude il programma: il ' +
          'registro resta accanto all’orologio e si riapre con un clic, senza rileggere i ' +
          'file. La prima volta in ogni sessione una notifica lo ricorda.',
      },
      {
        termine: 'Uscire davvero',
        testo:
          '**Esci dal registro** aspetta l’ultimo salvataggio e chiude. Chi preferisce che la X ' +
          'chiuda tutto spegne «La X lascia il registro nell’icona», in Impostazioni › ' +
          'Programma › **Generale**.',
      },
      {
        termine: 'Partire con il computer',
        testo:
          '«Parti con Windows», nel gruppo «Avvio» di Impostazioni › Programma › ' +
          '**Generale**, accende il registro all’accesso a Windows senza aprire finestre: resta ' +
          'l’icona. Vale per il registro installato e per quello portabile, purché il suo file ' +
          'resti dov’era.',
      },
      {
        termine: 'Partire senza finestra',
        testo:
          '«Parti senza aprire il registro», nello stesso gruppo, fa lo stesso anche quando lo ' +
          'si lancia a mano. Se l’icona non c’è, la finestra si apre comunque.',
      },
      {
        termine: 'Senza un anno aperto',
        testo:
          'Chiuso l’anno, il menu elenca i preferiti e i recenti, con **Apri un anno…**, **Crea ' +
          'un nuovo anno…** e **Mostra il benvenuto**; un clic sull’icona porta al benvenuto.',
      },
    ],
    note: [
      'Il menu si rifà ogni mezzo minuto e a ogni modifica del registro: un’ora che ' +
        'comincia passa a «in corso» anche a finestre chiuse. Si rifà solo se è cambiato ' +
        'davvero, per non sfarfallare sotto le dita.',
      'Spegnere l’icona («Icona accanto all’orologio», in **Generale**) vale dal prossimo ' +
        'avvio, e allora la X torna a chiudere il programma: senza icona non resterebbe ' +
        'niente da premere per riaverlo.',
    ],
  },
  promemoria: {
    titolo: 'Il promemoria prima della lezione',
    sommario:
      'Una notifica del sistema poco prima che l’ora cominci, anche a finestre chiuse.',
    scritte: {
      titolo: 'I MEC A fra 5 minuti',
      orario: '08:20–09:05 · Matematica · B12',
      consegne: `${quanti(2, CARTE.pendenza)} (1 in ritardo, 1 da fare): …`,
      unClic: 'un clic',
      lezione: 'Lezione',
      paginaDellOra: 'la pagina di quella lezione',
      unaVoltaSola: 'si annuncia una volta sola, dentro questa finestra',
      avviso: '08:15 · avviso',
      inizio: '08:20 · inizio',
      ultimoAvviso: '08:35 · ultimo avviso',
    },
    figure: [
      {
        didascalia:
          'La notifica di un’ora che comincia alle 08:20, con l’anticipo di serie. Premuta, ' +
          'apre il registro su quella lezione.',
        legenda: [
          'L’anticipo: cinque minuti di serie, da 0 a 120.',
          'Il titolo: la classe, e quanto manca.',
          'Orario, materia, aula, e le consegne ancora aperte per quel corso.',
          'Il recupero: un’ora già cominciata si annuncia ancora per un quarto d’ora.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Cambiare l’anticipo',
        testo:
          '«Minuti di anticipo», nel gruppo «Promemoria delle lezioni» di Impostazioni › ' +
          'Programma › **Generale**: zero fa arrivare l’avviso all’ora esatta.',
      },
      {
        termine: 'Che cosa resta aperto',
        testo:
          'Le consegne del corso ancora da chiudere — in ritardo, in scadenza, da fare — con i ' +
          'titoli delle prime tre. Senza niente in sospeso lo dice: «Niente in sospeso per ' +
          'questo corso.»',
      },
      {
        termine: 'Quando tace',
        testo:
          'Mai due volte per la stessa ora, mai per un’ora annullata, e non mentre il registro ' +
          'è la finestra davanti: lì lo dice già la barra di stato. Tace anche per le ore che ' +
          'stanno cominciando proprio mentre si apre il registro.',
      },
      {
        termine: 'Spegnerlo',
        testo:
          '«Avviso prima della lezione», nel gruppo «Promemoria delle lezioni» di ' +
          'Impostazioni › Programma › **Generale**.',
      },
    ],
    note: [
      'Non c’è una sveglia puntata per ogni lezione: il registro guarda l’orologio ogni ' +
        'mezzo minuto. Così il portatile riaperto alle 08:22 annuncia ancora l’ora delle ' +
        '08:20, invece di perderla mentre dormiva.',
      'Arriva anche con tutte le finestre chiuse, purché il registro resti acceso ' +
        'nell’icona accanto all’orologio.',
    ],
  },
  proiezione: {
    titolo: 'Proiezione',
    sommario:
      'Lo schermo per la classe: una vista diversa sugli stessi dati, non il registro.',
    scritte: {
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      proiezione: 'Proiezione',
      spegni: 'Spegni lo schermo',
      inProiezione: 'In proiezione',
      scaletta: 'Scaletta',
      argomenti: 'Argomenti',
      consegne: 'Consegne',
      appello: 'Appello',
      schermoDiChiInsegna: 'lo schermo di chi insegna',
      unaScheda: 'una scheda',
      testata: 'I MEC A · Matematica · 08:20',
      schermoDellaClasse: 'lo schermo della classe',
      senzaNomi: 'Senza nomi — di serie',
      nomiVisibili: 'Nomi visibili',
      mediaSufficientiGrafico: 'media, sufficienti, grafico',
      votoDiCiascuno: '+ il voto di ciascuno',
      arrivati: '18 arrivati su 22',
      chiNonLHaPortato: '+ chi non l’ha portato',
      nomiSempre: 'i nomi ci sono sempre: serve a farsi correggere',
      aDuePersone: '«a 2 persone»',
      iLoroNomi: '+ i loro nomi',
    },
    figure: [
      {
        didascalia:
          'A sinistra quel che vede chi insegna, a destra quel che vede la classe. Sullo ' +
          'schermo grande non c’è nessun comando.',
        legenda: [
          '**Proietta** apre lo schermo; acceso, il pulsante dice **Spegni lo schermo** e ' +
            'porta un punto verde.',
          '**Proiezione** mette nella riga delle azioni i comandi dello schermo.',
          'La fascia: spenta, accesa in coda, in vista. Un clic la mette in vista.',
          'Parte solo la scheda in vista: il resto non esce dal registro.',
          'Con almeno due schede accese, in cima i loro nomi: la classe sa dove si è.',
        ],
      },
      {
        didascalia:
          'Le tre schede riservate, e le consegne date a singole persone: che cosa aggiunge ' +
          'l’interruttore dei nomi.',
      },
    ],
    voci: [
      {
        termine: 'Accenderla',
        testo:
          '**Proietta**, a destra della riga delle scelte. Con «Proiezione a schermo intero» ' +
          'acceso in Impostazioni › Programma › **Generale**, il registro la manda da sé sul secondo ' +
          'schermo — in aula, il proiettore — e la allarga; spento, la finestra si apre accanto ' +
          'e la si porta a mano.',
      },
      {
        termine: 'Segue la lezione aperta',
        testo:
          'Lo schermo mostra l’ora aperta nel registro, e si aggiorna da sé a ogni tappa ' +
          'spuntata o argomento scritto. Senza un’ora aperta mostra il corso scelto; senza ' +
          'nemmeno quello, «Niente da mostrare».',
      },
      {
        termine: 'Le schede',
        testo:
          '**Scaletta**, **Argomenti**, **Consegne** e **Calendario** sono accese di serie; ' +
          '**Valutazioni**, **Documenti** e **Appello** si accendono apposta. Un clic su quella ' +
          'in vista la spegne; **Scheda precedente** e **Scheda successiva** girano in tondo.',
      },
      {
        termine: 'Che cosa mostrano',
        testo:
          'La scaletta del piano; argomenti e materiali dell’ora; le consegne ancora aperte ' +
          'della classe, non quelle di chi insegna; le ore del corso, non l’orario intero di ' +
          'chi insegna.',
      },
      {
        termine: 'Il calendario proiettato',
        testo:
          '**Settimana**, **Mese**, **Anno** o **Agenda** — quella di serie — si scelgono con ' +
          'la scheda Calendario in vista. Il giorno è quello aperto nel calendario del registro.',
      },
      {
        termine: 'I nomi',
        testo:
          'Di serie il pulsante dice **Senza nomi**; premuto diventa **Nomi visibili**. Con una ' +
          'scheda riservata in vista, la fascia lo scrive: «Sullo schermo: valutazioni, con i ' +
          'nomi.»',
      },
      {
        termine: 'Il grafico delle note',
        testo:
          `Un punto per ${PIF.singolare}, al suo voto esatto, rosso sotto la sufficienza: lo ` +
          'stesso grafico della pagina Valutazioni e del PDF della prova.',
      },
      {
        termine: 'Misure strette o larghe',
        testo:
          'Di serie le misure sono strette: davanti a una classe nessuno scorre, e meglio tutto ' +
          'visibile che mezzo fuori. **Misure strette** le passa a larghe, per le aule lunghe, e ' +
          'allora il pulsante dice **Misure larghe**.',
      },
      {
        termine: 'Pausa',
        testo:
          'Spegne il contenuto lasciando la finestra dov’è: serve quando si passa a scrivere ' +
          'qualcosa che non deve essere letto. **Riprendi** ritrova tutto com’era.',
      },
    ],
    note: [
      'Una scheda spenta non è nascosta dal foglio di stile: non entra proprio nel ' +
        'messaggio che parte verso l’altro schermo. In pausa non parte nessuna scheda: viaggia ' +
        'solo la testata dell’ora (classe, materia, orario), che lo schermo non disegna.',
      'Aprire un’altra ora nel registro cambia lo schermo davanti alla classe. È per questo ' +
        'che le schede riservate partono spente.',
      'Il tema chiaro è quello che si legge meglio proiettato: «Tema», in Impostazioni › ' +
        'Programma › **Generale**.',
    ],
  },
  rigaDiComando: {
    titolo: 'Riga di comando',
    sommario:
      'Per chi automatizza: il registro acceso risponde a un comando dal terminale.',
    scritte: {
      terminale: 'Terminale',
      condotto: 'Condotto',
      maiLaRete: 'locale, mai la rete',
      registro: 'Registro',
      conLeProcedure: 'acceso, con le procedure',
      condottoAcceso: 'condotto: acceso',
      letturaSi: 'lettura: sì',
      scritturaNo: 'scrittura: no',
      stesseDelPannello: 'le stesse del pannello',
      eDellAssistente: 'e dell’assistente',
      rispostaInJson: 'la risposta in JSON · uscita 0, 1 o 2',
    },
    figure: [
      {
        didascalia:
          'Un comando batte al condotto, il registro acceso risponde. Senza il registro acceso, ' +
          'o con il condotto spento, non risponde nessuno.',
        legenda: [
          '`regi`: il registro installato lo scrive da sé e lo mette nel PATH dell’utente.',
          'Il condotto: una pipe locale (un socket fuori da Windows), mai una porta di rete.',
          'Tre interruttori: «Condotto locale», poi «Permetti di leggere» (acceso di suo) e ' +
            '«Permetti di scrivere» (spento).',
          'Le procedure: le stesse del pannello e dell’assistente, con le stesse regole.',
          'I dati su stdout, gli errori su stderr; uscita 0 fatto, 1 rifiutato o scritto male, ' +
            '2 nessuna risposta.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Accendere il condotto',
        testo:
          '«Condotto locale», in Impostazioni › Programma › **Condotto e riga di comando**: ' +
          'vale subito, senza riavviare. Il registro deve essere acceso — basta l’icona accanto ' +
          'all’orologio.',
      },
      {
        termine: 'I comandi',
        testo:
          '`regi elenco` le procedure, `regi schema <procedura>` i suoi campi, `regi ' +
          'chiama <procedura> --campo valore` la chiama, `regi stato` dice se risponde e che ' +
          'cosa è concesso, `regi catalogo` le procedure in JSON. `regi --aiuto` riassume. ' +
          'Dopo il nome della procedura vengono solo le opzioni: una parola in più è un errore, ' +
          'e il comando esce con 1 senza chiamare niente.',
      },
      {
        termine: 'Un esempio',
        testo:
          '`regi chiama ore.prossima` dice la prossima lezione. `regi chiama corsi.elenco` ' +
          'dà gli id dei corsi, e `regi chiama corso.presenze --corsoId …` presenze, assenze ' +
          'e medie di uno.',
      },
      {
        termine: 'I valori dei campi',
        testo:
          'Si convertono guardando lo schema: `--ud 3` è un numero se il campo è un numero. ' +
          '`--campo=valore` vale quanto `--campo valore`, e serve per un valore che comincia ' +
          'con `--`. Un’opzione senza valore vale vero su un campo sì/no; su ogni altro campo è ' +
          'un valore dimenticato, e il comando si ferma. Un campo scritto due volte prende ' +
          'l’ultimo valore, e lo dice.',
      },
      {
        termine: 'Gli elenchi',
        testo:
          'Con le virgole, `--campo a,b,c`, o in JSON, `--campo \'["a","b"]\'`; `--campo ""` è ' +
          'l’elenco vuoto. Quel che un’opzione non sa dire — un elenco di oggetti — passa con ' +
          "`--json '{\"campo\": […]}'`: l’ingresso intero, sempre un oggetto, che vince sulle " +
          'opzioni. `--json` seguito da un elenco si rifiuta; da solo stampa la risposta grezza.',
      },
      {
        termine: 'Lettura e scrittura',
        testo:
          '«Permetti di leggere» lascia guardare presenze, assenze, medie e calendario; ' +
          '«Permetti di scrivere» lascia segnare appelli, mettere voti e spedire posta. Una ' +
          'procedura di scrittura ' +
          'senza permesso torna «non-permesso» e non tocca niente.',
      },
      {
        termine: 'Dove sta `regi`',
        testo:
          'Il registro installato lo riscrive a ogni avvio: lo vede il primo terminale aperto ' +
          'dopo il primo avvio — su Linux e macOS, dopo il prossimo accesso al sistema. La ' +
          'versione portabile non ce l’ha.',
      },
      {
        termine: 'Manca «condotto.segreto»',
        testo:
          'Su Windows vuol dire che con quella cartella dei dati il condotto non si è mai ' +
          'acceso: `regi` non sa a quale nome bussare, ed esce con 2 come a registro spento. ' +
          'Accendi il condotto e riprova. Chi tiene i dati altrove — la versione portabile — dà ' +
          'l’indirizzo con la variabile `REGISTRO_CONDOTTO`.',
      },
    ],
    note: [
      'Acceso il condotto, ogni programma che gira con il tuo utente può chiamarlo senza ' +
        'chiedere, e anche la sola lettura dà dati di persone. La scrittura va accesa per il ' +
        'tempo che serve allo script, e poi rispenta.',
      '`regi` non conosce le procedure: le chiede al registro a ogni chiamata, e una ' +
        'procedura nuova si chiama da qui il giorno stesso. Nemmeno con la scrittura uno ' +
        'script può allargare i permessi del condotto.',
      'Su Windows il nome del condotto porta un segreto, rifatto a ogni accensione e scritto ' +
        'nella cartella dei dati: `regi` lo rilegge a ogni chiamata, e un altro utente dello ' +
        'stesso computer non può prendersi il nome per primo.',
      'Chi scrive un suo cliente manda una riga JSON-RPC per richiesta. Dopo una riga che ' +
        'non è JSON il condotto risponde con l’errore e chiude: le righe già mandate dietro ' +
        'a quella non si eseguono.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    vassoio: {
      titolo: 'Das Symbol neben der Uhr',
      sommario:
        'Das Klassenbuch einen Rechtsklick entfernt, auch bei geschlossenen Fenstern. Und dort ' +
        'beendet man es.',
      scritte: {
        titoloMenu: 'Regiclass — 2 abzuschliessen',
        adesso: 'Jetzt: ▶ heute · 10:10–10:55 · …',
        daCompilare: '⚠ Auszufüllen: I MEC A — Mathematik …',
        corsoUno: '⚠ I MEC A — Mathematik',
        corsoDue: '▶ II ELE B — Physik',
        corsoTre: '· III INF C — Informatik',
        apri: 'Klassenbuch öffnen',
        vaiAOggi: 'Zu heute',
        esci: 'Klassenbuch beenden',
        riepilogo: '2 abzuschliessen · 12 gehalten',
        daChiudere: 'Abzuschliessen (2)',
        ieri: '⚠ gestern · 08:20–09:05 · ohne Präsenzkontrolle',
        lunedi: '⚠ Mo 19 · 08:20–09:05 · nicht als gehalten markiert',
        svolte: 'Gehalten (12)',
        venerdi: '✓ Fr 16 · 08:20–09:05 · 2 abwesend',
        altre: 'und 7 weitere…',
        apriCorso: 'Kurs öffnen',
      },
      figure: [
        {
          didascalia:
            'Das Menü des Symbols, mit dem Untermenü eines geöffneten Kurses. Die grauen Zeilen ' +
            'klickt man nicht an: Sie sagen, wie es steht.',
          legenda: [
            'Das Symbol: Ein Klick holt das Klassenbuch nach vorn — oder den ' +
              'Willkommensbildschirm, ohne offenes Schuljahr —, die rechte Maustaste öffnet das ' +
              'Menü.',
            'Wie viele Stunden des Schuljahrs noch abzuschliessen sind.',
            'Wohin es jetzt geht: die laufende Stunde, dann die auszufüllende — oder die nächste.',
            'Ein Kurs pro Zeile, mit dem Zeichen seiner dringendsten Stunde.',
            'Die Stunden des Kurses in Stapeln, mit der echten Zahl in Klammern.',
            'Das echte Beenden, auch bei geschlossenen Fenstern; bei offenem Klassenbuch gibt es ' +
              'auch **Beenden** im Menü.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Der Hinweis',
          testo:
            'Verweilt man auf dem Symbol, ohne zu klicken, liest man die laufende Stunde — oder ' +
            'die auszufüllende — und wie viele Stunden noch abzuschliessen sind.',
        },
        {
          termine: 'Die Stunden eines Kurses',
          testo:
            'Das Untermenü teilt die Stunden in **Laufend**, **Abzuschliessen**, **Nächste**, ' +
            '**Gehalten**, **Ausgefallen**; nach den ersten Zeilen steht «und N weitere…», und ' +
            'um alle zu sehen, gibt es **Kurs öffnen**. Ein Klick auf eine Stunde öffnet ihre ' +
            `Seite **${Uno(DE.lezione)}**.`,
        },
        {
          termine: 'Die Zeichen',
          testo:
            '▶ die Stunde, die gerade läuft, ⚠ ein offen gebliebener Eintrag, ✓ eine erledigte ' +
            'Stunde, ○ eine künftige Stunde ohne Plan oder mit zu kurzem Ablauf, · eine ' +
            'vorbereitete künftige, × eine ausgefallene. Das Zeichen vor dem Kurs ist das seiner ' +
            'dringendsten Stunde: Zwischen zwölf gehaltenen Stunden und einer Lücke sieht man ' +
            'auf der ersten Ebene die Lücke.',
        },
        {
          termine: 'Der Grund neben der Stunde',
          testo:
            '«ohne Präsenzkontrolle» oder «nicht als gehalten markiert» bei einer ' +
            'abzuschliessenden Stunde, «ohne Plan» oder «Ablauf zu kurz» bei einer ' +
            'vorzubereitenden, «2 abwesend» oder «alle anwesend» bei einer gehaltenen, und ' +
            '«Prüfung», wenn eine Prüfung ansteht. So wählt man, welche Stunde man öffnet, ohne ' +
            'alle zu öffnen.',
        },
        {
          termine: 'Das X räumt weg',
          testo:
            'Mit eingeschaltetem Symbol beendet das Schliessen des letzten Fensters das Programm ' +
            'nicht: Das Klassenbuch bleibt neben der Uhr und öffnet sich mit einem Klick wieder, ' +
            'ohne die Dateien neu zu lesen. Beim ersten Mal in jeder Sitzung erinnert eine ' +
            'Benachrichtigung daran.',
        },
        {
          termine: 'Wirklich beenden',
          testo:
            '**Klassenbuch beenden** wartet auf das letzte Speichern und schliesst. Wer möchte, ' +
            'dass das X alles schliesst, schaltet «Das X lässt das Klassenbuch im Symbol» unter ' +
            'Einstellungen › Programm › **Allgemein** aus.',
        },
        {
          termine: 'Mit dem Computer starten',
          testo:
            '«Mit Windows starten», in der Gruppe «Start» unter Einstellungen › Programm › ' +
            '**Allgemein**, startet das Klassenbuch bei der Anmeldung an Windows, ohne Fenster zu ' +
            'öffnen: Es bleibt das Symbol. Gilt für das installierte und das portable ' +
            'Klassenbuch, solange seine Datei am selben Ort bleibt.',
        },
        {
          termine: 'Ohne Fenster starten',
          testo:
            '«Starten, ohne das Klassenbuch zu öffnen», in derselben Gruppe, tut dasselbe auch ' +
            'beim Start von Hand. Fehlt das Symbol, öffnet sich das Fenster trotzdem.',
        },
        {
          termine: 'Ohne offenes Schuljahr',
          testo:
            'Ist das Schuljahr geschlossen, listet das Menü Favoriten und zuletzt geöffnete, mit ' +
            '**Schuljahr öffnen…**, **Neues Schuljahr anlegen…** und ' +
            '**Willkommen anzeigen**; ein Klick auf das Symbol führt zum ' +
            'Willkommensbildschirm.',
        },
      ],
      note: [
        'Das Menü baut sich jede halbe Minute und bei jeder Änderung im Klassenbuch neu auf: ' +
          'Eine Stunde, die beginnt, wird auch bei geschlossenen Fenstern «laufend». Es baut ' +
          'sich nur neu auf, wenn sich wirklich etwas geändert hat, damit es unter den Fingern ' +
          'nicht flackert.',
        'Das Symbol auszuschalten («Symbol neben der Uhr», unter **Allgemein**) gilt ab dem ' +
          'nächsten Start, und dann schliesst das X wieder das Programm: Ohne Symbol bliebe ' +
          'nichts, worauf man klicken könnte, um es zurückzuholen.',
      ],
    },
    promemoria: {
      titolo: 'Die Erinnerung vor der Stunde',
      sommario:
        'Eine Systembenachrichtigung kurz bevor die Stunde beginnt, auch bei geschlossenen ' +
        'Fenstern.',
      scritte: {
        titolo: 'I MEC A in 5 Minuten',
        orario: '08:20–09:05 · Mathematik · B12',
        consegne: `${quanti(2, DE.pendenza)} (1 überfällig, 1 offen): …`,
        unClic: 'ein Klick',
        lezione: Uno(DE.lezione),
        paginaDellOra: 'die Seite dieser Stunde',
        unaVoltaSola: 'meldet sich nur einmal, innerhalb dieses Fensters',
        avviso: '08:15 · Hinweis',
        inizio: '08:20 · Beginn',
        ultimoAvviso: '08:35 · letzter Hinweis',
      },
      figure: [
        {
          didascalia:
            'Die Benachrichtigung einer Stunde, die um 08:20 beginnt, mit dem ' +
            'Standardvorlauf. Angeklickt öffnet sie das Klassenbuch bei dieser Stunde.',
          legenda: [
            'Der Vorlauf: standardmässig fünf Minuten, von 0 bis 120.',
            'Der Titel: die Klasse, und wie lange es noch dauert.',
            'Uhrzeit, Fach, Zimmer, und die noch offenen Aufträge dieses Kurses.',
            'Das Nachholen: Eine schon begonnene Stunde meldet sich noch eine Viertelstunde lang.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Den Vorlauf ändern',
          testo:
            '«Minuten im Voraus», in der Gruppe «Erinnerungen an die Stunden» unter Einstellungen ' +
            '› Programm › **Allgemein**: Null lässt den Hinweis genau zur Anfangszeit kommen.',
        },
        {
          termine: 'Was noch offen ist',
          testo:
            'Die noch nicht abgeschlossenen Aufträge des Kurses — überfällig, fällig, offen — ' +
            'mit den Titeln der ersten drei. Ist nichts offen, sagt sie es: «Keine Pendenzen für ' +
            'diesen Kurs.»',
        },
        {
          termine: 'Wann sie schweigt',
          testo:
            'Nie zweimal für dieselbe Stunde, nie für eine ausgefallene Stunde, und nicht, ' +
            'solange das Klassenbuch das vorderste Fenster ist: Dort sagt es schon die ' +
            'Statusleiste. Sie schweigt auch bei Stunden, die gerade beginnen, während man das ' +
            'Klassenbuch öffnet.',
        },
        {
          termine: 'Sie ausschalten',
          testo:
            '«Hinweis vor der Stunde», in der Gruppe «Erinnerungen an die Stunden» unter ' +
            'Einstellungen › Programm › **Allgemein**.',
        },
      ],
      note: [
        'Es gibt keinen Wecker für jede Stunde: Das Klassenbuch schaut jede halbe Minute auf ' +
          'die Uhr. So meldet der um 08:22 wieder aufgeklappte Laptop die Stunde von 08:20 ' +
          'noch, statt sie im Schlaf zu verpassen.',
        'Sie kommt auch, wenn alle Fenster geschlossen sind, solange das Klassenbuch im Symbol ' +
          'neben der Uhr weiterläuft.',
      ],
    },
    proiezione: {
      titolo: 'Projektion',
      sommario:
        'Der Bildschirm für die Klasse: eine andere Sicht auf dieselben Daten, nicht das ' +
        'Klassenbuch.',
      scritte: {
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: 'Pläne',
        documenti: 'Dokumente',
        proiezione: 'Projektion',
        spegni: 'Bildschirm ausschalten',
        inProiezione: 'Projiziert',
        scaletta: 'Ablauf',
        argomenti: 'Themen',
        consegne: 'Aufträge',
        appello: 'Präsenzkontrolle',
        schermoDiChiInsegna: 'der Bildschirm der Lehrperson',
        unaScheda: 'eine Karte',
        testata: 'I MEC A · Mathematik · 08:20',
        schermoDellaClasse: 'der Bildschirm der Klasse',
        senzaNomi: 'Ohne Namen — Standard',
        nomiVisibili: 'Namen sichtbar',
        mediaSufficientiGrafico: 'Durchschnitt, genügend, Grafik',
        votoDiCiascuno: '+ die Note jeder Person',
        arrivati: '18 von 22 eingegangen',
        chiNonLHaPortato: '+ wer es nicht gebracht hat',
        nomiSempre: 'die Namen stehen immer da: damit man korrigiert wird',
        aDuePersone: '«für 2 Personen»',
        iLoroNomi: '+ ihre Namen',
      },
      figure: [
        {
          didascalia:
            'Links, was die Lehrperson sieht, rechts, was die Klasse sieht. Auf dem grossen ' +
            'Bildschirm gibt es keinen einzigen Befehl.',
          legenda: [
            '**Projizieren** öffnet den Bildschirm; ist er an, heisst die Schaltfläche ' +
              '**Bildschirm ausschalten** und trägt einen grünen Punkt.',
            '**Projektion** bringt die Befehle des Bildschirms in die Aktionsleiste.',
            'Das Band: aus, eingeschaltet in der Warteschlange, sichtbar. Ein Klick macht es ' +
              'sichtbar.',
            'Nur die sichtbare Karte geht hinaus: Der Rest verlässt das Klassenbuch nicht.',
            'Mit mindestens zwei eingeschalteten Karten oben ihre Namen: Die Klasse weiss, wo ' +
              'man ist.',
          ],
        },
        {
          didascalia:
            'Die drei vertraulichen Karten, und die Aufträge an einzelne Personen: was der ' +
            'Schalter für die Namen hinzufügt.',
        },
      ],
      voci: [
        {
          termine: 'Einschalten',
          testo:
            '**Projizieren**, rechts in der Auswahlzeile. Ist «Projektion im Vollbild» unter ' +
            'Einstellungen › Programm › **Allgemein** eingeschaltet, schickt das Klassenbuch sie ' +
            'selbst auf den zweiten Bildschirm — im Schulzimmer der Projektor — und macht sie ' +
            'gross; ausgeschaltet öffnet sich das Fenster daneben, und man zieht es von Hand ' +
            'hinüber.',
        },
        {
          termine: 'Folgt der offenen Stunde',
          testo:
            'Der Bildschirm zeigt die im Klassenbuch geöffnete Stunde und aktualisiert sich bei ' +
            'jeder abgehakten Etappe oder jedem geschriebenen Thema von selbst. Ohne offene ' +
            'Stunde zeigt er den gewählten Kurs; ohne auch diesen «Nichts anzuzeigen».',
        },
        {
          termine: 'Die Karten',
          testo:
            '**Ablauf**, **Themen**, **Aufträge** und **Kalender** sind standardmässig ' +
            'eingeschaltet; **Beurteilungen**, **Dokumente** und **Präsenzkontrolle** schaltet man eigens ' +
            'ein. Ein Klick auf die sichtbare schaltet sie aus; **Vorherige Karte** und ' +
            '**Nächste Karte** gehen im Kreis.',
        },
        {
          termine: 'Was sie zeigen',
          testo:
            'Den Ablauf des Plans; Themen und Material der Stunde; die noch offenen Aufträge der ' +
            'Klasse, nicht die der Lehrperson; die Stunden des Kurses, nicht den ganzen ' +
            'Stundenplan der Lehrperson.',
        },
        {
          termine: 'Der projizierte Kalender',
          testo:
            '**Woche**, **Monat**, **Jahr** oder **Agenda** — die Standardansicht — wählt man, ' +
            'wenn die Karte Kalender sichtbar ist. Der Tag ist der im Kalender des Klassenbuchs ' +
            'geöffnete.',
        },
        {
          termine: 'Die Namen',
          testo:
            'Standardmässig heisst die Schaltfläche **Ohne Namen**; gedrückt wird sie zu ' +
            '**Namen sichtbar**. Ist eine vertrauliche Karte sichtbar, schreibt es das Band: ' +
            '«Auf dem Bildschirm: Beurteilungen, mit Namen.»',
        },
        {
          termine: 'Die Notengrafik',
          testo:
            'Ein Punkt pro lernende Person, bei ihrer genauen Note, rot unter der genügenden: ' +
            'dieselbe Grafik wie auf der Seite Beurteilungen und im PDF der Prüfung.',
        },
        {
          termine: 'Enge oder weite Masse',
          testo:
            'Standardmässig sind die Masse eng: Vor einer Klasse scrollt niemand, und besser ' +
            'alles sichtbar als halb draussen. **Kompakt** schaltet auf weite um, für lange ' +
            'Schulzimmer, und dann heisst die Schaltfläche **Gross**.',
        },
        {
          termine: 'Pause',
          testo:
            'Blendet den Inhalt aus und lässt das Fenster, wo es ist: nützlich, wenn man etwas ' +
            'schreibt, das nicht gelesen werden soll. **Fortsetzen** stellt alles wieder her, ' +
            'wie es war.',
        },
      ],
      note: [
        'Eine ausgeschaltete Karte wird nicht per Stylesheet versteckt: Sie gelangt gar nicht ' +
          'in die Nachricht, die zum anderen Bildschirm geht. In der Pause geht keine Karte ' +
          'hinaus: Es reist nur der Kopf der Stunde (Klasse, Fach, Uhrzeit), den der Bildschirm ' +
          'nicht zeichnet.',
        'Eine andere Stunde im Klassenbuch zu öffnen, ändert den Bildschirm vor der Klasse. ' +
          'Deshalb starten die vertraulichen Karten ausgeschaltet.',
        'Das helle Design ist projiziert am besten lesbar: «Design», unter Einstellungen › ' +
          'Programm › **Allgemein**.',
      ],
    },
    rigaDiComando: {
      titolo: 'Befehlszeile',
      sommario:
        'Für alle, die automatisieren: Das laufende Klassenbuch antwortet auf einen ' +
        'Befehl aus dem Terminal.',
      scritte: {
        terminale: 'Terminal',
        condotto: 'Kanal',
        maiLaRete: 'lokal, nie das Netz',
        registro: 'Klassenbuch',
        conLeProcedure: 'läuft, mit den Prozeduren',
        condottoAcceso: 'Kanal: an',
        letturaSi: 'Lesen: ja',
        scritturaNo: 'Schreiben: nein',
        stesseDelPannello: 'dieselben wie im Fenster',
        eDellAssistente: 'und im Assistenten',
        rispostaInJson: 'die Antwort in JSON · Exit-Code 0, 1 oder 2',
      },
      figure: [
        {
          didascalia:
            'Ein Befehl klopft am Kanal an, das laufende Klassenbuch antwortet. Läuft das ' +
            'Klassenbuch nicht oder ist der Kanal aus, antwortet niemand.',
          legenda: [
            '`regi`: Das installierte Klassenbuch schreibt es selbst und legt es in den PATH ' +
              'des Benutzers.',
            'Der Kanal: eine lokale Pipe (ausserhalb von Windows ein Socket), nie ein ' +
              'Netzwerkport.',
            'Drei Schalter: «Lokaler Kanal», dann «Lesen erlauben» (von sich aus an) und ' +
              '«Schreiben erlauben» (aus).',
            'Die Prozeduren: dieselben wie im Fenster und im Assistenten, mit denselben Regeln.',
            'Die Daten auf stdout, die Fehler auf stderr; Exit-Code 0 erledigt, 1 abgelehnt oder ' +
              'falsch geschrieben, 2 keine Antwort.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Den Kanal einschalten',
          testo:
            '«Lokaler Kanal», unter Einstellungen › Programm › **Kanal und Befehlszeile**: gilt ' +
            'sofort, ohne Neustart. Das Klassenbuch muss laufen — das Symbol neben der Uhr ' +
            'genügt.',
        },
        {
          termine: 'Die Befehle',
          testo:
            '`regi elenco` die Prozeduren, `regi schema <procedura>` ihre Felder, `regi ' +
            'chiama <procedura> --campo valore` ruft sie auf, `regi stato` sagt, ob es ' +
            'antwortet und was erlaubt ist, `regi catalogo` die Prozeduren in JSON. `regi ' +
            '--aiuto` fasst zusammen. Nach dem Namen der Prozedur kommen nur Optionen: Ein Wort ' +
            'zu viel ist ein Fehler, und der Befehl endet mit 1, ohne etwas aufzurufen.',
        },
        {
          termine: 'Ein Beispiel',
          testo:
            '`regi chiama ore.prossima` nennt die nächste Stunde. `regi chiama ' +
            'corsi.elenco` gibt die IDs der Kurse, und `regi chiama corso.presenze --corsoId …` ' +
            'Anwesenheiten, Absenzen und Durchschnitte eines Kurses.',
        },
        {
          termine: 'Die Werte der Felder',
          testo:
            'Sie werden anhand des Schemas umgewandelt: `--ud 3` ist eine Zahl, wenn das Feld ' +
            'eine Zahl ist. `--campo=valore` gilt so viel wie `--campo valore` und dient für ' +
            'einen Wert, der mit `--` beginnt. Eine Option ohne Wert gilt bei einem Ja/Nein-Feld ' +
            'als wahr; bei jedem anderen Feld ist es ein vergessener Wert, und der Befehl hält ' +
            'an. Ein zweimal angegebenes Feld nimmt den letzten Wert, und sagt es.',
        },
        {
          termine: 'Die Listen',
          testo:
            'Mit Kommas, `--campo a,b,c`, oder in JSON, `--campo \'["a","b"]\'`; `--campo ""` ' +
            'ist die leere Liste. Was eine Option nicht ausdrücken kann — eine Liste von ' +
            "Objekten —, geht mit `--json '{\"campo\": […]}'`: die ganze Eingabe, immer ein " +
            'Objekt, das Vorrang vor den Optionen hat. `--json` gefolgt von einer Liste wird ' +
            'abgelehnt; allein gibt es die rohe Antwort aus.',
        },
        {
          termine: 'Lesen und Schreiben',
          testo:
            '«Lesen erlauben» lässt Anwesenheiten, Absenzen, Durchschnitte und Kalender ' +
            'ansehen; «Schreiben erlauben» lässt Präsenzkontrollen erfassen, Noten setzen und ' +
            'Mails versenden. Eine schreibende Prozedur ohne Berechtigung gibt «non-permesso» ' +
            'zurück und rührt nichts an.',
        },
        {
          termine: 'Wo `regi` liegt',
          testo:
            'Das installierte Klassenbuch schreibt es bei jedem Start neu: Man sieht es im ' +
            'ersten Terminal, das nach dem ersten Start geöffnet wird — unter Linux und macOS ' +
            'nach der nächsten Anmeldung am System. Die portable Version hat es nicht.',
        },
        {
          termine: '«condotto.segreto» fehlt',
          testo:
            'Unter Windows heisst das, dass der Kanal mit diesem Datenordner nie eingeschaltet ' +
            'war: `regi` weiss nicht, an welchem Namen es anklopfen soll, und endet mit 2 wie ' +
            'bei beendetem Klassenbuch. Schalte den Kanal ein und versuche es erneut. Wer die ' +
            'Daten anderswo hat — die portable Version —, gibt die Adresse mit der Variablen ' +
            '`REGISTRO_CONDOTTO` an.',
        },
      ],
      note: [
        'Ist der Kanal an, kann jedes Programm, das mit deinem Benutzer läuft, ihn ohne ' +
          'Nachfrage aufrufen, und auch das blosse Lesen liefert Personendaten. Das Schreiben ' +
          'schaltet man so lange ein, wie das Skript es braucht, und dann wieder aus.',
        '`regi` kennt die Prozeduren nicht: Es fragt das Klassenbuch bei jedem Aufruf ' +
          'danach, und eine neue Prozedur lässt sich noch am selben Tag von hier aufrufen. ' +
          'Auch mit Schreibrecht kann ein Skript die Berechtigungen des Kanals nicht erweitern.',
        'Unter Windows trägt der Name des Kanals ein Geheimnis, das bei jedem Einschalten neu ' +
          'erzeugt und in den Datenordner geschrieben wird: `regi` liest es bei jedem Aufruf ' +
          'neu, und ein anderer Benutzer desselben Computers kann sich den Namen nicht zuerst ' +
          'nehmen.',
        'Wer einen eigenen Client schreibt, sendet eine JSON-RPC-Zeile pro Anfrage. Nach einer ' +
          'Zeile, die kein JSON ist, antwortet der Kanal mit dem Fehler und schliesst: Die ' +
          'danach schon gesendeten Zeilen werden nicht ausgeführt.',
      ],
    },
  },
  fr: {
    vassoio: {
      titolo: 'L’icône près de l’horloge',
      sommario:
        'Le registre à portée de clic droit, même fenêtres fermées. Et c’est par là qu’on le ' +
        'quitte.',
      scritte: {
        titoloMenu: 'Regiclass — 2 leçons à clôturer',
        adesso: 'Maintenant : ▶ aujourd’hui · 10:10–10:55',
        daCompilare: '⚠ À remplir : I MEC A — Mathématiques …',
        corsoUno: '⚠ I MEC A — Mathématiques',
        corsoDue: '▶ II ELE B — Physique',
        corsoTre: '· III INF C — Informatique',
        apri: 'Ouvrir le registre',
        vaiAOggi: 'Aller à aujourd’hui',
        esci: 'Quitter le registre',
        riepilogo: '2 à clôturer · 12 données',
        daChiudere: 'À clôturer (2)',
        ieri: '⚠ hier · 08:20–09:05 · sans appel',
        lunedi: '⚠ lun 19 · 08:20–09:05 · pas marquée donnée',
        svolte: 'Données (12)',
        venerdi: '✓ ven 16 · 08:20–09:05 · 2 absents',
        altre: 'et 7 autres…',
        apriCorso: 'Ouvrir le cours',
      },
      figure: [
        {
          didascalia:
            'Le menu de l’icône, avec le sous-menu d’un cours ouvert. Les lignes grises ne se ' +
            'cliquent pas : elles disent où en sont les choses.',
          legenda: [
            'L’icône : un clic ramène le registre au premier plan — ou l’écran d’accueil, sans ' +
              'année ouverte —, le clic droit ouvre le menu.',
            'Combien de leçons de l’année restent à clôturer.',
            'Où aller maintenant : la leçon en cours, puis celle à remplir — ou la prochaine.',
            'Un cours par ligne, avec le signe de sa leçon la plus urgente.',
            'Les leçons du cours en piles, avec le vrai nombre entre parenthèses.',
            'La vraie sortie, même fenêtres fermées ; registre ouvert, il y a aussi **Quitter** ' +
              'dans le menu.',
          ],
        },
      ],
      voci: [
        {
          termine: 'L’info-bulle',
          testo:
            'En s’arrêtant sur l’icône sans cliquer, on lit la leçon en cours — ou celle à ' +
            'remplir — et combien de leçons restent à clôturer.',
        },
        {
          termine: 'Les leçons d’un cours',
          testo:
            'Le sous-menu répartit les leçons en **En cours**, **À clôturer**, **Prochaines**, ' +
            '**Données**, **Annulées** ; après les premières lignes il dit « et N autres… », et ' +
            'pour les voir toutes il y a **Ouvrir le cours**. Un clic sur une leçon ouvre sa page ' +
            `**${Uno(FR.lezione)}**.`,
        },
        {
          termine: 'Les signes',
          testo:
            '▶ la leçon en train de se faire, ⚠ un registre resté ouvert, ✓ une leçon en ordre, ' +
            '○ une leçon future sans plan ou avec un déroulement trop court, · une future ' +
            'préparée, × une annulée. Le signe devant le cours est celui de sa leçon la plus ' +
            'urgente : entre douze leçons données et un trou, au premier niveau on voit le trou.',
        },
        {
          termine: 'La raison à côté de la leçon',
          testo:
            '« sans appel » ou « pas marquée donnée » pour une leçon à clôturer, « sans plan » ' +
            'ou « déroulement trop court » pour une leçon à préparer, « 2 absents » ou « tous ' +
            'présents » pour une leçon donnée, et « épreuve » quand il y a une épreuve. Ainsi on ' +
            'choisit quelle leçon ouvrir sans les ouvrir toutes.',
        },
        {
          termine: 'Le X range',
          testo:
            'Avec l’icône activée, fermer la dernière fenêtre ne ferme pas le programme : le ' +
            'registre reste près de l’horloge et se rouvre d’un clic, sans relire les fichiers. ' +
            'La première fois de chaque session, une notification le rappelle.',
        },
        {
          termine: 'Quitter pour de vrai',
          testo:
            '**Quitter le registre** attend le dernier enregistrement et ferme. Qui préfère que ' +
            'le X ferme tout désactive « Le X laisse le registre dans l’icône », dans ' +
            'Paramètres › Programme › **Général**.',
        },
        {
          termine: 'Démarrer avec l’ordinateur',
          testo:
            '« Démarrer avec Windows », dans le groupe « Démarrage » de Paramètres › Programme › ' +
            '**Général**, démarre le registre à l’ouverture de session Windows sans ouvrir de ' +
            'fenêtres : il reste l’icône. Vaut pour le registre installé et pour le portable, ' +
            'pourvu que son fichier reste à sa place.',
        },
        {
          termine: 'Démarrer sans fenêtre',
          testo:
            '« Démarrer sans ouvrir le registre », dans le même groupe, fait la même chose même ' +
            'quand on le lance à la main. Sans icône, la fenêtre s’ouvre quand même.',
        },
        {
          termine: 'Sans année ouverte',
          testo:
            'L’année fermée, le menu liste les favoris et les récents, avec **Ouvrir une ' +
            'année…**, **Créer une nouvelle année…** et **Afficher l’accueil** ; un clic ' +
            'sur l’icône mène à l’écran d’accueil.',
        },
      ],
      note: [
        'Le menu se refait toutes les demi-minutes et à chaque modification du registre : une ' +
          'leçon qui commence passe à « en cours » même fenêtres fermées. Il ne se refait que ' +
          's’il a vraiment changé, pour ne pas clignoter sous les doigts.',
        'Désactiver l’icône (« Icône près de l’horloge », dans **Général**) vaut dès le ' +
          'prochain démarrage, et alors le X ferme de nouveau le programme : sans icône, il ne ' +
          'resterait rien sur quoi cliquer pour le retrouver.',
      ],
    },
    promemoria: {
      titolo: 'Le rappel avant la leçon',
      sommario:
        'Une notification du système peu avant que la leçon commence, même fenêtres fermées.',
      scritte: {
        titolo: 'I MEC A dans 5 minutes',
        orario: '08:20–09:05 · Mathématiques · B12',
        consegne: `${quanti(2, FR.pendenza)} (1 en retard, 1 à faire)`,
        unClic: 'un clic',
        lezione: Uno(FR.lezione),
        paginaDellOra: 'la page de cette leçon',
        unaVoltaSola: 's’annonce une seule fois, dans cette fenêtre',
        avviso: '08:15 · rappel',
        inizio: '08:20 · début',
        ultimoAvviso: '08:35 · dernier rappel',
      },
      figure: [
        {
          didascalia:
            'La notification d’une leçon qui commence à 08:20, avec l’avance par défaut. Un clic ' +
            'dessus ouvre le registre à cette leçon.',
          legenda: [
            'L’avance : cinq minutes par défaut, de 0 à 120.',
            'Le titre : la classe, et combien de temps il reste.',
            'Horaire, branche, salle, et les devoirs encore ouverts pour ce cours.',
            'Le rattrapage : une leçon déjà commencée s’annonce encore pendant un quart d’heure.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Changer l’avance',
          testo:
            '« Minutes d’avance », dans le groupe « Rappels des leçons » de Paramètres › ' +
            'Programme › **Général** : zéro fait arriver le rappel à l’heure exacte.',
        },
        {
          termine: 'Ce qui reste ouvert',
          testo:
            'Les devoirs du cours encore à clôturer — en retard, à rendre, à faire — avec les ' +
            'titres des trois premiers. Quand rien n’est en suspens, il le dit : « Rien en ' +
            'suspens pour ce cours. »',
        },
        {
          termine: 'Quand il se tait',
          testo:
            'Jamais deux fois pour la même leçon, jamais pour une leçon annulée, et pas pendant ' +
            'que le registre est la fenêtre au premier plan : là, la barre d’état le dit déjà. ' +
            'Il se tait aussi pour les leçons qui commencent juste au moment où l’on ouvre le ' +
            'registre.',
        },
        {
          termine: 'Le désactiver',
          testo:
            '« Rappel avant la leçon », dans le groupe « Rappels des leçons » de Paramètres › ' +
            'Programme › **Général**.',
        },
      ],
      note: [
        'Il n’y a pas un réveil réglé pour chaque leçon : le registre regarde l’horloge toutes ' +
          'les demi-minutes. Ainsi le portable rouvert à 08:22 annonce encore la leçon de ' +
          '08:20, au lieu de la manquer pendant qu’il dormait.',
        'Il arrive même avec toutes les fenêtres fermées, pourvu que le registre reste actif ' +
          'dans l’icône près de l’horloge.',
      ],
    },
    proiezione: {
      titolo: 'Projection',
      sommario:
        'L’écran pour la classe : une autre vue sur les mêmes données, pas le registre.',
      scritte: {
        lezione: Uno(FR.lezione),
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans',
        documenti: 'Documents',
        proiezione: 'Projection',
        spegni: 'Éteindre l’écran',
        inProiezione: 'En projection',
        scaletta: 'Déroulement',
        argomenti: 'Sujets',
        consegne: 'Devoirs',
        appello: 'Appel',
        schermoDiChiInsegna: 'l’écran de l’enseignant',
        unaScheda: 'une carte',
        testata: 'I MEC A · Mathématiques · 08:20',
        schermoDellaClasse: 'l’écran de la classe',
        senzaNomi: 'Sans noms — par défaut',
        nomiVisibili: 'Noms visibles',
        mediaSufficientiGrafico: 'moyenne, suffisants, graphique',
        votoDiCiascuno: '+ la note de chacun',
        arrivati: '18 reçus sur 22',
        chiNonLHaPortato: '+ qui ne l’a pas apporté',
        nomiSempre: 'les noms y sont toujours : c’est pour être corrigé',
        aDuePersone: '« pour 2 personnes »',
        iLoroNomi: '+ leurs noms',
      },
      figure: [
        {
          didascalia:
            'À gauche ce que voit l’enseignant, à droite ce que voit la classe. Sur le grand ' +
            'écran, il n’y a aucune commande.',
          legenda: [
            '**Projeter** ouvre l’écran ; allumé, le bouton dit **Éteindre l’écran** et porte ' +
              'un point vert.',
            '**Projection** met dans la barre d’actions les commandes de l’écran.',
            'Le bandeau : éteinte, allumée en attente, en vue. Un clic la met en vue.',
            'Seule la carte en vue part : le reste ne sort pas du registre.',
            'Avec au moins deux cartes allumées, leurs noms en haut : la classe sait où l’on en ' +
              'est.',
          ],
        },
        {
          didascalia:
            'Les trois cartes réservées, et les devoirs donnés à des personnes seules : ce ' +
            'qu’ajoute l’interrupteur des noms.',
        },
      ],
      voci: [
        {
          termine: 'L’allumer',
          testo:
            '**Projeter**, à droite de la ligne des choix. Avec « Projection en plein écran » ' +
            'activé dans Paramètres › Programme › **Général**, le registre l’envoie tout seul ' +
            'sur le second écran — en classe, le projecteur — et l’agrandit ; désactivé, la ' +
            'fenêtre s’ouvre à côté et on la déplace à la main.',
        },
        {
          termine: 'Suit la leçon ouverte',
          testo:
            'L’écran montre la leçon ouverte dans le registre, et se met à jour tout seul à ' +
            'chaque étape cochée ou sujet écrit. Sans leçon ouverte, il montre le cours choisi ; ' +
            'sans même celui-là, « Rien à montrer ».',
        },
        {
          termine: 'Les cartes',
          testo:
            '**Déroulement**, **Sujets**, **Devoirs** et **Calendrier** sont allumées par ' +
            'défaut ; **Évaluations**, **Documents** et **Appel** s’allument exprès. Un clic sur ' +
            'celle en vue l’éteint ; **Fiche précédente** et **Fiche suivante** tournent en ' +
            'rond.',
        },
        {
          termine: 'Ce qu’elles montrent',
          testo:
            'Le déroulement du plan ; les sujets et le matériel de la leçon ; les devoirs encore ' +
            'ouverts de la classe, pas ceux de l’enseignant ; les leçons du cours, pas l’horaire ' +
            'entier de l’enseignant.',
        },
        {
          termine: 'Le calendrier projeté',
          testo:
            '**Semaine**, **Mois**, **Année** ou **Agenda** — celle par défaut — se choisissent ' +
            'avec la carte Calendrier en vue. Le jour est celui ouvert dans le calendrier du ' +
            'registre.',
        },
        {
          termine: 'Les noms',
          testo:
            'Par défaut le bouton dit **Sans noms** ; enfoncé, il devient **Noms visibles**. Avec ' +
            'une carte réservée en vue, le bandeau l’écrit : « À l’écran : évaluations, avec les ' +
            'noms. »',
        },
        {
          termine: 'Le graphique des notes',
          testo:
            `Un point par ${FR.pif.singolare}, à sa note exacte, en rouge sous la note ` +
            'suffisante : le même graphique que la page Évaluations et le PDF de l’épreuve.',
        },
        {
          termine: 'Mesures serrées ou larges',
          testo:
            'Par défaut les mesures sont serrées : devant une classe personne ne fait défiler, et ' +
            'mieux vaut tout visible qu’à moitié dehors. **Compact** les passe en larges, ' +
            'pour les salles longues, et alors le bouton dit **Grand**.',
        },
        {
          termine: 'Pause',
          testo:
            'Éteint le contenu en laissant la fenêtre où elle est : utile quand on passe à écrire ' +
            'quelque chose qui ne doit pas être lu. **Reprendre** retrouve tout comme c’était.',
        },
      ],
      note: [
        'Une carte éteinte n’est pas cachée par la feuille de style : elle n’entre même pas ' +
          'dans le message qui part vers l’autre écran. En pause, aucune carte ne part : seul ' +
          'voyage l’en-tête de la leçon (classe, branche, horaire), que l’écran ne dessine pas.',
        'Ouvrir une autre leçon dans le registre change l’écran devant la classe. C’est pour ' +
          'cela que les cartes réservées partent éteintes.',
        'Le thème clair est le plus lisible en projection : « Thème », dans Paramètres › ' +
          'Programme › **Général**.',
      ],
    },
    rigaDiComando: {
      titolo: 'Ligne de commande',
      sommario:
        'Pour qui automatise : le registre allumé répond à une commande depuis le terminal.',
      scritte: {
        terminale: 'Terminal',
        condotto: 'Canal',
        maiLaRete: 'local, jamais le réseau',
        registro: 'Registre',
        conLeProcedure: 'actif, avec les procédures',
        condottoAcceso: 'canal : activé',
        letturaSi: 'lecture : oui',
        scritturaNo: 'écriture : non',
        stesseDelPannello: 'les mêmes que la fenêtre',
        eDellAssistente: 'et que l’assistant',
        rispostaInJson: 'la réponse en JSON · sortie 0, 1 ou 2',
      },
      figure: [
        {
          didascalia:
            'Une commande frappe au canal, le registre allumé répond. Sans le registre allumé, ' +
            'ou avec le canal désactivé, personne ne répond.',
          legenda: [
            '`regi` : le registre installé l’écrit lui-même et le met dans le PATH de ' +
              'l’utilisateur.',
            'Le canal : une pipe locale (un socket hors de Windows), jamais un port réseau.',
            'Trois interrupteurs : « Canal local », puis « Autoriser la lecture » (activé de ' +
              'lui-même) et « Autoriser l’écriture » (désactivé).',
            'Les procédures : les mêmes que la fenêtre et l’assistant, avec les mêmes règles.',
            'Les données sur stdout, les erreurs sur stderr ; sortie 0 fait, 1 refusé ou mal ' +
              'écrit, 2 aucune réponse.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Activer le canal',
          testo:
            '« Canal local », dans Paramètres › Programme › **Canal et ligne de commande** : ' +
            'vaut tout de suite, sans redémarrer. Le registre doit être allumé — l’icône près de ' +
            'l’horloge suffit.',
        },
        {
          termine: 'Les commandes',
          testo:
            '`regi elenco` les procédures, `regi schema <procedura>` ses champs, `regi ' +
            'chiama <procedura> --campo valore` l’appelle, `regi stato` dit s’il répond et ce ' +
            'qui est permis, `regi catalogo` les procédures en JSON. `regi --aiuto` résume. ' +
            'Après le nom de la procédure ne viennent que les options : un mot de trop est une ' +
            'erreur, et la commande sort avec 1 sans rien appeler.',
        },
        {
          termine: 'Un exemple',
          testo:
            '`regi chiama ore.prossima` dit la prochaine leçon. `regi chiama corsi.elenco` ' +
            'donne les id des cours, et `regi chiama corso.presenze --corsoId …` présences, ' +
            'absences et moyennes de l’un d’eux.',
        },
        {
          termine: 'Les valeurs des champs',
          testo:
            'Elles se convertissent d’après le schéma : `--ud 3` est un nombre si le champ est ' +
            'un nombre. `--campo=valore` vaut `--campo valore`, et sert pour une valeur qui ' +
            'commence par `--`. Une option sans valeur vaut vrai sur un champ oui/non ; sur tout ' +
            'autre champ, c’est une valeur oubliée, et la commande s’arrête. Un champ écrit deux ' +
            'fois prend la dernière valeur, et le dit.',
        },
        {
          termine: 'Les listes',
          testo:
            'Avec des virgules, `--campo a,b,c`, ou en JSON, `--campo \'["a","b"]\'` ; ' +
            '`--campo ""` est la liste vide. Ce qu’une option ne sait pas dire — une liste ' +
            "d’objets — passe par `--json '{\"campo\": […]}'` : l’entrée entière, toujours un " +
            'objet, qui l’emporte sur les options. `--json` suivi d’une liste est refusé ; seul, ' +
            'il imprime la réponse brute.',
        },
        {
          termine: 'Lecture et écriture',
          testo:
            '« Autoriser la lecture » laisse consulter présences, absences, moyennes et ' +
            'calendrier ; « Autoriser l’écriture » laisse noter des appels, mettre des notes et ' +
            'envoyer du courrier. Une procédure d’écriture sans autorisation renvoie ' +
            '« non-permesso » et ne touche à rien.',
        },
        {
          termine: 'Où se trouve `regi`',
          testo:
            'Le registre installé le réécrit à chaque démarrage : le premier terminal ouvert ' +
            'après le premier démarrage le voit — sous Linux et macOS, après la prochaine ' +
            'ouverture de session. La version portable ne l’a pas.',
        },
        {
          termine: 'Il manque « condotto.segreto »',
          testo:
            'Sous Windows, cela veut dire qu’avec ce dossier de données le canal n’a jamais été ' +
            'activé : `regi` ne sait pas à quel nom frapper, et sort avec 2 comme si le ' +
            'registre était éteint. Active le canal et réessaie. Qui garde ses données ailleurs ' +
            '— la version portable — donne l’adresse avec la variable `REGISTRO_CONDOTTO`.',
        },
      ],
      note: [
        'Le canal activé, tout programme qui tourne avec ton compte peut l’appeler sans ' +
          'demander, et même la seule lecture donne des données de personnes. L’écriture ' +
          's’active le temps dont le script a besoin, puis se désactive.',
        '`regi` ne connaît pas les procédures : il les demande au registre à chaque appel, ' +
          'et une nouvelle procédure s’appelle d’ici le jour même. Même avec l’écriture, un ' +
          'script ne peut pas élargir les autorisations du canal.',
        'Sous Windows, le nom du canal porte un secret, refait à chaque activation et écrit ' +
          'dans le dossier des données : `regi` le relit à chaque appel, et un autre ' +
          'utilisateur du même ordinateur ne peut pas prendre le nom le premier.',
        'Qui écrit son propre client envoie une ligne JSON-RPC par requête. Après une ligne ' +
          'qui n’est pas du JSON, le canal répond avec l’erreur et ferme : les lignes déjà ' +
          'envoyées derrière celle-là ne s’exécutent pas.',
      ],
    },
  },
  en: {
    vassoio: {
      titolo: 'The icon next to the clock',
      sommario:
        'The register a right-click away, even with its windows closed. And that is where you ' +
        'quit.',
      scritte: {
        titoloMenu: 'Regiclass — 2 lessons to close',
        adesso: 'Now: ▶ today · 10:10–10:55 · …',
        daCompilare: '⚠ To fill in: I MEC A — Maths …',
        corsoUno: '⚠ I MEC A — Maths',
        corsoDue: '▶ II ELE B — Physics',
        corsoTre: '· III INF C — Computing',
        apri: 'Open the register',
        vaiAOggi: 'Go to today',
        esci: 'Quit the register',
        riepilogo: '2 to close · 12 held',
        daChiudere: 'To close (2)',
        ieri: '⚠ yesterday · 08:20–09:05 · no attendance',
        lunedi: '⚠ Mon 19 · 08:20–09:05 · not marked held',
        svolte: 'Held (12)',
        venerdi: '✓ Fri 16 · 08:20–09:05 · 2 absent',
        altre: 'and 7 more…',
        apriCorso: 'Open the course',
      },
      figure: [
        {
          didascalia:
            'The icon’s menu, with the submenu of a course open. The grey rows are not for ' +
            'clicking: they say how things stand.',
          legenda: [
            'The icon: a click brings the register to the front — or the welcome screen, with ' +
              'no year open —, a right-click opens the menu.',
            'How many of the year’s lessons are still to close.',
            'Where to go now: the lesson in progress, then the one to fill in — or the next one.',
            'One course per row, with the sign of its most urgent lesson.',
            'The course’s lessons in piles, with the real number in brackets.',
            'The real exit, even with the windows closed; with the register open there is also ' +
              '**Quit** in the menu.',
          ],
        },
      ],
      voci: [
        {
          termine: 'The tooltip',
          testo:
            'Hovering over the icon without clicking shows the lesson in progress — or the one ' +
            'to fill in — and how many lessons are still to close.',
        },
        {
          termine: 'A course’s lessons',
          testo:
            'The submenu splits the lessons into **In progress**, **To close**, **Coming up**, ' +
            '**Held**, **Cancelled**; after the first rows it says “and N more…”, and to see ' +
            'them all there is **Open the course**. A click on a lesson opens its ' +
            `**${Uno(EN.lezione)}** page.`,
        },
        {
          termine: 'The signs',
          testo:
            '▶ the lesson happening now, ⚠ a record left open, ✓ a lesson in order, ○ a future ' +
            'lesson with no plan or a short outline, · a prepared future one, × a cancelled ' +
            'one. The sign in front of the course is that of its most urgent lesson: between ' +
            'twelve held lessons and one gap, the first level shows the gap.',
        },
        {
          termine: 'The reason next to the lesson',
          testo:
            '“no attendance” or “not marked held” for a lesson to close, “no plan” or “outline ' +
            'too short” for one to prepare, “2 absent” or “all present” for a held one, and ' +
            '“test” when there is a test. That way you choose which lesson to open without ' +
            'opening them all.',
        },
        {
          termine: 'The X puts it away',
          testo:
            'With the icon on, closing the last window does not close the program: the register ' +
            'stays next to the clock and reopens with a click, without rereading the files. The ' +
            'first time in each session a notification reminds you.',
        },
        {
          termine: 'Really quitting',
          testo:
            '**Quit the register** waits for the last save and closes. If you would rather the X ' +
            'closed everything, turn off “The X leaves the register in the icon”, in Settings › ' +
            'Program › **General**.',
        },
        {
          termine: 'Starting with the computer',
          testo:
            '“Start with Windows”, in the “Start-up” group of Settings › Program › **General**, ' +
            'starts the register when you sign in to Windows without opening any window: the ' +
            'icon remains. It applies to the installed register and to the portable one, as ' +
            'long as its file stays where it was.',
        },
        {
          termine: 'Starting without a window',
          testo:
            '“Start without opening the register”, in the same group, does the same even when ' +
            'you launch it by hand. If there is no icon, the window opens anyway.',
        },
        {
          termine: 'With no year open',
          testo:
            'With the year closed, the menu lists the favourites and the recent ones, with ' +
            '**Open a year…**, **Create a new year…** and **Show the welcome screen**; a click ' +
            'on the icon leads to the welcome screen.',
        },
      ],
      note: [
        'The menu rebuilds itself every half minute and at every change in the register: a ' +
          'lesson that starts moves to “in progress” even with the windows closed. It rebuilds ' +
          'only if something really changed, so as not to flicker under your fingers.',
        'Turning the icon off (“Icon next to the clock”, in **General**) takes effect at the ' +
          'next start, and then the X closes the program again: without the icon there would ' +
          'be nothing left to click to get it back.',
      ],
    },
    promemoria: {
      titolo: 'The reminder before the lesson',
      sommario:
        'A system notification shortly before the lesson starts, even with the windows closed.',
      scritte: {
        titolo: 'I MEC A in 5 minutes',
        orario: '08:20–09:05 · Maths · B12',
        consegne: `${quanti(2, EN.pendenza)} (1 overdue, 1 to do): …`,
        unClic: 'one click',
        lezione: Uno(EN.lezione),
        paginaDellOra: 'the page of that lesson',
        unaVoltaSola: 'announced once only, within this window',
        avviso: '08:15 · reminder',
        inizio: '08:20 · start',
        ultimoAvviso: '08:35 · last reminder',
      },
      figure: [
        {
          didascalia:
            'The notification of a lesson starting at 08:20, with the default advance. Clicked, ' +
            'it opens the register at that lesson.',
          legenda: [
            'The advance: five minutes by default, from 0 to 120.',
            'The title: the class, and how long to go.',
            'Time, subject, room, and the assignments still open for that course.',
            'Catching up: a lesson already started is still announced for a quarter of an hour.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Changing the advance',
          testo:
            '“Minutes in advance”, in the “Lesson reminders” group of Settings › Program › ' +
            '**General**: zero makes the reminder arrive at the exact time.',
        },
        {
          termine: 'What is still open',
          testo:
            'The course’s assignments still to close — overdue, due, to do — with the titles of ' +
            'the first three. With nothing pending it says so: “Nothing pending for this ' +
            'course.”',
        },
        {
          termine: 'When it stays quiet',
          testo:
            'Never twice for the same lesson, never for a cancelled lesson, and not while the ' +
            'register is the window in front: there the status bar already says it. It also ' +
            'stays quiet for lessons that are starting just as the register opens.',
        },
        {
          termine: 'Turning it off',
          testo:
            '“Reminder before the lesson”, in the “Lesson reminders” group of Settings › ' +
            'Program › **General**.',
        },
      ],
      note: [
        'There is no alarm set for each lesson: the register looks at the clock every half ' +
          'minute. That way a laptop reopened at 08:22 still announces the 08:20 lesson, ' +
          'instead of missing it while it slept.',
        'It arrives even with all the windows closed, as long as the register stays running in ' +
          'the icon next to the clock.',
      ],
    },
    proiezione: {
      titolo: 'Projection',
      sommario:
        'The screen for the class: a different view of the same data, not the register.',
      scritte: {
        lezione: Uno(EN.lezione),
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        proiezione: 'Projection',
        spegni: 'Turn off the screen',
        inProiezione: 'On screen',
        scaletta: 'Outline',
        argomenti: 'Topics',
        consegne: 'Assignments',
        appello: 'Attendance',
        schermoDiChiInsegna: 'the teacher’s screen',
        unaScheda: 'one card',
        testata: 'I MEC A · Maths · 08:20',
        schermoDellaClasse: 'the class screen',
        senzaNomi: 'No names — default',
        nomiVisibili: 'Names shown',
        mediaSufficientiGrafico: 'average, passes, chart',
        votoDiCiascuno: '+ each person’s grade',
        arrivati: '18 of 22 handed in',
        chiNonLHaPortato: '+ who has not brought it',
        nomiSempre: 'names always show: it is there to be corrected',
        aDuePersone: '“for 2 people”',
        iLoroNomi: '+ their names',
      },
      figure: [
        {
          didascalia:
            'On the left what the teacher sees, on the right what the class sees. On the big ' +
            'screen there are no controls at all.',
          legenda: [
            '**Project** opens the screen; once on, the button says **Turn off the screen** and ' +
              'carries a green dot.',
            '**Projection** puts the screen’s controls in the action bar.',
            'The band: off, on and queued, on show. A click puts it on show.',
            'Only the card on show goes out: the rest does not leave the register.',
            'With at least two cards on, their names at the top: the class knows where you are.',
          ],
        },
        {
          didascalia:
            'The three private cards, and assignments given to single people: what the names ' +
            'switch adds.',
        },
      ],
      voci: [
        {
          termine: 'Turning it on',
          testo:
            '**Project**, at the right of the choices row. With “Full-screen projection” on in ' +
            'Settings › Program › **General**, the register sends it by itself to the second ' +
            'screen — in the classroom, the projector — and makes it full size; off, the window ' +
            'opens alongside and you move it by hand.',
        },
        {
          termine: 'It follows the open lesson',
          testo:
            'The screen shows the lesson open in the register, and updates by itself at every ' +
            'step ticked or topic written. With no lesson open it shows the chosen course; ' +
            'without even that, “Nothing to show”.',
        },
        {
          termine: 'The cards',
          testo:
            '**Outline**, **Topics**, **Assignments** and **Calendar** are on by default; ' +
            '**Assessments**, **Documents** and **Attendance** are turned on on purpose. A click ' +
            'on the one on show turns it off; **Previous card** and **Next card** go round in a ' +
            'circle.',
        },
        {
          termine: 'What they show',
          testo:
            'The plan’s outline; the lesson’s topics and materials; the class’s assignments ' +
            'still open, not the teacher’s; the course’s lessons, not the teacher’s whole ' +
            'timetable.',
        },
        {
          termine: 'The projected calendar',
          testo:
            '**Week**, **Month**, **Year** or **Agenda** — the default — are chosen with the ' +
            'Calendar card on show. The day is the one open in the register’s calendar.',
        },
        {
          termine: 'The names',
          testo:
            'By default the button says **No names**; pressed, it becomes **Names ' +
            'shown**. With a private card on show, the band says so: “On screen: assessments, ' +
            'with names.”',
        },
        {
          termine: 'The grades chart',
          testo:
            `One dot per ${EN.pif.singolare}, at their exact grade, red below the pass mark: the ` +
            'same chart as on the Assessments page and in the test’s PDF.',
        },
        {
          termine: 'Compact or large sizes',
          testo:
            'By default the sizes are compact: in front of a class nobody scrolls, and better ' +
            'everything visible than half off the edge. **Compact** switches to large, for ' +
            'long classrooms, and then the button says **Large**.',
        },
        {
          termine: 'Pause',
          testo:
            'Blanks the content and leaves the window where it is: useful when you go on to ' +
            'write something that must not be read. **Resume** brings everything back as it was.',
        },
      ],
      note: [
        'A card that is off is not hidden by the style sheet: it never even enters the message ' +
          'sent to the other screen. When paused no card goes out: only the lesson header ' +
          '(class, subject, time) travels, and the screen does not draw it.',
        'Opening another lesson in the register changes the screen in front of the class. ' +
          'That is why the private cards start off.',
        'The light theme is the easiest to read when projected: “Theme”, in Settings › ' +
          'Program › **General**.',
      ],
    },
    rigaDiComando: {
      titolo: 'Command line',
      sommario:
        'For those who automate: the running register answers a command from the terminal.',
      scritte: {
        terminale: 'Terminal',
        condotto: 'Pipe',
        maiLaRete: 'local, never the network',
        registro: 'Register',
        conLeProcedure: 'running, with the procedures',
        condottoAcceso: 'pipe: on',
        letturaSi: 'reading: yes',
        scritturaNo: 'writing: no',
        stesseDelPannello: 'the same as the window’s',
        eDellAssistente: 'and the assistant’s',
        rispostaInJson: 'the answer in JSON · exit 0, 1 or 2',
      },
      figure: [
        {
          didascalia:
            'A command knocks on the pipe, the running register answers. Without the register ' +
            'running, or with the pipe off, nobody answers.',
          legenda: [
            '`regi`: the installed register writes it by itself and puts it in the user’s PATH.',
            'The pipe: a local pipe (a socket outside Windows), never a network port.',
            'Three switches: “Local pipe”, then “Allow reading” (on of its own) and “Allow ' +
              'writing” (off).',
            'The procedures: the same as the window’s and the assistant’s, with the same rules.',
            'Data on stdout, errors on stderr; exit 0 done, 1 refused or badly written, 2 no ' +
              'answer.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Turning the pipe on',
          testo:
            '“Local pipe”, in Settings › Program › **Pipe and command line**: it applies at ' +
            'once, without restarting. The register must be running — the icon next to the ' +
            'clock is enough.',
        },
        {
          termine: 'The commands',
          testo:
            '`regi elenco` the procedures, `regi schema <procedura>` its fields, `regi ' +
            'chiama <procedura> --campo valore` calls it, `regi stato` says whether it answers ' +
            'and what is allowed, `regi catalogo` the procedures in JSON. `regi --aiuto` ' +
            'sums up. After the procedure name only options come: one word too many is an ' +
            'error, and the command exits with 1 without calling anything.',
        },
        {
          termine: 'An example',
          testo:
            '`regi chiama ore.prossima` gives the next lesson. `regi chiama corsi.elenco` ' +
            'gives the courses’ ids, and `regi chiama corso.presenze --corsoId …` the ' +
            'attendance, absences and averages of one.',
        },
        {
          termine: 'Field values',
          testo:
            'They are converted by looking at the schema: `--ud 3` is a number if the field is ' +
            'a number. `--campo=valore` is the same as `--campo valore`, and is there for a ' +
            'value that starts with `--`. An option with no value means true on a yes/no field; ' +
            'on any other field it is a forgotten value, and the command stops. A field given ' +
            'twice takes the last value, and says so.',
        },
        {
          termine: 'Lists',
          testo:
            'With commas, `--campo a,b,c`, or in JSON, `--campo \'["a","b"]\'`; `--campo ""` is ' +
            'the empty list. What an option cannot express — a list of objects — goes through ' +
            "`--json '{\"campo\": […]}'`: the whole input, always an object, which wins over the " +
            'options. `--json` followed by a list is refused; on its own it prints the raw ' +
            'answer.',
        },
        {
          termine: 'Reading and writing',
          testo:
            '“Allow reading” lets you look at attendance, absences, averages and calendar; ' +
            '“Allow writing” lets you take attendance, enter grades and send mail. A writing ' +
            'procedure without permission returns “non-permesso” and touches nothing.',
        },
        {
          termine: 'Where `regi` lives',
          testo:
            'The installed register rewrites it at every start: the first terminal opened after ' +
            'the first start sees it — on Linux and macOS, after the next sign-in to the system. ' +
            'The portable version does not have it.',
        },
        {
          termine: '“condotto.segreto” is missing',
          testo:
            'On Windows it means that with that data folder the pipe has never been on: ' +
            '`regi` does not know which name to knock on, and exits with 2 as if the register ' +
            'were not running. Turn the pipe on and try again. If you keep the data elsewhere — ' +
            'the portable version — give the address with the `REGISTRO_CONDOTTO` variable.',
        },
      ],
      note: [
        'With the pipe on, any program running under your user can call it without asking, ' +
          'and even reading alone gives out people’s data. Turn writing on for as long as the ' +
          'script needs it, and then off again.',
        '`regi` does not know the procedures: it asks the register for them at every call, ' +
          'and a new procedure can be called from here the same day. Not even with writing ' +
          'can a script widen the pipe’s permissions.',
        'On Windows the pipe’s name carries a secret, made anew each time it is turned on and written to ' +
          'the data folder: `regi` rereads it at every call, and another user of the same ' +
          'computer cannot grab the name first.',
        'If you write your own client, send one JSON-RPC line per request. After a line that ' +
          'is not JSON the pipe answers with the error and closes: lines already sent after ' +
          'that one are not run.',
      ],
    },
  },
})
