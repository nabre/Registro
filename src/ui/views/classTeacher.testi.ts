// I testi del pannello del docente di classe (`classTeacher.ts`).

import { catalogo, minuscolo } from '../../i18n/index.js'
import { PIF } from '../../domain/lexicon.js'
import type { StatoComunicazione } from '../../domain/models.js'
import { plurale } from '../../domain/text.js'

const it = {
  // La matrice dei documenti, casella per casella.
  chiediloAnche: (testo: string, nome: string) => `«${testo}»: chiedilo anche a ${nome}`,
  consegnatoPerEmail: 'Consegnato per e-mail',
  consegnatoAMano: 'Consegnato a mano',
  portato: 'Portato',
  fattoIl: (come: string, data: string) => `${come} il ${data} — `,
  clicPerTogliere: 'clic per togliere la spunta',
  clicNonCambia: 'il clic non la cambia: tasto destro per toglierla',
  segnaConsegnatoA: (nome: string) => `Segna che l’hai consegnato a ${nome}`,
  segnaPortatoDa: (nome: string) => `Segna che ${nome} l’ha portato`,
  togliLaSpunta: 'Togli la spunta',
  segnaConsegnato: 'Segna consegnato',
  segnaPortato: 'Segna portato',
  guardaDocumentoDi: (documento: string, nome: string) =>
    `Guarda ${documento || 'il documento'} di ${nome}`,
  allegaDaConsegnare: (nome: string) => `Allega il documento da consegnare a ${nome}`,
  allegaScansione: (nome: string) => `Allega la scansione di ${nome}`,
  togliDocumentoDi: (nome: string) => `Togli il documento di ${nome}`,
  guardaFoglioFirme: (testo: string) => `Guarda il foglio firme di «${testo}»`,
  allegaFoglioFirme: (testo: string) => `Allega il foglio firme di «${testo}»`,
  togliFoglioFirme: 'Togli il foglio firme',
  foglioFirmeDi: (testo: string) => `Foglio firme · ${testo}`,
  firmeDiConsegna: 'Firme di consegna',
  entro: (data: string) => ` · entro ${data}`,
  apriLaConsegna: 'Apri la consegna',
  preparaInvioN: (quanti: number) => `Prepara invio (${quanti})`,
  preparaPerOgnuno: 'Prepara per ognuno la bozza con il suo documento',
  preparareLeBozze: (quanti: number) => `Preparare le bozze per ${quanti} ${PIF.plurale}?`,
  bozzeATesta:
    'Una bozza a testa, con il suo documento in allegato. Finiscono in una ' +
    'cartella che si apre da sé: le mandi una a una dal programma di posta.',
  prepara: 'Prepara',
  suoi: 'Suoi',
  // Le raccolte proprie.
  guarda: (nome: string) => `Guarda ${nome}`,
  nonAncoraRaccolto: 'Non ancora raccolto',
  raccolto: 'raccolto',
  atteso: 'atteso',
  // La scheda dei documenti.
  chiHaPortato: 'Chi ha portato che cosa',
  inRigaInColonna: `le ${PIF.plurale} in riga, i documenti chiesti in colonna`,
  senzaCorsi:
    'Un documento si chiede con una consegna, e una consegna sta su un corso: ' +
    'in questa classe non ne hai ancora nessuno.',
  richieste: 'richieste',
  personali: 'personali',
  fogliRaccolti: 'fogli raccolti',
  inAttesa: 'in attesa',
  scadute: 'scadute',
  documentiPersonali: 'Documenti personali',
  nessunDocumento: 'Nessun documento chiesto',
  classeVuota: 'Classe ancora vuota',
  comeSiChiede:
    'Chiedere un documento è dare una consegna che si spunta portando un ' +
    'foglio: sta nel todo con tutto il resto, e qui si vede a matrice chi ' +
    'non l’ha ancora portato.',
  matriceQuando: `La matrice compare quando la classe ha delle ${PIF.plurale} attive.`,
  // Le pendenze della classe.
  nienteInClasse: 'niente in sospeso in questa classe',
  primaUnCorso:
    'Per aggiungere una pendenza, crea prima un corso per questa classe dalla pagina Corsi.',
  nienteInSospeso: 'Niente in sospeso',
  cheCosaCompare:
    'Qui compare da sé quel che resta aperto in questa classe: i rapporti delle ' +
    'assenze da mandare e le firme da avere, le prove da correggere e da ridare, i ' +
    'documenti da raccogliere o da consegnare, le attività assegnate.',
  /** Il nome di una tipologia come etichetta di un conto: minuscolo dove la lingua lo vuole. */
  etichettaFamiglia: (nome: string) => nome.toLowerCase(),
  // I recapiti.
  recapiti: 'Recapiti',
  aiutoRecapiti: `gli indirizzi fissi; quelli delle ${PIF.plurale} stanno nelle loro schede`,
  raggiungibili: `${PIF.plurale} raggiungibili`,
  recapitiFissi: 'recapiti fissi',
  nessunRecapito: 'Nessun recapito fisso: segreteria, sede, capoclasse.',
  predefinito: 'predefinito',
  modificaRecapito: 'Modifica il recapito',
  // Le comunicazioni.
  senzaOggetto: 'senza oggetto',
  inviata: (data: string, destinatari: number) => `${data} · ${destinatari} destinatari`,
  bozza: (destinatari: number) => `bozza · ${destinatari} destinatari`,
  stati: {
    bozza: 'bozza',
    inviata: 'inviata',
    errore: 'errore',
  } satisfies Record<StatoComunicazione, string>,
  preparaInvio: 'Prepara invio',
  preparaSecondoImpostazioni: 'Prepara la comunicazione secondo le impostazioni di posta',
  riportaABozza: 'Riporta a bozza: la spunta era per sbaglio',
  segnaSpedita: 'Segna spedita: l’hai mandata dal programma di posta',
  aiutoComunicazioni: 'bozze da spedire dal programma di posta',
  nessunaComunicazione:
    `Nessuna comunicazione. Gli indirizzi vengono presi dalle schede delle ${PIF.plurale} ` +
    'e dai recapiti fissi, e vanno sempre in copia nascosta. Il registro prepara la ' +
    'bozza e la apre nel programma di posta: a spedirla sei tu.',
  // La pagina.
  nessunaClasse: 'Nessuna classe di cui sei docente',
  comeCompare:
    'Il fascicolo — documenti, recapiti, comunicazioni — compare sulle classi in cui è ' +
    'spuntato «Sono docente di classe». La spunta sta nei Dettagli della classe, in Classi.',
  vaiAlleClassi: 'Vai alle classi',
  pagine: {
    todo: {
      titolo: 'Pendenze della classe',
      aiuto: 'Le attività aperte e le scadenze da seguire.',
    },
    documenti: {
      titolo: 'Archivio documentale',
      aiuto: 'Che cosa è stato chiesto, che cosa è arrivato, e i PDF da dividere.',
    },
    assenze: {
      titolo: 'Assenze',
      aiuto: 'Importa i fogli, prepara le richieste e registra le firme ricevute.',
    },
    messaggistica: {
      titolo: 'Messaggistica',
      aiuto: 'Prepara le comunicazioni e gestisci i recapiti della classe.',
    },
  },
}

