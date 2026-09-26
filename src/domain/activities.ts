// I parametri propri di ogni tipo di attività (dimensione dei gruppi, durata
// di una verifica, postazione di laboratorio…): il modulo mostra solo quelli
// del tipo scelto.
//
// Un valore sotto una chiave non più prevista resta nel file e smette di
// comparire: non si perde.

import { testi } from './activities.testi.js'
import { lessico } from './lexicon.testi.js'
import { type ChiaveLista, testoDiVoce, vociDiLista, type VoceLista } from './lists.js'
import type { Attivita, Impostazioni, TipoAttivita } from './models.js'

/** Come si chiede un parametro: decide il campo che compare nel modulo. */
type TipoParametro = 'testo' | 'numero' | 'sino' | 'scelta'

interface ParametroAttivita {
  chiave: string
  etichetta: string
  tipo: TipoParametro
  /**
   * Solo per `scelta`: la lista di sistema da cui escono le voci (vedi
   * `domain/lists.ts`). Sono della scuola, e si cambiano da Impostazioni.
   */
  lista?: ChiaveLista
  segnaposto?: string
  aiuto?: string
  /** Unità di misura da mostrare accanto al numero: 'min', 'punti'. */
  unita?: string
}

/** Un parametro prima delle parole: la chiave, il campo, e da che lista sceglie. */
type Scheletro = Pick<ParametroAttivita, 'tipo' | 'lista'> & { chiave: ChiaveParametro }

type ChiaveParametro = keyof ReturnType<typeof testi>['parametri']

/**
 * I parametri di ogni tipo di attività: pochi, solo quelli che si riempiono
 * davvero. Le parole stanno nel catalogo e si aggiungono in `parametriDi`.
 */
const PARAMETRI_ATTIVITA: Record<TipoAttivita, Scheletro[]> = {
  // La docenza di classe chiede l'ordine del giorno e se c'è da riportare.
  'docenza-di-classe': [
    { chiave: 'ordineDelGiorno', tipo: 'testo' },
    { chiave: 'materia', tipo: 'scelta', lista: 'temaDocenza' },
    { chiave: 'daRiportare', tipo: 'sino' },
  ],
  introduzione: [
    { chiave: 'aggancio', tipo: 'testo' },
  ],
  spiegazione: [
    { chiave: 'supporto', tipo: 'scelta', lista: 'supporto' },
    { chiave: 'riferimento', tipo: 'testo' },
  ],
  esercizio: [
    { chiave: 'quanti', tipo: 'numero' },
    { chiave: 'fonte', tipo: 'testo' },
    { chiave: 'correzione', tipo: 'scelta', lista: 'correzione' },
  ],
  laboratorio: [
    { chiave: 'postazione', tipo: 'testo' },
    { chiave: 'sicurezza', tipo: 'sino' },
    { chiave: 'materiale', tipo: 'testo' },
  ],
  discussione: [
    { chiave: 'traccia', tipo: 'testo' },
  ],
  verifica: [
    { chiave: 'durataProva', tipo: 'numero' },
    { chiave: 'punti', tipo: 'numero' },
    { chiave: 'ammesso', tipo: 'testo' },
  ],
  gruppo: [
    { chiave: 'dimensione', tipo: 'numero' },
    { chiave: 'composizione', tipo: 'scelta', lista: 'composizioneGruppi' },
    { chiave: 'consegna', tipo: 'testo' },
  ],
  ripasso: [
    { chiave: 'argomenti', tipo: 'testo' },
  ],
  compito: [
    { chiave: 'perQuando', tipo: 'testo' },
    { chiave: 'tempo', tipo: 'numero' },
  ],
  altro: [],
}

/**
 * Il nome di fabbrica di ogni tipo, dal lessico: lo stesso per tendina,
 * pastiglie e rapporti.
 */
export const NOMI_TIPO_ATTIVITA: Readonly<Record<TipoAttivita, string>> = Object.defineProperties(
  {},
  // Letto dal lessico al momento: le chiavi sono uguali in ogni lingua, le parole no.
  Object.fromEntries(
    Object.keys(lessico.in('it').tipiAttivita).map((tipo) => [
      tipo,
      { enumerable: true, get: () => lessico().tipiAttivita[tipo as TipoAttivita] },
    ]),
  ),
) as Record<TipoAttivita, string>

/**
 * Come si chiama questo tipo: con le impostazioni la parola della lista
 * `tipoAttivita` della scuola, senza quella del lessico.
 */
export function nomeTipoAttivita (tipo: TipoAttivita, impostazioni?: Impostazioni | null): string {
  if (impostazioni) return testoDiVoce(impostazioni, 'tipoAttivita', tipo)
  return NOMI_TIPO_ATTIVITA[tipo] ?? tipo
}

/** I tipi di attività da offrire, nell'ordine della lista di sistema. */
export function tipiDiAttivita (impostazioni?: Impostazioni | null): VoceLista[] {
  return vociDiLista(impostazioni, 'tipoAttivita')
}

export function parametriDi (tipo: TipoAttivita): ParametroAttivita[] {
  const parole = testi().parametri
  return (PARAMETRI_ATTIVITA[tipo] ?? []).map((scheletro) => ({
    ...scheletro,
    ...parole[scheletro.chiave],
  }))
}

/** Il valore scritto sotto una chiave, se c'è. */
export function valoreParametro (
  attivita: Attivita,
  chiave: string,
): string | number | boolean | undefined {
  return attivita.parametri?.[chiave]
}

/**
 * I parametri di un'attività in una riga per la scaletta («gruppi da 3 · a
 * sorteggio»): solo quelli riempiti, i sì/no solo se sì.
 */
export function riassuntoParametri (
  attivita: Attivita,
  impostazioni?: Impostazioni | null,
): string {
  const t = testi()
  const pezzi: string[] = []
  for (const parametro of parametriDi(attivita.tipo)) {
    const valore = valoreParametro(attivita, parametro.chiave)
    if (valore === undefined || valore === '' || valore === null) continue

    if (parametro.tipo === 'sino') {
      if (valore === true) pezzi.push(t.nelRiassunto(parametro.etichetta))
      continue
    }
    if (parametro.tipo === 'scelta') {
      // La parola attuale della lista, anche se la scuola l'ha rinominata.
      const testo = parametro.lista
        ? testoDiVoce(impostazioni, parametro.lista, String(valore))
        : String(valore)
      pezzi.push(t.nelRiassunto(testo))
      continue
    }
    if (parametro.tipo === 'numero') {
      const unita = parametro.unita ? ` ${parametro.unita}` : ''
      pezzi.push(`${t.nelRiassunto(parametro.etichetta)} ${valore}${unita}`)
      continue
    }
    pezzi.push(String(valore))
  }
  return pezzi.join(' · ')
}

/** Vero se questa tappa prevede una prova da valutare. */
export function attivitaValutata (attivita: Attivita): boolean {
  return attivita.valutazione !== undefined && attivita.valutazione !== null
}
