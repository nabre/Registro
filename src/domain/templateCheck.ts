// Che cosa, in un modello, il registro non capirà.
//
// Il lettore dei modelli non cade mai: una riga che non capisce la salta, così
// un refuso non impedisce di stampare. Ma il refuso non si vede (`tabella:
// allevi` dà un foglio senza tabella). Qui le stesse regole del lettore, lette
// per dire riga per riga che cosa verrà saltato; la prova dei modelli di serie
// passa di qui.
//
// I nomi noti sono facoltativi: un elenco vuoto salta quel controllo. La
// pagina passa i nomi veri chiesti all'host; una prova guarda solo la forma.

import { LINGUE } from '../i18n/index.js'
import { chiaveValore, DIRETTIVE, FORMATI, NOME_LOGO, type TipoBlocco } from './reports.js'
import { fileDeiTesti } from './templateCatalog.js'
import { testi, type GenereNome } from './templateCheck.testi.js'

/** Quanto è grave: un errore è roba che sparisce dal foglio, un avviso un dubbio. */
type Gravita = 'errore' | 'avviso'

export interface Problema {
  /** La riga del file, contata da 1: è il numero che si legge nell'editor. */
  riga: number
  gravita: Gravita
  testo: string
}

/**
 * I nomi che esistono davvero dall'altra parte. Un elenco vuoto è un
 * controllo che non si fa; restano quelli che non dipendono dai dati.
 */
interface NomiNoti {
  /** I modelli che `estende:` può nominare. */
  modelli: readonly string[]
  /** Le immagini che un modello può chiedere per nome: il logo del documento, se c'è. */
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

/** Il nome davanti alla prima barra: `tabella: voti | data peso` chiede «voti». */
function primoNome (valore: string): string {
  const barra = valore.indexOf('|')
  return (barra < 0 ? valore : valore.slice(0, barra)).trim()
}

/**
 * I segnaposto citati in una riga, senza graffe, con lo stesso riconoscimento
 * del lettore: un nome con spazi o accenti non viene sostituito.
 */
function segnaposti (testo: string): string[] {
  return [...testo.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)].map((trovato) => trovato[1])
}

/**
 * Di che grammatica è fatto un file della cartella: un rapporto (`[corpo]` e
 * direttive), `_blocchi.tpl` (`[blocco: nome]`), `_testi*.tpl` (`[frasi]`,
 * `[colonne]`, nomi liberi). Con le regole del rapporto gli altri due
 * darebbero falsi allarmi. `libero` è la firma HTML delle e-mail.
 */
type FormaModello = 'rapporto' | 'blocchi' | 'testi' | 'libero'

/** Che grammatica ha quel file, dal suo nome. */
export function formaModello (nome: string): FormaModello {
  if (nome === '_blocchi') return 'blocchi'
  // Tutte le lingue delle parole hanno la stessa grammatica.
  if (LINGUE.some((lingua) => fileDeiTesti(lingua) === nome)) return 'testi'
  return nome.includes('.') ? 'libero' : 'rapporto'
}

