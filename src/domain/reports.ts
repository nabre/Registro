// I modelli con cui il registro compone i suoi rapporti (verbale, scheda,
// fascicolo…).
//
// L'impaginazione si dichiara in file di testo dentro `templates/`: che cosa va
// in testata, nel piede e nel corpo; i dati li mette il registro alla stampa.
// Formato a righe, `direttiva: contenuto`, modificabile da chi non programma:
// niente parentesi da chiudere né indentazione che conta, e una riga sbagliata
// rovina solo quella riga.

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
  // I tre che non si disegnano: comandano il resto e spariscono componendo il
  // corpo.
  | 'se'
  | 'altrimenti'
  | 'fine'
  | 'ripeti'
  | 'usa'

export interface Blocco {
  tipo: TipoBlocco
  valore: string
  /**
   * I dati già risolti: dentro un `ripeti:` la stessa `tabella: prove` vale una
   * tabella diversa a ogni giro, e il nome non basta più. Fuori da un `ripeti:`
   * restano vuoti e chi disegna cerca per nome.
   */
  tabella?: Tabella
  elenco?: string[]
  grafico?: Grafico
  galleria?: Galleria
}

/**
 * Un'immagine chiesta da un modello (logo, firma scansionata). Si dichiara
 * l'altezza; la larghezza viene dalle proporzioni del file.
 */
export interface ImmagineModello {
  /** Il nome del file dentro `templates/`. */
  file: string
  /** In millimetri, come si misura su un foglio. */
  altezza: number
  allineamento: 'sinistra' | 'centro' | 'destra'
  /**
   * Se quel che segue va scritto accanto invece che sotto (nel corpo e per le
   * immagini di lato: ritratto e recapiti alla stessa altezza). In testata non
   * conta.
   */
  accanto?: boolean
}

interface Margini {
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

/** I corpi del testo, in punti tipografici: pochi e distanti. */
export interface Corpi {
  titolo: number
  sottotitolo: number
  sezione: number
  testo: number
  piccolo: number
  /**
   * La testata e il piede: misura propria, così stringere una tabella non
   * rimpicciolisce il nome della scuola.
   */
  banda: number
}

/**
 * Le misure con cui il foglio viene disegnato: `_stile.tpl`, un modello che
 * tutti estendono. Si cambia un numero e vale dalla stampa dopo, senza
 * ricompilare.
 */
export interface Stile {
  /** Il foglio, in millimetri. L'orientamento lo gira; qui sta com'è in piedi. */
  formato: Formato
  corpi: Corpi
  /**
   * Moltiplica tutti i corpi insieme: «tutto un po' più grande» senza ritoccare
   * cinque numeri.
   */
  scala: number
  /** L'altezza di una riga di tabella, in multipli del suo corpo. */
  interlinea: number
  /**
   * Come si spartisce la larghezza fra le colonne: `adatta` misura il contenuto,
   * `uguali` segue solo i pesi dichiarati.
   */
  colonne: 'adatta' | 'uguali'
  /**
   * Fin dove il testo di una tabella può rimpicciolire prima di essere
   * troncato. Zero spegne il rimpicciolimento.
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
   * Quali impostazioni questo file ha scritto davvero: per ereditare bene,
   * distinguendo un valore lasciato al predefinito da uno scritto uguale.
   */
  dichiarate: string[]
}

export interface Tabella {
  intestazione: string[]
  /**
   * I nomi di serie (italiani) delle colonne, quando l'intestazione è in
   * un'altra lingua: i modelli scelgono e ribattezzano le colonne con quelli
   * (`tabella: presenze | PiF, % presenza`, `[colonne]`). Assenti se coincidono
   * con l'intestazione.
   */
  chiavi?: string[]
  righe: string[][]
  /** Peso relativo di ogni colonna; se manca, tutte uguali. */
  pesi?: number[]
  /**
   * L'ultima riga, che tira le somme: in grassetto e staccata da un filo più
   * marcato, se no «12» sembra una riga come le altre. Le celle seguono
   * l'intestazione; quelle senza totale restano vuote.
   */
  totale?: string[]
}

/**
 * Una distribuzione da disegnare a punti sopra un asse: un punto per voto al
 * suo valore esatto, impilato se si ripete (una classe ha troppo pochi voti
 * per raggrupparli). Sopra l'asse la riga della media; la sufficienza la dice
 * il colore dei punti. I conti li fa il dominio.
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
 * Una parete di ritratti: una casella per allievo, foto e nome sotto. La foto è
 * un percorso relativo alla cartella dell'anno; chi non ce l'ha tiene la sua
 * casella col nome.
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
 * Un giro di un `ripeti:`: quel che cambia da un allievo all'altro. Stessa
 * forma dei dati del rapporto, così dentro il giro le righe si scrivono come
 * fuori; la composizione cerca prima nel giro, poi nel rapporto.
 */
interface VoceRipetuta {
  valori?: Record<string, string>
  elenchi?: Record<string, string[]>
  tabelle?: Record<string, Tabella>
  grafici?: Record<string, Grafico>
}

/**
 * Quel che il registro mette dentro un modello: valori (dentro una riga),
 * elenchi (punti), tabelle (colonne), separati perché il modello li nomini
 * senza sapere quanto sono lunghi.
 */
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
   * Le frasi comuni, da `_testi.tpl` (`{{frase.nome}}`). A parte dai valori:
   * dicono come, non che cosa, e contengono segnaposto risolti in un secondo
   * giro.
   */
  frasi?: Record<string, string>
  /** Come chiamare le colonne, da `_testi.tpl`. */
  colonne?: Record<string, string>
  /** I pezzi di corpo riusabili, da `_blocchi.tpl`: `usa:` li richiama. */
  blocchi?: Blocchi
}

