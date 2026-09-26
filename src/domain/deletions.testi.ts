// I testi di `deletions.ts`: il bersaglio, che cosa se ne va, che cosa resta
// staccato. Ogni voce è una riga intera della domanda, numero e accordo compresi.

import { catalogo } from '../i18n/index.js'
import { CARTE, PIF, quanti } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import { plurale } from './text.js'

const it = {
  // ------------------------------------------------ come si chiama il bersaglio
  nomeAnno: (etichetta: string) => `l’anno ${etichetta}`,
  cartellaAnno: (cartella: string) =>
    `la cartella «${cartella}» per intero, con la sua documentazione`,
  annoNonAperto: 'quel che contiene: non è l’anno aperto, e non si può contarlo da qui',
  nelCestino: 'Va nel cestino del sistema: si può ancora ripescare da lì.',
  nomeMateria: (nome: string) => `la materia «${nome}»`,
  unireMateria: 'Unirla a un’altra materia le rimette insieme senza perdere niente.',
  nomeClasse: (nome: string) => `la classe ${nome}`,
  archiviareClasse: 'Archiviarla la toglie dagli elenchi e conserva tutto lo storico.',
  nomeCorso: (titolo: string) => `il corso «${titolo}»`,
  ritiro:
    'Per un ritiro basta togliere la spunta «Frequenta»: esce dagli appelli e ' +
    'quel che ha fatto finora resta leggibile.',
  nomeLezione: (data: string) => `la lezione del ${data}`,
  nomePiano: (nome: string) => `il piano di ${nome}`,
  nomeMomento: (titolo: string) => `il momento «${titolo}»`,
  nomeConsegna: (testo: string) => `la consegna «${testo}»`,
  spuntareConsegna:
    'Spuntarla per tutti la toglie dalle cose da fare e conserva quel che è stato raccolto.',

  // ------------------------------------------------------ che cosa se ne va
  fileDelPiano: (n: number) => plurale(n, 'file allegato al piano', 'file allegati al piano'),
  presenze: (n: number) => plurale(n, 'presenza registrata', 'presenze registrate'),
  voti: (n: number) => plurale(n, 'voto', 'voti'),
  recuperi: (n: number) => plurale(n, 'recupero', 'recuperi'),
  osservazioni: (n: number) => plurale(n, 'osservazione', 'osservazioni'),
  spunteDelCheck: (n: number) => plurale(n, 'spunta del check', 'spunte del check'),
  caselle: (n: number) => plurale(n, 'casella del comportamento', 'caselle del comportamento'),
  documentiRaccolti: (n: number) => plurale(n, 'documento raccolto', 'documenti raccolti'),
  consegneSoloSue: (n: number) =>
    plurale(n, 'consegna che era solo sua', 'consegne che erano solo sue'),
  pdfInQuarantena: (n: number) => plurale(n, 'PDF in quarantena', 'PDF in quarantena'),
  suaFoto: 'la sua foto',
  fogliDiAssenze: (n: number) => plurale(n, 'foglio di assenze', 'fogli di assenze'),
  classi: (n: number, allievi: number) =>
    `${plurale(n, 'classe', 'classi')}` + (allievi > 0 ? `, con ${quanti(allievi, PIF)}` : ''),
  allievi: (n: number) => quanti(n, PIF),
  foto: (n: number) => plurale(n, 'foto', 'foto'),
  corsi: (n: number) => plurale(n, 'corso', 'corsi'),
  lezioni: (n: number) =>
    `${plurale(n, 'lezione', 'lezioni')}, con appello, osservazioni e consuntivo`,
  momenti: (n: number, voti: number) =>
    `${plurale(n, 'momento di valutazione', 'momenti di valutazione')}` +
    (voti > 0 ? `, con ${plurale(voti, 'voto', 'voti')}` : ''),
  consegne: (n: number) => plurale(n, 'consegna', 'consegne'),
  check: (n: number, spunte: number) =>
    plurale(n, CARTE.check.singolare, CARTE.check.plurale) +
    (spunte > 0 ? `, con ${plurale(spunte, 'spunta', 'spunte')}` : ''),
  fascicoloDocumenti: (n: number) => plurale(n, 'documento', 'documenti'),
  fascicoloComunicazioni: (n: number) => plurale(n, 'comunicazione', 'comunicazioni'),
  fascicoloAssenze: (periodi: number, fogli: number) =>
    `${plurale(periodi, 'periodo di assenze', 'periodi di assenze')}` +
    (fogli > 0 ? ` con ${plurale(fogli, 'foglio', 'fogli')}` : ''),
  fascicolo: (pezzi: readonly string[]) => `il fascicolo della classe: ${pezzi.join(', ')}`,
  fogliStampati: (n: number) =>
    `${plurale(n, 'foglio già stampato', 'fogli già stampati')} nella cartella`,

  // ------------------------------------------------ che cosa resta, staccato
  documentiSenzaIntestatario: (n: number) =>
    `${plurale(n, 'documento resta', 'documenti restano')} nel fascicolo, senza intestatario`,
  consegneSenzaNome: (n: number) =>
    `${plurale(n, 'consegna resta', 'consegne restano')}, senza il suo nome fra i destinatari`,
  spunteConData: (n: number) =>
    `${plurale(n, 'spunta del check resta', 'spunte del check restano')}, ` +
    'con la data al posto della lezione',
  pianiSenzaCorso: (n: number) =>
    `${plurale(n, 'piano lezione resta', 'piani lezione restano')}, senza corso`,
  consegneConData: (n: number) =>
    `${plurale(n, 'consegna resta', 'consegne restano')}, con la data al posto della lezione`,
  momentiSenzaLezione: (n: number) =>
    `${plurale(n, 'momento di valutazione resta', 'momenti di valutazione restano')}, ` +
    'senza la lezione a cui era legato',
  lezioniSenzaScaletta: (n: number) =>
    `${plurale(n, 'lezione resta', 'lezioni restano')}, ` +
    'senza scaletta e senza le spunte già messe',
}

