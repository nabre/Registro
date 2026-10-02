// I testi di `substitute.ts`: il pacchetto per chi tiene le mie ore.

import { catalogo } from '#core/i18n/index.js'

const it = {
  /** Davanti alla data, nel nome dello zip. */
  supplenza: 'Supplenza',
  allieviDi: (classe: string) => `Allievi ${classe}`,
  pianoDellaLezione: 'Piano della lezione',
  cartellaRisorse: 'risorse',
  leggimi: 'Leggimi',
  titolo: (docente: string) => (docente ? `Supplenza per ${docente}` : 'Supplenza'),
  per: (supplente: string) => `Per: ${supplente}`,
  introduzione: (ore: number) =>
    `${ore === 1 ? 'L’ora da tenere è descritta' : 'Le ore da tenere sono descritte'} qui sotto. ` +
    'Per ogni ora: una cartella con il piano della lezione in PDF e i file delle risorse; ' +
    'alla radice, per ogni classe, l’elenco degli allievi con le foto.',
  elenco: 'Allievi',
  piano: 'Piano',
  senzaPiano: 'Nessun piano preparato per quest’ora.',
  obiettivi: 'Obiettivi',
  prerequisiti: 'Prerequisiti',
  scaletta: 'Scaletta',
  materiali: 'Materiali',
  risorse: 'Risorse del piano',
  oggetto: (giorni: string, classi: string) => `Supplenza ${giorni}${classi ? ` — ${classi}` : ''}`,
  saluto: 'Buongiorno,',
  salutoA: (nome: string) => `Buongiorno ${nome},`,
  salutoSegretariato: 'Buongiorno,',
  corpoSupplente: 'grazie di tenere le mie ore. Eccole:',
  corpoSegretariato: (supplente: string) =>
    supplente
      ? `vi mando il materiale per la supplenza, da girare a ${supplente}. Le ore sono queste:`
      : 'vi mando il materiale per la supplenza, da girare a chi la terrà. Le ore sono queste:',
  nelloZip:
    'Nello zip allegato ci sono l’elenco degli allievi con le foto, il piano dettagliato di ogni ' +
    'ora e le risorse da usare. Il file «Leggimi» dice da dove cominciare.',
  grazie: 'Grazie e buon lavoro,',
}

