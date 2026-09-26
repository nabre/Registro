// I testi di `templates.ts`: anteprima, cartella `templates/` portata dentro, logo.
// `templates/` è un nome di cartella: resta uguale in tutte le lingue.

import { catalogo, elenco } from '../i18n/index.js'

const it = {
  modelloAssente: (nome: string) => `Il modello «${nome}» non c’è.`,
  anteprimaFallita: (motivo: string) => `L’anteprima non si è composta: ${motivo}`,
  /** Di chi è l'anteprima di un verbale: il giorno è scritto come nel documento. */
  lezioneDel: (giorno: string) => `lezione del ${giorno}`,
  nonRapporto: (titolo: string) => `«${titolo}» non è un rapporto: non c’è un foglio da guardare.`,
  servonoDati:
    'Serve almeno una lezione, un corso e una classe: l’anteprima si compone sui dati veri del registro.',
  portatoSede: 'il nome della scuola',
  portatoDocente: 'il nome di chi firma',
  portatoLogo: 'il logo',
  portatoFirma: 'la firma delle e-mail',
  intestazionePortata: (portati: string[]) =>
    `L’intestazione di templates/ è ora nel documento: ${portati.join(', ')}.`,
  cartellaInDisuso: 'La cartella templates/ accanto al documento non si usa più.',
  modelliPersi: (modelli: string[]) =>
    ' Questi modelli erano stati cambiati a mano, e da adesso valgono quelli del programma: ' +
    `${modelli.join(', ')}. La cartella resta dov’è.`,
  cartellaDaCancellare: ' La cartella resta dov’è, e si può cancellare.',
  cartaNonTrovata: 'Carta intestata non trovata.',
  titoloSceltaLogo: 'Il logo della scuola, per la carta intestata',
  tastoSceltaLogo: 'Usa questo logo',
  nonPngJpeg: (nome: string) => `«${nome}» non è un PNG né un JPEG: sono i due formati che finiscono nei fogli.`,
  copiaLogoFallita: (errore: string) => `Copia del logo non riuscita: ${errore}`,
}

export const testi = catalogo(it, {
  de: {
    modelloAssente: (nome) => `Die Vorlage «${nome}» gibt es nicht.`,
    anteprimaFallita: (motivo) => `Die Vorschau konnte nicht erstellt werden: ${motivo}`,
    lezioneDel: (giorno) => `Stunde vom ${giorno}`,
    nonRapporto: (titolo) => `«${titolo}» ist kein Bericht: Es gibt kein Blatt anzusehen.`,
    servonoDati:
      'Es braucht mindestens eine Stunde, einen Kurs und eine Klasse: Die Vorschau ' +
      'wird mit den echten Daten des Klassenbuchs erstellt.',
    portatoSede: 'der Name der Schule',
    portatoDocente: 'der Name der unterzeichnenden Person',
    portatoLogo: 'das Logo',
    portatoFirma: 'die E-Mail-Signatur',
    intestazionePortata: (portati) =>
      `Der Briefkopf aus templates/ ist jetzt im Dokument: ${elenco(portati)}.`,
    cartellaInDisuso: 'Der Ordner templates/ neben dem Dokument wird nicht mehr verwendet.',
    modelliPersi: (modelli) =>
      ' Diese Vorlagen waren von Hand geändert worden, ab jetzt gelten die des Programms: ' +
      `${elenco(modelli)}. Der Ordner bleibt, wo er ist.`,
    cartellaDaCancellare: ' Der Ordner bleibt, wo er ist, und kann gelöscht werden.',
    cartaNonTrovata: 'Briefpapier nicht gefunden.',
    titoloSceltaLogo: 'Das Logo der Schule, für das Briefpapier',
    tastoSceltaLogo: 'Dieses Logo verwenden',
    nonPngJpeg: (nome) => `«${nome}» ist weder PNG noch JPEG: Nur diese beiden Formate kommen auf die Blätter.`,
    copiaLogoFallita: (errore) => `Das Logo konnte nicht kopiert werden: ${errore}`,
  },
  fr: {
    modelloAssente: (nome) => `Le modèle « ${nome} » n’existe pas.`,
    anteprimaFallita: (motivo) => `L’aperçu n’a pas pu être composé : ${motivo}`,
    lezioneDel: (giorno) => `leçon du ${giorno}`,
    nonRapporto: (titolo) => `« ${titolo} » n’est pas un rapport : il n’y a pas de feuille à regarder.`,
    servonoDati:
      'Il faut au moins une leçon, un cours et une classe : l’aperçu se compose sur les vraies ' +
      'données du registre.',
    portatoSede: 'le nom de l’école',
    portatoDocente: 'le nom de la personne qui signe',
    portatoLogo: 'le logo',
    portatoFirma: 'la signature des e-mails',
    intestazionePortata: (portati) =>
      `L’en-tête de templates/ se trouve maintenant dans le document : ${elenco(portati)}.`,
    cartellaInDisuso: 'Le dossier templates/ à côté du document n’est plus utilisé.',
    modelliPersi: (modelli) =>
      ' Ces modèles avaient été modifiés à la main, et désormais ce sont ceux du programme qui ' +
      `valent : ${elenco(modelli)}. Le dossier reste où il est.`,
    cartellaDaCancellare: ' Le dossier reste où il est, et peut être supprimé.',
    cartaNonTrovata: 'Papier à en-tête introuvable.',
    titoloSceltaLogo: 'Le logo de l’école, pour le papier à en-tête',
    tastoSceltaLogo: 'Utiliser ce logo',
    nonPngJpeg: (nome) =>
      `« ${nome} » n’est ni un PNG ni un JPEG : ce sont les deux formats qui vont sur les feuilles.`,
    copiaLogoFallita: (errore) => `La copie du logo a échoué : ${errore}`,
  },
  en: {
    modelloAssente: (nome) => `There is no template “${nome}”.`,
    anteprimaFallita: (motivo) => `The preview could not be composed: ${motivo}`,
    lezioneDel: (giorno) => `lesson on ${giorno}`,
    nonRapporto: (titolo) => `“${titolo}” is not a report: there is no sheet to look at.`,
    servonoDati:
      'At least one lesson, one course and one class are needed: the preview is composed from ' +
      'the register’s real data.',
    portatoSede: 'the school name',
    portatoDocente: 'the name of the person signing',
    portatoLogo: 'the logo',
    portatoFirma: 'the email signature',
    intestazionePortata: (portati) =>
      `The letterhead from templates/ is now in the document: ${elenco(portati)}.`,
    cartellaInDisuso: 'The templates/ folder next to the document is no longer used.',
    modelliPersi: (modelli) =>
      ' These templates had been changed by hand, and from now on the program’s own ones apply: ' +
      `${elenco(modelli)}. The folder stays where it is.`,
    cartellaDaCancellare: ' The folder stays where it is, and can be deleted.',
    cartaNonTrovata: 'Letterhead not found.',
    titoloSceltaLogo: 'The school logo, for the letterhead',
    tastoSceltaLogo: 'Use this logo',
    nonPngJpeg: (nome) => `“${nome}” is neither a PNG nor a JPEG: those are the two formats that go on the sheets.`,
    copiaLogoFallita: (errore) => `Copying the logo failed: ${errore}`,
  },
})
