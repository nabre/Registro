// I testi delle assenze da far firmare: la matrice dei periodi, la cornice dei
// fogli, le richieste di firma e le segnalazioni oltre soglia nel todo.

import { catalogo, numero, perNumero } from '../../i18n/index.js'
import { etichettaFoglio } from '../../domain/absences.js'
import { PERSONE, PIF, UD, corto, dei, del, quanti } from '../../domain/lexicon.js'
import { lessico } from '../../domain/lexicon.testi.js'
import type { TipoRapporto } from '../../domain/models.js'
import { plurale } from '../../domain/text.js'

const it = {
  colonne: {
    vergineAssenze: { titolo: 'Assenze da spedire', breve: 'ass.' },
    vergineRitardi: { titolo: 'Ritardi da spedire', breve: 'rit.' },
    invio: { titolo: 'Richiesta di firma spedita', breve: 'mail' },
    firmatoAssenze: { titolo: 'Assenze firmate', breve: 'ass. ✓' },
    firmatoRitardi: { titolo: 'Ritardi firmati', breve: 'rit. ✓' },
  },
  /** Come si chiama un foglio: «assenze», «ritardi firmati». */
  foglio: (tipo: TipoRapporto, firmato: boolean) => etichettaFoglio(tipo, firmato),
  /** «assenze firmate di Rossi Anna» */
  diChi: (che: string, chi: string) => `${che} di ${chi}`,
  daDividere: (pagine: number) => `da dividere · ${plurale(pagine, 'pagina', 'pagine')}`,
  guarda: (nome: string) => `Guarda ${nome}`,
  sceltaFile: (che: string, chi: string) => `${che} di ${chi}: scegli il file`,
  togliFile: (nome: string) => `Togli ${nome}`,

  // La casella della mail.
  nessunIndirizzo: (chi: string, mancano: string) =>
    `Non si sa a chi scrivere per ${chi}: manca ${mancano}. ` +
    `L’indirizzo ${del(PERSONE.datore)} sta nella sua scheda.`,
  rifareBozza: (chi: string) => `Rifare la bozza per ${chi}?`,
  preparareBozza: (a: string) => `Preparare la bozza per ${a}?`,
  allegati: (fogli: number) =>
    `${plurale(fogli, 'foglio', 'fogli')} in allegato. ` +
    'La bozza si apre nel programma di posta, e a spedirla sei tu.',
  giaPartita: '\n\nLa richiesta era già partita: arriverà una seconda volta.',
  prepara: 'Prepara',
  nonPartitaPerche: (errore: string) => `Non partita: ${errore}`,
  speditaIl: (giorno: string, a: string) => `Spedita il ${giorno} a ${a}\nRispedisci`,
  mancaIndirizzo: (mancano: string) => `Manca l’indirizzo: ${mancano}`,
  spedisciA: (a: string) => `Spedisci a ${a}`,
  riportaDaMandare: (chi: string) => `Riporta da mandare la richiesta di ${chi}`,
  segnaSpedita: (chi: string) => `Segna spedita la richiesta di ${chi}`,

  // Le pastiglie della fase.
  firmato: 'firmato',
  inAttesa: 'in attesa',
  daSpedire: 'da spedire',
  nonPartita: 'non partita',
  inAttesaDellaFirma: 'in attesa della firma',

  // La matrice e l'elenco dei periodi.
  senzaDatore: ' senza datore',
  senzaDatoreAiuto: 'Senza l’indirizzo del datore l’e-mail non parte',
  apriPeriodo: 'Apri il periodo',
  nessunFoglio: 'nessun foglio caricato',
  contoPeriodo: (firmate: number, interessati: number, inviate: number) =>
    `${firmate}/${interessati} firmati · ${inviate} spediti`,
  nonPartite: (quante: number) => `${quante} non partite`,
  completo: 'completo',
  modificaPeriodo: 'Modifica il periodo',

  // La cornice del foglio aperto.
  buttareVia: (nome: string) => `Buttare via «${nome}»?`,
  togliere: (che: string, chi: string) => `Togliere ${che} di ${chi}?`,
  nelCestinoDaDividere: (nome: string) =>
    `«${nome}» va nel cestino con tutto quel che resta da dividere. Le pagine già ` +
    'assegnate restano dove sono: quelle sono archiviate.',
  nelCestino: (nome: string, firmato: boolean) =>
    `${nome} va nel cestino del documento dell’anno` +
    (firmato
      ? ': è la prova della firma, ed è spesso l’unica copia che esiste.'
      : ', e quella casella torna da riempire.'),
  manca: (nome: string) =>
    `Il registro lo dà per caricato, ma «${nome}» non è più dentro il documento ` +
    'dell’anno. Ricaricalo dalla sua casella, o toglilo.',

  // La scheda del periodo e l'invio di tutte.
  preparareUna: 'Preparare la richiesta di firma?',
  preparareMolte: (quante: number) => `Preparare ${quante} richieste di firma?`,
  spiegaInvio:
    `Una bozza per ${PIF.singolare}, all’azienda, con dentro i suoi fogli. Finiscono tutte in ` +
    'una cartella che si apre da sé: le mandi una a una dal programma di posta.',
  restanoIndietro: (quante: number) =>
    `\n\n${quante} restano indietro: non hanno nessun indirizzo a cui scrivere.`,
  titolo: 'Assenze da far firmare',
  aiuto: 'un periodo per volta: i fogli che partono, l’e-mail, le firme che tornano',
  caricaPdf: 'Carica dei PDF',
  caricaPdfAiuto:
    'Porta dentro i PDF della scuola: le loro pagine si trascinano poi sulla casella ' +
    'di chi sono. Si possono anche lasciar cadere sulla pagina.',
  importaFogli: 'Importa fogli',
  importaFogliAiuto: 'Prende una cartella di PDF e li assegna dal nome del file',
  preparaInvio: (quante: number) => `Prepara invio (${quante})`,
  completaIndirizzi: `Completa gli indirizzi ${dei(PERSONE.datore)} nelle schede personali`,
  preparaRichieste: 'Prepara le richieste secondo le impostazioni di posta',
  nessunPeriodo: 'Nessun periodo aperto',
  spiegaPeriodo:
    'Un periodo tiene insieme le tre fasi: i fogli di assenze e ritardi che la ' +
    'scuola stampa, l’e-mail che li manda in azienda con la richiesta di firma, e ' +
    'i fogli firmati che tornano indietro. Si comincia da «Nuovo periodo», nella ' +
    'riga dei comandi — il giorno in cui comincia e quello in cui finisce, e ' +
    'nient’altro — e poi si importano i PDF.',
  conAssenze: 'con assenze',
  spediti: 'spediti',
  firmati: 'firmati',
  nonPartiteBreve: 'non partite',
  matriceVuota: `La matrice compare quando la classe ha delle ${PIF.plurale} che frequentano.`,
  nessunFoglioAiuto:
    'Nessun foglio caricato: trascina qui il PDF della scuola e posa le sue ' +
    'pagine sulla casella di chi sono; «Importa fogli» prende una cartella ' +
    'intera e assegna ciascun file dal suo nome; il « + » di una casella ne ' +
    'aggiunge uno solo.',

  // Le richieste di firma nel todo.
  apriPeriodoDellaClasse: 'Apri il periodo di quella classe',
  preparaEmail: 'Prepara l’e-mail',
  caricaFirmato: (chi: string) => `Carica il foglio firmato di ${chi}`,
  riportaNonPartita: 'Riporta da mandare: l’e-mail non è partita',
  segnaSpeditaDaPosta: 'Segna spedita: l’hai mandata dal programma di posta',

  // Le assenze oltre la soglia.
  udPerse: (perse: number, previste: number) => `${perse} ${corto(UD)} perse su ${previste}`,
  // Può avere un decimale, e il decimale si scrive con la virgola.
  percentoAssenza: (percento: number) => `${String(percento).replace('.', ',')}% di assenza`,
  appelliDaCompletare: 'appelli da completare',
  apriScheda: 'Apri la scheda',
  apriSchedaAiuto: 'Le ore di questa persona, una per una',
  apriCorso: 'Apri il corso',
  apriCorsoAiuto: 'La stessa percentuale accanto a quella degli altri',
}

