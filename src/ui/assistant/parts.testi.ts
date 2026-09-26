// I testi delle parti del contesto (`parts.ts`): gli otto interruttori, le tre
// scorciatoie e il riassunto di ogni parte. I nomi delle tendine li scrive
// `ui/viewpoint.ts`.

import { catalogo } from '../../i18n/index.js'

const it = {
  parti: {
    pagina: {
      testo: 'La pagina che guardo',
      aiuto:
        'Solo il nome della pagina, della scheda e della sezione aperte. Le tendine e i filtri ' +
        'qui sotto non dipendono da questa.',
    },
    scelte: {
      testo: 'Le tendine della barra',
      aiuto:
        'Anno, periodo, corso, classe, scheda insieme. Qui sotto si spengono anche una per una.',
    },
    opzioni: {
      testo: 'Le altre voci delle tendine',
      aiuto: 'Che cosa si potrebbe scegliere al posto di quel che è scelto adesso.',
    },
    filtri: {
      testo: 'I filtri della pagina',
      aiuto:
        'Quel che la pagina sta restringendo, tutto insieme. Qui sotto si spengono anche uno ' +
        'per uno.',
    },
    periodo: {
      testo: 'Periodo dei conti',
      aiuto: 'Le due date con cui l’assistente restringe medie, assenze e lezioni.',
    },
    riferimenti: {
      testo: 'Gli identificatori',
      aiuto:
        'Gli id già risolti, tendine ed elenco compresi: senza, l’assistente deve cercarli con ' +
        'un elenco.',
    },
    ricerca: {
      testo: 'La ricerca battuta',
      aiuto: 'Quel che c’è scritto adesso nella casella di ricerca della pagina.',
    },
    visibili: {
      testo: 'L’elenco a schermo',
      aiuto: 'Chi e che cosa la pagina sta mostrando adesso, nell’ordine in cui si vede.',
    },
  },
  scorciatoie: {
    tutto: {
      testo: 'Tutto il contesto',
      aiuto:
        'L’assistente sa tutto di dove stai guardando: pagina, tendine, filtri, id, elenco a ' +
        'schermo.',
    },
    soloPagina: {
      testo: 'Solo dove sono',
      aiuto:
        'Pagina, scheda e periodo dei conti. Niente tendine, niente id, niente elenco: la ' +
        'domanda resta generale.',
    },
    niente: {
      testo: 'Niente del tutto',
      aiuto: 'L’assistente non sa niente della pagina, e l’host butta via quel che teneva.',
    },
  },
  /** «… e altre 7 non elencate», in due pezzi: si scrive e si riconosce. */
  testaNonElencate: '… e altre ',
  codaNonElencate: ' non elencate',
  /** «Corso, Periodo, e altre 2». */
  eAltre: (dette: string, resto: number) => `${dette}, e altre ${resto}`,
  nienteQui: 'niente qui',
  daPassare: (quanti: number) => `${quanti} da passare agli attrezzi`,
}

