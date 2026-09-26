// I testi del contesto (`context.ts`): il nome di ripiego di un corso e i
// motivi per cui un comando o una pagina adesso non si possono usare.

import { catalogo } from '../i18n/index.js'

const it = {
  /** Il nome di un corso che non ha né classe né materia né titolo. */
  corso: 'Corso',
  senzaCorso: 'Nessun corso scelto: se ne sceglie uno dalla barra in cima.',
  senzaClasse:
    'Nessuna classe aperta: la porta con sé il corso scelto in cima, o la si apre dalla pagina ' +
    'Classi.',
  senzaAnno: 'Non c’è ancora un anno scolastico.',
  senzaLezione: 'Nessun’ora aperta: si apre dal calendario o dalla pagina Lezione.',
  senzaPosta: 'La casella di posta non è collegata.',
}

export const testi = catalogo(it, {
  de: {
    corso: 'Kurs',
    senzaCorso: 'Kein Kurs gewählt: Man wählt einen in der Leiste oben.',
    senzaClasse:
      'Keine Klasse geöffnet: Sie kommt mit dem oben gewählten Kurs, oder man öffnet sie auf der ' +
      'Seite Klassen.',
    senzaAnno: 'Es gibt noch kein Schuljahr.',
    senzaLezione: 'Keine Stunde geöffnet: Man öffnet sie im Kalender oder auf der Seite ' +
      'Stunde.',
    senzaPosta: 'Das E-Mail-Postfach ist nicht verbunden.',
  },
  fr: {
    corso: 'Cours',
    senzaCorso: 'Aucun cours choisi : on en choisit un dans la barre en haut.',
    senzaClasse:
      'Aucune classe ouverte : elle vient avec le cours choisi en haut, ou on l’ouvre depuis la ' +
      'page Classes.',
    senzaAnno: 'Il n’y a pas encore d’année scolaire.',
    senzaLezione: 'Aucune leçon ouverte : elle s’ouvre depuis le calendrier ou la page Leçon.',
    senzaPosta: 'La boîte de courrier n’est pas connectée.',
  },
  en: {
    corso: 'Course',
    senzaCorso: 'No course chosen: choose one from the bar at the top.',
    senzaClasse:
      'No class open: it comes with the course chosen at the top, or you open it from the ' +
      'Classes page.',
    senzaAnno: 'There is no school year yet.',
    senzaLezione: 'No lesson open: open one from the calendar or the Lesson page.',
    senzaPosta: 'The mailbox is not connected.',
  },
})