const de = lessico.in('de')
const fr = lessico.in('fr')
const en = lessico.in('en')

export const testi = catalogo(it, {
  de: {
    colonne: {
      vergineAssenze: { titolo: 'Zu verschickende Absenzen', breve: 'Abs.' },
      vergineRitardi: { titolo: 'Zu verschickende Verspätungen', breve: 'Versp.' },
      invio: { titolo: 'Unterschriftsanfrage verschickt', breve: 'Mail' },
      firmatoAssenze: { titolo: 'Unterschriebene Absenzen', breve: 'Abs. ✓' },
      firmatoRitardi: { titolo: 'Unterschriebene Verspätungen', breve: 'Versp. ✓' },
    },
    foglio: (tipo, firmato) =>
      tipo === 'assenze'
        ? (firmato ? 'unterschriebene Absenzen' : 'Absenzen')
        : (firmato ? 'unterschriebene Verspätungen' : 'Verspätungen'),
    diChi: (che, chi) => `${che} von ${chi}`,
    daDividere: (pagine) => `aufzuteilen · ${plurale(pagine, 'Seite', 'Seiten')}`,
    guarda: (nome) => `${nome} ansehen`,
    sceltaFile: (che, chi) => `${che} von ${chi}: Datei auswählen`,
    togliFile: (nome) => `${nome} entfernen`,
    nessunIndirizzo: (chi, mancano) =>
      `Unklar, an wen für ${chi} zu schreiben ist: Es fehlt ${mancano}. ` +
      'Die Adresse des Arbeitgebers steht im Personenblatt.',
    rifareBozza: (chi) => `Entwurf für ${chi} neu erstellen?`,
    preparareBozza: (a) => `Entwurf für ${a} vorbereiten?`,
    allegati: (fogli) =>
      `${plurale(fogli, 'Blatt', 'Blätter')} im Anhang. ` +
      'Der Entwurf öffnet sich im Mailprogramm, verschicken musst du ihn selbst.',
    giaPartita: '\n\nDie Anfrage war schon verschickt: Sie kommt ein zweites Mal an.',
    prepara: 'Vorbereiten',
    nonPartitaPerche: (errore) => `Nicht verschickt: ${errore}`,
    speditaIl: (giorno, a) => `Verschickt am ${giorno} an ${a}\nErneut verschicken`,
    mancaIndirizzo: (mancano) => `Adresse fehlt: ${mancano}`,
    spedisciA: (a) => `An ${a} verschicken`,
    riportaDaMandare: (chi) => `Anfrage von ${chi} wieder auf «zu verschicken» setzen`,
    segnaSpedita: (chi) => `Anfrage von ${chi} als verschickt markieren`,
    firmato: 'unterschrieben',
    inAttesa: 'ausstehend',
    daSpedire: 'zu verschicken',
    nonPartita: 'nicht verschickt',
    inAttesaDellaFirma: 'wartet auf Unterschrift',
    senzaDatore: ` ohne ${de.datore.singolare}`,
    senzaDatoreAiuto: 'Ohne Adresse des Arbeitgebers geht die E-Mail nicht raus',
    apriPeriodo: 'Zeitraum öffnen',
    nessunFoglio: 'kein Blatt geladen',
    contoPeriodo: (firmate, interessati, inviate) =>
      `${firmate}/${interessati} unterschrieben · ${inviate} verschickt`,
    nonPartite: (quante) => `${quante} nicht verschickt`,
    completo: 'vollständig',
    modificaPeriodo: 'Zeitraum bearbeiten',
    buttareVia: (nome) => `«${nome}» wegwerfen?`,
    togliere: (che, chi) => `${che} von ${chi} entfernen?`,
    nelCestinoDaDividere: (nome) =>
      `«${nome}» kommt in den Papierkorb, samt allem, was noch aufzuteilen ist. Bereits ` +
      'zugeordnete Seiten bleiben, wo sie sind: Die sind archiviert.',
    nelCestino: (nome, firmato) =>
      `${nome} kommt in den Papierkorb des Jahresdokuments` +
      (firmato
        ? ': Es ist der Nachweis der Unterschrift und oft die einzige Kopie, die es gibt.'
        : ', und dieses Feld ist wieder leer.'),
    manca: (nome) =>
      `Das Klassenbuch führt es als geladen, aber «${nome}» ist nicht mehr im ` +
      'Jahresdokument. Lade es über sein Feld neu oder entferne es.',
    preparareUna: 'Unterschriftsanfrage vorbereiten?',
    preparareMolte: (quante) => `${quante} Unterschriftsanfragen vorbereiten?`,
    spiegaInvio:
      'Ein Entwurf pro Person, an den Lehrbetrieb, mit den eigenen Blättern im ' +
      'Anhang. Alle landen in einem Ordner, der sich von selbst öffnet: Du verschickst sie ' +
      'einzeln aus deinem Mailprogramm.',
    restanoIndietro: (quante) =>
      `\n\n${quante} ${perNumero(quante, 'bleibt', 'bleiben')} zurück: ` +
      'Es gibt keine Adresse, an die man schreiben könnte.',
    titolo: 'Absenzen zum Unterschreiben',
    aiuto: 'ein Zeitraum nach dem anderen: die Blätter, die rausgehen, die E-Mail, ' +
      'die Unterschriften, die zurückkommen',
    caricaPdf: 'PDFs laden',
    caricaPdfAiuto:
      'Hol die PDFs der Schule herein und zieh danach ihre Seiten auf das Feld der ' +
      'Person, zu der sie gehören. Du kannst sie auch einfach auf die Seite fallen lassen.',
    importaFogli: 'Blätter importieren',
    importaFogliAiuto: 'Nimmt einen Ordner mit PDFs und ordnet sie nach dem Dateinamen zu',
    preparaInvio: (quante) => `Versand vorbereiten (${quante})`,
    completaIndirizzi: 'Ergänze die Adressen der Arbeitgeber in den Personenblättern',
    preparaRichieste: 'Bereitet die Anfragen nach den Mail-Einstellungen vor',
    nessunPeriodo: 'Kein Zeitraum offen',
    spiegaPeriodo:
      'Ein Zeitraum hält die drei Schritte zusammen: die Blätter mit Absenzen und ' +
      'Verspätungen, die die Schule druckt, die E-Mail, die sie mit der Unterschriftsanfrage ' +
      'an den Betrieb schickt, und die unterschriebenen Blätter, die zurückkommen. Los geht ' +
      'es mit «Neuer Zeitraum» in der Befehlszeile — der Tag, an dem er beginnt, und der, ' +
      'an dem er endet, sonst nichts — und dann importierst du die PDFs.',
    conAssenze: 'mit Absenzen',
    spediti: 'verschickt',
    firmati: 'unterschrieben',
    nonPartiteBreve: 'nicht verschickt',
    matriceVuota: `Die Matrix erscheint, sobald die Klasse aktive ${de.pif.plurale} hat.`,
    nessunFoglioAiuto:
      'Kein Blatt geladen: Zieh das PDF der Schule hierher und leg seine Seiten auf das ' +
      'Feld der Person, zu der sie gehören; «Blätter importieren» nimmt einen ganzen Ordner ' +
      'und ordnet jede Datei nach ihrem Namen zu; das «+» eines Felds fügt ein einzelnes ' +
      'hinzu.',
    apriPeriodoDellaClasse: 'Zeitraum dieser Klasse öffnen',
    preparaEmail: 'E-Mail vorbereiten',
    caricaFirmato: (chi) => `Unterschriebenes Blatt von ${chi} laden`,
    riportaNonPartita: 'Wieder auf «zu verschicken»: Die E-Mail ist nicht rausgegangen',
    segnaSpeditaDaPosta: 'Als verschickt markieren: Du hast sie aus dem Mailprogramm verschickt',
    udPerse: (perse, previste) =>
      `${perse} von ${quanti(previste, de.unitaDidattica)} verpasst`,
    percentoAssenza: (percento) => `${numero(percento)} % Absenzen`,
    appelliDaCompletare: 'Präsenzkontrollen zu vervollständigen',
    apriScheda: 'Personenblatt öffnen',
    apriSchedaAiuto: 'Die Stunden dieser Person, eine nach der anderen',
    apriCorso: 'Kurs öffnen',
    apriCorsoAiuto: 'Derselbe Prozentsatz neben dem der anderen',
  },
  fr: {
    colonne: {
      vergineAssenze: { titolo: 'Absences à envoyer', breve: 'abs.' },
      vergineRitardi: { titolo: 'Retards à envoyer', breve: 'ret.' },
      invio: { titolo: 'Demande de signature envoyée', breve: 'e-mail' },
      firmatoAssenze: { titolo: 'Absences signées', breve: 'abs. ✓' },
      firmatoRitardi: { titolo: 'Retards signés', breve: 'ret. ✓' },
    },
    foglio: (tipo, firmato) =>
      tipo === 'assenze'
        ? (firmato ? 'absences signées' : 'absences')
        : (firmato ? 'retards signés' : 'retards'),
    diChi: (che, chi) => `${che} de ${chi}`,
    daDividere: (pagine) => `à répartir · ${plurale(pagine, 'page', 'pages')}`,
    guarda: (nome) => `Voir ${nome}`,
    sceltaFile: (che, chi) => `${che} de ${chi} : choisis le fichier`,
    togliFile: (nome) => `Retirer ${nome}`,
    nessunIndirizzo: (chi, mancano) =>
      `On ne sait pas à qui écrire pour ${chi} : il manque ${mancano}. ` +
      'L’adresse de l’employeur se trouve dans sa fiche personnelle.',
    rifareBozza: (chi) => `Refaire le brouillon pour ${chi} ?`,
    preparareBozza: (a) => `Préparer le brouillon pour ${a} ?`,
    allegati: (fogli) =>
      `${plurale(fogli, 'feuille', 'feuilles')} en pièce jointe. ` +
      'Le brouillon s’ouvre dans ton programme de messagerie, et c’est toi qui l’envoies.',
    giaPartita: '\n\nLa demande était déjà partie : elle arrivera une deuxième fois.',
    prepara: 'Préparer',
    nonPartitaPerche: (errore) => `Non envoyée : ${errore}`,
    speditaIl: (giorno, a) => `Envoyée le ${giorno} à ${a}\nRenvoyer`,
    mancaIndirizzo: (mancano) => `Adresse manquante : ${mancano}`,
    spedisciA: (a) => `Envoyer à ${a}`,
    riportaDaMandare: (chi) => `Remettre la demande de ${chi} à envoyer`,
    segnaSpedita: (chi) => `Marquer la demande de ${chi} comme envoyée`,
    firmato: 'signé',
    inAttesa: 'en attente',
    daSpedire: 'à envoyer',
    nonPartita: 'non envoyée',
    inAttesaDellaFirma: 'en attente de signature',
    senzaDatore: ` sans ${fr.datore.singolare}`,
    senzaDatoreAiuto: 'Sans l’adresse de l’employeur, l’e-mail ne part pas',
    apriPeriodo: 'Ouvrir la période',
    nessunFoglio: 'aucune feuille chargée',
    contoPeriodo: (firmate, interessati, inviate) =>
      `${firmate}/${interessati} signés · ${inviate} envoyés`,
    nonPartite: (quante) => `${quante} non envoyés`,
    completo: 'complet',
    modificaPeriodo: 'Modifier la période',
    buttareVia: (nome) => `Jeter « ${nome} » ?`,
    togliere: (che, chi) => `Retirer les ${che} de ${chi} ?`,
    nelCestinoDaDividere: (nome) =>
      `« ${nome} » part à la corbeille avec tout ce qui reste à répartir. Les pages déjà ` +
      'attribuées restent où elles sont : elles sont archivées.',
    nelCestino: (nome, firmato) =>
      `${nome} part à la corbeille du document de l’année` +
      (firmato
        ? ' : c’est la preuve de la signature, et souvent la seule copie qui existe.'
        : ', et cette case est de nouveau à remplir.'),
    manca: (nome) =>
      `Le registre le considère comme chargé, mais « ${nome} » n’est plus dans le document ` +
      'de l’année. Recharge-le depuis sa case, ou retire-le.',
    preparareUna: 'Préparer la demande de signature ?',
    preparareMolte: (quante) => `Préparer ${quante} demandes de signature ?`,
    spiegaInvio:
      `Un brouillon par ${fr.pif.singolare}, adressé à l’entreprise, avec ses feuilles en ` +
      'pièce jointe. Ils arrivent tous dans un dossier qui s’ouvre tout seul : tu les ' +
      'envoies un par un depuis ton programme de messagerie.',
    restanoIndietro: (quante) =>
      `\n\n${quante} ${perNumero(quante, 'reste', 'restent')} de côté : ` +
      'il n’y a aucune adresse à laquelle écrire.',
    titolo: 'Absences à faire signer',
    aiuto: 'une période à la fois : les feuilles qui partent, l’e-mail, les signatures qui ' +
      'reviennent',
    caricaPdf: 'Charger des PDF',
    caricaPdfAiuto:
      'Fais entrer les PDF de l’école : leurs pages se glissent ensuite sur la case de la ' +
      'personne concernée. On peut aussi les déposer sur la page.',
    importaFogli: 'Importer des feuilles',
    importaFogliAiuto: 'Prend un dossier de PDF et les attribue d’après le nom du fichier',
    preparaInvio: (quante) => `Préparer l’envoi (${quante})`,
    completaIndirizzi:
      `Complète les adresses des ${fr.datore.plurale} dans les fiches personnelles`,
    preparaRichieste: 'Prépare les demandes selon les réglages de messagerie',
    nessunPeriodo: 'Aucune période ouverte',
    spiegaPeriodo:
      'Une période réunit les trois étapes : les feuilles d’absences et de retards que ' +
      'l’école imprime, l’e-mail qui les envoie à l’entreprise avec la demande de ' +
      'signature, et les feuilles signées qui reviennent. On commence par « Nouvelle ' +
      'période », dans la barre des commandes — le jour où elle commence et celui où ' +
      'elle finit, rien d’autre — puis on importe les PDF.',
    conAssenze: 'avec absences',
    spediti: 'envoyés',
    firmati: 'signés',
    nonPartiteBreve: 'non envoyés',
    matriceVuota:
      `La matrice apparaît dès que la classe compte des ${fr.pif.plurale} qui la fréquentent.`,
    nessunFoglioAiuto:
      'Aucune feuille chargée : glisse ici le PDF de l’école et dépose ses pages sur la ' +
      'case de la personne concernée ; « Importer des feuilles » prend un dossier entier et ' +
      'attribue chaque fichier d’après son nom ; le « + » d’une case en ajoute une seule.',
    apriPeriodoDellaClasse: 'Ouvrir la période de cette classe',
    preparaEmail: 'Préparer l’e-mail',
    caricaFirmato: (chi) => `Charger la feuille signée de ${chi}`,
    riportaNonPartita: 'Remettre à envoyer : l’e-mail n’est pas parti',
    segnaSpeditaDaPosta: 'Marquer comme envoyée : tu l’as envoyée depuis ta messagerie',
    udPerse: (perse, previste) =>
      `${quanti(perse, fr.unitaDidattica)} ${perNumero(perse, 'manquée', 'manquées')} ` +
      `sur ${previste}`,
    percentoAssenza: (percento) => `${numero(percento)} % d’absences`,
    appelliDaCompletare: 'appels à compléter',
    apriScheda: 'Ouvrir la fiche',
    apriSchedaAiuto: 'Les leçons de cette personne, une par une',
    apriCorso: 'Ouvrir le cours',
    apriCorsoAiuto: 'Le même pourcentage à côté de celui des autres',
  },
  en: {
    colonne: {
      vergineAssenze: { titolo: 'Absences to send', breve: 'abs.' },
      vergineRitardi: { titolo: 'Late arrivals to send', breve: 'late' },
      invio: { titolo: 'Signature request sent', breve: 'email' },
      firmatoAssenze: { titolo: 'Signed absences', breve: 'abs. ✓' },
      firmatoRitardi: { titolo: 'Signed late arrivals', breve: 'late ✓' },
    },
    foglio: (tipo, firmato) =>
      tipo === 'assenze'
        ? (firmato ? 'signed absences' : 'absences')
        : (firmato ? 'signed late arrivals' : 'late arrivals'),
    diChi: (che, chi) => `${che} for ${chi}`,
    daDividere: (pagine) => `to split · ${plurale(pagine, 'page', 'pages')}`,
    guarda: (nome) => `View ${nome}`,
    sceltaFile: (che, chi) => `${che} for ${chi}: choose the file`,
    togliFile: (nome) => `Remove ${nome}`,
    nessunIndirizzo: (chi, mancano) =>
      `There is no one to write to for ${chi}: missing ${mancano}. ` +
      `The ${en.datore.singolare}’s address goes in their personal record.`,
    rifareBozza: (chi) => `Redo the draft for ${chi}?`,
    preparareBozza: (a) => `Prepare the draft for ${a}?`,
    allegati: (fogli) =>
      `${plurale(fogli, 'sheet', 'sheets')} attached. ` +
      'The draft opens in your email program, and you are the one who sends it.',
    giaPartita: '\n\nThe request had already gone out: it will arrive a second time.',
    prepara: 'Prepare',
    nonPartitaPerche: (errore) => `Not sent: ${errore}`,
    speditaIl: (giorno, a) => `Sent on ${giorno} to ${a}\nSend again`,
    mancaIndirizzo: (mancano) => `Address missing: ${mancano}`,
    spedisciA: (a) => `Send to ${a}`,
    riportaDaMandare: (chi) => `Set ${chi}’s request back to “to send”`,
    segnaSpedita: (chi) => `Mark ${chi}’s request as sent`,
    firmato: 'signed',
    inAttesa: 'waiting',
    daSpedire: 'to send',
    nonPartita: 'not sent',
    inAttesaDellaFirma: 'waiting for signature',
    senzaDatore: ` no ${en.datore.singolare}`,
    senzaDatoreAiuto: `Without the ${en.datore.singolare}’s address the email won’t go out`,
    apriPeriodo: 'Open the period',
    nessunFoglio: 'no sheet loaded',
    contoPeriodo: (firmate, interessati, inviate) =>
      `${firmate}/${interessati} signed · ${inviate} sent`,
    nonPartite: (quante) => `${quante} not sent`,
    completo: 'complete',
    modificaPeriodo: 'Edit the period',
    buttareVia: (nome) => `Throw away “${nome}”?`,
    togliere: (che, chi) => `Remove the ${che} for ${chi}?`,
    nelCestinoDaDividere: (nome) =>
      `“${nome}” goes to the bin with everything still to be split. Pages already ` +
      'assigned stay where they are: those are archived.',
    nelCestino: (nome, firmato) =>
      `${nome} goes to the bin of the year’s document` +
      (firmato
        ? ': it is the proof of the signature, and often the only copy there is.'
        : ', and that box needs filling again.'),
    manca: (nome) =>
      `The register lists it as loaded, but “${nome}” is no longer in the year’s ` +
      'document. Load it again from its box, or remove it.',
    preparareUna: 'Prepare the signature request?',
    preparareMolte: (quante) => `Prepare ${quante} signature requests?`,
    spiegaInvio:
      `One draft per ${en.pif.singolare}, to the company, with their sheets attached. They ` +
      'all end up in a folder that opens by itself: you send them one by one from your ' +
      'email program.',
    restanoIndietro: (quante) =>
      `\n\n${quante} ${perNumero(quante, 'is', 'are')} left out: ` +
      'there is no address to write to.',
    titolo: 'Absences to get signed',
    aiuto: 'one period at a time: the sheets going out, the email, the signatures coming back',
    caricaPdf: 'Load PDFs',
    caricaPdfAiuto:
      'Bring in the school’s PDFs: you then drag their pages onto the box of the person ' +
      'they belong to. You can also drop them onto the page.',
    importaFogli: 'Import sheets',
    importaFogliAiuto: 'Takes a folder of PDFs and assigns them by file name',
    preparaInvio: (quante) => `Prepare to send (${quante})`,
    completaIndirizzi: `Fill in the ${en.datore.plurale}’ addresses in the personal records`,
    preparaRichieste: 'Prepares the requests according to the email settings',
    nessunPeriodo: 'No period open',
    spiegaPeriodo:
      'A period holds the three stages together: the absence and late-arrival sheets the ' +
      'school prints, the email that sends them to the company with the signature request, ' +
      'and the signed sheets that come back. Start with “New period” in the command bar — ' +
      'the day it begins and the day it ends, nothing else — and then import the PDFs.',
    conAssenze: 'with absences',
    spediti: 'sent',
    firmati: 'signed',
    nonPartiteBreve: 'not sent',
    matriceVuota: `The grid appears once the class has ${en.pif.plurale} attending.`,
    nessunFoglioAiuto:
      'No sheet loaded: drag the school’s PDF here and drop its pages onto the box of the ' +
      'person they belong to; “Import sheets” takes a whole folder and assigns each file by ' +
      'its name; the “+” in a box adds just one.',
    apriPeriodoDellaClasse: 'Open that class’s period',
    preparaEmail: 'Prepare the email',
    caricaFirmato: (chi) => `Load ${chi}’s signed sheet`,
    riportaNonPartita: 'Back to “to send”: the email didn’t go out',
    segnaSpeditaDaPosta: 'Mark as sent: you sent it from your email program',
    udPerse: (perse, previste) => `${perse} of ${quanti(previste, en.unitaDidattica)} missed`,
    percentoAssenza: (percento) => `${numero(percento)}% absence`,
    appelliDaCompletare: 'attendance to complete',
    apriScheda: 'Open the record',
    apriSchedaAiuto: 'This person’s lessons, one by one',
    apriCorso: 'Open the course',
    apriCorsoAiuto: 'The same percentage next to everyone else’s',
  },
})
