// Le parole che i conti mettono nei rapporti: nomi delle colonne, caselle,
// frasi con un numero. Le parole dei modelli stanno nei `_testi*.tpl` di
// `templates/`.
//
// Le colonne hanno anche un nome di serie, quello italiano, che `reportData.ts`
// mette nelle `chiavi`: i modelli le scelgono con quello in ogni lingua. I
// valori salvati nel documento (stato di un'ora, tipo di attività) escono come
// sono in italiano, col nome del lessico nelle altre lingue.

import { catalogo } from '../i18n/index.js'
import { PERSONE, PIF, corto, del } from './lexicon.js'
import { lessico } from './lexicon.testi.js'
import type {
  CategoriaDocumento,
  Raggruppamento,
  StatoAttivita,
  StatoLezione,
  TipoAttivita,
  TipoConsegna,
  TipoOsservazione,
  TipoValutazione,
} from './models.js'
import type { StatoRecupero } from './retakes.js'
import { plurale } from './text.js'

const it = {
  /** Il titolo di ogni rapporto: va in testata, e nei metadati del PDF. */
  titoli: {
    verbale: 'Verbale della lezione',
    piano: 'Piano lezione',
    valutazioni: 'Valutazioni',
    momento: 'Momento di valutazione',
    presenze: 'Presenze',
    foto: 'Foto della classe',
    fascicolo: 'Fascicolo di classe',
    scheda: `Scheda ${del(PIF)}`,
  },
  colonne: {
    pif: corto(PIF),
    numero: '#',
    minuti: 'Min.',
    /** Una riga scritta accanto: all'appello, a un voto. */
    nota: 'Nota',
    /** La nota di fine semestre, quella che va sulla pagella. */
    notaSemestre: 'Nota',
    attivita: 'Attività',
    durata: 'Durata',
    svolta: 'Svolta',
    aChi: 'A chi',
    perQuando: 'Per quando',
    aspetto: 'Aspetto',
    comeEAndata: 'Com’è andata',
    annotazione: 'Annotazione',
    come: 'Come',
    prova: 'Prova',
    materiale: 'Materiale',
    origine: 'Origine',
    media: 'Media',
    peso: 'Peso',
    voti: 'Voti',
    recuperi: 'Recuperi',
    riconsegna: 'Riconsegna',
    siRifaIl: 'Si rifà il',
    voto: 'Voto',
    riconsegnata: 'Riconsegnata',
    recupero: 'Recupero',
    udCorso: 'UD corso',
    udSeguite: 'UD seguite',
    percPresenza: '% presenza',
    udAssenza: 'UD di assenza',
    percAssenza: '% assenza',
    ritardi: 'Ritardi',
    udConAppello: 'UD con appello',
    percAppello: '% appello',
    nascita: 'Nascita',
    rappresentante: corto(PERSONE.rappresentante),
    azienda: corto(PERSONE.azienda),
    datore: corto(PERSONE.datore),
    documento: 'Documento',
    categoria: 'Categoria',
    diChi: 'Di chi',
    raccoltoIl: 'Raccolto il',
    righe: 'Righe',
    corso: 'Corso',
    prove: 'Prove',
  },
  /** La riga in fondo alle presenze, con i conti di tutti. */
  rigaClasse: 'Classe',
  pausa: 'pausa',
  unaTappa: 'una tappa',
  tuttaLOra: 'tutta l’ora',
  docente: 'docente',
  tuttaLaClasse: 'tutta la classe',
  /** Chi riguarda un'osservazione fatta a tutti. */
  classe: 'classe',
  /** Di chi è un documento raccolto per tutti. */
  laClasse: 'la classe',
  tuttiICorsi: 'tutti i corsi della classe',
  ritirato: 'ritirato',
  appelloMaiFatto: 'appello mai fatto',
  totale: 'Totale',
  prove: (n: number) => plurale(n, 'prova', 'prove'),
  nonConta: 'non conta',
  /** Il tipo di un'annotazione che viene dalla nota di un voto. */
  provaAnnotazione: 'prova',
  /** Una casella di chi non c'era. */
  assente: 'ass.',
  /** Una casella di chi non recupera. */
  dispensato: 'disp.',
  /** La «R» dice che quel voto viene da un'altra giornata. */
  rifatto: (voto: string) => `${voto} R`,
  previstoIl: (data: string) => `R ${data}`,
  delGiorno: (data: string) => `del ${data}`,
  pesoDi: (peso: number) => `peso ${peso}`,
  chiusi: (n: number) => plurale(n, 'chiuso', 'chiusi'),
  apertiDi: (aperti: number, tutti: number) => `${aperti} di ${tutti}`,
  resaATutti: 'resa a tutti',
  daRiconsegnare: 'da riconsegnare',
  tornataATutti: 'tornata a tutti',
  nonAncoraATutti: 'non ancora riconsegnata a tutti',
  scala: (minimo: string, massimo: string, sufficienza: string) =>
    `${minimo}–${massimo}, sufficienza ${sufficienza}`,
  suTanti: (quanti: number, tutti: number, quota: string) => `${quanti} su ${tutti} (${quota})`,
  statiRecupero: {
    'da-fissare': 'da fissare',
    fissato: 'fissato',
    oggi: 'oggi',
    scaduto: 'non rifatta',
    fatto: 'rifatta',
    dispensato: 'non si recupera',
  } as Record<StatoRecupero, string>,
  oltreSoglia: (nome: string, quota: string, previste: number, perse: number) =>
    `${nome} — assenza del ${quota} su ${previste} UD previste, ${perse} perse`,
  avvisoAssenza: (quota: string, soglia: number) =>
    `Attenzione: assenza del ${quota}, oltre il ${soglia}% previsto.`,
  /** I conti dell'appello in una riga, per i modelli che non usano `_testi.tpl`. */
  riepilogoPresenze: (
    presenti: number,
    conAppello: number,
    assenti: number,
    parziali: number,
    ritardi: number,
  ) =>
    `Presenti ${presenti}/${conAppello} · assenti ${assenti} · parziali ${parziali} · ritardi ${ritardi}`,
  appelloIncompleto: (caselle: number) => `Appello incompleto: ${caselle} caselle non impostate.`,
  notaPresenze: (previste: number, aCalendario: number) =>
    `Le UD previste dall’orario del corso nel periodo sono ${previste}, ` +
    `di cui ${aCalendario} già a calendario. «% presenza» e «% assenza» sono calcolate su ` +
    'quelle previste: la seconda è quanto si è perso di ciò che era in programma, la prima ' +
    'è la frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna ' +
    'delle due. La ' +
    '«% appello» è invece calcolata sulle sole UD in cui l’appello è stato fatto, e dice ' +
    'quanto i primi due numeri sono affidabili: un’ora di cui nessuno ha segnato niente non ' +
    'è un’ora di assenze per nessuno.',
  notaScheda:
    'Presenza e assenza sono calcolate sulle unità didattiche che il corso prevede nel ' +
    'periodo: l’assenza è quanto si è perso di ciò che era in programma, la presenza è la ' +
    'frequenza, cioè cento meno quella. Le ore ancora da fare non pesano su nessuna delle ' +
    'due. «Appello fatto su» è la quota ' +
    'di presenza sulle sole UD in cui l’appello è stato fatto, e dice quanto i primi due ' +
    'numeri sono affidabili.',
  statoLezione: (stato: StatoLezione): string => stato,
  /** A che punto è una tappa della scaletta, come lo scrive il documento. */
  statiAttivita: {
    'da-fare': 'da-fare',
    svolta: 'svolta',
    parziale: 'parziale',
    saltata: 'saltata',
  } as Record<StatoAttivita, string>,
  tipoAttivita: (tipo: TipoAttivita): string => tipo,
  tipoConsegna: (tipo: TipoConsegna): string => tipo,
  tipoOsservazione: (tipo: TipoOsservazione): string => tipo,
  tipoValutazione: (tipo: TipoValutazione): string => tipo,
  raggruppamento: (come: Raggruppamento): string => come,
  categoria: (categoria: CategoriaDocumento): string => categoria,
}

