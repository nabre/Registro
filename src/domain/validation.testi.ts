// I testi di `validation.ts`: che cosa non va in un dato, sotto il modulo o
// nella risposta di una procedura. Un'etichetta scritta da chi insegna entra
// così com'è; quando manca, ogni lingua ha la sua parola di ripiego.

import { catalogo, numero } from '../i18n/index.js'
import { ordinalePausa } from './breaks.js'
import { FASCIA, PERSONE, PIF, del, un } from './lexicon.js'

/** «la seconda pausa», in francese: tante quante le pause ammesse, poi in cifre. */
function ordinaleFr (indice: number): string {
  const parole = [
    'première', 'deuxième', 'troisième', 'quatrième',
    'cinquième', 'sixième', 'septième', 'huitième',
  ]
  return parole[indice] ?? `${indice + 1}ᵉ`
}

/** «the second break», in inglese. */
function ordinaleEn (indice: number): string {
  const parole = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
  return parole[indice] ?? `${indice + 1}th`
}

const it = {
  // L'anno e le sue sospensioni
  etichettaAnno: 'L’anno scolastico deve avere un’etichetta.',
  senzaSemestri: 'L’anno è fatto dai suoi semestri: senza, non ha né inizio né fine.',
  dateSemestre: (etichetta: string) => `Date non valide nel ${etichetta || 'semestre'}.`,
  semestreAlRovescio: (etichetta: string) =>
    `Il ${etichetta || 'semestre'} deve finire dopo il suo inizio.`,
  semestriStaccati: (etichetta: string, precedente: string) =>
    `Il ${etichetta || 'semestre'} deve cominciare il giorno dopo la fine ` +
    `del ${precedente || 'precedente'}.`,
  dateAnno: 'Le date dell’anno non sono quelle dei suoi semestri.',
  sospensioneFuori: (etichetta: string) => `«${etichetta}» cade fuori dall’anno.`,
  sospensioneSenzaNome: 'La sospensione deve avere un nome.',
  inizioNonValido: 'Data d’inizio non valida.',
  fineNonValida: 'Data di fine non valida.',
  sospensioneAlRovescio: 'La sospensione finisce prima di cominciare.',

  // Le fasce dell'orario
  giornoNonValido: 'Giorno della settimana non valido.',
  oraInizio: 'Ora d’inizio non valida: usare HH:MM.',
  durataZero: 'La durata deve essere maggiore di zero.',
  fasciaInUd: (minutiUd: number) =>
    `Una fascia dura un numero intero di unità didattiche da ${minutiUd} minuti.`,
  dalNonValido: '«Dal» non è una data valida.',
  alNonValido: '«Al» non è una data valida.',
  periodoFascia: 'Il periodo della fascia finisce prima di cominciare.',
  fasciaGemella: 'C’è già una fascia in questo giorno alla stessa ora.',

  // L'unità didattica e le pause della giornata
  minutiUd: (minimo: number, massimo: number) =>
    `Un’unità didattica dura fra ${minimo} e ${massimo} minuti interi.`,
  primaPausa: 'La prima pausa non ha un orario valido: usare HH:MM.',
  troppePause: (quante: number) => `Al massimo ${quante} pause in una giornata.`,
  durataPausa: (indice: number, minimo: number, massimo: number) =>
    `La ${ordinalePausa(indice)} pausa dura fra ${minimo} e ${massimo} minuti interi.`,
  distanzaPausa: (indice: number, minimo: number, massimo: number) =>
    `La ${ordinalePausa(indice)} pausa cade fra ${minimo} e ${massimo} ` +
    'unità didattiche intere dopo la precedente.',
  mezzanotte: 'L’ultima pausa finirebbe dopo mezzanotte.',

  // Classi e persone in formazione
  classeSenzaNome: 'La classe deve avere un nome.',
  classeGemella: (nome: string) => `Esiste già una classe «${nome}» in questo anno.`,
  cognome: 'Il cognome è obbligatorio.',
  nome: 'Il nome è obbligatorio.',
  nascita: 'Data di nascita non valida: usare il formato AAAA-MM-GG.',
  email: 'Indirizzo e-mail non valido.',
  emailRappresentante: `Indirizzo e-mail ${del(PERSONE.rappresentante)} non valido.`,
  emailDatore: 'Indirizzo e-mail del datore di lavoro non valido.',

  // Le lezioni e le loro fasce
  senzaFasce: `La lezione deve avere almeno ${un(FASCIA)}.`,
  orari: 'Orari non validi: usare il formato HH:MM.',
  fasciaAlRovescio: (inizio: string, fine: string) =>
    `La fascia ${inizio}–${fine} finisce prima di cominciare.`,
  fasciaNonMultipla: (inizio: string, fine: string, minutiUd: number) =>
    `La fascia ${inizio}–${fine} non è un multiplo dell’unità didattica (${minutiUd} min).`,
  fasceSovrapposte: (inizioA: string, fineA: string, inizioB: string, fineB: string) =>
    `Le fasce ${inizioA}–${fineA} e ${inizioB}–${fineB} si sovrappongono.`,
  solePause: 'Una lezione fatta di sole pause non è una lezione.',
  dataLezione: 'Data della lezione non valida.',
  corsoLezione: 'Assegnare un corso alla lezione.',

  // Piani e risorse
  risorsaSenzaTitolo: 'La risorsa deve avere un titolo.',
  indirizzoWeb: 'L’indirizzo non è valido: deve cominciare con http:// o https://.',
  pianoSenzaCorso: 'Il piano dev’essere di un corso.',
  attivitaSenzaTitolo: 'Ogni attività deve avere un titolo.',
  durataAttivita: (titolo: string) =>
    `Durata non valida per l’attività «${titolo || 'senza titolo'}».`,

  // Materie e corsi
  materiaSenzaNome: 'La materia deve avere un nome.',
  materiaGemella: (nome: string) => `Esiste già una materia «${nome}».`,
  corsoSenzaClasse: 'Il corso deve avere una classe.',
  corsoSenzaMateria: 'Il corso deve avere una materia.',
  corsoGemello: (titolo: string) =>
    `Questa materia è già insegnata in questa classe: «${titolo}».`,

  // Recapiti e comunicazioni
  recapitoSenzaEtichetta: 'Il recapito deve avere un’etichetta.',
  comunicazioneSenzaOggetto: 'La comunicazione deve avere un oggetto.',
  comunicazioneVuota: 'La comunicazione è vuota.',
  destinatari: 'Scegliere almeno un gruppo di destinatari.',

  // Scale e momenti di valutazione
  scalaAlRovescio: 'Il minimo della scala deve essere inferiore al massimo.',
  sufficienza: 'La sufficienza deve cadere dentro la scala.',
  passoVoti: 'Il passo dei voti deve essere positivo.',
  valutazioneSenzaTitolo: 'Il momento di valutazione deve avere un titolo.',
  dataNonValida: 'Data non valida.',
  corsoValutazione: 'Assegnare un corso.',
  peso: 'Il peso va da 0 a 10, con i decimali; 1 è il valore normale.',
  votoFuori: (valore: number, minimo: number, massimo: number) =>
    `Voto ${valore} fuori dalla scala ${minimo}–${massimo}.`,

  // I periodi delle assenze
  periodoAlRovescio: 'Il periodo finisce prima di cominciare.',
  periodoFuori: (anno: string, inizio: string, fine: string) =>
    `Il periodo esce dall’anno ${anno}: va da ${inizio} a ${fine}.`,
  emailSenzaOggetto: 'L’e-mail deve avere un oggetto.',
  emailVuota: 'L’e-mail è vuota.',

  // Le consegne
  consegnaSenzaTesto: 'La consegna deve dire che cosa fare.',
  consegnaSenzaCorso: 'La consegna appartiene a un corso.',
  consegnaSenzaPersone: `Scegliere almeno ${un(PIF)}, o darla a tutta la classe.`,
  scadenzaNonValida: 'Data di scadenza non valida.',
  scadenzaPrima: 'La scadenza viene prima del giorno in cui la consegna è stata data.',
  consegnoIo: 'Un documento che consegno io non può avere me come destinatario.',
}

