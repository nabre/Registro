// I modelli con cui il registro compone i suoi rapporti.
//
// Un rapporto è un documento che esce dal registro e va in mano a qualcuno —
// il verbale di un'ora, la scheda di un allievo, il fascicolo che si consegna
// a chi subentra — e finora ognuno se lo scriveva da sé, in codice: chi voleva
// cambiare l'intestazione doveva trovare la funzione giusta, e due rapporti
// affiancati non si somigliavano perché nessuno li aveva mai messi affianco.
//
// Qui l'impaginazione si dichiara, e sta in file di testo dentro `templates/`.
// Un modello dice che cosa va in intestazione, che cosa in fondo alla pagina e
// in che ordine viene il corpo; i dati li mette il registro al momento di
// stampare. Cambiare la testata di tutti i rapporti è cambiare una riga in un
// file solo, e non serve ricompilare niente.
//
// Il formato è a righe, `direttiva: contenuto`, perché deve restare
// modificabile da chi non programma: niente parentesi da chiudere, niente
// indentazione che conta, e una riga sbagliata rovina quella riga e basta.

/** Come si dispone una riga fissa: sinistra, centro, destra. */
export interface RigaFissa {
  sinistra: string
  centro: string
  destra: string
}

export type TipoBlocco =
  | 'titolo'
  | 'sottotitolo'
  | 'sezione'
  | 'paragrafo'
  | 'testo'
  | 'campi'
  | 'riquadro'
  | 'avviso'
  | 'elenco'
  | 'tabella'
  | 'grafico'
  | 'galleria'
  | 'spazio'
  | 'filo'
  | 'immagine'
  | 'pagina-nuova'
  // I tre che non si disegnano: dicono che cosa fare del resto, e spariscono
  // componendo il corpo.
  | 'se'
  | 'altrimenti'
  | 'fine'
  | 'ripeti'
  | 'usa'

export interface Blocco {
  tipo: TipoBlocco
  valore: string
  /**
   * I dati già risolti, quando il nome da solo non basta più.
   *
   * Dentro un `ripeti:` la stessa riga `tabella: prove` vale una tabella
   * diversa a ogni giro: il nome non la ritrova, perché il giro è finito prima
   * che qualcuno disegni. Componendo il corpo si risolve subito e ci si porta
   * dietro quel che si è trovato; fuori da un `ripeti:` questi restano vuoti e
   * chi disegna cerca per nome come ha sempre fatto.
   */
  tabella?: Tabella
  elenco?: string[]
  grafico?: Grafico
  galleria?: Galleria
}

/**
 * Un'immagine chiesta da un modello: il logo della sede, una firma scansionata.
 *
 * L'altezza si dichiara e la larghezza viene da sé, dalle proporzioni del file:
 * dichiararle tutte e due vorrebbe dire poterle sbagliare, e un logo schiacciato
 * su un foglio che va in segreteria si nota subito.
 */
export interface ImmagineModello {
  /** Il nome del file dentro `templates/`. */
  file: string
  /** In millimetri, come si misura su un foglio. */
  altezza: number
  allineamento: 'sinistra' | 'centro' | 'destra'
  /**
   * Se quel che segue le si scrive accanto invece che sotto.
   *
   * Vale nel corpo e per le immagini di lato: il ritratto di un allievo con i
   * suoi recapiti alla stessa altezza è una scheda anagrafica, gli stessi due
   * pezzi uno sotto l'altro sono due terzi di foglio per sei righe di testo.
   * In testata non vuol dire niente — là il testo sta già di fianco al logo.
   */
  accanto?: boolean
}

export interface Margini {
  alto: number
  destra: number
  basso: number
  sinistra: number
}

/** Un foglio, in millimetri: il lato corto per il lato lungo. */
export interface Formato {
  larghezza: number
  altezza: number
}

/**
 * I corpi del testo, in punti tipografici.
 *
 * Pochi e distanti: una scala fitta non si vede, e cinque misure bastano a
 * tutto quel che un rapporto contiene.
 */
export interface Corpi {
  titolo: number
  sottotitolo: number
  sezione: number
  testo: number
  piccolo: number
  /**
   * La testata e il piede.
   *
   * Suo e non `piccolo` come prima: le due misure si erano trovate uguali per
   * caso, ma una testata di tre righe e la griglia dei voti si guardano da
   * distanze diverse e si stringono per motivi diversi. Rimpicciolire una
   * tabella perché non ci sta in larghezza non deve rimpicciolire il nome della
   * scuola in cima al foglio.
   */
  banda: number
}

/**
 * Lo strato sotto il modello: le misure con cui il foglio viene disegnato.
 *
 * Stava dentro l'impaginatore, in costanti che si potevano cambiare solo
 * ricompilando — e quindi non si cambiavano. Ma «il verbale esce con i
 * caratteri troppo piccoli», «questa tabella non ci sta in larghezza», «in
 * sede si stampa in A3» sono esattamente le cose che si scoprono usando i
 * rapporti, cioè quando ricompilare non è un'opzione. Adesso è un modello come
 * gli altri, `_stile.tpl`, che tutti estendono: si apre, si cambia un numero e
 * vale dalla stampa dopo.
 */
export interface Stile {
  /** Il foglio, in millimetri. L'orientamento lo gira; qui sta com'è in piedi. */
  formato: Formato
  corpi: Corpi
  /**
   * Moltiplica tutti i corpi insieme. È la manopola che si tocca per prima:
   * «tutto un po' più grande» è la richiesta vera, e ritoccare cinque numeri
   * a mano tenendo i rapporti fra loro è un lavoro che sbaglia chiunque.
   */
  scala: number
  /** L'altezza di una riga di tabella, in multipli del suo corpo. */
  interlinea: number
  /**
   * Come si spartisce la larghezza fra le colonne di una tabella.
   *
   * `adatta` misura quel che c'è dentro e dà a ognuna quel che le serve;
   * `uguali` è la spartizione di prima, proporzionale ai soli pesi dichiarati.
   */
  colonne: 'adatta' | 'uguali'
  /**
   * Fin dove il testo di una tabella può rimpicciolire per non farsi troncare.
   *
   * Una tabella con venti prove non ci sta in larghezza a nessun corpo; ma fra
   * troncare «Rossi Anna» in «Ros...» e scriverla mezzo punto più piccola, la
   * seconda è quella che lascia il foglio leggibile. Zero spegne il rimpicciolimento.
   */
  corpoMinimoTabella: number
}

export interface Modello {
  /** Il nome del file, senza estensione: è con questo che lo si chiede. */
  nome: string
  titolo: string
  orientamento: 'verticale' | 'orizzontale'
  /** In millimetri, come li si misura su un foglio. */
  margini: Margini
  /** Il modello da cui prende intestazione e piede, se ne dichiara uno. */
  estende: string | null
  intestazione: RigaFissa[]
  piede: RigaFissa[]
  /** Le immagini della testata e del piede: si ripetono su ogni pagina. */
  intestazioneImmagini: ImmagineModello[]
  piedeImmagini: ImmagineModello[]
  corpo: Blocco[]
  /** Le misure del foglio: proprie, o ereditate da chi si estende. */
  stile: Stile
  /**
   * Quali impostazioni questo file ha scritto davvero.
   *
   * Serve a ereditare per bene: senza, un valore lasciato al suo predefinito
   * non si distingue da uno scritto uguale al predefinito, e chi estende non
   * saprebbe se sovrascriverlo. È il motivo per cui prima `_base.tpl` poteva
   * dichiarare margini e orientamento e non li prendeva nessuno.
   */
  dichiarate: string[]
}

