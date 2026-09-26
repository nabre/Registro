// I testi di `persone.cerca`, compresi i `suggerimento` per la busta vuota.
// Nomi di campi e attrezzi («cerca», «ha», «persone.cerca») restano uguali in
// ogni lingua. Si leggono al momento dell'uso (`titolo: () => …`), mai al
// caricamento.

import { catalogo } from '../../../i18n/index.js'

/** Le parole fra caporali, separate da virgole: «a», «b». */
const fraCaporali = (parole: readonly string[]) => parole.map((p) => `«${p}»`).join(', ')
/** Lo stesso alla francese, con gli spazi: « a », « b ». */
const fraGuillemets = (parole: readonly string[]) => parole.map((p) => `« ${p} »`).join(', ')
/** Lo stesso all'inglese: “a”, “b”. */
const fraVirgolette = (parole: readonly string[]) => parole.map((p) => `“${p}”`).join(', ')

const it = {
  titolo: 'Trova una persona in formazione per nome, classe o azienda',
  cerca:
    'Pezzi di cognome, classe o azienda: ogni pezzo deve trovarsi, «dic4a» e ' +
    'un pezzo di cognome insieme restringono. Senza, tornano tutte',
  ritirati: 'Vero per cercare anche fra chi non frequenta più: di norma restano fuori',
  archiviate: 'Vero per cercare anche nelle classi archiviate: di norma restano fuori',
  lePersone: 'le persone',
  cercaUscita: 'Il filtro applicato davvero. Vuoto quando non si è filtrato niente',
  ignorato: 'Le parole tolte dal filtro perché nominano la categoria, non una persona',
  comune: 'Il comune su cui si è filtrato. Vuoto quando non se n’è chiesto',
  cap: 'Il NAP su cui si è filtrato. Vuoto quando non se n’è chiesto',
  ha: 'I campi che si sono chiesti pieni',
  senza: 'I campi che si sono chiesti vuoti',
  inRegistro: 'Quante persone ci sono in tutto nel registro, filtri compresi',
  esclusiRitirati:
    'Quante restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
  esclusiArchiviate:
    'Quante restano fuori perché la classe è archiviata: con «archiviate» a vero rientrano',
  suggerimento: 'Che cosa chiamare per avere quel che manca. Vuoto se non manca niente',
  id: 'Da passare a «persone.scheda»',
  attivo: 'Falso per chi si è ritirato',
  /** Le frasi del suggerimento. */
  frasi: {
    categoriaSenzaFiltro: (tolti: readonly string[]) =>
      `${fraCaporali(tolti)} nomina la categoria e non una persona: ho risposto come senza filtro.`,
    categoriaTolta: (tolti: readonly string[], cerca: string) =>
      `${fraCaporali(tolti)} nomina la categoria e non una persona: l’ho tolta, ` +
      `e ho cercato «${cerca}».`,
    nessunaConICampi: (inRegistro: number, cerca: string, campi: readonly string[]) =>
      `Nel registro ci sono ${inRegistro} persone, e nessuna` +
      `${cerca === '' ? '' : ` fra quelle che corrispondono a «${cerca}»`} ha i campi ` +
      `${fraCaporali(campi)} come chiesto: richiama «persone.cerca» senza «ha» e «senza» ` +
      'per allargare.',
    nessunaPassa: (inRegistro: number) =>
      `Nel registro ci sono ${inRegistro} persone, e nessuna passa i filtri.`,
    nessunaCorrisponde: (cerca: string, inRegistro: number) =>
      `Nessuna corrisponde a «${cerca}», ma nel registro ce ne sono ${inRegistro}: ` +
      'richiama «persone.cerca» senza «cerca» per averle tutte.',
    ritiratiAVero: '«ritirati» a vero',
    archiviateAVero: '«archiviate» a vero',
    rientrano: (interruttori: readonly string[]) =>
      `Con ${interruttori.join(' e ')} rientrano quelle che il filtro tiene fuori.`,
  },
  presentazione: {
    titolo: 'Chi corrisponde',
    cercando: 'Cercando',
    trovate: 'Trovate',
    nelRegistro: 'Nel registro',
    ritirate: 'Ritirate, fuori dal filtro',
    archiviate: 'In classi archiviate, fuori',
    paroleTolte: 'Parole tolte dal filtro',
    daSapere: 'Da sapere',
    classe: 'Classe',
    azienda: 'Azienda',
    frequenta: 'Frequenta',
  },
}

