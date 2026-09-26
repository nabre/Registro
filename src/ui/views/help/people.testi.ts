// I testi della guida, parte dell'anno: persone, scheda, anagrafica, mappa.
// Una chiave per sezione (`TestiSezione`, testa di `types.ts`); struttura in
// `people.ts`.

import { catalogo } from '../../../i18n/index.js'
import { Molti, PERSONE, PIF, Uno, del } from '../../../domain/lexicon.js'
import { lessico } from '../../../domain/lexicon.testi.js'
import type { TestiSezione } from './types.js'

const DE = lessico.in('de')
const FR = lessico.in('fr')
const EN = lessico.in('en')

const it = {
  persone: {
    titolo: Molti(PIF),
    sommario:
      `Tutte le ${PIF.plurale} dell’anno in un elenco solo, e accanto la scheda di chi si ` +
      'sceglie.',
    scritte: {
      // La barra laterale dello schema: il Registro, L'anno, Il programma.
      lezione: 'Lezione',
      valutazioni: 'Valutazioni',
      check: 'Check',
      pianiLezione: 'Piani lezione',
      documenti: 'Documenti',
      classi: 'Classi',
      laterale: Molti(PIF),
      mappa: 'Mappa',
      corsi: 'Corsi',
      impostazioni: 'Impostazioni',
      guida: 'Guida',
      // La pagina.
      titolo: Molti(PIF),
      conti: '48 in formazione · 2 senza telefono',
      aTuttaPagina: 'A tutta pagina',
      anna: 'Rossi Anna',
      luca: 'Rossi Luca',
      marco: 'Rossi Marco',
      officina: 'Officina B.',
      ditta: 'Ditta V.',
      anagrafica: 'Anagrafica',
      docente: 'Docente di classe',
      materie: 'Materie',
      doveSta: 'Dove sta',
    },
    figure: [
      {
        didascalia:
          'A sinistra l’elenco che attraversa le classi, a destra la scheda di chi si è scelto. ' +
          'Cambiando nome l’elenco resta dov’era.',
        legenda: [
          'La casella di ricerca: filtra a ogni lettera.',
          'Una classe chiusa: un clic la apre, e il numero dice quanti sono.',
          'Il nome scelto, con sotto classe e azienda. Chi non frequenta più è spento.',
          'Il sottotitolo: quante sono, e che cosa manca a qualcuna.',
          '**A tutta pagina** e **Modifica**, per la persona scelta.',
          'La scheda accanto: la stessa che si apre a tutta pagina.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Cercare',
        testo:
          'La casella filtra a ogni lettera su nome, classe, azienda, indirizzi, e-mail e ' +
          'numeri di telefono. Più parole valgono insieme: «rossi dic» trova Rossi della DIC4a. ' +
          'Accenti e apostrofi non contano, e «dellacqua» trova Dell’Acqua.',
      },
      {
        termine: 'Per classe',
        testo:
          'I nomi stanno raccolti per classe, in ordine di cognome. Le classi partono chiuse; ' +
          'quelle che si aprono restano aperte tornando alla pagina, e mentre si cerca si ' +
          'aprono tutte da sole.',
      },
      {
        termine: 'Chi non frequenta più',
        testo:
          'Resta in elenco, spento; accanto al nome della scheda c’è la pastiglia **non ' +
          'frequenta**, e a tutta pagina il sottotitolo dice «ritirato». Presenze e voti ' +
          'dell’anno si guardano ancora.',
      },
      {
        termine: 'La scheda accanto',
        testo:
          'Un clic su un nome la apre nella metà destra. Se la ricerca poi esclude quel nome, ' +
          'la scheda resta aperta lo stesso.',
      },
      {
        termine: 'A tutta pagina, e Modifica',
        testo:
          '**A tutta pagina** apre la scheda da sola, con le frecce per scorrere la classe. ' +
          '**Modifica** apre il modulo dell’anagrafica.',
      },
      {
        termine: 'In testa, i buchi',
        testo:
          `Il sottotitolo conta quante ${PIF.plurale} ci sono, quante non frequentano più, ` +
          `quante sono senza ${PERSONE.azienda.singolare} e quante senza un numero di ` +
          'telefono loro.',
      },
      {
        termine: 'Da dove entrano',
        testo:
          `Da qui con **Nuova ${PIF.singolare}**, nella riga delle azioni: il modulo chiede in ` +
          'che classe entra. Oppure dentro una classe, in **Classi**, una per volta o ' +
          'incollando l’elenco. Con l’elenco vuoto la pagina porta là con **Vai alle classi**.',
      },
    ],
    note: [
      'Scrivendo nella casella si rifà solo l’elenco: la scheda accanto, con la foto e la ' +
        'mappa piccola, non si ridisegna a ogni lettera. Per lo stesso motivo la ricerca non ' +
        'si salva: riaprendo il registro la casella è vuota, le classi aperte invece no.',
      'Al telefono si cerca per quel che si sa: il paese, un pezzo di numero, il nome della ' +
        'ditta. Non serve sapere in che classe sta.',
    ],
  },
  scheda: {
    titolo: `La scheda ${del(PIF)}`,
    sommario:
      'Tutto quel che il registro sa di una persona, in tre linguette. Quasi tutto si legge ' +
      'e basta: si scrivono l’anagrafica e le spunte del check.',
    scritte: {
      sottotitolo: 'DIC4a · 1° semestre · 3 di 24',
      tornaAllElenco: 'Torna all’elenco',
      pif: Uno(PERSONE.pif),
      rappresentante: Uno(PERSONE.rappresentante),
      azienda: Uno(PERSONE.azienda),
      manca: 'Manca: telefono del datore di lavoro.',
      doveSta: 'Dove sta',
      distanze: 'casa a 12 km · lavoro 4 km',
      giorno: 'giorno',
      materie: 'materie',
      lun: 'lun',
      gio: 'gio',
      disegno: 'Disegno',
      calcolo: 'Calcolo',
      sigle:
        'P presente · X assente · R in ritardo · E esonerato · - non impostato',
      numeri: '8% di assenza · nota 5 · 12 ore',
      presenze: 'Presenze',
      giornateStorte: 'giornate storte',
      valutazioni: 'Valutazioni',
      notaEProve: 'nota e prove',
      comEAndata: 'Com’è andata',
      laMatrice: 'la matrice',
      osservazioni: 'Osservazioni',
      annotate: 'annotate',
    },
    figure: [
      {
        didascalia:
          'La scheda a tutta pagina, sulla linguetta Anagrafica. Accanto all’elenco delle ' +
          'persone è la stessa, senza frecce.',
        legenda: [
          'Le frecce passano alla persona prima e dopo nella classe; il conto dice dove si è.',
          'Le linguette. **Docente di classe** c’è solo nelle classi che si seguono.',
          'Il tasto accanto a nomi, e-mail, telefoni e indirizzi copia negli appunti.',
          '**Dove sta**: casa, azienda e sede, con le distanze in testa.',
        ],
      },
      {
        didascalia:
          'La linguetta Materie: a sinistra la matrice «Giorno per giorno» di **Nel ' +
          'complesso**, a destra il riquadro di una materia.',
        legenda: [
          'Una colonna per ora d’inizio, non per posizione: le 08:20 del lunedì stanno ' +
            'sopra le 08:20 del giovedì.',
          'Casella vuota: quel giorno, a quell’ora, non c’era lezione.',
          'Una casella è un’UD con la sua sigla, e un clic apre quella lezione.',
          'Un filo separa le settimane.',
          'Le sigle sono quelle dell’appello e dei fogli stampati.',
          'Il riquadro di una materia: in testa assenza, nota e ore tenute; dentro quattro ' +
            'parti, sempre in quest’ordine, più il check quando il corso ne ha uno.',
        ],
      },
    ],
    voci: [
      {
        termine: 'Da dove si apre',
        testo:
          `Da un nome in ${Molti(PIF)} o in Classi, dalla torta di un compleanno sul ` +
          'calendario, da un nome sulla mappa, dalla tabella di un corso, da **Apri la ' +
          'scheda** di una segnalazione di assenze.',
      },
      {
        termine: 'Scorrere la classe',
        testo:
          'A tutta pagina le frecce su e giù passano alla persona prima e dopo, nell’ordine ' +
          'dell’elenco e compresi i ritirati; il sottotitolo dice «3 di 24». **Torna ' +
          `all’elenco** porta a ${Molti(PIF)}.`,
      },
      {
        termine: 'La riga delle azioni',
        testo:
          'A tutta pagina porta i gesti della sua classe: **Aggiungi al gruppo**, **Incolla ' +
          'elenco**, **Nuova comunicazione**, **Nuovo periodo assenze**.',
      },
      {
        termine: 'Le tre linguette',
        testo:
          '**Anagrafica**, **Docente di classe** e **Materie**. La seconda c’è solo se la ' +
          'classe ha la spunta «Sono docente di classe»; la linguetta scelta resta quella ' +
          'passando da una persona all’altra.',
      },
      {
        termine: 'Anagrafica',
        testo:
          `Tre blocchi — ${PIF.singolare}, ${PERSONE.rappresentante.singolare}, ` +
          `${PERSONE.azienda.singolare} — con solo le righe piene, e in fondo «Manca: …». ` +
          'Sotto i diciotto anni la data di nascita porta la pastiglia **minorenne**.',
      },
      {
        termine: 'Chiamare, scrivere, copiare',
        testo:
          'Un’e-mail premuta apre un messaggio nuovo, un numero premuto lo compone; il tasto ' +
          'accanto copia. Un numero con dentro parole, come «int. 12», resta solo da copiare.',
      },
      {
        termine: 'Con che programma',
        testo:
          'Lo dice **Impostazioni** › Comunicazioni: per le chiamate quello ' +
          'di sistema, Teams o Skype; per la posta quello di sistema, Outlook o Outlook sul ' +
          'web. Con «nessuno» resta solo il tasto che copia.',
      },
      {
        termine: 'Sotto un indirizzo',
        testo:
          'Le coordinate, la distanza dalla sede e che cosa ha capito il servizio delle mappe; ' +
          '«anche …» se qualcun altro sta lì, e **Sulla mappa**. Un indirizzo non ancora ' +
          'collocato ha **Trova**, che cerca solo quelli di questa persona.',
      },
      {
        termine: 'Dove sta',
        testo:
          'Una mappa piccola con casa, azienda e sede, che si trascina e si ingrandisce; in ' +
          'testa le distanze, anche fra casa e lavoro. **Apri la mappa** porta alla pagina ' +
          'intera. Senza indirizzi collocati il riquadro non c’è.',
      },
      {
        termine: 'Docente di classe',
        testo:
          'I documenti chiesti a lei, **consegnato** o **atteso**, e le assenze da far ' +
          'firmare periodo per periodo: da spedire, in attesa di firma, firmato. **Apri le ' +
          'assenze** porta alla pagina dove si stampano e si spediscono.',
      },
      {
        termine: 'Nel complesso',
        testo:
          'In cima alle Materie, sul periodo della tendina **Periodo**: UD previste, UD con ' +
          'appello, presenza, assenza — in rosso oltre la soglia — e, se ce ne sono, ritardi, ' +
          'esoneri e segni della matrice. Sotto, la matrice **Giorno per giorno**.',
      },
      {
        termine: 'Un riquadro per materia',
        testo:
          'Presenze (solo le giornate storte), Valutazioni (nota, media e prove), Com’è ' +
          'andata (la matrice del comportamento, ora per ora) e Osservazioni. Ogni data si ' +
          'preme e apre l’ora o la prova.',
      },
      {
        termine: 'Il check',
        testo:
          'Nelle Materie, ogni materia con un check ha il riquadro **Check**: una casella per ' +
          'colonna, con il giorno e con «in lezione» o «a mano». Il clic spunta una casella ' +
          'vuota e toglie la spunta data oggi; una spuntata in un altro giorno si cambia solo ' +
          'dal tasto destro. È la stessa regola delle spunte delle consegne.',
      },
      {
        termine: 'La scheda in PDF',
        testo:
          `Non si stampa da qui: sta in **Documenti**, scheda ${Molti(PIF)}, una per persona ` +
          'per corso e per periodo.',
      },
    ],
    note: [
      'Le due percentuali hanno due denominatori. La presenza sta sulle UD con l’appello ' +
        'fatto, esoneri esclusi: dice come sta andando. L’assenza sta sulle UD che l’orario ' +
        'prevede nel periodo: è la cifra del rapporto e della soglia.',
      'La soglia vale materia per materia: il totale di **Nel complesso** può stare sotto ' +
        'mentre una materia è già oltre. Il suo riquadro lo dice in rosso.',
    ],
  },
  anagraficaPersona: {
    titolo: 'Scrivere l’anagrafica',
    sommario:
      `Il modulo **Modifica**: chi è, come la si raggiunge, ${PERSONE.rappresentante.singolare} ` +
      `e ${PERSONE.azienda.singolare}.`,
    scritte: {
      nascita: 'Data di nascita',
      nascitaDove: 'Età e «minorenne»',
      nascitaCome: 'e la torta sul calendario',
      frequenta: 'Frequenta',
      frequentaDove: 'Appelli, mappa, posta',
      frequentaCome: 'tolta la spunta, ne esce',
      indirizzi: 'Indirizzi',
      indirizziDove: 'Mappa e distanze',
      indirizziCome: 'una domanda per indirizzo',
      emailDove: 'Comunicazioni',
      emailCome: 'la sua e del rappresentante',
      emailDatore: `E-mail ${del(PERSONE.datore)}`,
      emailDatoreDove: 'Firme delle assenze',
      emailDatoreCome: 'senza, la richiesta non parte',
      telefoni: 'Telefoni',
      telefoniDove: 'Fogli stampati',
      telefoniCome: 'ci va il primo numero',
      foto: 'Foto',
      fotoDove: 'Scheda in PDF',
      fotoCome: 'e la foto della classe',
    },
    figure: [
      {
        didascalia:
          'Dove finisce quel che si scrive nel modulo. Una casella vuota non rompe niente, ' +
          'ma spegne quel che sta alla sua destra.',
      },
    ],
    voci: [
      {
        termine: 'Dove si apre',
        testo:
          `**Modifica** in testa a ${Molti(PIF)}, nella scheda a tutta pagina e nel riquadro ` +
          'Anagrafica; o dalla matita accanto al nome in Classi. In cima la **Classe**: si ' +
          'sceglie per una persona nuova, poi si legge soltanto. Sotto, quattro parti: **Chi ' +
          `è**, **Come la si raggiunge**, ${Uno(PERSONE.rappresentante)}, ` +
          `${Uno(PERSONE.azienda)}.`,
      },
      {
        termine: 'Frequenta',
        testo:
          'Togliendo la spunta la persona esce dagli appelli, dalla mappa, dai compleanni e ' +
          'dalle comunicazioni, ma presenze e voti restano.',
      },
      {
        termine: 'La foto',
        testo:
          '**Aggiungi foto**, **Cambia foto** e **Togli**: un JPEG o un PNG, che vale subito, ' +
          'senza aspettare **Salva**. Su una persona nuova i comandi sono spenti finché non ' +
          'la si salva una prima volta.',
      },
      {
        termine: 'I telefoni',
        testo:
          'Uno o più per ciascuno dei tre, con **Aggiungi un numero**, e per ognuno che numero ' +
          'è: cellulare, casa, lavoro, centralino, altro. Il primo è quello che si prova per ' +
          'primo e che va sui fogli: l’ordine si cambia trascinando la riga per la presa.',
      },
      {
        termine: 'Il prefisso',
        testo:
          'Salvando, un numero senza prefisso prende il `+41` e tiene la spaziatura di chi l’ha ' +
          'scritto. Uno che il prefisso ce l’ha già, o che ha parole dentro, non si tocca.',
      },
      {
        termine: 'Gli indirizzi',
        testo:
          '**Via e numero**, **NAP** e **Località** sopra; **Presso**, **Casella postale** e ' +
          '**Paese** sotto, per chi li ha. Il NAP estero porta la sigla: `I-22100`. Sotto la ' +
          'via, il modulo dice se l’indirizzo è già sulla mappa.',
      },
      {
        termine: `${Uno(PERSONE.rappresentante)}`,
        testo:
          'Un’e-mail, che riceve le comunicazioni al posto suo o insieme, e i suoi numeri: ' +
          'quelli di chi risponde per lei da minorenne.',
      },
      {
        termine: `${Uno(PERSONE.azienda)}`,
        testo:
          `Il nome, l’indirizzo del posto di lavoro, l’e-mail ${del(PERSONE.datore)} e i numeri. ` +
          `L’e-mail ${del(PERSONE.datore)} riceve i fogli delle assenze da controfirmare: ` +
          'senza, la richiesta non parte.',
      },
    ],
    note: [
      '**Togli dalla classe**, in fondo al modulo, cancella la persona con le sue presenze ' +
        'e i suoi voti. Per chi si ritira basta togliere la spunta **Frequenta**.',
      'Il punto sulla mappa appartiene all’indirizzo, non alla persona: correggendo la via ' +
        'l’indirizzo nuovo non ha ancora coordinate, e va cercato con **Trova**.',
    ],
  },
  mappa: {
    titolo: 'Mappa',
    sommario:
      `Una carta sola con tutti i punti: dove abitano e dove lavorano le ${PIF.plurale}, ` +
      'e la sede.',
    scritte: {
      conti: '40 indirizzi su 42 sulla mappa · 3 in comune',
      lavoro: 'Posto di lavoro',
      domicilio: 'Domicilio',
      via1: 'Via dei Pini 3, Paese',
      chi1: 'Anna R. · domicilio',
      trova: 'Trova',
      via2: 'Via Alta 12, Borgo',
      soloPaese: 'solo il paese',
      via3: 'Via Nuova 5, Riva',
      inTirocinio: '3 in tirocinio',
      via4: 'Via Sole 8, Lago',
      chi4: 'Luca B. · domicilio',
      distanza: '4,1 km',
      inTirocinioQui: '3 in tirocinio qui',
      sede: 'sede',
      rigaScritta: 'La riga scritta',
      dallAnagrafica: 'dall’anagrafica',
      spezzata: 'Spezzata',
      parti: 'via, NAP, paese',
      quattro: 'Quattro domande',
      laPrima: 'la prima che trova',
      punto: 'Il punto',
      nelDocumento: 'nel documento',
      esempio1: 'Studio X, Via Alta 12,',
      esempio2: 'CP 5, 6500 Borgo',
      messi: 'messi da parte:',
      quali: '«Studio X», «CP 5»',
      parte1: 'qui parte la riga',
      parte2: 'intera: presso e CP',
      domanda1: 'via e civico',
      domanda2: 'solo la via',
      domanda3: 'la riga intera',
      domanda4: 'solo il paese',
      una1: 'una per indirizzo:',
      una2: 'vale per tutti quelli',
      una3: 'che ci stanno',
    },
    figure: [
      {
        didascalia:
          'A sinistra gli indirizzi, a destra la carta: si legge una riga e si guarda dove ' +
          'cade. Un clic su una riga porta la carta lì.',
        legenda: [
          'Tre schede: **Tutti**, **Posto di lavoro**, **Domicilio**. Comandano elenco e ' +
            'carta insieme.',
          'In cima quel che non è ancora sulla carta, con il suo **Trova**.',
          '«solo il paese»: la via non c’è in OpenStreetMap, e il punto è il centro del paese.',
          'Un indirizzo che più persone hanno in comune: una riga sola.',
          'Il cartellino: chi sta lì, con la classe. Ogni nome porta alla sua scheda.',
          'Il tragitto da casa al posto di lavoro.',
          'La sede: da qui si contano le distanze, in linea d’aria.',
        ],
      },
      {
        didascalia:
          'Come un indirizzo diventa un punto. Per le domande spezzate si mette da parte quel ' +
          'che non è un indirizzo; se non bastano, parte la riga intera, «presso» e casella ' +
          'postale compresi. Ci si ferma alla prima risposta.',
      },
    ],
    voci: [
      {
        termine: 'Che cosa si vede',
        testo:
          'Un segnaposto per ogni domicilio e posto di lavoro scritto in anagrafica, più la ' +
          `sede. Ci sono le ${PIF.plurale} che frequentano, di tutte le classi dell’anno non ` +
          'archiviate o di quella scelta.',
      },
      {
        termine: 'Figura e colore',
        testo:
          'La figura nella punta dice che posto è: una casa, un’azienda, la scuola. Il colore ' +
          'è quello della classe nel calendario, ma solo per le case di una classe sola: ' +
          'aziende e case condivise fra classi restano senza.',
      },
      {
        termine: 'Un segnaposto è un indirizzo',
        testo:
          'Due fratelli sono una casa sola, sei tirocinanti nella stessa officina un capannone ' +
          'solo: il cartellino li elenca tutti. Se due della stessa ditta finiscono su due ' +
          'righe, uno dei due indirizzi è scritto diverso.',
      },
      {
        termine: 'L’elenco a sinistra',
        testo:
          'Prima gli indirizzi senza punto, poi quelli caduti sul paese, poi gli altri dal più ' +
          'lontano. Un posto di lavoro si legge con il nome della ditta in testa; sotto, i nomi ' +
          'con la casa o l’azienda davanti, e da ognuno si va alla scheda.',
      },
      {
        termine: 'Muoversi sulla carta',
        testo:
          'Si trascina e si ingrandisce con la rotella; **Inquadra tutto**, nella riga delle ' +
          'azioni, rimette dentro ogni punto acceso. Un clic su un segnaposto apre il suo ' +
          'cartellino, un clic sul vuoto lo chiude.',
      },
      {
        termine: 'I tragitti',
        testo:
          'La riga tratteggiata va dalla casa al posto di lavoro della stessa persona, e c’è ' +
          'solo in **Tutti**, dove si vedono tutti e due i capi. Il mouse sopra la accende con ' +
          'nome e chilometri; un clic la tiene accesa e smorza il resto.',
      },
      {
        termine: 'Trova gli indirizzi',
        testo:
          'Nella riga delle azioni: chiede a OpenStreetMap gli indirizzi che non hanno ancora ' +
          'un punto, uno al secondo, al massimo sessanta per volta — per gli altri si preme ' +
          'di nuovo. Spento quando ogni indirizzo è già sulla carta.',
      },
      {
        termine: '«solo il paese»',
        testo:
          'La via non c’è in OpenStreetMap e il punto è il centro del paese. Serve lo stesso — ' +
          '«viene da Olivone» è una risposta — ma a quel segnaposto non ci si va in macchina.',
      },
      {
        termine: 'Quando un punto non torna',
        testo:
          'Quel che il servizio ha capito si legge nella scheda della persona, sotto ' +
          'l’indirizzo. Si corregge da **Modifica** e si preme **Trova**. **Rifai gli ' +
          'indirizzi** richiede da capo anche quelli già sulla carta, dopo una conferma: ' +
          'circa un secondo ciascuno, al massimo sessanta per volta.',
      },
      {
        termine: 'I conti in testa',
        testo:
          'Quanti indirizzi sono sulla carta su quanti scritti, quanti sono in comune, e ' +
          `quante ${PIF.plurale} non hanno nessun indirizzo: senza quel numero sembrerebbe ` +
          'che non abitino da nessuna parte.',
      },
      {
        termine: 'Una classe o tutte',
        testo:
          'Di partenza tutte le classi insieme: la domanda è «chi viene da dove», e gli ' +
          'indirizzi in comune sono quasi sempre fra classi diverse. Con almeno due classi, la ' +
          'tendina **Classe** accanto a **Periodo** restringe carta ed elenco a una sola, per ' +
          'preparare le visite di quella.',
      },
    ],
    note: [
      '**Trova gli indirizzi**, **Rifai gli indirizzi** e i **Trova** della mappa e della ' +
        'scheda sono gli unici gesti che mandano fuori un dato dell’anagrafica, e per questo ' +
        'si premono a mano. Parte la riga dell’indirizzo, e se le domande spezzate non ' +
        'bastano parte intera: anche un nome scritto in **Presso** e la casella postale.',
      'Una domanda per indirizzo, non per persona: la risposta resta scritta nel documento ' +
        'e vale per tutti quelli che stanno lì. Le carte arrivano da OpenStreetMap — che ' +
        'così vede quali zone si guardano — e restano in una memoria del computer, fuori ' +
        'dal documento.',
    ],
  },
} satisfies Record<string, TestiSezione>

export const testi = catalogo(it, {
  de: {
    persone: {
      titolo: Molti(DE.pif),
      sommario:
        `Alle ${DE.pif.plurale} des Schuljahrs in einer einzigen Liste, und daneben das Blatt ` +
        'der gewählten Person.',
      scritte: {
        lezione: Uno(DE.lezione),
        valutazioni: 'Beurteilungen',
        check: 'Check',
        pianiLezione: Molti(DE.pianoLezione),
        documenti: 'Dokumente',
        classi: 'Klassen',
        laterale: Molti(DE.pif),
        mappa: 'Karte',
        corsi: 'Kurse',
        impostazioni: 'Einstellungen',
        guida: 'Hilfe',
        titolo: Molti(DE.pif),
        conti: '48 in Ausbildung · 2 ohne Telefon',
        aTuttaPagina: 'Ganze Seite',
        anna: 'Rossi Anna',
        luca: 'Rossi Luca',
        marco: 'Rossi Marco',
        officina: 'Werkstatt B.',
        ditta: 'Firma V.',
        anagrafica: 'Personalien',
        docente: Uno(DE.docenteClasse),
        materie: 'Fächer',
        doveSta: 'Wohnort',
      },
      figure: [
        {
          didascalia:
            'Links die Liste über alle Klassen hinweg, rechts das Blatt der gewählten Person. ' +
            'Wechselt man den Namen, bleibt die Liste, wo sie war.',
          legenda: [
            'Das Suchfeld: filtert bei jedem Buchstaben.',
            'Eine geschlossene Klasse: Ein Klick öffnet sie, und die Zahl sagt, wie viele es ' +
              'sind.',
            'Der gewählte Name, darunter Klasse und Lehrbetrieb. Wer nicht mehr dabei ist, ' +
              'erscheint ausgegraut.',
            'Der Untertitel: wie viele es sind, und was einzelnen fehlt.',
            '**Ganze Seite** und **Bearbeiten**, für die gewählte Person.',
            'Das Blatt daneben: dasselbe, das sich auf der ganzen Seite öffnet.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Suchen',
          testo:
            'Das Feld filtert bei jedem Buchstaben nach Name, Klasse, Lehrbetrieb, Adressen, ' +
            'E-Mail und Telefonnummern. Mehrere Wörter gelten zusammen: «rossi dic» findet ' +
            'Rossi aus der DIC4a. Akzente und Apostrophe zählen nicht, und «dellacqua» findet ' +
            'Dell’Acqua.',
        },
        {
          termine: 'Nach Klasse',
          testo:
            'Die Namen sind nach Klasse gruppiert, nach Nachnamen geordnet. Die Klassen sind zu ' +
            'Beginn geschlossen; die geöffneten bleiben offen, wenn man zur Seite zurückkehrt, ' +
            'und während der Suche öffnen sich alle von selbst.',
        },
        {
          termine: 'Wer nicht mehr dabei ist',
          testo:
            'Bleibt in der Liste, ausgegraut; neben dem Namen im Blatt steht das Etikett ' +
            '**besucht nicht mehr**, und auf der ganzen Seite sagt der Untertitel ' +
            '«ausgetreten». Präsenzen und Noten des Schuljahrs lassen sich weiter ansehen.',
        },
        {
          termine: 'Das Blatt daneben',
          testo:
            'Ein Klick auf einen Namen öffnet es in der rechten Hälfte. Schliesst die Suche ' +
            'diesen Namen danach aus, bleibt das Blatt trotzdem offen.',
        },
        {
          termine: 'Ganze Seite und Bearbeiten',
          testo:
            '**Ganze Seite** öffnet das Blatt allein, mit den Pfeilen, um durch die Klasse zu ' +
            'blättern. **Bearbeiten** öffnet das Formular der Personalien.',
        },
        {
          termine: 'Oben die Lücken',
          testo:
            `Der Untertitel zählt, wie viele ${DE.pif.plurale} es gibt, wie viele nicht mehr ` +
            `dabei sind, wie viele ohne ${DE.azienda.singolare} und wie viele ohne eigene ` +
            'Telefonnummer.',
        },
        {
          termine: 'Woher sie kommen',
          testo:
            'Von hier aus mit **Neue Lernende** in der Aktionsleiste: Das Formular fragt, in ' +
            'welche Klasse die Person kommt. Oder in einer Klasse, unter **Klassen**, einzeln ' +
            'oder durch Einfügen der Liste. Ist die Liste leer, führt die Seite mit **Zu den ' +
            'Klassen** dorthin.',
        },
      ],
      note: [
        'Tippt man ins Feld, wird nur die Liste neu gezeichnet: Das Blatt daneben, mit Foto ' +
          'und kleiner Karte, wird nicht bei jedem Buchstaben neu gezeichnet. Aus demselben ' +
          'Grund wird die Suche nicht gespeichert: Öffnet man das Klassenbuch wieder, ist das ' +
          'Feld leer, die geöffneten Klassen dagegen nicht.',
        'Am Telefon sucht man nach dem, was man weiss: dem Ort, einem Teil der Nummer, dem ' +
          'Namen der Firma. Man muss nicht wissen, in welcher Klasse die Person ist.',
      ],
    },
    scheda: {
      titolo: 'Das Personenblatt',
      sommario:
        'Alles, was das Klassenbuch über eine Person weiss, in drei Reitern. Fast alles liest ' +
        'man nur: Schreiben kann man die Personalien und die Häkchen des Checks.',
      scritte: {
        sottotitolo: 'DIC4a · 1. Semester · 3 von 24',
        tornaAllElenco: 'Zurück zur Liste',
        pif: Uno(DE.pif),
        rappresentante: Uno(DE.rappresentante),
        azienda: Uno(DE.azienda),
        manca: 'Es fehlt: Telefon des Arbeitgebers.',
        doveSta: 'Wohnort und Lehrbetrieb',
        distanze: 'Wohnort 12 · Arbeit 4 km',
        giorno: 'Tag',
        materie: 'Fächer',
        lun: 'Mo',
        gio: 'Do',
        disegno: 'Zeichnen',
        calcolo: 'Rechnen',
        sigle:
          'P anwesend · X abwesend · R verspätet · E dispensiert · - nicht erfasst',
        numeri: '8 % Absenz · Note 5 · 12 Stunden',
        presenze: 'Anwesenheit',
        giornateStorte: 'schwierige Tage',
        valutazioni: 'Beurteilungen',
        notaEProve: 'Note, Prüfungen',
        comEAndata: 'Wie es lief',
        laMatrice: 'das Raster',
        osservazioni: 'Beobachtungen',
        annotate: 'notiert',
      },
      figure: [
        {
          didascalia:
            'Das Blatt auf der ganzen Seite, beim Reiter Personalien. Neben der Liste der ' +
            'Personen ist es dasselbe, ohne Pfeile.',
          legenda: [
            'Die Pfeile gehen zur vorherigen und nächsten Person der Klasse; die Zählung sagt, ' +
              'wo man ist.',
            `Die Reiter. **${Uno(DE.docenteClasse)}** gibt es nur in den Klassen, die man als ` +
              'Klassenlehrperson betreut.',
            'Die Taste neben Namen, E-Mails, Telefonnummern und Adressen kopiert in die ' +
              'Zwischenablage.',
            '**Wohnort und Lehrbetrieb**: Wohnort, Betrieb und Schule, oben die Distanzen.',
          ],
        },
        {
          didascalia:
            'Der Reiter Fächer: links das Raster «Tag für Tag» von **Insgesamt**, rechts das ' +
            'Feld eines Fachs.',
          legenda: [
            'Eine Spalte pro Anfangszeit, nicht pro Position: 08:20 am Montag steht über 08:20 ' +
              'am Donnerstag.',
            'Leeres Feld: An diesem Tag gab es zu dieser Zeit keinen Unterricht.',
            'Ein Feld ist eine Lektion mit ihrem Kürzel, und ein Klick öffnet diese Stunde.',
            'Ein Strich trennt die Wochen.',
            'Die Kürzel sind die der Präsenzkontrolle und der gedruckten Blätter.',
            'Das Feld eines Fachs: oben Absenz, Note und gehaltene Stunden; darin vier Teile, ' +
              'immer in dieser Reihenfolge, dazu der Check, wenn der Kurs einen hat.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Von wo es sich öffnet',
          testo:
            `Von einem Namen unter ${Molti(DE.pif)} oder Klassen, vom Geburtstagskuchen im ` +
            'Kalender, von einem Namen auf der Karte, aus der Tabelle eines Kurses, über ' +
            '**Personenblatt öffnen** bei einer Absenzmeldung.',
        },
        {
          termine: 'Durch die Klasse blättern',
          testo:
            'Auf der ganzen Seite gehen die Pfeile nach oben und unten zur vorherigen und ' +
            'nächsten Person, in der Reihenfolge der Liste und samt den Ausgetretenen; der ' +
            `Untertitel sagt «3 von 24». **Zurück zur Liste** führt zu ${Molti(DE.pif)}.`,
        },
        {
          termine: 'Die Aktionsleiste',
          testo:
            'Auf der ganzen Seite bringt sie die Befehle der Klasse: **Zur Gruppe hinzufügen**, ' +
            '**Liste einfügen**, **Neue Mitteilung**, **Neuer Absenzzeitraum**.',
        },
        {
          termine: 'Die drei Reiter',
          testo:
            `**Personalien**, **${Uno(DE.docenteClasse)}** und **Fächer**. Den zweiten gibt ` +
            'es nur, wenn die Klasse das Häkchen «Ich bin Klassenlehrperson» hat; der gewählte ' +
            'Reiter bleibt, wenn man von einer Person zur nächsten wechselt.',
        },
        {
          termine: 'Personalien',
          testo:
            `Drei Blöcke — ${Uno(DE.pif)}, ${Uno(DE.rappresentante)}, ${Uno(DE.azienda)} — ` +
            'mit nur den ausgefüllten Zeilen, und unten «Es fehlt: …». Unter achtzehn Jahren ' +
            'trägt das Geburtsdatum das Etikett **minderjährig**.',
        },
        {
          termine: 'Anrufen, schreiben, kopieren',
          testo:
            'Eine angeklickte E-Mail öffnet eine neue Nachricht, eine angeklickte Nummer wählt ' +
            'sie; die Taste daneben kopiert. Eine Nummer mit Wörtern darin, wie «int. 12», kann ' +
            'man nur kopieren.',
        },
        {
          termine: 'Mit welchem Programm',
          testo:
            'Das sagt **Einstellungen** › Kommunikation: für Anrufe das des Systems, Teams oder ' +
            'Skype; für die Post das des Systems, Outlook oder Outlook im Web. Mit «Keines» ' +
            'bleibt nur die Taste zum Kopieren.',
        },
        {
          termine: 'Unter einer Adresse',
          testo:
            'Die Koordinaten, die Distanz zur Schule und was der Kartendienst verstanden hat; ' +
            '«auch …», wenn noch jemand dort wohnt, und **Auf der Karte**. Eine noch nicht ' +
            'verortete Adresse hat **Finden**, das nur die Adressen dieser Person sucht.',
        },
        {
          termine: 'Wohnort und Lehrbetrieb',
          testo:
            'Eine kleine Karte mit Wohnort, Betrieb und Schule, die man verschieben und ' +
            'vergrössern kann; oben die Distanzen, auch zwischen Wohnort und Arbeit. **Karte ' +
            'öffnen** führt zur ganzen Seite. Ohne verortete Adressen gibt es das Feld nicht.',
        },
        {
          termine: Uno(DE.docenteClasse),
          testo:
            'Die bei der Person angeforderten Dokumente, **abgegeben** oder **ausstehend**, und ' +
            'die Absenzen zum Unterschreiben, Zeitraum für Zeitraum: zu verschicken, wartet auf ' +
            'Unterschrift, unterschrieben. **Absenzen öffnen** führt zur Seite, auf der man sie ' +
            'druckt und verschickt.',
        },
        {
          termine: 'Insgesamt',
          testo:
            'Oben bei den Fächern, für den Zeitraum der Auswahl **Zeitraum**: vorgesehene ' +
            'Lektionen, Lektionen mit Präsenzkontrolle, Anwesenheit, Absenz — rot über der ' +
            'Schwelle — und, falls vorhanden, Verspätungen, Dispensationen und Zeichen im ' +
            'Raster. Darunter das Raster **Tag für Tag**.',
        },
        {
          termine: 'Ein Feld pro Fach',
          testo:
            'Anwesenheit (nur die schwierigen Tage), Beurteilungen (Note, Durchschnitt und ' +
            'Prüfungen), Wie es lief (das Verhaltensraster, Stunde für Stunde) und ' +
            'Beobachtungen. Jedes Datum lässt sich anklicken und öffnet die Stunde oder die ' +
            'Prüfung.',
        },
        {
          termine: 'Der Check',
          testo:
            'Bei den Fächern hat jedes Fach mit einem Check das Feld **Check**: ein Kästchen pro ' +
            'Spalte, mit dem Tag und mit «im Unterricht» oder «von Hand». Der Klick hakt ein ' +
            'leeres Kästchen an und entfernt ein heute gesetztes Häkchen; eines von einem ' +
            'anderen Tag ändert man nur mit der rechten Maustaste. Es ist dieselbe Regel wie bei ' +
            'den Häkchen der Aufträge.',
        },
        {
          termine: 'Das Blatt als PDF',
          testo:
            'Es wird nicht von hier gedruckt: Es liegt unter **Dokumente**, Reiter ' +
            `${Molti(DE.pif)}, eines pro Person, pro Kurs und pro Zeitraum.`,
        },
      ],
      note: [
        'Die beiden Prozentsätze haben zwei Nenner. Die Anwesenheit bezieht sich auf die ' +
          'Lektionen mit gemachter Präsenzkontrolle, ohne Dispensationen: Sie sagt, wie es ' +
          'läuft. Die Absenz bezieht sich auf die Lektionen, die der Stundenplan im Zeitraum ' +
          'vorsieht: Sie ist die Zahl des Berichts und der Schwelle.',
        'Die Schwelle gilt Fach für Fach: Der Gesamtwert unter **Insgesamt** kann darunter ' +
          'liegen, während ein Fach schon darüber ist. Sein Feld sagt es in Rot.',
      ],
    },
    anagraficaPersona: {
      titolo: 'Die Personalien erfassen',
      sommario:
        'Das Formular **Bearbeiten**: wer die Person ist, wie man sie erreicht, die ' +
        `${DE.rappresentante.singolare} und der ${DE.azienda.singolare}.`,
      scritte: {
        nascita: 'Geburtsdatum',
        nascitaDove: 'Alter und «minderjährig»',
        nascitaCome: 'Geburtstag im Kalender',
        frequenta: 'Besucht',
        frequentaDove: 'Präsenz, Karte, Post',
        frequentaCome: 'ohne Häkchen fällt sie raus',
        indirizzi: 'Adressen',
        indirizziDove: 'Karte und Distanzen',
        indirizziCome: 'eine Abfrage pro Adresse',
        emailDove: 'Mitteilungen',
        emailCome: 'eigene und der Vertretung',
        emailDatore: 'E-Mail des Arbeitgebers',
        emailDatoreDove: 'Absenzen-Unterschriften',
        emailDatoreCome: 'ohne sie keine Anfrage',
        telefoni: 'Telefonnummern',
        telefoniDove: 'Gedruckte Blätter',
        telefoniCome: 'die erste Nummer kommt drauf',
        foto: 'Foto',
        fotoDove: 'Blatt als PDF',
        fotoCome: 'und das Klassenfoto',
      },
      figure: [
        {
          didascalia:
            'Wohin kommt, was man ins Formular schreibt. Ein leeres Feld macht nichts kaputt, ' +
            'schaltet aber aus, was rechts davon steht.',
        },
      ],
      voci: [
        {
          termine: 'Wo es sich öffnet',
          testo:
            `**Bearbeiten** oben bei ${Molti(DE.pif)}, im Blatt auf der ganzen Seite und im ` +
            'Feld Personalien; oder über den Stift neben dem Namen unter Klassen. Oben die ' +
            '**Klasse**: Man wählt sie für eine neue Person, danach kann man sie nur noch ' +
            'lesen. Darunter vier Teile: **Zur Person**, **So erreicht man sie**, ' +
            `${Uno(DE.rappresentante)}, ${Uno(DE.azienda)}.`,
        },
        {
          termine: 'Besucht',
          testo:
            'Ohne das Häkchen fällt die Person aus den Präsenzkontrollen, der Karte, den ' +
            'Geburtstagen und den Mitteilungen, aber Präsenzen und Noten bleiben.',
        },
        {
          termine: 'Das Foto',
          testo:
            '**Foto hinzufügen**, **Foto ändern** und **Entfernen**: ein JPEG oder ein PNG, das ' +
            'sofort gilt, ohne auf **Speichern** zu warten. Bei einer neuen Person sind die ' +
            'Befehle ausgeschaltet, bis man sie ein erstes Mal gespeichert hat.',
        },
        {
          termine: 'Die Telefonnummern',
          testo:
            'Eine oder mehrere für jede der drei, mit **Nummer hinzufügen**, und bei jeder, ' +
            'welche Nummer es ist: Handy, Privat, Geschäft, Zentrale, Andere. Die erste wird ' +
            'zuerst angerufen und kommt auf die Blätter: Die Reihenfolge ändert man, indem man ' +
            'die Zeile am Griff zieht.',
        },
        {
          termine: 'Die Vorwahl',
          testo:
            'Beim Speichern bekommt eine Nummer ohne Vorwahl `+41` und behält die Abstände, die ' +
            'man geschrieben hat. Eine, die schon eine Vorwahl hat oder Wörter enthält, bleibt ' +
            'unberührt.',
        },
        {
          termine: 'Die Adressen',
          testo:
            '**Strasse und Nummer**, **PLZ** und **Ort** oben; **c/o**, **Postfach** und ' +
            '**Land** unten, für die, die sie haben. Die ausländische PLZ trägt das ' +
            'Länderkürzel: `I-22100`. Unter der Strasse sagt das Formular, ob die Adresse ' +
            'schon auf der Karte ist.',
        },
        {
          termine: Uno(DE.rappresentante),
          testo:
            'Eine E-Mail, die die Mitteilungen anstelle der Person oder zusammen mit ihr ' +
            'erhält, und ihre Nummern: die der Person, die bei Minderjährigen verantwortlich ist.',
        },
        {
          termine: Uno(DE.azienda),
          testo:
            'Der Name, die Adresse des Arbeitsorts, die E-Mail des Arbeitgebers und die ' +
            'Nummern. Die E-Mail des Arbeitgebers erhält die Absenzenblätter zum ' +
            'Gegenzeichnen: Ohne sie geht die Anfrage nicht raus.',
        },
      ],
      note: [
        '**Aus der Klasse entfernen**, unten im Formular, löscht die Person mit ihren ' +
          'Präsenzen und Noten. Für jemanden, der austritt, genügt es, das Häkchen **Besucht** ' +
          'zu entfernen.',
        'Der Punkt auf der Karte gehört zur Adresse, nicht zur Person: Korrigiert man die ' +
          'Strasse, hat die neue Adresse noch keine Koordinaten und muss mit **Finden** ' +
          'gesucht werden.',
      ],
    },
    mappa: {
      titolo: 'Karte',
      sommario:
        `Eine einzige Karte mit allen Punkten: wo die ${DE.pif.plurale} wohnen und arbeiten, ` +
        'und die Schule.',
      scritte: {
        conti: '40 Adressen von 42 auf der Karte · 3 gemeinsam',
        lavoro: 'Arbeitsort',
        domicilio: 'Wohnort',
        via1: 'Pinienweg 3, Dorf',
        chi1: 'Anna R. · Wohnort',
        trova: 'Finden',
        via2: 'Hochweg 12, Au',
        soloPaese: 'nur der Ort',
        via3: 'Neugasse 5, Ried',
        inTirocinio: '3 in der Lehre',
        via4: 'Sonnenweg 8, See',
        chi4: 'Luca B. · Wohnort',
        distanza: '4.1 km',
        inTirocinioQui: '3 machen hier die Lehre',
        sede: 'Schule',
        rigaScritta: 'Die erfasste Zeile',
        dallAnagrafica: 'aus den Personalien',
        spezzata: 'Zerlegt',
        parti: 'Strasse, PLZ, Ort',
        quattro: 'Vier Abfragen',
        laPrima: 'die erste, die trifft',
        punto: 'Der Punkt',
        nelDocumento: 'im Dokument',
        esempio1: 'Praxis X, Hochweg 12,',
        esempio2: 'Postfach 5, 6500 Au',
        messi: 'beiseitegelegt:',
        quali: '«Praxis X», «Postfach 5»',
        parte1: 'hier geht die Zeile',
        parte2: 'ganz: c/o, Postfach',
        domanda1: 'Strasse und Nr.',
        domanda2: 'nur die Strasse',
        domanda3: 'die ganze Zeile',
        domanda4: 'nur der Ort',
        una1: 'eine pro Adresse:',
        una2: 'gilt für alle, die',
        una3: 'dort wohnen',
      },
      figure: [
        {
          didascalia:
            'Links die Adressen, rechts die Karte: Man liest eine Zeile und schaut, wo sie ' +
            'hinfällt. Ein Klick auf eine Zeile bringt die Karte dorthin.',
          legenda: [
            'Drei Reiter: **Alle**, **Arbeitsort**, **Wohnort**. Sie steuern Liste und Karte ' +
              'zusammen.',
            'Oben, was noch nicht auf der Karte ist, mit seinem **Finden**.',
            '«nur der Ort»: Die Strasse gibt es in OpenStreetMap nicht, und der Punkt ist die ' +
              'Ortsmitte.',
            'Eine Adresse, die mehrere Personen gemeinsam haben: eine einzige Zeile.',
            'Das Kärtchen: wer dort ist, mit der Klasse. Jeder Name führt zu seinem Blatt.',
            'Der Weg vom Wohnort zum Arbeitsort.',
            'Die Schule: Von hier aus werden die Distanzen gemessen, in Luftlinie.',
          ],
        },
        {
          didascalia:
            'Wie aus einer Adresse ein Punkt wird. Für die zerlegten Abfragen legt man ' +
            'beiseite, was keine Adresse ist; reichen sie nicht, geht die ganze Zeile hinaus, ' +
            'samt «c/o» und Postfach. Man hört bei der ersten Antwort auf.',
        },
      ],
      voci: [
        {
          termine: 'Was man sieht',
          testo:
            'Eine Markierung für jeden Wohnort und Arbeitsort aus den Personalien, dazu die ' +
            `Schule. Zu sehen sind die ${DE.pif.plurale}, die dabei sind, aus allen nicht ` +
            'archivierten Klassen des Schuljahrs oder aus der gewählten.',
        },
        {
          termine: 'Form und Farbe',
          testo:
            'Die Figur in der Spitze sagt, was für ein Ort es ist: ein Haus, ein Betrieb, die ' +
            'Schule. Die Farbe ist die der Klasse im Kalender, aber nur für Wohnorte einer ' +
            'einzigen Klasse: Betriebe und von mehreren Klassen geteilte Wohnorte bleiben ohne.',
        },
        {
          termine: 'Eine Markierung ist eine Adresse',
          testo:
            'Zwei Geschwister sind ein einziges Haus, sechs Lernende in derselben Werkstatt ' +
            'eine einzige Halle: Das Kärtchen listet alle auf. Landen zwei aus derselben Firma ' +
            'auf zwei Zeilen, ist eine der beiden Adressen anders geschrieben.',
        },
        {
          termine: 'Die Liste links',
          testo:
            'Zuerst die Adressen ohne Punkt, dann die auf den Ort gefallenen, dann die anderen, ' +
            'von der entferntesten an. Ein Arbeitsort steht mit dem Namen der Firma vorne; ' +
            'darunter die Namen, mit Haus oder Betrieb davor, und von jedem geht es zum Blatt.',
        },
        {
          termine: 'Sich auf der Karte bewegen',
          testo:
            'Man zieht sie und vergrössert mit dem Mausrad; **Alles zeigen** in der ' +
            'Aktionsleiste holt jeden eingeschalteten Punkt wieder herein. Ein Klick auf eine ' +
            'Markierung öffnet ihr Kärtchen, ein Klick daneben schliesst es.',
        },
        {
          termine: 'Die Wege',
          testo:
            'Die gestrichelte Linie führt vom Wohnort zum Arbeitsort derselben Person und ' +
            'erscheint nur unter **Alle**, wo beide Enden zu sehen sind. Mit der Maus darüber ' +
            'leuchtet sie mit Name und Kilometern auf; ein Klick hält sie hell und dämpft den ' +
            'Rest.',
        },
        {
          termine: 'Adressen suchen',
          testo:
            'In der Aktionsleiste: fragt OpenStreetMap nach den Adressen, die noch keinen Punkt ' +
            'haben, eine pro Sekunde, höchstens sechzig aufs Mal — für die anderen drückt man ' +
            'noch einmal. Ausgeschaltet, wenn jede Adresse schon auf der Karte ist.',
        },
        {
          termine: '«nur der Ort»',
          testo:
            'Die Strasse gibt es in OpenStreetMap nicht, und der Punkt ist die Ortsmitte. Es ' +
            'nützt trotzdem — «kommt aus Vals» ist eine Antwort —, aber zu dieser Markierung ' +
            'fährt man nicht mit dem Auto.',
        },
        {
          termine: 'Wenn ein Punkt nicht stimmt',
          testo:
            'Was der Dienst verstanden hat, liest man im Personenblatt, unter der Adresse. ' +
            'Man korrigiert sie über **Bearbeiten** und drückt **Finden**. **Adressen neu ' +
            'suchen** fragt nach einer Rückfrage auch die schon verorteten neu ab: etwa eine ' +
            'Sekunde pro Adresse, höchstens sechzig aufs Mal.',
        },
        {
          termine: 'Die Zahlen oben',
          testo:
            'Wie viele Adressen auf der Karte sind von wie vielen erfassten, wie viele ' +
            `gemeinsam, und wie viele ${DE.pif.plurale} gar keine Adresse haben: Ohne diese ` +
            'Zahl sähe es aus, als wohnten sie nirgends.',
        },
        {
          termine: 'Eine Klasse oder alle',
          testo:
            'Zu Beginn alle Klassen zusammen: Die Frage ist «wer kommt woher», und gemeinsame ' +
            'Adressen gibt es fast immer zwischen verschiedenen Klassen. Mit mindestens zwei ' +
            'Klassen beschränkt die Auswahl **Klasse** neben **Zeitraum** Karte und Liste auf ' +
            'eine einzige, um deren Betriebsbesuche vorzubereiten.',
        },
      ],
      note: [
        '**Adressen suchen**, **Adressen neu suchen** und die **Finden** der Karte und des ' +
          'Blatts sind die einzigen Handgriffe, die eine Angabe aus den Personalien nach ' +
          'aussen schicken, und darum drückt man sie von Hand. Hinaus geht die Adresszeile, ' +
          'und wenn die zerlegten Abfragen nicht reichen, die ganze: auch ein Name unter ' +
          '**c/o** und das Postfach.',
        'Eine Abfrage pro Adresse, nicht pro Person: Die Antwort bleibt im Dokument ' +
          'gespeichert und gilt für alle, die dort wohnen. Die Karten kommen von ' +
          'OpenStreetMap — das so sieht, welche Gegenden man anschaut — und bleiben in einem ' +
          'Speicher des Computers, ausserhalb des Dokuments.',
      ],
    },
  },
  fr: {
    persone: {
      titolo: Molti(FR.pif),
      sommario:
        `Toutes les ${FR.pif.plurale} de l’année dans une seule liste, et à côté la fiche de ` +
        'la personne choisie.',
      scritte: {
        lezione: 'Leçon',
        valutazioni: 'Évaluations',
        check: 'Check',
        pianiLezione: 'Plans de leçon',
        documenti: 'Documents',
        classi: 'Classes',
        laterale: 'Pers. en form.',
        mappa: 'Carte',
        corsi: 'Cours',
        impostazioni: 'Paramètres',
        guida: 'Aide',
        titolo: Molti(FR.pif),
        conti: '48 en formation · 2 sans téléphone',
        aTuttaPagina: 'Pleine page',
        anna: 'Rossi Anna',
        luca: 'Rossi Luca',
        marco: 'Rossi Marco',
        officina: 'Atelier B.',
        ditta: 'Entreprise V.',
        anagrafica: 'Données pers.',
        docente: Uno(FR.docenteClasse),
        materie: 'Branches',
        doveSta: 'Domicile',
      },
      figure: [
        {
          didascalia:
            'À gauche la liste qui traverse les classes, à droite la fiche de la personne ' +
            'choisie. Quand on change de nom, la liste reste où elle était.',
          legenda: [
            'Le champ de recherche : filtre à chaque lettre.',
            'Une classe fermée : un clic l’ouvre, et le nombre dit combien ils sont.',
            'Le nom choisi, avec en dessous classe et entreprise. Qui ne suit plus les cours ' +
              'est grisé.',
            'Le sous-titre : combien ils sont, et ce qui manque à certains.',
            '**Pleine page** et **Modifier**, pour la personne choisie.',
            'La fiche à côté : la même qui s’ouvre en pleine page.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Chercher',
          testo:
            'Le champ filtre à chaque lettre sur le nom, la classe, l’entreprise, les adresses, ' +
            'l’e-mail et les numéros de téléphone. Plusieurs mots valent ensemble : « rossi ' +
            'dic » trouve Rossi de la DIC4a. Les accents et les apostrophes ne comptent pas, et ' +
            '« dellacqua » trouve Dell’Acqua.',
        },
        {
          termine: 'Par classe',
          testo:
            'Les noms sont regroupés par classe, par ordre de nom de famille. Les classes sont ' +
            'fermées au départ ; celles qu’on ouvre restent ouvertes quand on revient à la page, ' +
            'et pendant une recherche elles s’ouvrent toutes seules.',
        },
        {
          termine: 'Qui ne suit plus les cours',
          testo:
            'Reste dans la liste, grisé ; à côté du nom dans la fiche figure la pastille **ne ' +
            'suit plus**, et en pleine page le sous-titre dit « retiré ». Présences et notes de ' +
            'l’année se consultent toujours.',
        },
        {
          termine: 'La fiche à côté',
          testo:
            'Un clic sur un nom l’ouvre dans la moitié droite. Si la recherche exclut ensuite ce ' +
            'nom, la fiche reste ouverte quand même.',
        },
        {
          termine: 'Pleine page, et Modifier',
          testo:
            '**Pleine page** ouvre la fiche seule, avec les flèches pour parcourir la classe. ' +
            '**Modifier** ouvre le formulaire des données personnelles.',
        },
        {
          termine: 'En tête, les trous',
          testo:
            `Le sous-titre compte combien de ${FR.pif.plurale} il y a, combien ne suivent plus ` +
            `les cours, combien sont sans ${FR.azienda.singolare} et combien sans numéro de ` +
            'téléphone à elles.',
        },
        {
          termine: 'D’où elles entrent',
          testo:
            `D’ici avec **Nouvelle ${FR.pif.singolare}**, dans la barre d’actions : le ` +
            'formulaire demande dans quelle classe elle entre. Ou bien dans une classe, sous ' +
            '**Classes**, une par une ou en collant la liste. Avec la liste vide, la page y mène ' +
            'avec **Aller aux classes**.',
        },
      ],
      note: [
        'Quand on écrit dans le champ, seule la liste se refait : la fiche à côté, avec la ' +
          'photo et la petite carte, ne se redessine pas à chaque lettre. Pour la même raison, ' +
          'la recherche ne s’enregistre pas : en rouvrant le registre, le champ est vide, les ' +
          'classes ouvertes en revanche non.',
        'Au téléphone, on cherche avec ce qu’on sait : la localité, un bout de numéro, le nom ' +
          'de l’entreprise. Pas besoin de savoir dans quelle classe la personne se trouve.',
      ],
    },
    scheda: {
      titolo: `La fiche de la ${FR.pif.singolare}`,
      sommario:
        'Tout ce que le registre sait d’une personne, en trois onglets. Presque tout se lit, ' +
        'sans plus : on écrit les données personnelles et les coches du check.',
      scritte: {
        sottotitolo: 'DIC4a · 1er semestre · 3 sur 24',
        tornaAllElenco: 'Retour à la liste',
        pif: Uno(FR.pif),
        rappresentante: Uno(FR.rappresentante),
        azienda: Uno(FR.azienda),
        manca: 'Il manque : téléphone de l’employeur.',
        doveSta: 'Domicile et entreprise',
        distanze: 'domicile 12 · travail 4 km',
        giorno: 'jour',
        materie: 'branches',
        lun: 'lun',
        gio: 'jeu',
        disegno: 'Dessin',
        calcolo: 'Calcul',
        sigle: 'P présent · X absent · R en retard · E dispensé · - non saisi',
        numeri: '8 % d’absence · note 5 · 12 leçons',
        presenze: 'Présences',
        giornateStorte: 'jours difficiles',
        valutazioni: 'Évaluations',
        notaEProve: 'note et épreuves',
        comEAndata: 'Comportement',
        laMatrice: 'la grille',
        osservazioni: 'Observations',
        annotate: 'notées',
      },
      figure: [
        {
          didascalia:
            'La fiche en pleine page, sur l’onglet Données personnelles. À côté de la liste des ' +
            'personnes, c’est la même, sans flèches.',
          legenda: [
            'Les flèches passent à la personne précédente et suivante dans la classe ; le ' +
              'compte dit où l’on est.',
            `Les onglets. **${Uno(FR.docenteClasse)}** n’existe que dans les classes qu’on ` +
              'suit comme maître de classe.',
            'Le bouton à côté des noms, e-mails, téléphones et adresses copie dans le ' +
              'presse-papiers.',
            '**Domicile et entreprise** : domicile, entreprise et école, avec les distances en ' +
              'tête.',
          ],
        },
        {
          didascalia:
            'L’onglet Branches : à gauche la grille « Jour par jour » de **Dans l’ensemble**, ' +
            'à droite le cadre d’une branche.',
          legenda: [
            'Une colonne par heure de début, pas par position : 08:20 le lundi est au-dessus ' +
              'de 08:20 le jeudi.',
            'Case vide : ce jour-là, à cette heure-là, il n’y avait pas cours.',
            'Une case est une période avec sa lettre, et un clic ouvre cette leçon.',
            'Un trait sépare les semaines.',
            'Les lettres sont celles de l’appel et des feuilles imprimées.',
            'Le cadre d’une branche : en tête absence, note et leçons données ; dedans quatre ' +
              'parties, toujours dans cet ordre, plus le check quand le cours en a un.',
          ],
        },
      ],
      voci: [
        {
          termine: 'D’où elle s’ouvre',
          testo:
            `D’un nom dans ${Molti(FR.pif)} ou dans Classes, du gâteau d’un anniversaire dans ` +
            'le calendrier, d’un nom sur la carte, du tableau d’un cours, de **Ouvrir la ' +
            'fiche** d’un signalement d’absences.',
        },
        {
          termine: 'Parcourir la classe',
          testo:
            'En pleine page, les flèches haut et bas passent à la personne précédente et ' +
            'suivante, dans l’ordre de la liste et y compris les personnes retirées ; le ' +
            `sous-titre dit « 3 sur 24 ». **Retour à la liste** mène à ${Molti(FR.pif)}.`,
        },
        {
          termine: 'La barre d’actions',
          testo:
            'En pleine page, elle porte les gestes de sa classe : **Ajouter au groupe**, ' +
            '**Coller la liste**, **Nouvelle communication**, **Nouvelle période d’absence**.',
        },
        {
          termine: 'Les trois onglets',
          testo:
            `**Données personnelles**, **${Uno(FR.docenteClasse)}** et **Branches**. Le ` +
            'deuxième n’existe que si la classe a la case « Je suis maître de classe » ; ' +
            'l’onglet choisi reste le même en passant d’une personne à l’autre.',
        },
        {
          termine: 'Données personnelles',
          testo:
            `Trois blocs — ${FR.pif.singolare}, ${FR.rappresentante.singolare}, ` +
            `${FR.azienda.singolare} — avec seulement les lignes remplies, et en bas « Il ` +
            'manque : … ». En dessous de dix-huit ans, la date de naissance porte la pastille ' +
            '**mineur**.',
        },
        {
          termine: 'Appeler, écrire, copier',
          testo:
            'Un e-mail cliqué ouvre un nouveau message, un numéro cliqué le compose ; le bouton ' +
            'à côté copie. Un numéro avec des mots dedans, comme « int. 12 », reste seulement à ' +
            'copier.',
        },
        {
          termine: 'Avec quel programme',
          testo:
            'C’est **Paramètres** › Communications qui le dit : pour les appels celui du ' +
            'système, Teams ou Skype ; pour le courrier celui du système, Outlook ou Outlook sur ' +
            'le web. Avec « Aucun », il ne reste que le bouton qui copie.',
        },
        {
          termine: 'Sous une adresse',
          testo:
            'Les coordonnées, la distance à l’école et ce que le service de cartes a compris ; ' +
            '« aussi … » si quelqu’un d’autre habite là, et **Sur la carte**. Une adresse pas ' +
            'encore placée a **Trouver**, qui ne cherche que celles de cette personne.',
        },
        {
          termine: 'Domicile et entreprise',
          testo:
            'Une petite carte avec domicile, entreprise et école, qu’on déplace et qu’on ' +
            'agrandit ; en tête les distances, aussi entre domicile et travail. **Ouvrir la ' +
            'carte** mène à la page entière. Sans adresse placée, le cadre n’existe pas.',
        },
        {
          termine: Uno(FR.docenteClasse),
          testo:
            'Les documents qui lui ont été demandés, **remis** ou **attendu**, et les absences à ' +
            'faire signer période par période : à envoyer, en attente de signature, signé. ' +
            '**Ouvrir les absences** mène à la page où on les imprime et les envoie.',
        },
        {
          termine: 'Dans l’ensemble',
          testo:
            'En haut des Branches, sur la période de la liste **Période** : périodes prévues, ' +
            'périodes avec appel, présence, absence — en rouge au-delà du seuil — et, s’il y en ' +
            'a, retards, dispenses et marques de la grille. En dessous, la grille **Jour par ' +
            'jour**.',
        },
        {
          termine: 'Un cadre par branche',
          testo:
            'Présences (seulement les jours difficiles), Évaluations (note, moyenne et ' +
            'épreuves), Comment ça s’est passé (la grille du comportement, leçon par leçon) et ' +
            'Observations. Chaque date se clique et ouvre la leçon ou l’épreuve.',
        },
        {
          termine: 'Le check',
          testo:
            'Dans les Branches, chaque branche avec un check a le cadre **Check** : une case ' +
            'par colonne, avec le jour et avec « en leçon » ou « à la main ». Le clic coche une ' +
            'case vide et retire une coche mise aujourd’hui ; une case cochée un autre jour ne ' +
            'se change que par le clic droit. C’est la même règle que pour les coches des ' +
            'devoirs.',
        },
        {
          termine: 'La fiche en PDF',
          testo:
            `Elle ne s’imprime pas d’ici : elle est dans **Documents**, onglet ${Molti(FR.pif)}, ` +
            'une par personne, par cours et par période.',
        },
      ],
      note: [
        'Les deux pourcentages ont deux dénominateurs. La présence porte sur les périodes ' +
          'avec l’appel fait, dispenses exclues : elle dit comment ça se passe. L’absence ' +
          'porte sur les périodes que l’horaire prévoit dans la période : c’est le chiffre du ' +
          'rapport et du seuil.',
        'Le seuil vaut branche par branche : le total de **Dans l’ensemble** peut être en ' +
          'dessous alors qu’une branche est déjà au-delà. Son cadre le dit en rouge.',
      ],
    },
    anagraficaPersona: {
      titolo: 'Saisir les données personnelles',
      sommario:
        'Le formulaire **Modifier** : qui elle est, comment la joindre, le ' +
        `${FR.rappresentante.singolare} et l’${FR.azienda.singolare}.`,
      scritte: {
        nascita: 'Date de naissance',
        nascitaDove: 'Âge et « mineur »',
        nascitaCome: 'et le gâteau du calendrier',
        frequenta: 'Fréquente',
        frequentaDove: 'Appels, carte, courrier',
        frequentaCome: 'décochée, elle en sort',
        indirizzi: 'Adresses',
        indirizziDove: 'Carte et distances',
        indirizziCome: 'une requête par adresse',
        emailDove: 'Communications',
        emailCome: 'le sien et celui du représentant',
        emailDatore: 'E-mail de l’employeur',
        emailDatoreDove: 'Signature des absences',
        emailDatoreCome: 'sans lui, pas de demande',
        telefoni: 'Téléphones',
        telefoniDove: 'Feuilles imprimées',
        telefoniCome: 'avec le premier numéro',
        foto: 'Photo',
        fotoDove: 'Fiche en PDF',
        fotoCome: 'et la photo de classe',
      },
      figure: [
        {
          didascalia:
            'Où va ce qu’on écrit dans le formulaire. Une case vide ne casse rien, mais éteint ' +
            'ce qui se trouve à sa droite.',
        },
      ],
      voci: [
        {
          termine: 'Où il s’ouvre',
          testo:
            `**Modifier** en tête de ${Molti(FR.pif)}, dans la fiche en pleine page et dans le ` +
            'cadre Données personnelles ; ou par le crayon à côté du nom dans Classes. En haut ' +
            'la **Classe** : on la choisit pour une nouvelle personne, ensuite on ne fait que la ' +
            'lire. En dessous, quatre parties : **Identité**, **Comment la joindre**, ' +
            `${Uno(FR.rappresentante)}, ${Uno(FR.azienda)}.`,
        },
        {
          termine: 'Fréquente',
          testo:
            'En retirant la coche, la personne sort des appels, de la carte, des anniversaires ' +
            'et des communications, mais présences et notes restent.',
        },
        {
          termine: 'La photo',
          testo:
            '**Ajouter une photo**, **Changer la photo** et **Retirer** : un JPEG ou un PNG, qui ' +
            'vaut tout de suite, sans attendre **Enregistrer**. Pour une nouvelle personne, les ' +
            'commandes sont éteintes tant qu’on ne l’a pas enregistrée une première fois.',
        },
        {
          termine: 'Les téléphones',
          testo:
            'Un ou plusieurs pour chacun des trois, avec **Ajouter un numéro**, et pour chacun ' +
            'quel numéro c’est : portable, domicile, travail, central, autre. Le premier est ' +
            'celui qu’on essaie en premier et qui figure sur les feuilles : l’ordre se change en ' +
            'faisant glisser la ligne par sa poignée.',
        },
        {
          termine: 'L’indicatif',
          testo:
            'À l’enregistrement, un numéro sans indicatif prend le `+41` et garde les espaces de ' +
            'qui l’a écrit. Un numéro qui a déjà son indicatif, ou qui contient des mots, n’est ' +
            'pas touché.',
        },
        {
          termine: 'Les adresses',
          testo:
            '**Rue et numéro**, **NPA** et **Localité** en haut ; **Chez**, **Case postale** et ' +
            '**Pays** en bas, pour qui en a. Le NPA étranger porte le code du pays : `I-22100`. ' +
            'Sous la rue, le formulaire dit si l’adresse est déjà sur la carte.',
        },
        {
          termine: Uno(FR.rappresentante),
          testo:
            'Un e-mail, qui reçoit les communications à la place de la personne ou avec elle, ' +
            'et ses numéros : ceux de qui répond d’elle tant qu’elle est mineure.',
        },
        {
          termine: Uno(FR.azienda),
          testo:
            'Le nom, l’adresse du lieu de travail, l’e-mail de l’employeur et les numéros. ' +
            'L’e-mail de l’employeur reçoit les feuilles d’absences à contresigner : sans lui, ' +
            'la demande ne part pas.',
        },
      ],
      note: [
        '**Retirer de la classe**, en bas du formulaire, efface la personne avec ses ' +
          'présences et ses notes. Pour qui se retire, il suffit de retirer la coche ' +
          '**Fréquente**.',
        'Le point sur la carte appartient à l’adresse, pas à la personne : en corrigeant la ' +
          'rue, la nouvelle adresse n’a pas encore de coordonnées, et il faut la chercher avec ' +
          '**Trouver**.',
      ],
    },
    mappa: {
      titolo: 'Carte',
      sommario:
        'Une seule carte avec tous les points : où habitent et où travaillent les ' +
        `${FR.pif.plurale}, et l’école.`,
      scritte: {
        conti: '40 adresses sur 42 sur la carte · 3 en commun',
        lavoro: 'Lieu de travail',
        domicilio: 'Domicile',
        via1: 'Chemin des Pins 3, Village',
        chi1: 'Anna R. · domicile',
        trova: 'Trouver',
        via2: 'Rue Haute 12, Bourg',
        soloPaese: 'seulement la localité',
        via3: 'Rue Neuve 5, Rive',
        inTirocinio: '3 en apprentissage',
        via4: 'Rue du Soleil 8, Lac',
        chi4: 'Luca B. · domicile',
        distanza: '4,1 km',
        inTirocinioQui: '3 en apprentissage ici',
        sede: 'école',
        rigaScritta: 'La ligne saisie',
        dallAnagrafica: 'des données perso.',
        spezzata: 'Découpée',
        parti: 'rue, NPA, localité',
        quattro: 'Quatre requêtes',
        laPrima: 'la première qui trouve',
        punto: 'Le point',
        nelDocumento: 'dans le document',
        esempio1: 'Cabinet X, Rue Haute 12,',
        esempio2: 'CP 5, 1500 Bourg',
        messi: 'mis de côté :',
        quali: '« Cabinet X », « CP 5 »',
        parte1: 'ici part la ligne',
        parte2: 'entière : chez, CP',
        domanda1: 'rue et numéro',
        domanda2: 'la rue seule',
        domanda3: 'la ligne entière',
        domanda4: 'la localité seule',
        una1: 'une par adresse :',
        una2: 'vaut pour tous ceux',
        una3: 'qui y sont',
      },
      figure: [
        {
          didascalia:
            'À gauche les adresses, à droite la carte : on lit une ligne et on regarde où elle ' +
            'tombe. Un clic sur une ligne amène la carte là.',
          legenda: [
            'Trois onglets : **Tous**, **Lieu de travail**, **Domicile**. Ils commandent la ' +
              'liste et la carte ensemble.',
            'En haut, ce qui n’est pas encore sur la carte, avec son **Trouver**.',
            '« seulement la localité » : la rue n’existe pas dans OpenStreetMap, et le point ' +
              'est le centre de la localité.',
            'Une adresse que plusieurs personnes ont en commun : une seule ligne.',
            'L’étiquette : qui est là, avec la classe. Chaque nom mène à sa fiche.',
            'Le trajet du domicile au lieu de travail.',
            'L’école : c’est d’ici qu’on compte les distances, à vol d’oiseau.',
          ],
        },
        {
          didascalia:
            'Comment une adresse devient un point. Pour les requêtes découpées, on met de côté ' +
            'ce qui n’est pas une adresse ; si elles ne suffisent pas, c’est la ligne entière ' +
            'qui part, « chez » et case postale compris. On s’arrête à la première réponse.',
        },
      ],
      voci: [
        {
          termine: 'Ce qu’on voit',
          testo:
            'Un repère pour chaque domicile et lieu de travail saisi dans les données ' +
            `personnelles, plus l’école. On y trouve les ${FR.pif.plurale} qui suivent les ` +
            'cours, de toutes les classes non archivées de l’année ou de celle choisie.',
        },
        {
          termine: 'Figure et couleur',
          testo:
            'La figure dans la pointe dit quel lieu c’est : une maison, une entreprise, l’école. ' +
            'La couleur est celle de la classe dans le calendrier, mais seulement pour les ' +
            'maisons d’une seule classe : entreprises et maisons partagées entre classes restent ' +
            'sans.',
        },
        {
          termine: 'Un repère est une adresse',
          testo:
            'Deux frères et sœurs, c’est une seule maison ; six apprentis dans le même atelier, ' +
            'un seul hangar : l’étiquette les liste tous. Si deux de la même entreprise ' +
            'tombent sur deux lignes, l’une des deux adresses est écrite différemment.',
        },
        {
          termine: 'La liste à gauche',
          testo:
            'D’abord les adresses sans point, puis celles tombées sur la localité, puis les ' +
            'autres, de la plus éloignée à la plus proche. Un lieu de travail se lit avec le nom ' +
            'de l’entreprise en tête ; en dessous, les noms précédés de la maison ou de ' +
            'l’entreprise, et de chacun on va à la fiche.',
        },
        {
          termine: 'Se déplacer sur la carte',
          testo:
            'On la fait glisser et on l’agrandit avec la molette ; **Tout afficher**, dans la ' +
            'barre d’actions, remet dedans chaque point allumé. Un clic sur un repère ouvre son ' +
            'étiquette, un clic dans le vide la ferme.',
        },
        {
          termine: 'Les trajets',
          testo:
            'La ligne pointillée va du domicile au lieu de travail de la même personne, et ' +
            'n’apparaît que dans **Tous**, où l’on voit les deux bouts. La souris dessus ' +
            'l’allume avec nom et kilomètres ; un clic la garde allumée et atténue le reste.',
        },
        {
          termine: 'Trouver les adresses',
          testo:
            'Dans la barre d’actions : demande à OpenStreetMap les adresses qui n’ont pas ' +
            'encore de point, une par seconde, soixante au plus à la fois — pour les autres, on ' +
            'appuie de nouveau. Éteint quand chaque adresse est déjà sur la carte.',
        },
        {
          termine: '« seulement la localité »',
          testo:
            'La rue n’existe pas dans OpenStreetMap et le point est le centre de la localité. ' +
            'Cela sert quand même — « vient d’Evolène » est une réponse — mais on ne va pas en ' +
            'voiture jusqu’à ce repère.',
        },
        {
          termine: 'Quand un point ne va pas',
          testo:
            'Ce que le service a compris se lit dans la fiche de la personne, sous l’adresse. ' +
            'On corrige depuis **Modifier** et on appuie sur **Trouver**. **Refaire les ' +
            'adresses** redemande depuis le début même celles déjà sur la carte, après une ' +
            'confirmation : environ une seconde chacune, soixante au plus à la fois.',
        },
        {
          termine: 'Les comptes en tête',
          testo:
            'Combien d’adresses sont sur la carte sur combien de saisies, combien sont en ' +
            `commun, et combien de ${FR.pif.plurale} n’ont aucune adresse : sans ce nombre, on ` +
            'croirait qu’elles n’habitent nulle part.',
        },
        {
          termine: 'Une classe ou toutes',
          testo:
            'Au départ toutes les classes ensemble : la question est « qui vient d’où », et les ' +
            'adresses en commun sont presque toujours entre classes différentes. Avec au moins ' +
            'deux classes, la liste **Classe** à côté de **Période** restreint carte et liste à ' +
            'une seule, pour préparer ses visites.',
        },
      ],
      note: [
        '**Trouver les adresses**, **Refaire les adresses** et les **Trouver** de la carte et ' +
          'de la fiche sont les seuls gestes qui envoient dehors une donnée personnelle, et ' +
          'c’est pourquoi on les déclenche à la main. C’est la ligne de l’adresse qui part, ' +
          'et si les requêtes découpées ne suffisent pas, elle part entière : y compris un nom ' +
          'écrit dans **Chez** et la case postale.',
        'Une requête par adresse, pas par personne : la réponse reste écrite dans le document ' +
          'et vaut pour tous ceux qui habitent là. Les cartes viennent d’OpenStreetMap — qui ' +
          'voit ainsi quelles zones on regarde — et restent dans une mémoire de l’ordinateur, ' +
          'hors du document.',
      ],
    },
  },
  en: {
    persone: {
      titolo: Molti(EN.pif),
      sommario:
        `All the year’s ${EN.pif.plurale} in a single list, and beside it the record of ` +
        'whoever you choose.',
      scritte: {
        lezione: 'Lesson',
        valutazioni: 'Assessments',
        check: 'Check',
        pianiLezione: 'Lesson plans',
        documenti: 'Documents',
        classi: 'Classes',
        laterale: Molti(EN.pif),
        mappa: 'Map',
        corsi: 'Courses',
        impostazioni: 'Settings',
        guida: 'Help',
        titolo: Molti(EN.pif),
        conti: '48 in training · 2 without a phone',
        aTuttaPagina: 'Full page',
        anna: 'Rossi Anna',
        luca: 'Rossi Luca',
        marco: 'Rossi Marco',
        officina: 'Workshop B.',
        ditta: 'Firm V.',
        anagrafica: 'Personal details',
        docente: Uno(EN.docenteClasse),
        materie: 'Subjects',
        doveSta: 'Home',
      },
      figure: [
        {
          didascalia:
            'On the left the list that runs across classes, on the right the record of whoever ' +
            'you’ve chosen. Changing name, the list stays where it was.',
          legenda: [
            'The search box: filters with every letter.',
            'A closed class: a click opens it, and the number says how many there are.',
            'The chosen name, with class and company below. Anyone no longer attending is ' +
              'greyed out.',
            'The subtitle: how many there are, and what some of them are missing.',
            '**Full page** and **Edit**, for the chosen person.',
            'The record alongside: the same one that opens as a full page.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Searching',
          testo:
            'The box filters with every letter on name, class, company, addresses, email and ' +
            'phone numbers. Several words count together: “rossi dic” finds Rossi in DIC4a. ' +
            'Accents and apostrophes don’t matter, and “dellacqua” finds Dell’Acqua.',
        },
        {
          termine: 'By class',
          testo:
            'Names are grouped by class, in surname order. Classes start closed; the ones you ' +
            'open stay open when you come back to the page, and while you search they all open ' +
            'by themselves.',
        },
        {
          termine: 'Anyone no longer attending',
          testo:
            'Stays in the list, greyed out; next to the name on the record there’s the **no ' +
            'longer attending** tag, and on the full page the subtitle says “withdrawn”. The ' +
            'year’s attendance and grades can still be viewed.',
        },
        {
          termine: 'The record alongside',
          testo:
            'A click on a name opens it in the right half. If the search then leaves that name ' +
            'out, the record stays open all the same.',
        },
        {
          termine: 'Full page, and Edit',
          testo:
            '**Full page** opens the record on its own, with arrows to move through the class. ' +
            '**Edit** opens the personal details form.',
        },
        {
          termine: 'At the top, the gaps',
          testo:
            `The subtitle counts how many ${EN.pif.plurale} there are, how many are no longer ` +
            `attending, how many have no ${EN.azienda.singolare} and how many have no phone ` +
            'number of their own.',
        },
        {
          termine: 'Where they come in',
          testo:
            `From here with **New ${EN.pif.singolare}**, in the action bar: the form asks which ` +
            'class they’re joining. Or inside a class, in **Classes**, one at a time or by ' +
            'pasting the list. With the list empty, the page takes you there with **Go to ' +
            'classes**.',
        },
      ],
      note: [
        'Typing in the box redraws only the list: the record alongside, with its photo and ' +
          'small map, isn’t redrawn at every letter. For the same reason the search isn’t ' +
          'saved: when you reopen the register the box is empty, while the open classes aren’t.',
        'On the phone you search by what you know: the town, part of a number, the name of the ' +
          'firm. There’s no need to know which class they’re in.',
      ],
    },
    scheda: {
      titolo: `The ${EN.pif.singolare}’s record`,
      sommario:
        'Everything the register knows about a person, in three tabs. Almost all of it is just ' +
        'to read: what you write is the personal details and the check ticks.',
      scritte: {
        sottotitolo: 'DIC4a · 1st semester · 3 of 24',
        tornaAllElenco: 'Back to the list',
        pif: Uno(EN.pif),
        rappresentante: Uno(EN.rappresentante),
        azienda: Uno(EN.azienda),
        manca: 'Missing: employer’s phone.',
        doveSta: 'Home and workplace',
        distanze: 'home 12 km · work 4 km',
        giorno: 'day',
        materie: 'subjects',
        lun: 'Mon',
        gio: 'Thu',
        disegno: 'Drawing',
        calcolo: 'Maths',
        sigle: 'P present · X absent · R late · E excused · - not set',
        numeri: '8% absence · grade 5 · 12 hours',
        presenze: 'Attendance',
        giornateStorte: 'bad days',
        valutazioni: 'Assessments',
        notaEProve: 'grade and tests',
        comEAndata: 'How it went',
        laMatrice: 'the grid',
        osservazioni: 'Observations',
        annotate: 'noted',
      },
      figure: [
        {
          didascalia:
            'The record as a full page, on the Personal details tab. Beside the list of people ' +
            'it’s the same, without arrows.',
          legenda: [
            'The arrows move to the previous and next person in the class; the count says ' +
              'where you are.',
            `The tabs. **${Uno(EN.docenteClasse)}** is only there in classes you look after as ` +
              'class teacher.',
            'The button next to names, emails, phones and addresses copies to the clipboard.',
            '**Home and workplace**: home, company and school, with the distances at the top.',
          ],
        },
        {
          didascalia:
            'The Subjects tab: on the left the “Day by day” grid from **Overall**, on the right ' +
            'a subject’s box.',
          legenda: [
            'One column per start time, not per position: 08:20 on Monday sits above 08:20 on ' +
              'Thursday.',
            'Empty box: that day, at that time, there was no lesson.',
            'A box is one period with its letter, and a click opens that lesson.',
            'A thin line separates the weeks.',
            'The letters are those of attendance and of the printed sheets.',
            'A subject’s box: at the top absence, grade and hours taught; inside four parts, ' +
              'always in this order, plus the check when the course has one.',
          ],
        },
      ],
      voci: [
        {
          termine: 'Where it opens from',
          testo:
            `From a name in ${Molti(EN.pif)} or in Classes, from a birthday cake on the ` +
            'calendar, from a name on the map, from a course’s table, from **Open the record** ' +
            'on an absence flag.',
        },
        {
          termine: 'Moving through the class',
          testo:
            'On the full page the up and down arrows move to the previous and next person, in ' +
            'list order and including those who have withdrawn; the subtitle says “3 of 24”. ' +
            `**Back to the list** takes you to ${Molti(EN.pif)}.`,
        },
        {
          termine: 'The action bar',
          testo:
            'On the full page it carries its class’s actions: **Add to group**, **Paste ' +
            'list**, **New message**, **New absence period**.',
        },
        {
          termine: 'The three tabs',
          testo:
            `**Personal details**, **${Uno(EN.docenteClasse)}** and **Subjects**. The second ` +
            'is only there if the class has the “I’m the class teacher” tick; the chosen tab ' +
            'stays the same as you move from one person to the next.',
        },
        {
          termine: 'Personal details',
          testo:
            `Three blocks — ${EN.pif.singolare}, ${EN.rappresentante.singolare}, ` +
            `${EN.azienda.singolare} — with only the filled-in rows, and at the bottom ` +
            '“Missing: …”. Under eighteen, the date of birth carries the **under 18** tag.',
        },
        {
          termine: 'Calling, writing, copying',
          testo:
            'Clicking an email opens a new message, clicking a number dials it; the button next ' +
            'to it copies. A number with words in it, like “ext. 12”, can only be copied.',
        },
        {
          termine: 'With which program',
          testo:
            '**Settings** › Communications says so: for calls the system one, Teams or Skype; for ' +
            'email the system one, Outlook or Outlook on the web. With “None” only the copy ' +
            'button is left.',
        },
        {
          termine: 'Under an address',
          testo:
            'The coordinates, the distance from school and what the map service understood; ' +
            '“also …” if someone else lives there, and **On the map**. An address not yet ' +
            'placed has **Find**, which looks up only this person’s addresses.',
        },
        {
          termine: 'Home and workplace',
          testo:
            'A small map with home, company and school, which you can drag and zoom; at the top ' +
            'the distances, including between home and work. **Open the map** takes you to the ' +
            'full page. With no placed addresses, the box isn’t there.',
        },
        {
          termine: Uno(EN.docenteClasse),
          testo:
            'The documents requested from them, **handed in** or **expected**, and the ' +
            'absences to get signed period by period: to send, awaiting signature, signed. ' +
            '**Open absences** takes you to the page where they’re printed and sent.',
        },
        {
          termine: 'Overall',
          testo:
            'At the top of Subjects, over the period in the **Period** drop-down: scheduled ' +
            'periods, periods with attendance taken, attendance, absence — in red over the ' +
            'threshold — and, if there are any, late arrivals, exemptions and grid marks. Below, ' +
            'the **Day by day** grid.',
        },
        {
          termine: 'One box per subject',
          testo:
            'Attendance (only the bad days), Assessments (grade, average and tests), How it went ' +
            '(the behaviour grid, lesson by lesson) and Observations. Every date can be clicked ' +
            'and opens the lesson or the test.',
        },
        {
          termine: 'The check',
          testo:
            'In Subjects, every subject with a check has the **Check** box: one tick box per ' +
            'column, with the day and with “in the lesson” or “by hand”. A click ticks an empty ' +
            'box and removes a tick given today; one ticked on another day can only be changed ' +
            'with a right-click. It’s the same rule as for assignment ticks.',
        },
        {
          termine: 'The sheet as a PDF',
          testo:
            `It isn’t printed from here: it’s in **Documents**, ${Molti(EN.pif)} tab, one per ` +
            'person per course per period.',
        },
      ],
      note: [
        'The two percentages have two denominators. Attendance is over the periods with ' +
          'attendance taken, exemptions excluded: it says how things are going. Absence is over ' +
          'the periods the timetable sets for the period: it’s the figure for the report and ' +
          'the threshold.',
        'The threshold applies subject by subject: the total under **Overall** can be below it ' +
          'while one subject is already over. Its box says so in red.',
      ],
    },
    anagraficaPersona: {
      titolo: 'Entering personal details',
      sommario:
        'The **Edit** form: who they are, how to reach them, the ' +
        `${EN.rappresentante.singolare} and the ${EN.azienda.singolare}.`,
      scritte: {
        nascita: 'Date of birth',
        nascitaDove: 'Age and “under 18”',
        nascitaCome: 'and the cake on the calendar',
        frequenta: 'Attends',
        frequentaDove: 'Attendance, map, email',
        frequentaCome: 'untick it and they drop out',
        indirizzi: 'Addresses',
        indirizziDove: 'Map and distances',
        indirizziCome: 'one lookup per address',
        emailDove: 'Messages',
        emailCome: 'theirs and the guardian’s',
        emailDatore: 'Employer’s email',
        emailDatoreDove: 'Absence signatures',
        emailDatoreCome: 'without it, no request goes out',
        telefoni: 'Phones',
        telefoniDove: 'Printed sheets',
        telefoniCome: 'the first number goes on them',
        foto: 'Photo',
        fotoDove: 'Sheet as PDF',
        fotoCome: 'and the class photo',
      },
      figure: [
        {
          didascalia:
            'Where what you write in the form ends up. An empty box breaks nothing, but it ' +
            'switches off what’s to its right.',
        },
      ],
      voci: [
        {
          termine: 'Where it opens',
          testo:
            `**Edit** at the top of ${Molti(EN.pif)}, on the full-page record and in the ` +
            'Personal details box; or from the pencil next to the name in Classes. At the top ' +
            'the **Class**: you choose it for a new person, and after that it can only be read. ' +
            'Below, four parts: **Who they are**, **How to reach them**, ' +
            `${Uno(EN.rappresentante)}, ${Uno(EN.azienda)}.`,
        },
        {
          termine: 'Attends',
          testo:
            'Untick it and the person drops out of attendance, the map, the birthdays and the ' +
            'messages, but attendance and grades stay.',
        },
        {
          termine: 'The photo',
          testo:
            '**Add photo**, **Change photo** and **Remove**: a JPEG or a PNG, which applies ' +
            'straight away, without waiting for **Save**. For a new person the commands are off ' +
            'until you’ve saved them once.',
        },
        {
          termine: 'Phones',
          testo:
            'One or more for each of the three, with **Add a number**, and for each which number ' +
            'it is: mobile, home, work, switchboard, other. The first is the one tried first and ' +
            'the one that goes on the sheets: change the order by dragging the row by its handle.',
        },
        {
          termine: 'The dialling code',
          testo:
            'When saving, a number without a code gets `+41` and keeps the spacing it was typed ' +
            'with. One that already has its code, or has words in it, isn’t touched.',
        },
        {
          termine: 'Addresses',
          testo:
            '**Street and number**, **Postcode** and **Town** above; **c/o**, **PO box** and ' +
            '**Country** below, for those who have them. A foreign postcode carries the country ' +
            'code: `I-22100`. Under the street, the form says whether the address is already on ' +
            'the map.',
        },
        {
          termine: Uno(EN.rappresentante),
          testo:
            'An email, which receives messages instead of the person or as well, and their ' +
            'numbers: those of whoever answers for them while they’re under age.',
        },
        {
          termine: Uno(EN.azienda),
          testo:
            'The name, the workplace address, the employer’s email and the numbers. The ' +
            'employer’s email receives the absence sheets to countersign: without it, the ' +
            'request isn’t sent.',
        },
      ],
      note: [
        '**Remove from class**, at the bottom of the form, deletes the person along with their ' +
          'attendance and grades. For someone who leaves, untick **Attends** instead.',
        'The point on the map belongs to the address, not the person: when you correct the ' +
          'street, the new address has no coordinates yet, and has to be looked up with ' +
          '**Find**.',
      ],
    },
    mappa: {
      titolo: 'Map',
      sommario:
        `A single map with all the points: where the ${EN.pif.plurale} live and work, and the ` +
        'school.',
      scritte: {
        conti: '40 addresses of 42 on the map · 3 shared',
        lavoro: 'Workplace',
        domicilio: 'Home',
        via1: '3 Pine Road, Village',
        chi1: 'Anna R. · home',
        trova: 'Find',
        via2: '12 High Street, Borough',
        soloPaese: 'town only',
        via3: '5 New Street, Bank',
        inTirocinio: '3 apprentices',
        via4: '8 Sun Lane, Lake',
        chi4: 'Luca B. · home',
        distanza: '4.1 km',
        inTirocinioQui: '3 training here',
        sede: 'school',
        rigaScritta: 'The line as written',
        dallAnagrafica: 'from the details',
        spezzata: 'Split up',
        parti: 'street, postcode, town',
        quattro: 'Four lookups',
        laPrima: 'the first that hits',
        punto: 'The point',
        nelDocumento: 'in the document',
        esempio1: 'Practice X, 12 High St,',
        esempio2: 'PO Box 5, 6500 Borough',
        messi: 'set aside:',
        quali: '“Practice X”, “PO Box 5”',
        parte1: 'here the whole line',
        parte2: 'goes: c/o, PO box',
        domanda1: 'street and number',
        domanda2: 'street only',
        domanda3: 'the whole line',
        domanda4: 'town only',
        una1: 'one per address:',
        una2: 'it holds for everyone',
        una3: 'who is there',
      },
      figure: [
        {
          didascalia:
            'On the left the addresses, on the right the map: read a row and look where it ' +
            'lands. A click on a row takes the map there.',
          legenda: [
            'Three tabs: **All**, **Workplace**, **Home**. They drive the list and the map ' +
              'together.',
            'At the top, what isn’t on the map yet, with its **Find**.',
            '“town only”: the street isn’t in OpenStreetMap, and the point is the centre of the ' +
              'town.',
            'An address several people share: a single row.',
            'The label: who is there, with their class. Every name leads to its record.',
            'The journey from home to workplace.',
            'The school: distances are measured from here, as the crow flies.',
          ],
        },
        {
          didascalia:
            'How an address becomes a point. For the split-up lookups, anything that isn’t an ' +
            'address is set aside; if they aren’t enough, the whole line goes out, “c/o” and PO ' +
            'box included. It stops at the first answer.',
        },
      ],
      voci: [
        {
          termine: 'What you see',
          testo:
            'A pin for every home and workplace entered in the personal details, plus the ' +
            `school. It shows the ${EN.pif.plurale} still attending, from all the year’s ` +
            'non-archived classes or from the chosen one.',
        },
        {
          termine: 'Shape and colour',
          testo:
            'The figure in the tip says what kind of place it is: a house, a company, the ' +
            'school. The colour is the class’s calendar colour, but only for homes of a single ' +
            'class: companies and homes shared across classes stay without one.',
        },
        {
          termine: 'A pin is an address',
          testo:
            'Two siblings are a single house, six apprentices in the same workshop a single ' +
            'shed: ' +
            'the label lists them all. If two from the same firm end up on two rows, one of the ' +
            'two addresses is written differently.',
        },
        {
          termine: 'The list on the left',
          testo:
            'First the addresses without a point, then those that landed on the town, then the ' +
            'others, furthest first. A workplace reads with the firm’s name at the top; below, ' +
            'the names with the house or company in front, and each one takes you to the record.',
        },
        {
          termine: 'Moving around the map',
          testo:
            'Drag it and zoom with the wheel; **Fit everything**, in the action bar, brings ' +
            'every point shown back into view. A click on a pin opens its label, a click on an ' +
            'empty spot closes it.',
        },
        {
          termine: 'The journeys',
          testo:
            'The dashed line runs from a person’s home to their workplace, and is only there in ' +
            '**All**, where both ends can be seen. Hovering lights it up with name and ' +
            'kilometres; a click keeps it lit and dims the rest.',
        },
        {
          termine: 'Find addresses',
          testo:
            'In the action bar: asks OpenStreetMap for the addresses that don’t have a point ' +
            'yet, one per second, at most sixty at a time — for the rest, press again. Off when ' +
            'every address is already on the map.',
        },
        {
          termine: '“town only”',
          testo:
            'The street isn’t in OpenStreetMap and the point is the centre of the town. It’s ' +
            'still useful — “comes from Olivone” is an answer — but you can’t drive to that pin.',
        },
        {
          termine: 'When a point looks wrong',
          testo:
            'What the service understood can be read on the person’s record, under the address. ' +
            'Correct it from **Edit** and press **Find**. **Redo the addresses** asks again from ' +
            'scratch, after a confirmation, even for those already on the map: about a second ' +
            'each, at most sixty at a time.',
        },
        {
          termine: 'The counts at the top',
          testo:
            'How many addresses are on the map out of how many entered, how many are shared, and ' +
            `how many ${EN.pif.plurale} have no address at all: without that number it would ` +
            'look as if they lived nowhere.',
        },
        {
          termine: 'One class or all',
          testo:
            'To begin with, all classes together: the question is “who comes from where”, and ' +
            'shared addresses are almost always between different classes. With at least two ' +
            'classes, the **Class** drop-down next to **Period** narrows map and list to one, ' +
            'to plan that class’s visits.',
        },
      ],
      note: [
        '**Find addresses**, **Redo the addresses** and the **Find** buttons on the map and ' +
          'the record are the only actions that send personal data outside, and that’s why ' +
          'they’re pressed by hand. The address line goes out, and if the split-up lookups ' +
          'aren’t enough it goes out whole: including a name written under **c/o** and the PO ' +
          'box.',
        'One lookup per address, not per person: the answer stays written in the document and ' +
          'holds for everyone who lives there. The map tiles come from OpenStreetMap — which ' +
          'thus sees which areas are being looked at — and stay in a cache on the computer, ' +
          'outside the document.',
      ],
    },
  },
})
