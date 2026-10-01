// I testi di `projects.ts`: i rifiuti delle azioni sul progetto.

import { catalogo } from '#core/i18n/index.js'

const it = {
  compitoSparito: 'Quel compito non c’è più nel progetto.',
  giudizioSparito: 'Quel giudizio non c’è più nel progetto.',
  criterioSparito: 'Quel criterio non c’è più nel progetto.',
  livelloSconosciuto: (livello: string) => `La scala del progetto non ha il livello «${livello}».`,
  lezioneDiAltroCorso: 'Quella lezione è di un altro corso: il progetto ne seguirebbe la data.',
  altroCorso: 'Un progetto non cambia corso: le sue voci sono delle persone di quella classe.',
  fileEstranei: (n: number) =>
    n === 1
      ? 'Un file indicato nelle risorse non è del progetto: i file si aggiungono dalla pagina del progetto.'
      : `${n} file indicati nelle risorse non sono del progetto: i file si aggiungono dalla pagina del progetto.`,
  compitoSenzaTitolo: 'Il compito deve avere un titolo.',
  giudizioVuoto: 'Il giudizio deve dire qualcosa.',
  nessunoDaIniziare: 'Nessuna persona indicata.',
  progettoAltroCorso: 'Quel progetto è di un altro corso.',
  celleCadrebbero: (n: number, criteri: readonly string[], livelli: readonly string[]) => {
    const dove = [
      criteri.length > 0 ? `criteri tolti: ${criteri.join(', ')}` : '',
      livelli.length > 0 ? `livelli tolti o rinominati: ${livelli.join(', ')}` : '',
    ].filter(Boolean).join('; ')
    return `Salvando così si perderebbe${n === 1 ? ' 1 cella' : `ro ${n} celle`} della matrice (${dove}). ` +
      'Rimetti criteri e livelli com’erano, o conferma con «scartaCelle».'
  },
  celleScartate: (n: number) =>
    n === 1 ? '1 cella tolta dalla matrice.' : `${n} celle tolte dalla matrice.`,
  tappeSpostate: (n: number) =>
    n === 1
      ? '1 tappa dei piani era in una fase tolta: ora sta nella fase rimasta che la precedeva (o nella prima).'
      : `${n} tappe dei piani erano in fasi tolte: ora stanno nella fase rimasta che le precedeva (o nella prima).`,
}

