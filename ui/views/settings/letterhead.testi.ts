// I testi delle carte intestate (`settings/letterhead.ts`); li usa anche
// `letterheadCourses.ts`, che nomina i corsi senza DOM.

import { catalogo } from '#core/i18n/index.js'
import { plurale } from '#core/dominio/text.js'

const it = {
  senzaClasse: 'senza classe',
  cartaN: (numero: number) => `Carta ${numero}`,
  corsi: (quanti: number) => plurale(quanti, 'corso', 'corsi'),
  spostaIn: (quanti: number) => `Sposta ${quanti === 1 ? 'il corso' : `${quanti} corsi`} in…`,
  spostaDi: (che: string) => `Sposta ${che} in un’altra carta…`,
  virgolettato: (nome: string) => `«${nome}»`,
  corsiDi: (classe: string) => `i corsi di ${classe}`,
  corsoAiuto: (nome: string) =>
    `${nome} — clic per sceglierlo, Ctrl o Maiuscolo per sceglierne più d’uno`,
  classeAiuto: (nome: string) =>
    `${nome}: clic per scegliere i suoi corsi di questa carta, trascina per ` +
    'spostarli tutti insieme',
  corsiSu: (carta: string) => `Corsi su ${carta}`,
  vuotaPrima: 'Nessun corso di quest’anno: quelli nuovi arrivano qui da soli.',
  vuotaAltra: 'Nessun corso: trascinane qui uno, o una classe intera.',
  altriAnni: (quanti: number) => `+${quanti} di altri anni`,
  logo: 'Logo della scuola',
  logoAlt: 'Il logo della scuola',
  sostituisci: 'Sostituisci…',
  sostituisciAiuto: 'Sceglie un’altra immagine, che prende il posto di questa',
  togliLogoAiuto: 'I fogli di questa carta escono senza logo, con la sola scritta in cima',
  caricaLogo: 'Carica il logo…',
  caricaLogoAiuto: 'Un PNG o un JPEG: il registro lo copia dentro il documento',
  eliminare: 'Eliminare la carta intestata?',
  eliminareTesto: (via: string, corsi: number, resta: string) =>
    `«${via}» se ne va con il suo logo. ` +
    `${corsi === 1 ? 'Il suo corso passa' : `I ${corsi} corsi passano`} a «${resta}».`,
  eliminaCarta: 'Elimina la carta',
  predefinitaAiuto: 'I corsi nuovi, e i fogli di una classe con i corsi su carte diverse',
  predefinita: 'predefinita — qui vanno i corsi nuovi',
  eliminaCartaAiuto: (nome: string) =>
    `Elimina la carta «${nome}»: i suoi corsi passano alla prima`,
  nomeScuola: 'Nome della scuola',
  nomeScuolaAiuto: 'In cima a ogni foglio dei corsi di questa carta. Vuoto, la riga sparisce.',
  altezzaLogo: 'Altezza del logo',
  altezzaLogoAiuto: (minimo: number, massimo: number, predefinita: number) =>
    `Da ${minimo} a ${massimo} millimetri: la larghezza segue ` +
    `le proporzioni dell’immagine. Di serie ${predefinita}.`,
  corsiSuQuesta: 'Corsi su questa carta',
  chiFirma: 'Chi firma',
  chiFirmaAiuto:
    'Uno solo, qualunque sia la carta: sta dentro il documento dell’anno e viaggia con lui. ' +
    'La firma delle e-mail di serie usa lo stesso nome; una scritta a mano no.',
  nonSalvata: 'Non salvata: il registro non ha risposto.',
  altezzaPortata: (mm: number) => `Salvata a ${mm} mm, dentro i limiti.`,
  mm: 'mm',
  rendiPredefinita: 'Rendi predefinita',
  rendiPredefinitaAiuto:
    'Rendi predefinita: la porta in cima, e da qui in poi i corsi nuovi vanno su questa ' +
    'carta. I corsi restano dove sono.',
  togliereLogo: (carta: string) => `Togliere il logo di «${carta}»?`,
  togliereLogoTesto:
    'Il file esce dal documento: per rimetterlo va ricaricato dal disco. I fogli di questa carta ' +
    'escono con la sola scritta in cima.',
  siLegge: (intero: string) => `Sui fogli: ${intero}`,
  nessunNome: 'Sui fogli non c’è ancora un nome.',
  appellativi: ['Prof.', 'Prof.ssa', 'Dott.', 'Dott.ssa', 'Ing.', 'Arch.', 'Sig.', 'Sig.ra'],
  stampa: 'I PDF dei corsi',
  modiPdf: {
    mai: 'Solo quando lo si chiede, dalla pagina Documenti o con Ctrl+K.',
    chiusura: 'Concludendo un’ora: il suo verbale e i documenti del corso.',
    sempre: 'A ogni cambiamento che tocca un corso, poco dopo che si è smesso di scrivere.',
  },
  pdfAutomatici: 'Quando si rifanno da sé',
  pdfAutomaticiAiuto:
    'Quando il registro rifà da sé i PDF di un corso, perché nella cartella ci sia quel che il ' +
    'registro sa.',
  docenteAppellativo: 'Titolo o appellativo',
  docenteAppellativoAiuto:
    'Opzionale: compare nei modelli di stampa che usano {{docente.appellativo}} o {{docente.completo}}.',
  docenteNomeAiuto: 'Il nome proprio del docente.',
  docenteCognomeAiuto: 'Il cognome del docente.',
  carte: 'Carte intestate',
  carteAiuto:
    'Ogni corso stampa su una carta e su una sola: si sposta trascinandolo da una carta ' +
    'all’altra, o con il pulsante accanto al suo nome. Clic per scegliere un corso, Ctrl o ' +
    'Maiuscolo per sceglierne più d’uno; il nome di una classe porta con sé tutti i suoi corsi ' +
    'di quella carta. La prima è la predefinita: ci vanno i corsi nuovi, e i fogli di una ' +
    'classe i cui corsi stanno su carte diverse.',
  nuovaCarta: 'Nuova carta intestata',
  nuovaCartaAiuto: 'Una carta vuota, per un’altra scuola: poi le si trascinano i suoi corsi',
}

