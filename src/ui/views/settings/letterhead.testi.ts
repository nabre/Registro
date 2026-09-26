// I testi delle carte intestate (`settings/letterhead.ts`); li usa anche
// `letterheadCourses.ts`, che nomina i corsi senza DOM.

import { catalogo } from '../../../i18n/index.js'
import { plurale } from '../../../domain/text.js'

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
  nomeScuolaSegnaposto: 'Scuola professionale…',
  nomeScuolaAiuto: 'In cima a ogni foglio dei corsi di questa carta. Vuoto, la riga sparisce.',
  altezzaLogo: 'Altezza del logo (mm)',
  altezzaLogoAiuto: (minimo: number, massimo: number, predefinita: number) =>
    `Da ${minimo} a ${massimo} millimetri: la larghezza segue ` +
    `le proporzioni dell’immagine. Di serie ${predefinita}.`,
  altezzaNonNumero: '«Altezza del logo» non è cambiata: serve un numero.',
  corsiSuQuesta: 'Corsi su questa carta',
  chiFirma: 'Chi firma',
  chiFirmaAiuto:
    'Uno solo, qualunque sia la carta: sta dentro il documento dell’anno e viaggia con lui.',
  docenteSegnaposto: 'Nome e cognome',
  docenteAiuto:
    'In fondo a sinistra di ogni pagina, su tutte le carte, e nella firma di serie delle e-mail.',
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
    nomeScuolaSegnaposto: 'Berufsfachschule…',
    nomeScuolaAiuto:
      'Oben auf jedem Blatt der Kurse dieses Briefpapiers. Leer verschwindet die Zeile.',
    altezzaLogo: 'Höhe des Logos (mm)',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `Von ${minimo} bis ${massimo} Millimeter: Die Breite folgt den Proportionen des Bildes. ` +
      `Standard ${predefinita}.`,
    altezzaNonNumero: '«Höhe des Logos» wurde nicht geändert: Es braucht eine Zahl.',
    corsiSuQuesta: 'Kurse auf diesem Briefpapier',
    chiFirma: 'Wer unterschreibt',
    chiFirmaAiuto:
      'Nur eine Person, egal welches Briefpapier: steht im Jahresdokument und reist mit ihm.',
    docenteSegnaposto: 'Vorname und Nachname',
    docenteAiuto:
      'Unten links auf jeder Seite, auf allen Briefpapieren, und in der Standardsignatur der ' +
      'E-Mails.',
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
    nomeScuolaSegnaposto: 'École professionnelle…',
    nomeScuolaAiuto:
      'En haut de chaque feuille des cours de ce papier. Vide, la ligne disparaît.',
    altezzaLogo: 'Hauteur du logo (mm)',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `De ${minimo} à ${massimo} millimètres : la largeur suit les proportions de l’image. ` +
      `Par défaut ${predefinita}.`,
    altezzaNonNumero: '« Hauteur du logo » n’a pas changé : il faut un nombre.',
    corsiSuQuesta: 'Cours sur ce papier',
    chiFirma: 'Qui signe',
    chiFirmaAiuto:
      'Une seule personne, quel que soit le papier : elle est dans le document de l’année et ' +
      'voyage avec lui.',
    docenteSegnaposto: 'Prénom et nom',
    docenteAiuto:
      'En bas à gauche de chaque page, sur tous les papiers, et dans la signature standard des ' +
      'e-mails.',
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
    nomeScuolaSegnaposto: 'Vocational school…',
    nomeScuolaAiuto:
      'At the top of every sheet of the courses on this letterhead. Empty, the line disappears.',
    altezzaLogo: 'Logo height (mm)',
    altezzaLogoAiuto: (minimo, massimo, predefinita) =>
      `From ${minimo} to ${massimo} millimetres: the width follows the proportions of the ` +
      `image. Default ${predefinita}.`,
    altezzaNonNumero: '“Logo height” was not changed: a number is needed.',
    corsiSuQuesta: 'Courses on this letterhead',
    chiFirma: 'Who signs',
    chiFirmaAiuto:
      'Just one, whatever the letterhead: it lives inside the year’s document and travels ' +
      'with it.',
    docenteSegnaposto: 'First and last name',
    docenteAiuto:
      'Bottom left of every page, on all letterheads, and in the standard email signature.',
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
