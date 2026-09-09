// L'OCR: leggere il nome sulle pagine che testo non ne hanno.
//
// Metà dei documenti che arrivano in segreteria sono scansioni — il modulo
// firmato dai genitori, il certificato timbrato — e dentro un PDF così non c'è
// una lettera da cercare: c'è una fotografia. Senza qualcuno che la guardi,
// quelle pagine finiscono tutte in quarantena e lo smistamento non ha smistato
// niente.
//
// A guardarle è un modello che gira sulla macchina di chi insegna, servito da
// Ollama. Sta in locale e non altrove per il motivo per cui il pannello ha una
// politica di sicurezza stretta: su quelle pagine ci sono nomi di minorenni,
// diagnosi, situazioni di famiglia. Non escono dal computer.
//
// È un pezzo facoltativo. Se Ollama non c'è, o il modello non è stato scaricato,
// il registro non si rompe: le pagine scansionate restano in quarantena e si
// assegnano a mano, che è esattamente quel che si faceva prima.

import * as vscode from 'vscode'

export interface ImpostazioniOcr {
  attivo: boolean
  url: string
  modello: string
  /** Quanti secondi aspettare una pagina prima di dire che non se ne fa niente. */
  attesaMax: number
}

export function impostazioniOcr (): ImpostazioniOcr {
  const configurazione = vscode.workspace.getConfiguration('registroDocenti')
  return {
    attivo: configurazione.get<boolean>('ocr.attivo', false),
    url: (configurazione.get<string>('ocr.url', '') || 'http://127.0.0.1:11434').replace(/\/+$/, ''),
    modello: configurazione.get<string>('ocr.modello', '') || 'glm-ocr:latest',
    attesaMax: Math.max(10, configurazione.get<number>('ocr.attesaMassimaSecondi', 180)),
  }
}

/**
 * Se il servizio risponde e il modello c'è. Serve a dirlo prima, in
 * interfaccia: un pulsante «leggi la scansione» che macina cinque minuti per
 * poi annunciare che Ollama non è acceso è peggio di un pulsante spento.
 */
export async function ocrPronto (): Promise<{ pronto: boolean, motivo: string }> {
  const impostazioni = impostazioniOcr()
  if (!impostazioni.attivo) {
    return {
      pronto: false,
      motivo:
        'La lettura automatica delle scansioni è spenta: accendere ' +
        '«Attivo» nelle impostazioni, sotto OCR.',
    }
  }
  try {
    const risposta = await fetch(`${impostazioni.url}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!risposta.ok) return { pronto: false, motivo: `Ollama risponde ${risposta.status}.` }
    const dati = (await risposta.json()) as { models?: Array<{ name?: string }> }
    const modelli = (dati.models ?? []).map((m) => m.name ?? '')
    // «glm-ocr» e «glm-ocr:latest» sono lo stesso modello: Ollama accetta il
    // nome senza tag, e il registro non deve essere più pignolo di lui.
    const senzaTag = (nome: string) => nome.split(':')[0]
    const cercato = impostazioni.modello
    const trovato = modelli.some(
      (nome) => nome === cercato || (!cercato.includes(':') && senzaTag(nome) === cercato),
    )
    if (!trovato) {
      return {
        pronto: false,
        motivo: `Il modello «${impostazioni.modello}» non è fra quelli scaricati (${modelli.join(', ') || 'nessuno'}).`,
      }
    }
    return { pronto: true, motivo: '' }
  } catch (errore) {
    return {
      pronto: false,
      motivo: `Ollama non risponde su ${impostazioni.url}: ${errore instanceof Error ? errore.message : errore}`,
    }
  }
}

/**
 * Quel che si chiede al modello. Si domanda la trascrizione e non «di chi è
 * questa pagina»: un modello che legge non deve anche decidere, e il nome lo
 * cerca poi l'indice della classe — che sa chi c'è in quella classe, cosa che
 * il modello non sa.
 */
const RICHIESTA = 'Trascrivi il testo di questa pagina, in particolare nomi e cognomi. Solo il testo.'

/**
 * Il testo letto da un'immagine di pagina, o stringa vuota se non se n'è
 * cavato niente.
 *
 * Non solleva: una scansione illeggibile, un servizio spento o un modello che
 * ci mette troppo sono tutte la stessa cosa dal punto di vista di chi smista —
 * quella pagina va guardata a mano — e non c'è motivo di far fallire lo
 * smistamento delle altre.
 */
export async function leggiImmagine (png: Uint8Array): Promise<string> {
  const impostazioni = impostazioniOcr()
  if (!impostazioni.attivo) return ''

  try {
    const risposta = await fetch(`${impostazioni.url}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: impostazioni.modello,
        prompt: RICHIESTA,
        images: [Buffer.from(png).toString('base64')],
        stream: false,
        // Un tetto alle parole prodotte: i modelli piccoli tendono a ripetere
        // la pagina due volte, e ogni parola in più è tempo di macchina
        // speso per niente. Una testata ci sta comoda.
        options: { temperature: 0, num_predict: 256 },
      }),
      signal: AbortSignal.timeout(impostazioni.attesaMax * 1000),
    })
    if (!risposta.ok) return ''
    const dati = (await risposta.json()) as { response?: string }
    return ripulisci(dati.response ?? '')
  } catch {
    return ''
  }
}

/**
 * La trascrizione ripulita di quel che i modelli di OCR aggiungono di loro: le
 * staccionate del markdown, e la ripetizione dello stesso testo due volte di
 * fila — che è un tic noto dei modelli piccoli e che, lasciato passare,
 * gonfierebbe l'estratto mostrato in quarantena senza aggiungere nulla.
 */
function ripulisci (testo: string): string {
  const pulito = testo
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\r/g, '')
    // La domanda ripetuta in coda alla risposta: succede quando il modello
    // arriva al tetto delle parole e ricomincia da capo.
    .replace(/Trascrivi il testo[^\n]*/gi, '')
    .trim()
  const meta = Math.floor(pulito.length / 2)
  if (meta > 20) {
    const prima = pulito.slice(0, meta).trim()
    const dopo = pulito.slice(meta).trim()
    if (prima && dopo.startsWith(prima.slice(0, Math.min(prima.length, 60)))) return prima
  }
  return pulito
}
