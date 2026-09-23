// Lettura di un elenco di allievi incollato dall'esterno.
//
// Gli elenchi arrivano in tre modi, e nessuno dei tre è negoziabile con chi li
// manda: righe «Cognome Nome», righe «Cognome, Nome», e righe copiate da un
// foglio di calcolo con i campi separati da tabulazione e magari l'e-mail in
// fondo. Qui si accettano tutti e tre invece di chiedere un formato.
//
// Sta nel dominio, non nell'estensione, perché è una regola di lettura dei dati
// e perché così si può provare senza avviare l'applicazione.

interface VoceElenco {
  cognome: string
  nome: string
  email?: string
}

/** Vero per qualcosa che somiglia a un indirizzo, non per validarlo davvero. */
function sembraEmail (campo: string): boolean {
  return campo.includes('@')
}

export function leggiElencoAllievi (testo: string): VoceElenco[] {
  const voci: VoceElenco[] = []

  for (const riga of testo.split(/\r?\n/)) {
    const pulita = riga.trim()
    if (!pulita) continue

    const campi = pulita.split(/\t|;|,/).map((c) => c.trim()).filter(Boolean)
    const email = campi.find(sembraEmail)
    const senzaEmail = campi.filter((c) => !sembraEmail(c))

    if (senzaEmail.length >= 2) {
      voci.push({ cognome: senzaEmail[0], nome: senzaEmail[1], ...(email ? { email } : {}) })
      continue
    }

    // Riga senza separatori: l'ultima parola è il nome e il resto è il cognome.
    // Negli elenchi di classe i cognomi composti sono più frequenti dei nomi
    // doppi, quindi in caso di dubbio si sbaglia meno così.
    const parole = (senzaEmail[0] ?? '').split(/\s+/).filter(Boolean)
    if (parole.length === 0) continue
    if (parole.length === 1) {
      voci.push({ cognome: parole[0], nome: '', ...(email ? { email } : {}) })
    } else {
      voci.push({
        cognome: parole.slice(0, -1).join(' '),
        nome: parole[parole.length - 1],
        ...(email ? { email } : {}),
      })
    }
  }

  return voci
}