export interface Tabella {
  intestazione: string[]
  righe: string[][]
  /** Peso relativo di ogni colonna; se manca, tutte uguali. */
  pesi?: number[]
  /**
   * L'ultima riga, quella che tira le somme: si disegna in grassetto, staccata
   * dalle altre da un filo più marcato.
   *
   * Una riga come le altre non basta: «12» in fondo alla colonna delle prove si
   * legge come una tredicesima prova. Ed è il posto giusto per un totale — in
   * fondo a quel che riassume — invece che in una tabella sua da un'altra
   * parte del foglio, dove chi conta le righe non lo trova.
   *
   * Le celle sono quelle dell'intestazione: quelle che non hanno un totale si
   * lasciano vuote.
   */
  totale?: string[]
}

/**
 * Una distribuzione da disegnare a punti sopra un asse.
 *
 * Un punto per voto, al suo valore esatto, impilato quando si ripete. Non a
 * colonne per fascia: una classe è di dodici o venticinque voti, non di
 * cinquecento, e raggrupparli è una perdita che non compra niente — con le
 * fasce intere un 3.75 e un 3.00 diventano la stessa cosa, e la differenza fra
 * «quasi» e «lontano» è proprio quella che si guarda quando si decide chi
 * recupera. Il raggruppamento serve quando i dati sono troppi per stare uno a
 * uno; qui non lo sono mai.
 *
 * Sopra l'asse passa la riga della media: la sufficienza non ha bisogno di una
 * riga sua perché la dice già il colore dei punti, e due tratteggi vicini
 * facevano metà del disegno di righe.
 *
 * I conti li fa il dominio. Chi disegna riceve valori e posizioni, e non deve
 * sapere che cosa sia una sufficienza.
 */
export interface Grafico {
  /** Che cosa conta un punto: «voti», «allievi». Va sotto il disegno. */
  unita: string
  /** Gli estremi dell'asse: la scala della prova, non i voti che ci sono. */
  da: number
  a: number
  /** I valori da etichettare sotto l'asse. Tutti no: si leggerebbero addosso. */
  tacche: number[]
  /**
   * Le lineette senza numero, fra una tacca e l'altra: dividono il tratto
   * senza affollarlo di cifre. Chi disegna le fa più corte delle tacche.
   */
  tacchette?: number[]
  /** Un voto e quante volte è stato dato: `quanti` è l'altezza della pila. */
  punti: Array<{ valore: number, quanti: number }>
  /** Sotto questa un punto è rosso, da questa in su è verde. */
  soglia?: number
  /** I segni verticali con la loro etichetta: la media. */
  segni?: Array<{ valore: number, etichetta: string }>
}

/**
 * Una parete di ritratti: una casella per allievo, foto e nome sotto.
 *
 * È l'unica cosa che una tabella non sa fare — le sue celle sono testo — ed è
 * la forma in cui un elenco di nomi serve davvero a chi entra in aula la prima
 * volta: si cerca una faccia e si legge il nome, non il contrario.
 *
 * La foto è un percorso relativo alla cartella dell'anno, come ogni allegato.
 * Chi non ce l'ha tiene la sua casella con il nome: una griglia che salta i
 * senza foto è una griglia in cui non si trovano più, e chi manca all'appello
 * è proprio quello che si sta cercando.
 */
export interface Galleria {
  celle: Array<{
    /** Il file della foto, o vuoto: la casella resta, con il posto segnato. */
    immagine: string
    titolo: string
    /** La riga piccola sotto il nome: l'azienda, il recapito, quel che serve. */
    sotto?: string
  }>
}

/**
 * Quel che il registro mette dentro un modello.
 *
 * Tre sacchi e non uno: un valore si sostituisce dentro una riga, un elenco
 * diventa dei punti, una tabella delle colonne. Tenerli separati è quel che
 * permette al modello di dire «tabella: presenze» senza sapere quante righe
 * abbia, e al registro di riempirle senza sapere dove finiranno.
 */
/**
 * Un giro di un `ripeti:`: quel che cambia da un allievo all'altro.
 *
 * Ha la stessa forma dei dati del rapporto, e per una ragione sola: dentro il
 * giro le righe del modello si scrivono come fuori — `tabella: prove`,
 * `{{allievo}}` — e a trovarle ci pensa la composizione, guardando prima nel
 * giro e poi nel rapporto. Chi scrive un modello non deve imparare due
 * vocabolari.
 */
export interface VoceRipetuta {
  valori?: Record<string, string>
  elenchi?: Record<string, string[]>
  tabelle?: Record<string, Tabella>
  grafici?: Record<string, Grafico>
}

export interface DatiRapporto {
  valori: Record<string, string>
  elenchi: Record<string, string[]>
  tabelle: Record<string, Tabella>
  grafici: Record<string, Grafico>
  /** Le pareti di ritratti, per nome: `galleria: allievi` pesca da qui. */
  gallerie?: Record<string, Galleria>
  /** Le voci su cui un `ripeti:` gira, per nome. */
  gruppi?: Record<string, VoceRipetuta[]>
  /**
   * Le frasi comuni, da `_testi.tpl`: `{{frase.nome}}` le pesca da qui.
   *
   * Stanno accanto ai valori e non dentro perché sono di un'altra natura —
   * un valore è quel che questo rapporto ha da dire, una frase è come lo si
   * dice, uguale in tutti i rapporti — e perché a loro volta contengono
   * segnaposto, che si risolvono in un secondo giro.
   */
  frasi?: Record<string, string>
  /** Come chiamare le colonne, da `_testi.tpl`. */
  colonne?: Record<string, string>
  /** I pezzi di corpo riusabili, da `_blocchi.tpl`: `usa:` li richiama. */
  blocchi?: Blocchi
}

const MARGINI_PREDEFINITI: Margini = { alto: 20, destra: 18, basso: 18, sinistra: 18 }

/**
 * I formati di carta che si sanno chiamare per nome, in millimetri.
 *
 * Sono quelli che una scuola stampa davvero: A4 per tutto, A3 per la griglia
 * dei voti da appendere, A5 per un foglietto. Chi ne vuole un altro scrive le
 * due misure — `formato: 210x297` — e non deve aspettare che qualcuno lo
 * aggiunga a questo elenco.
 */
export const FORMATI: Record<string, Formato> = {
  a3: { larghezza: 297, altezza: 420 },
  a4: { larghezza: 210, altezza: 297 },
  a5: { larghezza: 148, altezza: 210 },
  letter: { larghezza: 215.9, altezza: 279.4 },
  legal: { larghezza: 215.9, altezza: 355.6 },
}

export const STILE_PREDEFINITO: Stile = {
  formato: { ...FORMATI.a4 },
  corpi: { titolo: 17, sottotitolo: 11, sezione: 12, testo: 9.5, piccolo: 8, banda: 8.5 },
  scala: 1,
  interlinea: 1.9,
  colonne: 'adatta',
  corpoMinimoTabella: 6,
}

/** Una copia dello stile di serie: nessun modello deve poter toccare l'originale. */
export function stilePredefinito (): Stile {
  return {
    formato: { ...STILE_PREDEFINITO.formato },
    corpi: { ...STILE_PREDEFINITO.corpi },
    scala: STILE_PREDEFINITO.scala,
    interlinea: STILE_PREDEFINITO.interlinea,
    colonne: STILE_PREDEFINITO.colonne,
    corpoMinimoTabella: STILE_PREDEFINITO.corpoMinimoTabella,
  }
}

/** Un numero da una riga di modello, se è un numero e sta nei limiti. */
function numero (valore: string, minimo: number, massimo: number): number | null {
  const letto = Number(valore.replace(',', '.'))
  if (!Number.isFinite(letto) || letto < minimo || letto > massimo) return null
  return letto
}

/**
 * Il formato scritto in un modello: un nome, o `larghezza x altezza` in mm.
 *
 * Null se non si capisce, e chi chiama tiene quel che aveva: un refuso nel
 * nome della carta non deve far uscire un rapporto su un foglio di due
 * centimetri.
 */
