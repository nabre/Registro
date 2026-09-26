// I testi delle procedure di `aggiornamenti`. I valori di `fase` e `tono`
// («pronto», «installazione») sono del contratto e restano uguali. Si leggono
// al momento dell'uso (`titolo: () => …`), mai al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  controlla: { titolo: 'Chiede a GitHub se c’è una versione nuova del registro' },
  installa: { titolo: 'Esce dal registro, installa la versione scaricata e lo riapre' },
  scarica: { titolo: 'Scarica la versione nuova del registro già trovata' },
  stato: {
    titolo: 'La versione del registro che gira, e se ce n’è una più nuova',
    versione: 'La versione che gira adesso',
    supportato: 'Se questo registro si può aggiornare da sé',
    motivo: 'Perché da sé non si può, quando non si può',
    fase:
      'Che cosa sta succedendo: «pronto» vuol dire scaricata e in attesa di installare, ' +
      '«installazione» che il registro sta per chiudersi e aggiornarsi',
    data: 'Quando è stata pubblicata, in ISO',
    note: 'Che cosa cambia, come l’ha scritto chi l’ha pubblicata',
    nuova: 'La versione trovata, quando ce n’è una più nuova',
    byte: 'Quanto è sceso dello scarico in corso',
    totale: 'Quanto pesa l’installatore, zero finché non si sa',
    ultimoControllo: 'Quando si è controllato l’ultima volta, in ISO',
    errore: 'Perché l’ultimo tentativo non è andato',
    pagina: 'La pagina delle release, da cui scaricare a mano',
    breve: 'Lo stato in due o tre parole',
    frase: 'Lo stato in una frase',
    gesto: 'Il gesto che ha senso adesso',
    quota: 'Quanto è sceso dello scarico, fra 0 e 1',
    notizia: 'C’è quando c’è una versione nuova da annunciare; cambia a ogni cosa nuova da dire',
    racconto: 'Lo stato detto a parole, come lo mostrano le finestre del registro',
    presentazione: {
      titolo: 'Aggiornamenti del registro',
      versione: 'Versione',
      stato: 'Stato',
      ultimoControllo: 'Ultimo controllo',
      motivo: 'Perché a mano',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    controlla: { titolo: 'Fragt bei GitHub nach, ob es eine neue Version des Klassenbuchs gibt' },
    installa: {
      titolo:
        'Beendet das Klassenbuch, installiert die heruntergeladene Version und öffnet es wieder',
    },
    scarica: { titolo: 'Lädt die bereits gefundene neue Version des Klassenbuchs herunter' },
    stato: {
      titolo: 'Die Version des Klassenbuchs, die läuft, und ob es eine neuere gibt',
      versione: 'Die Version, die jetzt läuft',
      supportato: 'Ob sich dieses Klassenbuch selbst aktualisieren kann',
      motivo: 'Warum es sich nicht selbst aktualisieren kann, falls es das nicht kann',
      fase:
        'Was gerade passiert: «pronto» heisst heruntergeladen und bereit zur Installation, ' +
        '«installazione», dass sich das Klassenbuch gleich schliesst und aktualisiert',
      data: 'Wann sie veröffentlicht wurde, in ISO',
      note: 'Was sich ändert, so wie es die Person geschrieben hat, die sie veröffentlicht hat',
      nuova: 'Die gefundene Version, wenn es eine neuere gibt',
      byte: 'Wie viel vom laufenden Download schon da ist',
      totale: 'Wie gross das Installationsprogramm ist, null, solange man es nicht weiss',
      ultimoControllo: 'Wann zuletzt nachgesehen wurde, in ISO',
      errore: 'Warum der letzte Versuch nicht geklappt hat',
      pagina: 'Die Seite der Releases, von der man von Hand herunterladen kann',
      breve: 'Der Stand in zwei oder drei Wörtern',
      frase: 'Der Stand in einem Satz',
      gesto: 'Die Handlung, die jetzt Sinn ergibt',
      quota: 'Wie viel vom Download schon da ist, zwischen 0 und 1',
      notizia:
        'Vorhanden, wenn es eine neue Version anzukündigen gibt; ändert sich bei jeder neuen ' +
        'Meldung',
      racconto: 'Der Stand in Worten, wie ihn die Fenster des Klassenbuchs zeigen',
      presentazione: {
        titolo: 'Aktualisierungen des Klassenbuchs',
        versione: 'Version',
        stato: 'Stand',
        ultimoControllo: 'Letzte Prüfung',
        motivo: 'Warum von Hand',
      },
    },
  },
  fr: {
    controlla: { titolo: 'Demande à GitHub s’il existe une nouvelle version du registre' },
    installa: { titolo: 'Quitte le registre, installe la version téléchargée et le rouvre' },
    scarica: { titolo: 'Télécharge la nouvelle version du registre déjà trouvée' },
    stato: {
      titolo: 'La version du registre qui tourne, et s’il en existe une plus récente',
      versione: 'La version qui tourne maintenant',
      supportato: 'Si ce registre peut se mettre à jour tout seul',
      motivo: 'Pourquoi il ne le peut pas tout seul, quand il ne le peut pas',
      fase:
        'Ce qui se passe : « pronto » veut dire téléchargée et en attente d’installation, ' +
        '« installazione » que le registre va se fermer et se mettre à jour',
      data: 'Quand elle a été publiée, en ISO',
      note: 'Ce qui change, tel que l’a écrit la personne qui l’a publiée',
      nuova: 'La version trouvée, quand il en existe une plus récente',
      byte: 'La part déjà reçue du téléchargement en cours',
      totale: 'Le poids du programme d’installation, zéro tant qu’on ne le sait pas',
      ultimoControllo: 'Quand on a vérifié la dernière fois, en ISO',
      errore: 'Pourquoi la dernière tentative n’a pas abouti',
      pagina: 'La page des versions publiées, d’où télécharger à la main',
      breve: 'L’état en deux ou trois mots',
      frase: 'L’état en une phrase',
      gesto: 'Le geste qui a du sens maintenant',
      quota: 'La part déjà téléchargée, entre 0 et 1',
      notizia:
        'Présent quand il y a une nouvelle version à annoncer ; change à chaque nouvelle chose à ' +
        'dire',
      racconto: 'L’état dit avec des mots, tel que le montrent les fenêtres du registre',
      presentazione: {
        titolo: 'Mises à jour du registre',
        versione: 'Version',
        stato: 'État',
        ultimoControllo: 'Dernière vérification',
        motivo: 'Pourquoi à la main',
      },
    },
  },
  en: {
    controlla: { titolo: 'Asks GitHub whether there is a new version of the register' },
    installa: { titolo: 'Quits the register, installs the downloaded version and reopens it' },
    scarica: { titolo: 'Downloads the new version of the register already found' },
    stato: {
      titolo: 'The version of the register that is running, and whether there is a newer one',
      versione: 'The version running now',
      supportato: 'Whether this register can update itself',
      motivo: 'Why it cannot update itself, when it cannot',
      fase:
        'What is happening: “pronto” means downloaded and waiting to be installed, ' +
        '“installazione” that the register is about to close and update',
      data: 'When it was published, in ISO',
      note: 'What changes, as written by whoever published it',
      nuova: 'The version found, when there is a newer one',
      byte: 'How much of the current download has arrived',
      totale: 'How big the installer is, zero until it is known',
      ultimoControllo: 'When it was last checked, in ISO',
      errore: 'Why the last attempt failed',
      pagina: 'The releases page, to download by hand',
      breve: 'The state in two or three words',
      frase: 'The state in one sentence',
      gesto: 'The action that makes sense now',
      quota: 'How much of the download has arrived, between 0 and 1',
      notizia:
        'Present when there is a new version to announce; changes with every new thing to say',
      racconto: 'The state in words, as the register’s windows show it',
      presentazione: {
        titolo: 'Register updates',
        versione: 'Version',
        stato: 'Status',
        ultimoControllo: 'Last check',
        motivo: 'Why by hand',
      },
    },
  },
})
