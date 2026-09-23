// Che cosa, in un modello, il registro non capirà.
//
// Il lettore dei modelli è fatto per non cadere mai: una riga che non capisce
// la salta e va avanti, perché un refuso non deve impedire di stampare il
// verbale. È la regola giusta, e ha un prezzo: **il refuso non si vede**. Una
// `tabella: allevi` scritta male non dà nessun errore — esce un foglio senza
// quella tabella, e chi lo guarda pensa che quella classe non abbia voti.
//
// Qui c'è l'altra metà: le stesse regole del lettore, lette per dire che cosa
// verrà saltato. Non corregge niente e non impedisce di salvare — la cartella
// è del docente, e un modello a metà è un lavoro in corso, non un errore — ma
// lo dice riga per riga, mentre lo si scrive.
//
// I nomi noti arrivano da fuori e sono facoltativi: un elenco vuoto vuol dire
// «non si sa», e quel controllo si salta. Serve a due usi diversi dello stesso
// codice — la pagina, che i nomi veri del rapporto li ha chiesti all'host, e
// una prova che guarda solo la forma del file.

import { chiaveValore, DIRETTIVE, FORMATI, type TipoBlocco } from './reports.js'

/** Quanto è grave: un errore è roba che sparisce dal foglio, un avviso un dubbio. */
type Gravita = 'errore' | 'avviso'

export interface Problema {
  /** La riga del file, contata da 1: è il numero che si legge nell'editor. */
  riga: number
  gravita: Gravita
  testo: string
}

/**
 * I nomi che esistono davvero dall'altra parte.
 *
 * Ogni elenco vuoto è un controllo che non si fa: chi ha i nomi veri li passa,
 * chi guarda solo la forma del file lascia vuoto e ottiene comunque i
 * controlli che non dipendono dai dati — le sezioni, le direttive, le misure.
 */
interface NomiNoti {
  /** I modelli che `estende:` può nominare. */
  modelli: readonly string[]
  /** Le immagini che stanno in `templates/`. */
  immagini: readonly string[]
  valori: readonly string[]
  elenchi: readonly string[]
  tabelle: readonly string[]
  grafici: readonly string[]
  gallerie: readonly string[]
  gruppi: readonly string[]
  /** I pezzi di `_blocchi.tpl` che `usa:` può richiamare. */
  blocchi: readonly string[]
  /** Le frasi di `_testi.tpl`: `{{frase.nome}}`. */
  frasi: readonly string[]
}

export function nomiVuoti (): NomiNoti {
  return {
    modelli: [],
    immagini: [],
    valori: [],
    elenchi: [],
    tabelle: [],
    grafici: [],
    gallerie: [],
    gruppi: [],
    blocchi: [],
    frasi: [],
  }
}

/** Le sezioni che il lettore riconosce. Ogni altra parentesi viene saltata. */
const SEZIONI = ['intestazione', 'piede', 'corpo', 'stile']

/** Le chiavi che si scrivono in testa o dentro `[stile]`. */
const CHIAVI_TESTA = [
  'titolo',
  'estende',
  'orientamento',
  'margini',
  'formato',
  'corpo',
  'scala',
  'interlinea',
  'colonne',
  'corpo-minimo-tabella',
]

/** I segnaposto che ogni rapporto ha, senza che nessuno li produca. */
const SEMPRE = ['titolo', 'anno', 'periodo', 'classe', 'materia', 'corso', 'generato']

/** Quelli che valgono solo in intestazione e piede: fuori di lì restano vuoti. */
const SOLO_BANDA = ['pagina', 'pagine']

/** I corpi del testo che `corpo:` sa nominare. */
const CORPI = ['titolo', 'sottotitolo', 'sezione', 'testo', 'piccolo', 'banda']

/** Le direttive che aprono un giro e vogliono un `fine:` dopo. */
const APRONO = new Set<TipoBlocco>(['se', 'ripeti'])

function numeri (valore: string): number[] {
  return valore
    .split(/\s+/)
    .filter(Boolean)
    .map((pezzo) => Number(pezzo.replace(',', '.')))
}

/** Divide `chiave: valore` come fa il lettore: alla prima due punti. */
/** Il nome davanti alla prima barra: `tabella: voti | data peso` chiede «voti». */
function primoNome (valore: string): string {
  const barra = valore.indexOf('|')
  return (barra < 0 ? valore : valore.slice(0, barra)).trim()
}