export const testi = catalogo(it, {
  de: {
    titolo: 'Findet eine lernende Person nach Name, Klasse oder Lehrbetrieb',
    cerca:
      'Teile von Nachname, Klasse oder Lehrbetrieb: Jeder Teil muss vorkommen, «dic4a» und ein ' +
      'Teil des Nachnamens zusammen schränken ein. Ohne: Alle kommen zurück',
    ritirati:
      'Wahr, um auch unter Personen zu suchen, die nicht mehr teilnehmen: Normalerweise bleiben ' +
      'sie draussen',
    archiviate:
      'Wahr, um auch in archivierten Klassen zu suchen: Normalerweise bleiben sie draussen',
    lePersone: 'die Personen',
    cercaUscita: 'Der tatsächlich angewendete Filter. Leer, wenn nichts gefiltert wurde',
    ignorato:
      'Die Wörter, die aus dem Filter entfernt wurden, weil sie die Kategorie nennen, nicht ' +
      'eine Person',
    comune: 'Die Gemeinde, nach der gefiltert wurde. Leer, wenn keine verlangt wurde',
    cap: 'Die PLZ, nach der gefiltert wurde. Leer, wenn keine verlangt wurde',
    ha: 'Die Felder, die ausgefüllt verlangt wurden',
    senza: 'Die Felder, die leer verlangt wurden',
    inRegistro: 'Wie viele Personen insgesamt im Klassenbuch stehen, Filter eingeschlossen',
    esclusiRitirati:
      'Wie viele draussen bleiben, weil sie nicht mehr teilnehmen: mit «ritirati» auf wahr ' +
      'kommen sie wieder dazu',
    esclusiArchiviate:
      'Wie viele draussen bleiben, weil die Klasse archiviert ist: mit «archiviate» auf wahr ' +
      'kommen sie wieder dazu',
    suggerimento: 'Was man aufrufen muss, um zu erhalten, was fehlt. Leer, wenn nichts fehlt',
    id: 'An «persone.scheda» übergeben',
    attivo: 'Falsch für ausgetretene Personen',
    frasi: {
      categoriaSenzaFiltro: (tolti) =>
        `${fraCaporali(tolti)} nennt die Kategorie und keine Person: Ich habe wie ohne Filter ` +
        'geantwortet.',
      categoriaTolta: (tolti, cerca) =>
        `${fraCaporali(tolti)} nennt die Kategorie und keine Person: Ich habe es entfernt und ` +
        `nach «${cerca}» gesucht.`,
      nessunaConICampi: (inRegistro, cerca, campi) =>
        `Im Klassenbuch stehen ${inRegistro} Personen, und keine` +
        `${cerca === '' ? '' : ` von denen, die zu «${cerca}» passen,`} hat die Felder ` +
        `${fraCaporali(campi)} wie verlangt: Rufe «persone.cerca» ohne «ha» und «senza» auf, ` +
        'um zu erweitern.',
      nessunaPassa: (inRegistro) =>
        `Im Klassenbuch stehen ${inRegistro} Personen, und keine besteht die Filter.`,
      nessunaCorrisponde: (cerca, inRegistro) =>
        `Keine passt zu «${cerca}», aber im Klassenbuch stehen ${inRegistro}: ` +
        'Rufe «persone.cerca» ohne «cerca» auf, um alle zu erhalten.',
      ritiratiAVero: '«ritirati» auf wahr',
      archiviateAVero: '«archiviate» auf wahr',
      rientrano: (interruttori) =>
        `Mit ${interruttori.join(' und ')} kommen die dazu, die der Filter draussen lässt.`,
    },
    presentazione: {
      titolo: 'Wer passt',
      cercando: 'Gesucht',
      trovate: 'Gefunden',
      nelRegistro: 'Im Klassenbuch',
      ritirate: 'Ausgetreten, ausserhalb des Filters',
      archiviate: 'In archivierten Klassen, ausserhalb',
      paroleTolte: 'Aus dem Filter entfernte Wörter',
      daSapere: 'Gut zu wissen',
      classe: 'Klasse',
      azienda: 'Lehrbetrieb',
      frequenta: 'Nimmt teil',
    },
  },
  fr: {
    titolo: 'Trouve une personne en formation par nom, classe ou entreprise',
    cerca:
      'Fragments de nom, classe ou entreprise : chaque fragment doit se trouver, « dic4a » et ' +
      'un fragment de nom ensemble restreignent. Sans : toutes reviennent',
    ritirati:
      'Vrai pour chercher aussi parmi les personnes qui ne suivent plus les cours : en principe ' +
      'elles restent de côté',
    archiviate:
      'Vrai pour chercher aussi dans les classes archivées : en principe elles restent de côté',
    lePersone: 'les personnes',
    cercaUscita: 'Le filtre réellement appliqué. Vide quand rien n’a été filtré',
    ignorato:
      'Les mots retirés du filtre parce qu’ils nomment la catégorie, pas une personne',
    comune: 'La commune sur laquelle on a filtré. Vide quand il n’y en a pas eu',
    cap: 'Le NPA sur lequel on a filtré. Vide quand il n’y en a pas eu',
    ha: 'Les champs demandés remplis',
    senza: 'Les champs demandés vides',
    inRegistro: 'Combien de personnes il y a en tout dans le registre, filtres compris',
    esclusiRitirati:
      'Combien restent de côté parce qu’elles ne suivent plus les cours : avec « ritirati » à ' +
      'vrai, elles reviennent',
    esclusiArchiviate:
      'Combien restent de côté parce que la classe est archivée : avec « archiviate » à vrai, ' +
      'elles reviennent',
    suggerimento: 'Quoi appeler pour avoir ce qui manque. Vide s’il ne manque rien',
    id: 'À passer à « persone.scheda »',
    attivo: 'Faux pour qui a abandonné',
    frasi: {
      categoriaSenzaFiltro: (tolti) =>
        `${fraGuillemets(tolti)} nomme la catégorie et pas une personne : j’ai répondu comme ` +
        'sans filtre.',
      categoriaTolta: (tolti, cerca) =>
        `${fraGuillemets(tolti)} nomme la catégorie et pas une personne : je l’ai retiré, et ` +
        `j’ai cherché « ${cerca} ».`,
      nessunaConICampi: (inRegistro, cerca, campi) =>
        `Il y a ${inRegistro} personnes dans le registre, et aucune` +
        `${cerca === '' ? '' : ` parmi celles qui correspondent à « ${cerca} »`} n’a les champs ` +
        `${fraGuillemets(campi)} comme demandé : rappelle « persone.cerca » sans « ha » et ` +
        '« senza » pour élargir.',
      nessunaPassa: (inRegistro) =>
        `Il y a ${inRegistro} personnes dans le registre, et aucune ne passe les filtres.`,
      nessunaCorrisponde: (cerca, inRegistro) =>
        `Aucune ne correspond à « ${cerca} », mais le registre en compte ${inRegistro} : ` +
        'rappelle « persone.cerca » sans « cerca » pour les avoir toutes.',
      ritiratiAVero: '« ritirati » à vrai',
      archiviateAVero: '« archiviate » à vrai',
      rientrano: (interruttori) =>
        `Avec ${interruttori.join(' et ')}, celles que le filtre laisse de côté reviennent.`,
    },
    presentazione: {
      titolo: 'Qui correspond',
      cercando: 'Recherche',
      trovate: 'Trouvées',
      nelRegistro: 'Dans le registre',
      ritirate: 'Ayant abandonné, hors filtre',
      archiviate: 'Dans des classes archivées, hors filtre',
      paroleTolte: 'Mots retirés du filtre',
      daSapere: 'À savoir',
      classe: 'Classe',
      azienda: 'Entreprise',
      frequenta: 'Suit les cours',
    },
  },
  en: {
    titolo: 'Finds a learner by name, class or training company',
    cerca:
      'Pieces of surname, class or company: every piece must match, “dic4a” and a piece of ' +
      'surname together narrow it down. Without it, everyone comes back',
    ritirati: 'True to search among those who no longer attend too: normally they are left out',
    archiviate: 'True to search in archived classes too: normally they are left out',
    lePersone: 'the people',
    cercaUscita: 'The filter actually applied. Empty when nothing was filtered',
    ignorato: 'The words removed from the filter because they name the category, not a person',
    comune: 'The municipality filtered on. Empty when none was asked for',
    cap: 'The postcode filtered on. Empty when none was asked for',
    ha: 'The fields asked for filled in',
    senza: 'The fields asked for empty',
    inRegistro: 'How many people there are in the register in total, filters included',
    esclusiRitirati:
      'How many are left out because they no longer attend: with “ritirati” set to true they ' +
      'come back in',
    esclusiArchiviate:
      'How many are left out because the class is archived: with “archiviate” set to true ' +
      'they come back in',
    suggerimento: 'What to call to get what is missing. Empty if nothing is missing',
    id: 'To pass to “persone.scheda”',
    attivo: 'False for those who have withdrawn',
    frasi: {
      categoriaSenzaFiltro: (tolti) =>
        `${fraVirgolette(tolti)} names the category and not a person: I answered as if there ` +
        'were no filter.',
      categoriaTolta: (tolti, cerca) =>
        `${fraVirgolette(tolti)} names the category and not a person: I removed it and ` +
        `searched for “${cerca}”.`,
      nessunaConICampi: (inRegistro, cerca, campi) =>
        `There are ${inRegistro} people in the register, and none` +
        `${cerca === '' ? '' : ` of those matching “${cerca}”`} has the fields ` +
        `${fraVirgolette(campi)} as asked: call “persone.cerca” again without “ha” and “senza” ` +
        'to widen it.',
      nessunaPassa: (inRegistro) =>
        `There are ${inRegistro} people in the register, and none passes the filters.`,
      nessunaCorrisponde: (cerca, inRegistro) =>
        `None matches “${cerca}”, but the register has ${inRegistro}: ` +
        'call “persone.cerca” again without “cerca” to get them all.',
      ritiratiAVero: '“ritirati” set to true',
      archiviateAVero: '“archiviate” set to true',
      rientrano: (interruttori) =>
        `With ${interruttori.join(' and ')}, those the filter leaves out come back in.`,
    },
    presentazione: {
      titolo: 'Who matches',
      cercando: 'Searching for',
      trovate: 'Found',
      nelRegistro: 'In the register',
      ritirate: 'Withdrawn, outside the filter',
      archiviate: 'In archived classes, left out',
      paroleTolte: 'Words removed from the filter',
      daSapere: 'Worth knowing',
      classe: 'Class',
      azienda: 'Company',
      frequenta: 'Attends',
    },
  },
})
