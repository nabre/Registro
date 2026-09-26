// I testi della scheda degli aggiornamenti (`settings/updates.ts`). Frase,
// pastiglia e gesto arrivano già scritti dall'host (`environment/updates.ts`).

import { catalogo } from '../../../i18n/index.js'

const it = {
  installare: (versione: string) => `Installare la versione ${versione}?`,
  installareTesto:
    'Il registro salva quel che hai scritto, si chiude e si aggiorna da sé nella stessa ' +
    'cartella, senza domande: una finestra mostra a che punto è e alla fine lo riapre. ' +
    'Il documento d’anno non si tocca.',
  scarico: (versione: string) => `Scarico della versione ${versione}`,
  cheCosaCambia: (versione: string) => `Che cosa cambia nella ${versione}`,
  paginaRelease: 'Pagina delle release',
  versioneRegistro: 'Versione del registro',
  stoLeggendo: 'Sto leggendo la versione…',
  versione: (versione: string) => `Versione ${versione}`,
  versioneAiuto: 'quella che gira adesso su questo computer',
  daGithub: 'Le versioni arrivano da GitHub; il controllo non manda niente del registro. ',
}

export const testi = catalogo(it, {
  de: {
    installare: (versione) => `Version ${versione} installieren?`,
    installareTesto:
      'Das Klassenbuch speichert, was du geschrieben hast, schliesst sich und aktualisiert sich ' +
      'selbst im selben Ordner, ohne Rückfragen: Ein Fenster zeigt, wie weit es ist, und öffnet ' +
      'es am Ende wieder. Das Jahresdokument bleibt unberührt.',
    scarico: (versione) => `Download der Version ${versione}`,
    cheCosaCambia: (versione) => `Was sich in ${versione} ändert`,
    paginaRelease: 'Seite der Releases',
    versioneRegistro: 'Version des Klassenbuchs',
    stoLeggendo: 'Die Version wird gelesen…',
    versione: (versione) => `Version ${versione}`,
    versioneAiuto: 'die, die jetzt auf diesem Computer läuft',
    daGithub: 'Die Versionen kommen von GitHub; die Prüfung schickt nichts aus dem Klassenbuch. ',
  },
  fr: {
    installare: (versione) => `Installer la version ${versione} ?`,
    installareTesto:
      'Le registre enregistre ce que tu as écrit, se ferme et se met à jour tout seul dans le ' +
      'même dossier, sans questions : une fenêtre montre où il en est et le rouvre à la fin. ' +
      'Le document de l’année n’est pas touché.',
    scarico: (versione) => `Téléchargement de la version ${versione}`,
    cheCosaCambia: (versione) => `Ce qui change dans la ${versione}`,
    paginaRelease: 'Page des versions',
    versioneRegistro: 'Version du registre',
    stoLeggendo: 'Lecture de la version…',
    versione: (versione) => `Version ${versione}`,
    versioneAiuto: 'celle qui tourne en ce moment sur cet ordinateur',
    daGithub: 'Les versions viennent de GitHub ; la vérification n’envoie rien du registre. ',
  },
  en: {
    installare: (versione) => `Install version ${versione}?`,
    installareTesto:
      'The register saves what you have written, closes and updates itself in the same folder, ' +
      'without questions: a window shows how far it has got and reopens it at the end. The ' +
      'year’s document is not touched.',
    scarico: (versione) => `Downloading version ${versione}`,
    cheCosaCambia: (versione) => `What changes in ${versione}`,
    paginaRelease: 'Releases page',
    versioneRegistro: 'Register version',
    stoLeggendo: 'Reading the version…',
    versione: (versione) => `Version ${versione}`,
    versioneAiuto: 'the one running on this computer now',
    daGithub: 'Versions come from GitHub; the check sends nothing from the register. ',
  },
})