const MARGINI_PREDEFINITI: Margini = { alto: 20, destra: 18, basso: 18, sinistra: 18 }

/**
 * I formati di carta chiamabili per nome, in millimetri. Per un altro si
 * scrivono le misure (`formato: 210x297`).
 */
export const FORMATI: Record<string, Formato> = {
  a3: { larghezza: 297, altezza: 420 },
  a4: { larghezza: 210, altezza: 297 },
  a5: { larghezza: 148, altezza: 210 },
  letter: { larghezza: 215.9, altezza: 279.4 },
  legal: { larghezza: 215.9, altezza: 355.6 },
}

const STILE_PREDEFINITO: Stile = {
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
 * Null se non si capisce, e chi chiama tiene quel che aveva.
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
 * Le voci `nome=numero; nome=numero` di una riga `corpo:`. Torna i nomi
 * cambiati davvero, per l'ereditarietà.
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
 * Un'impostazione dello stile scritta in un modello. Torna i nomi fissati
 * (vuoto se la riga non la riguarda o non si capisce): una riga storta non
 * cambia né dichiara niente.
 */
function applicaStile (stile: Stile, chiave: string, valore: string): string[] {
  switch (chiave) {
    case 'formato': {
      const formato = leggiFormato(valore)
      if (formato) stile.formato = formato
      return formato ? ['formato'] : []
    }
    case 'corpo':
      // testo-fisso: una chiave interna fra le dichiarate, non si legge
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
      // Zero vuol dire «non rimpicciolire»: si tronca e basta.
      const letto = numero(valore, 0, 72)
      if (letto === null) return []
      stile.corpoMinimoTabella = letto
      return ['corpo-minimo-tabella']
    }
    default:
      return []
  }
}

/**
 * Le direttive che il corpo riconosce; ogni altra riga si salta. Vedi
 * `templateCheck.ts`, che sulla stessa lista avvisa chi scrive un modello.
 */