export const testi = catalogo(it, {
  de: {
    chiediloAnche: (testo, nome) => `«${testo}»: auch bei ${nome} anfordern`,
    consegnatoPerEmail: 'Per E-Mail übergeben',
    consegnatoAMano: 'Von Hand übergeben',
    portato: 'Gebracht',
    fattoIl: (come, data) => `${come} am ${data} — `,
    clicPerTogliere: 'ein Klick entfernt das Häkchen',
    clicNonCambia: 'ein Klick ändert es nicht: Rechtsklick zum Entfernen',
    segnaConsegnatoA: (nome) => `Vermerken, dass du es ${nome} übergeben hast`,
    segnaPortatoDa: (nome) => `Vermerken, dass ${nome} es gebracht hat`,
    togliLaSpunta: 'Häkchen entfernen',
    segnaConsegnato: 'Als übergeben markieren',
    segnaPortato: 'Als gebracht markieren',
    guardaDocumentoDi: (documento, nome) => `${documento || 'Dokument'} von ${nome} ansehen`,
    allegaDaConsegnare: (nome) => `Dokument zum Übergeben an ${nome} anhängen`,
    allegaScansione: (nome) => `Scan von ${nome} anhängen`,
    togliDocumentoDi: (nome) => `Dokument von ${nome} entfernen`,
    guardaFoglioFirme: (testo) => `Unterschriftenblatt zu «${testo}» ansehen`,
    allegaFoglioFirme: (testo) => `Unterschriftenblatt zu «${testo}» anhängen`,
    togliFoglioFirme: 'Unterschriftenblatt entfernen',
    foglioFirmeDi: (testo) => `Unterschriftenblatt · ${testo}`,
    firmeDiConsegna: 'Übergabe-Unterschriften',
    entro: (data) => ` · bis ${data}`,
    apriLaConsegna: 'Auftrag öffnen',
    preparaInvioN: (quanti) => `Versand vorbereiten (${quanti})`,
    preparaPerOgnuno: 'Für alle den Entwurf mit dem eigenen Dokument vorbereiten',
    preparareLeBozze: (quanti) => `Entwürfe für ${quanti} Lernende vorbereiten?`,
    bozzeATesta:
      'Ein Entwurf pro Person, mit dem eigenen Dokument im Anhang. Sie landen in einem ' +
      'Ordner, der sich von selbst öffnet: Du verschickst sie einzeln aus dem Mailprogramm.',
    prepara: 'Vorbereiten',
    suoi: 'Eigene',
    guarda: (nome) => `${nome} ansehen`,
    nonAncoraRaccolto: 'Noch nicht eingesammelt',
    raccolto: 'eingesammelt',
    atteso: 'ausstehend',
    chiHaPortato: 'Wer hat was gebracht',
    inRigaInColonna: 'die Lernenden in den Zeilen, die verlangten Dokumente in den Spalten',
    senzaCorsi:
      'Ein Dokument verlangst du mit einem Auftrag, und ein Auftrag gehört zu einem Kurs: ' +
      'In dieser Klasse hast du noch keinen.',
    richieste: 'Anfragen',
    personali: 'persönliche',
    fogliRaccolti: 'eingesammelte Blätter',
    inAttesa: 'ausstehend',
    scadute: 'überfällig',
    documentiPersonali: 'Persönliche Dokumente',
    nessunDocumento: 'Kein Dokument verlangt',
    classeVuota: 'Klasse noch leer',
    comeSiChiede:
      'Ein Dokument verlangen heisst, einen Auftrag zu geben, der abgehakt wird, wenn ' +
      'jemand ein Blatt bringt: Er steht mit allem anderen bei den Pendenzen, und hier ' +
      'zeigt die Matrix, wer es noch nicht gebracht hat.',
    matriceQuando: 'Die Matrix erscheint, sobald die Klasse aktive Lernende hat.',
    nienteInClasse: 'in dieser Klasse ist nichts offen',
    primaUnCorso:
      'Um eine Pendenz hinzuzufügen, erstelle zuerst auf der Seite «Kurse» einen Kurs ' +
      'für diese Klasse.',
    nienteInSospeso: 'Nichts offen',
    cheCosaCompare:
      'Hier erscheint von selbst, was in dieser Klasse offen bleibt: die Absenzenberichte ' +
      'zum Verschicken und die fehlenden Unterschriften, die Prüfungen zum Korrigieren und ' +
      'Zurückgeben, die Dokumente zum Einsammeln oder Übergeben, die zugeteilten Aktivitäten.',
    // Im Deutschen bleiben die Nomen gross.
    etichettaFamiglia: (nome) => nome,
    recapiti: 'Kontaktadressen',
    aiutoRecapiti: 'die festen Adressen; jene der Lernenden stehen auf ihren Personenblättern',
    raggiungibili: 'erreichbare Lernende',
    recapitiFissi: 'feste Kontaktadressen',
    nessunRecapito: 'Keine festen Kontaktadressen: Sekretariat, Schule, Klassenchef.',
    predefinito: 'Standard',
    modificaRecapito: 'Kontaktadresse bearbeiten',
    senzaOggetto: 'ohne Betreff',
    inviata: (data, destinatari) => `${data} · ${destinatari} Empfänger`,
    bozza: (destinatari) => `Entwurf · ${destinatari} Empfänger`,
    stati: {
      bozza: 'Entwurf',
      inviata: 'versendet',
      errore: 'Fehler',
    },
    preparaInvio: 'Versand vorbereiten',
    preparaSecondoImpostazioni: 'Die Mitteilung gemäss den Mail-Einstellungen vorbereiten',
    riportaABozza: 'Zurück zum Entwurf: Das Häkchen war ein Versehen',
    segnaSpedita: 'Als versendet markieren: Du hast sie aus dem Mailprogramm geschickt',
    aiutoComunicazioni: 'Entwürfe zum Verschicken aus dem Mailprogramm',
    nessunaComunicazione:
      'Keine Mitteilungen. Die Adressen kommen aus den Personenblättern der Lernenden und aus den ' +
      'festen Kontaktadressen und gehen immer in Blindkopie. Das Klassenbuch bereitet den Entwurf ' +
      'vor und öffnet ihn im Mailprogramm: Verschicken tust du.',
    nessunaClasse: 'Keine Klasse, in der du Klassenlehrperson bist',
    comeCompare:
      'Das Klassendossier – Dokumente, Kontaktadressen, Mitteilungen – erscheint bei den Klassen, ' +
      'bei denen «Ich bin Klassenlehrperson» angehakt ist. Das Häkchen findest du in den ' +
      'Details der Klasse, unter Klassen.',
    vaiAlleClassi: 'Zu den Klassen',
    pagine: {
      todo: {
        titolo: 'Pendenzen der Klasse',
        aiuto: 'Die offenen Aktivitäten und die Fristen, die du im Blick behältst.',
      },
      documenti: {
        titolo: 'Dokumentenarchiv',
        aiuto: 'Was verlangt wurde, was angekommen ist, und die PDFs zum Aufteilen.',
      },
      assenze: {
        titolo: 'Absenzen',
        aiuto: 'Importiere die Blätter, bereite die Anfragen vor und erfasse die Unterschriften.',
      },
      messaggistica: {
        titolo: 'Mitteilungen',
        aiuto: 'Bereite die Mitteilungen vor und verwalte die Kontaktadressen der Klasse.',
      },
    },
  },
  fr: {
    chiediloAnche: (testo, nome) => `« ${testo} » : le demander aussi à ${nome}`,
    consegnatoPerEmail: 'Remis par e-mail',
    consegnatoAMano: 'Remis en main propre',
    portato: 'Apporté',
    fattoIl: (come, data) => `${come} le ${data} — `,
    clicPerTogliere: 'clic pour retirer la coche',
    clicNonCambia: 'le clic ne la change pas : clic droit pour la retirer',
    segnaConsegnatoA: (nome) => `Noter que tu l’as remis à ${nome}`,
    segnaPortatoDa: (nome) => `Noter que ${nome} l’a apporté`,
    togliLaSpunta: 'Retirer la coche',
    segnaConsegnato: 'Marquer comme remis',
    segnaPortato: 'Marquer comme apporté',
    guardaDocumentoDi: (documento, nome) => `Voir ${documento || 'le document'} de ${nome}`,
    allegaDaConsegnare: (nome) => `Joindre le document à remettre à ${nome}`,
    allegaScansione: (nome) => `Joindre le scan de ${nome}`,
    togliDocumentoDi: (nome) => `Retirer le document de ${nome}`,
    guardaFoglioFirme: (testo) => `Voir la feuille de signatures de « ${testo} »`,
    allegaFoglioFirme: (testo) => `Joindre la feuille de signatures de « ${testo} »`,
    togliFoglioFirme: 'Retirer la feuille de signatures',
    foglioFirmeDi: (testo) => `Feuille de signatures · ${testo}`,
    firmeDiConsegna: 'Signatures de remise',
    entro: (data) => ` · pour le ${data}`,
    apriLaConsegna: 'Ouvrir le devoir',
    preparaInvioN: (quanti) => `Préparer l’envoi (${quanti})`,
    preparaPerOgnuno: 'Préparer pour chacun le brouillon avec son document',
    preparareLeBozze: (quanti) =>
      `Préparer les brouillons pour ${plurale(quanti, 'personne en formation', 'personnes en formation')} ?`,
    bozzeATesta:
      'Un brouillon par personne, avec son document en pièce jointe. Ils arrivent dans un ' +
      'dossier qui s’ouvre tout seul : tu les envoies un à un depuis ta messagerie.',
    prepara: 'Préparer',
    suoi: 'Les siens',
    guarda: (nome) => `Voir ${nome}`,
    nonAncoraRaccolto: 'Pas encore collecté',
    raccolto: 'collecté',
    atteso: 'attendu',
    chiHaPortato: 'Qui a apporté quoi',
    inRigaInColonna: 'les personnes en formation en ligne, les documents demandés en colonne',
    senzaCorsi:
      'Un document se demande avec un devoir, et un devoir appartient à un cours : ' +
      'dans cette classe, tu n’en as encore aucun.',
    richieste: 'demandes',
    personali: 'personnels',
    fogliRaccolti: 'feuilles collectées',
    inAttesa: 'en attente',
    scadute: 'en retard',
    documentiPersonali: 'Documents personnels',
    nessunDocumento: 'Aucun document demandé',
    classeVuota: 'Classe encore vide',
    comeSiChiede:
      'Demander un document, c’est donner un devoir qui se coche quand on apporte une ' +
      'feuille : il figure dans les tâches en suspens avec tout le reste, et ici la grille ' +
      'montre qui ne l’a pas encore apporté.',
    matriceQuando: 'La grille apparaît quand la classe a des personnes en formation actives.',
    nienteInClasse: 'rien en suspens dans cette classe',
    primaUnCorso:
      'Pour ajouter une tâche en suspens, crée d’abord un cours pour cette classe depuis ' +
      'la page « Cours ».',
    nienteInSospeso: 'Rien en suspens',
    cheCosaCompare:
      'Ici apparaît tout seul ce qui reste ouvert dans cette classe : les rapports ' +
      'd’absences à envoyer et les signatures à obtenir, les épreuves à corriger et à ' +
      'rendre, les documents à collecter ou à remettre, les activités assignées.',
    etichettaFamiglia: (nome) => minuscolo(nome),
    recapiti: 'Adresses de contact',
    aiutoRecapiti:
      'les adresses fixes ; celles des personnes en formation sont dans leurs fiches',
    raggiungibili: 'personnes en formation joignables',
    recapitiFissi: 'adresses de contact fixes',
    nessunRecapito: 'Aucune adresse de contact fixe : secrétariat, école, délégué de classe.',
    predefinito: 'par défaut',
    modificaRecapito: 'Modifier l’adresse de contact',
    senzaOggetto: 'sans objet',
    inviata: (data, destinatari) =>
      `${data} · ${plurale(destinatari, 'destinataire', 'destinataires')}`,
    bozza: (destinatari) => `brouillon · ${plurale(destinatari, 'destinataire', 'destinataires')}`,
    stati: {
      bozza: 'brouillon',
      inviata: 'envoyée',
      errore: 'erreur',
    },
    preparaInvio: 'Préparer l’envoi',
    preparaSecondoImpostazioni: 'Préparer la communication selon les réglages de messagerie',
    riportaABozza: 'Remettre en brouillon : la coche était une erreur',
    segnaSpedita: 'Marquer comme envoyée : tu l’as envoyée depuis ta messagerie',
    aiutoComunicazioni: 'brouillons à envoyer depuis la messagerie',
    nessunaComunicazione:
      'Aucune communication. Les adresses viennent des fiches des personnes en formation ' +
      'et des adresses de contact fixes, et partent toujours en copie cachée. Le registre prépare ' +
      'le brouillon et l’ouvre dans ta messagerie : c’est toi qui l’envoies.',
    nessunaClasse: 'Aucune classe dont tu es maître de classe',
    comeCompare:
      'Le dossier de classe — documents, adresses de contact, communications — apparaît sur les ' +
      'classes où « Je suis maître de classe » est coché. La case se trouve dans les ' +
      'Détails de la classe, sous Classes.',
    vaiAlleClassi: 'Aller aux classes',
    pagine: {
      todo: {
        titolo: 'Tâches en suspens de la classe',
        aiuto: 'Les activités ouvertes et les échéances à suivre.',
      },
      documenti: {
        titolo: 'Archive des documents',
        aiuto: 'Ce qui a été demandé, ce qui est arrivé, et les PDF à diviser.',
      },
      assenze: {
        titolo: 'Absences',
        aiuto: 'Importe les feuilles, prépare les demandes et enregistre les signatures reçues.',
      },
      messaggistica: {
        titolo: 'Messagerie',
        aiuto: 'Prépare les communications et gère les adresses de contact de la classe.',
      },
    },
  },
  en: {
    chiediloAnche: (testo, nome) => `“${testo}”: ask ${nome} for it too`,
    consegnatoPerEmail: 'Handed over by email',
    consegnatoAMano: 'Handed over in person',
    portato: 'Brought in',
    fattoIl: (come, data) => `${come} on ${data} — `,
    clicPerTogliere: 'click to remove the tick',
    clicNonCambia: 'a click won’t change it: right-click to remove it',
    segnaConsegnatoA: (nome) => `Mark that you handed it to ${nome}`,
    segnaPortatoDa: (nome) => `Mark that ${nome} brought it in`,
    togliLaSpunta: 'Remove the tick',
    segnaConsegnato: 'Mark as handed over',
    segnaPortato: 'Mark as brought in',
    guardaDocumentoDi: (documento, nome) => `View ${documento || 'the document'} from ${nome}`,
    allegaDaConsegnare: (nome) => `Attach the document to hand to ${nome}`,
    allegaScansione: (nome) => `Attach ${nome}’s scan`,
    togliDocumentoDi: (nome) => `Remove ${nome}’s document`,
    guardaFoglioFirme: (testo) => `View the signature sheet for “${testo}”`,
    allegaFoglioFirme: (testo) => `Attach the signature sheet for “${testo}”`,
    togliFoglioFirme: 'Remove the signature sheet',
    foglioFirmeDi: (testo) => `Signature sheet · ${testo}`,
    firmeDiConsegna: 'Handover signatures',
    entro: (data) => ` · by ${data}`,
    apriLaConsegna: 'Open the assignment',
    preparaInvioN: (quanti) => `Prepare to send (${quanti})`,
    preparaPerOgnuno: 'Prepare a draft for each person with their document',
    preparareLeBozze: (quanti) => `Prepare drafts for ${plurale(quanti, 'learner', 'learners')}?`,
    bozzeATesta:
      'One draft each, with their document attached. They land in a folder that opens by ' +
      'itself: you send them one by one from your email program.',
    prepara: 'Prepare',
    suoi: 'Theirs',
    guarda: (nome) => `View ${nome}`,
    nonAncoraRaccolto: 'Not yet collected',
    raccolto: 'collected',
    atteso: 'expected',
    chiHaPortato: 'Who brought what',
    inRigaInColonna: 'learners in rows, requested documents in columns',
    senzaCorsi:
      'You request a document with an assignment, and an assignment belongs to a course: ' +
      'you don’t have one in this class yet.',
    richieste: 'requests',
    personali: 'personal',
    fogliRaccolti: 'sheets collected',
    inAttesa: 'waiting',
    scadute: 'overdue',
    documentiPersonali: 'Personal documents',
    nessunDocumento: 'No documents requested',
    classeVuota: 'Class still empty',
    comeSiChiede:
      'Requesting a document means setting an assignment that’s ticked off when a sheet ' +
      'is brought in: it sits with everything else in the pending items, and here the ' +
      'grid shows who hasn’t brought it yet.',
    matriceQuando: 'The grid appears once the class has active learners.',
    nienteInClasse: 'nothing pending in this class',
    primaUnCorso:
      'To add a pending item, first create a course for this class from the Courses page.',
    nienteInSospeso: 'Nothing pending',
    cheCosaCompare:
      'Whatever is still open in this class shows up here by itself: absence reports to ' +
      'send and signatures to get, tests to mark and hand back, documents to collect or ' +
      'hand over, assigned activities.',
    etichettaFamiglia: (nome) => nome.toLowerCase(),
    recapiti: 'Contact addresses',
    aiutoRecapiti: 'the fixed addresses; learners’ addresses are in their records',
    raggiungibili: 'learners reachable',
    recapitiFissi: 'fixed contact addresses',
    nessunRecapito: 'No fixed contact addresses: office, school, class representative.',
    predefinito: 'default',
    modificaRecapito: 'Edit the contact address',
    senzaOggetto: 'no subject',
    inviata: (data, destinatari) =>
      `${data} · ${plurale(destinatari, 'recipient', 'recipients')}`,
    bozza: (destinatari) => `draft · ${plurale(destinatari, 'recipient', 'recipients')}`,
    stati: {
      bozza: 'draft',
      inviata: 'sent',
      errore: 'error',
    },
    preparaInvio: 'Prepare to send',
    preparaSecondoImpostazioni: 'Prepare the message according to the email settings',
    riportaABozza: 'Back to draft: the tick was a mistake',
    segnaSpedita: 'Mark as sent: you sent it from your email program',
    aiutoComunicazioni: 'drafts to send from your email program',
    nessunaComunicazione:
      'No messages. Addresses come from the learners’ records and the fixed contact addresses, and ' +
      'always go in blind copy. The register prepares the draft and opens it in your email ' +
      'program: sending it is up to you.',
    nessunaClasse: 'No class where you’re the class teacher',
    comeCompare:
      'The class file — documents, contact addresses, messages — appears on classes where “I’m the ' +
      'class teacher” is ticked. The tick box is in the class Details, under Classes.',
    vaiAlleClassi: 'Go to classes',
    pagine: {
      todo: {
        titolo: 'Class pending items',
        aiuto: 'Open activities and the deadlines to keep track of.',
      },
      documenti: {
        titolo: 'Document archive',
        aiuto: 'What was requested, what has arrived, and the PDFs to split.',
      },
      assenze: {
        titolo: 'Absences',
        aiuto: 'Import the sheets, prepare the requests and record the signatures received.',
      },
      messaggistica: {
        titolo: 'Messages',
        aiuto: 'Prepare messages and manage the class contact addresses.',
      },
    },
  },
})
