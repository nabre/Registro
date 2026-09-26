// I testi di `mailbox.ts`: la casella di posta detta a parole.

import { catalogo } from '../i18n/index.js'

const it = {
  /** L'indirizzo, e fra parentesi il nome di accesso quando è diverso. */
  conAccesso: (mittente: string, accesso: string) => `${mittente} (accesso ${accesso})`,
}

export const testi = catalogo(it, {
  de: { conAccesso: (mittente, accesso) => `${mittente} (Anmeldung ${accesso})` },
  fr: { conAccesso: (mittente, accesso) => `${mittente} (identifiant ${accesso})` },
  en: { conAccesso: (mittente, accesso) => `${mittente} (sign-in ${accesso})` },
})
