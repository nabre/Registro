// I testi della riga di comando, in tutte le lingue del registro.
//
// Solo `node:`, come il resto di `src/cli/`: è il gemello a mano di `src/i18n/`.
// Nessun compilatore controlla le chiavi: una frase nuova va nelle quattro lingue.
//
// La lingua, in quest'ordine:
//   1. `REGISTRO_LINGUA`, che il ponte `regi` (`shell/system/commandLine.ts`)
//      mette alla lingua del registro;
//   2. `registroDocenti.aspetto.lingua` in `impostazioni.json`; se dice
//      «sistema», quella che vede Node (`LC_ALL`, `LC_MESSAGES`, `LANG`, `Intl`);
//   3. l'italiano.
// Senza impostazione vale l'italiano e non la lingua del sistema: Node non sa
// la lingua dei menu di Windows, e il formato regionale può essere diverso.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { cartellaUtente } from './common.mjs'

const LINGUE = ['it', 'de', 'fr', 'en']

/** La lingua di un'etichetta — `de-CH`, `fr_CH.UTF-8`, `EN` — o null se non è delle nostre. */
function linguaDaEtichetta (etichetta) {
  if (!etichetta) return null
  const lingua = String(etichetta).trim().toLowerCase().split(/[-_.@]/)[0]
  return LINGUE.includes(lingua) ? lingua : null
}

/** La prima lingua del sistema, come la vede Node. */
function linguaDelSistema () {
  const dichiarata = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG
  if (dichiarata) return linguaDaEtichetta(dichiarata)
  try {
    return linguaDaEtichetta(Intl.DateTimeFormat().resolvedOptions().locale)
  } catch {
    return null
  }
}

/** Quel che l'impostazione della lingua dice, o `undefined` se non si legge. */
function sceltaNelleImpostazioni () {
  try {
    const letto = JSON.parse(readFileSync(join(cartellaUtente(), 'impostazioni.json'), 'utf8'))
    return letto?.['registroDocenti.aspetto.lingua']
  } catch {
    return undefined
  }
}

/** La lingua in cui la riga di comando parla: vedi la testa del file. */
function linguaDellaRiga () {
  const chiesta = linguaDaEtichetta(process.env.REGISTRO_LINGUA)
  if (chiesta) return chiesta
  const scelta = sceltaNelleImpostazioni()
  if (LINGUE.includes(scelta)) return scelta
  if (scelta === 'sistema') return linguaDelSistema() ?? 'it'
  return 'it'
}

// ---------------------------------------------------------------- i testi

