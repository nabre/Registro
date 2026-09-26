// I testi dei modelli come file: quel che non entra nella cartella (`gguf.ts`),
// i modelli che il registro consiglia (`huggingFace.ts`), e gli scarichi dei
// corredi con le loro guardie (`kit.ts`).

import { catalogo } from '../i18n/index.js'

/** Come si presenta una voce del catalogo consigliato. */
interface Consigliato {
  readonly titolo: string
  /** Una riga: che cosa sa fare, e che macchina vuole. */
  readonly nota: string
}

const it = {
  // ------------------------------------------------------------ gguf.ts
  nonLeggibile: 'Non è un file che si possa leggere.',
  nonFile: (nome: string) => `«${nome}» non è un file.`,
  nonGguf: (nome: string) => `«${nome}» non è un file .gguf: i modelli hanno questa estensione.`,
  finto: (nome: string) => `«${nome}» si chiama .gguf ma non lo è: dentro non c'è un modello.`,
  nonScaricato: (nome: string) => `«${nome}» non è fra i modelli scaricati.`,
  staArrivando: (nome: string) => `«${nome}» sta ancora arrivando: prima lo si ferma.`,
  fermato: 'Scarico fermato.',
  nonModello: (nome: string) =>
    `«${nome}» è arrivato ma non è un modello: dentro non c’è un GGUF. ` +
    'L’ho cancellato. Controlla l’indirizzo, e se sei dietro a un proxy che ' +
    'filtra gli scarichi prendi il file a mano e trascinalo qui.',
  fuoriCartella: (nome: string) =>
    '«' + nome + '» risulta scaricato ma non è nella cartella dei modelli.',

  // ------------------------------------------------------------ huggingFace.ts
  consigliati: {
    qwen7: {
      titolo: 'Qwen 2.5 — 7 miliardi',
      nota:
        'La scelta di riferimento per l’assistente: chiama gli attrezzi con precisione e ' +
        'risponde in italiano. Vuole circa 5 GB sul disco e 8 GB di memoria libera.',
    },
    qwen3: {
      titolo: 'Qwen 2.5 — 3 miliardi',
      nota:
        'Per una macchina senza scheda video o con poca memoria: risponde in metà tempo e ' +
        'sbaglia più spesso l’attrezzo. Circa 2 GB sul disco.',
    },
    qwenVl: {
      titolo: 'Qwen 2.5 VL — 7 miliardi, vede',
      nota:
        'Legge le pagine scansionate, compresa la scrittura a mano di un foglio firmato. ' +
        'Vuole anche il suo proiettore, che il registro scarica insieme. Circa 6 GB in tutto.',
    },
    smolVlm: {
      titolo: 'SmolVLM — mezzo miliardo, vede',
      nota:
        'Minuscolo e velocissimo: legge il testo stampato di una scansione pulita e fatica ' +
        'con la scrittura a mano. Meno di 1 GB, gira su qualunque macchina.',
    },
  } satisfies Record<string, Consigliato>,
  hfNonRisponde: 'Hugging Face non risponde: controlla la connessione.',
  hfRisponde: (stato: number) => `Hugging Face risponde ${stato}.`,

  // ------------------------------------------------------------ kit.ts
  silenzioDopo: (titolo: string, secondi: number) =>
    `Non riesco a scaricare ${titolo}: da ${secondi} secondi non arriva più niente. ` +
    'Riprova quando la connessione torna: quel che è già sceso non si riscarica.',
  silenzio: (titolo: string, secondi: number) =>
    `Non riesco a scaricare ${titolo}: il sito non risponde entro ${secondi} secondi.`,
  connessione: (titolo: string) => `Non riesco a scaricare ${titolo}: controlla la connessione.`,
  sitoRisponde: (titolo: string, stato: number) =>
    `Non riesco a scaricare ${titolo}: il sito risponde ${stato}.`,
  impronta: (titolo: string) =>
    `Quel che è arrivato non è ${titolo}: l’impronta non corrisponde a quella ` +
    'attesa, e non lo tengo. Riprova, e se succede di nuovo scaricalo a mano.',
  nonDentro: (archivio: string, arrivo: string) => `dentro «${archivio}» non c’è «${arrivo}»`,
  nonEstratto: (titolo: string, motivo: string) =>
    `Non riesco a tirare fuori ${titolo} da quel che ho scaricato: ` +
    `${motivo}.`,
}

