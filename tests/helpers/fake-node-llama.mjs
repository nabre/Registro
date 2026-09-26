// Un `node-llama-cpp` finto, per provare `src/data/llamaCpp.ts` senza `.gguf` e
// senza binari. Imita solo quel che il registro usa (`ModuloLlama` in
// `src/data/nodeLlama.ts`) e le regole che contano per un contesto tenuto
// aperto:
//
//   — una sequenza per contesto: `getSequence()` la seconda volta solleva «No
//     sequences left»;
//   — una sequenza smaltita non si usa più;
//   — una sessione non smaltita lascia un ascoltatore sulla sequenza (come
//     `LlamaChat` su `onDispose`);
//   — con una griglia senza battuta di sistema il `systemPrompt` del costruttore
//     **si butta** (Gemma 1-3);
//   — i «token» sono parole, e la sequenza rielabora dal primo diverso.
//
// Lo stato sta su `globalThis.__bancoLlama`, come in `fake-electron.mjs`: la
// prova e `llamaCpp.ts` hanno due copie del modulo.

/** Il banco di lavoro: quel che è successo, e quel che la prova ha deciso. */
const banco = (globalThis.__bancoLlama ??= {})

/** Rimette il banco com'è all'inizio: da chiamare prima di ogni prova. */
function azzera () {
  Object.assign(banco, {
    /** I modelli caricati, nell'ordine. */
    modelli: [],
    /** I contesti aperti, nell'ordine, smaltiti compresi. */
    contesti: [],
    /** Le sessioni costruite, nell'ordine. */
    sessioni: [],
    /** Quel che è stato smaltito e quel che è stato risposto, nell'ordine. */
    eventi: [],
    /** Quante `createContext` devono ancora fallire. */
    contestiDaNegare: 0,
    /** Se la griglia di conversazione ammette la battuta di sistema. */
    sistemaAmmesso: true,
    /** Se vero, `promptWithMeta` aspetta che la prova risponda. Vedi `inAttesa`. */
    trattieni: false,
    /**
     * Le domande trattenute: `{ testo, sessione, funzioni, rispondi(testo), fallisci(guasto) }`.
     * `funzioni` sono gli attrezzi con il loro `handler`: chiamarlo è fare quel che
     * fa il modello chiedendo un attrezzo a domanda aperta.
     */
    inAttesa: [],
    /** Se vero, `loadModel` aspetta: `caricamentiInAttesa` ha di che sbloccarlo. */
    trattieniCaricamenti: false,
    caricamentiInAttesa: [],
    /** Un guasto che il prossimo `promptWithMeta` solleva, una volta. */
    guasto: null,
    /** Quante domande stavano parlando insieme sulla stessa sequenza, al massimo. */
    insiemeAlMassimo: 0,
  })
}
azzera()
banco.azzera = azzera

/** Il banco, per le prove che vogliono predisporre le risposte o guardare. */
export const bancoLlama = banco

/** Le «parole» di un testo: qui un token è una parola, e basta. */
function parole (testo) {
  return String(testo).split(/\s+/).filter((p) => p !== '')
}

/** La storia di una sessione resa in token, come la leggerebbe il modello. */
function resa (storia) {
  return storia.flatMap((voce) => {
    if (voce.type === 'system') return ['<sistema>', ...parole(voce.text)]
    if (voce.type === 'user') return ['<utente>', ...parole(voce.text)]
    return ['<modello>', ...voce.response.flatMap((pezzo) => parole(pezzo))]
  })
}

class Sequenza {
  constructor (contesto) {
    this.contesto = contesto
    this.disposed = false
    this.token = []
    this.letti = 0
    this.scritti = 0
    /** Gli ascoltatori delle sessioni ancora appese: devono tornare a zero. */
    this.ascoltatori = 0
    /** Quante domande stanno parlando adesso su questa sequenza. */
    this.parlano = 0
    const sequenza = this
    this.tokenMeter = {
      getState: () => ({ usedInputTokens: sequenza.letti, usedOutputTokens: sequenza.scritti }),
      diff: (stato) => ({
        usedInputTokens: sequenza.letti - stato.usedInputTokens,
        usedOutputTokens: sequenza.scritti - stato.usedOutputTokens,
      }),
    }
  }

  get contextTokens () {
    return this.token.slice()
  }

  get nextTokenIndex () {
    return this.token.length
  }

  /** Legge `nuovi` ripartendo dal primo token diverso da quel che teneva. */
  leggi (nuovi) {
    let comuni = 0
    while (comuni < this.token.length && comuni < nuovi.length &&
      this.token[comuni] === nuovi[comuni]) comuni += 1
    this.letti += nuovi.length - comuni
    this.token = nuovi.slice()
  }

  dispose () {
    this.disposed = true
  }
}

class Contesto {
  constructor (modello, contextSize) {
    this.modello = modello
    this.contextSize = contextSize
    this.disposed = false
    this.sequenza = null
  }

  getSequence () {
    if (this.disposed) throw new Error('Object is disposed')
    if (this.sequenza) throw new Error('No sequences left')
    this.sequenza = new Sequenza(this)
    return this.sequenza
  }