const it = {
  comeSiAccende: [
    'Il condotto è spento finché non lo si accende: nelle impostazioni del registro,',
    'la voce «registroDocenti.api.condotto», da mettere a vero. È l’interruttore',
    'generale; sotto, «registroDocenti.api.lettura» (accesa di suo) e',
    '«registroDocenti.api.scrittura» dicono quanto si concede. Poi il registro deve',
    'essere aperto — il condotto vive dentro l’applicazione, non da solo.',
    '',
    'Attenzione: da acceso, ogni programma che gira con questo utente può chiamare le',
    'procedure del registro. Con la sola lettura può già leggere assenze, ritardi, medie',
    'e note delle persone in formazione — già calcolate, senza dover aprire il file; con',
    'la scrittura, anche segnare al posto suo e far partire posta a nome del docente.',
  ].join('\n'),
  nonRisponde: 'Il registro non risponde sul condotto.',
  maiAcceso: (cartella) => [
    'Il registro non risponde sul condotto: su questa macchina il condotto non si è mai acceso.',
    '',
    'Manca il file «condotto.segreto», che il registro riscrive nella sua cartella dei dati',
    `ogni volta che accende il condotto. Lo si cercava in: ${cartella}`,
    'Senza quel file non si sa a quale indirizzo bussare. Se il registro tiene i dati',
    'altrove (installazione portatile), l’indirizzo si dà con REGISTRO_CONDOTTO.',
  ].join('\n'),

  // Gli argomenti
  scrittoPiùVolte: (nome) => `--${nome} è scritto più volte: vale l’ultimo.`,
  jsonElenco:
    '--json vuole un oggetto: l’ingresso è sempre un oggetto. ' +
    'Un elenco va dentro il suo campo: --json \'{"campo": […]}\'.',
  /**
   * «Vero» e «falso»: si accettano in tutte le lingue, così uno script non si
   * rompe quando il registro cambia lingua.
   */
  vero: ['vero', 'sì', 'si'],
  falso: ['falso', 'no'],
  vuoleNumero: (campo, testo) => `«${campo}» vuole un numero, e «${testo}» non lo è.`,
  vuoleVeroFalso: (campo, testo) => `«${campo}» vuole vero o falso, e «${testo}» non lo è.`,
  nonÈElencoJson: (campo, testo) => `«${campo}» sembra un elenco JSON, e «${testo}» non lo è.`,
  vuoleOggetto: (campo, testo) => `«${campo}» vuole un oggetto JSON, e «${testo}» non lo è.`,
  nonÈJson: (campo, testo) => `«${campo}» sembra JSON, e «${testo}» non lo è.`,
  nonSaCheFarsene: (campo, testo) => `«${campo}» non sa che farsene di «${testo}».`,
  nessunCampo: (campo, noti) =>
    `Questa procedura non ha un campo «${campo}».` + (noti.length > 0 ? ` Ha: ${noti.join(', ')}.` : ''),
  mancaValore: (campo) => `Manca il valore di --${campo}.`,
  jsonNonValido: 'L’oggetto passato a --json non è JSON valido.',
  jsonNonOggetto: '--json vuole un oggetto, non un elenco né un valore solo.',
  vinceJson: (campo) => `--${campo} e --json dicono tutti e due «${campo}»: vale quello di --json.`,

  // La stampa
  nonHaDettoPerché: 'Il registro non ha detto perché.',
  campo: (campo) => `Campo: ${campo}`,
  tracciato: (tracciato) => `Tracciato: ${tracciato}`,
  sì: 'sì',
  no: 'no',
  colonneElenco: ['procedura', 'genere', 'idem.', 'che cosa fa'],
  elencoCompleto: (comando) => `L’elenco completo: ${comando} elenco`,
  idempotente: ', idempotente',
  nonChiedeNiente: 'Non chiede niente.',
  qualunque: 'qualunque',
  colonneSchema: ['campo', 'forma', 'a che serve'],
  obbligatorio: (comando, nome) => `* obbligatorio.  Lo schema completo: ${comando} schema ${nome} --json`,
  risponde: 'Il condotto risponde.',
  voceStato: {
    contratto: 'contratto',
    applicazione: 'applicazione',
    anno: 'anno aperto',
    concesso: 'concesso',
    condotto: 'condotto',
  },
  nessunAnno: '— nessuno',
  concedeTutto: 'lettura e scrittura (registro precedente ai permessi)',
  lettura: 'lettura',
  scrittura: 'scrittura',
  e: ' e ',
  niente: 'niente',

  aiuto: (comando) => [
    'Regiclass — riga di comando.',
    '',
    `  ${comando} elenco                    le procedure che il registro espone`,
    `  ${comando} schema <procedura>        i campi dell’ingresso; con --json lo schema intero`,
    `  ${comando} chiama <procedura> [--campo valore]… [--json '{…}']`,
    `  ${comando} stato                     dice se il condotto risponde`,
    `  ${comando} catalogo                  le procedure in JSON, per darle a un programma`,
    '',
    'Opzioni:',
    '  --json        da solo, stampa la busta JSON-RPC grezza. Dopo «chiama», seguito da',
    '                un oggetto, è l’ingresso intero e vince sui --campo: è il modo di',
    '                passare un elenco di oggetti, che da riga di comando non si scrive.',
    '  --aiuto       questa pagina',
    '',
    'I valori dei --campo si convertono guardando lo schema della procedura, mai',
    'indovinando dal testo: un campo dichiarato numero riceve un numero, uno booleano',
    'riceve vero o falso. Un’opzione senza valore vale «vero» su un campo booleano;',
    'su ogni altro campo è un valore dimenticato. Un elenco si scrive con le virgole',
    '(a,b,c) o in JSON (["a","b"]); vuoto è l’elenco vuoto. Solo un campo che',
    'ammette qualunque cosa si deduce: vero/falso, poi un numero, poi JSON se comincia',
    'con { o [, altrimenti il testo com’è.',
    '',
    '--campo=valore vale quanto --campo valore, e serve per i valori che cominciano',
    'con --. Un --campo scritto due volte prende l’ultimo valore, e lo dice.',
    '',
    'Il condotto è spento finché non lo si accende: «registroDocenti.api.condotto».',
    'Che cosa concede lo dicono «registroDocenti.api.lettura», accesa di suo, e',
    '«registroDocenti.api.scrittura», spenta: una procedura di scrittura chiamata',
    'senza la seconda torna «non-permesso» e non tocca niente. Che cosa vale adesso',
    'lo dice «stato». Da acceso, ogni programma che gira con questo utente può usarlo.',
    'REGISTRO_CONDOTTO scavalca l’indirizzo.',
    '',
    'Uscita: 0 fatto, 1 rifiutato, 2 il condotto non risponde.',
  ].join('\n'),

  senzaChiedi: (comando) => [
    '«chiedi» non c’è più: il modello dell’assistente gira dentro il registro, e le',
    'domande in italiano si fanno dal riquadro «Assistente» della finestra.',
    '',
    'Da qui restano le procedure, che sono quel che l’assistente legge:',
    `  ${comando} elenco     tutte le procedure, una per riga`,
    `  ${comando} chiama     una procedura, con i suoi campi`,
    `  ${comando} catalogo   le stesse in JSON, per darle a un modello che gira altrove`,
  ].join('\n'),

  // Il giro
  nonSo: (comando) =>
    `Non so che cosa sia «${comando}». I comandi: elenco, schema, chiama, stato, catalogo.`,
  serveIlNome: (comando, parola) =>
    `Serve il nome della procedura: ${comando} ${parola} <procedura>` + (parola === 'chiama' ? ' …' : ''),
  paroleInPiù: (lette, avanzate) => `Parole in più dopo «${lette}»: «${avanzate}». `,
  valoriDopoIlCampo: 'I valori vanno dopo il loro --campo, e --json vuole un oggetto.',
  lAiuto: (comando) => `L’aiuto: ${comando} --aiuto`,
  storto: (motivo) => `Qualcosa è andato storto: ${motivo}`,
}