/**
 * I segnaposto citati in una riga, senza le graffe.
 *
 * Lo stesso riconoscimento del lettore, e apposta: un nome con dentro uno
 * spazio o un accento non viene sostituito, e dirlo qui è metà del lavoro di
 * questo file.
 */
function segnaposti (testo: string): string[] {
  return [...testo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((trovato) => trovato[1])
}

/**
 * Di che grammatica è fatto un file della cartella.
 *
 * Tre, e non una: un rapporto ha `[corpo]` e le sue direttive, `_blocchi.tpl`
 * ha `[blocco: nome]` con dentro le stesse direttive, `_testi.tpl` ha `[frasi]`
 * e `[colonne]` con dentro nomi liberi. Controllarli tutti con le regole del
 * rapporto vorrebbe dire segnalare come sbagliati due file che il registro
 * legge benissimo — e un controllo che grida al lupo su quel che funziona
 * smette di essere letto.
 *
 * `libero` è la firma delle e-mail: è HTML, e qui non c'è niente da dire.
 */
type FormaModello = 'rapporto' | 'blocchi' | 'testi' | 'libero'

/** Che grammatica ha quel file, dal suo nome. */
export function formaModello (nome: string): FormaModello {
  if (nome === '_blocchi') return 'blocchi'
  if (nome === '_testi') return 'testi'
  return nome.includes('.') ? 'libero' : 'rapporto'
}

/**
 * I problemi di un file della cartella, riga per riga.
 *
 * `forma` dice con quali regole leggerlo: quella di un rapporto, se non si
 * dice niente. Chi ha in mano un nome usa `formaModello`.
 */
export function verificaModello (
  sorgente: string,
  noti: NomiNoti = nomiVuoti(),
  forma: FormaModello = 'rapporto',
): Problema[] {
  if (forma === 'libero') return []
  if (forma === 'blocchi') return verificaBlocchi(sorgente, noti)
  if (forma === 'testi') return verificaTesti(sorgente)
  return verificaRapporto(sorgente, noti)
}

/**
 * Un modello di rapporto: la testa con le misure, le due bande, il corpo.
 */
function verificaRapporto (sorgente: string, noti: NomiNoti): Problema[] {
  const problemi: Problema[] = []
  const righe = sorgente.split(/\r?\n/)
  let dove: 'testa' | 'intestazione' | 'piede' | 'corpo' | 'stile' = 'testa'
  // Quanti `se:` e `ripeti:` sono aperti, e dove: un giro senza `fine:` si
  // mangia tutto quel che viene dopo, ed è il guasto più difficile da vedere
  // rileggendo il file.
  const aperti: Array<{ riga: number, tipo: string }> = []

  const dì = (riga: number, gravita: Gravita, testo: string) => {
    problemi.push({ riga, gravita, testo })
  }

  const controllaNome = (
    riga: number,
    genere: string,
    nome: string,
    elenco: readonly string[],
  ) => {
    if (elenco.length === 0 || nome === '' || elenco.includes(nome)) return
    dì(riga, 'errore', `${genere} «${nome}» non esiste in questo rapporto: la riga sparisce dal foglio.`)
  }

  righe.forEach((grezza, indice) => {
    const numero = indice + 1
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) return

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      if (!SEZIONI.includes(quale)) {
        dì(numero, 'errore', `Sezione «${quale}» sconosciuta: tutto quel che segue resta dov’era.`)
        return
      }
      dove = quale as typeof dove
      return
    }

    const voce = chiaveValore(riga)
    if (!voce) {
      dì(numero, 'errore', 'Manca i due punti: una riga senza «chiave: contenuto» viene saltata.')
      return
    }

    // La domanda di un `se:` non è un segnaposto: `se: {{oltreSoglia}}` chiede
    // «c'è qualcosa in quell'elenco?», e il nome può essere di un elenco, di
    // una tabella o di un gruppo. Si controlla più sotto, contro tutte le
    // raccolte insieme; qui si salta, o ogni condizione scritta bene
    // risulterebbe un segnaposto che non esiste.
    const domanda = dove === 'corpo' && (voce.chiave === 'se' || voce.chiave === 'altrimenti')

    // I segnaposto si controllano ovunque: il nome sbagliato diventa vuoto, e
    // una riga fatta di soli segnaposto vuoti sparisce.
    for (const nome of domanda ? [] : segnaposti(voce.valore)) {
      if (nome.startsWith('frase.')) {
        controllaNome(numero, 'La frase', nome.slice('frase.'.length), noti.frasi)
        continue
      }
      if (SEMPRE.includes(nome)) continue
      if (SOLO_BANDA.includes(nome)) {
        if (dove !== 'intestazione' && dove !== 'piede') {
          dì(numero, 'avviso', `«{{${nome}}}» vale solo in intestazione e piede: qui resta vuoto.`)
        }
        continue
      }
      if (noti.valori.length > 0 && !noti.valori.includes(nome)) {
        dì(numero, 'errore', `Il segnaposto «{{${nome}}}» non esiste in questo rapporto: esce vuoto.`)
      }
    }

    if (dove === 'testa' || dove === 'stile') {
      if (!CHIAVI_TESTA.includes(voce.chiave)) {
        dì(numero, 'errore', `«${voce.chiave}» non è una misura né una dichiarazione: la riga non conta.`)
        return
      }
      controllaMisura(numero, voce, dì, noti)
      return
    }

    if (dove === 'intestazione' || dove === 'piede') {
      if (voce.chiave !== 'riga' && voce.chiave !== 'immagine') {
        dì(numero, 'errore', `In ${dove} valgono solo «riga:» e «immagine:»: «${voce.chiave}» viene saltata.`)
        return
      }
      if (voce.chiave === 'immagine') controllaImmagine(numero, voce.valore, dì, noti)
      return
    }

    // Da qui in giù si è nel corpo.
    if (!DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      dì(numero, 'errore', `«${voce.chiave}» non è una direttiva del corpo: la riga sparisce dal foglio.`)
      return
    }

    const direttiva = voce.chiave as TipoBlocco
    if (APRONO.has(direttiva)) aperti.push({ riga: numero, tipo: direttiva })
    if (direttiva === 'fine') {
      if (aperti.length === 0) {
        dì(numero, 'errore', '«fine:» senza un «se:» o un «ripeti:» aperto.')
      } else {
        aperti.pop()
      }
    }
    if (direttiva === 'altrimenti' && aperti.length === 0) {
      dì(numero, 'errore', '«altrimenti:» fuori da un «se:».')
    }

    const nome = primoNome(voce.valore)
    if (direttiva === 'tabella') controllaNome(numero, 'La tabella', nome, noti.tabelle)
    if (direttiva === 'elenco') controllaNome(numero, 'L’elenco', nome, noti.elenchi)
    if (direttiva === 'grafico') controllaNome(numero, 'Il grafico', nome, noti.grafici)
    if (direttiva === 'galleria') controllaNome(numero, 'La parete di ritratti', nome, noti.gallerie)
    if (direttiva === 'ripeti') controllaNome(numero, 'Il gruppo', nome, noti.gruppi)
    if (direttiva === 'usa') controllaNome(numero, 'Il blocco', nome, noti.blocchi)
    if (direttiva === 'immagine') controllaImmagine(numero, voce.valore, dì, noti)
    // `se:` guarda se qualcosa c'è: un nome che non esiste non è un refuso da
    // segnalare come errore — è la domanda stessa — ma se non esiste in
    // nessuna delle raccolte, quel pezzo non uscirà mai, e vale dirlo.
    if ((direttiva === 'se' || direttiva === 'altrimenti') && noti.valori.length > 0) {
      const dovunque = [
        ...noti.valori,
        ...noti.elenchi,
        ...noti.tabelle,
        ...noti.grafici,
        ...noti.gallerie,
        ...noti.gruppi,
      ]
      // Scritta con le graffe o senza: `se: {{voti}}` e `se: voti` chiedono la
      // stessa cosa, e il lettore le tratta uguali.
      const chiesto = nome.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '')
      if (chiesto !== '' && !dovunque.includes(chiesto)) {
        dì(
          numero,
          'avviso',
          `«${direttiva}: ${chiesto}» non trova niente con quel nome: il pezzo non uscirà mai.`,
        )
      }
    }
  })

  for (const giro of aperti) {
    problemi.push({
      riga: giro.riga,
      gravita: 'errore',
      testo: `«${giro.tipo}:» aperto e mai chiuso: manca un «fine:», e quel che segue resta dentro.`,
    })
  }

  return problemi.sort((a, b) => a.riga - b.riga)
}

