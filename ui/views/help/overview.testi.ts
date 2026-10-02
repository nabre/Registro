import { catalogo } from '#core/i18n/index.js'
import type { TestiSezione } from './types.js'

const it: TestiSezione = {
  titolo: 'Panoramica della progettazione',
  sommario: 'I piani lezione, i progetti e le loro risorse in uno schema di collegamenti del corso.',
  voci: [
    { termine: 'Il corso e la progettazione', testo: 'Scegli il corso sopra **Registro** e ' +
      '**Progettazione**, oppure nella barra dei comandi della panoramica. In Progettazione trovi ' +
      '**Panoramica** e **Piani lezione**; **Progetti** è nel gruppo **Anno scolastico**. ' +
      'Le tre pagine seguono lo stesso corso del registro.' },
    { termine: 'Leggere le colonne', testo: 'Ogni lezione ha un riquadro con le tappe del suo piano. ' +
      'Alla fine trovi anche i piani non ancora assegnati a una lezione. A sinistra trovi progetti ' +
      'e fasi, al centro le lezioni, a destra le risorse collegate. I materiali specifici del progetto ' +
      'restano nel suo riquadro. In ogni colonna i riquadri si susseguono dall’alto verso il basso. ' +
      'Ogni risorsa segue lo scorrimento fino alla sua ultima relazione; le linee seguono i riquadri.' },
    { termine: 'Seguire i collegamenti', testo: 'Le linee uniscono le tappe ai progetti, ai file, ' +
      'alle pendenze, al check e alle valutazioni. Passa su un riquadro o raggiungilo con Tab per ' +
      'evidenziare le linee. Le porte nelle tappe portano alla risorsa; il titolo della risorsa la ' +
      'apre. Una valutazione prevista resta distinta dalla prova già creata. Il titolo della ' +
      'lezione o della tappa apre il piano per modificarlo.' },
    { termine: 'Preparare le fasi e distribuirle nelle lezioni',
      testo: 'In **Progetti**, ogni fase ha titolo, descrizione e una scaletta di attività ' +
        'con durata indicativa. Nel piano usa **Importa dal progetto**: scegli la fase e le ' +
        'attività da svolgere. Una fase può continuare in altre lezioni. Il contenuto didattico ' +
        'si aggiorna nei due sensi al salvataggio; la durata e gli allegati del piano restano ' +
        'locali. Lo schema resta al 100%.' },
  ],
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Übersicht der Planung',
    sommario: 'Unterrichtspläne, Projekte und ihre Ressourcen im Verbindungsschema des Kurses.',
    voci: [
      { termine: 'Kurs und Planung', testo: 'Wähle den Kurs über **Klassenbuch** und **Planung**. ' +
        'Du kannst den Kurs auch in der Befehlsleiste der Übersicht wählen. Unter Planung findest du ' +
        '**Übersicht** und **Unterrichtspläne**; **Projekte** steht in der Gruppe **Schuljahr**. ' +
        'Alle drei Seiten folgen demselben Kurs wie das Klassenbuch.' },
      { termine: 'Die Spalten lesen', testo: 'Jede Stunde hat einen Kasten mit den Etappen ihres Plans. ' +
        'Am Ende stehen auch die noch nicht zugewiesenen Pläne. Links stehen Projekte und Etappen, ' +
        'in der Mitte die Stunden und rechts die verbundenen Ressourcen. Eigene Projektmaterialien ' +
        'bleiben im Projektkasten. In jeder Spalte folgen die Kästen von oben nach unten. ' +
        'Jede Ressource folgt dem Scrollen bis zu ihrer letzten Verbindung; die Linien folgen den Kästen.' },
      { termine: 'Verbindungen folgen', testo: 'Linien verbinden Etappen mit Projekten, Dateien, ' +
        'Pendenzen, Check und Beurteilungen. Zeige auf einen Kasten oder erreiche ihn mit Tab, um die ' +
        'Linien hervorzuheben. Die Verweise in den Etappen führen zur Ressource; ihr Titel öffnet sie. ' +
        'Eine geplante Beurteilung unterscheidet sich von einer bereits erstellten Prüfung. ' +
        'Der Titel der Stunde oder Etappe öffnet den Plan zum Bearbeiten.' },
      { termine: 'Etappen vorbereiten und auf Stunden verteilen',
        testo: 'In **Projekte** hat jede Etappe einen Titel, eine Beschreibung und einen Ablauf ' +
          'mit Richtzeiten. Importiere im Plan die gewählten Aktivitäten aus einer Projektetappe. ' +
          'Die Etappe kann in weiteren Stunden fortgesetzt werden. Beim Speichern wird der Inhalt ' +
          'in beide Richtungen aktualisiert; Dauer und Anhänge im Plan bleiben lokal. ' +
          'Das Schema bleibt bei 100 %.' },
    ],
  },
  fr: {
    titolo: 'Vue d’ensemble de la planification',
    sommario: 'Les plans de leçon, les projets et leurs ressources dans un schéma de liens du cours.',
    voci: [
      { termine: 'Le cours et la planification', testo: 'Choisis le cours au-dessus de **Registre** et ' +
        '**Planification**, ou dans la barre de commandes de la vue d’ensemble. Dans Planification, ' +
        'tu trouves **Vue d’ensemble** et **Plans de leçon** ; **Projets** est dans le groupe ' +
        '**Année scolaire**. Les trois pages suivent le même cours que le registre.' },
      { termine: 'Lire les colonnes', testo: 'Chaque leçon a un cadre avec les étapes de son plan. ' +
        'À la fin figurent aussi les plans pas encore attribués. À gauche se trouvent les projets ' +
        'et leurs phases, au centre les leçons et à droite les ressources liées. Les ressources ' +
        'propres au projet restent dans son cadre. Dans chaque colonne, les cadres se suivent ' +
        'de haut en bas. Chaque ressource suit le défilement jusqu’à sa dernière relation ; ' +
        'les lignes suivent les cadres.' },
      { termine: 'Suivre les liens', testo: 'Les lignes relient les étapes aux projets, fichiers, tâches ' +
        'en suspens, check et évaluations. Survole un cadre ou atteins-le avec Tab pour mettre les lignes ' +
        'en évidence. Les liens des étapes mènent à la ressource ; son titre l’ouvre. Une évaluation ' +
        'prévue se distingue d’une épreuve déjà créée. Le titre de la leçon ou de l’étape ouvre le plan à modifier.' },
      { termine: 'Préparer les phases et les répartir entre les leçons',
        testo: 'Dans **Projets**, chaque phase a un titre, une description et une liste d’activités ' +
          'avec une durée indicative. Importe les activités choisies d’une phase dans le plan. ' +
          'La phase peut continuer dans d’autres leçons. À l’enregistrement, le contenu est mis ' +
          'à jour dans les deux sens ; la durée et les pièces jointes du plan restent locales. ' +
          '**Adapter à la fenêtre** affiche tout le schéma.' },
    ],
  },
  en: {
    titolo: 'Planning overview',
    sommario: 'Lesson plans, projects and their resources in a diagram of course connections.',
    voci: [
      { termine: 'Course and planning', testo: 'Choose the course above **Register** and **Planning**. ' +
        'You can also choose the course in the overview command bar. Planning contains **Overview** ' +
        'and **Lesson plans**; **Projects** is in the **School year** group. All three pages follow ' +
        'the same course as the register.' },
      { termine: 'Reading the columns', testo: 'Each lesson has a box with its plan steps. ' +
        'Plans not yet assigned appear at the end. Projects and phases sit on the left, lessons ' +
        'in the centre and linked resources on the right. Project materials stay inside their ' +
        'project boxes. In each column, boxes follow from top to bottom. Resources follow scrolling ' +
        'until their last connection; lines follow the boxes.' },
      { termine: 'Following connections', testo: 'Lines connect steps to projects, files, pending items, ' +
        'check and assessments. Hover over a box or reach it with Tab to highlight the lines. Step links ' +
        'lead to the resource; its title opens it. A planned assessment is distinct from a test already ' +
        'created. The lesson or step title opens the plan for editing.' },
      { termine: 'Prepare phases and spread them across lessons',
        testo: 'In **Projects**, each phase has a title, a description and a sequence of activities ' +
          'with indicative durations. Import selected activities from a phase into the plan. ' +
          'The phase can continue in other lessons. Saving updates the teaching content in both ' +
          'directions; the plan’s duration and attachments stay local. The diagram stays at ' +
          '100%.' },
    ],
  },
})
