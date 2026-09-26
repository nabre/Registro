// I testi del condotto (`conduit.ts`): i rifiuti nella busta JSON-RPC e il
// guasto di avvio. Chiavi d'impostazione, campi della busta e nomi dei metodi
// restano uguali in ogni lingua.

import { catalogo } from '../../i18n/index.js'

/** Il permesso che manca, come lo scrive l'impostazione che lo concede. */
type Permesso = 'lettura' | 'scrittura'

const it = {
  nonConcede: (che: Permesso) => `Il condotto non concede la ${che}.`,
  siConcede: (che: Permesso) => `Si concede con l’impostazione «registroDocenti.api.${che}».`,
  permessiIntoccabili: 'I permessi del condotto non si cambiano dal condotto.',
  programmiIntoccabili: 'I programmi che il registro fa partire non si cambiano dal condotto.',
  voceIntoccabile: 'Dove il registro manda la voce della dettatura non si cambia dal condotto.',
  aMano: 'Si cambiano dalle impostazioni del registro, a mano.',
  nonConosceProcedura: (nome: string) => `Il registro non conosce «${nome}».`,
  comandoAttrezzi: 'Il comando di cui si vogliono gli attrezzi',
  posizionali:
    'I parametri posizionali non si usano: «params» vuole un oggetto ' +
    'con i nomi dei campi.',
  raccontareELeggere: (metodo: string) =>
    `«${metodo}» racconta che cosa c’è nel registro, e raccontarlo è leggerlo.`,
  ingressoNonValido: 'Ingresso non valido.',
  serveProcedura: 'Serve il nome della procedura, in «procedura».',
  nonConosceMetodo: (metodo: string) => `Il condotto non conosce «${metodo}».`,
  proceduraDi: (metodo: string, che: Permesso) =>
    `«${metodo}» è una procedura di ${che}, e il condotto non la concede.`,
  guastoNelGiornale: (tracciato: string) =>
    `Guasto interno del registro. Nel giornale: ${tracciato}.`,
  rispostaTroppoLunga: 'La risposta supera il limite di 1 MiB.',
  serveOggetto: 'Serve un oggetto JSON-RPC.',
  nonJson: 'La riga non è JSON.',
  idNonValido: 'L’«id» vuole una stringa, un numero o null.',
  siChiude: 'Il condotto si sta chiudendo.',
  siSpegne: 'Il registro si sta spegnendo e non accetta altre chiamate.',
  mancaMetodo: 'Manca il nome del metodo.',
  guastoInterno: 'Guasto interno del registro.',
  nonSerializzata: 'La risposta non si è potuta serializzare.',
  eseguita: 'La chiamata è stata eseguita: il suo effetto sul registro c’è.',
  bustaNonComposta: 'Quel che non si è potuto comporre è la busta della risposta.',
  troppeInAttesa: (quante: number) => `Questa connessione ha già ${quante} richieste in attesa.`,
  siAspetta: 'Si aspetta la risposta di quel che è già stato mandato, e poi si riprende.',
  troppoPeso: 'Questa connessione ha in attesa più di 16 MiB di richieste.',
  rigaTroppoLunga: 'La riga supera il limite di 1 MiB.',
  limiteRiga: 'Una richiesta JSON-RPC del condotto non può superare 1 MiB per riga.',
  unPercorso: 'Per i file grandi si passa un percorso, non il contenuto.',
  tutteOccupate: (quante: number) =>
    `Il condotto regge ${quante} connessioni insieme, e sono tutte occupate.`,
  siRiprova: 'Si riprova quando una delle connessioni aperte si chiude.',
  nomePreso: (indirizzo: string) =>
    `il nome «${indirizzo}» è già preso: o c’è un’altra copia del registro in ascolto, ` +
    'o quel nome l’ha occupato qualcun altro. Il registro parte senza condotto.',
}

