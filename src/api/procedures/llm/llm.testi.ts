// I testi delle procedure di `llm`. Si leggono al momento dell'uso
// (`titolo: () => t().titolo`), mai al caricamento. Restano uguali in ogni
// lingua: nomi di depositi e file, sigle delle quantizzazioni («Q4_K_M»),
// «mmproj», «Hugging Face», nomi di procedura e i valori `assistente` e `ocr`.

import { catalogo } from '../../../i18n/index.js'

const it = {
  annulla: {
    titolo: 'Ferma lo scarico di un modello in corso, o lo toglie dalla coda',
    file:
      'Quale file: se aspetta in coda si toglie, se scende si ferma. Senza, si ferma quel che ' +
      'scende',
  },
  catalogo: {
    titolo: 'I modelli consigliati, e quelli che si trovano cercando su Hugging Face',
    cercaIngresso: 'Che cosa cercare fra i depositi pubblici: «qwen», «vision», «7b»',
    cercaUscita: 'La ricerca fatta fra i depositi. Vuota se non se n’è fatta nessuna',
    deposito: 'Il deposito: «utente/nome»',
    perChe: 'Per quale mestiere è consigliato',
    taglio: 'La quantizzazione da preferire: «Q4_K_M»',
    nota: 'Che cosa sa fare, e che macchina vuole',
    scarichi: 'Quante volte è stato scaricato: è l’unico indizio di fiducia',
    ristretto: 'Chiede di accettare delle condizioni: da qui non si scarica',
    presentazione: {
      titolo: 'Modelli da scaricare',
      consigliati: 'Consigliati',
      modello: 'Modello',
      per: 'Per',
      taglio: 'Taglio',
      deposito: 'Deposito',
      nota: 'Che cosa sa fare',
      trovati: 'Trovati cercando',
      scarichi: 'Scarichi',
      ristretto: 'Ristretto',
    },
  },
  elimina: {
    titolo: 'Toglie un modello del linguaggio dalla cartella',
    nome: 'Il nome del file, come lo elenca «llm.modelli»',
  },
  file: {
    titolo: 'I file .gguf pubblicati da un deposito di Hugging Face',
    depositoIngresso: 'Il deposito: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
    taglioIngresso: 'La quantizzazione da consigliare fra quelle pubblicate: «Q4_K_M»',
    depositoUscita: 'Il deposito di cui sono i file',
    taglioUscita: 'La quantizzazione su cui è stato scelto il consigliato',
    percorso: 'Il nome del file dentro il deposito',
    taglioFile: 'La quantizzazione letta dal nome, o vuoto',
    proiettoreFile: 'È l’«mmproj» di un modello che guarda',
    consigliato: 'Quale premere, se non si sa scegliere. Vuoto se non c’è',
    proiettore: 'Il file «mmproj» da prendere insieme, se il deposito ne ha uno',
    motivo: 'Perché l’elenco è vuoto: il sito non risponde, il deposito non c’è',
    nonRisponde: 'Il deposito non risponde.',
    presentazione: {
      titolo: 'I file di un deposito',
      deposito: 'Deposito',
      taglioChiesto: 'Taglio chiesto',
      consigliato: 'Consigliato',
      proiettoreInsieme: 'Proiettore da prendere insieme',
      motivo: 'Perché l’elenco è vuoto',
      file: 'File',
      taglio: 'Taglio',
      pesa: 'Pesa',
      proiettore: 'Proiettore',
    },
  },
  importa: {
    titolo: 'Prende un file .gguf che si ha già e lo mette fra i modelli',
    file:
      'Il percorso intero del file .gguf da copiare fra i modelli. Vuoto apre il dialogo ' +
      'di sistema, che è quel che fa il pulsante «Carica un file…»',
  },
  modelli: {
    titolo: 'I modelli del linguaggio scaricati, con quello in uso per ciascun mestiere',
    cartella: 'Dove stanno i file, per chi vuole aprirla',
    nome: 'Il nome del file: è anche quel che si sceglie',
    byte: 'Quanto pesa',
    proiettore: 'È l’«mmproj» di un modello che guarda, non un modello',
    incompiuto: 'Uno scarico mai finito: non si può usare, si può solo buttare o rifare',
    deposito: 'Il deposito di Hugging Face da cui stava scendendo',
    file: 'Il file dentro quel deposito',
    per: 'Per quale mestiere era stato chiesto',
    sorgente: 'Da dove veniva uno scarico a metà: è quel che serve per riprenderlo',
    modello: 'Il file scelto, o vuoto se nessuno',
    pronto: 'Se adesso si può chiedere qualcosa',
    motivo: 'Perché non si può, in una frase che si legge',
    proiettoreOcr: 'Il secondo file del modello che guarda',
    presentazione: {
      titolo: 'I modelli del linguaggio sul disco',
      cartella: 'Cartella',
      file: 'File',
      pesa: 'Pesa',
      proiettore: 'Proiettore',
      aMeta: 'A metà',
    },
  },
  scarica: {
    titolo: 'Scarica un modello del linguaggio nella cartella dei modelli',
    deposito: 'Il deposito di Hugging Face: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
    file: 'Quale file, come lo elenca «llm.file»',
    per: 'Per quale mestiere: arrivato, si sceglie da sé per quello',
  },
  scegli: {
    titolo: 'Sceglie quale modello usa l’assistente o la lettura delle scansioni',
    uso: 'Per quale mestiere lavora questo modello',
    modello: 'Il nome del file, o vuoto per non usarne nessuno',
    proiettore:
      'Il file «mmproj» del modello che guarda: serve solo alla lettura delle scansioni',
  },
}