export function leggiFormato (valore: string): Formato | null {
  const pulito = valore.trim().toLowerCase()
  const noto = FORMATI[pulito.replace(/\s+/g, '')]
  if (noto) return { ...noto }

  const misure = pulito.match(/^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?$/)
  if (!misure) return null
  const larghezza = numero(misure[1], 20, 2000)
  const altezza = numero(misure[2], 20, 2000)
  return larghezza && altezza ? { larghezza, altezza } : null
}

/**
 * Le voci `nome=numero; nome=numero` di una riga `corpo:`.
 *
 * Torna i nomi che ha davvero cambiato: servono all'ereditarietà, che deve
 * distinguere «non l'ho scritto» da «l'ho scritto uguale al predefinito».
 */
function applicaCorpi (corpi: Corpi, valore: string): Array<keyof Corpi> {
  const toccati: Array<keyof Corpi> = []
  for (const campo of leggiCampi(valore)) {
    const nome = campo.etichetta.trim().toLowerCase()
    if (!(nome in corpi)) continue
    // Da due punti a settantadue: sotto non si legge, sopra non è più testo.
    const misura = numero(campo.valore, 2, 72)
    if (misura === null) continue
    corpi[nome as keyof Corpi] = misura
    toccati.push(nome as keyof Corpi)
  }
  return toccati
}

/**
 * Un'impostazione dello stile scritta in un modello.
 *
 * Torna i nomi che ha fissato — vuoto se la riga non la riguarda o non si
 * capisce — e chi chiama li segna fra le `dichiarate`. Una riga storta non
 * cambia niente e non dichiara niente: vale il valore di sotto, che è la
 * regola di tutto il file.
 */
function applicaStile (stile: Stile, chiave: string, valore: string): string[] {
  switch (chiave) {
    case 'formato': {
      const formato = leggiFormato(valore)
      if (formato) stile.formato = formato
      return formato ? ['formato'] : []
    }
    case 'corpo':
      return applicaCorpi(stile.corpi, valore).map((nome) => `corpo.${nome}`)
    case 'scala': {
      const letto = numero(valore, 0.3, 3)
      if (letto === null) return []
      stile.scala = letto
      return ['scala']
    }
    case 'interlinea': {
      const letto = numero(valore, 1, 5)
      if (letto === null) return []
      stile.interlinea = letto
      return ['interlinea']
    }
    case 'colonne': {
      const pulito = valore.trim().toLowerCase()
      if (pulito !== 'adatta' && pulito !== 'uguali') return []
      stile.colonne = pulito
      return ['colonne']
    }
    case 'corpo-minimo-tabella': {
      // Zero è ammesso e vuol dire «non rimpicciolire»: si tronca e basta.
      const letto = numero(valore, 0, 72)
      if (letto === null) return []
      stile.corpoMinimoTabella = letto
      return ['corpo-minimo-tabella']
    }
    default:
      return []
  }
}

const DIRETTIVE: TipoBlocco[] = [
  'titolo',
  'sottotitolo',
  'sezione',
  'paragrafo',
  'testo',
  'campi',
  'riquadro',
  'avviso',
  'elenco',
  'tabella',
  'grafico',
  'galleria',
  'spazio',
  'filo',
  'immagine',
  'pagina-nuova',
  'se',
  'altrimenti',
  'fine',
  'ripeti',
  'usa',
]

/** Divide `chiave: valore` alla prima due punti. Il resto è contenuto, due punti compresi. */
function spezza (riga: string): { chiave: string, valore: string } | null {
  const dove = riga.indexOf(':')
  if (dove < 0) return null
  return { chiave: riga.slice(0, dove).trim().toLowerCase(), valore: riga.slice(dove + 1).trim() }
}

/**
 * Una riga fissa: `sinistra | centro | destra`.
 *
 * Le barre si contano perché il caso normale è averne una sola — «titolo a
 * sinistra, numero di pagina a destra» — e obbligare a scrivere due barre per
 * dire che il centro è vuoto sarebbe una tassa su ogni intestazione.
 */
export function rigaFissa (testo: string): RigaFissa {
  const pezzi = testo.split('|').map((p) => p.trim())
  if (pezzi.length >= 3) return { sinistra: pezzi[0], centro: pezzi[1], destra: pezzi.slice(2).join(' ') }
  if (pezzi.length === 2) return { sinistra: pezzi[0], centro: '', destra: pezzi[1] }
  return { sinistra: pezzi[0] ?? '', centro: '', destra: '' }
}

/**
 * Una cella di banda scritta fra `**`: si stampa in grassetto.
 *
 * Marca la cella intera e non pezzi di frase: in testata una cella è già una
 * cosa sola — il nome del documento, la sede — e un grassetto a metà parola
 * costringerebbe a misurare la riga a spezzoni per guadagnare un caso che in
 * un'intestazione non si presenta.
 *
 * Gli asterischi non si scrivono in una testata per altri motivi, e una cella
 * che ne ha uno solo, o li ha in mezzo, resta il testo che è: chi sbaglia la
 * marcatura vede il suo testo, non una riga sparita.
 */
export function cellaFissa (testo: string): { testo: string, grassetto: boolean } {
  const marcata = testo.trim().match(/^\*\*([^*]*)\*\*$/)
  return marcata ? { testo: marcata[1].trim(), grassetto: true } : { testo, grassetto: false }
}

/**
 * I file immagine che un modello può nominare.
 *
 * Un nome secco — `logo.png` — è un'immagine di `templates/`, che sta accanto
 * ai modelli perché è impaginazione. Un percorso con delle barre —
 * `documentazione/DIC4a/foto/Rossi Mario.jpg` — è un file della cartella
 * dell'anno, ed è così che una foto arriva in un rapporto: il segnaposto
 * `{{foto}}` diventa il percorso salvato nell'anagrafica, e questa riga lo
 * lascia passare.
 *
 * Le risalite si fermano qui e di nuovo in chi apre il file: il valore viene da
 * un file di testo che si modifica a mano e da un JSON che si può correggere a
 * mano, e da quelle due cartelle non si deve uscire. Chi legge un percorso non
 * si fida mai di chi glielo passa.
 */