export const testi = catalogo(it, {
  de: {
    compitoSparito: 'Diese Aufgabe gibt es im Projekt nicht mehr.',
    giudizioSparito: 'Diese Einschätzung gibt es im Projekt nicht mehr.',
    criterioSparito: 'Dieses Kriterium gibt es im Projekt nicht mehr.',
    livelloSconosciuto: (livello) => `Die Skala des Projekts hat keine Stufe «${livello}».`,
    lezioneDiAltroCorso:
      'Diese Stunde gehört zu einem anderen Kurs: Das Projekt würde ihrem Datum folgen.',
    altroCorso:
      'Ein Projekt wechselt den Kurs nicht: Seine Einträge gehören den Personen dieser Klasse.',
    fileEstranei: (n) =>
      n === 1
        ? 'Eine Datei in den Ressourcen gehört nicht zum Projekt: Dateien fügst du auf der Projektseite hinzu.'
        : `${n} Dateien in den Ressourcen gehören nicht zum Projekt: Dateien fügst du auf der Projektseite hinzu.`,
    compitoSenzaTitolo: 'Die Aufgabe braucht einen Titel.',
    giudizioVuoto: 'Die Einschätzung muss etwas sagen.',
    nessunoDaIniziare: 'Keine Person angegeben.',
    progettoAltroCorso: 'Dieses Projekt gehört zu einem anderen Kurs.',
    celleCadrebbero: (n, criteri, livelli) => {
      const wo = [
        criteri.length > 0 ? `entfernte Kriterien: ${criteri.join(', ')}` : '',
        livelli.length > 0 ? `entfernte oder umbenannte Stufen: ${livelli.join(', ')}` : '',
      ].filter(Boolean).join('; ')
      return `So gespeichert ginge${n === 1 ? ' 1 Zelle' : `n ${n} Zellen`} der Matrix verloren (${wo}). ` +
        'Stelle Kriterien und Stufen wieder her oder bestätige mit «scartaCelle».'
    },
    celleScartate: (n) =>
      n === 1 ? '1 Zelle aus der Matrix entfernt.' : `${n} Zellen aus der Matrix entfernt.`,
    tappeSpostate: (n) =>
      n === 1
        ? '1 Etappe der Pläne lag in einer entfernten Phase: Sie liegt jetzt in der verbliebenen Phase davor (oder in der ersten).'
        : `${n} Etappen der Pläne lagen in entfernten Phasen: Sie liegen jetzt in der verbliebenen Phase davor (oder in der ersten).`,
  },
  fr: {
    compitoSparito: 'Cette tâche n’existe plus dans le projet.',
    giudizioSparito: 'Cette appréciation n’existe plus dans le projet.',
    criterioSparito: 'Ce critère n’existe plus dans le projet.',
    livelloSconosciuto: (livello) => `L’échelle du projet n’a pas le niveau « ${livello} ».`,
    lezioneDiAltroCorso:
      'Cette leçon appartient à un autre cours : le projet en suivrait la date.',
    altroCorso:
      'Un projet ne change pas de cours : ses entrées sont celles des personnes de cette classe.',
    fileEstranei: (n) =>
      n === 1
        ? 'Un fichier indiqué dans les ressources n’est pas du projet : les fichiers s’ajoutent depuis la page du projet.'
        : `${n} fichiers indiqués dans les ressources ne sont pas du projet : les fichiers s’ajoutent depuis la page du projet.`,
    compitoSenzaTitolo: 'La tâche doit avoir un titre.',
    giudizioVuoto: 'L’appréciation doit dire quelque chose.',
    nessunoDaIniziare: 'Aucune personne indiquée.',
    progettoAltroCorso: 'Ce projet appartient à un autre cours.',
    celleCadrebbero: (n, criteri, livelli) => {
      const ou = [
        criteri.length > 0 ? `critères retirés : ${criteri.join(', ')}` : '',
        livelli.length > 0 ? `niveaux retirés ou renommés : ${livelli.join(', ')}` : '',
      ].filter(Boolean).join(' ; ')
      return `Enregistré ainsi, ${n === 1 ? '1 cellule' : `${n} cellules`} de la matrice ` +
        `${n === 1 ? 'serait perdue' : 'seraient perdues'} (${ou}). ` +
        'Remets critères et niveaux comme avant, ou confirme avec « scartaCelle ».'
    },
    celleScartate: (n) =>
      n === 1 ? '1 cellule retirée de la matrice.' : `${n} cellules retirées de la matrice.`,
    tappeSpostate: (n) =>
      n === 1
        ? '1 étape des plans était dans une phase retirée : elle est maintenant dans la phase restante qui la précédait (ou dans la première).'
        : `${n} étapes des plans étaient dans des phases retirées : elles sont maintenant dans la phase restante qui les précédait (ou dans la première).`,
  },
  en: {
    compitoSparito: 'That task is no longer in the project.',
    giudizioSparito: 'That comment is no longer in the project.',
    criterioSparito: 'That criterion is no longer in the project.',
    livelloSconosciuto: (livello) => `The project’s scale has no level “${livello}”.`,
    lezioneDiAltroCorso:
      'That lesson belongs to another course: the project would follow its date.',
    altroCorso:
      'A project doesn’t change course: its entries belong to the people of that class.',
    fileEstranei: (n) =>
      n === 1
        ? 'A file listed in the resources isn’t the project’s: files are added from the project page.'
        : `${n} files listed in the resources aren’t the project’s: files are added from the project page.`,
    compitoSenzaTitolo: 'The task must have a title.',
    giudizioVuoto: 'The comment must say something.',
    nessunoDaIniziare: 'No one specified.',
    progettoAltroCorso: 'That project belongs to another course.',
    celleCadrebbero: (n, criteri, livelli) => {
      const where = [
        criteri.length > 0 ? `removed criteria: ${criteri.join(', ')}` : '',
        livelli.length > 0 ? `removed or renamed levels: ${livelli.join(', ')}` : '',
      ].filter(Boolean).join('; ')
      return `Saving this would lose ${n === 1 ? '1 cell' : `${n} cells`} of the matrix (${where}). ` +
        'Put criteria and levels back as they were, or confirm with “scartaCelle”.'
    },
    celleScartate: (n) =>
      n === 1 ? '1 cell removed from the matrix.' : `${n} cells removed from the matrix.`,
    tappeSpostate: (n) =>
      n === 1
        ? '1 plan step was in a removed phase: it is now in the remaining phase before it (or in the first).'
        : `${n} plan steps were in removed phases: they are now in the remaining phase before them (or in the first).`,
  },
})