export const testi = catalogo(it, {
  de: {
    supplenza: 'Stellvertretung',
    allieviDi: (classe) => `Schülerinnen und Schüler ${classe}`,
    pianoDellaLezione: 'Lektionsplan',
    cartellaRisorse: 'materialien',
    leggimi: 'Lies mich',
    titolo: (docente) => (docente ? `Stellvertretung für ${docente}` : 'Stellvertretung'),
    per: (supplente) => `Für: ${supplente}`,
    introduzione: (ore) =>
      `${ore === 1 ? 'Die zu haltende Lektion ist' : 'Die zu haltenden Lektionen sind'} unten beschrieben. ` +
      'Für jede Lektion: ein Ordner mit dem Lektionsplan als PDF und den Dateien der Materialien; ' +
      'im obersten Ordner für jede Klasse die Liste der Schülerinnen und Schüler mit Fotos.',
    elenco: 'Schülerinnen und Schüler',
    piano: 'Plan',
    senzaPiano: 'Für diese Lektion ist kein Plan vorbereitet.',
    obiettivi: 'Ziele',
    prerequisiti: 'Voraussetzungen',
    scaletta: 'Ablauf',
    materiali: 'Material',
    risorse: 'Materialien des Plans',
    oggetto: (giorni, classi) => `Stellvertretung ${giorni}${classi ? ` — ${classi}` : ''}`,
    saluto: 'Guten Tag',
    salutoA: (nome) => `Guten Tag ${nome}`,
    salutoSegretariato: 'Guten Tag',
    corpoSupplente: 'Danke, dass du meine Lektionen übernimmst. Es sind diese:',
    corpoSegretariato: (supplente) =>
      supplente
        ? `Anbei das Material für die Stellvertretung, bitte an ${supplente} weiterleiten. Die Lektionen sind diese:`
        : 'Anbei das Material für die Stellvertretung, bitte an die vertretende Person weiterleiten. ' +
          'Die Lektionen sind diese:',
    nelloZip:
      'Im angehängten ZIP sind die Liste der Schülerinnen und Schüler mit Fotos, der ausführliche ' +
      'Plan jeder Lektion und die Materialien. Die Datei «Lies mich» sagt, wo man anfängt.',
    grazie: 'Danke und gutes Gelingen',
  },
  fr: {
    supplenza: 'Suppléance',
    allieviDi: (classe) => `Élèves ${classe}`,
    pianoDellaLezione: 'Plan de la leçon',
    cartellaRisorse: 'ressources',
    leggimi: 'Lisez-moi',
    titolo: (docente) => (docente ? `Suppléance pour ${docente}` : 'Suppléance'),
    per: (supplente) => `Pour : ${supplente}`,
    introduzione: (ore) =>
      `${ore === 1 ? 'L’heure à donner est décrite' : 'Les heures à donner sont décrites'} ci-dessous. ` +
      'Pour chaque heure : un dossier avec le plan de la leçon en PDF et les fichiers des ressources ; ' +
      'à la racine, pour chaque classe, la liste des élèves avec les photos.',
    elenco: 'Élèves',
    piano: 'Plan',
    senzaPiano: 'Aucun plan préparé pour cette heure.',
    obiettivi: 'Objectifs',
    prerequisiti: 'Prérequis',
    scaletta: 'Déroulement',
    materiali: 'Matériel',
    risorse: 'Ressources du plan',
    oggetto: (giorni, classi) => `Suppléance ${giorni}${classi ? ` — ${classi}` : ''}`,
    saluto: 'Bonjour,',
    salutoA: (nome) => `Bonjour ${nome},`,
    salutoSegretariato: 'Bonjour,',
    corpoSupplente: 'merci de donner mes heures. Les voici :',
    corpoSegretariato: (supplente) =>
      supplente
        ? `je vous envoie le matériel pour la suppléance, à transmettre à ${supplente}. Les heures sont :`
        : 'je vous envoie le matériel pour la suppléance, à transmettre à qui la fera. Les heures sont :',
    nelloZip:
      'Le zip joint contient la liste des élèves avec les photos, le plan détaillé de chaque heure ' +
      'et les ressources à utiliser. Le fichier « Lisez-moi » dit par où commencer.',
    grazie: 'Merci et bon travail,',
  },
  en: {
    supplenza: 'Cover',
    allieviDi: (classe) => `Students ${classe}`,
    pianoDellaLezione: 'Lesson plan',
    cartellaRisorse: 'resources',
    leggimi: 'Read me',
    titolo: (docente) => (docente ? `Cover for ${docente}` : 'Cover'),
    per: (supplente) => `For: ${supplente}`,
    introduzione: (ore) =>
      `${ore === 1 ? 'The lesson to teach is' : 'The lessons to teach are'} described below. ` +
      'For each lesson: a folder with the lesson plan as a PDF and the resource files; ' +
      'at the top level, for each class, the student list with photos.',
    elenco: 'Students',
    piano: 'Plan',
    senzaPiano: 'No plan prepared for this lesson.',
    obiettivi: 'Objectives',
    prerequisiti: 'Prerequisites',
    scaletta: 'Outline',
    materiali: 'Materials',
    risorse: 'Plan resources',
    oggetto: (giorni, classi) => `Cover ${giorni}${classi ? ` — ${classi}` : ''}`,
    saluto: 'Hello,',
    salutoA: (nome) => `Hello ${nome},`,
    salutoSegretariato: 'Hello,',
    corpoSupplente: 'thank you for covering my lessons. Here they are:',
    corpoSegretariato: (supplente) =>
      supplente
        ? `here is the material for the cover, to pass on to ${supplente}. The lessons are:`
        : 'here is the material for the cover, to pass on to whoever teaches it. The lessons are:',
    nelloZip:
      'The attached zip holds the student list with photos, the detailed plan of each lesson ' +
      'and the resources to use. The “Read me” file says where to start.',
    grazie: 'Thanks and all the best,',
  },
})