function immagineAmmessa (nome: string): boolean {
  if (!/\.(png|jpe?g)$/i.test(nome)) return false
  const pezzi = nome.split('/')
  return (
    pezzi.length <= 6 &&
    pezzi.every((pezzo) => pezzo !== '' && pezzo !== '.' && pezzo !== '..' && !/[\:*?"<>|]/.test(pezzo))
  )
}

/**
 * Un'immagine dichiarata da un modello: `logo.png | altezza 14 | destra`.
 *
 * Solo un nome di file, senza cartelle: il valore viene da un file di testo che
 * si modifica a mano, e da `templates/` non si deve uscire. Null se non si
 * capisce, e la riga sparisce come ogni altra riga storta — un rapporto senza
 * logo esce, uno che non esce non serve a niente.
 */
export function leggiImmagine (valore: string): ImmagineModello | null {
  const pezzi = valore.split('|').map((p) => p.trim()).filter(Boolean)
  const file = pezzi[0] ?? ''
  if (!immagineAmmessa(file)) return null

  const immagine: ImmagineModello = { file, altezza: 12, allineamento: 'sinistra' }
  for (const pezzo of pezzi.slice(1)) {
    const misura = pezzo.match(/^altezza\s+(\d+(?:[.,]\d+)?)$/i)
    if (misura) {
      const alta = numero(misura[1], 2, 200)
      if (alta !== null) immagine.altezza = alta
      continue
    }
    const dove = pezzo.toLowerCase()
    if (dove === 'sinistra' || dove === 'centro' || dove === 'destra') immagine.allineamento = dove
    else if (dove === 'accanto') immagine.accanto = true
  }
  return immagine
}

/**
 * Legge un modello.
 *
 * Quel che non si capisce si salta in silenzio, e questo è voluto: un file di
 * testo che qualcuno modifica a mano avrà righe storte, e un rapporto che non
 * esce perché una riga aveva un refuso è peggio di un rapporto senza quella
 * riga. Le sezioni sono `[intestazione]`, `[piede]`, `[corpo]`; prima della
 * prima parentesi stanno le impostazioni del foglio.
 */
export function leggiModello (nome: string, sorgente: string): Modello {
  const modello: Modello = {
    nome,
    titolo: nome,
    orientamento: 'verticale',
    margini: { ...MARGINI_PREDEFINITI },
    estende: null,
    intestazione: [],
    piede: [],
    intestazioneImmagini: [],
    piedeImmagini: [],
    corpo: [],
    stile: stilePredefinito(),
    dichiarate: [],
  }

  const dichiara = (chiave: string) => {
    if (!modello.dichiarate.includes(chiave)) modello.dichiarate.push(chiave)
  }

  let dove: 'testa' | 'intestazione' | 'piede' | 'corpo' | 'stile' = 'testa'

  for (const grezza of sorgente.split(/\r?\n/)) {
    const riga = grezza.trim()
    // Il cancelletto è un commento solo a inizio riga: dentro un contenuto è
    // un carattere come un altro, e nessuno deve andarlo a scappare.
    if (riga === '' || riga.startsWith('#')) continue

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      if (quale === 'intestazione' || quale === 'piede' || quale === 'corpo' || quale === 'stile') {
        dove = quale
      }
      continue
    }

    const voce = spezza(riga)
    if (!voce) continue

    // Le misure del foglio si scrivono in testa o dentro `[stile]`, come si
    // preferisce: `_stile.tpl` le raccoglie sotto la sua parentesi perché sono
    // tutto quel che contiene, un modello normale ne ritocca una in testa
    // accanto al titolo senza aprire una sezione per una riga sola.
    if (dove === 'testa' || dove === 'stile') {
      const fissate = applicaStile(modello.stile, voce.chiave, voce.valore)
      if (fissate.length > 0) {
        for (const chiave of fissate) dichiara(chiave)
        continue
      }
    }

    if (dove === 'testa' || dove === 'stile') {
      if (voce.chiave === 'titolo') {
        modello.titolo = voce.valore
        dichiara('titolo')
      } else if (voce.chiave === 'estende') {
        modello.estende = voce.valore || null
      } else if (voce.chiave === 'orientamento') {
        modello.orientamento = voce.valore.startsWith('oriz') ? 'orizzontale' : 'verticale'
        dichiara('orientamento')
      } else if (voce.chiave === 'margini') {
        const numeri = voce.valore.split(/\s+/).map((n) => Number(n)).filter((n) => Number.isFinite(n))
        if (numeri.length === 4) {
          modello.margini = { alto: numeri[0], destra: numeri[1], basso: numeri[2], sinistra: numeri[3] }
          dichiara('margini')
        }
      }
      continue
    }

    if (dove === 'intestazione' || dove === 'piede') {
      if (voce.chiave === 'immagine') {
        const immagine = leggiImmagine(voce.valore)
        if (immagine) {
          modello[dove === 'intestazione' ? 'intestazioneImmagini' : 'piedeImmagini'].push(immagine)
        }
        continue
      }
      if (voce.chiave !== 'riga') continue
      modello[dove].push(rigaFissa(voce.valore))
      continue
    }

    if (DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      modello.corpo.push({ tipo: voce.chiave as TipoBlocco, valore: voce.valore })
    }
  }

  return modello
}

/**
 * Un modello posato su quello che estende.
 *
 * Il figlio vince su tutto quel che ha scritto davvero — è a questo che serve
 * `dichiarate` — e per il resto prende quel che trova sotto. Prima margini e
 * orientamento si tenevano comunque quelli del figlio, cioè i predefiniti che
 * nessuno aveva scelto: `_base.tpl` poteva dichiararli e non li leggeva
 * nessuno. Adesso lo strato comune serve davvero a qualcosa, ed è quel che
 * permette a `_stile.tpl` di stare sotto tutti.
 */
export function conBase (modello: Modello, base: Modello | null): Modello {
  if (!base) return modello
  const suo = (chiave: string) => modello.dichiarate.includes(chiave)
  // La banda si eredita tutta insieme, righe e immagini: un modello che
  // dichiara una testata sua la vuole sua per intero, e prendersi il logo della
  // base sotto una riga diversa sarebbe un accostamento che nessuno ha scelto.
  const suaIntestazione = modello.intestazione.length > 0 || modello.intestazioneImmagini.length > 0
  const suoPiede = modello.piede.length > 0 || modello.piedeImmagini.length > 0
  return {
    ...modello,
    intestazione: suaIntestazione ? modello.intestazione : base.intestazione,
    piede: suoPiede ? modello.piede : base.piede,
    intestazioneImmagini: suaIntestazione ? modello.intestazioneImmagini : base.intestazioneImmagini,
    piedeImmagini: suoPiede ? modello.piedeImmagini : base.piedeImmagini,
    margini: suo('margini') ? modello.margini : base.margini,
    orientamento: suo('orientamento') ? modello.orientamento : base.orientamento,
    stile: {
      formato: suo('formato') ? modello.stile.formato : base.stile.formato,
      // I corpi si fondono voce per voce: chi ritocca il solo `titolo` non deve
      // riscrivere anche gli altri quattro per non perderli.
      corpi: fondiCorpi(base.stile.corpi, modello),
      scala: suo('scala') ? modello.stile.scala : base.stile.scala,
      interlinea: suo('interlinea') ? modello.stile.interlinea : base.stile.interlinea,
      colonne: suo('colonne') ? modello.stile.colonne : base.stile.colonne,
      corpoMinimoTabella: suo('corpo-minimo-tabella')
        ? modello.stile.corpoMinimoTabella
        : base.stile.corpoMinimoTabella,
    },
    // Quel che il figlio ha dichiarato resta dichiarato risalendo la catena, e
    // con lui quel che ha ereditato: così `_stile` arriva fino in cima anche
    // quando in mezzo c'è `_base` che non ha ridichiarato niente.
    dichiarate: [...new Set([...base.dichiarate, ...modello.dichiarate])],
  }
}

/** I corpi di sotto, con sopra i soli che questo modello ha scritto davvero. */
function fondiCorpi (sotto: Corpi, modello: Modello): Corpi {
  const esito = { ...sotto }
  for (const nome of Object.keys(esito) as Array<keyof Corpi>) {
    if (modello.dichiarate.includes(`corpo.${nome}`)) esito[nome] = modello.stile.corpi[nome]
  }
  return esito
}

/**
 * Sostituisce i segnaposto `{{nome}}`.
 *
 * Un nome che nessuno ha riempito diventa stringa vuota e non `{{nome}}`: un
 * rapporto stampato con le graffe dentro è un rapporto che non si consegna, e
 * il campo che manca quasi sempre manca perché non c'era niente da scriverci.
 *
 * `{{frase.nome}}` pesca da `_testi.tpl` invece che dai dati, e quel che ne
 * esce può contenere altri segnaposto: si risolvono subito, in un giro solo.
 * Un giro e non fino a che non ne restano — una frase che ne cita un'altra che
 * cita la prima girerebbe per sempre, e non c'è niente che una frase di
 * rapporto debba dire e non possa dire in un livello.
 */
export function riempi (
  testo: string,
  valori: Record<string, string>,
  frasi: Record<string, string> = {},
): string {
  return testo.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, nome: string) => {
    if (!nome.startsWith(PREFISSO_FRASE)) return valori[nome] ?? ''
    const frase = frasi[nome.slice(PREFISSO_FRASE.length)]
    return frase === undefined
      ? ''
      : frase.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (__, dentro: string) => valori[dentro] ?? '')
  })
}

