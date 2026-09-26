// I testi dei pezzi comuni alle procedure: guardie, rimedi, filtri, appello.
// Gli aiuti dei filtri hanno un buco che riempie chi li usa con un pezzo del
// suo catalogo (`periodo(() => t().oreDelCorso)`). Si leggono al momento
// dell'uso: gli schemi si compongono una volta sola, al caricamento.

import { catalogo } from '../../../i18n/index.js'

const it = {
  rimedioAnno: 'Un anno alla volta: quello aperto lo dice «registro.riassunto».',
  rimedioCorsi: 'I corsi dell’anno li elenca «corsi.elenco».',
  rimedioPersona:
    'Le persone si cercano per nome con «persone.cerca», o si elencano per classe con ' +
    '«classe.persone»: l’id da passare qui viene da lì.',
  rimedioClassi: 'Le classi dell’anno le elenca «classi.elenco».',
  corsoDiAltraClasse: (corso: string, sua: string, chiesta: string) =>
    `Il corso «${corso}» è della classe «${sua}», non della classe «${chiesta}».`,
  classeOCorso:
    'O si chiede la classe, o si chiede il corso: i corsi di una classe li elenca ' +
    '«corsi.elenco», che dice per ciascuno a quale classe appartiene.',
  /** `cosa` è quel che si conta: «il conto», «le assenze». */
  stati: (cosa: string) => `Quali caselle dell’appello contano per ${cosa}. Senza, solo «assente»`,
  /** Quel che il periodo filtra quando chi lo usa non lo dice. */
  leOre: 'le ore',
  periodoDal: (cosa: string) =>
    `Primo giorno compreso. Senza, dall’inizio dell’anno in uso. Filtra ${cosa}`,
  periodoAl: (cosa: string) =>
    `Ultimo giorno compreso. Senza, fino alla fine dell’anno in uso. Filtra ${cosa}`,
  /** Quel che il semestre scelto restringe quando chi lo usa non lo dice. */
  ilConto: 'il conto',
  semestreSolo: (cosa: string) =>
    `Un semestre solo per ${cosa}. Senza, tutti quelli del periodo, a parte`,
  schedaPeriodo: {
    semestreId: 'Vuoto quando l’anno non ha semestri: allora il periodo è uno solo',
    numero: 'Primo o secondo semestre. Zero quando non ce ne sono',
    etichetta: 'Come si chiama: «1° semestre»',
    dal: 'Primo giorno davvero contato, non quello del semestre intero',
    al: 'Ultimo giorno davvero contato',
  },
  rimedioSemestri: 'I semestri dell’anno stanno dentro l’anno, in «anni.elenco».',
  /** Come si chiama il periodo unico di un anno senza semestri e senza etichetta. */
  tuttoIlPeriodo: 'Tutto il periodo',
  /** `dove` è in che cosa si cerca: «nome, sede o materia». */
  ricerca: (dove: string) => `Pezzi di ${dove}: ogni pezzo deve trovarsi. Senza, non filtra niente`,
  cerca: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto',
  cercaIgnorato: 'Vero se «cerca» non aveva dentro né lettere né cifre: le righe NON sono filtrate',
  esclusiRitirati:
    'Quante persone restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
  esclusiArchiviate:
    'Quante restano fuori perché la classe è archiviata: con «archiviate» a vero rientrano',
  paginaDa: 'Da quale riga cominciare, contando da zero. Senza, dalla prima',
  paginaQuanti: (massimo: number, predefinito: number) =>
    `Quante righe al massimo: da 1 a ${massimo}. Senza, ${predefinito}`,
  quante: 'Quante righe corrispondono in tutto, oltre questa pagina',
  da: 'Da quale riga comincia quel che è qui dentro',
  troncato: 'Vero se ne restano fuori: chiedi la pagina dopo con «da»',
  ancora: 'Quante ne restano dopo questa pagina. Zero se è l’ultima',
  /** `cosa` è quel che si elenca: «le ore», «le persone». */
  conCampiPieni: (cosa: string) => `Solo ${cosa} che hanno tutti questi campi pieni`,
  conCampiVuoti: (cosa: string) => `Solo ${cosa} che hanno tutti questi campi vuoti`,
  comune: 'Il comune, per nome: non guarda accenti né maiuscole',
  cap: 'Il NAP, anche a metà: «69» prende tutto il Luganese',
}

