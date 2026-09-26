// Con che cosa si apre un recapito: chi telefona e chi scrive.
//
// Qui si decide soltanto che cosa consegnare all'host (`tel:`, `mailto:`, la
// riga di comando di Outlook): stringhe pure, quindi provabili. Il programma è
// sceglibile perché `mailto:` e `tel:` funzionano solo se registrati, e nelle
// macchine di scuola spesso il predefinito non è quello usato (Outlook, Teams).

/** Con che cosa si compone un numero premuto nell'anagrafica. */
const MODI_CHIAMATA = ['tel', 'callto', 'skype', 'msteams', 'nessuno'] as const
type ModoChiamata = (typeof MODI_CHIAMATA)[number]

/** Con che cosa si apre una mail nuova a un indirizzo premuto. */
const MODI_POSTA = ['sistema', 'outlook', 'outlookWeb', 'nessuno'] as const
type ModoPosta = (typeof MODI_POSTA)[number]

/**
 * Il modo scelto, o il predefinito se il valore scritto nelle impostazioni
 * non è valido: una parola sbagliata non deve spegnere il pulsante.
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
 * L'indirizzo con cui il sistema compone un numero. Skype vuole `?call`;
 * Teams vuole `4:` per capire che è un telefono e non un collega.
 */
export function indirizzoChiamata (modo: ModoChiamata, numero: string): string | null {
  if (modo === 'nessuno') return null
  if (modo === 'skype') return `skype:${numero}?call` // testo-fisso: schema di URL
  if (modo === 'msteams') return `msteams:/l/call/0/0?users=4:${numero}`
  return `${modo}:${numero}`
}

/**
 * Un indirizzo di posta consegnabile a un programma di posta, o `null`.
 * Controllo grosso: basta che spazi, virgole o punti e virgola non aggiungano
 * destinatari nel `mailto:`.
 */
export function indirizzoScrivibile (indirizzo: string): string | null {
  const scritto = indirizzo.trim()
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(scritto) ? scritto : null
}

/** Il `mailto:` di un indirizzo, senza oggetto e senza corpo: li scrive chi scrive. */
export function indirizzoMailto (indirizzo: string): string {
  return `mailto:${indirizzo}` // testo-fisso: schema di URL
}

/**
 * La finestra di composizione di Outlook sul web (`outlook.office.com`, conti
 * di scuola e d'azienda), per chi non ha Outlook installato o usa il browser.
 */
export function composizioneOutlookWeb (indirizzo: string): string {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(indirizzo)}`
}

/**
 * Gli argomenti con cui `OUTLOOK.EXE` apre un messaggio nuovo indirizzato:
 * `/c ipm.note` crea un messaggio, `/m` è il destinatario (nudo, senza
 * `mailto:`). Funziona anche quando Outlook non è il predefinito.
 */
export function argomentiOutlook (indirizzo: string): string[] {
  return ['/c', 'ipm.note', '/m', indirizzo]
}