const PREFISSO_FRASE = 'frase.'

/** Vero se una riga conteneva solo segnaposto, e nessuno di quelli è stato riempito. */
function restaVuota (originale: string, riempita: string): boolean {
  if (riempita.trim() !== '') return false
  return originale.includes('{{')
}

/** I blocchi che non si disegnano: comandano il resto, e non sono contenuto. */
const COMANDI = new Set<TipoBlocco>(['se', 'altrimenti', 'fine', 'ripeti', 'usa'])

/** I blocchi che si disegnano ma non contano come contenuto di una sezione. */
const SEPARATORI = new Set<TipoBlocco>(['spazio', 'filo', 'pagina-nuova'])

/**
 * I blocchi che chiudono quel che una sezione ha sotto di sé.
 *
 * Non solo un'altra sezione: anche un titolo o un sottotitolo, che aprono un
 * pezzo nuovo del foglio. Con il solo confine della sezione, dentro un
 * `ripeti:` l'«Annotazioni» vuoto dell'allievo senza annotazioni si teneva per
 * buono il titolo dell'allievo dopo, e restava stampato sopra il nulla —
 * proprio la cosa che la potatura esiste per evitare.
 */
const CONFINI = new Set<TipoBlocco>(['sezione', 'titolo', 'sottotitolo'])

/** I dati di un giro di `ripeti:`, posati su quelli del rapporto. */
function conVoce (dati: DatiRapporto, voce: VoceRipetuta): DatiRapporto {
  return {
    valori: { ...dati.valori, ...voce.valori },
    elenchi: { ...dati.elenchi, ...voce.elenchi },
    tabelle: { ...dati.tabelle, ...voce.tabelle },
    grafici: { ...dati.grafici, ...voce.grafici },
    // Quel che non appartiene al giro passa di peso: gruppi, frasi, blocchi e
    // nomi delle colonne sono del rapporto intero. Dimenticandone uno, dentro
    // un `ripeti:` smetteva di funzionare — un `usa:` non trovava più i suoi
    // blocchi e spariva in silenzio.
    gruppi: dati.gruppi,
    frasi: dati.frasi,
    colonne: dati.colonne,
    blocchi: dati.blocchi,
  }
}

/**
 * Dove finisce un blocco aperto da `se:` o `ripeti:`, e dove ha l'`altrimenti:`.
 *
 * I `se:` dentro i `se:` si contano, o il primo `fine:` di quello interno
 * chiuderebbe quello esterno. Un blocco lasciato aperto — capita, si scrive a
 * mano — arriva fino in fondo al corpo invece di far cadere il rapporto.
 */
function chiusura (blocchi: Blocco[], apre: number): { altrimenti: number, fine: number } {
  let profondita = 0
  let altrimenti = -1
  for (let i = apre + 1; i < blocchi.length; i += 1) {
    const tipo = blocchi[i].tipo
    if (tipo === 'se' || tipo === 'ripeti') profondita += 1
    else if (tipo === 'fine') {
      if (profondita === 0) return { altrimenti, fine: i }
      profondita -= 1
    } else if (tipo === 'altrimenti' && profondita === 0 && altrimenti < 0) {
      altrimenti = i
    }
  }
  return { altrimenti, fine: blocchi.length }
}

/**
 * Se un `se:` è vero.
 *
 * Vero vuol dire «c'è qualcosa da mostrare»: un valore non vuoto, una tabella
 * con delle righe, un elenco con dei punti, un gruppo con delle voci. Sono le
 * quattro cose che un modello può nominare, e chiedere «c'è?» di una tabella
 * guardando solo i valori avrebbe risposto sempre di no.
 */
function verita (espressione: string, dati: DatiRapporto): boolean {
  if (riempi(espressione, dati.valori, dati.frasi).trim() !== '') return true

  const solo = espressione.trim().match(/^\{\{\s*([\w.-]+)\s*\}\}$/)
  if (!solo) return false
  const nome = solo[1]
  return (
    (dati.tabelle[nome]?.righe.length ?? 0) > 0 ||
    (dati.elenchi[nome]?.length ?? 0) > 0 ||
    (dati.gallerie?.[nome]?.celle.length ?? 0) > 0 ||
    (dati.gruppi?.[nome]?.length ?? 0) > 0
  )
}

/**
 * Un blocco con i suoi dati dentro, o niente se non ha niente da dire.
 *
 * I dati si attaccano al blocco invece di restare nel sacco comune perché
 * dentro un `ripeti:` il nome non basta più: la stessa riga `tabella: prove`
 * vale una tabella diversa a ogni giro, e chi disegna arriva a giro finito.
 */
function risolvi (blocco: Blocco, dati: DatiRapporto): Blocco | null {
  if (SEPARATORI.has(blocco.tipo)) return blocco

  if (blocco.tipo === 'elenco') {
    const voci = dati.elenchi[blocco.valore] ?? []
    return voci.length > 0 ? { ...blocco, elenco: voci } : null
  }
  if (blocco.tipo === 'tabella') {
    const richiesta = leggiRichiestaTabella(blocco.valore)
    const trovata = dati.tabelle[richiesta.nome]
    if (!trovata || trovata.righe.length === 0) return null
    // Prima si sceglie, poi si ribattezza: la scelta nomina le colonne com'erano
    // di serie, così cambiare come si chiamano non rompe i modelli.
    const tabella = rinominaColonne(
      scegliColonne(trovata, richiesta.scelta),
      dati.colonne ?? {},
      richiesta.nome,
    )
    return { ...blocco, valore: richiesta.nome, tabella }
  }
  if (blocco.tipo === 'galleria') {
    // Una parete senza nessuno non è una parete vuota: è una classe di cui
    // nessuno ha ancora messo una faccia, e una griglia di caselle grigie non
    // dice niente che il nome della classe non dicesse già.
    const galleria = dati.gallerie?.[leggiRichiestaGalleria(blocco.valore).nome]
    return galleria && galleria.celle.length > 0 ? { ...blocco, galleria } : null
  }
  if (blocco.tipo === 'grafico') {
    // Un grafico senza punti non è un grafico vuoto: è una prova che nessuno
    // ha ancora fatto, e disegnare un asse spoglio sarebbe un modo elaborato
    // di dire «non c'è niente».
    const grafico = dati.grafici[blocco.valore]
    const pieno = grafico?.punti.some((punto) => punto.quanti > 0) ?? false
    return pieno && grafico ? { ...blocco, grafico } : null
  }

  const testo = riempi(blocco.valore, dati.valori, dati.frasi)
  if (restaVuota(blocco.valore, testo)) return null
  return { tipo: blocco.tipo, valore: testo }
}

/**
 * Percorre il corpo eseguendo i comandi e risolvendo il resto.
 *
 * `dentro` sono i blocchi di `_blocchi.tpl` che si stanno già espandendo: un
 * blocco che richiama sé stesso, o due che si richiamano a vicenda, girerebbero
 * per sempre. Si smette al secondo giro sullo stesso nome, e quel che si è già
 * messo insieme resta: un rapporto un po' spoglio è meglio di un rapporto che
 * non esce.
 */