/** Le righe delle misure: formato, margini, corpi, e le tre manopole. */
function controllaMisura (
  numero: number,
  voce: { chiave: string, valore: string },
  dì: (riga: number, gravita: Gravita, testo: string) => void,
  noti: NomiNoti,
): void {
  const fra = (min: number, max: number) => {
    const letti = numeri(voce.valore)
    if (letti.length !== 1 || !Number.isFinite(letti[0]) || letti[0] < min || letti[0] > max) {
      dì(numero, 'errore', `«${voce.chiave}» vuole un numero fra ${min} e ${max}: vale quello di prima.`)
    }
  }

  switch (voce.chiave) {
    case 'estende': {
      const nome = voce.valore.trim()
      if (nome === '') return
      if (!/^[A-Za-z0-9_-]+$/.test(nome)) {
        dì(numero, 'errore', 'Il nome di un modello è una parola sola, senza percorsi.')
        return
      }
      if (noti.modelli.length > 0 && !noti.modelli.includes(nome)) {
        dì(numero, 'errore', `Il modello «${nome}» non c’è in templates/: non si eredita niente.`)
      }
      return
    }
    case 'orientamento':
      if (!/^(vert|oriz)/i.test(voce.valore.trim())) {
        dì(numero, 'avviso', '«orientamento» vuole «verticale» oppure «orizzontale».')
      }
      return
    case 'margini': {
      const letti = numeri(voce.valore)
      if (letti.length !== 4 || letti.some((n) => !Number.isFinite(n))) {
        dì(numero, 'errore', '«margini» vuole quattro numeri: alto destra basso sinistra, in millimetri.')
      }
      return
    }
    case 'formato': {
      const pulito = voce.valore.trim().toLowerCase()
      if (Object.hasOwn(FORMATI, pulito)) return
      if (!/^\d+(\.\d+)?\s*[x×]\s*\d+(\.\d+)?$/.test(pulito)) {
        dì(
          numero,
          'errore',
          `«${voce.valore}» non è un formato: ${Object.keys(FORMATI).join(' ')}, o due misure come «210x297».`,
        )
      }
      return
    }
    case 'corpo': {
      for (const pezzo of voce.valore.split(';')) {
        const parte = pezzo.trim()
        if (parte === '') continue
        const [nome, misura] = parte.split('=').map((p) => p.trim())
        if (!CORPI.includes(nome)) {
          dì(numero, 'errore', `«${nome}» non è un corpo del testo: ${CORPI.join(' ')}.`)
          continue
        }
        if (!Number.isFinite(Number(misura))) {
          dì(numero, 'errore', `Il corpo «${nome}» vuole una misura in punti, come «${nome}=10».`)
        }
      }
      return
    }
    case 'scala':
      fra(0.3, 3)
      return
    case 'interlinea':
      fra(1, 5)
      return
    case 'corpo-minimo-tabella':
      fra(0, 20)
      return
    default:
      // `titolo:` prende quel che c'è scritto, e non c'è niente da controllare.
      return
  }
}