export const testi = catalogo(it, {
  de: {
    senzaClasse: 'ohne Klasse',
    cartaN: (numero) => `Briefpapier ${numero}`,
    corsi: (quanti) => plurale(quanti, 'Kurs', 'Kurse'),
    spostaIn: (quanti) => `${quanti === 1 ? 'Kurs' : `${quanti} Kurse`} verschieben nach…`,
    spostaDi: (che) => `${che} auf ein anderes Briefpapier verschieben…`,
    virgolettato: (nome) => `«${nome}»`,
    corsiDi: (classe) => `die Kurse von ${classe}`,
    corsoAiuto: (nome) =>
      `${nome} — Klick zum Auswählen, Ctrl oder Umschalt, um mehrere auszuwählen`,
    classeAiuto: (nome) =>
      `${nome}: Klick wählt ihre Kurse auf diesem Briefpapier, Ziehen verschiebt sie alle ` +
      'zusammen',
    corsiSu: (carta) => `Kurse auf ${carta}`,
    vuotaPrima: 'Keine Kurse dieses Jahres: Neue kommen von selbst hierher.',
    vuotaAltra: 'Keine Kurse: Zieh einen hierher, oder eine ganze Klasse.',
    altriAnni: (quanti) => `+${quanti} aus anderen Jahren`,
    logo: 'Logo der Schule',
    logoAlt: 'Das Logo der Schule',
    sostituisci: 'Ersetzen…',
    sostituisciAiuto: 'Wählt ein anderes Bild, das an die Stelle von diesem tritt',
    togliLogoAiuto:
      'Die Blätter dieses Briefpapiers erscheinen ohne Logo, nur mit der Schrift oben',
    caricaLogo: 'Logo laden…',
    caricaLogoAiuto: 'Ein PNG oder JPEG: Das Klassenbuch kopiert es ins Dokument',
    eliminare: 'Briefpapier löschen?',
    eliminareTesto: (via, corsi, resta) =>
      `«${via}» verschwindet mit seinem Logo. ` +
      `${corsi === 1 ? 'Sein Kurs wechselt' : `Die ${corsi} Kurse wechseln`} zu «${resta}».`,
    eliminaCarta: 'Briefpapier löschen',
    predefinitaAiuto:
      'Die neuen Kurse, und die Blätter einer Klasse mit Kursen auf verschiedenen Briefpapieren',
    predefinita: 'Standard — hierher kommen die neuen Kurse',
    eliminaCartaAiuto: (nome) =>
      `Briefpapier «${nome}» löschen: Seine Kurse wechseln zum ersten`,
    nomeScuola: 'Name der Schule',
    nomeScuolaAiuto:
      'Oben auf jedem Blatt der Kurse dieses Briefpapiers. Leer verschwindet die Zeile.',
    altezzaLogo: 'Höhe des Logos',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `Von ${minimo} bis ${massimo} Millimeter: Die Breite folgt den Proportionen des Bildes. ` +
      `Standard ${predefinita}.`,
    corsiSuQuesta: 'Kurse auf diesem Briefpapier',
    chiFirma: 'Wer unterschreibt',
    chiFirmaAiuto:
      'Nur eine Person, egal welches Briefpapier: steht im Jahresdokument und reist mit ihm. ' +
      'Die Standard-Signatur der E-Mails nutzt denselben Namen, eine von Hand geschriebene nicht.',
    nonSalvata: 'Nicht gespeichert: Das Klassenbuch hat nicht geantwortet.',
    altezzaPortata: (mm) => `Mit ${mm} mm gespeichert, innerhalb der Grenzen.`,
    mm: 'mm',
    rendiPredefinita: 'Zum Standard machen',
    rendiPredefinitaAiuto:
      'Zum Standard machen: setzt es an den Anfang, und neue Kurse kommen von jetzt an auf ' +
      'dieses Briefpapier. Die Kurse bleiben, wo sie sind.',
    togliereLogo: (carta) => `Logo von «${carta}» entfernen?`,
    togliereLogoTesto:
      'Die Datei verlässt das Dokument: Um sie zurückzubekommen, muss man sie neu von der ' +
      'Festplatte laden. Die Blätter dieses Briefpapiers haben dann nur die Schrift oben.',
    siLegge: (intero) => `Auf den Blättern: ${intero}`,
    nessunNome: 'Auf den Blättern steht noch kein Name.',
    appellativi: ['Prof.', 'Prof.in', 'Dr.', 'Dr.in', 'Herr', 'Frau', 'Dipl.-Ing.', 'Mag.'],
    stampa: 'Die PDFs der Kurse',
    modiPdf: {
      mai: 'Nur auf Wunsch, auf der Seite Dokumente oder mit Ctrl+K.',
      chiusura: 'Beim Abschliessen einer Stunde: ihr Protokoll und die Dokumente des Kurses.',
      sempre: 'Bei jeder Änderung an einem Kurs, kurz nachdem man aufgehört hat zu schreiben.',
    },
    pdfAutomatici: 'Wann sie sich selbst erneuern',
    pdfAutomaticiAiuto:
      'Wann das Klassenbuch die PDFs eines Kurses selbst neu erstellt, damit im Ordner steht, ' +
      'was das Klassenbuch weiss.',
    docenteAppellativo: 'Titel oder Anrede',
    docenteAppellativoAiuto:
      'Optional: erscheint in Druckvorlagen, die {{docente.appellativo}} oder {{docente.completo}} verwenden.',
    docenteNomeAiuto: 'Der Vorname der Lehrperson.',
    docenteCognomeAiuto: 'Der Nachname der Lehrperson.',
    carte: 'Briefpapiere',
    carteAiuto:
      'Jeder Kurs druckt auf genau einem Briefpapier: Man verschiebt ihn, indem man ihn von ' +
      'einem Briefpapier auf ein anderes zieht, oder mit der Schaltfläche neben seinem Namen. ' +
      'Klick wählt einen Kurs, Ctrl oder Umschalt wählt mehrere; der Name einer Klasse nimmt ' +
      'alle ihre Kurse dieses Briefpapiers mit. Das erste ist das Standardbriefpapier: Dorthin ' +
      'kommen die neuen Kurse und die Blätter einer Klasse, deren Kurse auf verschiedenen ' +
      'Briefpapieren liegen.',
    nuovaCarta: 'Neues Briefpapier',
    nuovaCartaAiuto:
      'Ein leeres Briefpapier, für eine andere Schule: Danach zieht man seine Kurse darauf',
  },
  fr: {
    senzaClasse: 'sans classe',
    cartaN: (numero) => `Papier ${numero}`,
    corsi: (quanti) => plurale(quanti, 'cours', 'cours'),
    spostaIn: (quanti) => `Déplacer ${quanti === 1 ? 'le cours' : `${quanti} cours`} vers…`,
    spostaDi: (che) => `Déplacer ${che} vers un autre papier…`,
    virgolettato: (nome) => `« ${nome} »`,
    corsiDi: (classe) => `les cours de ${classe}`,
    corsoAiuto: (nome) =>
      `${nome} — clic pour le choisir, Ctrl ou Maj pour en choisir plusieurs`,
    classeAiuto: (nome) =>
      `${nome} : clic pour choisir ses cours de ce papier, glisser pour les déplacer tous ` +
      'ensemble',
    corsiSu: (carta) => `Cours sur ${carta}`,
    vuotaPrima: 'Aucun cours de cette année : les nouveaux arrivent ici tout seuls.',
    vuotaAltra: 'Aucun cours : glisses-en un ici, ou une classe entière.',
    altriAnni: (quanti) => `+${quanti} d’autres années`,
    logo: 'Logo de l’école',
    logoAlt: 'Le logo de l’école',
    sostituisci: 'Remplacer…',
    sostituisciAiuto: 'Choisit une autre image, qui prend la place de celle-ci',
    togliLogoAiuto:
      'Les feuilles de ce papier sortent sans logo, avec seulement l’inscription en haut',
    caricaLogo: 'Charger le logo…',
    caricaLogoAiuto: 'Un PNG ou un JPEG : le registre le copie dans le document',
    eliminare: 'Supprimer le papier à en-tête ?',
    eliminareTesto: (via, corsi, resta) =>
      `« ${via} » s’en va avec son logo. ` +
      `${corsi === 1 ? 'Son cours passe' : `Les ${corsi} cours passent`} à « ${resta} ».`,
    eliminaCarta: 'Supprimer le papier',
    predefinitaAiuto:
      'Les nouveaux cours, et les feuilles d’une classe dont les cours sont sur des papiers ' +
      'différents',
    predefinita: 'par défaut — les nouveaux cours vont ici',
    eliminaCartaAiuto: (nome) =>
      `Supprimer le papier « ${nome} » : ses cours passent au premier`,
    nomeScuola: 'Nom de l’école',
    nomeScuolaAiuto:
      'En haut de chaque feuille des cours de ce papier. Vide, la ligne disparaît.',
    altezzaLogo: 'Hauteur du logo',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `De ${minimo} à ${massimo} millimètres : la largeur suit les proportions de l’image. ` +
      `Par défaut ${predefinita}.`,
    corsiSuQuesta: 'Cours sur ce papier',
    chiFirma: 'Qui signe',
    chiFirmaAiuto:
      'Une seule personne, quel que soit le papier : elle est dans le document de l’année et ' +
      'voyage avec lui. La signature des e-mails par défaut utilise le même nom ; une écrite à ' +
      'la main, non.',
    nonSalvata: 'Non enregistré : le registre n’a pas répondu.',
    altezzaPortata: (mm) => `Enregistré à ${mm} mm, dans les limites.`,
    mm: 'mm',
    rendiPredefinita: 'Rendre par défaut',
    rendiPredefinitaAiuto:
      'Rendre par défaut : le met en tête, et dès maintenant les nouveaux cours vont sur ce ' +
      'papier. Les cours restent où ils sont.',
    togliereLogo: (carta) => `Retirer le logo de « ${carta} » ?`,
    togliereLogoTesto:
      'Le fichier quitte le document : pour le remettre, il faut le recharger depuis le disque. ' +
      'Les feuilles de ce papier sortent avec la seule inscription en haut.',
    siLegge: (intero) => `Sur les feuilles : ${intero}`,
    nessunNome: 'Il n’y a encore aucun nom sur les feuilles.',
    appellativi: ['Prof.', 'Prof.e', 'Dr', 'Dre', 'M.', 'Mme', 'Ing.', 'Me'],
    stampa: 'Les PDF des cours',
    modiPdf: {
      mai: 'Seulement sur demande, depuis la page Documents ou avec Ctrl+K.',
      chiusura: 'En concluant une leçon : son procès-verbal et les documents du cours.',
      sempre: 'À chaque changement qui touche un cours, peu après qu’on a fini d’écrire.',
    },
    pdfAutomatici: 'Quand ils se refont seuls',
    pdfAutomaticiAiuto:
      'Quand le registre refait de lui-même les PDF d’un cours, pour que le dossier contienne ce ' +
      'que le registre sait.',
    docenteAppellativo: 'Titre ou appellation',
    docenteAppellativoAiuto:
      'Facultatif : apparaît dans les modèles d’impression utilisant {{docente.appellativo}} ou {{docente.completo}}.',
    docenteNomeAiuto: 'Le prénom de l’enseignant.',
    docenteCognomeAiuto: 'Le nom de famille de l’enseignant.',
    carte: 'Papiers à en-tête',
    carteAiuto:
      'Chaque cours s’imprime sur un seul papier : on le déplace en le glissant d’un papier à ' +
      'l’autre, ou avec le bouton à côté de son nom. Clic pour choisir un cours, Ctrl ou Maj ' +
      'pour en choisir plusieurs ; le nom d’une classe emporte tous ses cours de ce papier. Le ' +
      'premier est celui par défaut : les nouveaux cours y vont, ainsi que les feuilles d’une ' +
      'classe dont les cours sont sur des papiers différents.',
    nuovaCarta: 'Nouveau papier à en-tête',
    nuovaCartaAiuto: 'Un papier vide, pour une autre école : ensuite on y glisse ses cours',
  },
  en: {
    senzaClasse: 'no class',
    cartaN: (numero) => `Letterhead ${numero}`,
    corsi: (quanti) => plurale(quanti, 'course', 'courses'),
    spostaIn: (quanti) => `Move ${quanti === 1 ? 'the course' : `${quanti} courses`} to…`,
    spostaDi: (che) => `Move ${che} to another letterhead…`,
    virgolettato: (nome) => `“${nome}”`,
    corsiDi: (classe) => `the courses of ${classe}`,
    corsoAiuto: (nome) => `${nome} — click to select it, Ctrl or Shift to select more than one`,
    classeAiuto: (nome) =>
      `${nome}: click to select its courses on this letterhead, drag to move them all together`,
    corsiSu: (carta) => `Courses on ${carta}`,
    vuotaPrima: 'No courses this year: new ones arrive here by themselves.',
    vuotaAltra: 'No courses: drag one here, or a whole class.',
    altriAnni: (quanti) => `+${quanti} from other years`,
    logo: 'School logo',
    logoAlt: 'The school logo',
    sostituisci: 'Replace…',
    sostituisciAiuto: 'Chooses another image, which takes the place of this one',
    togliLogoAiuto:
      'The sheets of this letterhead come out without a logo, with just the text at the top',
    caricaLogo: 'Load the logo…',
    caricaLogoAiuto: 'A PNG or a JPEG: the register copies it into the document',
    eliminare: 'Delete the letterhead?',
    eliminareTesto: (via, corsi, resta) =>
      `“${via}” goes, together with its logo. ` +
      `${corsi === 1 ? 'Its course moves' : `Its ${corsi} courses move`} to “${resta}”.`,
    eliminaCarta: 'Delete the letterhead',
    predefinitaAiuto:
      'New courses, and the sheets of a class whose courses are on different letterheads',
    predefinita: 'default — new courses go here',
    eliminaCartaAiuto: (nome) => `Delete the letterhead “${nome}”: its courses move to the first`,
    nomeScuola: 'School name',
    nomeScuolaAiuto:
      'At the top of every sheet of the courses on this letterhead. Empty, the line disappears.',
    altezzaLogo: 'Logo height',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `From ${minimo} to ${massimo} millimetres: the width follows the proportions of the ` +
      `image. Default ${predefinita}.`,
    corsiSuQuesta: 'Courses on this letterhead',
    chiFirma: 'Who signs',
    chiFirmaAiuto:
      'Just one, whatever the letterhead: it lives inside the year’s document and travels ' +
      'with it. The default email signature uses the same name; one written by hand does not.',
    nonSalvata: 'Not saved: the register did not answer.',
    altezzaPortata: (mm) => `Saved at ${mm} mm, within the limits.`,
    mm: 'mm',
    rendiPredefinita: 'Make default',
    rendiPredefinitaAiuto:
      'Make default: moves it to the top, and from now on new courses go on this letterhead. ' +
      'Courses stay where they are.',
    togliereLogo: (carta) => `Remove the logo of “${carta}”?`,
    togliereLogoTesto:
      'The file leaves the document: to put it back it has to be loaded again from disk. The ' +
      'sheets of this letterhead come out with just the heading.',
    siLegge: (intero) => `On the sheets: ${intero}`,
    nessunNome: 'There is no name on the sheets yet.',
    appellativi: ['Prof.', 'Dr', 'Mr', 'Ms', 'Mrs', 'Mx', 'Eng.', 'Rev.'],
    stampa: 'The courses’ PDFs',
    modiPdf: {
      mai: 'Only when asked, from the Documents page or with Ctrl+K.',
      chiusura: 'When a lesson is concluded: its record and the course’s documents.',
      sempre: 'On every change that touches a course, shortly after you stop typing.',
    },
    pdfAutomatici: 'When they redo themselves',
    pdfAutomaticiAiuto:
      'When the register redoes a course’s PDFs by itself, so that the folder holds what the ' +
      'register knows.',
    docenteAppellativo: 'Title or salutation',
    docenteAppellativoAiuto:
      'Optional: appears in print templates using {{docente.appellativo}} or {{docente.completo}}.',
    docenteNomeAiuto: 'The teacher’s first name.',
    docenteCognomeAiuto: 'The teacher’s last name.',
    carte: 'Letterheads',
    carteAiuto:
      'Each course prints on one letterhead and only one: you move it by dragging it from one ' +
      'letterhead to another, or with the button next to its name. Click to select a course, ' +
      'Ctrl or Shift to select more than one; the name of a class takes along all its courses ' +
      'on that letterhead. The first is the default: new courses go there, and so do the ' +
      'sheets of a class whose courses are on different letterheads.',
    nuovaCarta: 'New letterhead',
    nuovaCartaAiuto: 'An empty letterhead, for another school: then you drag its courses onto it',
  },
})