/**
 * I problemi di un file della cartella, riga per riga. `forma` dice con quali
 * regole leggerlo (di serie, un rapporto); chi ha un nome usa `formaModello`.
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

/** Un modello di rapporto: la testa con le misure, le due bande, il corpo. */
function verificaRapporto (sorgente: string, noti: NomiNoti): Problema[] {
  const t = testi()
  const problemi: Problema[] = []
  const righe = sorgente.split(/\r?\n/)
  let dove: 'testa' | 'intestazione' | 'piede' | 'corpo' | 'stile' = 'testa'
  // I `se:` e `ripeti:` aperti, e dove: un giro senza `fine:` si mangia tutto
  // quel che segue, ed è il guasto meno visibile.
  const aperti: Array<{ riga: number, tipo: string }> = []

  const dì = (riga: number, gravita: Gravita, testo: string) => {
    problemi.push({ riga, gravita, testo })
  }

  const controllaNome = (
    riga: number,
    genere: GenereNome,
    nome: string,
    elenco: readonly string[],
  ) => {
    if (elenco.length === 0 || nome === '' || elenco.includes(nome)) return
    dì(riga, 'errore', t.nomeNonEsiste(t.generi[genere], nome))
  }

  righe.forEach((grezza, indice) => {
    const numero = indice + 1
    const riga = grezza.trim()
    if (riga === '' || riga.startsWith('#')) return

    const sezione = riga.match(/^\[(.+)\]$/)
    if (sezione) {
      const quale = sezione[1].trim().toLowerCase()
      if (!SEZIONI.includes(quale)) {
        dì(numero, 'errore', t.sezioneSconosciuta(quale))
        return
      }
      dove = quale as typeof dove
      return
    }

    const voce = chiaveValore(riga)
    if (!voce) {
      dì(numero, 'errore', t.senzaDuePunti)
      return
    }

    // La domanda di un `se:` non è un segnaposto: il nome può essere di un
    // elenco, una tabella o un gruppo, e si controlla più sotto contro tutte le
    // raccolte.
    const domanda = dove === 'corpo' && (voce.chiave === 'se' || voce.chiave === 'altrimenti')

    // Un segnaposto sbagliato diventa vuoto, e una riga di soli vuoti sparisce.
    for (const nome of domanda ? [] : segnaposti(voce.valore)) {
      if (nome.startsWith('frase.')) {
        controllaNome(numero, 'frase', nome.slice('frase.'.length), noti.frasi)
        continue
      }
      if (SEMPRE.includes(nome)) continue
      if (SOLO_BANDA.includes(nome)) {
        if (dove !== 'intestazione' && dove !== 'piede') {
          dì(numero, 'avviso', t.soloBanda(nome))
        }
        continue
      }
      if (noti.valori.length > 0 && !noti.valori.includes(nome)) {
        dì(numero, 'errore', t.segnapostoIgnoto(nome))
      }
    }

    if (dove === 'testa' || dove === 'stile') {
      if (!CHIAVI_TESTA.includes(voce.chiave)) {
        dì(numero, 'errore', t.nonMisura(voce.chiave))
        return
      }
      controllaMisura(numero, voce, dì, noti)
      return
    }

    if (dove === 'intestazione' || dove === 'piede') {
      if (voce.chiave !== 'riga' && voce.chiave !== 'immagine') {
        dì(numero, 'errore', t.soloRigaEImmagine(dove, voce.chiave))
        return
      }
      if (voce.chiave === 'immagine') controllaImmagine(numero, voce.valore, dì, noti)
      return
    }

    // Da qui in giù si è nel corpo.
    if (!DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      dì(numero, 'errore', t.nonDirettiva(voce.chiave))
      return
    }

    const direttiva = voce.chiave as TipoBlocco
    if (APRONO.has(direttiva)) aperti.push({ riga: numero, tipo: direttiva })
    if (direttiva === 'fine') {
      if (aperti.length === 0) {
        dì(numero, 'errore', t.fineSpaiato)
      } else {
        aperti.pop()
      }
    }
    if (direttiva === 'altrimenti' && aperti.length === 0) {
      dì(numero, 'errore', t.altrimentiFuori)
    }

    const nome = primoNome(voce.valore)
    if (direttiva === 'tabella') controllaNome(numero, 'tabella', nome, noti.tabelle)
    if (direttiva === 'elenco') controllaNome(numero, 'elenco', nome, noti.elenchi)
    if (direttiva === 'grafico') controllaNome(numero, 'grafico', nome, noti.grafici)
    if (direttiva === 'galleria') controllaNome(numero, 'galleria', nome, noti.gallerie)
    if (direttiva === 'ripeti') controllaNome(numero, 'gruppo', nome, noti.gruppi)
    if (direttiva === 'usa') controllaNome(numero, 'blocco', nome, noti.blocchi)
    if (direttiva === 'immagine') controllaImmagine(numero, voce.valore, dì, noti)
    // Un nome di `se:` che non esiste è la domanda stessa, non un errore; ma
    // se non esiste in nessuna raccolta il pezzo non uscirà mai, e va detto.
    if ((direttiva === 'se' || direttiva === 'altrimenti') && noti.valori.length > 0) {
      const dovunque = [
        ...noti.valori,
        ...noti.elenchi,
        ...noti.tabelle,
        ...noti.grafici,
        ...noti.gallerie,
        ...noti.gruppi,
      ]
      // Con le graffe o senza, per il lettore è uguale.
      const chiesto = nome.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '')
      if (chiesto !== '' && !dovunque.includes(chiesto)) {
        dì(numero, 'avviso', t.maiTrovato(direttiva, chiesto))
      }
    }
  })

  for (const giro of aperti) {
    problemi.push({
      riga: giro.riga,
      gravita: 'errore',
      testo: t.maiChiuso(giro.tipo),
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
  const t = testi()
  const fra = (min: number, max: number) => {
    const letti = numeri(voce.valore)
    if (letti.length !== 1 || !Number.isFinite(letti[0]) || letti[0] < min || letti[0] > max) {
      dì(numero, 'errore', t.numeroFra(voce.chiave, min, max))
    }
  }

  switch (voce.chiave) {
    case 'estende': {
      const nome = voce.valore.trim()
      if (nome === '') return
      if (!/^[A-Za-z0-9_-]+$/.test(nome)) {
        dì(numero, 'errore', t.nomeModelloSemplice)
        return
      }
      if (noti.modelli.length > 0 && !noti.modelli.includes(nome)) {
        dì(numero, 'errore', t.modelloAssente(nome))
      }
      return
    }
    case 'orientamento':
      if (!/^(vert|oriz)/i.test(voce.valore.trim())) {
        dì(numero, 'avviso', t.orientamento)
      }
      return
    case 'margini': {
      const letti = numeri(voce.valore)
      if (letti.length !== 4 || letti.some((n) => !Number.isFinite(n))) {
        dì(numero, 'errore', t.margini)
      }
      return
    }
    case 'formato': {
      const pulito = voce.valore.trim().toLowerCase()
      if (Object.hasOwn(FORMATI, pulito)) return
      if (!/^\d+(\.\d+)?\s*[x×]\s*\d+(\.\d+)?$/.test(pulito)) {
        dì(numero, 'errore', t.formato(voce.valore, Object.keys(FORMATI).join(' ')))
      }
      return
    }
    case 'corpo': {
      for (const pezzo of voce.valore.split(';')) {
        const parte = pezzo.trim()
        if (parte === '') continue
        const [nome, misura] = parte.split('=').map((p) => p.trim())
        if (!CORPI.includes(nome)) {
          dì(numero, 'errore', t.corpoIgnoto(nome, CORPI.join(' ')))
          continue
        }
        if (!Number.isFinite(Number(misura))) {
          dì(numero, 'errore', t.corpoSenzaMisura(nome))
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
 * Una riga `immagine:`. Il nome secco è un'immagine data ai modelli (solo
 * `logo.png`, che passa sempre: un documento senza logo stampa senza). Un nome
 * con barre è un documento dell'anno (un ritratto) e qui non si controlla.
 */
function controllaImmagine (
  numero: number,
  valore: string,
  dì: (riga: number, gravita: Gravita, testo: string) => void,
  noti: NomiNoti,
): void {
  const t = testi()
  const nome = primoNome(valore)
  if (nome === '') {
    dì(numero, 'errore', t.immagineSenzaFile)
    return
  }
  if (nome.includes('{{')) return
  if (nome.includes('/')) return
  if (!/\.(png|jpe?g)$/i.test(nome)) {
    dì(numero, 'errore', t.nonImmagine(nome))
    return
  }
  if (nome === NOME_LOGO) return
  if (noti.immagini.length > 0 && !noti.immagini.includes(nome)) {
    dì(numero, 'errore', t.immagineIgnota(nome, NOME_LOGO))
  }
}

/**
 * `_blocchi.tpl`: pezzi di corpo con un nome, richiamati da `usa:`. Valgono le
 * direttive del corpo; i segnaposto no, perché sono parametri di chi chiama
 * (`usa: intestazione | titolo=Presenze`), non dati di un rapporto.
 */
function verificaBlocchi (sorgente: string, noti: NomiNoti): Problema[] {
  const t = testi()
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
        testo: t.sezioniDeiBlocchi,
      })
      dentro = null
      return
    }

    const voce = chiaveValore(riga)
    if (!voce) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: t.senzaDuePunti,
      })
      return
    }
    if (dentro === null) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: t.fuoriDaiBlocchi,
      })
      return
    }
    if (!DIRETTIVE.includes(voce.chiave as TipoBlocco)) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: t.nonDirettiva(voce.chiave),
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
          testo: t.fineSpaiato,
        })
      } else {
        aperti.pop()
      }
    }
    // Un blocco che ne richiama un altro: il nome deve esistere, o quel pezzo
    // di foglio sparisce in silenzio.
    if (direttiva === 'usa' && noti.blocchi.length > 0) {
      const nome = primoNome(voce.valore)
      if (nome !== '' && !noti.blocchi.includes(nome)) {
        problemi.push({
          riga: numero,
          gravita: 'errore',
          testo: t.bloccoAssente(nome),
        })
      }
    }
  })

  for (const giro of aperti) {
    problemi.push({
      riga: giro.riga,
      gravita: 'errore',
      testo: t.maiChiuso(giro.tipo),
    })
  }
  return problemi.sort((a, b) => a.riga - b.riga)
}

/**
 * `_testi.tpl`: frasi e nomi delle colonne, liberi da tutte e due le parti.
 * Si segnala solo quel che fa sparire testo: una riga fuori dalle due sezioni
 * o senza i due punti.
 */
function verificaTesti (sorgente: string): Problema[] {
  const t = testi()
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
          testo: t.sezioneDeiTesti(quale),
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
        testo: t.senzaDuePuntiTesti,
      })
      return
    }
    if (dove === null) {
      problemi.push({
        riga: numero,
        gravita: 'errore',
        testo: t.fuoriDaiTesti,
      })
    }
  })

  return problemi
}