export const testi = catalogo(it, {
  de: {
    etichettaAnno: 'Das Schuljahr braucht eine Bezeichnung.',
    senzaSemestri:
      'Das Jahr besteht aus seinen Semestern: Ohne sie hat es weder Anfang noch Ende.',
    dateSemestre: (etichetta) =>
      etichetta ? `Ungültige Daten in «${etichetta}».` : 'Ungültige Daten im Semester.',
    semestreAlRovescio: (etichetta) =>
      `${etichetta ? `«${etichetta}»` : 'Das Semester'} muss nach seinem Beginn enden.`,
    semestriStaccati: (etichetta, precedente) =>
      `${etichetta ? `«${etichetta}»` : 'Das Semester'} muss am Tag nach dem Ende ` +
      `${precedente ? `von «${precedente}»` : 'des vorherigen'} beginnen.`,
    dateAnno: 'Die Daten des Jahres stimmen nicht mit denen seiner Semester überein.',
    sospensioneFuori: (etichetta) => `«${etichetta}» liegt ausserhalb des Jahres.`,
    sospensioneSenzaNome: 'Die unterrichtsfreie Zeit braucht einen Namen.',
    inizioNonValido: 'Ungültiges Anfangsdatum.',
    fineNonValida: 'Ungültiges Enddatum.',
    sospensioneAlRovescio: 'Die unterrichtsfreie Zeit endet, bevor sie beginnt.',

    giornoNonValido: 'Ungültiger Wochentag.',
    oraInizio: 'Ungültige Anfangszeit: HH:MM verwenden.',
    durataZero: 'Die Dauer muss grösser als null sein.',
    fasciaInUd: (minutiUd) =>
      `Ein Zeitfenster dauert eine ganze Zahl von Lektionen zu ${minutiUd} Minuten.`,
    dalNonValido: '«Von» ist kein gültiges Datum.',
    alNonValido: '«Bis» ist kein gültiges Datum.',
    periodoFascia: 'Der Zeitraum des Zeitfensters endet, bevor er beginnt.',
    fasciaGemella: 'An diesem Tag gibt es zur selben Zeit schon ein Zeitfenster.',

    minutiUd: (minimo, massimo) => `Eine Lektion dauert ${minimo} bis ${massimo} ganze Minuten.`,
    primaPausa: 'Die erste Pause hat keine gültige Uhrzeit: HH:MM verwenden.',
    troppePause: (quante) => `Höchstens ${quante} Pausen pro Tag.`,
    durataPausa: (indice, minimo, massimo) =>
      `Die ${indice + 1}. Pause dauert ${minimo} bis ${massimo} ganze Minuten.`,
    distanzaPausa: (indice, minimo, massimo) =>
      `Die ${indice + 1}. Pause liegt ${minimo} bis ${massimo} ganze Lektionen ` +
      'nach der vorherigen.',
    mezzanotte: 'Die letzte Pause würde nach Mitternacht enden.',

    classeSenzaNome: 'Die Klasse braucht einen Namen.',
    classeGemella: (nome) => `In diesem Jahr gibt es schon eine Klasse «${nome}».`,
    cognome: 'Der Nachname ist obligatorisch.',
    nome: 'Der Vorname ist obligatorisch.',
    nascita: 'Ungültiges Geburtsdatum: das Format JJJJ-MM-TT verwenden.',
    email: 'Ungültige E-Mail-Adresse.',
    emailRappresentante: 'Ungültige E-Mail-Adresse der gesetzlichen Vertretung.',
    emailDatore: 'Ungültige E-Mail-Adresse des Arbeitgebers.',

    senzaFasce: 'Die Stunde braucht mindestens ein Zeitfenster.',
    orari: 'Ungültige Zeiten: das Format HH:MM verwenden.',
    fasciaAlRovescio: (inizio, fine) =>
      `Das Zeitfenster ${inizio}–${fine} endet, bevor es beginnt.`,
    fasciaNonMultipla: (inizio, fine, minutiUd) =>
      `Das Zeitfenster ${inizio}–${fine} ist kein Vielfaches der Lektion (${minutiUd} Min.).`,
    fasceSovrapposte: (inizioA, fineA, inizioB, fineB) =>
      `Die Zeitfenster ${inizioA}–${fineA} und ${inizioB}–${fineB} überschneiden sich.`,
    solePause: 'Eine Stunde nur aus Pausen ist keine Stunde.',
    dataLezione: 'Ungültiges Datum der Stunde.',
    corsoLezione: 'Der Stunde einen Kurs zuweisen.',

    risorsaSenzaTitolo: 'Die Ressource braucht einen Titel.',
    indirizzoWeb: 'Die Adresse ist ungültig: Sie muss mit http:// oder https:// beginnen.',
    pianoSenzaCorso: 'Der Unterrichtsplan muss zu einem Kurs gehören.',
    attivitaSenzaTitolo: 'Jede Aktivität braucht einen Titel.',
    durataAttivita: (titolo) => `Ungültige Dauer für die Aktivität «${titolo || 'ohne Titel'}».`,

    materiaSenzaNome: 'Das Fach braucht einen Namen.',
    materiaGemella: (nome) => `Es gibt schon ein Fach «${nome}».`,
    corsoSenzaClasse: 'Der Kurs braucht eine Klasse.',
    corsoSenzaMateria: 'Der Kurs braucht ein Fach.',
    corsoGemello: (titolo) => `Dieses Fach wird in dieser Klasse schon unterrichtet: «${titolo}».`,

    recapitoSenzaEtichetta: 'Die Kontaktadresse braucht eine Bezeichnung.',
    comunicazioneSenzaOggetto: 'Die Mitteilung braucht einen Betreff.',
    comunicazioneVuota: 'Die Mitteilung ist leer.',
    destinatari: 'Mindestens eine Empfängergruppe wählen.',

    scalaAlRovescio: 'Das Minimum der Notenskala muss kleiner als das Maximum sein.',
    sufficienza: 'Die genügende Note muss innerhalb der Notenskala liegen.',
    passoVoti: 'Die Notenschritte müssen positiv sein.',
    valutazioneSenzaTitolo: 'Die Leistungsbeurteilung braucht einen Titel.',
    dataNonValida: 'Ungültiges Datum.',
    corsoValutazione: 'Einen Kurs zuweisen.',
    peso: 'Die Gewichtung geht von 0 bis 10, mit Dezimalstellen; 1 ist der Normalwert.',
    votoFuori: (valore, minimo, massimo) =>
      `Note ${numero(valore)} ausserhalb der Notenskala ${numero(minimo)}–${numero(massimo)}.`,

    periodoAlRovescio: 'Der Zeitraum endet, bevor er beginnt.',
    periodoFuori: (anno, inizio, fine) =>
      `Der Zeitraum liegt ausserhalb des Schuljahrs ${anno}: Es geht vom ${inizio} bis ${fine}.`,
    emailSenzaOggetto: 'Die E-Mail braucht einen Betreff.',
    emailVuota: 'Die E-Mail ist leer.',

    consegnaSenzaTesto: 'Der Auftrag muss sagen, was zu tun ist.',
    consegnaSenzaCorso: 'Der Auftrag gehört zu einem Kurs.',
    consegnaSenzaPersone:
      'Mindestens eine lernende Person wählen oder den Auftrag der ganzen Klasse erteilen.',
    scadenzaNonValida: 'Ungültiges Fälligkeitsdatum.',
    scadenzaPrima: 'Die Frist liegt vor dem Tag, an dem der Auftrag erteilt wurde.',
    consegnoIo: 'Ein Dokument, das ich abgebe, kann nicht mich als Empfänger haben.',
  },
  fr: {
    etichettaAnno: 'L’année scolaire doit avoir un libellé.',
    senzaSemestri: 'L’année est faite de ses semestres : sans eux, elle n’a ni début ni fin.',
    dateSemestre: (etichetta) =>
      etichetta
        ? `Dates non valides dans « ${etichetta} ».`
        : 'Dates non valides dans le semestre.',
    semestreAlRovescio: (etichetta) =>
      `${etichetta ? `« ${etichetta} »` : 'Le semestre'} doit finir après son début.`,
    semestriStaccati: (etichetta, precedente) =>
      `${etichetta ? `« ${etichetta} »` : 'Le semestre'} doit commencer le lendemain de la fin ` +
      `${precedente ? `de « ${precedente} »` : 'du précédent'}.`,
    dateAnno: 'Les dates de l’année ne sont pas celles de ses semestres.',
    sospensioneFuori: (etichetta) => `« ${etichetta} » tombe en dehors de l’année.`,
    sospensioneSenzaNome: 'L’interruption des cours doit avoir un nom.',
    inizioNonValido: 'Date de début non valide.',
    fineNonValida: 'Date de fin non valide.',
    sospensioneAlRovescio: 'L’interruption des cours finit avant de commencer.',

    giornoNonValido: 'Jour de la semaine non valide.',
    oraInizio: 'Heure de début non valide : utiliser HH:MM.',
    durataZero: 'La durée doit être supérieure à zéro.',
    fasciaInUd: (minutiUd) =>
      `Une plage horaire dure un nombre entier de périodes de ${minutiUd} minutes.`,
    dalNonValido: '« Du » n’est pas une date valide.',
    alNonValido: '« Au » n’est pas une date valide.',
    periodoFascia: 'L’intervalle de dates de la plage horaire finit avant de commencer.',
    fasciaGemella: 'Il y a déjà une plage horaire ce jour-là à la même heure.',

    minutiUd: (minimo, massimo) =>
      `Une période dure entre ${minimo} et ${massimo} minutes entières.`,
    primaPausa: 'La première pause n’a pas d’heure valide : utiliser HH:MM.',
    troppePause: (quante) => `Au maximum ${quante} pauses dans une journée.`,
    durataPausa: (indice, minimo, massimo) =>
      `La ${ordinaleFr(indice)} pause dure entre ${minimo} et ${massimo} minutes entières.`,
    distanzaPausa: (indice, minimo, massimo) =>
      `La ${ordinaleFr(indice)} pause tombe entre ${minimo} et ${massimo} ` +
      'périodes entières après la précédente.',
    mezzanotte: 'La dernière pause finirait après minuit.',

    classeSenzaNome: 'La classe doit avoir un nom.',
    classeGemella: (nome) => `Il existe déjà une classe « ${nome} » cette année.`,
    cognome: 'Le nom de famille est obligatoire.',
    nome: 'Le prénom est obligatoire.',
    nascita: 'Date de naissance non valide : utiliser le format AAAA-MM-JJ.',
    email: 'Adresse e-mail non valide.',
    emailRappresentante: 'Adresse e-mail du représentant légal non valide.',
    emailDatore: 'Adresse e-mail de l’employeur non valide.',

    senzaFasce: 'La leçon doit avoir au moins une plage horaire.',
    orari: 'Horaires non valides : utiliser le format HH:MM.',
    fasciaAlRovescio: (inizio, fine) => `La plage ${inizio}–${fine} finit avant de commencer.`,
    fasciaNonMultipla: (inizio, fine, minutiUd) =>
      `La plage ${inizio}–${fine} n’est pas un multiple de la période (${minutiUd} min).`,
    fasceSovrapposte: (inizioA, fineA, inizioB, fineB) =>
      `Les plages ${inizioA}–${fineA} et ${inizioB}–${fineB} se chevauchent.`,
    solePause: 'Une leçon faite uniquement de pauses n’est pas une leçon.',
    dataLezione: 'Date de la leçon non valide.',
    corsoLezione: 'Attribuer un cours à la leçon.',

    risorsaSenzaTitolo: 'La ressource doit avoir un titre.',
    indirizzoWeb: 'L’adresse n’est pas valide : elle doit commencer par http:// ou https://.',
    pianoSenzaCorso: 'Le plan de leçon doit appartenir à un cours.',
    attivitaSenzaTitolo: 'Chaque activité doit avoir un titre.',
    durataAttivita: (titolo) =>
      `Durée non valide pour l’activité « ${titolo || 'sans titre'} ».`,

    materiaSenzaNome: 'La branche doit avoir un nom.',
    materiaGemella: (nome) => `Il existe déjà une branche « ${nome} ».`,
    corsoSenzaClasse: 'Le cours doit avoir une classe.',
    corsoSenzaMateria: 'Le cours doit avoir une branche.',
    corsoGemello: (titolo) =>
      `Cette branche est déjà enseignée dans cette classe : « ${titolo} ».`,

    recapitoSenzaEtichetta: 'L’adresse de contact doit avoir un libellé.',
    comunicazioneSenzaOggetto: 'La communication doit avoir un objet.',
    comunicazioneVuota: 'La communication est vide.',
    destinatari: 'Choisir au moins un groupe de destinataires.',

    scalaAlRovescio: 'Le minimum du barème doit être inférieur au maximum.',
    sufficienza: 'La note suffisante doit se trouver dans le barème.',
    passoVoti: 'Le pas des notes doit être positif.',
    valutazioneSenzaTitolo: 'L’évaluation doit avoir un titre.',
    dataNonValida: 'Date non valide.',
    corsoValutazione: 'Attribuer un cours.',
    peso: 'La pondération va de 0 à 10, décimales comprises ; 1 est la valeur normale.',
    votoFuori: (valore, minimo, massimo) =>
      `Note ${numero(valore)} hors du barème ${numero(minimo)}–${numero(massimo)}.`,

    periodoAlRovescio: 'La période finit avant de commencer.',
    periodoFuori: (anno, inizio, fine) =>
      `La période sort de l’année ${anno}, qui va du ${inizio} au ${fine}.`,
    emailSenzaOggetto: 'L’e-mail doit avoir un objet.',
    emailVuota: 'L’e-mail est vide.',

    consegnaSenzaTesto: 'Le devoir doit dire ce qu’il faut faire.',
    consegnaSenzaCorso: 'Le devoir appartient à un cours.',
    consegnaSenzaPersone:
      'Choisir au moins une personne en formation, ou le donner à toute la classe.',
    scadenzaNonValida: 'Date d’échéance non valide.',
    scadenzaPrima: 'L’échéance tombe avant le jour où le devoir a été donné.',
    consegnoIo: 'Un document que je remets ne peut pas m’avoir comme destinataire.',
  },
  en: {
    etichettaAnno: 'The school year needs a label.',
    senzaSemestri:
      'The year is made of its semesters: without them, it has neither a start nor an end.',
    dateSemestre: (etichetta) =>
      etichetta ? `Invalid dates in “${etichetta}”.` : 'Invalid dates in the semester.',
    semestreAlRovescio: (etichetta) =>
      `${etichetta ? `“${etichetta}”` : 'The semester'} must end after it starts.`,
    semestriStaccati: (etichetta, precedente) =>
      `${etichetta ? `“${etichetta}”` : 'The semester'} must start the day after ` +
      `${precedente ? `“${precedente}”` : 'the previous one'} ends.`,
    dateAnno: 'The year’s dates don’t match those of its semesters.',
    sospensioneFuori: (etichetta) => `“${etichetta}” falls outside the year.`,
    sospensioneSenzaNome: 'The closure needs a name.',
    inizioNonValido: 'Invalid start date.',
    fineNonValida: 'Invalid end date.',
    sospensioneAlRovescio: 'The closure ends before it starts.',

    giornoNonValido: 'Invalid day of the week.',
    oraInizio: 'Invalid start time: use HH:MM.',
    durataZero: 'The length must be greater than zero.',
    fasciaInUd: (minutiUd) => `A time slot lasts a whole number of ${minutiUd}-minute periods.`,
    dalNonValido: '“From” isn’t a valid date.',
    alNonValido: '“To” isn’t a valid date.',
    periodoFascia: 'The time slot’s date range ends before it starts.',
    fasciaGemella: 'There’s already a time slot on this day at the same time.',

    minutiUd: (minimo, massimo) =>
      `A period lasts between ${minimo} and ${massimo} whole minutes.`,
    primaPausa: 'The first break has no valid time: use HH:MM.',
    troppePause: (quante) => `At most ${quante} breaks in a day.`,
    durataPausa: (indice, minimo, massimo) =>
      `The ${ordinaleEn(indice)} break lasts between ${minimo} and ${massimo} whole minutes.`,
    distanzaPausa: (indice, minimo, massimo) =>
      `The ${ordinaleEn(indice)} break comes between ${minimo} and ${massimo} ` +
      'whole periods after the previous one.',
    mezzanotte: 'The last break would end after midnight.',

    classeSenzaNome: 'The class needs a name.',
    classeGemella: (nome) => `There’s already a class “${nome}” in this year.`,
    cognome: 'The surname is required.',
    nome: 'The first name is required.',
    nascita: 'Invalid date of birth: use the format YYYY-MM-DD.',
    email: 'Invalid email address.',
    emailRappresentante: 'Invalid email address for the legal guardian.',
    emailDatore: 'Invalid email address for the employer.',

    senzaFasce: 'The lesson needs at least one time slot.',
    orari: 'Invalid times: use the format HH:MM.',
    fasciaAlRovescio: (inizio, fine) => `The time slot ${inizio}–${fine} ends before it starts.`,
    fasciaNonMultipla: (inizio, fine, minutiUd) =>
      `The time slot ${inizio}–${fine} isn’t a multiple of the period (${minutiUd} min).`,
    fasceSovrapposte: (inizioA, fineA, inizioB, fineB) =>
      `The time slots ${inizioA}–${fineA} and ${inizioB}–${fineB} overlap.`,
    solePause: 'A lesson made only of breaks isn’t a lesson.',
    dataLezione: 'Invalid lesson date.',
    corsoLezione: 'Assign a course to the lesson.',

    risorsaSenzaTitolo: 'The resource needs a title.',
    indirizzoWeb: 'The address isn’t valid: it must start with http:// or https://.',
    pianoSenzaCorso: 'The lesson plan must belong to a course.',
    attivitaSenzaTitolo: 'Every activity needs a title.',
    durataAttivita: (titolo) => `Invalid length for the activity “${titolo || 'untitled'}”.`,

    materiaSenzaNome: 'The subject needs a name.',
    materiaGemella: (nome) => `There’s already a subject “${nome}”.`,
    corsoSenzaClasse: 'The course needs a class.',
    corsoSenzaMateria: 'The course needs a subject.',
    corsoGemello: (titolo) => `This subject is already taught in this class: “${titolo}”.`,

    recapitoSenzaEtichetta: 'The contact address needs a label.',
    comunicazioneSenzaOggetto: 'The message needs a subject.',
    comunicazioneVuota: 'The message is empty.',
    destinatari: 'Choose at least one group of recipients.',

    scalaAlRovescio: 'The minimum of the grading scale must be lower than the maximum.',
    sufficienza: 'The pass mark must fall within the grading scale.',
    passoVoti: 'The grade step must be positive.',
    valutazioneSenzaTitolo: 'The assessment needs a title.',
    dataNonValida: 'Invalid date.',
    corsoValutazione: 'Assign a course.',
    peso: 'The weight goes from 0 to 10, decimals allowed; 1 is the normal value.',
    votoFuori: (valore, minimo, massimo) =>
      `Grade ${numero(valore)} outside the grading scale ${numero(minimo)}–${numero(massimo)}.`,

    periodoAlRovescio: 'The period ends before it starts.',
    periodoFuori: (anno, inizio, fine) =>
      `The period falls outside the ${anno} school year, which runs from ${inizio} to ${fine}.`,
    emailSenzaOggetto: 'The email needs a subject.',
    emailVuota: 'The email is empty.',

    consegnaSenzaTesto: 'The assignment must say what to do.',
    consegnaSenzaCorso: 'The assignment belongs to a course.',
    consegnaSenzaPersone: 'Choose at least one learner, or give it to the whole class.',
    scadenzaNonValida: 'Invalid due date.',
    scadenzaPrima: 'The due date falls before the day the assignment was given.',
    consegnoIo: 'A document I hand in can’t have me as its recipient.',
  },
})