const de = {
  comeSiAccende: [
    'Der Kanal ist ausgeschaltet, bis man ihn einschaltet: in den Einstellungen des',
    'Klassenbuchs der Eintrag «registroDocenti.api.condotto», auf wahr zu setzen. Er ist',
    'der Hauptschalter; darunter sagen «registroDocenti.api.lettura» (von sich aus an) und',
    '«registroDocenti.api.scrittura», wie viel erlaubt ist. Dann muss das Klassenbuch',
    'geöffnet sein — der Kanal lebt in der Anwendung, nicht für sich allein.',
    '',
    'Achtung: Eingeschaltet kann jedes Programm, das unter diesem Benutzer läuft, die',
    'Prozeduren des Klassenbuchs aufrufen. Schon mit dem Lesen allein kann es Absenzen,',
    'Verspätungen, Durchschnitte und Noten der Lernenden lesen — fertig berechnet, ohne die',
    'Datei öffnen zu müssen; mit dem Schreiben auch an Stelle der Lehrperson eintragen und',
    'in ihrem Namen Mails verschicken.',
  ].join('\n'),
  nonRisponde: 'Das Klassenbuch antwortet nicht auf dem Kanal.',
  maiAcceso: (cartella) => [
    'Das Klassenbuch antwortet nicht auf dem Kanal: Auf diesem Computer war der Kanal nie',
    'eingeschaltet.',
    '',
    'Es fehlt die Datei «condotto.segreto», die das Klassenbuch in seinen Datenordner',
    `schreibt, jedes Mal wenn es den Kanal einschaltet. Gesucht wurde in: ${cartella}`,
    'Ohne diese Datei weiss man nicht, an welche Adresse man klopfen soll. Bewahrt das',
    'Klassenbuch seine Daten anderswo auf (portable Installation), gibt man die Adresse',
    'mit REGISTRO_CONDOTTO an.',
  ].join('\n'),
  scrittoPiùVolte: (nome) => `--${nome} steht mehrmals da: Es gilt das letzte.`,
  jsonElenco:
    '--json erwartet ein Objekt: Die Eingabe ist immer ein Objekt. ' +
    'Eine Liste gehört in ihr Feld: --json \'{"feld": […]}\'.',
  vero: ['wahr', 'ja'],
  falso: ['falsch', 'nein'],
  vuoleNumero: (campo, testo) => `«${campo}» erwartet eine Zahl, und «${testo}» ist keine.`,
  vuoleVeroFalso: (campo, testo) => `«${campo}» erwartet wahr oder falsch, und «${testo}» ist keines davon.`,
  nonÈElencoJson: (campo, testo) => `«${campo}» sieht nach einer JSON-Liste aus, und «${testo}» ist keine.`,
  vuoleOggetto: (campo, testo) => `«${campo}» erwartet ein JSON-Objekt, und «${testo}» ist keines.`,
  nonÈJson: (campo, testo) => `«${campo}» sieht nach JSON aus, und «${testo}» ist keines.`,
  nonSaCheFarsene: (campo, testo) => `«${campo}» kann mit «${testo}» nichts anfangen.`,
  nessunCampo: (campo, noti) =>
    `Diese Prozedur hat kein Feld «${campo}».` + (noti.length > 0 ? ` Sie hat: ${noti.join(', ')}.` : ''),
  mancaValore: (campo) => `Der Wert von --${campo} fehlt.`,
  jsonNonValido: 'Das Objekt nach --json ist kein gültiges JSON.',
  jsonNonOggetto: '--json erwartet ein Objekt, keine Liste und keinen einzelnen Wert.',
  vinceJson: (campo) => `--${campo} und --json sagen beide «${campo}»: Es gilt der Wert von --json.`,
  nonHaDettoPerché: 'Das Klassenbuch hat nicht gesagt, warum.',
  campo: (campo) => `Feld: ${campo}`,
  tracciato: (tracciato) => `Protokoll: ${tracciato}`,
  sì: 'ja',
  no: 'nein',
  colonneElenco: ['Prozedur', 'Art', 'idem.', 'was sie tut'],
  elencoCompleto: (comando) => `Die vollständige Liste: ${comando} elenco`,
  idempotente: ', idempotent',
  nonChiedeNiente: 'Sie verlangt nichts.',
  qualunque: 'beliebig',
  colonneSchema: ['Feld', 'Form', 'wozu'],
  obbligatorio: (comando, nome) => `* Pflichtfeld.  Das vollständige Schema: ${comando} schema ${nome} --json`,
  risponde: 'Der Kanal antwortet.',
  voceStato: {
    contratto: 'Vertrag',
    applicazione: 'Anwendung',
    anno: 'offenes Schuljahr',
    concesso: 'erlaubt',
    condotto: 'Kanal',
  },
  nessunAnno: '— keines',
  concedeTutto: 'Lesen und Schreiben (Klassenbuch von vor den Berechtigungen)',
  lettura: 'Lesen',
  scrittura: 'Schreiben',
  e: ' und ',
  niente: 'nichts',
  aiuto: (comando) => [
    'Regiclass — Befehlszeile.',
    '',
    `  ${comando} elenco                    die Prozeduren, die das Klassenbuch anbietet`,
    `  ${comando} schema <prozedur>         die Felder der Eingabe; mit --json das ganze Schema`,
    `  ${comando} chiama <prozedur> [--feld wert]… [--json '{…}']`,
    `  ${comando} stato                     sagt, ob der Kanal antwortet`,
    `  ${comando} catalogo                  die Prozeduren als JSON, für ein anderes Programm`,
    '',
    'Optionen:',
    '  --json        allein: gibt den rohen JSON-RPC-Umschlag aus. Nach «chiama», gefolgt',
    '                von einem Objekt: die ganze Eingabe, die über die --feld siegt; so',
    '                übergibt man eine Liste von Objekten, die sich als Option nicht schreibt.',
    '  --help        diese Seite',
    '',
    'Die Werte der --feld werden anhand des Schemas der Prozedur umgewandelt, nie aus',
    'dem Text erraten: Ein als Zahl deklariertes Feld erhält eine Zahl, ein boolesches',
    'wahr oder falsch. Eine Option ohne Wert gilt bei einem booleschen Feld als «wahr»;',
    'bei jedem anderen Feld ist es ein vergessener Wert. Eine Liste schreibt man mit',
    'Kommas (a,b,c) oder als JSON (["a","b"]); leer ist die leere Liste. Nur bei einem',
    'Feld, das alles zulässt, wird geschlossen: wahr/falsch, dann eine Zahl, dann JSON,',
    'wenn es mit { oder [ beginnt, sonst der Text, wie er ist.',
    '',
    '--feld=wert gilt so viel wie --feld wert und dient für Werte, die mit -- beginnen.',
    'Ein zweimal geschriebenes --feld nimmt den letzten Wert, und sagt es.',
    '',
    'Der Kanal ist ausgeschaltet, bis man ihn einschaltet: «registroDocenti.api.condotto».',
    'Was er erlaubt, sagen «registroDocenti.api.lettura», von sich aus an, und',
    '«registroDocenti.api.scrittura», aus: Eine schreibende Prozedur, die ohne das',
    'zweite aufgerufen wird, gibt «non-permesso» zurück und rührt nichts an. Was gerade',
    'gilt, sagt «stato». Eingeschaltet kann ihn jedes Programm unter diesem Benutzer',
    'verwenden. REGISTRO_CONDOTTO übersteuert die Adresse.',
    '',
    'Exitcode: 0 erledigt, 1 abgelehnt, 2 der Kanal antwortet nicht.',
  ].join('\n'),
  senzaChiedi: (comando) => [
    '«chiedi» gibt es nicht mehr: Das Modell des Assistenten läuft im Klassenbuch, und',
    'Fragen stellt man im Bereich «Assistent» des Fensters.',
    '',
    'Von hier aus bleiben die Prozeduren, und sie sind das, was der Assistent liest:',
    `  ${comando} elenco     alle Prozeduren, eine pro Zeile`,
    `  ${comando} chiama     eine Prozedur, mit ihren Feldern`,
    `  ${comando} catalogo   dieselben als JSON, für ein Modell, das anderswo läuft`,
  ].join('\n'),
  nonSo: (comando) =>
    `Ich weiss nicht, was «${comando}» ist. Die Befehle: elenco, schema, chiama, stato, catalogo.`,
  serveIlNome: (comando, parola) =>
    `Es braucht den Namen der Prozedur: ${comando} ${parola} <prozedur>` + (parola === 'chiama' ? ' …' : ''),
  paroleInPiù: (lette, avanzate) => `Wörter zu viel nach «${lette}»: «${avanzate}». `,
  valoriDopoIlCampo: 'Die Werte stehen nach ihrem --feld, und --json erwartet ein Objekt.',
  lAiuto: (comando) => `Die Hilfe: ${comando} --help`,
  storto: (motivo) => `Etwas ist schiefgegangen: ${motivo}`,
}

