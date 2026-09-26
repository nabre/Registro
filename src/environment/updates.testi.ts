// I testi degli aggiornamenti (pastiglia, frase, gesto, motivi di fallimento),
// per `updates.ts` e `updateInstaller.ts`.

import { catalogo } from '../i18n/index.js'

const it = {
  // Quando da sé non si può
  inSviluppo: 'Questo registro gira in sviluppo: non c’è un pacchetto installato da aggiornare.',
  portabile:
    'Questa è la versione portabile: non si aggiorna da sé. Si scarica quella nuova dalla ' +
    'pagina delle release e la si mette al posto di questa — i dati accanto all’eseguibile ' +
    'restano dove sono.',
  altroSistema:
    'Su questo sistema il registro non si aggiorna da sé: le release portano l’aggiornamento ' +
    'automatico solo per Windows. La versione nuova si scarica dalla pagina delle release.',
  aManoBreve: 'aggiornamento a mano',
  nonSiAggiorna: 'Questo registro non si aggiorna da sé.',
  apriLeRelease: 'Apri le release',

  /** Al posto del numero, se la release non lo dicesse. */
  nuova: 'nuova',
  controllaAdesso: 'Controlla adesso',

  controlloBreve: 'controllo in corso',
  controlloFrase: 'Sto chiedendo a GitHub qual è l’ultima versione…',
  controllando: 'Sto controllando…',

  aggiornatoBreve: 'è l’ultima',
  aggiornatoFrase: 'Questa è l’ultima versione pubblicata.',
  /** Con lo spazio davanti: si attacca alla frase di prima. */
  ultimoControllo: (quando: string) => ` Ultimo controllo: ${quando}.`,

  erroreBreve: 'controllo non riuscito',
  erroreFrase: 'Il controllo non è andato.',

  disponibileBreve: (nuova: string) => `c’è la ${nuova}`,
  /** `pubblicata` è la data, o vuoto; `eppure` il guasto dello scarico, già con lo spazio davanti. */
  disponibileFrase: (nuova: string, pubblicata: string, eppure: string) =>
    `C’è la versione ${nuova}${pubblicata ? `, pubblicata il ${pubblicata}` : ''}. ` +
    `Non è ancora scaricata.${eppure}`,

  scaricoBreve: (nuova: string) => `scarico la ${nuova}`,
  scaricoBreveQuota: (nuova: string, percento: number) => `scarico la ${nuova}: ${percento}%`,
  scaricoFrase: (nuova: string) => `Scarico la versione ${nuova}…`,
  scaricoFraseQuota: (nuova: string, scesi: string, totale: string) =>
    `Scarico la versione ${nuova}: ${scesi} di ${totale}.`,

  pronta: (nuova: string) => `${nuova} pronta`,
  prontaAllUscita: (nuova: string) =>
    `La versione ${nuova} è scaricata e si installa da sé quando esci dal registro. ` +
    'Se non vuoi aspettare, riavvia adesso.',
  prontaAMano: (nuova: string) =>
    `La versione ${nuova} è scaricata. Si installa quando premi «Riavvia e aggiorna».`,
  riavviaEAggiorna: 'Riavvia e aggiorna',

  installazioneBreve: 'installazione in corso',
  installazioneFrase: (nuova: string) =>
    `Preparo l’installazione della ${nuova}: fra un momento il registro si chiude e ` +
    'una finestra mostra l’aggiornamento.',

  fermoBreve: 'non ancora controllato',
  fermoDaSé: 'Non si è ancora controllato: succede da sé poco dopo l’avvio.',
  fermoSpento: 'Il controllo automatico è spento: si controlla premendo «Controlla adesso».',

  // Perché non è andata
  senzaRete: 'GitHub non risponde: forse manca la connessione. Si riprova al prossimo controllo.',
  senzaRelease: 'Non si trova una release con l’aggiornamento: forse è ancora in preparazione.',
  scartato: 'L’installatore scaricato non corrisponde a quello pubblicato, ed è stato scartato.',
  installatoreSparito: 'L’installatore scaricato non c’è più: si riscarica al prossimo controllo.',
  installatoreCambiato:
    'L’installatore scaricato non corrisponde più a quello pubblicato, e non si installa. ' +
    'Si riscarica al prossimo controllo.',
}

