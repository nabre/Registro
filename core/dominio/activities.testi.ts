// Etichette, esempi, aiuti e unità dei parametri di ogni tipo di attività
// (`activities.ts`). Le chiavi sono quelle salvate in `attivita.parametri` e
// non si traducono.

import { catalogo } from '../i18n/index.js'

const it = {
  parametri: {
    ordineDelGiorno: { etichetta: 'Ordine del giorno', segnaposto: 'gita, moduli, assenze' },
    materia: { etichetta: 'Di che cosa si tratta' },
    daRiportare: {
      etichetta: 'Da riportare alla sede',
      aiuto: 'Se resta qualcosa da dire in segreteria o al capoclasse, resta scritto che va detto.',
    },
    aggancio: { etichetta: 'Aggancio', segnaposto: 'la lezione scorsa, un esempio dal cantiere' },
    supporto: { etichetta: 'Supporto' },
    riferimento: { etichetta: 'Riferimento', segnaposto: 'pagine 84–88' },
    quanti: { etichetta: 'Quanti', unita: 'esercizi' },
    fonte: { etichetta: 'Da dove', segnaposto: 'scheda 3, esercizi 4–7' },
    correzione: { etichetta: 'Correzione' },
    postazione: { etichetta: 'Postazione', segnaposto: 'aula CAD, banco 1–12' },
    sicurezza: {
      etichetta: 'Istruzioni di sicurezza',
      aiuto: 'Da dare prima di cominciare: se la tappa le prevede, resta scritto che vanno date.',
    },
    materiale: { etichetta: 'Materiale', segnaposto: 'squadre, calibro' },
    traccia: { etichetta: 'Traccia', segnaposto: 'la domanda da cui si parte' },
    durataProva: { etichetta: 'Durata della prova', unita: 'min' },
    punti: { etichetta: 'Punteggio', unita: 'punti' },
    ammesso: { etichetta: 'Materiale ammesso', segnaposto: 'formulario, calcolatrice' },
    dimensione: { etichetta: 'Grandezza dei gruppi', unita: 'per gruppo' },
    composizione: { etichetta: 'Come si formano' },
    consegna: { etichetta: 'Che cosa devono produrre', segnaposto: 'un cartellone, tre slide' },
    argomenti: { etichetta: 'Su che cosa', segnaposto: 'proporzioni, percentuali' },
    perQuando: { etichetta: 'Per quando', segnaposto: 'la prossima volta' },
    tempo: { etichetta: 'Tempo stimato', unita: 'min' },
  },
  /**
   * Una parola nel riassunto di una riga («gruppi da 3 · a sorteggio»):
   * minuscola dove la lingua lo vuole; in tedesco resta maiuscola.
   */
  nelRiassunto: (parola: string) => parola.toLowerCase(),
}