/**
 * Una riga `immagine:`, in banda o nel corpo.
 *
 * Il nome secco è un file di `templates/`; un nome con delle barre è un
 * documento dell'anno — il ritratto di un allievo — e quello qui non si può
 * controllare: sta dentro il documento, cambia con la classe, e dirne qualcosa
 * vorrebbe dire dire una cosa sbagliata.
 */
function controllaImmagine (
  numero: number,
  valore: string,
  dì: (riga: number, gravita: Gravita, testo: string) => void,
  noti: NomiNoti,
): void {
  const nome = primoNome(valore)
  if (nome === '') {
    dì(numero, 'errore', '«immagine:» senza un file da mostrare.')
    return
  }
  if (nome.includes('{{')) return
  if (nome.includes('/')) return
  if (!/\.(png|jpe?g)$/i.test(nome)) {
    dì(numero, 'errore', `«${nome}» non è un’immagine: servono PNG o JPEG.`)
    return
  }
  if (noti.immagini.length > 0 && !noti.immagini.includes(nome)) {
    dì(numero, 'errore', `L’immagine «${nome}» non è in templates/: il foglio esce senza.`)
  }
}

/**
 * `_blocchi.tpl`: pezzi di corpo con un nome, richiamati da `usa:`.
 *
 * Dentro un blocco valgono le direttive del corpo e nient'altro. I segnaposto
 * no: un blocco riceve dei parametri da chi lo chiama — `usa: intestazione |
 * titolo=Presenze` — e quei nomi non stanno nei dati di nessun rapporto.
 * Cercarli là darebbe un errore su ogni blocco scritto bene, che è il modo di
 * far ignorare tutti gli altri.
 */
