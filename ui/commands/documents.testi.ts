// I testi dei comandi dei documenti e della posta (`documents.ts`). La guida
// cita i nomi dei pulsanti fra virgolette: cambiandone uno va cambiato anche
// là, in tutte le lingue.

import { catalogo } from '#core/i18n/index.js'
import { PIF } from '#core/dominio/lexicon.js'

const it = {
  // I documenti.
  aggiornaTutto: 'Aggiorna tutto',
  aggiornaTuttoAiuto: (semestre: string) =>
    'Tutto quel che il corso sa stampare: presenze, voti, una scheda per ogni ' +
    `${PIF.singolare} e per ogni prova, il verbale di ogni ora conclusa, i piani, le facce ` +
    `e il fascicolo di classe, nel ${semestre}`,
  // La posta.
  accountPosta: 'Account e posta',
  accountPostaAiuto:
    'Collegare, provare, scollegare e azzerare la casella, e OneDrive: in Impostazioni › ' +
    'Utente › Account',
}

export const testi = catalogo(it, {
  de: {
    aggiornaTutto: 'Alles aktualisieren',
    aggiornaTuttoAiuto: (semestre) =>
      'Alles, was der Kurs drucken kann: Präsenzen, Noten, ein Blatt pro lernende Person und ' +
      'pro Prüfung, das Protokoll jeder abgeschlossenen Stunde, die Pläne, die Fotoliste und das ' +
      `Klassendossier (${semestre})`,
    accountPosta: 'Konten und E-Mail',
    accountPostaAiuto:
      'Postfach verbinden, testen, trennen und zurücksetzen, und OneDrive: in Einstellungen › ' +
      'Benutzer › Konten',
  },
  fr: {
    aggiornaTutto: 'Tout mettre à jour',
    aggiornaTuttoAiuto: (semestre) =>
      'Tout ce que le cours sait imprimer : présences, notes, une fiche par personne en ' +
      'formation et par épreuve, le procès-verbal de chaque leçon terminée, les plans, le ' +
      `trombinoscope et le dossier de classe (${semestre})`,
    accountPosta: 'Comptes et messagerie',
    accountPostaAiuto:
      'Connecter, tester, déconnecter et réinitialiser la boîte, et OneDrive : dans Paramètres › ' +
      'Utilisateur › Comptes',
  },
  en: {
    aggiornaTutto: 'Update everything',
    aggiornaTuttoAiuto: (semestre) =>
      'Everything the course can print: attendance, grades, one sheet per learner and per ' +
      'test, the lesson record of each completed lesson, the plans, the photo sheet and the class file ' +
      `(${semestre})`,
    accountPosta: 'Accounts and mail',
    accountPostaAiuto:
      'Connect, test, disconnect and reset the mailbox, and OneDrive: in Settings › User › ' +
      'Accounts',
  },
})
