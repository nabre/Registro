// I testi delle procedure di `risorse`. Si leggono al momento dell'uso, mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  aggiungi: {
    titolo:
      'Appende una risorsa al piano o a una sua tappa: un collegamento, un file, un’immagine',
    attivitaId: 'La tappa a cui appenderla; null vuol dire «del piano intero»',
    genere: 'Un collegamento resta un indirizzo; un file e un’immagine si scelgono da disco',
    url: 'Solo per «collegamento»',
  },
  apri: {
    titolo: 'Apre la risorsa: il collegamento nel browser, il file col programma di sistema',
  },
  elimina: {
    titolo: 'Toglie una risorsa dal piano, e il suo file dalla cartella',
  },
  salva: {
    titolo: 'Riscrive titolo e note di una risorsa; il file non si tocca da qui',
    attivitaId: 'null: la risorsa è del piano intero',
  },
  sposta: {
    titolo: 'La risorsa passa a un’altra tappa, o al piano nel suo insieme',
    daAttivitaId: 'Dov’è adesso; null: nel piano',
    aAttivitaId: 'Dove va; null: nel piano',
  },
}

export const testi = catalogo(it, {
  de: {
    aggiungi: {
      titolo:
        'Hängt eine Ressource an den Plan oder an eine seiner Etappen: einen Link, eine Datei, ' +
        'ein Bild',
      attivitaId: 'Die Etappe, an die sie gehängt wird; null heisst «zum ganzen Plan»',
      genere:
        'Ein Link bleibt eine Adresse; eine Datei und ein Bild werden auf der Festplatte ' +
        'ausgewählt',
      url: 'Nur für «collegamento»',
    },
    apri: {
      titolo: 'Öffnet die Ressource: den Link im Browser, die Datei mit dem Programm des Systems',
    },
    elimina: {
      titolo: 'Entfernt eine Ressource aus dem Plan und ihre Datei aus dem Ordner',
    },
    salva: {
      titolo:
        'Schreibt Titel und Notizen einer Ressource neu; die Datei wird von hier aus nicht berührt',
      attivitaId: 'null: Die Ressource gehört zum ganzen Plan',
    },
    sposta: {
      titolo: 'Die Ressource wechselt zu einer anderen Etappe oder zum Plan als Ganzes',
      daAttivitaId: 'Wo sie jetzt ist; null: im Plan',
      aAttivitaId: 'Wohin sie kommt; null: in den Plan',
    },
  },
  fr: {
    aggiungi: {
      titolo:
        'Ajoute une ressource au plan ou à l’une de ses étapes : un lien, un fichier, une image',
      attivitaId: 'L’étape à laquelle l’accrocher ; null veut dire « du plan entier »',
      genere:
        'Un lien reste une adresse ; un fichier et une image se choisissent sur le disque',
      url: 'Seulement pour « collegamento »',
    },
    apri: {
      titolo:
        'Ouvre la ressource : le lien dans le navigateur, le fichier avec le programme du système',
    },
    elimina: {
      titolo: 'Retire une ressource du plan, et son fichier du dossier',
    },
    salva: {
      titolo:
        'Réécrit le titre et les notes d’une ressource ; le fichier ne se touche pas d’ici',
      attivitaId: 'null : la ressource appartient au plan entier',
    },
    sposta: {
      titolo: 'La ressource passe à une autre étape, ou au plan dans son ensemble',
      daAttivitaId: 'Où elle est maintenant ; null : dans le plan',
      aAttivitaId: 'Où elle va ; null : dans le plan',
    },
  },
  en: {
    aggiungi: {
      titolo: 'Attaches a resource to the plan or to one of its steps: a link, a file, an image',
      attivitaId: 'The step to attach it to; null means “of the whole plan”',
      genere: 'A link stays an address; a file and an image are picked from disk',
      url: 'Only for “collegamento”',
    },
    apri: {
      titolo: 'Opens the resource: the link in the browser, the file with the system’s program',
    },
    elimina: {
      titolo: 'Removes a resource from the plan, and its file from the folder',
    },
    salva: {
      titolo: 'Rewrites the title and notes of a resource; the file is not touched from here',
      attivitaId: 'null: the resource belongs to the whole plan',
    },
    sposta: {
      titolo: 'The resource moves to another step, or to the plan as a whole',
      daAttivitaId: 'Where it is now; null: in the plan',
      aAttivitaId: 'Where it goes; null: in the plan',
    },
  },
})
