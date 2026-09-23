// Con che cosa si apre un recapito: chi telefona, e chi scrive.
//
// Qui non si apre niente — aprire è mestiere dell'host, che ha la shell e il
// disco — qui si decide *che cosa* gli si consegna: l'indirizzo `tel:` di un
// numero, il `mailto:` di una casella, la riga di comando con cui Outlook apre
// un messaggio nuovo. Sono decisioni pure, fatte di stringhe, e stanno nel
// dominio perché è l'unico modo di provarle: il resto è una chiamata di
// sistema che o parte o non parte.
//
// Il motivo per cui si può scegliere il programma invece di dire sempre
// `mailto:` e `tel:`: quegli schemi funzionano solo se sulla macchina qualcuno
// li ha registrati. In una scuola le macchine sono tante e le installazioni
// sono quelle che sono — Outlook c'è ma non è il predefinito, il predefinito è
// un programma che nessuno usa, le chiamate le fa Teams e nient'altro — e un
// clic che non apre niente è la funzione che sparisce.

/** Con che cosa si compone un numero premuto nell'anagrafica. */
const MODI_CHIAMATA = ['tel', 'callto', 'skype', 'msteams', 'nessuno'] as const
type ModoChiamata = (typeof MODI_CHIAMATA)[number]

/** Con che cosa si apre una mail nuova a un indirizzo premuto. */
const MODI_POSTA = ['sistema', 'outlook', 'outlookWeb', 'nessuno'] as const
type ModoPosta = (typeof MODI_POSTA)[number]

/**
 * Il modo scelto, o quello di sempre.
 *
 * Quel che arriva dalle impostazioni è testo: il file è un JSON che si apre
 * con un editore, e una riga battuta a mano non deve spegnere la funzione. Il
 * ripiego non è «niente», è il comportamento predefinito — chi ha scritto
 * male una parola si ritrova il registro di prima, non un pulsante morto.
 */
function fraQuesti<T extends string> (
  modi: readonly T[],
  valore: string | undefined,
  ripiego: T,
): T {
  return modi.includes(valore as T) ? (valore as T) : ripiego
}

export function modoChiamata (valore: string | undefined): ModoChiamata {
  return fraQuesti(MODI_CHIAMATA, valore, 'tel')
}

export function modoPosta (valore: string | undefined): ModoPosta {
  return fraQuesti(MODI_POSTA, valore, 'sistema')
}

/**
 * L'indirizzo con cui si chiede al sistema di comporre un numero.
 *
 * `tel:` e `callto:` lasciano scegliere al sistema, ed è quel che si vuole
 * quando il programma giusto è già il suo. Skype e Teams non si accontentano
 * del numero: vogliono sapere che quel numero è una chiamata, e Teams anche
 * che è un numero di telefono e non un collega — `4:` è quel che glielo dice.
 */
export function indirizzoChiamata (modo: ModoChiamata, numero: string): string | null {
  if (modo === 'nessuno') return null
  if (modo === 'skype') return `skype:${numero}?call`
  if (modo === 'msteams') return `msteams:/l/call/0/0?users=4:${numero}`
  return `${modo}:${numero}`
}

/**
 * Un indirizzo di posta che si può consegnare a un programma di posta.
 *
 * Il controllo è volutamente grosso — c'è una chiocciola, c'è un punto dopo,
 * e non ci sono spazi — perché qui non si valida l'anagrafica: si decide se
 * aprire una finestra di posta nuova su quell'indirizzo. Quel che passa di
 * qui finisce in un `mailto:`, e uno spazio o una virgola dentro vorrebbero
 * dire un secondo destinatario che nessuno ha scelto.
 */
export function indirizzoScrivibile (indirizzo: string): string | null {
  const scritto = indirizzo.trim()
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(scritto) ? scritto : null
}

/** Il `mailto:` di un indirizzo, senza oggetto e senza corpo: li scrive chi scrive. */
export function indirizzoMailto (indirizzo: string): string {
  return `mailto:${indirizzo}`
}

/**
 * La finestra di composizione di Outlook sul web.
 *
 * `outlook.office.com` è quella dei conti di scuola e di azienda, che è il
 * caso di ogni macchina su cui questo registro gira. Serve a chi Outlook
 * installato non ce l'ha — un portatile di casa, un computer di riserva — e a
 * chi lavora nel browser per scelta: l'indirizzo finisce comunque nel campo
 * «A», che è tutto quel che si chiede a questo pulsante.
 */
export function composizioneOutlookWeb (indirizzo: string): string {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(indirizzo)}`
}

/**
 * Gli argomenti con cui `OUTLOOK.EXE` apre un messaggio nuovo già indirizzato.
 *
 * `/c ipm.note` vuol dire «un elemento nuovo del genere messaggio» e `/m` è
 * chi lo riceve. È la strada documentata da Microsoft, ed è l'unica che apra
 * Outlook *anche quando non è il programma predefinito*: un `mailto:` in quel
 * caso aprirebbe l'altro, e chi l'ha premuto si ritroverebbe a scrivere da una
 * casella che non è la sua.
 *
 * L'indirizzo si passa nudo, senza `mailto:` davanti: Outlook lo accetta in
 * tutte e due le forme, ma nuda è quella che i suoi argomenti descrivono.
 */
export function argomentiOutlook (indirizzo: string): string[] {
  return ['/c', 'ipm.note', '/m', indirizzo]
}