function espandi (
  blocchi: Blocco[],
  dati: DatiRapporto,
  giri: number,
  dentro: ReadonlySet<string> = new Set(),
): Blocco[] {
  const esito: Blocco[] = []
  let i = 0

  while (i < blocchi.length) {
    const blocco = blocchi[i]

    if (blocco.tipo === 'usa') {
      const richiesta = leggiRichiestaBlocco(blocco.valore)
      const pezzo = dati.blocchi?.[richiesta.nome]
      if (pezzo && !dentro.has(richiesta.nome)) {
        // I parametri valgono solo qui dentro e coprono i valori del rapporto:
        // è quel che permette allo stesso blocco di servire due fogli quasi
        // uguali senza spaccarsi in due blocchi quasi uguali.
        //
        // Si riempiono adesso, prima di entrare: un parametro è quasi sempre
        // scritto con i segnaposto del rapporto — `titolo={{titolo}} —
        // {{classe}}` — e passandolo com'è il blocco stamperebbe le graffe.
        const passati: Record<string, string> = {}
        for (const [chiave, valore] of Object.entries(richiesta.parametri)) {
          const scritto = riempi(valore, dati.valori, dati.frasi)
          // Un parametro che si riduce a niente non copre il valore di sotto:
          // «passalo vuoto» e «non passarlo» sono la stessa intenzione.
          if (scritto.trim() !== '') passati[chiave] = scritto
        }
        const con = Object.keys(passati).length > 0
          ? { ...dati, valori: { ...dati.valori, ...passati } }
          : dati
        esito.push(...espandi(pezzo, con, giri, new Set([...dentro, richiesta.nome])))
      }
      i += 1
      continue
    }

    if (blocco.tipo === 'se') {
      const { altrimenti, fine } = chiusura(blocchi, i)
      const vero = verita(blocco.valore, dati)
      const da = vero ? i + 1 : altrimenti >= 0 ? altrimenti + 1 : fine
      const a = vero && altrimenti >= 0 ? altrimenti : fine
      esito.push(...espandi(blocchi.slice(da, a), dati, giri, dentro))
      i = fine + 1
      continue
    }

    if (blocco.tipo === 'ripeti') {
      const { fine } = chiusura(blocchi, i)
      const corpo = blocchi.slice(i + 1, fine)
      // Un `ripeti:` dentro l'altro è legittimo; una catena senza fondo no.
      // Il limite non si raggiunge scrivendo un modello, solo sbagliandolo.
      if (giri < GIRI_MASSIMI) {
        for (const voce of dati.gruppi?.[blocco.valore] ?? []) {
          esito.push(...espandi(corpo, conVoce(dati, voce), giri + 1, dentro))
        }
      }
      i = fine + 1
      continue
    }

    // Un `altrimenti:` o un `fine:` senza il suo `se:`: si salta, come ogni
    // riga che non si capisce.
    if (COMANDI.has(blocco.tipo)) {
      i += 1
      continue
    }

    const risolto = risolvi(blocco, dati)
    if (risolto) esito.push(risolto)
    i += 1
  }

  return esito
}

const GIRI_MASSIMI = 4

/**
 * Il corpo con i dati dentro, e senza quel che non ha niente da dire.
 *
 * Le sezioni vuote spariscono: un modello elenca tutto quel che un rapporto
 * *può* contenere — osservazioni, consegne, consuntivo — e in una lezione
 * normale metà non c'è. Stampare «Osservazioni» seguito dal nulla fa sembrare
 * il documento tagliato, e chi legge si chiede che cosa manchi.
 *
 * Prima si esegue quel che il modello comanda — `se:`, `ripeti:` — e poi si
 * pota, non il contrario: una sezione dentro un `se:` falso non c'è affatto, e
 * una dentro un `ripeti:` va guardata una volta per giro, perché l'allievo
 * senza annotazioni e quello che ne ha dieci stanno nello stesso modello.
 */
export function componiCorpo (modello: Modello, dati: DatiRapporto): Blocco[] {
  const risolti = espandi(modello.corpo, dati, 0)

  // Una sezione senza niente sotto se ne va con quel che non c'è. Il conto si
  // fa guardando avanti fino alla sezione dopo: quel che sta in mezzo è suo.
  const esito: Blocco[] = []
  for (let i = 0; i < risolti.length; i += 1) {
    const blocco = risolti[i]
    if (blocco.tipo === 'sezione') {
      let pieno = false
      for (let j = i + 1; j < risolti.length; j += 1) {
        if (CONFINI.has(risolti[j].tipo)) break
        if (!SEPARATORI.has(risolti[j].tipo)) {
          pieno = true
          break
        }
      }
      if (!pieno) continue
    }
    esito.push(blocco)
  }

  // Fili e spazi rimasti in coda non separano più niente: via. Il salto pagina
  // resta, perché una pagina bianca in fondo la si è chiesta apposta — è così
  // che un rapporto per allievo finisce con l'ultimo foglio staccabile.
  while (esito.length > 0) {
    const ultimo = esito[esito.length - 1].tipo
    if (ultimo !== 'spazio' && ultimo !== 'filo') break
    esito.pop()
  }
  return esito
}

/**
 * I pezzi di corpo riusabili: `_blocchi.tpl`.
 *
 * Un rapporto ne richiama uno con `usa: nome`, e quel che c'è dentro prende il
 * posto della riga. Serve a quel che si scriveva uguale in più modelli — la
 * riga dei campi in cima a un foglio di corso, la legenda delle sigle
 * dell'appello — e che finora si copiava: due copie della stessa cosa sono due
 * occasioni di dire cose diverse, e la seconda si dimentica sempre.
 *
 * Un blocco può prendere dei parametri, `usa: intestazione | titolo=Presenze`:
 * valgono solo dentro di lui e coprono i valori del rapporto. Senza, un blocco
 * che serve a due rapporti quasi uguali si spacca in due blocchi quasi uguali,
 * e si torna al punto di partenza.
 */
export type Blocchi = Record<string, Blocco[]>

/**
 * Legge `_blocchi.tpl`.
 *
 * Le sezioni sono `[blocco: nome]`, e dentro si scrivono le direttive del corpo
 * come in un modello qualsiasi — `se:` e `ripeti:` compresi. Quel che sta prima
 * della prima sezione si salta: un blocco senza nome non lo può chiamare
 * nessuno.
 */
export function leggiBlocchi (sorgente: string): Blocchi {
  const blocchi: Blocchi = {}
  let corrente: Blocco[] | null = null

  for (const grezza of sorgente.split(/\r?\n/)) {
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) continue

    const sezione = riga.match(/^\[\s*blocco\s*:\s*(.+?)\s*\]$/i)
    if (sezione) {
      corrente = []
      blocchi[sezione[1]] = corrente
      continue
    }
    // Una parentesi che non è un blocco chiude quello aperto invece di
    // continuarlo: `[frasi]` finito qui per sbaglio non deve diventare
    // contenuto del blocco di sopra.
    if (/^\[.+\]$/.test(riga)) {
      corrente = null
      continue
    }

    if (!corrente) continue
    const voce = spezza(riga)
    if (voce && DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      corrente.push({ tipo: voce.chiave as TipoBlocco, valore: voce.valore })
    }
  }

  return blocchi
}

/** Il nome del blocco chiesto da una riga `usa:`, e i suoi parametri. */
export function leggiRichiestaBlocco (valore: string): {
  nome: string
  parametri: Record<string, string>
} {
  const barra = valore.indexOf('|')
  if (barra < 0) return { nome: valore.trim(), parametri: {} }

  const parametri: Record<string, string> = {}
  for (const campo of leggiCampi(valore.slice(barra + 1))) {
    if (campo.etichetta !== '') parametri[campo.etichetta] = campo.valore
  }
  return { nome: valore.slice(0, barra).trim(), parametri }
}

/**
 * Quanto è largo un testo: la sa solo chi ha il font in mano.
 *
 * L'impaginatore la passa, il dominio la chiama. Serve a tenere i conti della
 * larghezza qui — dove si provano senza aprire un PDF — invece che dentro il
 * disegno, dove finora stavano e dove nessuno li ha mai messi alla prova.
 */