export const testi = catalogo(it, {
  de: {
    parametri: {
      ordineDelGiorno: { etichetta: 'Traktanden', segnaposto: 'Ausflug, Formulare, Absenzen' },
      materia: { etichetta: 'Worum es geht' },
      daRiportare: {
        etichetta: 'An die Schule weiterzuleiten',
        aiuto:
          'Wenn dem Sekretariat oder dem Klassenchef noch etwas mitzuteilen ist, bleibt ' +
          'festgehalten, dass es gesagt werden muss.',
      },
      aggancio: {
        etichetta: 'Einstieg',
        segnaposto: 'die letzte Stunde, ein Beispiel von der Baustelle',
      },
      supporto: { etichetta: 'Hilfsmittel' },
      riferimento: { etichetta: 'Verweis', segnaposto: 'Seiten 84–88' },
      quanti: { etichetta: 'Wie viele', unita: 'Übungen' },
      fonte: { etichetta: 'Woher', segnaposto: 'Blatt 3, Übungen 4–7' },
      correzione: { etichetta: 'Korrektur' },
      postazione: { etichetta: 'Arbeitsplatz', segnaposto: 'CAD-Raum, Platz 1–12' },
      sicurezza: {
        etichetta: 'Sicherheitsinstruktion',
        aiuto:
          'Vor dem Beginn zu geben: Sieht die Etappe sie vor, bleibt festgehalten, dass sie ' +
          'gegeben werden muss.',
      },
      materiale: { etichetta: 'Material', segnaposto: 'Geodreiecke, Schieblehre' },
      traccia: { etichetta: 'Leitfrage', segnaposto: 'die Frage, von der man ausgeht' },
      durataProva: { etichetta: 'Dauer der Prüfung', unita: 'Min.' },
      punti: { etichetta: 'Punktzahl', unita: 'Punkte' },
      ammesso: { etichetta: 'Erlaubte Hilfsmittel', segnaposto: 'Formelsammlung, Taschenrechner' },
      dimensione: { etichetta: 'Gruppengrösse', unita: 'pro Gruppe' },
      composizione: { etichetta: 'Wie sie gebildet werden' },
      consegna: { etichetta: 'Was sie erarbeiten sollen', segnaposto: 'ein Plakat, drei Folien' },
      argomenti: { etichetta: 'Worüber', segnaposto: 'Proportionen, Prozente' },
      perQuando: { etichetta: 'Bis wann', segnaposto: 'nächstes Mal' },
      tempo: { etichetta: 'Geschätzte Zeit', unita: 'Min.' },
    },
    nelRiassunto: (parola) => parola,
  },
  fr: {
    parametri: {
      ordineDelGiorno: {
        etichetta: 'Ordre du jour',
        segnaposto: 'course d’école, formulaires, absences',
      },
      materia: { etichetta: 'De quoi il s’agit' },
      daRiportare: {
        etichetta: 'À transmettre à l’école',
        aiuto:
          'S’il reste quelque chose à dire au secrétariat ou au délégué de classe, il reste ' +
          'noté que cela doit être dit.',
      },
      aggancio: {
        etichetta: 'Accroche',
        segnaposto: 'la leçon précédente, un exemple du chantier',
      },
      supporto: { etichetta: 'Support' },
      riferimento: { etichetta: 'Référence', segnaposto: 'pages 84–88' },
      quanti: { etichetta: 'Combien', unita: 'exercices' },
      fonte: { etichetta: 'D’où', segnaposto: 'fiche 3, exercices 4–7' },
      correzione: { etichetta: 'Correction' },
      postazione: { etichetta: 'Poste de travail', segnaposto: 'salle CAO, postes 1–12' },
      sicurezza: {
        etichetta: 'Consignes de sécurité',
        aiuto:
          'À donner avant de commencer : si l’étape les prévoit, il reste noté qu’elles ' +
          'doivent être données.',
      },
      materiale: { etichetta: 'Matériel', segnaposto: 'équerres, pied à coulisse' },
      traccia: { etichetta: 'Question de départ', segnaposto: 'la question dont on part' },
      durataProva: { etichetta: 'Durée de l’épreuve', unita: 'min' },
      punti: { etichetta: 'Total des points', unita: 'points' },
      ammesso: { etichetta: 'Matériel autorisé', segnaposto: 'formulaire, calculatrice' },
      dimensione: { etichetta: 'Taille des groupes', unita: 'par groupe' },
      composizione: { etichetta: 'Comment ils se forment' },
      consegna: {
        etichetta: 'Ce qu’ils doivent produire',
        segnaposto: 'une affiche, trois diapositives',
      },
      argomenti: { etichetta: 'Sur quoi', segnaposto: 'proportions, pourcentages' },
      perQuando: { etichetta: 'Pour quand', segnaposto: 'la prochaine fois' },
      tempo: { etichetta: 'Temps estimé', unita: 'min' },
    },
    nelRiassunto: (parola) => parola.toLowerCase(),
  },
  en: {
    parametri: {
      ordineDelGiorno: { etichetta: 'Agenda', segnaposto: 'trip, forms, absences' },
      materia: { etichetta: 'What it’s about' },
      daRiportare: {
        etichetta: 'To pass on to the school',
        aiuto:
          'If something still needs to be passed on to the office or the class representative, ' +
          'it stays on record that it must be said.',
      },
      aggancio: { etichetta: 'Hook', segnaposto: 'last lesson, an example from the building site' },
      supporto: { etichetta: 'Teaching aid' },
      riferimento: { etichetta: 'Reference', segnaposto: 'pages 84–88' },
      quanti: { etichetta: 'How many', unita: 'exercises' },
      fonte: { etichetta: 'Where from', segnaposto: 'worksheet 3, exercises 4–7' },
      correzione: { etichetta: 'Correction' },
      postazione: { etichetta: 'Workstation', segnaposto: 'CAD room, benches 1–12' },
      sicurezza: {
        etichetta: 'Safety instructions',
        aiuto:
          'To give before starting: if the step calls for them, it stays on record that they ' +
          'must be given.',
      },
      materiale: { etichetta: 'Materials', segnaposto: 'set squares, callipers' },
      traccia: { etichetta: 'Prompt', segnaposto: 'the question you start from' },
      durataProva: { etichetta: 'Test duration', unita: 'min' },
      punti: { etichetta: 'Total points', unita: 'points' },
      ammesso: { etichetta: 'Permitted materials', segnaposto: 'formula sheet, calculator' },
      dimensione: { etichetta: 'Group size', unita: 'per group' },
      composizione: { etichetta: 'How they’re formed' },
      consegna: { etichetta: 'What they need to produce', segnaposto: 'a poster, three slides' },
      argomenti: { etichetta: 'What on', segnaposto: 'ratios, percentages' },
      perQuando: { etichetta: 'Due by', segnaposto: 'next time' },
      tempo: { etichetta: 'Estimated time', unita: 'min' },
    },
    nelRiassunto: (parola) => parola.toLowerCase(),
  },
})