  async dispose (daChi = 'contesto.dispose') {
    if (this.disposed) return
    this.disposed = true
    this.sequenza?.dispose()
    banco.eventi.push(daChi)
  }
}

class Modello {
  constructor (modelPath, gpuLayers) {
    this.modelPath = modelPath
    this.gpuLayers = typeof gpuLayers === 'number' ? gpuLayers : 28
    this.trainContextSize = 32768
    this.disposed = false
  }

  async createContext ({ contextSize }) {
    if (banco.contestiDaNegare > 0) {
      banco.contestiDaNegare -= 1
      throw new Error('finto: memoria esaurita')
    }
    const contesto = new Contesto(this, contextSize.max)
    banco.contesti.push(contesto)
    return contesto
  }

  async dispose () {
    if (this.disposed) return
    // Come la libreria: smaltire il modello smaltisce i contesti in cascata.
    // L'evento dice «in cascata», così una prova vede se chi chiama li ha chiusi
    // prima.
    for (const contesto of banco.contesti) {
      if (contesto.modello === this) await contesto.dispose('contesto.dispose(cascata)')
    }
    this.disposed = true
    banco.eventi.push('modello.dispose')
  }
}

export async function getLlama () {
  return {
    async loadModel ({ modelPath, gpuLayers }) {
      if (banco.trattieniCaricamenti) {
        await new Promise((via) => banco.caricamentiInAttesa.push(via))
      }
      const modello = new Modello(modelPath, gpuLayers)
      banco.modelli.push(modello)
      return modello
    },
  }
}

export class LlamaChatSession {
  constructor ({ contextSequence, systemPrompt, forceAddSystemPrompt = false }) {
    if (!contextSequence) throw new Error('contextSequence cannot be null')
    if (contextSequence.disposed) throw new Error('Object is disposed')
    this.sequenza = contextSequence
    this.systemPrompt = systemPrompt
    this.disposed = false
    // Come `LlamaChatSession.js`: senza battuta di sistema nella griglia, il
    // `systemPrompt` del costruttore non entra nella storia.
    this.storia = (banco.sistemaAmmesso || forceAddSystemPrompt) && systemPrompt
      ? [{ type: 'system', text: systemPrompt }]
      : []
    /** La storia come l'ha vista il modello a ogni domanda. */
    this.domande = []
    contextSequence.ascoltatori += 1
    banco.sessioni.push(this)
  }

  setChatHistory (storia) {
    this.storia = storia.slice()
  }

  getChatHistory () {
    return this.storia.slice()
  }

  async promptWithMeta (testo, opzioni = {}) {
    if (this.disposed) throw new Error('Object is disposed')
    const sequenza = this.sequenza
    if (sequenza.disposed) throw new Error('Object is disposed')
    const storia = [...this.storia, { type: 'user', text: testo }]
    this.domande.push(storia)
    sequenza.parlano += 1
    banco.insiemeAlMassimo = Math.max(banco.insiemeAlMassimo, sequenza.parlano)
    try {
      if (banco.guasto) {
        const guasto = banco.guasto
        banco.guasto = null
        throw guasto
      }
      sequenza.leggi(resa(storia))
      const risposta = await this.#risposta(testo, opzioni.signal, opzioni.functions)
      if (sequenza.disposed) throw new Error('Object is disposed')
      if (risposta.stopReason === 'abort') return risposta
      const scritte = parole(risposta.responseText)
      if (scritte.length > 0) opzioni.onResponseChunk?.({ text: risposta.responseText })
      sequenza.scritti += scritte.length
      this.storia = [...storia, { type: 'model', response: [risposta.responseText] }]
      sequenza.token = resa(this.storia)
      banco.eventi.push(`risposta: ${risposta.responseText}`)
      return risposta
    } finally {
      sequenza.parlano -= 1
    }
  }

  /** La risposta: subito, o quando la prova la dà. Un annullo torna vuoto. */
  #risposta (testo, segnale, funzioni) {
    const annullo = { responseText: '', stopReason: 'abort' }
    if (segnale?.aborted) return Promise.resolve(annullo)
    if (!banco.trattieni) {
      return Promise.resolve({ responseText: `risposta a ${testo}`, stopReason: 'eogToken' })
    }
    return new Promise((fatto, fallito) => {
      const voce = {
        testo,
        sessione: this,
        funzioni: funzioni ?? {},
        rispondi: (detto) => fatto({ responseText: detto, stopReason: 'eogToken' }),
        fallisci: fallito,
      }
      segnale?.addEventListener('abort', () => fatto(annullo), { once: true })
      banco.inAttesa.push(voce)
    })
  }

  dispose ({ disposeSequence = false } = {}) {
    if (this.disposed) return
    this.disposed = true
    this.sequenza.ascoltatori -= 1
    if (disposeSequence) this.sequenza.dispose()
  }
}

export function defineChatSessionFunction (descrizione) {
  return descrizione
}

export async function createModelDownloader () {
  throw new Error('finto: qui non si scarica niente')
}