export const testi = catalogo(it, {
  de: {
    annulla: {
      titolo:
        'Hält den laufenden Download eines Modells an oder nimmt ihn aus der Warteschlange',
      file:
        'Welche Datei: Wartet sie in der Warteschlange, wird sie entfernt; lädt sie gerade, ' +
        'wird der Download angehalten. Ohne Angabe wird angehalten, was gerade lädt',
    },
    catalogo: {
      titolo: 'Die empfohlenen Modelle und die, die man bei der Suche auf Hugging Face findet',
      cercaIngresso:
        'Wonach in den öffentlichen Repositorys gesucht wird: «qwen», «vision», «7b»',
      cercaUscita:
        'Die Suche, die in den Repositorys gemacht wurde. Leer, wenn nicht gesucht wurde',
      deposito: 'Das Repository: «benutzer/name»',
      perChe: 'Für welche Aufgabe es empfohlen wird',
      taglio: 'Die bevorzugte Quantisierung: «Q4_K_M»',
      nota: 'Was es kann und welchen Computer es braucht',
      scarichi:
        'Wie oft es heruntergeladen wurde: der einzige Anhaltspunkt für Vertrauen',
      ristretto:
        'Verlangt, dass man Bedingungen akzeptiert: Von hier aus lässt es sich nicht ' +
        'herunterladen',
      presentazione: {
        titolo: 'Modelle zum Herunterladen',
        consigliati: 'Empfohlen',
        modello: 'Modell',
        per: 'Für',
        taglio: 'Quantisierung',
        deposito: 'Repository',
        nota: 'Was es kann',
        trovati: 'Bei der Suche gefunden',
        scarichi: 'Downloads',
        ristretto: 'Eingeschränkt',
      },
    },
    elimina: {
      titolo: 'Entfernt ein Sprachmodell aus dem Ordner',
      nome: 'Der Dateiname, wie ihn «llm.modelli» aufführt',
    },
    file: {
      titolo: 'Die .gguf-Dateien, die ein Repository auf Hugging Face veröffentlicht',
      depositoIngresso: 'Das Repository: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
      taglioIngresso:
        'Die Quantisierung, die unter den veröffentlichten empfohlen werden soll: «Q4_K_M»',
      depositoUscita: 'Das Repository, zu dem die Dateien gehören',
      taglioUscita: 'Die Quantisierung, nach der die empfohlene Datei gewählt wurde',
      percorso: 'Der Dateiname im Repository',
      taglioFile: 'Die aus dem Namen gelesene Quantisierung, oder leer',
      proiettoreFile: 'Ist das «mmproj» eines sehenden Modells',
      consigliato:
        'Welche Datei man nimmt, wenn man nicht zu wählen weiss. Leer, wenn es keine gibt',
      proiettore:
        'Die «mmproj»-Datei, die man dazu holt, wenn das Repository eine hat',
      motivo:
        'Warum die Liste leer ist: Die Website antwortet nicht, das Repository gibt es nicht',
      nonRisponde: 'Das Repository antwortet nicht.',
      presentazione: {
        titolo: 'Die Dateien eines Repositorys',
        deposito: 'Repository',
        taglioChiesto: 'Gewünschte Quantisierung',
        consigliato: 'Empfohlen',
        proiettoreInsieme: 'Projektor, der dazugehört',
        motivo: 'Warum die Liste leer ist',
        file: 'Datei',
        taglio: 'Quantisierung',
        pesa: 'Grösse',
        proiettore: 'Projektor',
      },
    },
    importa: {
      titolo: 'Nimmt eine vorhandene .gguf-Datei und legt sie zu den Modellen',
      file:
        'Der vollständige Pfad der .gguf-Datei, die zu den Modellen kopiert wird. Leer öffnet ' +
        'den Dialog des Systems, wie es die Schaltfläche «Datei laden…» tut',
    },
    modelli: {
      titolo:
        'Die heruntergeladenen Sprachmodelle, mit dem jeweils verwendeten Modell pro Aufgabe',
      cartella: 'Wo die Dateien liegen, für alle, die den Ordner öffnen wollen',
      nome: 'Der Dateiname: Er ist auch das, was man auswählt',
      byte: 'Wie gross es ist',
      proiettore: 'Ist das «mmproj» eines sehenden Modells, kein Modell',
      incompiuto:
        'Ein nie beendeter Download: Er ist nicht verwendbar und lässt sich nur löschen oder ' +
        'neu starten',
      deposito: 'Das Repository auf Hugging Face, aus dem es heruntergeladen wurde',
      file: 'Die Datei in diesem Repository',
      per: 'Für welche Aufgabe es angefordert wurde',
      sorgente:
        'Woher ein halber Download kam: Das braucht man, um ihn wieder aufzunehmen',
      modello: 'Die gewählte Datei, oder leer, wenn keine',
      pronto: 'Ob man jetzt etwas fragen kann',
      motivo: 'Warum nicht, in einem lesbaren Satz',
      proiettoreOcr: 'Die zweite Datei des sehenden Modells',
      presentazione: {
        titolo: 'Die Sprachmodelle auf der Festplatte',
        cartella: 'Ordner',
        file: 'Datei',
        pesa: 'Grösse',
        proiettore: 'Projektor',
        aMeta: 'Unvollständig',
      },
    },
    scarica: {
      titolo: 'Lädt ein Sprachmodell in den Ordner der Modelle herunter',
      deposito: 'Das Repository auf Hugging Face: «bartowski/Qwen2.5-7B-Instruct-GGUF»',
      file: 'Welche Datei, wie sie «llm.file» aufführt',
      per: 'Für welche Aufgabe: Ist es angekommen, wird es dafür von selbst ausgewählt',
    },
    scegli: {
      titolo: 'Wählt, welches Modell der Assistent oder das Lesen von Scans verwendet',
      uso: 'Für welche Aufgabe dieses Modell arbeitet',
      modello: 'Der Dateiname, oder leer, um keines zu verwenden',
      proiettore:
        'Die «mmproj»-Datei des sehenden Modells: Sie wird nur für das Lesen von Scans ' +
        'gebraucht',
    },
  },
  fr: {
    annulla: {
      titolo:
        'Arrête le téléchargement en cours d’un modèle, ou le retire de la file d’attente',
      file:
        'Quel fichier : s’il attend dans la file, il en est retiré ; s’il se télécharge, ' +
        'il s’arrête. Sans fichier, on arrête ce qui se télécharge',
    },
    catalogo: {
      titolo:
        'Les modèles conseillés, et ceux que l’on trouve en cherchant sur Hugging Face',
      cercaIngresso:
        'Ce qu’il faut chercher parmi les dépôts publics : « qwen », « vision », « 7b »',
      cercaUscita:
        'La recherche faite parmi les dépôts. Vide si aucune recherche n’a été faite',
      deposito: 'Le dépôt : « utilisateur/nom »',
      perChe: 'Pour quel usage il est conseillé',
      taglio: 'La quantification à préférer : « Q4_K_M »',
      nota: 'Ce qu’il sait faire, et quelle machine il demande',
      scarichi:
        'Combien de fois il a été téléchargé : c’est le seul indice de confiance',
      ristretto:
        'Demande d’accepter des conditions : on ne peut pas le télécharger d’ici',
      presentazione: {
        titolo: 'Modèles à télécharger',
        consigliati: 'Conseillés',
        modello: 'Modèle',
        per: 'Pour',
        taglio: 'Quantification',
        deposito: 'Dépôt',
        nota: 'Ce qu’il sait faire',
        trovati: 'Trouvés en cherchant',
        scarichi: 'Téléchargements',
        ristretto: 'Restreint',
      },
    },
    elimina: {
      titolo: 'Retire un modèle de langage du dossier',
      nome: 'Le nom du fichier, tel que « llm.modelli » l’indique',
    },
    file: {
      titolo: 'Les fichiers .gguf publiés par un dépôt de Hugging Face',
      depositoIngresso: 'Le dépôt : « bartowski/Qwen2.5-7B-Instruct-GGUF »',
      taglioIngresso:
        'La quantification à conseiller parmi celles qui sont publiées : « Q4_K_M »',
      depositoUscita: 'Le dépôt auquel appartiennent les fichiers',
      taglioUscita: 'La quantification sur laquelle le fichier conseillé a été choisi',
      percorso: 'Le nom du fichier dans le dépôt',
      taglioFile: 'La quantification lue dans le nom, ou vide',
      proiettoreFile: 'C’est le « mmproj » d’un modèle qui regarde',
      consigliato: 'Lequel choisir si on ne sait pas choisir. Vide s’il n’y en a pas',
      proiettore:
        'Le fichier « mmproj » à prendre avec le modèle, si le dépôt en a un',
      motivo:
        'Pourquoi la liste est vide : le site ne répond pas, le dépôt n’existe pas',
      nonRisponde: 'Le dépôt ne répond pas.',
      presentazione: {
        titolo: 'Les fichiers d’un dépôt',
        deposito: 'Dépôt',
        taglioChiesto: 'Quantification demandée',
        consigliato: 'Conseillé',
        proiettoreInsieme: 'Projecteur à prendre avec',
        motivo: 'Pourquoi la liste est vide',
        file: 'Fichier',
        taglio: 'Quantification',
        pesa: 'Taille',
        proiettore: 'Projecteur',
      },
    },
    importa: {
      titolo: 'Prend un fichier .gguf que l’on a déjà et le range parmi les modèles',
      file:
        'Le chemin complet du fichier .gguf à copier parmi les modèles. Vide, ouvre la boîte ' +
        'de dialogue du système, comme le bouton « Charger un fichier… »',
    },
    modelli: {
      titolo:
        'Les modèles de langage téléchargés, avec celui qui est utilisé pour chaque usage',
      cartella: 'Où se trouvent les fichiers, pour qui veut ouvrir le dossier',
      nome: 'Le nom du fichier : c’est aussi ce que l’on choisit',
      byte: 'Sa taille',
      proiettore: 'C’est le « mmproj » d’un modèle qui regarde, pas un modèle',
      incompiuto:
        'Un téléchargement jamais terminé : inutilisable, on peut seulement le jeter ou le ' +
        'refaire',
      deposito: 'Le dépôt de Hugging Face d’où il se téléchargeait',
      file: 'Le fichier dans ce dépôt',
      per: 'Pour quel usage il avait été demandé',
      sorgente:
        'D’où venait un téléchargement interrompu : c’est ce qu’il faut pour le reprendre',
      modello: 'Le fichier choisi, ou vide si aucun',
      pronto: 'Si l’on peut poser une question maintenant',
      motivo: 'Pourquoi on ne peut pas, en une phrase lisible',
      proiettoreOcr: 'Le second fichier du modèle qui regarde',
      presentazione: {
        titolo: 'Les modèles de langage sur le disque',
        cartella: 'Dossier',
        file: 'Fichier',
        pesa: 'Taille',
        proiettore: 'Projecteur',
        aMeta: 'Inachevé',
      },
    },
    scarica: {
      titolo: 'Télécharge un modèle de langage dans le dossier des modèles',
      deposito: 'Le dépôt de Hugging Face : « bartowski/Qwen2.5-7B-Instruct-GGUF »',
      file: 'Quel fichier, tel que « llm.file » l’indique',
      per: 'Pour quel usage : une fois arrivé, il est choisi tout seul pour celui-ci',
    },
    scegli: {
      titolo: 'Choisit quel modèle utilisent l’assistant ou la lecture des scans',
      uso: 'Pour quel usage travaille ce modèle',
      modello: 'Le nom du fichier, ou vide pour n’en utiliser aucun',
      proiettore:
        'Le fichier « mmproj » du modèle qui regarde : il ne sert qu’à la lecture des scans',
    },
  },
  en: {
    annulla: {
      titolo: 'Stops a model download in progress, or removes it from the queue',
      file:
        'Which file: if it is waiting in the queue it is removed, if it is downloading it stops. ' +
        'Without it, whatever is downloading stops',
    },
    catalogo: {
      titolo: 'The recommended models, and those found by searching on Hugging Face',
      cercaIngresso:
        'What to search for among the public repositories: “qwen”, “vision”, “7b”',
      cercaUscita: 'The search made among the repositories. Empty if none was made',
      deposito: 'The repository: “user/name”',
      perChe: 'Which job it is recommended for',
      taglio: 'The quantisation to prefer: “Q4_K_M”',
      nota: 'What it can do, and what machine it needs',
      scarichi: 'How many times it has been downloaded: the only hint of trustworthiness',
      ristretto: 'Asks you to accept some conditions: it cannot be downloaded from here',
      presentazione: {
        titolo: 'Models to download',
        consigliati: 'Recommended',
        modello: 'Model',
        per: 'For',
        taglio: 'Quantisation',
        deposito: 'Repository',
        nota: 'What it can do',
        trovati: 'Found by searching',
        scarichi: 'Downloads',
        ristretto: 'Gated',
      },
    },
    elimina: {
      titolo: 'Removes a language model from the folder',
      nome: 'The file name, as “llm.modelli” lists it',
    },
    file: {
      titolo: 'The .gguf files published by a Hugging Face repository',
      depositoIngresso: 'The repository: “bartowski/Qwen2.5-7B-Instruct-GGUF”',
      taglioIngresso: 'The quantisation to recommend among the published ones: “Q4_K_M”',
      depositoUscita: 'The repository the files belong to',
      taglioUscita: 'The quantisation on which the recommended file was chosen',
      percorso: 'The file name inside the repository',
      taglioFile: 'The quantisation read from the name, or empty',
      proiettoreFile: 'It is the “mmproj” of a model that can see',
      consigliato: 'Which one to pick if you do not know how to choose. Empty if there is none',
      proiettore: 'The “mmproj” file to take along, if the repository has one',
      motivo: 'Why the list is empty: the site does not answer, the repository does not exist',
      nonRisponde: 'The repository does not answer.',
      presentazione: {
        titolo: 'The files of a repository',
        deposito: 'Repository',
        taglioChiesto: 'Requested quantisation',
        consigliato: 'Recommended',
        proiettoreInsieme: 'Projector to take along',
        motivo: 'Why the list is empty',
        file: 'File',
        taglio: 'Quantisation',
        pesa: 'Size',
        proiettore: 'Projector',
      },
    },
    importa: {
      titolo: 'Takes a .gguf file you already have and puts it among the models',
      file:
        'The full path of the .gguf file to copy among the models. Empty opens the system ' +
        'dialog, which is what the “Load a file…” button does',
    },
    modelli: {
      titolo: 'The downloaded language models, with the one in use for each job',
      cartella: 'Where the files are, for anyone who wants to open the folder',
      nome: 'The file name: it is also what you choose',
      byte: 'How big it is',
      proiettore: 'It is the “mmproj” of a model that can see, not a model',
      incompiuto: 'A download that never finished: it cannot be used, only discarded or redone',
      deposito: 'The Hugging Face repository it was downloading from',
      file: 'The file inside that repository',
      per: 'Which job it had been requested for',
      sorgente: 'Where a half-finished download came from: what is needed to resume it',
      modello: 'The chosen file, or empty if none',
      pronto: 'Whether you can ask something right now',
      motivo: 'Why you cannot, in a sentence meant to be read',
      proiettoreOcr: 'The second file of the model that can see',
      presentazione: {
        titolo: 'The language models on disk',
        cartella: 'Folder',
        file: 'File',
        pesa: 'Size',
        proiettore: 'Projector',
        aMeta: 'Incomplete',
      },
    },
    scarica: {
      titolo: 'Downloads a language model into the models folder',
      deposito: 'The Hugging Face repository: “bartowski/Qwen2.5-7B-Instruct-GGUF”',
      file: 'Which file, as “llm.file” lists it',
      per: 'Which job it is for: once it arrives, it is chosen for that job automatically',
    },
    scegli: {
      titolo: 'Chooses which model the assistant or scan reading uses',
      uso: 'Which job this model works for',
      modello: 'The file name, or empty to use none',
      proiettore:
        'The “mmproj” file of the model that can see: it is only needed for scan reading',
    },
  },
})