function verificaBlocchi (sorgente: string, noti: NomiNoti): Problema[] {
  const problemi: Problema[] = []
  let dentro: string | null = null
  const aperti: Array<{ riga: number, tipo: string }> = []

  sorgente.split(/\r?\n/).forEach((grezza, indice) => {
    const numero = indice + 1
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) return

    const blocco = riga.match(/^\[\s*blocco\s*:\s*(.+?)\s*\]$/i)
    if (blocco) {
      dentro = blocco[1]
      return
    }
    if (/^\[.+\]$/.test(riga)) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: 'Qui le sezioni sono «[blocco: nome]»: da questa riga in giù non si legge più niente.',
      })
      dentro = null
      return
    }

    const voce = chiaveValore(riga)
    if (!voce) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: 'Manca i due punti: una riga senza «chiave: contenuto» viene saltata.',
      })
      return
    }
    if (dentro === null) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: 'Questa riga sta fuori da ogni blocco: nessun «usa:» può richiamarla.',
      })
      return
    }
    if (!DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: `«${voce.chiave}» non è una direttiva del corpo: la riga sparisce dal foglio.`,
      })
      return
    }

    const direttiva = voce.chiave as TipoBlocco
    if (APRONO.has(direttiva)) aperti.push({ riga: numero, tipo: direttiva })
    if (direttiva === 'fine') {
      if (aperti.length === 0) {
        problemi.push({
          riga: numero,
          gravita: 'errore',
          testo: '«fine:» senza un «se:» o un «ripeti:» aperto.',
        })
      } else {
        aperti.pop()
      }
    }
    // Un blocco che ne richiama un altro: il nome deve esistere come per i
    // modelli, ed è l'errore che fa sparire un pezzo di foglio in silenzio.
    if (direttiva === 'usa' && noti.blocchi.length > 0) {
      const nome = primoNome(voce.valore)
      if (nome !== '' && !noti.blocchi.includes(nome)) {
        problemi.push({
          riga: numero,
          gravita: 'errore',
          testo: `Il blocco «${nome}» non esiste: la riga sparisce dal foglio.`,
        })
      }
    }
  })

  for (const giro of aperti) {
    problemi.push({
      riga: giro.riga,
      gravita: 'errore',
      testo: `«${giro.tipo}:» aperto e mai chiuso: manca un «fine:», e quel che segue resta dentro.`,
    })
  }
  return problemi.sort((a, b) => a.riga - b.riga)
}

/**
 * `_testi.tpl`: le frasi e i nomi delle colonne.
 *
 * I nomi qui dentro sono liberi da tutte e due le parti — a sinistra come si
 * chiama la frase, a destra quel che dice — e non c'è niente da confrontare
 * con i dati: una frase vale per tutti i rapporti, e i segnaposto che contiene
 * si riempiono in quello che la usa. Resta da dire l'unica cosa che qui fa
 * sparire del testo davvero: una riga fuori dalle due sezioni, o senza i due
 * punti.
 */
function verificaTesti (sorgente: string): Problema[] {
  const problemi: Problema[] = []
  let dove: 'frasi' | 'colonne' | null = null

  sorgente.split(/\r?\n/).forEach((grezza, indice) => {
    const numero = indice + 1
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) return

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      if (quale !== 'frasi' && quale !== 'colonne') {
        problemi.push({
          riga: numero,
          gravita: 'errore',
          testo: `Sezione «${quale}» sconosciuta: qui ci sono «[frasi]» e «[colonne]».`,
        })
        dove = null
        return
      }
      dove = quale
      return
    }

    if (riga.indexOf(':') <= 0) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: 'Manca i due punti: una riga senza «nome: contenuto» viene saltata.',
      })
      return
    }
    if (dove === null) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: 'Questa riga sta fuori da «[frasi]» e «[colonne]»: non la legge nessuno.',
      })
    }
  })

  return problemi
}