export const testi = catalogo(it, {
  de: {
    titoli: {
      verbale: 'Unterrichtsprotokoll',
      piano: 'Unterrichtsplan',
      valutazioni: 'Noten',
      momento: 'Leistungsbeurteilung',
      presenze: 'Anwesenheit',
      foto: 'Fotos der Klasse',
      fascicolo: 'Klassendossier',
      scheda: 'Personenblatt',
    },
    colonne: {
      pif: 'LP',
      numero: '#',
      minuti: 'Min.',
      nota: 'Bemerkung',
      notaSemestre: 'Note',
      attivita: 'Aktivität',
      durata: 'Dauer',
      svolta: 'Erledigt',
      aChi: 'Für wen',
      perQuando: 'Bis wann',
      aspetto: 'Aspekt',
      comeEAndata: 'Wie es lief',
      annotazione: 'Vermerk',
      come: 'Sozialform',
      prova: 'Prüfung',
      materiale: 'Material',
      origine: 'Quelle',
      media: 'Durchschnitt',
      peso: 'Gewichtung',
      voti: 'Noten',
      recuperi: 'Nachprüfungen',
      riconsegna: 'Rückgabe',
      siRifaIl: 'Nachprüfung am',
      voto: 'Note',
      riconsegnata: 'Zurückgegeben',
      recupero: 'Nachprüfung',
      udCorso: 'Lekt. Kurs',
      udSeguite: 'Lekt. besucht',
      percPresenza: '% Anwesenheit',
      udAssenza: 'Lekt. verpasst',
      percAssenza: '% Absenz',
      ritardi: 'Verspätungen',
      udConAppello: 'Lekt. kontrolliert',
      percAppello: '% Kontrolle',
      nascita: 'Geburtsdatum',
      rappresentante: 'Ges. Vertretung',
      azienda: 'Betrieb',
      datore: 'Arbeitgeber',
      documento: 'Dokument',
      categoria: 'Kategorie',
      diChi: 'Von wem',
      raccoltoIl: 'Erhalten am',
      righe: 'Zeilen',
      corso: 'Kurs',
      prove: 'Prüfungen',
    },
    rigaClasse: 'Klasse',
    pausa: 'Pause',
    unaTappa: 'eine Etappe',
    tuttaLOra: 'ganze Stunde',
    docente: 'Lehrperson',
    tuttaLaClasse: 'ganze Klasse',
    classe: 'Klasse',
    laClasse: 'die Klasse',
    tuttiICorsi: 'alle Kurse der Klasse',
    ritirato: 'ausgetreten',
    appelloMaiFatto: 'nie kontrolliert',
    totale: 'Total',
    prove: (n) => plurale(n, 'Prüfung', 'Prüfungen'),
    nonConta: 'zählt nicht',
    provaAnnotazione: 'Prüfung',
    assente: 'abw.',
    dispensato: 'disp.',
    rifatto: (voto) => `${voto} N`,
    previstoIl: (data) => `N ${data}`,
    delGiorno: (data) => `vom ${data}`,
    pesoDi: (peso) => `Gewichtung ${peso}`,
    chiusi: (n) => `${n} abgeschlossen`,
    apertiDi: (aperti, tutti) => `${aperti} von ${tutti}`,
    resaATutti: 'allen zurückgegeben',
    daRiconsegnare: 'zurückzugeben',
    tornataATutti: 'allen zurückgegeben',
    nonAncoraATutti: 'noch nicht allen zurückgegeben',
    scala: (minimo, massimo, sufficienza) => `${minimo}–${massimo}, genügend ab ${sufficienza}`,
    suTanti: (quanti, tutti, quota) => `${quanti} von ${tutti} (${quota})`,
    statiRecupero: {
      'da-fissare': 'festzulegen',
      fissato: 'festgelegt',
      oggi: 'heute',
      scaduto: 'nicht nachgeholt',
      fatto: 'nachgeholt',
      dispensato: 'keine Nachprüfung',
    },
    oltreSoglia: (nome, quota, previste, perse) =>
      `${nome} — Absenz von ${quota} bei ${previste} vorgesehenen Lektionen, ${perse} verpasst`,
    avvisoAssenza: (quota, soglia) =>
      `Achtung: Absenz von ${quota}, über den vorgesehenen ${soglia}%.`,
    riepilogoPresenze: (presenti, conAppello, assenti, parziali, ritardi) =>
      `Anwesend ${presenti}/${conAppello} · abwesend ${assenti} · teilweise ${parziali} · verspätet ${ritardi}`,
    appelloIncompleto: (caselle) =>
      `Präsenzkontrolle unvollständig: ${plurale(caselle, 'Feld', 'Felder')} nicht erfasst.`,
    notaPresenze: (previste, aCalendario) =>
      `Laut Stundenplan des Kurses sind im Zeitraum ${previste} Lektionen vorgesehen, ` +
      `davon ${aCalendario} bereits im Kalender. «% Anwesenheit» und «% Absenz» beziehen sich ` +
      'auf die vorgesehenen Lektionen: Die zweite gibt an, wie viel vom Programm verpasst wurde, ' +
      'die erste ist die Anwesenheit, also hundert minus die Absenz. Lektionen, die noch ' +
      'bevorstehen, zählen bei keiner der beiden. Die «% Kontrolle» bezieht sich dagegen nur ' +
      'auf die Lektionen, in denen die Präsenzkontrolle gemacht wurde, und zeigt, wie ' +
      'verlässlich die ersten beiden Zahlen sind: Eine Lektion, in der niemand etwas erfasst ' +
      'hat, ist für niemanden eine Absenz.',
    notaScheda:
      'Anwesenheit und Absenz beziehen sich auf die Lektionen, die der Kurs im Zeitraum ' +
      'vorsieht: Die Absenz gibt an, wie viel vom Programm verpasst wurde, die Anwesenheit ist ' +
      'der Besuch des Unterrichts, also hundert minus die Absenz. Lektionen, die noch ' +
      'bevorstehen, zählen bei keiner der beiden. «Anwesenheit laut Kontrolle» ist der Anteil ' +
      'der Anwesenheit nur in den Lektionen, in denen die Präsenzkontrolle gemacht wurde, und ' +
      'zeigt, wie verlässlich die ersten beiden Zahlen sind.',
    statoLezione: (stato) => lessico.in('de').statiLezione[stato] ?? stato,
    statiAttivita: { 'da-fare': 'offen', svolta: 'erledigt', parziale: 'teilweise', saltata: 'ausgelassen' },
    tipoAttivita: (tipo) => lessico.in('de').tipiAttivita[tipo] ?? tipo,
    tipoConsegna: (tipo) => lessico.in('de').tipiConsegna[tipo] ?? tipo,
    tipoOsservazione: (tipo) => lessico.in('de').tipiOsservazione[tipo] ?? tipo,
    tipoValutazione: (tipo) => lessico.in('de').tipiValutazione[tipo] ?? tipo,
    raggruppamento: (come) => lessico.in('de').raggruppamenti[come] ?? come,
    categoria: (categoria) => lessico.in('de').categorieDocumento[categoria] ?? categoria,
  },
  fr: {
    titoli: {
      verbale: 'Procès-verbal de la leçon',
      piano: 'Plan de leçon',
      valutazioni: 'Évaluations',
      momento: 'Évaluation',
      presenze: 'Présences',
      foto: 'Photos de la classe',
      fascicolo: 'Dossier de classe',
      scheda: 'Fiche de la personne en formation',
    },
    colonne: {
      pif: 'PeF',
      numero: '#',
      minuti: 'Min.',
      nota: 'Remarque',
      notaSemestre: 'Note',
      attivita: 'Activité',
      durata: 'Durée',
      svolta: 'Effectuée',
      aChi: 'Pour qui',
      perQuando: 'Pour quand',
      aspetto: 'Aspect',
      comeEAndata: 'Appréciation',
      annotazione: 'Annotation',
      come: 'Organisation',
      prova: 'Épreuve',
      materiale: 'Matériel',
      origine: 'Source',
      media: 'Moyenne',
      peso: 'Pondération',
      voti: 'Notes',
      recuperi: 'Rattrapages',
      riconsegna: 'Restitution',
      siRifaIl: 'Refaite le',
      voto: 'Note',
      riconsegnata: 'Rendue',
      recupero: 'Rattrapage',
      udCorso: 'Pér. cours',
      udSeguite: 'Pér. suivies',
      percPresenza: '% présence',
      udAssenza: 'Pér. d’absence',
      percAssenza: '% absence',
      ritardi: 'Retards',
      udConAppello: 'Pér. avec appel',
      percAppello: '% appel',
      nascita: 'Naissance',
      rappresentante: 'Repr. légal',
      azienda: 'Entreprise',
      datore: 'Employeur',
      documento: 'Document',
      categoria: 'Catégorie',
      diChi: 'De qui',
      raccoltoIl: 'Reçu le',
      righe: 'Lignes',
      corso: 'Cours',
      prove: 'Épreuves',
    },
    rigaClasse: 'Classe',
    pausa: 'pause',
    unaTappa: 'une étape',
    tuttaLOra: 'toute la leçon',
    docente: 'enseignant',
    tuttaLaClasse: 'toute la classe',
    classe: 'classe',
    laClasse: 'la classe',
    tuttiICorsi: 'tous les cours de la classe',
    ritirato: 'retiré',
    appelloMaiFatto: 'appel jamais fait',
    totale: 'Total',
    prove: (n) => plurale(n, 'épreuve', 'épreuves'),
    nonConta: 'ne compte pas',
    provaAnnotazione: 'épreuve',
    assente: 'abs.',
    dispensato: 'disp.',
    rifatto: (voto) => `${voto} R`,
    previstoIl: (data) => `R ${data}`,
    delGiorno: (data) => `du ${data}`,
    pesoDi: (peso) => `pondération ${peso}`,
    chiusi: (n) => plurale(n, 'clos', 'clos'),
    apertiDi: (aperti, tutti) => `${aperti} sur ${tutti}`,
    resaATutti: 'rendue à tous',
    daRiconsegnare: 'à rendre',
    tornataATutti: 'rendue à tous',
    nonAncoraATutti: 'pas encore rendue à tous',
    scala: (minimo, massimo, sufficienza) => `${minimo}–${massimo}, suffisant dès ${sufficienza}`,
    suTanti: (quanti, tutti, quota) => `${quanti} sur ${tutti} (${quota})`,
    statiRecupero: {
      'da-fissare': 'à fixer',
      fissato: 'fixé',
      oggi: 'aujourd’hui',
      scaduto: 'non refaite',
      fatto: 'refaite',
      dispensato: 'pas de rattrapage',
    },
    oltreSoglia: (nome, quota, previste, perse) =>
      `${nome} — absence de ${quota} sur ${previste} périodes prévues, ${perse} manquées`,
    avvisoAssenza: (quota, soglia) =>
      `Attention : absence de ${quota}, au-delà des ${soglia} % prévus.`,
    riepilogoPresenze: (presenti, conAppello, assenti, parziali, ritardi) =>
      `Présents ${presenti}/${conAppello} · absents ${assenti} · partiels ${parziali} · retards ${ritardi}`,
    appelloIncompleto: (caselle) =>
      `Appel incomplet : ${plurale(caselle, 'case non saisie', 'cases non saisies')}.`,
    notaPresenze: (previste, aCalendario) =>
      `L’horaire du cours prévoit ${previste} périodes sur l’intervalle choisi, dont ` +
      `${aCalendario} déjà au calendrier. Le « % présence » et le « % absence » sont calculés ` +
      'sur les périodes prévues : le second indique ce qui a été manqué de ce qui était au ' +
      'programme, le premier est la fréquentation, c’est-à-dire cent moins l’absence. Les ' +
      'périodes encore à venir ne pèsent sur aucun des deux. Le « % appel » est en revanche ' +
      'calculé sur les seules périodes où l’appel a été fait, et dit dans quelle mesure les ' +
      'deux premiers chiffres sont fiables : une période où personne n’a rien saisi n’est une ' +
      'période d’absence pour personne.',
    notaScheda:
      'La présence et l’absence sont calculées sur les périodes que le cours prévoit sur ' +
      'l’intervalle : l’absence est ce qui a été manqué de ce qui était au programme, la ' +
      'présence est la fréquentation, c’est-à-dire cent moins l’absence. Les périodes encore à ' +
      'venir ne pèsent sur aucune des deux. « Présence selon l’appel » est la part de présence ' +
      'sur les seules périodes où l’appel a été fait, et dit dans quelle mesure les deux ' +
      'premiers chiffres sont fiables.',
    statoLezione: (stato) => lessico.in('fr').statiLezione[stato] ?? stato,
    statiAttivita: { 'da-fare': 'à faire', svolta: 'faite', parziale: 'en partie', saltata: 'sautée' },
    tipoAttivita: (tipo) => lessico.in('fr').tipiAttivita[tipo] ?? tipo,
    tipoConsegna: (tipo) => lessico.in('fr').tipiConsegna[tipo] ?? tipo,
    tipoOsservazione: (tipo) => lessico.in('fr').tipiOsservazione[tipo] ?? tipo,
    tipoValutazione: (tipo) => lessico.in('fr').tipiValutazione[tipo] ?? tipo,
    raggruppamento: (come) => lessico.in('fr').raggruppamenti[come] ?? come,
    categoria: (categoria) => lessico.in('fr').categorieDocumento[categoria] ?? categoria,
  },
  en: {
    titoli: {
      verbale: 'Lesson record',
      piano: 'Lesson plan',
      valutazioni: 'Grades',
      momento: 'Assessment',
      presenze: 'Attendance',
      foto: 'Class photos',
      fascicolo: 'Class file',
      scheda: 'Learner sheet',
    },
    colonne: {
      pif: 'Learner',
      numero: '#',
      minuti: 'Min.',
      nota: 'Note',
      notaSemestre: 'Grade',
      attivita: 'Activity',
      durata: 'Duration',
      svolta: 'Done',
      aChi: 'For whom',
      perQuando: 'Due',
      aspetto: 'Aspect',
      comeEAndata: 'How it went',
      annotazione: 'Remark',
      come: 'Grouping',
      prova: 'Test',
      materiale: 'Material',
      origine: 'Source',
      media: 'Average',
      peso: 'Weight',
      voti: 'Grades',
      recuperi: 'Resits',
      riconsegna: 'Handed back',
      siRifaIl: 'Resit on',
      voto: 'Grade',
      riconsegnata: 'Handed back',
      recupero: 'Resit',
      udCorso: 'Course periods',
      udSeguite: 'Periods attended',
      percPresenza: '% attendance',
      udAssenza: 'Periods missed',
      percAssenza: '% absence',
      ritardi: 'Late',
      udConAppello: 'Periods recorded',
      percAppello: '% recorded',
      nascita: 'Date of birth',
      rappresentante: 'Guardian',
      azienda: 'Company',
      datore: 'Employer',
      documento: 'Document',
      categoria: 'Category',
      diChi: 'Whose',
      raccoltoIl: 'Collected on',
      righe: 'Rows',
      corso: 'Course',
      prove: 'Tests',
    },
    rigaClasse: 'Class',
    pausa: 'break',
    unaTappa: 'a step',
    tuttaLOra: 'whole lesson',
    docente: 'teacher',
    tuttaLaClasse: 'whole class',
    classe: 'class',
    laClasse: 'the class',
    tuttiICorsi: 'all the class’s courses',
    ritirato: 'withdrawn',
    appelloMaiFatto: 'attendance never taken',
    totale: 'Total',
    prove: (n) => plurale(n, 'test', 'tests'),
    nonConta: 'does not count',
    provaAnnotazione: 'test',
    assente: 'abs.',
    dispensato: 'exc.',
    rifatto: (voto) => `${voto} R`,
    previstoIl: (data) => `R ${data}`,
    delGiorno: (data) => `on ${data}`,
    pesoDi: (peso) => `weight ${peso}`,
    chiusi: (n) => `${n} closed`,
    apertiDi: (aperti, tutti) => `${aperti} of ${tutti}`,
    resaATutti: 'returned to all',
    daRiconsegnare: 'to hand back',
    tornataATutti: 'returned to everyone',
    nonAncoraATutti: 'not yet returned to everyone',
    scala: (minimo, massimo, sufficienza) => `${minimo}–${massimo}, pass mark ${sufficienza}`,
    suTanti: (quanti, tutti, quota) => `${quanti} of ${tutti} (${quota})`,
    statiRecupero: {
      'da-fissare': 'to be scheduled',
      fissato: 'scheduled',
      oggi: 'today',
      scaduto: 'not resat',
      fatto: 'resat',
      dispensato: 'no resit',
    },
    oltreSoglia: (nome, quota, previste, perse) =>
      `${nome} — absence of ${quota} out of ${previste} planned periods, ${perse} missed`,
    avvisoAssenza: (quota, soglia) =>
      `Warning: absence of ${quota}, above the expected ${soglia}%.`,
    riepilogoPresenze: (presenti, conAppello, assenti, parziali, ritardi) =>
      `Present ${presenti}/${conAppello} · absent ${assenti} · partial ${parziali} · late ${ritardi}`,
    appelloIncompleto: (caselle) => `Attendance incomplete: ${plurale(caselle, 'box', 'boxes')} not set.`,
    notaPresenze: (previste, aCalendario) =>
      `The course timetable plans ${previste} periods for this time span, ${aCalendario} of ` +
      'which are already in the calendar. “% attendance” and “% absence” are calculated on the ' +
      'planned periods: the second is how much of the programme was missed, the first is ' +
      'attendance, that is, a hundred minus absence. Periods still to come count towards ' +
      'neither. “% recorded”, on the other hand, is calculated only on the periods in which ' +
      'attendance was taken, and shows how reliable the first two figures are: a period in ' +
      'which nobody recorded anything is not a period of absence for anyone.',
    notaScheda:
      'Attendance and absence are calculated on the periods the course plans for this time ' +
      'span: absence is how much of the programme was missed, attendance is a hundred minus ' +
      'absence. Periods still to come count towards neither. “Attendance as recorded” is the ' +
      'share of attendance over only the periods in which attendance was taken, and shows ' +
      'how reliable the first two figures are.',
    statoLezione: (stato) => lessico.in('en').statiLezione[stato] ?? stato,
    statiAttivita: { 'da-fare': 'to do', svolta: 'done', parziale: 'partly', saltata: 'skipped' },
    tipoAttivita: (tipo) => lessico.in('en').tipiAttivita[tipo] ?? tipo,
    tipoConsegna: (tipo) => lessico.in('en').tipiConsegna[tipo] ?? tipo,
    tipoOsservazione: (tipo) => lessico.in('en').tipiOsservazione[tipo] ?? tipo,
    tipoValutazione: (tipo) => lessico.in('en').tipiValutazione[tipo] ?? tipo,
    raggruppamento: (come) => lessico.in('en').raggruppamenti[come] ?? come,
    categoria: (categoria) => lessico.in('en').categorieDocumento[categoria] ?? categoria,
  },
})