export const DIRETTIVE: TipoBlocco[] = [
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

/**
 * Una riga fissa: `sinistra | centro | destra`. Con una barra sola il centro è
 * vuoto («titolo | pagina»).
 */
export function rigaFissa (testo: string): RigaFissa {
  const pezzi = testo.split('|').map((p) => p.trim())
  if (pezzi.length >= 3) return { sinistra: pezzi[0], centro: pezzi[1], destra: pezzi.slice(2).join(' ') }
  if (pezzi.length === 2) return { sinistra: pezzi[0], centro: '', destra: pezzi[1] }
  return { sinistra: pezzi[0] ?? '', centro: '', destra: '' }
}

/**
 * Una cella di banda scritta fra `**`: in grassetto, la cella intera. Un
 * asterisco solo o in mezzo resta testo.
 */
export function cellaFissa (testo: string): { testo: string, grassetto: boolean } {
  const marcata = testo.trim().match(/^\*\*([^*]*)\*\*$/)
  return marcata ? { testo: marcata[1].trim(), grassetto: true } : { testo, grassetto: false }
}

/**
 * I file immagine che un modello può nominare: un nome secco è un'immagine di
 * `templates/` (in pratica `logo.png`); un percorso con barre è un file della
 * cartella dell'anno (così `{{foto}}` porta un ritratto nel rapporto).
 *
 * Le risalite si fermano qui, ma questo controllo da solo non basta (una barra
 * rovescia resta dentro un pezzo): le porte vere sono `immaginiDelDocumento` in
 * `actions/reports.ts` (il nome secco vale solo come `logo.png`, passato da
 * `logoAmmesso`) e `fileAllegato` in `data/paths.ts`, che taglia su tutti e due
 * i separatori e butta ogni `..`. Non rilassare quelle due.
 */
function immagineAmmessa (nome: string): boolean {
  if (!/\.(png|jpe?g)$/i.test(nome)) return false
  const pezzi = nome.split('/')
  return (
    pezzi.length <= 6 &&
    pezzi.every((pezzo) => pezzo !== '' && pezzo !== '.' && pezzo !== '..' && !/[:*?"<>|]/.test(pezzo))
  )
}

/**
 * Un'immagine dichiarata da un modello: `logo.png | altezza 14 | destra`. Il
 * file passa da `immagineAmmessa`; dove prenderlo lo decide
 * `immagineDelRapporto` in `actions/reports.ts`. Null se non si capisce: la
 * riga sparisce e il rapporto esce.
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
 * Legge un modello. Quel che non si capisce si salta in silenzio: un refuso
 * non deve impedire la stampa. Sezioni `[intestazione]`, `[piede]`, `[corpo]`;
 * prima della prima parentesi le impostazioni del foglio.
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
    // Il cancelletto commenta solo a inizio riga: dentro un contenuto è un
    // carattere come un altro.
    if (riga === '' || riga.startsWith('#')) continue

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      if (quale === 'intestazione' || quale === 'piede' || quale === 'corpo' || quale === 'stile') {
        dove = quale
      }
      continue
    }

    const voce = chiaveValore(riga)
    if (!voce) continue

    // Le misure del foglio si scrivono in testa o dentro `[stile]`: `_stile.tpl`
    // usa la sezione, un modello normale ne ritocca una in testa.
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
          modello.margini = {
            alto: numeri[0],
            destra: numeri[1],
            basso: numeri[2],
            sinistra: numeri[3],
          }
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
 * Un modello posato su quello che estende: il figlio vince su quel che ha
 * scritto davvero (`dichiarate`), il resto viene da sotto. È così che
 * `_stile.tpl` sta sotto tutti.
 */
export function conBase (modello: Modello, base: Modello | null): Modello {
  if (!base) return modello
  const suo = (chiave: string) => modello.dichiarate.includes(chiave)
  // La banda si eredita intera, righe e immagini: una testata propria non si
  // mescola col logo della base.
  const suaIntestazione = modello.intestazione.length > 0 || modello.intestazioneImmagini.length > 0
  const suoPiede = modello.piede.length > 0 || modello.piedeImmagini.length > 0
  return {
    ...modello,
    intestazione: suaIntestazione ? modello.intestazione : base.intestazione,
    piede: suoPiede ? modello.piede : base.piede,
    intestazioneImmagini: suaIntestazione
      ? modello.intestazioneImmagini
      : base.intestazioneImmagini,
    piedeImmagini: suoPiede ? modello.piedeImmagini : base.piedeImmagini,
    margini: suo('margini') ? modello.margini : base.margini,
    orientamento: suo('orientamento') ? modello.orientamento : base.orientamento,
    stile: {
      formato: suo('formato') ? modello.stile.formato : base.stile.formato,
      // I corpi si fondono voce per voce: ritoccare `titolo` non perde gli altri.
      corpi: fondiCorpi(base.stile.corpi, modello),
      scala: suo('scala') ? modello.stile.scala : base.stile.scala,
      interlinea: suo('interlinea') ? modello.stile.interlinea : base.stile.interlinea,
      colonne: suo('colonne') ? modello.stile.colonne : base.stile.colonne,
      corpoMinimoTabella: suo('corpo-minimo-tabella')
        ? modello.stile.corpoMinimoTabella
        : base.stile.corpoMinimoTabella,
    },
    // Quel che è dichiarato resta dichiarato risalendo la catena: così `_stile`
    // arriva in cima anche attraverso un `_base` che non ridichiara niente.
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
 * Sostituisce i segnaposto `{{nome}}`. Un nome non riempito diventa vuoto, non
 * resta fra graffe. `{{frase.nome}}` pesca da `_testi.tpl`, e i segnaposto che
 * contiene si risolvono subito, in un giro solo (niente cicli fra frasi).
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
 * I blocchi che chiudono quel che una sezione ha sotto: un'altra sezione, un
 * titolo o un sottotitolo. Così in un `ripeti:` un titolo vuoto non si tiene il
 * contenuto del giro dopo.
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
    // nomi delle colonne sono del rapporto (se no `usa:` non troverebbe i
    // suoi blocchi).
    gruppi: dati.gruppi,
    frasi: dati.frasi,
    colonne: dati.colonne,
    blocchi: dati.blocchi,
  }
}

/**
 * Dove finisce un blocco aperto da `se:` o `ripeti:`, e dove ha l'`altrimenti:`.
 * I `se:` annidati si contano. Un blocco lasciato aperto arriva in fondo al
 * corpo invece di far cadere il rapporto.
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
 * Se un `se:` è vero, cioè se c'è qualcosa da mostrare: valore non vuoto,
 * tabella con righe, elenco con punti, gruppo con voci.
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
 * Un blocco con i suoi dati attaccati, o niente se non ha niente da dire: dentro
 * un `ripeti:` il nome non basta più.
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
    // Prima si sceglie, poi si ribattezza: la scelta usa i nomi di serie.
    const tabella = rinominaColonne(
      scegliColonne(trovata, richiesta.scelta),
      dati.colonne ?? {},
      richiesta.nome,
    )
    return { ...blocco, valore: richiesta.nome, tabella }
  }
  if (blocco.tipo === 'galleria') {
    // Una parete senza nessuno non si disegna.
    const galleria = dati.gallerie?.[leggiRichiestaGalleria(blocco.valore).nome]
    return galleria && galleria.celle.length > 0 ? { ...blocco, galleria } : null
  }
  if (blocco.tipo === 'grafico') {
    // Un grafico senza punti non si disegna: la prova non è ancora fatta.
    const grafico = dati.grafici[blocco.valore]
    const pieno = grafico?.punti.some((punto) => punto.quanti > 0) ?? false
    return pieno && grafico ? { ...blocco, grafico } : null
  }

  const testo = riempi(blocco.valore, dati.valori, dati.frasi)
  if (restaVuota(blocco.valore, testo)) return null
  return { tipo: blocco.tipo, valore: testo }
}

/**
 * Percorre il corpo eseguendo i comandi e risolvendo il resto. `dentro` sono i
 * blocchi di `_blocchi.tpl` in espansione: un blocco che richiama sé stesso si
 * ferma al secondo giro, e quel che c'è resta.
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
        // I parametri valgono solo qui dentro e coprono i valori del rapporto.
        // Si riempiono prima di entrare: sono scritti con i segnaposto del
        // rapporto (`titolo={{titolo}} — {{classe}}`).
        const passati: Record<string, string> = {}
        for (const [chiave, valore] of Object.entries(richiesta.parametri)) {
          const scritto = riempi(valore, dati.valori, dati.frasi)
          // Un parametro vuoto non copre il valore di sotto.
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
      // Un `ripeti:` annidato va bene; una catena senza fondo no.
      if (giri < GIRI_MASSIMI) {
        for (const voce of dati.gruppi?.[blocco.valore] ?? []) {
          esito.push(...espandi(corpo, conVoce(dati, voce), giri + 1, dentro))
        }
      }
      i = fine + 1
      continue
    }

    // Un `altrimenti:` o un `fine:` senza il suo `se:` si salta.
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
 * Il corpo con i dati dentro, senza quel che non ha niente da dire: le sezioni
 * vuote spariscono, se no il documento sembra tagliato. Prima si eseguono
 * `se:` e `ripeti:`, poi si pota, una volta per giro.
 */
export function componiCorpo (modello: Modello, dati: DatiRapporto): Blocco[] {
  const risolti = espandi(modello.corpo, dati, 0)

  // Una sezione senza niente sotto se ne va: si guarda fino alla sezione dopo.
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

  // Fili e spazi in coda via; il salto pagina resta, perché l'ultimo foglio di
  // un rapporto per allievo sia staccabile.
  while (esito.length > 0) {
    const ultimo = esito[esito.length - 1].tipo
    if (ultimo !== 'spazio' && ultimo !== 'filo') break
    esito.pop()
  }
  return esito
}

/**
 * I pezzi di corpo riusabili: `_blocchi.tpl`. `usa: nome` mette il contenuto
 * al posto della riga. Un blocco prende parametri (`usa: intestazione |
 * titolo=Presenze`) che valgono solo dentro di lui e coprono i valori del
 * rapporto.
 */
export type Blocchi = Record<string, Blocco[]>

/**
 * Legge `_blocchi.tpl`: sezioni `[blocco: nome]` con dentro le direttive del
 * corpo. Quel che sta prima della prima sezione si salta.
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
    // Una parentesi che non è un blocco chiude quello aperto (un `[frasi]`
    // finito qui non diventa contenuto).
    if (/^\[.+\]$/.test(riga)) {
      corrente = null
      continue
    }

    if (!corrente) continue
    const voce = chiaveValore(riga)
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
 * Quanto è largo un testo: lo sa solo chi ha il font, e l'impaginatore la
 * passa. Così i conti della larghezza stanno qui, dove si provano.
 */
type Misuratore = (testo: string, corpo: number, grassetto: boolean) => number

/**
 * Lo spazio bianco ai due lati del testo in una casella, in punti. Deve essere
 * uguale al `RESPIRO` dell'impaginatore.
 */
export const RESPIRO_CELLA = 7

interface MisureTabella {
  /** La larghezza di ogni colonna, in punti: la somma è la larghezza utile. */
  misure: number[]
  /** Con che corpo scriverla: quello chiesto, o meno se altrimenti non ci sta. */
  corpo: number
  /** Vero se anche così qualche casella andrà troncata: chi disegna lo sa già. */
  stretta: boolean
}

/**
 * Quanto larga ogni colonna di una tabella. Ogni colonna chiede quel che le
 * serve; se avanza spazio si spartisce sui pesi. Se non ci sta, prima si
 * scrive più piccolo (fino a `corpoMinimoTabella`), poi si stringono le
 * colonne larghe lasciando intere le corte.
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

  // Il testo più largo di ogni colonna, misurato una volta: la larghezza
  // scala col corpo.
  const testi = tabella.intestazione.map((cella, i) => {
    let piu = misura(cella ?? '', corpo, true)
    for (const riga of tabella.righe) piu = Math.max(piu, misura(riga[i] ?? '', corpo, false))
    // Il totale è in grassetto, quindi più largo: si misura così.
    if (tabella.totale) piu = Math.max(piu, misura(tabella.totale[i] ?? '', corpo, true))
    return piu
  })

  const respiro = RESPIRO_CELLA * quante
  const perTesto = larghezza - respiro
  const sommaTesti = testi.reduce((s, t) => s + t, 0)

  // Se non ci sta, si scrive più piccolo prima di troncare: la larghezza è
  // proporzionale al corpo, quindi il corpo giusto si calcola.
  let corpoUsato = corpo
  if (sommaTesti > perTesto && perTesto > 0 && sommaTesti > 0 && stile.corpoMinimoTabella > 0) {
    const servito = corpo * (perTesto / sommaTesti)
    corpoUsato = Math.max(stile.corpoMinimoTabella, Math.min(corpo, servito))
  }

  const fattore = corpoUsato / corpo
  const naturali = testi.map((t) => t * fattore + RESPIRO_CELLA)
  const sommaNaturali = naturali.reduce((s, n) => s + n, 0)

  if (sommaNaturali <= larghezza) {
    // Avanza spazio: alle colonne pesanti, o senza pesi alle larghe.
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
 * Toglie il di più alle colonne larghe finché il totale ci sta: a giri, si
 * lasciano intere quelle sotto la parte giusta e si ridivide il resto.
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
  // esattamente la larghezza utile.
  const somma = esito.reduce((s, m) => s + m, 0)
  if (somma !== larghezza && esito.length > 0) {
    let piuLarga = 0
    for (let i = 1; i < esito.length; i += 1) if (esito[i] > esito[piuLarga]) piuLarga = i
    esito[piuLarga] += larghezza - somma
  }
  return esito
}

/**
 * Le parole comuni a tutti i rapporti: `_testi.tpl` e le traduzioni
 * (`_testi-de.tpl`…). Frasi con un numero e nomi delle colonne, modificabili
 * senza ricompilare. Quale file si legge lo decide chi stampa
 * (`data/templates.ts`) dalla lingua.
 */
export interface Testi {
  /** Le frasi, per nome: `{{frase.nome}}` le pesca da qui. */
  frasi: Record<string, string>
  /**
   * Come si chiamano le colonne, dal nome di serie a quello voluto: per nome e
   * non per posizione, perché le colonne cambiano fra tabelle.
   */
  colonne: Record<string, string>
}

export function testiVuoti (): Testi {
  return { frasi: {}, colonne: {} }
}

/**
 * Legge `_testi.tpl`: `chiave: valore`, il cancelletto commenta, quel che non
 * si capisce si salta. Sezioni `[frasi]` e `[colonne]`.
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
    // A mano invece di `spezza`, che abbassa le maiuscole della chiave: qui è
    // il nome di una colonna («Allievo»).
    const duePunti = riga.indexOf(':')
    if (duePunti <= 0) continue
    testi[dove][riga.slice(0, duePunti).trim()] = riga.slice(duePunti + 1).trim()
  }

  return testi
}

/**
 * Una tabella con le sole colonne chieste, in quell'ordine, nominate coi nomi
 * di serie (non quelli ribattezzati). `*` sta per «tutte le altre, nel loro
 * ordine». Un nome che non c'è si salta.
 */
export function scegliColonne (tabella: Tabella, scelta: string[]): Tabella {
  if (scelta.length === 0) return tabella

  // Per nome di serie, in qualunque lingua sia scritta l'intestazione.
  const nomi = nomiDiSerie(tabella)
  const nominate = new Set(
    scelta.filter((n) => n !== '*').map((n) => nomi.indexOf(n)).filter((i) => i >= 0),
  )
  const indici: number[] = []
  for (const nome of scelta) {
    if (nome === '*') {
      for (let i = 0; i < tabella.intestazione.length; i += 1) {
        if (!nominate.has(i)) indici.push(i)
      }
      continue
    }
    const dove = nomi.indexOf(nome)
    if (dove >= 0) indici.push(dove)
  }
  if (indici.length === 0) return tabella

  const pesi = tabella.pesi
  const scelta2: Tabella = {
    intestazione: indici.map((i) => tabella.intestazione[i]),
    righe: tabella.righe.map((riga) => indici.map((i) => riga[i] ?? '')),
  }
  if (tabella.chiavi) scelta2.chiavi = indici.map((i) => nomi[i])
  if (pesi && pesi.length === tabella.intestazione.length) scelta2.pesi = indici.map((i) => pesi[i])
  // Il totale segue le colonne scelte.
  if (tabella.totale) scelta2.totale = indici.map((i) => tabella.totale?.[i] ?? '')
  return scelta2
}

/**
 * La stessa tabella con le colonne chiamate come dice `_testi.tpl`:
 * `Allievo: Nome e cognome` vale ovunque; `presenze.Allievo:` vince per quella
 * tabella.
 */
export function rinominaColonne (
  tabella: Tabella,
  nomi: Record<string, string>,
  quale = '',
): Tabella {
  if (Object.keys(nomi).length === 0) return tabella
  const serie = nomiDiSerie(tabella)
  const nome = (cella: string, i: number) =>
    nomi[`${quale}.${serie[i]}`] ?? nomi[serie[i]] ?? cella
  if (!tabella.intestazione.some((cella, i) => nome(cella, i) !== cella)) return tabella
  return { ...tabella, intestazione: tabella.intestazione.map(nome) }
}

/** I nomi di serie delle colonne: le `chiavi`, se l'intestazione è tradotta. */
export function nomiDiSerie (tabella: Tabella): string[] {
  return tabella.chiavi && tabella.chiavi.length === tabella.intestazione.length
    ? tabella.chiavi
    : tabella.intestazione
}

/**
 * Il nome della tabella e le colonne chieste: `tabella: presenze` le vuole
 * tutte, `tabella: presenze | Allievo, Presenza` due, in quell'ordine.
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
 * Come si vuole la parete: `galleria: allievi | colonne 4 | altezza 30`
 * (quante facce per riga, altezza della foto in mm). Fuori dai limiti si torna
 * al valore di serie.
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
 * Una riga di campi con la sua disposizione: `campi: … | colonne 1`. Due
 * colonne di serie; una per valori lunghi, che in mezza colonna uscirebbero
 * troncati.
 */
export function leggiRichiestaCampi (
  valore: string,
): { voci: Array<{ etichetta: string, valore: string }>, colonne: number } {
  // Si guarda solo l'ultimo pezzo, e solo se dice «colonne N»: un valore può
  // contenere una barra.
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
    // Un campo senza valore non si stampa.
    .filter((campo) => campo.valore !== '')
}

/**
 * Una riga «chiave: valore» di un blocco, o `null` senza i due punti. La
 * chiave si abbassa di caso (si confronta), il valore no (si stampa).
 */
export function chiaveValore (riga: string): { chiave: string, valore: string } | null {
  const dove = riga.indexOf(':')
  if (dove < 0) return null
  return { chiave: riga.slice(0, dove).trim().toLowerCase(), valore: riga.slice(dove + 1).trim() }
}

// ------------------------------------------------------------ la carta intestata

/**
 * Il nome con cui i modelli chiedono il logo del documento: `logo.png` vuol
 * dire il logo dell'intestazione, qualunque nome abbia. Lo va a prendere
 * `immagineDelRapporto`.
 */
export const NOME_LOGO = 'logo.png'

/**
 * Il modello con la carta intestata del documento: altezza del logo da
 * Impostazioni; senza logo la riga sparisce, se no la testata lascerebbe un
 * buco.
 */
export function conIntestazione (
  modello: Modello,
  carta: { logo?: string, altezzaLogo: number },
): Modello {
  const adatta = (immagini: ImmagineModello[]): ImmagineModello[] =>
    immagini.flatMap((immagine) => {
      if (immagine.file !== NOME_LOGO) return [immagine]
      return carta.logo ? [{ ...immagine, altezza: carta.altezzaLogo }] : []
    })
  return {
    ...modello,
    intestazioneImmagini: adatta(modello.intestazioneImmagini),
    piedeImmagini: adatta(modello.piedeImmagini),
  }
}
