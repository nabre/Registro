// I testi di `forms/assignment.ts`: il modulo di una consegna — che cosa, a
// chi, con quale documento, entro quando.

import { catalogo } from '../../i18n/index.js'
import { PIF, accorda, ai, i } from '../../domain/lexicon.js'

const it = {
  serveCorso: 'Serve prima un corso a cui agganciare la consegna.',
  titoloModifica: 'Modifica la consegna',
  titoloNuova: 'Nuova consegna',
  aggiornata: 'Consegna aggiornata.',
  assegnata: 'Consegna assegnata.',
  eliminare: 'Eliminare la consegna?',
  sparisconoSpunte: 'Spariscono anche le spunte di chi l’aveva già fatta.',
  eliminata: 'Consegna eliminata.',
  segnapostoTesto: 'esercizi 4–7 pagina 132',
  aChiTocca: 'A chi tocca',
  destinatari: {
    classe: 'Tutta la classe',
    allievi: `Solo ${accorda(PIF, 'alcuno', true)} ${PIF.plurale}`,
    docente: 'A me',
  },
  aiutoDestinatari:
    'La spunta resta individuale: si vede chi ha fatto e chi manca.',
  raccoglie: 'Si spunta consegnando un documento',
  aiutoRaccoglie:
    'Ognuno allega il suo file, e si vede a matrice chi non l’ha ancora portato.',
  cheDocumento: 'Che documento',
  chiLoPorta: 'Chi lo porta',
  versi: {
    ricevo: `Me lo consegnano ${i(PIF)}`,
    consegno: `Lo consegno io ${ai(PIF)}`,
  },
  aiutoVerso: 'Consegnando, la spunta dice che gliel’hai dato.',
  comeLoConsegno: 'Come lo consegno',
  modi: {
    mano: 'A mano, in classe',
    email: 'Per e-mail, uno a uno',
  },
  aiutoModo:
    'Vale consegnando: per e-mail parte un messaggio a testa con il documento ' +
    'allegato, e l’invio stesso fa da prova.',
  firme: 'Serve il foglio delle firme di consegna',
  aiutoFirme: 'Uno solo per tutta la richiesta, da allegare sotto la matrice.',
  nessunaPif: `La classe non ha ${PIF.plurale} che frequentano.`,
  entroQuando: 'Entro quando',
  ilTermineE: 'Il termine è',
  modiScadenza: {
    lezione: 'Una lezione del corso',
    data: 'Un giorno preciso',
    nessuno: 'Nessun termine',
  },
  aiutoTermine:
    'Legandolo a una lezione, spostando quella lezione si sposta anche il termine.',
  perLaLezioneDel: 'Per la lezione del',
  altraMateria: 'altra materia',
  nessunaLezioneFutura: 'nessuna lezione futura',
  entroIl: 'Entro il',
}