export type Misuratore = (testo: string, corpo: number, grassetto: boolean) => number

/**
 * Lo spazio bianco ai due lati del testo dentro una casella, in punti.
 *
 * Va tenuto uguale al `RESPIRO` con cui l'impaginatore scrive dentro le celle:
 * qui si riserva la larghezza, là si scrive dentro quella riservata, e due
 * numeri diversi vogliono dire un testo che tocca il filo o una colonna più
 * larga del necessario.
 */
export const RESPIRO_CELLA = 7

export interface MisureTabella {
  /** La larghezza di ogni colonna, in punti: la somma è la larghezza utile. */
  misure: number[]
  /** Con che corpo scriverla: quello chiesto, o meno se altrimenti non ci sta. */
  corpo: number
  /** Vero se anche così qualche casella andrà troncata: chi disegna lo sa già. */
  stretta: boolean
}

/**
 * Quanto larga ogni colonna di una tabella.
 *
 * Prima erano tutte uguali — o proporzionali ai pesi dichiarati — e non
 * guardavano quel che c'era dentro: la colonna della data prendeva lo stesso
 * spazio di quella dei nomi, e i nomi uscivano «Carvalho Card...». È il difetto
 * che si vede in ogni foglio con più di sei colonne, e non si poteva sistemare
 * senza ricompilare.
 *
 * Adesso ogni colonna chiede quel che le serve. Se ci stanno tutte, l'avanzo si
 * spartisce sui pesi — è lì che il peso serve davvero, a dire chi si allarga
 * quando c'è spazio. Se non ci stanno, prima si prova a scrivere più piccolo,
 * fino a `corpoMinimoTabella`; solo dopo si stringe, e si stringe chi è largo,
 * lasciando intere le colonne corte: togliere due punti alla colonna «UD» la
 * distrugge e non salva niente.
 */
export function misureTabella (
  tabella: Tabella,
  larghezza: number,
  stile: Stile,
  misura: Misuratore,
): MisureTabella {
  const quante = tabella.intestazione.length
  const corpo = stile.corpi.piccolo * stile.scala
  if (quante === 0) return { misure: [], corpo, stretta: false }

  const pesi = tabella.pesi && tabella.pesi.length === quante
    ? tabella.pesi.map((p) => (Number.isFinite(p) && p > 0 ? p : 1))
    : Array<number>(quante).fill(1)

  if (stile.colonne === 'uguali') {
    const somma = pesi.reduce((s, p) => s + p, 0) || 1
    return { misure: pesi.map((p) => (p / somma) * larghezza), corpo, stretta: true }
  }

  // Il testo più largo di ogni colonna, misurato una volta al corpo chiesto: da
  // lì in giù la larghezza scala con il corpo, e non serve rimisurare a ogni
  // tentativo.
  const testi = tabella.intestazione.map((cella, i) => {
    let piu = misura(cella ?? '', corpo, true)
    for (const riga of tabella.righe) piu = Math.max(piu, misura(riga[i] ?? '', corpo, false))
    // Il totale è scritto in grassetto, e in grassetto è più largo: misurarlo
    // come le altre righe farebbe uscire troncata proprio la riga che
    // riassume.
    if (tabella.totale) piu = Math.max(piu, misura(tabella.totale[i] ?? '', corpo, true))
    return piu
  })

  const respiro = RESPIRO_CELLA * quante
  const perTesto = larghezza - respiro
  const sommaTesti = testi.reduce((s, t) => s + t, 0)

  // Se non ci sta, si scrive più piccolo prima di troncare: la larghezza di una
  // scritta è proporzionale al corpo, quindi il corpo che basta si calcola,
  // non si cerca a tentativi.
  let corpoUsato = corpo
  if (sommaTesti > perTesto && perTesto > 0 && sommaTesti > 0 && stile.corpoMinimoTabella > 0) {
    const servito = corpo * (perTesto / sommaTesti)
    corpoUsato = Math.max(stile.corpoMinimoTabella, Math.min(corpo, servito))
  }

  const fattore = corpoUsato / corpo
  const naturali = testi.map((t) => t * fattore + RESPIRO_CELLA)
  const sommaNaturali = naturali.reduce((s, n) => s + n, 0)

  if (sommaNaturali <= larghezza) {
    // Avanza spazio: lo prendono le colonne pesanti. Senza pesi dichiarati se
    // lo spartiscono le larghe, che sono quelle che hanno testo da respirare.
    const avanzo = larghezza - sommaNaturali
    const guida = tabella.pesi && tabella.pesi.length === quante ? pesi : naturali
    const somma = guida.reduce((s, g) => s + g, 0) || 1
    return {
      misure: naturali.map((n, i) => n + (guida[i] / somma) * avanzo),
      corpo: corpoUsato,
      stretta: false,
    }
  }

  return { misure: stringi(naturali, larghezza), corpo: corpoUsato, stretta: true }
}

/**
 * Toglie il di più alle colonne larghe finché il totale ci sta.
 *
 * A giri: a ogni giro si guarda la parte giusta — il totale diviso quante
 * colonne restano — si lasciano intere quelle che chiedono meno di così, e si
 * ridivide il resto fra le altre. È il modo in cui una colonna di date non
 * viene schiacciata per far posto a una di frasi: quel che si toglie si toglie
 * a chi ne ha, e chi ne ha poco resta leggibile.
 */
function stringi (naturali: number[], larghezza: number): number[] {
  const esito = [...naturali]
  const fisse = new Set<number>()
  const minima = RESPIRO_CELLA + 6

  for (let giro = 0; giro < naturali.length; giro += 1) {
    const spesa = [...fisse].reduce((s, i) => s + esito[i], 0)
    const restanti = naturali.map((_, i) => i).filter((i) => !fisse.has(i))
    if (restanti.length === 0) break

    const parte = Math.max(minima, (larghezza - spesa) / restanti.length)
    const piccole = restanti.filter((i) => naturali[i] <= parte)
    if (piccole.length === 0) {
      for (const i of restanti) esito[i] = parte
      break
    }
    for (const i of piccole) {
      esito[i] = naturali[i]
      fisse.add(i)
    }
  }

  // L'ultimo arrotondamento va sulla colonna più larga: la somma deve fare
  // esattamente la larghezza utile, o i fili verticali non chiudono la griglia.
  const somma = esito.reduce((s, m) => s + m, 0)
  if (somma !== larghezza && esito.length > 0) {
    let piuLarga = 0
    for (let i = 1; i < esito.length; i += 1) if (esito[i] > esito[piuLarga]) piuLarga = i
    esito[piuLarga] += larghezza - somma
  }
  return esito
}

/**
 * Le parole comuni a tutti i rapporti: `_testi.tpl`.
 *
 * Stavano dentro `datiRapporti.ts`, mescolate ai conti che le producono. Ma una
 * frase e un conto si cambiano per motivi diversi e da persone diverse: «dillo
 * in un altro modo» non è «contalo in un altro modo», e la prima non deve
 * costare una ricompilazione. Qui ci sono le due cose che il modello non poteva
 * toccare — le frasi che contengono un numero, e come si chiamano le colonne
 * delle tabelle.
 */
export interface Testi {
  /** Le frasi, per nome: `{{frase.nome}}` le pesca da qui. */
  frasi: Record<string, string>
  /**
   * Come si chiamano le colonne: dal nome di serie a quello che si vuole.
   *
   * Per nome e non per posizione, perché le colonne di una griglia non sono
   * sempre le stesse — una per unità didattica, una per prova — e la terza
   * colonna di due classi diverse non è la stessa cosa. Il nome invece regge.
   */
  colonne: Record<string, string>
}

export function testiVuoti (): Testi {
  return { frasi: {}, colonne: {} }
}