export const testi = catalogo(it, {
  de: {
    // Ohne Artikel: der Name steht in «… löschen?».
    nomeAnno: (etichetta) => `Schuljahr ${etichetta}`,
    cartellaAnno: (cartella) => `der ganze Ordner «${cartella}», mit seiner Dokumentation`,
    annoNonAperto:
      'sein Inhalt: Es ist nicht das geöffnete Schuljahr, ' +
      'darum lässt er sich von hier aus nicht zählen',
    nelCestino: 'Es landet im Papierkorb des Systems und lässt sich von dort noch zurückholen.',
    nomeMateria: (nome) => `Fach «${nome}»`,
    unireMateria:
      'Mit einem anderen Fach zusammenführen vereint beide, ohne dass etwas verloren geht.',
    nomeClasse: (nome) => `Klasse ${nome}`,
    archiviareClasse: 'Archivieren nimmt sie aus den Listen und bewahrt den ganzen Verlauf auf.',
    nomeCorso: (titolo) => `Kurs «${titolo}»`,
    ritiro:
      'Für einen Austritt genügt es, das Häkchen «Besucht» zu entfernen: ' +
      'Die Person erscheint nicht mehr in der Präsenzkontrolle, ' +
      'und was sie bisher gemacht hat, bleibt lesbar.',
    nomeLezione: (data) => `Stunde vom ${data}`,
    nomePiano: (nome) => `Unterrichtsplan ${nome}`,
    nomeMomento: (titolo) => `Leistungsbeurteilung «${titolo}»`,
    nomeConsegna: (testo) => `Auftrag «${testo}»`,
    spuntareConsegna:
      'Für alle abhaken nimmt ihn aus den offenen Aufgaben ' +
      'und bewahrt auf, was eingesammelt wurde.',

    fileDelPiano: (n) =>
      plurale(n, 'an den Plan angehängte Datei', 'an den Plan angehängte Dateien'),
    presenze: (n) => plurale(n, 'erfasste Anwesenheit', 'erfasste Anwesenheiten'),
    voti: (n) => plurale(n, 'Note', 'Noten'),
    recuperi: (n) => plurale(n, 'Nachprüfung', 'Nachprüfungen'),
    osservazioni: (n) => plurale(n, 'Beobachtung', 'Beobachtungen'),
    spunteDelCheck: (n) => plurale(n, 'Check-Häkchen', 'Check-Häkchen'),
    caselle: (n) => plurale(n, 'Feld der Verhaltensübersicht', 'Felder der Verhaltensübersicht'),
    documentiRaccolti: (n) => plurale(n, 'eingesammeltes Dokument', 'eingesammelte Dokumente'),
    consegneSoloSue: (n) =>
      plurale(n, 'Auftrag nur für diese Person', 'Aufträge nur für diese Person'),
    pdfInQuarantena: (n) => plurale(n, 'PDF in Quarantäne', 'PDFs in Quarantäne'),
    suaFoto: 'das Foto dieser Person',
    fogliDiAssenze: (n) => plurale(n, 'Absenzenblatt', 'Absenzenblätter'),
    classi: (n, allievi) =>
      `${plurale(n, 'Klasse', 'Klassen')}` +
      (allievi > 0 ? `, mit ${plurale(allievi, 'Lernenden', 'Lernenden')}` : ''),
    allievi: (n) => quanti(n, lessico.in('de').pif),
    foto: (n) => plurale(n, 'Foto', 'Fotos'),
    corsi: (n) => plurale(n, 'Kurs', 'Kurse'),
    lezioni: (n) =>
      `${plurale(n, 'Stunde', 'Stunden')}, ` +
      'mit Präsenzkontrolle, Beobachtungen und Rückblick',
    momenti: (n, voti) =>
      `${plurale(n, 'Leistungsbeurteilung', 'Leistungsbeurteilungen')}` +
      (voti > 0 ? `, mit ${plurale(voti, 'Note', 'Noten')}` : ''),
    consegne: (n) => plurale(n, 'Auftrag', 'Aufträge'),
    check: (n, spunte) =>
      plurale(n, 'Check', 'Checks') +
      (spunte > 0 ? `, mit ${plurale(spunte, 'Häkchen', 'Häkchen')}` : ''),
    fascicoloDocumenti: (n) => plurale(n, 'Dokument', 'Dokumente'),
    fascicoloComunicazioni: (n) => plurale(n, 'Mitteilung', 'Mitteilungen'),
    fascicoloAssenze: (periodi, fogli) =>
      `${plurale(periodi, 'Absenzenzeitraum', 'Absenzenzeiträume')}` +
      (fogli > 0 ? ` mit ${plurale(fogli, 'Blatt', 'Blättern')}` : ''),
    fascicolo: (pezzi) => `das Klassendossier: ${pezzi.join(', ')}`,
    fogliStampati: (n) =>
      `${plurale(n, 'bereits gedrucktes Blatt', 'bereits gedruckte Blätter')} im Ordner`,

    documentiSenzaIntestatario: (n) =>
      `${plurale(n, 'Dokument bleibt', 'Dokumente bleiben')} im Klassendossier, ohne Zuordnung`,
    consegneSenzaNome: (n) =>
      `${plurale(n, 'Auftrag bleibt', 'Aufträge bleiben')}, ` +
      'ohne diese Person unter den Empfängern',
    spunteConData: (n) =>
      `${plurale(n, 'Check-Häkchen bleibt', 'Check-Häkchen bleiben')}, ` +
      'mit dem Datum statt der Stunde',
    pianiSenzaCorso: (n) =>
      `${plurale(n, 'Unterrichtsplan bleibt', 'Unterrichtspläne bleiben')}, ohne Kurs`,
    consegneConData: (n) =>
      `${plurale(n, 'Auftrag bleibt', 'Aufträge bleiben')}, ` +
      'mit dem Datum statt der Stunde',
    momentiSenzaLezione: (n) =>
      `${plurale(n, 'Leistungsbeurteilung bleibt', 'Leistungsbeurteilungen bleiben')}, ` +
      'ohne die Stunde, mit der sie verknüpft war',
    lezioniSenzaScaletta: (n) =>
      `${plurale(n, 'Stunde bleibt', 'Stunden bleiben')}, ` +
      'ohne Ablauf und ohne die bereits gesetzten Häkchen',
  },
  fr: {
    nomeAnno: (etichetta) => `l’année ${etichetta}`,
    cartellaAnno: (cartella) => `le dossier « ${cartella} » en entier, avec sa documentation`,
    annoNonAperto:
      'son contenu : ce n’est pas l’année ouverte, et on ne peut pas le compter d’ici',
    nelCestino: 'Elle va dans la corbeille du système : on peut encore l’y récupérer.',
    nomeMateria: (nome) => `la branche « ${nome} »`,
    unireMateria: 'La fusionner avec une autre branche les réunit sans rien perdre.',
    nomeClasse: (nome) => `la classe ${nome}`,
    archiviareClasse: 'L’archiver la retire des listes et conserve tout l’historique.',
    nomeCorso: (titolo) => `le cours « ${titolo} »`,
    ritiro:
      'Pour un départ, il suffit de décocher « Fréquente » : ' +
      'la personne sort des appels, et ce qu’elle a fait jusqu’ici reste lisible.',
    nomeLezione: (data) => `la leçon du ${data}`,
    nomePiano: (nome) => `le plan de leçon ${nome}`,
    nomeMomento: (titolo) => `l’évaluation « ${titolo} »`,
    nomeConsegna: (testo) => `le devoir « ${testo} »`,
    spuntareConsegna:
      'Le cocher pour tout le monde le retire des choses à faire ' +
      'et conserve ce qui a été recueilli.',

    fileDelPiano: (n) => plurale(n, 'fichier joint au plan', 'fichiers joints au plan'),
    presenze: (n) => plurale(n, 'présence saisie', 'présences saisies'),
    voti: (n) => plurale(n, 'note', 'notes'),
    recuperi: (n) => plurale(n, 'rattrapage', 'rattrapages'),
    osservazioni: (n) => plurale(n, 'observation', 'observations'),
    spunteDelCheck: (n) => plurale(n, 'coche du check', 'coches du check'),
    caselle: (n) => plurale(n, 'case du comportement', 'cases du comportement'),
    documentiRaccolti: (n) => plurale(n, 'document recueilli', 'documents recueillis'),
    consegneSoloSue: (n) =>
      plurale(
        n,
        'devoir qui ne concernait que cette personne',
        'devoirs qui ne concernaient que cette personne',
      ),
    pdfInQuarantena: (n) => plurale(n, 'PDF en quarantaine', 'PDF en quarantaine'),
    suaFoto: 'sa photo',
    fogliDiAssenze: (n) => plurale(n, 'feuille d’absences', 'feuilles d’absences'),
    classi: (n, allievi) =>
      `${plurale(n, 'classe', 'classes')}` +
      (allievi > 0 ? `, avec ${quanti(allievi, lessico.in('fr').pif)}` : ''),
    allievi: (n) => quanti(n, lessico.in('fr').pif),
    foto: (n) => plurale(n, 'photo', 'photos'),
    corsi: (n) => plurale(n, 'cours', 'cours'),
    lezioni: (n) => `${plurale(n, 'leçon', 'leçons')}, avec appel, observations et bilan`,
    momenti: (n, voti) =>
      `${plurale(n, 'évaluation', 'évaluations')}` +
      (voti > 0 ? `, avec ${plurale(voti, 'note', 'notes')}` : ''),
    consegne: (n) => plurale(n, 'devoir', 'devoirs'),
    check: (n, spunte) =>
      plurale(n, 'check', 'checks') +
      (spunte > 0 ? `, avec ${plurale(spunte, 'coche', 'coches')}` : ''),
    fascicoloDocumenti: (n) => plurale(n, 'document', 'documents'),
    fascicoloComunicazioni: (n) => plurale(n, 'communication', 'communications'),
    fascicoloAssenze: (periodi, fogli) =>
      `${plurale(periodi, 'période d’absences', 'périodes d’absences')}` +
      (fogli > 0 ? ` avec ${plurale(fogli, 'feuille', 'feuilles')}` : ''),
    fascicolo: (pezzi) => `le dossier de classe : ${pezzi.join(', ')}`,
    fogliStampati: (n) =>
      `${plurale(n, 'feuille déjà imprimée', 'feuilles déjà imprimées')} dans le dossier`,

    documentiSenzaIntestatario: (n) =>
      `${plurale(n, 'document reste', 'documents restent')} ` +
      'dans le dossier de classe, sans titulaire',
    consegneSenzaNome: (n) =>
      `${plurale(n, 'devoir reste', 'devoirs restent')}, sans son nom parmi les destinataires`,
    spunteConData: (n) =>
      `${plurale(n, 'coche du check reste', 'coches du check restent')}, ` +
      'avec la date à la place de la leçon',
    pianiSenzaCorso: (n) =>
      `${plurale(n, 'plan de leçon reste', 'plans de leçon restent')}, sans cours`,
    consegneConData: (n) =>
      `${plurale(n, 'devoir reste', 'devoirs restent')}, avec la date à la place de la leçon`,
    momentiSenzaLezione: (n) =>
      `${plurale(n, 'évaluation reste', 'évaluations restent')}, ` +
      'sans la leçon à laquelle elle était liée',
    lezioniSenzaScaletta: (n) =>
      `${plurale(n, 'leçon reste', 'leçons restent')}, ` +
      'sans déroulement et sans les coches déjà mises',
  },
  en: {
    nomeAnno: (etichetta) => `school year ${etichetta}`,
    cartellaAnno: (cartella) => `the whole “${cartella}” folder, with its documentation`,
    annoNonAperto: 'everything in it: it is not the open year, so it can’t be counted from here',
    nelCestino: 'It goes to the system recycle bin: you can still get it back from there.',
    nomeMateria: (nome) => `the subject “${nome}”`,
    unireMateria: 'Merging it with another subject brings them together without losing anything.',
    nomeClasse: (nome) => `class ${nome}`,
    archiviareClasse: 'Archiving it takes it off the lists and keeps its whole history.',
    nomeCorso: (titolo) => `the course “${titolo}”`,
    ritiro:
      'For a withdrawal, just untick “Attends”: they no longer appear in attendance, and ' +
      'what they have done so far stays readable.',
    nomeLezione: (data) => `the lesson on ${data}`,
    nomePiano: (nome) => `the lesson plan ${nome}`,
    nomeMomento: (titolo) => `the assessment “${titolo}”`,
    nomeConsegna: (testo) => `the assignment “${testo}”`,
    spuntareConsegna:
      'Ticking it off for everyone takes it off the to-do list and keeps what has been collected.',

    fileDelPiano: (n) => plurale(n, 'file attached to the plan', 'files attached to the plan'),
    presenze: (n) => plurale(n, 'recorded attendance entry', 'recorded attendance entries'),
    voti: (n) => plurale(n, 'grade', 'grades'),
    recuperi: (n) => plurale(n, 'resit', 'resits'),
    osservazioni: (n) => plurale(n, 'observation', 'observations'),
    spunteDelCheck: (n) => plurale(n, 'check tick', 'check ticks'),
    caselle: (n) => plurale(n, 'behaviour grid cell', 'behaviour grid cells'),
    documentiRaccolti: (n) => plurale(n, 'collected document', 'collected documents'),
    consegneSoloSue: (n) =>
      plurale(n, 'assignment that was only for them', 'assignments that were only for them'),
    pdfInQuarantena: (n) => plurale(n, 'PDF in quarantine', 'PDFs in quarantine'),
    suaFoto: 'their photo',
    fogliDiAssenze: (n) => plurale(n, 'absence sheet', 'absence sheets'),
    classi: (n, allievi) =>
      `${plurale(n, 'class', 'classes')}` +
      (allievi > 0 ? `, with ${quanti(allievi, lessico.in('en').pif)}` : ''),
    allievi: (n) => quanti(n, lessico.in('en').pif),
    foto: (n) => plurale(n, 'photo', 'photos'),
    corsi: (n) => plurale(n, 'course', 'courses'),
    lezioni: (n) =>
      `${plurale(n, 'lesson', 'lessons')}, with attendance, observations and review`,
    momenti: (n, voti) =>
      `${plurale(n, 'assessment', 'assessments')}` +
      (voti > 0 ? `, with ${plurale(voti, 'grade', 'grades')}` : ''),
    consegne: (n) => plurale(n, 'assignment', 'assignments'),
    check: (n, spunte) =>
      plurale(n, 'check', 'checks') +
      (spunte > 0 ? `, with ${plurale(spunte, 'tick', 'ticks')}` : ''),
    fascicoloDocumenti: (n) => plurale(n, 'document', 'documents'),
    fascicoloComunicazioni: (n) => plurale(n, 'message', 'messages'),
    fascicoloAssenze: (periodi, fogli) =>
      `${plurale(periodi, 'absence period', 'absence periods')}` +
      (fogli > 0 ? ` with ${plurale(fogli, 'sheet', 'sheets')}` : ''),
    fascicolo: (pezzi) => `the class file: ${pezzi.join(', ')}`,
    fogliStampati: (n) =>
      `${plurale(n, 'already printed sheet', 'already printed sheets')} in the folder`,

    documentiSenzaIntestatario: (n) =>
      `${plurale(n, 'document stays', 'documents stay')} in the class file, with no owner`,
    consegneSenzaNome: (n) =>
      `${plurale(n, 'assignment stays', 'assignments stay')}, ` +
      'without their name among the recipients',
    spunteConData: (n) =>
      `${plurale(n, 'check tick stays', 'check ticks stay')}, with the date instead of the lesson`,
    pianiSenzaCorso: (n) =>
      `${plurale(n, 'lesson plan stays', 'lesson plans stay')}, with no course`,
    consegneConData: (n) =>
      `${plurale(n, 'assignment stays', 'assignments stay')}, with the date instead of the lesson`,
    momentiSenzaLezione: (n) =>
      `${plurale(n, 'assessment stays', 'assessments stay')}, without the lesson it was linked to`,
    lezioniSenzaScaletta: (n) =>
      `${plurale(n, 'lesson stays', 'lessons stay')}, ` +
      'without an outline and without the ticks already set',
  },
})