const fr = {
  comeSiAccende: [
    'Le canal est désactivé tant qu’on ne l’active pas : dans les paramètres du registre,',
    'l’entrée « registroDocenti.api.condotto », à mettre à vrai. C’est l’interrupteur',
    'général ; en dessous, « registroDocenti.api.lettura » (activée d’office) et',
    '« registroDocenti.api.scrittura » disent ce qu’on accorde. Ensuite le registre doit',
    'être ouvert — le canal vit dans l’application, pas tout seul.',
    '',
    'Attention : une fois activé, tout programme qui tourne avec cet utilisateur peut',
    'appeler les procédures du registre. Avec la seule lecture, il peut déjà lire absences,',
    'retards, moyennes et notes des personnes en formation — déjà calculées, sans ouvrir',
    'le fichier ; avec l’écriture, aussi saisir à la place de l’enseignant et envoyer du',
    'courrier en son nom.',
  ].join('\n'),
  nonRisponde: 'Le registre ne répond pas sur le canal.',
  maiAcceso: (cartella) => [
    'Le registre ne répond pas sur le canal : sur cette machine, le canal n’a jamais été',
    'activé.',
    '',
    'Il manque le fichier « condotto.segreto », que le registre réécrit dans son dossier de',
    `données chaque fois qu’il active le canal. On le cherchait dans : ${cartella}`,
    'Sans ce fichier, on ne sait pas à quelle adresse frapper. Si le registre garde ses',
    'données ailleurs (installation portable), l’adresse se donne avec REGISTRO_CONDOTTO.',
  ].join('\n'),
  scrittoPiùVolte: (nome) => `--${nome} est écrit plusieurs fois : c’est le dernier qui compte.`,
  jsonElenco:
    '--json attend un objet : l’entrée est toujours un objet. ' +
    'Une liste va dans son champ : --json \'{"champ": […]}\'.',
  vero: ['vrai', 'oui'],
  falso: ['faux', 'non'],
  vuoleNumero: (campo, testo) => `« ${campo} » attend un nombre, et « ${testo} » n’en est pas un.`,
  vuoleVeroFalso: (campo, testo) => `« ${campo} » attend vrai ou faux, et « ${testo} » n’est ni l’un ni l’autre.`,
  nonÈElencoJson: (campo, testo) => `« ${campo} » ressemble à une liste JSON, et « ${testo} » n’en est pas une.`,
  vuoleOggetto: (campo, testo) => `« ${campo} » attend un objet JSON, et « ${testo} » n’en est pas un.`,
  nonÈJson: (campo, testo) => `« ${campo} » ressemble à du JSON, et « ${testo} » n’en est pas.`,
  nonSaCheFarsene: (campo, testo) => `« ${campo} » ne sait que faire de « ${testo} ».`,
  nessunCampo: (campo, noti) =>
    `Cette procédure n’a pas de champ « ${campo} ».` + (noti.length > 0 ? ` Elle a : ${noti.join(', ')}.` : ''),
  mancaValore: (campo) => `Il manque la valeur de --${campo}.`,
  jsonNonValido: 'L’objet passé à --json n’est pas du JSON valide.',
  jsonNonOggetto: '--json attend un objet, pas une liste ni une valeur seule.',
  vinceJson: (campo) => `--${campo} et --json disent tous les deux « ${campo} » : c’est celui de --json qui compte.`,
  nonHaDettoPerché: 'Le registre n’a pas dit pourquoi.',
  campo: (campo) => `Champ : ${campo}`,
  tracciato: (tracciato) => `Trace : ${tracciato}`,
  sì: 'oui',
  no: 'non',
  colonneElenco: ['procédure', 'genre', 'idem.', 'ce qu’elle fait'],
  elencoCompleto: (comando) => `La liste complète : ${comando} elenco`,
  idempotente: ', idempotente',
  nonChiedeNiente: 'Elle ne demande rien.',
  qualunque: 'quelconque',
  colonneSchema: ['champ', 'forme', 'à quoi il sert'],
  obbligatorio: (comando, nome) => `* obligatoire.  Le schéma complet : ${comando} schema ${nome} --json`,
  risponde: 'Le canal répond.',
  voceStato: {
    contratto: 'contrat',
    applicazione: 'application',
    anno: 'année ouverte',
    concesso: 'accordé',
    condotto: 'canal',
  },
  nessunAnno: '— aucune',
  concedeTutto: 'lecture et écriture (registre antérieur aux autorisations)',
  lettura: 'lecture',
  scrittura: 'écriture',
  e: ' et ',
  niente: 'rien',
  aiuto: (comando) => [
    'Regiclass — ligne de commande.',
    '',
    `  ${comando} elenco                    les procédures que le registre expose`,
    `  ${comando} schema <procédure>        les champs de l’entrée ; avec --json le schéma entier`,
    `  ${comando} chiama <procédure> [--champ valeur]… [--json '{…}']`,
    `  ${comando} stato                     dit si le canal répond`,
    `  ${comando} catalogo                  les procédures en JSON, pour les donner à un programme`,
    '',
    'Options :',
    '  --json        seul, affiche l’enveloppe JSON-RPC brute. Après « chiama », suivi d’un',
    '                objet, c’est l’entrée entière, qui l’emporte sur les --champ : c’est',
    '                ainsi qu’on passe une liste d’objets, qui ne s’écrit pas en option.',
    '  --help        cette page',
    '',
    'Les valeurs des --champ se convertissent d’après le schéma de la procédure, jamais',
    'en devinant d’après le texte : un champ déclaré nombre reçoit un nombre, un booléen',
    'reçoit vrai ou faux. Une option sans valeur vaut « vrai » sur un champ booléen ; sur',
    'tout autre champ, c’est une valeur oubliée. Une liste s’écrit avec des virgules',
    '(a,b,c) ou en JSON (["a","b"]) ; vide, c’est la liste vide. Seul un champ qui',
    'admet n’importe quoi se déduit : vrai/faux, puis un nombre, puis du JSON s’il',
    'commence par { ou [, sinon le texte tel quel.',
    '',
    '--champ=valeur vaut --champ valeur, et sert pour les valeurs qui commencent par --.',
    'Un --champ écrit deux fois prend la dernière valeur, et le dit.',
    '',
    'Le canal est désactivé tant qu’on ne l’active pas : « registroDocenti.api.condotto ».',
    'Ce qu’il accorde, le disent « registroDocenti.api.lettura », activée d’office, et',
    '« registroDocenti.api.scrittura », désactivée : une procédure d’écriture appelée',
    'sans la seconde renvoie « non-permesso » et ne touche à rien. Ce qui vaut',
    'maintenant, « stato » le dit. Une fois activé, tout programme qui tourne avec cet',
    'utilisateur peut l’utiliser. REGISTRO_CONDOTTO remplace l’adresse.',
    '',
    'Sortie : 0 fait, 1 refusé, 2 le canal ne répond pas.',
  ].join('\n'),
  senzaChiedi: (comando) => [
    '« chiedi » n’existe plus : le modèle de l’assistant tourne dans le registre, et les',
    'questions se posent dans le panneau « Assistant » de la fenêtre.',
    '',
    'D’ici restent les procédures, qui sont ce que l’assistant lit :',
    `  ${comando} elenco     toutes les procédures, une par ligne`,
    `  ${comando} chiama     une procédure, avec ses champs`,
    `  ${comando} catalogo   les mêmes en JSON, pour un modèle qui tourne ailleurs`,
  ].join('\n'),
  nonSo: (comando) =>
    `Je ne sais pas ce qu’est « ${comando} ». Les commandes : elenco, schema, chiama, stato, catalogo.`,
  serveIlNome: (comando, parola) =>
    `Il faut le nom de la procédure : ${comando} ${parola} <procédure>` + (parola === 'chiama' ? ' …' : ''),
  paroleInPiù: (lette, avanzate) => `Mots en trop après « ${lette} » : « ${avanzate} ». `,
  valoriDopoIlCampo: 'Les valeurs vont après leur --champ, et --json attend un objet.',
  lAiuto: (comando) => `L’aide : ${comando} --help`,
  storto: (motivo) => `Quelque chose s’est mal passé : ${motivo}`,
}