/**
 * Legge `_testi.tpl`.
 *
 * Stesse regole di un modello: `chiave: valore`, il cancelletto commenta, quel
 * che non si capisce si salta. Le sezioni sono `[frasi]` e `[colonne]`.
 */
export function leggiTesti (sorgente: string): Testi {
  const testi = testiVuoti()
  let dove: 'frasi' | 'colonne' | null = null

  for (const grezza of sorgente.split(/\r?\n/)) {
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) continue

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      dove = quale === 'frasi' || quale === 'colonne' ? quale : null
      continue
    }

    if (!dove) continue
    // Si divide a mano invece di usare `spezza`: quella abbassa le maiuscole
    // della chiave, e qui la chiave è il nome di una colonna — «Allievo» — da
    // confrontare con quello che la tabella porta scritto.
    const duePunti = riga.indexOf(':')
    if (duePunti <= 0) continue
    testi[dove][riga.slice(0, duePunti).trim()] = riga.slice(duePunti + 1).trim()
  }

  return testi
}

/**
 * Una tabella con le sole colonne chieste, in quell'ordine.
 *
 * Le colonne si nominano com'erano di serie, non come `_testi.tpl` le
 * ribattezza: se ne cambia il nome e la scelta smettesse di funzionare, il
 * legame fra i due file sarebbe una trappola. Un `*` sta per «tutte le altre,
 * nell'ordine loro» — è come si tiene una colonna per prova senza sapere
 * quante prove ci saranno.
 *
 * Un nome che la tabella non ha si salta: una colonna in meno è meglio di una
 * colonna vuota, e di un rapporto che non esce.
 */
export function scegliColonne (tabella: Tabella, scelta: string[]): Tabella {
  if (scelta.length === 0) return tabella

  const nominate = new Set(
    scelta.filter((n) => n !== '*').map((n) => tabella.intestazione.indexOf(n)).filter((i) => i >= 0),
  )
  const indici: number[] = []
  for (const nome of scelta) {
    if (nome === '*') {
      for (let i = 0; i < tabella.intestazione.length; i += 1) {
        if (!nominate.has(i)) indici.push(i)
      }
      continue
    }
    const dove = tabella.intestazione.indexOf(nome)
    if (dove >= 0) indici.push(dove)
  }
  if (indici.length === 0) return tabella

  const pesi = tabella.pesi
  const scelta2: Tabella = {
    intestazione: indici.map((i) => tabella.intestazione[i]),
    righe: tabella.righe.map((riga) => indici.map((i) => riga[i] ?? '')),
  }
  if (pesi && pesi.length === tabella.intestazione.length) scelta2.pesi = indici.map((i) => pesi[i])
  // Il totale segue le colonne scelte: restare quello di prima vorrebbe dire
  // dei numeri sotto le colonne sbagliate, che è peggio che non averli.
  if (tabella.totale) scelta2.totale = indici.map((i) => tabella.totale?.[i] ?? '')
  return scelta2
}

/**
 * La stessa tabella con le colonne chiamate come dice `_testi.tpl`.
 *
 * `Allievo: Nome e cognome` vale in tutte le tabelle di tutti i rapporti: la
 * stessa colonna deve chiamarsi allo stesso modo dappertutto, per lo stesso
 * motivo per cui la testata sta in un file solo. Dove serve un'eccezione — una
 * tabella in cui quella parola vuol dire un'altra cosa — si scrive il nome
 * della tabella davanti, `presenze.Allievo:`, e vince su quella generale.
 */
export function rinominaColonne (
  tabella: Tabella,
  nomi: Record<string, string>,
  quale = '',
): Tabella {
  if (Object.keys(nomi).length === 0) return tabella
  const nome = (cella: string) => nomi[`${quale}.${cella}`] ?? nomi[cella] ?? cella
  if (!tabella.intestazione.some((cella) => nome(cella) !== cella)) return tabella
  return { ...tabella, intestazione: tabella.intestazione.map(nome) }
}

/**
 * Il nome della tabella e le colonne che il modello ha chiesto.
 *
 * `tabella: presenze` le vuole tutte; `tabella: presenze | Allievo, Presenza`
 * ne vuole due, in quell'ordine.
 */
export function leggiRichiestaTabella (valore: string): { nome: string, scelta: string[] } {
  const barra = valore.indexOf('|')
  if (barra < 0) return { nome: valore.trim(), scelta: [] }
  return {
    nome: valore.slice(0, barra).trim(),
    scelta: valore.slice(barra + 1).split(',').map((n) => n.trim()).filter(Boolean),
  }
}

/**
 * Come si vuole la parete: `galleria: allievi | colonne 4 | altezza 30`.
 *
 * Le colonne e non la larghezza della casella: chi scrive un modello sa quante
 * facce vuole per riga, non quanti millimetri restano dopo i margini. L'altezza
 * è quella della foto, in millimetri, come per ogni altra immagine.
 *
 * Fuori dai limiti si torna al valore di serie invece di uscire storti: una
 * riga da venti colonne su un A4 sono venti francobolli, e zero colonne non è
 * una griglia.
 */
export function leggiRichiestaGalleria (
  valore: string,
): { nome: string, colonne: number, altezza: number } {
  const pezzi = valore.split('|').map((p) => p.trim()).filter(Boolean)
  const richiesta = { nome: pezzi[0] ?? '', colonne: 4, altezza: 30 }
  for (const pezzo of pezzi.slice(1)) {
    const quante = pezzo.match(/^colonne\s+(\d+)$/i)
    if (quante) {
      const n = numero(quante[1], 1, 8)
      if (n !== null) richiesta.colonne = Math.round(n)
      continue
    }
    const alta = pezzo.match(/^altezza\s+(\d+(?:[.,]\d+)?)$/i)
    if (alta) {
      const mm = numero(alta[1], 10, 120)
      if (mm !== null) richiesta.altezza = mm
    }
  }
  return richiesta
}

/**
 * Una riga di campi con la sua disposizione: `campi: … | colonne 1`.
 *
 * Due colonne di serie, che è come stanno bene sette conti di presenza. Una
 * sola quando i valori sono lunghi o la larghezza è poca — l'anagrafica
 * accanto al ritratto — perché un indirizzo in mezza colonna esce troncato, e
 * un dato troncato è un dato che non c'è.
 */
export function leggiRichiestaCampi (
  valore: string,
): { voci: Array<{ etichetta: string, valore: string }>, colonne: number } {
  // Si guarda l'ultimo pezzo e solo se dice «colonne N»: un valore può
  // contenere una barra — un orario, un percorso — e non deve sparire perché
  // qualcuno l'ha scritto.
  const barra = valore.lastIndexOf('|')
  const coda = barra >= 0 ? valore.slice(barra + 1).trim().match(/^colonne\s+(\d+)$/i) : null
  const quante = coda ? numero(coda[1], 1, 4) : null
  return {
    voci: leggiCampi(coda ? valore.slice(0, barra) : valore),
    colonne: quante === null ? 2 : Math.round(quante),
  }
}

/** Le coppie `etichetta=valore; etichetta=valore` di una riga `campi:`. */
export function leggiCampi (valore: string): Array<{ etichetta: string, valore: string }> {
  return valore
    .split(';')
    .map((pezzo) => pezzo.trim())
    .filter(Boolean)
    .map((pezzo) => {
      const dove = pezzo.indexOf('=')
      if (dove < 0) return { etichetta: '', valore: pezzo }
      return { etichetta: pezzo.slice(0, dove).trim(), valore: pezzo.slice(dove + 1).trim() }
    })
    // Un campo senza valore non si stampa: «Aula: » non dice niente più di
    // quanto dica non scriverlo.
    .filter((campo) => campo.valore !== '')
}
