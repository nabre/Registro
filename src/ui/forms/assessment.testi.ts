// I testi di `forms/assessment.ts`: la finestra che corregge un momento di
// valutazione, e il riquadro che dice da dove viene.

import { catalogo } from '../../i18n/index.js'

const it = {
  lezioneDel: (data: string) => `lezione del ${data}`,
  tappa: (titolo: string) => `tappa «${titolo}»`,
  aiutoProvenienza: 'Il legame lo fa la scaletta: si cambia di lì, non da qui.',
  provenienza: 'Provenienza',
  orfano: (motivo: string) =>
    `Non è agganciato a nessuna tappa: ${motivo}. ` +
    'Resta nelle medie, ma non si sa più da che cosa sia uscito: si elimina ' +
    'dall’elenco in cima alla vista Valutazioni.',
  segnapostoTitolo: 'Verifica sulle equazioni',
  aiutoData: 'Nasce dall’ora della prova; si sposta solo per un recupero.',
  peso: 'Peso',
  aiutoPeso: 'Quanto conta nella media: da 0 a 10, decimali ammessi. Zero non fa media.',
  votoMinimo: 'Voto minimo',
  votoMassimo: 'Voto massimo',
  sufficienza: 'Sufficienza',
  segnapostoDescrizione: 'contenuti, criteri, materiale ammesso',
  aggiornato: 'Momento aggiornato.',
  eliminato: 'Momento eliminato.',
}

export const testi = catalogo(it, {
  de: {
    lezioneDel: (data) => `Stunde vom ${data}`,
    tappa: (titolo) => `Etappe «${titolo}»`,
    aiutoProvenienza: 'Die Verknüpfung entsteht im Ablauf: Geändert wird sie dort, nicht hier.',
    provenienza: 'Herkunft',
    orfano: (motivo) =>
      `An keine Etappe geknüpft: ${motivo}. ` +
      'Sie zählt weiter im Durchschnitt, aber man weiss nicht mehr, woher sie stammt: ' +
      'Gelöscht wird sie in der Liste oben in der Ansicht «Beurteilungen».',
    segnapostoTitolo: 'Prüfung zu den Gleichungen',
    aiutoData: 'Kommt von der Stunde der Prüfung; verschieben nur für eine Nachprüfung.',
    peso: 'Gewichtung',
    aiutoPeso:
      'Wie stark sie im Durchschnitt zählt: von 0 bis 10, Dezimalstellen erlaubt. ' +
      'Null zählt nicht für den Durchschnitt.',
    votoMinimo: 'Tiefste Note',
    votoMassimo: 'Höchste Note',
    sufficienza: 'Genügend ab',
    segnapostoDescrizione: 'Inhalte, Kriterien, erlaubte Hilfsmittel',
    aggiornato: 'Beurteilung aktualisiert.',
    eliminato: 'Beurteilung gelöscht.',
  },
  fr: {
    lezioneDel: (data) => `leçon du ${data}`,
    tappa: (titolo) => `étape « ${titolo} »`,
    aiutoProvenienza: 'C’est le déroulement qui fait le lien : il se change là-bas, pas ici.',
    provenienza: 'Provenance',
    orfano: (motivo) =>
      `Rattachée à aucune étape : ${motivo}. ` +
      'Elle compte toujours dans les moyennes, mais on ne sait plus d’où elle vient : on la ' +
      'supprime depuis la liste en haut de la vue Évaluations.',
    segnapostoTitolo: 'Contrôle sur les équations',
    aiutoData: 'Vient de la leçon de l’épreuve ; ne se déplace que pour un rattrapage.',
    peso: 'Pondération',
    aiutoPeso:
      'Son poids dans la moyenne : de 0 à 10, décimales admises. Zéro ne compte pas dans ' +
      'la moyenne.',
    votoMinimo: 'Note minimale',
    votoMassimo: 'Note maximale',
    sufficienza: 'Seuil de suffisance',
    segnapostoDescrizione: 'contenus, critères, matériel autorisé',
    aggiornato: 'Évaluation mise à jour.',
    eliminato: 'Évaluation supprimée.',
  },
  en: {
    lezioneDel: (data) => `lesson on ${data}`,
    tappa: (titolo) => `step “${titolo}”`,
    aiutoProvenienza: 'The outline makes the link: change it there, not here.',
    provenienza: 'Origin',
    orfano: (motivo) =>
      `Not linked to any step: ${motivo}. ` +
      'It still counts towards the averages, but where it came from is no longer known: ' +
      'delete it from the list at the top of the Assessments view.',
    segnapostoTitolo: 'Test on equations',
    aiutoData: 'Comes from the lesson of the test; move it only for a resit.',
    peso: 'Weight',
    aiutoPeso: 'How much it counts in the average: 0 to 10, decimals allowed. Zero leaves it out.',
    votoMinimo: 'Lowest grade',
    votoMassimo: 'Highest grade',
    sufficienza: 'Pass mark',
    segnapostoDescrizione: 'content, criteria, materials allowed',
    aggiornato: 'Assessment updated.',
    eliminato: 'Assessment deleted.',
  },
})