const en = {
  comeSiAccende: [
    'The pipe is off until you turn it on: in the register settings, the item',
    '“registroDocenti.api.condotto”, to be set to true. It is the main switch; below',
    'it, “registroDocenti.api.lettura” (on by default) and “registroDocenti.api.scrittura”',
    'say how much is granted. Then the register must be open — the pipe lives inside',
    'the application, not on its own.',
    '',
    'Warning: once on, any program running as this user can call the register’s',
    'procedures. With reading alone it can already read the learners’ absences, late',
    'arrivals, averages and grades — already calculated, without opening the file; with',
    'writing, it can also record entries in the teacher’s place and send mail in their name.',
  ].join('\n'),
  nonRisponde: 'The register is not answering on the pipe.',
  maiAcceso: (cartella) => [
    'The register is not answering on the pipe: on this machine the pipe has never been',
    'turned on.',
    '',
    'The file “condotto.segreto” is missing: the register rewrites it in its data folder',
    `every time it turns the pipe on. It was looked for in: ${cartella}`,
    'Without that file there is no knowing which address to knock on. If the register',
    'keeps its data elsewhere (portable installation), give the address with',
    'REGISTRO_CONDOTTO.',
  ].join('\n'),
  scrittoPiùVolte: (nome) => `--${nome} is given more than once: the last one wins.`,
  jsonElenco:
    '--json wants an object: the input is always an object. ' +
    'A list goes inside its field: --json \'{"field": […]}\'.',
  vero: ['yes'],
  falso: ['no'],
  vuoleNumero: (campo, testo) => `“${campo}” wants a number, and “${testo}” isn’t one.`,
  vuoleVeroFalso: (campo, testo) => `“${campo}” wants true or false, and “${testo}” is neither.`,
  nonÈElencoJson: (campo, testo) => `“${campo}” looks like a JSON list, and “${testo}” isn’t one.`,
  vuoleOggetto: (campo, testo) => `“${campo}” wants a JSON object, and “${testo}” isn’t one.`,
  nonÈJson: (campo, testo) => `“${campo}” looks like JSON, and “${testo}” isn’t.`,
  nonSaCheFarsene: (campo, testo) => `“${campo}” has no use for “${testo}”.`,
  nessunCampo: (campo, noti) =>
    `This procedure has no field “${campo}”.` + (noti.length > 0 ? ` It has: ${noti.join(', ')}.` : ''),
  mancaValore: (campo) => `The value of --${campo} is missing.`,
  jsonNonValido: 'The object passed to --json is not valid JSON.',
  jsonNonOggetto: '--json wants an object, not a list or a single value.',
  vinceJson: (campo) => `--${campo} and --json both say “${campo}”: the --json one wins.`,
  nonHaDettoPerché: 'The register did not say why.',
  campo: (campo) => `Field: ${campo}`,
  tracciato: (tracciato) => `Trace: ${tracciato}`,
  sì: 'yes',
  no: 'no',
  colonneElenco: ['procedure', 'kind', 'idem.', 'what it does'],
  elencoCompleto: (comando) => `The full list: ${comando} elenco`,
  idempotente: ', idempotent',
  nonChiedeNiente: 'It asks for nothing.',
  qualunque: 'any',
  colonneSchema: ['field', 'shape', 'what it is for'],
  obbligatorio: (comando, nome) => `* required.  The full schema: ${comando} schema ${nome} --json`,
  risponde: 'The pipe is answering.',
  voceStato: {
    contratto: 'contract',
    applicazione: 'application',
    anno: 'open year',
    concesso: 'granted',
    condotto: 'pipe',
  },
  nessunAnno: '— none',
  concedeTutto: 'reading and writing (register older than permissions)',
  lettura: 'reading',
  scrittura: 'writing',
  e: ' and ',
  niente: 'nothing',
  aiuto: (comando) => [
    'Regiclass — command line.',
    '',
    `  ${comando} elenco                    the procedures the register exposes`,
    `  ${comando} schema <procedure>        the input fields; with --json the whole schema`,
    `  ${comando} chiama <procedure> [--field value]… [--json '{…}']`,
    `  ${comando} stato                     says whether the pipe is answering`,
    `  ${comando} catalogo                  the procedures as JSON, to hand to a program`,
    '',
    'Options:',
    '  --json        on its own, prints the raw JSON-RPC envelope. After “chiama”, followed',
    '                by an object, it is the whole input and wins over the --field options:',
    '                it is how you pass a list of objects, which an option cannot express.',
    '  --help        this page',
    '',
    'The values of the --field options are converted by looking at the procedure’s',
    'schema, never by guessing from the text: a field declared as a number gets a',
    'number, a boolean one gets true or false. An option without a value means “true” on',
    'a boolean field; on any other field it is a forgotten value. A list is written with',
    'commas (a,b,c) or in JSON (["a","b"]); empty is the empty list. Only a field that',
    'accepts anything is inferred: true/false, then a number, then JSON if it starts',
    'with { or [, otherwise the text as it is.',
    '',
    '--field=value is the same as --field value, and is for values that start with --.',
    'A --field given twice takes the last value, and says so.',
    '',
    'The pipe is off until you turn it on: “registroDocenti.api.condotto”. What it',
    'grants is set by “registroDocenti.api.lettura”, on by default, and',
    '“registroDocenti.api.scrittura”, off: a writing procedure called without the second',
    'returns “non-permesso” and touches nothing. “stato” says what applies right now.',
    'Once on, any program running as this user can use it. REGISTRO_CONDOTTO overrides',
    'the address.',
    '',
    'Exit code: 0 done, 1 refused, 2 the pipe is not answering.',
  ].join('\n'),
  senzaChiedi: (comando) => [
    '“chiedi” is gone: the assistant’s model runs inside the register, and questions',
    'are asked from the “Assistant” panel of the window.',
    '',
    'From here the procedures remain, and they are what the assistant reads:',
    `  ${comando} elenco     all the procedures, one per line`,
    `  ${comando} chiama     a procedure, with its fields`,
    `  ${comando} catalogo   the same as JSON, for a model running elsewhere`,
  ].join('\n'),
  nonSo: (comando) =>
    `I don’t know what “${comando}” is. The commands: elenco, schema, chiama, stato, catalogo.`,
  serveIlNome: (comando, parola) =>
    `The procedure name is needed: ${comando} ${parola} <procedure>` + (parola === 'chiama' ? ' …' : ''),
  paroleInPiù: (lette, avanzate) => `Extra words after “${lette}”: “${avanzate}”. `,
  valoriDopoIlCampo: 'Values go after their --field, and --json wants an object.',
  lAiuto: (comando) => `Help: ${comando} --help`,
  storto: (motivo) => `Something went wrong: ${motivo}`,
}

const CATALOGO = { it, de, fr, en }

/** I testi in una lingua data; senza, in quella della riga di comando. */
export function testi (lingua = linguaDellaRiga()) {
  return CATALOGO[lingua] ?? it
}

/** Le parole di una chiave in tutte le lingue: per «vero» e «falso». */
export function inTutteLeLingue (chiave) {
  return LINGUE.flatMap((lingua) => CATALOGO[lingua][chiave])
}