export const testi = catalogo(it, {
  de: {
    parti: {
      pagina: {
        testo: 'Die Seite, die ich anschaue',
        aiuto:
          'Nur der Name der offenen Seite, des Reiters und des Abschnitts. Die Auswahlmenüs und ' +
          'Filter hier darunter hängen nicht davon ab.',
      },
      scelte: {
        testo: 'Die Auswahlmenüs der Leiste',
        aiuto:
          'Jahr, Zeitraum, Kurs, Klasse, Reiter zusammen. Hier darunter lassen sie sich auch ' +
          'einzeln ausschalten.',
      },
      opzioni: {
        testo: 'Die anderen Einträge der Auswahlmenüs',
        aiuto: 'Was man anstelle dessen wählen könnte, was jetzt gewählt ist.',
      },
      filtri: {
        testo: 'Die Filter der Seite',
        aiuto:
          'Was die Seite gerade eingrenzt, alles zusammen. Hier darunter lassen sie sich auch ' +
          'einzeln ausschalten.',
      },
      periodo: {
        testo: 'Zeitraum der Zählungen',
        aiuto:
          'Die zwei Daten, mit denen der Assistent Durchschnitte, Absenzen und Stunden eingrenzt.',
      },
      riferimenti: {
        testo: 'Die Kennungen',
        aiuto:
          'Die schon aufgelösten IDs, samt Auswahlmenüs und Liste: Ohne sie muss der Assistent ' +
          'sie mit einer Liste suchen.',
      },
      ricerca: {
        testo: 'Die eingegebene Suche',
        aiuto: 'Was gerade im Suchfeld der Seite steht.',
      },
      visibili: {
        testo: 'Die Liste auf dem Bildschirm',
        aiuto: 'Wen und was die Seite gerade zeigt, in der Reihenfolge, in der man es sieht.',
      },
    },
    scorciatoie: {
      tutto: {
        testo: 'Der ganze Kontext',
        aiuto:
          'Der Assistent weiss alles darüber, wo du hinschaust: Seite, Auswahlmenüs, Filter, ' +
          'IDs, Liste auf dem Bildschirm.',
      },
      soloPagina: {
        testo: 'Nur wo ich bin',
        aiuto:
          'Seite, Reiter und Zeitraum der Zählungen. Keine Auswahlmenüs, keine IDs, keine ' +
          'Liste: Die Frage bleibt allgemein.',
      },
      niente: {
        testo: 'Gar nichts',
        aiuto: 'Der Assistent weiss nichts über die Seite, und der Host wirft weg, was er hatte.',
      },
    },
    testaNonElencate: '… und ',
    codaNonElencate: ' weitere, nicht aufgeführt',
    eAltre: (dette, resto) => `${dette} und ${resto} weitere`,
    nienteQui: 'hier nichts',
    daPassare: (quanti) => `${quanti} zum Übergeben an die Werkzeuge`,
  },
  fr: {
    parti: {
      pagina: {
        testo: 'La page que je regarde',
        aiuto:
          'Seulement le nom de la page, de l’onglet et de la section ouverts. Les listes ' +
          'déroulantes et les filtres ci-dessous n’en dépendent pas.',
      },
      scelte: {
        testo: 'Les listes déroulantes de la barre',
        aiuto:
          'Année, période, cours, classe, onglet ensemble. Ci-dessous, on peut aussi les ' +
          'éteindre une par une.',
      },
      opzioni: {
        testo: 'Les autres entrées des listes déroulantes',
        aiuto: 'Ce qu’on pourrait choisir à la place de ce qui est choisi maintenant.',
      },
      filtri: {
        testo: 'Les filtres de la page',
        aiuto:
          'Ce que la page est en train de restreindre, tout ensemble. Ci-dessous, on peut aussi ' +
          'les éteindre un par un.',
      },
      periodo: {
        testo: 'Période des comptes',
        aiuto: 'Les deux dates avec lesquelles l’assistant restreint moyennes, absences et heures.',
      },
      riferimenti: {
        testo: 'Les identifiants',
        aiuto:
          'Les id déjà résolus, listes déroulantes et liste comprises : sans eux, l’assistant ' +
          'doit les chercher avec une liste.',
      },
      ricerca: {
        testo: 'La recherche tapée',
        aiuto: 'Ce qui est écrit maintenant dans le champ de recherche de la page.',
      },
      visibili: {
        testo: 'La liste à l’écran',
        aiuto: 'Qui et quoi la page montre maintenant, dans l’ordre où on le voit.',
      },
    },
    scorciatoie: {
      tutto: {
        testo: 'Tout le contexte',
        aiuto:
          'L’assistant sait tout de l’endroit où tu regardes : page, listes déroulantes, ' +
          'filtres, id, liste à l’écran.',
      },
      soloPagina: {
        testo: 'Seulement où je suis',
        aiuto:
          'Page, onglet et période des comptes. Pas de listes déroulantes, pas d’id, pas de ' +
          'liste : la question reste générale.',
      },
      niente: {
        testo: 'Rien du tout',
        aiuto: 'L’assistant ne sait rien de la page, et l’hôte jette ce qu’il gardait.',
      },
    },
    testaNonElencate: '… et ',
    codaNonElencate: ' autres non listées',
    eAltre: (dette, resto) => `${dette} et ${resto} autres`,
    nienteQui: 'rien ici',
    daPassare: (quanti) => `${quanti} à passer aux outils`,
  },
  en: {
    parti: {
      pagina: {
        testo: 'The page I’m looking at',
        aiuto:
          'Only the name of the open page, tab and section. The drop-downs and filters below ' +
          'do not depend on this.',
      },
      scelte: {
        testo: 'The drop-downs in the bar',
        aiuto:
          'Year, period, course, class, tab together. Below, they can also be switched off one ' +
          'by one.',
      },
      opzioni: {
        testo: 'The other items in the drop-downs',
        aiuto: 'What could be chosen instead of what is chosen now.',
      },
      filtri: {
        testo: 'The page’s filters',
        aiuto:
          'What the page is narrowing down, all together. Below, they can also be switched off ' +
          'one by one.',
      },
      periodo: {
        testo: 'Period for the counts',
        aiuto: 'The two dates the assistant uses to narrow down averages, absences and hours.',
      },
      riferimenti: {
        testo: 'The identifiers',
        aiuto:
          'The ids already resolved, drop-downs and list included: without them, the assistant ' +
          'has to look them up with a list.',
      },
      ricerca: {
        testo: 'The search typed',
        aiuto: 'What is written now in the page’s search box.',
      },
      visibili: {
        testo: 'The list on screen',
        aiuto: 'Who and what the page is showing now, in the order it appears.',
      },
    },
    scorciatoie: {
      tutto: {
        testo: 'All the context',
        aiuto:
          'The assistant knows everything about where you are looking: page, drop-downs, ' +
          'filters, ids, list on screen.',
      },
      soloPagina: {
        testo: 'Only where I am',
        aiuto:
          'Page, tab and period for the counts. No drop-downs, no ids, no list: the question ' +
          'stays general.',
      },
      niente: {
        testo: 'Nothing at all',
        aiuto: 'The assistant knows nothing about the page, and the host throws away what it kept.',
      },
    },
    testaNonElencate: '… and ',
    codaNonElencate: ' more not listed',
    eAltre: (dette, resto) => `${dette} and ${resto} more`,
    nienteQui: 'nothing here',
    daPassare: (quanti) => `${quanti} to pass to the tools`,
  },
})