export const testi = catalogo(it, {
  de: {
    serveCorso:
      'Zuerst braucht es einen Kurs, dem der Auftrag zugeordnet werden kann.',
    titoloModifica: 'Auftrag bearbeiten',
    titoloNuova: 'Neuer Auftrag',
    aggiornata: 'Auftrag aktualisiert.',
    assegnata: 'Auftrag erteilt.',
    eliminare: 'Auftrag löschen?',
    sparisconoSpunte:
      'Auch die Häkchen derer, die ihn schon erledigt haben, verschwinden.',
    eliminata: 'Auftrag gelöscht.',
    segnapostoTesto: 'Übungen 4–7, Seite 132',
    aChiTocca: 'Für wen',
    destinatari: {
      classe: 'Die ganze Klasse',
      allievi: 'Nur einzelne Lernende',
      docente: 'Für mich',
    },
    aiutoDestinatari:
      'Abgehakt wird einzeln: Man sieht, wer ihn erledigt hat und wer noch fehlt.',
    raccoglie: 'Abgehakt wird mit der Abgabe eines Dokuments',
    aiutoRaccoglie:
      'Alle hängen ihre eigene Datei an, und in der Matrix sieht man, wer sie noch nicht ' +
      'gebracht hat.',
    cheDocumento: 'Welches Dokument',
    chiLoPorta: 'Wer es bringt',
    versi: {
      ricevo: 'Die Lernenden geben es mir ab',
      consegno: 'Ich händige es den Lernenden aus',
    },
    aiutoVerso:
      'Beim Aushändigen zeigt das Häkchen, dass du es übergeben hast.',
    comeLoConsegno: 'Wie ich es aushändige',
    modi: {
      mano: 'Persönlich, in der Klasse',
      email: 'Per E-Mail, einzeln',
    },
    aiutoModo:
      'Gilt beim Aushändigen: Per E-Mail geht an alle eine eigene Nachricht mit dem Dokument ' +
      'im Anhang, und der Versand selbst gilt als Nachweis.',
    firme: 'Unterschriftenblatt für die Übergabe nötig',
    aiutoFirme:
      'Ein einziges für die ganze Anfrage, unter der Matrix anzuhängen.',
    nessunaPif: 'Die Klasse hat keine Lernenden, die sie derzeit besuchen.',
    entroQuando: 'Bis wann',
    ilTermineE: 'Die Frist ist',
    modiScadenza: {
      lezione: 'Eine Stunde des Kurses',
      data: 'Ein bestimmter Tag',
      nessuno: 'Keine Frist',
    },
    aiutoTermine:
      'Ist die Frist an eine Stunde gebunden, verschiebt sie sich mit ihr.',
    perLaLezioneDel: 'Für die Stunde vom',
    altraMateria: 'anderes Fach',
    nessunaLezioneFutura: 'keine künftige Stunde',
    entroIl: 'Bis am',
  },
  fr: {
    serveCorso: 'Il faut d’abord un cours auquel rattacher le devoir.',
    titoloModifica: 'Modifier le devoir',
    titoloNuova: 'Nouveau devoir',
    aggiornata: 'Devoir mis à jour.',
    assegnata: 'Devoir donné.',
    eliminare: 'Supprimer le devoir ?',
    sparisconoSpunte:
      'Les coches de ceux qui l’avaient déjà fait disparaissent aussi.',
    eliminata: 'Devoir supprimé.',
    segnapostoTesto: 'exercices 4 à 7, page 132',
    aChiTocca: 'Pour qui',
    destinatari: {
      classe: 'Toute la classe',
      allievi: 'Seulement certaines personnes en formation',
      docente: 'Pour moi',
    },
    aiutoDestinatari:
      'La coche reste individuelle : on voit qui l’a fait et qui manque.',
    raccoglie: 'Se coche en remettant un document',
    aiutoRaccoglie:
      'Chacun joint son fichier, et la matrice montre qui ne l’a pas encore apporté.',
    cheDocumento: 'Quel document',
    chiLoPorta: 'Qui l’apporte',
    versi: {
      ricevo: 'Les personnes en formation me le remettent',
      consegno: 'Je le remets aux personnes en formation',
    },
    aiutoVerso:
      'Quand c’est toi qui remets, la coche indique que tu l’as donné.',
    comeLoConsegno: 'Comment je le remets',
    modi: {
      mano: 'En main propre, en classe',
      email: 'Par e-mail, un par un',
    },
    aiutoModo:
      'Vaut quand c’est toi qui remets : par e-mail, chacun reçoit son propre message avec le ' +
      'document joint, et l’envoi lui-même fait foi.',
    firme: 'Il faut la feuille des signatures de remise',
    aiutoFirme: 'Une seule pour toute la demande, à joindre sous la matrice.',
    nessunaPif:
      'La classe n’a pas de personnes en formation qui la fréquentent.',
    entroQuando: 'Pour quand',
    ilTermineE: 'L’échéance est',
    modiScadenza: {
      lezione: 'Une leçon du cours',
      data: 'Un jour précis',
      nessuno: 'Pas d’échéance',
    },
    aiutoTermine:
      'Liée à une leçon, l’échéance se déplace quand on déplace cette leçon.',
    perLaLezioneDel: 'Pour la leçon du',
    altraMateria: 'autre branche',
    nessunaLezioneFutura: 'aucune leçon à venir',
    entroIl: 'Pour le',
  },
  en: {
    serveCorso: 'You need a course first to attach the assignment to.',
    titoloModifica: 'Edit assignment',
    titoloNuova: 'New assignment',
    aggiornata: 'Assignment updated.',
    assegnata: 'Assignment set.',
    eliminare: 'Delete the assignment?',
    sparisconoSpunte: 'The ticks of anyone who had already done it go too.',
    eliminata: 'Assignment deleted.',
    segnapostoTesto: 'exercises 4–7, page 132',
    aChiTocca: 'Who it’s for',
    destinatari: {
      classe: 'The whole class',
      allievi: 'Only some learners',
      docente: 'Me',
    },
    aiutoDestinatari:
      'Ticks stay individual: you can see who has done it and who hasn’t.',
    raccoglie: 'Ticked off by handing in a document',
    aiutoRaccoglie:
      'Everyone attaches their own file, and the grid shows who hasn’t brought it yet.',
    cheDocumento: 'Which document',
    chiLoPorta: 'Who brings it',
    versi: {
      ricevo: 'The learners hand it in to me',
      consegno: 'I hand it out to the learners',
    },
    aiutoVerso: 'When you hand it out, the tick means you’ve given it to them.',
    comeLoConsegno: 'How I hand it out',
    modi: {
      mano: 'By hand, in class',
      email: 'By email, one by one',
    },
    aiutoModo:
      'Applies when you hand out: by email, each person gets their own message with the ' +
      'document attached, and the sending itself counts as proof.',
    firme: 'A signed hand-over sheet is needed',
    aiutoFirme: 'Just one for the whole request, to attach below the grid.',
    nessunaPif: 'The class has no learners attending.',
    entroQuando: 'By when',
    ilTermineE: 'The deadline is',
    modiScadenza: {
      lezione: 'A lesson of the course',
      data: 'A specific day',
      nessuno: 'No deadline',
    },
    aiutoTermine:
      'Tied to a lesson, the deadline moves whenever that lesson moves.',
    perLaLezioneDel: 'For the lesson on',
    altraMateria: 'other subject',
    nessunaLezioneFutura: 'no upcoming lessons',
    entroIl: 'By',
  },
})