export const testi = catalogo(it, {
  de: {
    nonConcede: (che) =>
      `Der Kanal erlaubt ${che === 'lettura' ? 'das Lesen' : 'das Schreiben'} nicht.`,
    siConcede: (che) => `Erlaubt wird es mit der Einstellung «registroDocenti.api.${che}».`,
    permessiIntoccabili: 'Die Berechtigungen des Kanals lassen sich nicht über den Kanal ändern.',
    programmiIntoccabili:
      'Die Programme, die das Klassenbuch startet, lassen sich nicht über den Kanal ändern.',
    voceIntoccabile:
      'Wohin das Klassenbuch die Stimme des Diktats schickt, lässt sich nicht über den Kanal ' +
      'ändern.',
    aMano: 'Man ändert sie von Hand in den Einstellungen des Klassenbuchs.',
    nonConosceProcedura: (nome) => `Das Klassenbuch kennt «${nome}» nicht.`,
    comandoAttrezzi: 'Der Befehl, für den man die Werkzeuge will',
    posizionali:
      'Positionsparameter werden nicht verwendet: «params» verlangt ein Objekt mit den ' +
      'Feldnamen.',
    raccontareELeggere: (metodo) =>
      `«${metodo}» erzählt, was im Klassenbuch steht, und das zu erzählen heisst, es zu lesen.`,
    ingressoNonValido: 'Ungültige Eingabe.',
    serveProcedura: 'Es braucht den Namen der Prozedur, in «procedura».',
    nonConosceMetodo: (metodo) => `Der Kanal kennt «${metodo}» nicht.`,
    proceduraDi: (metodo, che) =>
      `«${metodo}» ist eine ${che === 'lettura' ? 'lesende' : 'schreibende'} Prozedur, und der ` +
      'Kanal erlaubt sie nicht.',
    guastoNelGiornale: (tracciato) =>
      `Interner Fehler des Klassenbuchs. In der Logdatei: ${tracciato}.`,
    rispostaTroppoLunga: 'Die Antwort überschreitet die Grenze von 1 MiB.',
    serveOggetto: 'Es braucht ein JSON-RPC-Objekt.',
    nonJson: 'Die Zeile ist kein JSON.',
    idNonValido: 'Die «id» verlangt einen String, eine Zahl oder null.',
    siChiude: 'Der Kanal wird gerade geschlossen.',
    siSpegne: 'Das Klassenbuch wird gerade beendet und nimmt keine weiteren Aufrufe an.',
    mancaMetodo: 'Der Name der Methode fehlt.',
    guastoInterno: 'Interner Fehler des Klassenbuchs.',
    nonSerializzata: 'Die Antwort liess sich nicht serialisieren.',
    eseguita: 'Der Aufruf wurde ausgeführt: Seine Wirkung auf das Klassenbuch ist da.',
    bustaNonComposta: 'Was sich nicht zusammensetzen liess, ist der Umschlag der Antwort.',
    troppeInAttesa: (quante) => `Diese Verbindung hat schon ${quante} wartende Anfragen.`,
    siAspetta: 'Man wartet auf die Antwort auf das bereits Gesendete und macht dann weiter.',
    troppoPeso: 'Diese Verbindung hat mehr als 16 MiB an wartenden Anfragen.',
    rigaTroppoLunga: 'Die Zeile überschreitet die Grenze von 1 MiB.',
    limiteRiga: 'Eine JSON-RPC-Anfrage an den Kanal darf 1 MiB pro Zeile nicht überschreiten.',
    unPercorso: 'Für grosse Dateien übergibt man einen Pfad, nicht den Inhalt.',
    tutteOccupate: (quante) =>
      `Der Kanal verkraftet ${quante} Verbindungen gleichzeitig, und alle sind belegt.`,
    siRiprova: 'Man versucht es erneut, wenn eine der offenen Verbindungen geschlossen wird.',
    nomePreso: (indirizzo) =>
      `der Name «${indirizzo}» ist schon vergeben: Entweder hört eine andere Kopie des ` +
      'Klassenbuchs zu, oder jemand anders hat diesen Namen belegt. Das Klassenbuch startet ' +
      'ohne Kanal.',
  },
  fr: {
    nonConcede: (che) =>
      `Le canal n’autorise pas ${che === 'lettura' ? 'la lecture' : 'l’écriture'}.`,
    siConcede: (che) => `On l’autorise avec le paramètre « registroDocenti.api.${che} ».`,
    permessiIntoccabili: 'Les autorisations du canal ne se changent pas depuis le canal.',
    programmiIntoccabili:
      'Les programmes que le registre lance ne se changent pas depuis le canal.',
    voceIntoccabile:
      'L’endroit où le registre envoie la voix de la dictée ne se change pas depuis le canal.',
    aMano: 'On les change à la main dans les paramètres du registre.',
    nonConosceProcedura: (nome) => `Le registre ne connaît pas « ${nome} ».`,
    comandoAttrezzi: 'La commande dont on veut les outils',
    posizionali:
      'Les paramètres positionnels ne s’utilisent pas : « params » veut un objet avec les ' +
      'noms des champs.',
    raccontareELeggere: (metodo) =>
      `« ${metodo} » raconte ce qu’il y a dans le registre, et le raconter, c’est le lire.`,
    ingressoNonValido: 'Entrée non valide.',
    serveProcedura: 'Il faut le nom de la procédure, dans « procedura ».',
    nonConosceMetodo: (metodo) => `Le canal ne connaît pas « ${metodo} ».`,
    proceduraDi: (metodo, che) =>
      `« ${metodo} » est une procédure ${che === 'lettura' ? 'de lecture' : 'd’écriture'}, et ` +
      'le canal ne l’autorise pas.',
    guastoNelGiornale: (tracciato) =>
      `Erreur interne du registre. Dans le journal : ${tracciato}.`,
    rispostaTroppoLunga: 'La réponse dépasse la limite de 1 Mio.',
    serveOggetto: 'Il faut un objet JSON-RPC.',
    nonJson: 'La ligne n’est pas du JSON.',
    idNonValido: 'L’« id » veut une chaîne, un nombre ou null.',
    siChiude: 'Le canal est en train de se fermer.',
    siSpegne: 'Le registre est en train de s’éteindre et n’accepte plus d’appels.',
    mancaMetodo: 'Le nom de la méthode manque.',
    guastoInterno: 'Erreur interne du registre.',
    nonSerializzata: 'La réponse n’a pas pu être sérialisée.',
    eseguita: 'L’appel a été exécuté : son effet sur le registre est là.',
    bustaNonComposta: 'Ce qui n’a pas pu être composé, c’est l’enveloppe de la réponse.',
    troppeInAttesa: (quante) => `Cette connexion a déjà ${quante} requêtes en attente.`,
    siAspetta: 'On attend la réponse à ce qui a déjà été envoyé, puis on reprend.',
    troppoPeso: 'Cette connexion a plus de 16 Mio de requêtes en attente.',
    rigaTroppoLunga: 'La ligne dépasse la limite de 1 Mio.',
    limiteRiga: 'Une requête JSON-RPC du canal ne peut pas dépasser 1 Mio par ligne.',
    unPercorso: 'Pour les gros fichiers, on passe un chemin, pas le contenu.',
    tutteOccupate: (quante) =>
      `Le canal supporte ${quante} connexions à la fois, et elles sont toutes occupées.`,
    siRiprova: 'On réessaie quand une des connexions ouvertes se ferme.',
    nomePreso: (indirizzo) =>
      `le nom « ${indirizzo} » est déjà pris : soit une autre copie du registre est à ` +
      'l’écoute, soit quelqu’un d’autre a occupé ce nom. Le registre démarre sans canal.',
  },
  en: {
    nonConcede: (che) =>
      `The pipe does not allow ${che === 'lettura' ? 'reading' : 'writing'}.`,
    siConcede: (che) => `It is allowed with the “registroDocenti.api.${che}” setting.`,
    permessiIntoccabili: 'The pipe’s permissions cannot be changed from the pipe.',
    programmiIntoccabili: 'The programs the register starts cannot be changed from the pipe.',
    voceIntoccabile:
      'Where the register sends the dictation voice cannot be changed from the pipe.',
    aMano: 'They are changed by hand in the register’s settings.',
    nonConosceProcedura: (nome) => `The register does not know “${nome}”.`,
    comandoAttrezzi: 'The command whose tools are wanted',
    posizionali:
      'Positional parameters are not used: “params” wants an object with the field names.',
    raccontareELeggere: (metodo) =>
      `“${metodo}” tells what is in the register, and telling it is reading it.`,
    ingressoNonValido: 'Invalid input.',
    serveProcedura: 'The procedure name is needed, in “procedura”.',
    nonConosceMetodo: (metodo) => `The pipe does not know “${metodo}”.`,
    proceduraDi: (metodo, che) =>
      `“${metodo}” is a ${che === 'lettura' ? 'reading' : 'writing'} procedure, and the pipe ` +
      'does not allow it.',
    guastoNelGiornale: (tracciato) => `Internal error in the register. In the log: ${tracciato}.`,
    rispostaTroppoLunga: 'The response exceeds the 1 MiB limit.',
    serveOggetto: 'A JSON-RPC object is needed.',
    nonJson: 'The line is not JSON.',
    idNonValido: 'The “id” wants a string, a number or null.',
    siChiude: 'The pipe is closing.',
    siSpegne: 'The register is shutting down and accepts no more calls.',
    mancaMetodo: 'The method name is missing.',
    guastoInterno: 'Internal error in the register.',
    nonSerializzata: 'The response could not be serialised.',
    eseguita: 'The call was carried out: its effect on the register is there.',
    bustaNonComposta: 'What could not be put together is the envelope of the response.',
    troppeInAttesa: (quante) => `This connection already has ${quante} requests waiting.`,
    siAspetta: 'Wait for the response to what has already been sent, then carry on.',
    troppoPeso: 'This connection has more than 16 MiB of requests waiting.',
    rigaTroppoLunga: 'The line exceeds the 1 MiB limit.',
    limiteRiga: 'A JSON-RPC request to the pipe cannot exceed 1 MiB per line.',
    unPercorso: 'For large files, pass a path, not the content.',
    tutteOccupate: (quante) =>
      `The pipe handles ${quante} connections at once, and they are all taken.`,
    siRiprova: 'Try again when one of the open connections closes.',
    nomePreso: (indirizzo) =>
      `the name “${indirizzo}” is already taken: either another copy of the register is ` +
      'listening, or someone else has taken that name. The register starts without the pipe.',
  },
})