export const testi = catalogo(it, {
  de: {
    inSviluppo:
      'Dieses Klassenbuch läuft in der Entwicklungsumgebung: Es gibt kein installiertes Paket zu ' +
      'aktualisieren.',
    portabile:
      'Das ist die portable Version: Sie aktualisiert sich nicht selbst. Die neue lädt man von der ' +
      'Seite der Releases herunter und legt sie an die Stelle dieser — die Daten neben der ' +
      'Programmdatei bleiben, wo sie sind.',
    altroSistema:
      'Auf diesem System aktualisiert sich das Klassenbuch nicht selbst: Die Releases bringen die ' +
      'automatische Aktualisierung nur für Windows. Die neue Version lädt man von der Seite der ' +
      'Releases herunter.',
    aManoBreve: 'Aktualisierung von Hand',
    nonSiAggiorna: 'Dieses Klassenbuch aktualisiert sich nicht selbst.',
    apriLeRelease: 'Releases öffnen',
    nuova: 'neu',
    controllaAdesso: 'Jetzt prüfen',
    controlloBreve: 'Prüfung läuft',
    controlloFrase: 'Ich frage GitHub, welches die neueste Version ist…',
    controllando: 'Wird geprüft…',
    aggiornatoBreve: 'aktuell',
    aggiornatoFrase: 'Das ist die neueste veröffentlichte Version.',
    ultimoControllo: (quando) => ` Letzte Prüfung: ${quando}.`,
    erroreBreve: 'Prüfung fehlgeschlagen',
    erroreFrase: 'Die Prüfung hat nicht geklappt.',
    disponibileBreve: (nuova) => `${nuova} ist da`,
    disponibileFrase: (nuova, pubblicata, eppure) =>
      `Version ${nuova} ist da${pubblicata ? `, veröffentlicht am ${pubblicata}` : ''}. ` +
      `Sie ist noch nicht heruntergeladen.${eppure}`,
    scaricoBreve: (nuova) => `lade ${nuova} herunter`,
    scaricoBreveQuota: (nuova, percento) => `lade ${nuova} herunter: ${percento}%`,
    scaricoFrase: (nuova) => `Ich lade Version ${nuova} herunter…`,
    scaricoFraseQuota: (nuova, scesi, totale) => `Ich lade Version ${nuova} herunter: ${scesi} von ${totale}.`,
    pronta: (nuova) => `${nuova} bereit`,
    prontaAllUscita: (nuova) =>
      `Version ${nuova} ist heruntergeladen und installiert sich von selbst, wenn du das ` +
      'Klassenbuch beendest. Wenn du nicht warten willst, starte jetzt neu.',
    prontaAMano: (nuova) =>
      `Version ${nuova} ist heruntergeladen. Sie wird installiert, wenn du «Neu starten und ` +
      'aktualisieren» drückst.',
    riavviaEAggiorna: 'Neu starten und aktualisieren',
    installazioneBreve: 'Installation läuft',
    installazioneFrase: (nuova) =>
      `Ich bereite die Installation von ${nuova} vor: Gleich schliesst sich das Klassenbuch, und ` +
      'ein Fenster zeigt die Aktualisierung.',
    fermoBreve: 'noch nicht geprüft',
    fermoDaSé: 'Noch nicht geprüft: Das geschieht von selbst kurz nach dem Start.',
    fermoSpento: 'Die automatische Prüfung ist ausgeschaltet: Geprüft wird mit «Jetzt prüfen».',
    senzaRete:
      'GitHub antwortet nicht: Vielleicht fehlt die Verbindung. Bei der nächsten Prüfung wird es ' +
      'erneut versucht.',
    senzaRelease: 'Es gibt kein Release mit der Aktualisierung: Vielleicht wird es noch vorbereitet.',
    scartato:
      'Das heruntergeladene Installationsprogramm stimmt nicht mit dem veröffentlichten überein ' +
      'und wurde verworfen.',
    installatoreSparito:
      'Das heruntergeladene Installationsprogramm ist nicht mehr da: Es wird bei der nächsten ' +
      'Prüfung erneut heruntergeladen.',
    installatoreCambiato:
      'Das heruntergeladene Installationsprogramm stimmt nicht mehr mit dem veröffentlichten ' +
      'überein und wird nicht installiert. Es wird bei der nächsten Prüfung erneut heruntergeladen.',
  },
  fr: {
    inSviluppo: 'Ce registre tourne en développement : il n’y a pas de paquet installé à mettre à jour.',
    portabile:
      'C’est la version portable : elle ne se met pas à jour toute seule. On télécharge la ' +
      'nouvelle depuis la page des versions publiées et on la met à la place de celle-ci — les ' +
      'données à côté de l’exécutable restent où elles sont.',
    altroSistema:
      'Sur ce système, le registre ne se met pas à jour tout seul : les versions publiées ' +
      'n’apportent la mise à jour automatique que pour Windows. La nouvelle version se télécharge ' +
      'depuis la page des versions publiées.',
    aManoBreve: 'mise à jour manuelle',
    nonSiAggiorna: 'Ce registre ne se met pas à jour tout seul.',
    apriLeRelease: 'Ouvrir les versions publiées',
    nuova: 'nouvelle',
    controllaAdesso: 'Vérifier maintenant',
    controlloBreve: 'vérification en cours',
    controlloFrase: 'Je demande à GitHub quelle est la dernière version…',
    controllando: 'Vérification…',
    aggiornatoBreve: 'c’est la dernière',
    aggiornatoFrase: 'C’est la dernière version publiée.',
    ultimoControllo: (quando) => ` Dernière vérification : ${quando}.`,
    erroreBreve: 'vérification échouée',
    erroreFrase: 'La vérification n’a pas marché.',
    disponibileBreve: (nuova) => `la ${nuova} est là`,
    disponibileFrase: (nuova, pubblicata, eppure) =>
      `La version ${nuova} est là${pubblicata ? `, publiée le ${pubblicata}` : ''}. ` +
      `Elle n’est pas encore téléchargée.${eppure}`,
    scaricoBreve: (nuova) => `téléchargement de la ${nuova}`,
    scaricoBreveQuota: (nuova, percento) => `téléchargement de la ${nuova} : ${percento} %`,
    scaricoFrase: (nuova) => `Je télécharge la version ${nuova}…`,
    scaricoFraseQuota: (nuova, scesi, totale) => `Je télécharge la version ${nuova} : ${scesi} sur ${totale}.`,
    pronta: (nuova) => `${nuova} prête`,
    prontaAllUscita: (nuova) =>
      `La version ${nuova} est téléchargée et s’installe toute seule quand tu quittes le ` +
      'registre. Si tu ne veux pas attendre, redémarre maintenant.',
    prontaAMano: (nuova) =>
      `La version ${nuova} est téléchargée. Elle s’installe quand tu appuies sur « Redémarrer et ` +
      'mettre à jour ».',
    riavviaEAggiorna: 'Redémarrer et mettre à jour',
    installazioneBreve: 'installation en cours',
    installazioneFrase: (nuova) =>
      `Je prépare l’installation de la ${nuova} : dans un instant, le registre se ferme et une ` +
      'fenêtre montre la mise à jour.',
    fermoBreve: 'pas encore vérifié',
    fermoDaSé: 'Pas encore vérifié : cela se fait tout seul peu après le démarrage.',
    fermoSpento:
      'La vérification automatique est désactivée : on vérifie en appuyant sur « Vérifier maintenant ».',
    senzaRete:
      'GitHub ne répond pas : la connexion manque peut-être. Nouvel essai à la prochaine vérification.',
    senzaRelease:
      'Aucune version publiée ne contient la mise à jour : elle est peut-être encore en préparation.',
    scartato: 'L’installateur téléchargé ne correspond pas à celui publié, et il a été écarté.',
    installatoreSparito:
      'L’installateur téléchargé n’est plus là : il sera téléchargé à nouveau à la prochaine ' +
      'vérification.',
    installatoreCambiato:
      'L’installateur téléchargé ne correspond plus à celui publié, et il ne s’installe pas. Il ' +
      'sera téléchargé à nouveau à la prochaine vérification.',
  },
  en: {
    inSviluppo: 'This register is running in development: there is no installed package to update.',
    portabile:
      'This is the portable version: it doesn’t update itself. Download the new one from the ' +
      'releases page and put it in place of this one — the data next to the program file stays ' +
      'where it is.',
    altroSistema:
      'On this system the register doesn’t update itself: the releases bring automatic updates ' +
      'for Windows only. Download the new version from the releases page.',
    aManoBreve: 'manual update',
    nonSiAggiorna: 'This register doesn’t update itself.',
    apriLeRelease: 'Open the releases',
    nuova: 'new',
    controllaAdesso: 'Check now',
    controlloBreve: 'checking',
    controlloFrase: 'Asking GitHub which is the latest version…',
    controllando: 'Checking…',
    aggiornatoBreve: 'up to date',
    aggiornatoFrase: 'This is the latest published version.',
    ultimoControllo: (quando) => ` Last check: ${quando}.`,
    erroreBreve: 'check failed',
    erroreFrase: 'The check didn’t work.',
    disponibileBreve: (nuova) => `${nuova} is out`,
    disponibileFrase: (nuova, pubblicata, eppure) =>
      `Version ${nuova} is out${pubblicata ? `, published on ${pubblicata}` : ''}. ` +
      `It isn’t downloaded yet.${eppure}`,
    scaricoBreve: (nuova) => `downloading ${nuova}`,
    scaricoBreveQuota: (nuova, percento) => `downloading ${nuova}: ${percento}%`,
    scaricoFrase: (nuova) => `Downloading version ${nuova}…`,
    scaricoFraseQuota: (nuova, scesi, totale) => `Downloading version ${nuova}: ${scesi} of ${totale}.`,
    pronta: (nuova) => `${nuova} ready`,
    prontaAllUscita: (nuova) =>
      `Version ${nuova} is downloaded and installs itself when you quit the register. ` +
      'If you don’t want to wait, restart now.',
    prontaAMano: (nuova) =>
      `Version ${nuova} is downloaded. It installs when you press “Restart and update”.`,
    riavviaEAggiorna: 'Restart and update',
    installazioneBreve: 'installing',
    installazioneFrase: (nuova) =>
      `Getting ready to install ${nuova}: in a moment the register closes and a window shows ` +
      'the update.',
    fermoBreve: 'not checked yet',
    fermoDaSé: 'Not checked yet: it happens by itself shortly after start-up.',
    fermoSpento: 'Automatic checking is off: check by pressing “Check now”.',
    senzaRete: 'GitHub isn’t answering: maybe the connection is down. It will try again at the next check.',
    senzaRelease: 'No release with the update can be found: maybe it is still being prepared.',
    scartato: 'The downloaded installer doesn’t match the published one, and has been discarded.',
    installatoreSparito:
      'The downloaded installer is no longer there: it will be downloaded again at the next check.',
    installatoreCambiato:
      'The downloaded installer no longer matches the published one, and won’t be installed. It ' +
      'will be downloaded again at the next check.',
  },
})