export const testi = catalogo(it, {
  de: {
    nonLeggibile: 'Das ist keine Datei, die sich lesen lässt.',
    nonFile: (nome) => `«${nome}» ist keine Datei.`,
    nonGguf: (nome) => `«${nome}» ist keine .gguf-Datei: Modelle haben diese Endung.`,
    finto: (nome) => `«${nome}» heisst .gguf, ist aber keine: Darin ist kein Modell.`,
    nonScaricato: (nome) => `«${nome}» ist nicht unter den heruntergeladenen Modellen.`,
    staArrivando: (nome) => `«${nome}» wird noch heruntergeladen: Halte das zuerst an.`,
    fermato: 'Herunterladen angehalten.',
    nonModello: (nome) =>
      `«${nome}» ist angekommen, ist aber kein Modell: Darin ist kein GGUF. ` +
      'Ich habe es gelöscht. Prüf die Adresse, und wenn du hinter einem Proxy bist, der ' +
      'Downloads filtert, hol die Datei von Hand und zieh sie hierher.',
    fuoriCartella: (nome) =>
      `«${nome}» gilt als heruntergeladen, ist aber nicht im Modellordner.`,
    consigliati: {
      qwen7: {
        titolo: 'Qwen 2.5 — 7 Milliarden',
        nota:
          'Die Standardwahl für den Assistenten: ruft die Werkzeuge präzise auf und antwortet ' +
          'auf Deutsch. Braucht etwa 5 GB auf der Festplatte und 8 GB freien Arbeitsspeicher.',
      },
      qwen3: {
        titolo: 'Qwen 2.5 — 3 Milliarden',
        nota:
          'Für einen Computer ohne Grafikkarte oder mit wenig Speicher: antwortet in der ' +
          'halben Zeit und wählt öfter das falsche Werkzeug. Etwa 2 GB auf der Festplatte.',
      },
      qwenVl: {
        titolo: 'Qwen 2.5 VL — 7 Milliarden, sieht',
        nota:
          'Liest gescannte Seiten, auch die Handschrift auf einem unterschriebenen Blatt. ' +
          'Braucht auch seinen Projektor, den das Klassenbuch gleich mit herunterlädt. ' +
          'Insgesamt etwa 6 GB.',
      },
      smolVlm: {
        titolo: 'SmolVLM — eine halbe Milliarde, sieht',
        nota:
          'Winzig und sehr schnell: liest den gedruckten Text eines sauberen Scans und tut ' +
          'sich schwer mit Handschrift. Unter 1 GB, läuft auf jedem Computer.',
      },
    },
    hfNonRisponde: 'Hugging Face antwortet nicht: Prüf die Verbindung.',
    hfRisponde: (stato) => `Hugging Face antwortet mit ${stato}.`,
    silenzioDopo: (titolo, secondi) =>
      `Herunterladen nicht möglich (${titolo}): Seit ${secondi} Sekunden kommt nichts mehr ` +
      'an. Versuch es erneut, wenn die Verbindung zurück ist: Was schon angekommen ist, wird ' +
      'nicht noch einmal heruntergeladen.',
    silenzio: (titolo, secondi) =>
      `Herunterladen nicht möglich (${titolo}): Die Website antwortet nicht innerhalb von ` +
      `${secondi} Sekunden.`,
    connessione: (titolo) => `Herunterladen nicht möglich (${titolo}): Prüf die Verbindung.`,
    sitoRisponde: (titolo, stato) =>
      `Herunterladen nicht möglich (${titolo}): Die Website antwortet mit ${stato}.`,
    impronta: (titolo) =>
      `Was angekommen ist, ist nicht ${titolo}: Die Prüfsumme stimmt nicht mit der ` +
      'erwarteten überein, und ich behalte es nicht. Versuch es erneut, und wenn es wieder ' +
      'passiert, lade es von Hand herunter.',
    nonDentro: (archivio, arrivo) => `in «${archivio}» ist kein «${arrivo}»`,
    nonEstratto: (titolo, motivo) =>
      `Entpacken nicht möglich (${titolo}): ${motivo}.`,
  },
  fr: {
    nonLeggibile: 'Ce n’est pas un fichier qu’on puisse lire.',
    nonFile: (nome) => `« ${nome} » n’est pas un fichier.`,
    nonGguf: (nome) => `« ${nome} » n’est pas un fichier .gguf : les modèles ont cette extension.`,
    finto: (nome) =>
      `« ${nome} » s’appelle .gguf mais n’en est pas un : il n’y a pas de modèle dedans.`,
    nonScaricato: (nome) => `« ${nome} » ne fait pas partie des modèles téléchargés.`,
    staArrivando: (nome) =>
      `« ${nome} » est encore en train d’arriver : il faut d’abord l’arrêter.`,
    fermato: 'Téléchargement arrêté.',
    nonModello: (nome) =>
      `« ${nome} » est arrivé mais ce n’est pas un modèle : il n’y a pas de GGUF dedans. ` +
      'Je l’ai supprimé. Vérifie l’adresse, et si tu es derrière un proxy qui filtre les ' +
      'téléchargements, prends le fichier à la main et glisse-le ici.',
    fuoriCartella: (nome) =>
      `« ${nome} » est indiqué comme téléchargé mais n’est pas dans le dossier des modèles.`,
    consigliati: {
      qwen7: {
        titolo: 'Qwen 2.5 — 7 milliards',
        nota:
          'Le choix de référence pour l’assistant : il appelle les outils avec précision et ' +
          'répond en français. Il lui faut environ 5 Go sur le disque et 8 Go de mémoire libre.',
      },
      qwen3: {
        titolo: 'Qwen 2.5 — 3 milliards',
        nota:
          'Pour une machine sans carte graphique ou avec peu de mémoire : il répond deux fois ' +
          'plus vite et se trompe plus souvent d’outil. Environ 2 Go sur le disque.',
      },
      qwenVl: {
        titolo: 'Qwen 2.5 VL — 7 milliards, voit',
        nota:
          'Lit les pages numérisées, y compris l’écriture à la main d’une feuille signée. Il ' +
          'lui faut aussi son projecteur, que le registre télécharge en même temps. Environ ' +
          '6 Go en tout.',
      },
      smolVlm: {
        titolo: 'SmolVLM — un demi-milliard, voit',
        nota:
          'Minuscule et très rapide : il lit le texte imprimé d’un scan propre et ' +
          'peine avec l’écriture à la main. Moins de 1 Go, tourne sur n’importe quelle machine.',
      },
    },
    hfNonRisponde: 'Hugging Face ne répond pas : vérifie la connexion.',
    hfRisponde: (stato) => `Hugging Face répond ${stato}.`,
    silenzioDopo: (titolo, secondi) =>
      `Je n’arrive pas à télécharger ${titolo} : depuis ${secondi} secondes, plus rien ` +
      'n’arrive. Réessaie quand la connexion revient : ce qui est déjà descendu ne se ' +
      'retélécharge pas.',
    silenzio: (titolo, secondi) =>
      `Je n’arrive pas à télécharger ${titolo} : le site ne répond pas en ${secondi} secondes.`,
    connessione: (titolo) => `Je n’arrive pas à télécharger ${titolo} : vérifie la connexion.`,
    sitoRisponde: (titolo, stato) =>
      `Je n’arrive pas à télécharger ${titolo} : le site répond ${stato}.`,
    impronta: (titolo) =>
      `Ce qui est arrivé n’est pas ${titolo} : l’empreinte ne correspond pas à celle ` +
      'attendue, et je ne le garde pas. Réessaie, et si cela se reproduit, télécharge-le à ' +
      'la main.',
    nonDentro: (archivio, arrivo) => `dans « ${archivio} », il n’y a pas « ${arrivo} »`,
    nonEstratto: (titolo, motivo) =>
      `Je n’arrive pas à extraire ${titolo} de ce que j’ai téléchargé : ${motivo}.`,
  },
  en: {
    nonLeggibile: 'It is not a file that can be read.',
    nonFile: (nome) => `“${nome}” is not a file.`,
    nonGguf: (nome) => `“${nome}” is not a .gguf file: models have this extension.`,
    finto: (nome) => `“${nome}” is called .gguf but is not one: there is no model inside.`,
    nonScaricato: (nome) => `“${nome}” is not among the downloaded models.`,
    staArrivando: (nome) => `“${nome}” is still downloading: stop it first.`,
    fermato: 'Download stopped.',
    nonModello: (nome) =>
      `“${nome}” arrived but is not a model: there is no GGUF inside. ` +
      'I have deleted it. Check the address, and if you are behind a proxy that filters ' +
      'downloads, get the file by hand and drag it here.',
    fuoriCartella: (nome) =>
      `“${nome}” shows as downloaded but is not in the models folder.`,
    consigliati: {
      qwen7: {
        titolo: 'Qwen 2.5 — 7 billion',
        nota:
          'The reference choice for the assistant: calls the tools precisely and answers in ' +
          'English. Needs about 5 GB of disk space and 8 GB of free memory.',
      },
      qwen3: {
        titolo: 'Qwen 2.5 — 3 billion',
        nota:
          'For a computer without a graphics card or with little memory: answers in half the ' +
          'time and picks the wrong tool more often. About 2 GB of disk space.',
      },
      qwenVl: {
        titolo: 'Qwen 2.5 VL — 7 billion, with vision',
        nota:
          'Reads scanned pages, including the handwriting on a signed sheet. Also needs its ' +
          'projector, which the register downloads alongside it. About 6 GB in all.',
      },
      smolVlm: {
        titolo: 'SmolVLM — half a billion, with vision',
        nota:
          'Tiny and very fast: reads the printed text of a clean scan and struggles with ' +
          'handwriting. Under 1 GB, runs on any computer.',
      },
    },
    hfNonRisponde: 'Hugging Face is not responding: check the connection.',
    hfRisponde: (stato) => `Hugging Face replies ${stato}.`,
    silenzioDopo: (titolo, secondi) =>
      `I can’t download ${titolo}: nothing has arrived for ${secondi} seconds. Try again ` +
      'when the connection is back: what has already come down won’t be downloaded again.',
    silenzio: (titolo, secondi) =>
      `I can’t download ${titolo}: the site does not respond within ${secondi} seconds.`,
    connessione: (titolo) => `I can’t download ${titolo}: check the connection.`,
    sitoRisponde: (titolo, stato) => `I can’t download ${titolo}: the site replies ${stato}.`,
    impronta: (titolo) =>
      `What arrived is not ${titolo}: the checksum does not match the expected one, and ` +
      'I am not keeping it. Try again, and if it happens again, download it by hand.',
    nonDentro: (archivio, arrivo) => `“${arrivo}” is not inside “${archivio}”`,
    nonEstratto: (titolo, motivo) =>
      `I can’t extract ${titolo} from what I downloaded: ${motivo}.`,
  },
})
