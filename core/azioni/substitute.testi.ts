// I testi di `substitute.ts`: com'è andata la preparazione della supplenza.

import { catalogo } from '#core/i18n/index.js'

const it = {
  indirizzoStorto: (email: string) => `«${email}» non sembra un indirizzo e-mail.`,
  segretariatoSenzaIndirizzo:
    'Manca l’indirizzo del segretariato: scrivilo nel modulo o in Impostazioni › Utente › Posta.',
  provvisorio: 'L’anno non è ancora salvato: scegli dove metterlo, poi lo zip va accanto al documento.',
  senzaModello: (modello: string) => `Manca il modello «${modello}».`,
  composizioneFallita: (motivo: string) => `Il pacchetto della supplenza non si è composto: ${motivo}`,
  nonScritto: (motivo: string) => `Lo zip della supplenza non si è scritto: ${motivo}`,
  risorseMancanti: (titoli: string[]) => `Mancano dei file, rimasti fuori: ${titoli.join(', ')}.`,
  pronto: (percorso: string) => `Supplenza pronta: ${percorso}.`,
  domanda: (email: string) => `Mandare la supplenza a ${email}?`,
  dettaglio: (percorso: string) => `Parte una mail con lo zip allegato (${percorso}).`,
  soloZip: (percorso: string) => `Niente è partito. Lo zip è pronto: ${percorso}.`,
  zipMaNienteMail: (percorso: string, motivo: string) =>
    `Lo zip è pronto (${percorso}), ma la mail non si è preparata${motivo ? `: ${motivo}` : '.'}`,
  bozzaAperta: (email: string, percorso: string) =>
    `Mail per ${email} aperta nel programma di posta, con lo zip allegato. Lo zip resta anche qui: ${percorso}.`,
  spedita: (email: string) => `Supplenza mandata a ${email}.`,
  speditaNonATutti: (avviso: string) => `Supplenza mandata, ma con un problema: ${avviso}`,
}

export const testi = catalogo(it, {
  de: {
    indirizzoStorto: (email) => `«${email}» sieht nicht wie eine E-Mail-Adresse aus.`,
    segretariatoSenzaIndirizzo:
      'Die Adresse des Sekretariats fehlt: Trag sie im Formular oder unter Einstellungen › Benutzer › Post ein.',
    provvisorio: 'Das Schuljahr ist noch nicht gespeichert: Wähle einen Ort, dann kommt das ZIP neben das Dokument.',
    senzaModello: (modello) => `Die Vorlage «${modello}» fehlt.`,
    composizioneFallita: (motivo) => `Das Stellvertretungspaket liess sich nicht erstellen: ${motivo}`,
    nonScritto: (motivo) => `Das Stellvertretungs-ZIP liess sich nicht schreiben: ${motivo}`,
    risorseMancanti: (titoli) => `Einige Dateien fehlen und wurden weggelassen: ${titoli.join(', ')}.`,
    pronto: (percorso) => `Stellvertretung bereit: ${percorso}.`,
    domanda: (email) => `Die Stellvertretung an ${email} senden?`,
    dettaglio: (percorso) => `Es geht eine E-Mail mit dem ZIP im Anhang hinaus (${percorso}).`,
    soloZip: (percorso) => `Nichts wurde gesendet. Das ZIP ist bereit: ${percorso}.`,
    zipMaNienteMail: (percorso, motivo) =>
      `Das ZIP ist bereit (${percorso}), aber die E-Mail liess sich nicht vorbereiten${motivo ? `: ${motivo}` : '.'}`,
    bozzaAperta: (email, percorso) =>
      `E-Mail an ${email} im Mailprogramm geöffnet, mit dem ZIP im Anhang. Das ZIP bleibt auch hier: ${percorso}.`,
    spedita: (email) => `Stellvertretung an ${email} gesendet.`,
    speditaNonATutti: (avviso) => `Stellvertretung gesendet, aber mit einem Problem: ${avviso}`,
  },
  fr: {
    indirizzoStorto: (email) => `« ${email} » ne ressemble pas à une adresse e-mail.`,
    segretariatoSenzaIndirizzo:
      'L’adresse du secrétariat manque : écris-la dans le formulaire ou dans Paramètres › Utilisateur › Messagerie.',
    provvisorio: 'L’année n’est pas encore enregistrée : choisis où la mettre, puis le zip ira à côté du document.',
    senzaModello: (modello) => `Le modèle « ${modello} » manque.`,
    composizioneFallita: (motivo) => `Le dossier de suppléance n’a pas pu être composé : ${motivo}`,
    nonScritto: (motivo) => `Le zip de suppléance n’a pas pu être écrit : ${motivo}`,
    risorseMancanti: (titoli) => `Des fichiers manquent et sont restés dehors : ${titoli.join(', ')}.`,
    pronto: (percorso) => `Suppléance prête : ${percorso}.`,
    domanda: (email) => `Envoyer la suppléance à ${email} ?`,
    dettaglio: (percorso) => `Un e-mail part avec le zip en pièce jointe (${percorso}).`,
    soloZip: (percorso) => `Rien n’est parti. Le zip est prêt : ${percorso}.`,
    zipMaNienteMail: (percorso, motivo) =>
      `Le zip est prêt (${percorso}), mais l’e-mail n’a pas pu être préparé${motivo ? ` : ${motivo}` : '.'}`,
    bozzaAperta: (email, percorso) =>
      `E-mail pour ${email} ouvert dans la messagerie, avec le zip joint. Le zip reste aussi ici : ${percorso}.`,
    spedita: (email) => `Suppléance envoyée à ${email}.`,
    speditaNonATutti: (avviso) => `Suppléance envoyée, mais avec un problème : ${avviso}`,
  },
  en: {
    indirizzoStorto: (email) => `“${email}” doesn’t look like an email address.`,
    segretariatoSenzaIndirizzo:
      'The office address is missing: type it in the form or in Settings › User › Mail.',
    provvisorio: 'The year isn’t saved yet: choose where to put it, then the zip goes next to the document.',
    senzaModello: (modello) => `The “${modello}” template is missing.`,
    composizioneFallita: (motivo) => `The cover package could not be put together: ${motivo}`,
    nonScritto: (motivo) => `The cover zip could not be written: ${motivo}`,
    risorseMancanti: (titoli) => `Some files are missing and were left out: ${titoli.join(', ')}.`,
    pronto: (percorso) => `Cover ready: ${percorso}.`,
    domanda: (email) => `Send the cover to ${email}?`,
    dettaglio: (percorso) => `An email goes out with the zip attached (${percorso}).`,
    soloZip: (percorso) => `Nothing was sent. The zip is ready: ${percorso}.`,
    zipMaNienteMail: (percorso, motivo) =>
      `The zip is ready (${percorso}), but the email could not be prepared${motivo ? `: ${motivo}` : '.'}`,
    bozzaAperta: (email, percorso) =>
      `Email to ${email} opened in the mail program, with the zip attached. The zip also stays here: ${percorso}.`,
    spedita: (email) => `Cover sent to ${email}.`,
    speditaNonATutti: (avviso) => `Cover sent, but with a problem: ${avviso}`,
  },
})
