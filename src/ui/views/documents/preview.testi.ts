// I testi dell'anteprima della pagina Documenti (`preview.ts`).

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

const it = {
  fuoriElenco: 'Questo documento non è fra quelli della scheda aperta',
  del: (giorno: string) => `del ${giorno}`,
  conto: (quale: number, quanti: number) => `${quale} di ${quanti}`,
  rifaQui: (nome: string) => `Rifà ${nome} e rimette il foglio qui`,
  buttaDallaCartella: (nome: string) => `Butta via ${nome} dalla cartella`,
  apreSistema: 'Apre questo foglio nel programma del sistema',
  finestraSua: 'Apre questo documento in una finestra sua',
  tornaDocumenti: 'Torna ai documenti',
  daGuardare: (quanti: number) =>
    `${plurale(quanti, 'documento', 'documenti')} da guardare in ` +
    'questa scheda: premi la lente accanto a uno, o comincia dal primo e scorrili con le frecce.',
  premiLente: 'Premi la lente accanto a un documento per guardarlo qui, senza uscire dal registro.',
  guardaPrimo: 'Guarda il primo',
}

export const testi = catalogo(it, {
  de: {
    fuoriElenco: 'Dieses Dokument gehört nicht zum offenen Reiter',
    del: (giorno) => `vom ${giorno}`,
    conto: (quale, quanti) => `${quale} von ${quanti}`,
    rifaQui: (nome) => `Erstellt ${nome} neu und zeigt das Blatt wieder hier`,
    buttaDallaCartella: (nome) => `Wirft ${nome} aus dem Ordner`,
    apreSistema: 'Öffnet dieses Blatt im Programm des Systems',
    finestraSua: 'Öffnet dieses Dokument in einem eigenen Fenster',
    tornaDocumenti: 'Zurück zu den Dokumenten',
    daGuardare: (quanti) =>
      `${plurale(quanti, 'Dokument', 'Dokumente')} zum Ansehen in diesem Reiter: Klicke auf die ` +
      'Lupe neben einem, oder beginne beim ersten und blättere mit den Pfeilen weiter.',
    premiLente:
      'Klicke auf die Lupe neben einem Dokument, um es hier anzusehen, ohne das Klassenbuch zu ' +
      'verlassen.',
    guardaPrimo: 'Das erste ansehen',
  },
  fr: {
    fuoriElenco: 'Ce document ne fait pas partie de la rubrique ouverte',
    del: (giorno) => `du ${giorno}`,
    conto: (quale, quanti) => `${quale} sur ${quanti}`,
    rifaQui: (nome) => `Refait ${nome} et remet la feuille ici`,
    buttaDallaCartella: (nome) => `Jette ${nome} hors du dossier`,
    apreSistema: 'Ouvre cette feuille dans le programme du système',
    finestraSua: 'Ouvre ce document dans sa propre fenêtre',
    tornaDocumenti: 'Retour aux documents',
    daGuardare: (quanti) =>
      `${plurale(quanti, 'document', 'documents')} à regarder dans cette rubrique : clique sur ` +
      'la loupe à côté de l’un d’eux, ou commence par le premier et fais-les défiler avec les ' +
      'flèches.',
    premiLente:
      'Clique sur la loupe à côté d’un document pour le regarder ici, sans quitter le registre.',
    guardaPrimo: 'Regarder le premier',
  },
  en: {
    fuoriElenco: 'This document isn’t among those in the open section',
    del: (giorno) => `from ${giorno}`,
    conto: (quale, quanti) => `${quale} of ${quanti}`,
    rifaQui: (nome) => `Remakes ${nome} and puts the sheet back here`,
    buttaDallaCartella: (nome) => `Throws ${nome} out of the folder`,
    apreSistema: 'Opens this sheet in the system’s program',
    finestraSua: 'Opens this document in its own window',
    tornaDocumenti: 'Back to the documents',
    daGuardare: (quanti) =>
      `${plurale(quanti, 'document', 'documents')} to view in this section: click the ` +
      'magnifier next to one, or start from the first and step through with the arrows.',
    premiLente:
      'Click the magnifier next to a document to view it here, without leaving the register.',
    guardaPrimo: 'View the first',
  },
})