export const testi = catalogo(it, {
  de: {
    rimedioAnno: 'Ein Jahr aufs Mal: Welches offen ist, sagt «registro.riassunto».',
    rimedioCorsi: 'Die Kurse des Jahres listet «corsi.elenco» auf.',
    rimedioPersona:
      'Personen sucht man mit «persone.cerca» nach Namen, oder man listet sie mit ' +
      '«classe.persone» nach Klasse auf: Die ID, die hier übergeben wird, kommt von dort.',
    rimedioClassi: 'Die Klassen des Jahres listet «classi.elenco» auf.',
    corsoDiAltraClasse: (corso, sua, chiesta) =>
      `Der Kurs «${corso}» gehört zur Klasse «${sua}», nicht zur Klasse «${chiesta}».`,
    classeOCorso:
      'Entweder fragt man nach der Klasse oder nach dem Kurs: Die Kurse einer Klasse listet ' +
      '«corsi.elenco» auf und gibt bei jedem an, zu welcher Klasse er gehört.',
    stati: (cosa) =>
      `Welche Felder der Präsenzkontrolle für ${cosa} zählen. Ohne: nur «assente»`,
    leOre: 'die Stunden',
    periodoDal: (cosa) =>
      `Erster Tag, eingeschlossen. Ohne: ab Beginn des laufenden Schuljahres. Filtert ${cosa}`,
    periodoAl: (cosa) =>
      `Letzter Tag, eingeschlossen. Ohne: bis zum Ende des laufenden Schuljahres. Filtert ${cosa}`,
    ilConto: 'die Zählung',
    semestreSolo: (cosa) =>
      `Nur ein Semester für ${cosa}. Ohne: alle Semester des Zeitraums, jedes für sich`,
    schedaPeriodo: {
      semestreId: 'Leer, wenn das Jahr keine Semester hat: Dann gibt es nur einen Zeitraum',
      numero: 'Erstes oder zweites Semester. Null, wenn es keine gibt',
      etichetta: 'Wie es heisst: «1. Semester»',
      dal: 'Erster tatsächlich gezählter Tag, nicht der des ganzen Semesters',
      al: 'Letzter tatsächlich gezählter Tag',
    },
    rimedioSemestri: 'Die Semester des Jahres stehen im Jahr selbst, in «anni.elenco».',
    tuttoIlPeriodo: 'Ganzer Zeitraum',
    ricerca: (dove) => `Teile von ${dove}: Jeder Teil muss vorkommen. Ohne: filtert nichts`,
    cerca: 'Der angewendete Textfilter. Leer, wenn keiner verlangt wurde',
    cercaIgnorato:
      'Wahr, wenn «cerca» weder Buchstaben noch Ziffern enthielt: Die Zeilen sind NICHT gefiltert',
    esclusiRitirati:
      'Wie viele Personen draussen bleiben, weil sie nicht mehr teilnehmen: ' +
      'mit «ritirati» auf wahr kommen sie wieder dazu',
    esclusiArchiviate:
      'Wie viele draussen bleiben, weil die Klasse archiviert ist: ' +
      'mit «archiviate» auf wahr kommen sie wieder dazu',
    paginaDa: 'Ab welcher Zeile begonnen wird, ab null gezählt. Ohne: ab der ersten',
    paginaQuanti: (massimo, predefinito) =>
      `Höchstens so viele Zeilen: von 1 bis ${massimo}. Ohne: ${predefinito}`,
    quante: 'Wie viele Zeilen insgesamt passen, über diese Seite hinaus',
    da: 'Ab welcher Zeile das beginnt, was hier steht',
    troncato: 'Wahr, wenn welche fehlen: Frag die nächste Seite mit «da» ab',
    ancora: 'Wie viele nach dieser Seite noch kommen. Null, wenn es die letzte ist',
    conCampiPieni: (cosa) => `Nur ${cosa}, bei denen alle diese Felder ausgefüllt sind`,
    conCampiVuoti: (cosa) => `Nur ${cosa}, bei denen alle diese Felder leer sind`,
    comune: 'Die Gemeinde, nach Namen: Akzente und Grossschreibung zählen nicht',
    cap: 'Die PLZ, auch nur der Anfang: «69» umfasst die ganze Region Lugano',
  },
  fr: {
    rimedioAnno: 'Une année à la fois : celle qui est ouverte, « registro.riassunto » la donne.',
    rimedioCorsi: 'Les cours de l’année, « corsi.elenco » les liste.',
    rimedioPersona:
      'Les personnes se cherchent par nom avec « persone.cerca », ou se listent par classe avec ' +
      '« classe.persone » : l’id à passer ici vient de là.',
    rimedioClassi: 'Les classes de l’année, « classi.elenco » les liste.',
    corsoDiAltraClasse: (corso, sua, chiesta) =>
      `Le cours « ${corso} » appartient à la classe « ${sua} », pas à la classe « ${chiesta} ».`,
    classeOCorso:
      'On demande soit la classe, soit le cours : les cours d’une classe, « corsi.elenco » les ' +
      'liste en indiquant pour chacun à quelle classe il appartient.',
    stati: (cosa) =>
      `Quelles cases de l’appel comptent pour ${cosa}. Sans : seulement « assente »`,
    leOre: 'les leçons',
    periodoDal: (cosa) =>
      `Premier jour, inclus. Sans : depuis le début de l’année en cours. Filtre ${cosa}`,
    periodoAl: (cosa) =>
      `Dernier jour, inclus. Sans : jusqu’à la fin de l’année en cours. Filtre ${cosa}`,
    ilConto: 'le décompte',
    semestreSolo: (cosa) =>
      `Un seul semestre pour ${cosa}. Sans : tous ceux de la période, chacun à part`,
    schedaPeriodo: {
      semestreId: 'Vide quand l’année n’a pas de semestres : la période est alors unique',
      numero: 'Premier ou deuxième semestre. Zéro quand il n’y en a pas',
      etichetta: 'Comment il s’appelle : « 1er semestre »',
      dal: 'Premier jour réellement compté, pas celui du semestre entier',
      al: 'Dernier jour réellement compté',
    },
    rimedioSemestri: 'Les semestres de l’année se trouvent dans l’année, dans « anni.elenco ».',
    tuttoIlPeriodo: 'Toute la période',
    ricerca: (dove) =>
      `Fragments de ${dove} : chaque fragment doit se trouver. Sans : ne filtre rien`,
    cerca: 'Le filtre de texte appliqué. Vide quand il n’y en a pas eu',
    cercaIgnorato:
      'Vrai si « cerca » ne contenait ni lettres ni chiffres : les lignes ne sont PAS filtrées',
    esclusiRitirati:
      'Combien de personnes restent de côté parce qu’elles ne suivent plus les cours : ' +
      'avec « ritirati » à vrai, elles reviennent',
    esclusiArchiviate:
      'Combien restent de côté parce que la classe est archivée : ' +
      'avec « archiviate » à vrai, elles reviennent',
    paginaDa:
      'À partir de quelle ligne commencer, en comptant depuis zéro. Sans : depuis la première',
    paginaQuanti: (massimo, predefinito) =>
      `Nombre de lignes au plus : de 1 à ${massimo}. Sans : ${predefinito}`,
    quante: 'Combien de lignes correspondent en tout, au-delà de cette page',
    da: 'À partir de quelle ligne commence ce qui se trouve ici',
    troncato: 'Vrai s’il en reste : demande la page suivante avec « da »',
    ancora: 'Combien il en reste après cette page. Zéro si c’est la dernière',
    conCampiPieni: (cosa) => `Seulement ${cosa} dont tous ces champs sont remplis`,
    conCampiVuoti: (cosa) => `Seulement ${cosa} dont tous ces champs sont vides`,
    comune: 'La commune, par son nom : ni les accents ni les majuscules ne comptent',
    cap: 'Le NPA, même en partie : « 69 » prend toute la région de Lugano',
  },
  en: {
    rimedioAnno: 'One year at a time: “registro.riassunto” says which one is open.',
    rimedioCorsi: '“corsi.elenco” lists the courses of the year.',
    rimedioPersona:
      'People are searched by name with “persone.cerca”, or listed by class with ' +
      '“classe.persone”: the id to pass here comes from there.',
    rimedioClassi: '“classi.elenco” lists the classes of the year.',
    corsoDiAltraClasse: (corso, sua, chiesta) =>
      `The course “${corso}” belongs to the class “${sua}”, not to the class “${chiesta}”.`,
    classeOCorso:
      'Ask either for the class or for the course: “corsi.elenco” lists the courses of a class ' +
      'and says for each one which class it belongs to.',
    stati: (cosa) =>
      `Which attendance boxes count for ${cosa}. Without it, only “assente”`,
    leOre: 'the lessons',
    periodoDal: (cosa) =>
      `First day, included. Without it, from the start of the current year. Filters ${cosa}`,
    periodoAl: (cosa) =>
      `Last day, included. Without it, up to the end of the current year. Filters ${cosa}`,
    ilConto: 'the count',
    semestreSolo: (cosa) =>
      `A single semester for ${cosa}. Without it, every semester in the period, each on its own`,
    schedaPeriodo: {
      semestreId: 'Empty when the year has no semesters: then there is only one period',
      numero: 'First or second semester. Zero when there are none',
      etichetta: 'What it is called: “1st semester”',
      dal: 'First day actually counted, not that of the whole semester',
      al: 'Last day actually counted',
    },
    rimedioSemestri: 'The semesters of the year are inside the year, in “anni.elenco”.',
    tuttoIlPeriodo: 'Whole period',
    ricerca: (dove) =>
      `Pieces of ${dove}: every piece must match. Without it, nothing is filtered`,
    cerca: 'The text filter applied. Empty when none was asked for',
    cercaIgnorato:
      'True if “cerca” contained neither letters nor digits: the rows are NOT filtered',
    esclusiRitirati:
      'How many people are left out because they no longer attend: ' +
      'with “ritirati” set to true they come back in',
    esclusiArchiviate:
      'How many are left out because the class is archived: ' +
      'with “archiviate” set to true they come back in',
    paginaDa: 'Which row to start from, counting from zero. Without it, from the first',
    paginaQuanti: (massimo, predefinito) =>
      `How many rows at most: from 1 to ${massimo}. Without it, ${predefinito}`,
    quante: 'How many rows match in total, beyond this page',
    da: 'Which row what is in here starts from',
    troncato: 'True if some are left out: ask for the next page with “da”',
    ancora: 'How many are left after this page. Zero if it is the last one',
    conCampiPieni: (cosa) => `Only ${cosa} with all of these fields filled in`,
    conCampiVuoti: (cosa) => `Only ${cosa} with all of these fields empty`,
    comune: 'The municipality, by name: accents and capitals are ignored',
    cap: 'The postcode, even just the start: “69” covers the whole Lugano area',
  },
})
