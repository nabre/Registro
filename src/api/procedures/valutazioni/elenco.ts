// I momenti di valutazione nel periodo: «quante prove ho fatto», «quando è la
// prossima», «quanto pesava». I voti stanno in `valutazioni.voti`, una prova
// per volta.

import {
  classeDelCorsoId, corsiDellaClasse, materiaDelCorso,
} from '../../../domain/courses.js'
import { definisci, errore } from '../../contract.js'
import { corsoPerId } from '../../../domain/courses.js'
import type { MomentoValutazione, Voto } from '../../../domain/models.js'
import {
  booleano,
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import {
  CAMPI_PAGINA,
  filtroTesto,
  nelPeriodo,
  pagina,
  passaPresenza,
  periodo,
  presenzaDi,
  ricerca,
  risolviPeriodo,
  taglia,
} from '../common/filters.js'
import { esigiClasse } from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().elenco
const p = () => t().presentazione

/**
 * I campi di una prova che si riempiono dopo: correggere, allegare, descrivere,
 * recuperi, riconsegne. «Quali prove non ho ancora corretto». Titolo, data e
 * peso ci sono dalla nascita.
 */
const CAMPI_PROVA = ['voti', 'allegati', 'descrizione', 'recuperi', 'daRiconsegnare'] as const

/**
 * I voti messi, non le righe aperte (una riga senza valore è da correggere).
 * La usano il filtro e la busta, così i conti coincidono.
 */
function votiMessi (momento: MomentoValutazione): Voto[] {
  return momento.voti.filter((voto) => voto.valore !== null)
}

/**
 * La prova come la vede il filtro: un valore per campo.
 *
 * I voti sono quelli messi (`votiMessi`). `daRiconsegnare` è pieno quando resta
 * almeno un foglio da ridare, come il numero accanto nella busta: `senza` sono
 * le prove chiuse, `ha` quel che resta sulla scrivania.
 */
function valoriDi (momento: MomentoValutazione): Record<string, unknown> {
  return {
    voti: votiMessi(momento),
    allegati: momento.allegati,
    descrizione: momento.descrizione,
    // Assente: nessun recupero promosso ancora.
    recuperi: momento.recuperi ?? [],
    // Gli stessi voti con cui la busta conta `daRiconsegnare`.
    daRiconsegnare: votiMessi(momento).filter((voto) => !voto.riconsegnataIl),
  }
}

export const procedura = definisci({
  nome: 'valutazioni.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    // Facoltativo: «quali prove ho a gennaio» vale su tutti i corsi. Senza, le
    // prove dell'anno in uso.
    corsoId: opzionale(identificatore({ aiuto: () => t().corsoId })),
    classeId: opzionale(identificatore({ aiuto: () => t().classeId })),
    ...periodo(() => t().prove),
    ...ricerca(() => t().doveCercare, 'verifica'),
    // Quel che di una prova manca ancora, componibile: `ha: ['voti']` con
    // `ha: ['daRiconsegnare']` è la pila da smaltire, `senza` le prove chiuse.
    ...presenzaDi(CAMPI_PROVA, () => t().prove),
    ...pagina(),
  }),
  uscita: oggetto({
    // Nullo quando non si è chiesto un corso solo, per non far credere di aver
    // risposto su uno di quelli.
    corsoId: nullabile(testo({ aiuto: () => t().corsoChiesto })),
    corso: testo({ aiuto: () => t().corso }),
    dal: testo(),
    al: testo(),
    cerca: testo({ aiuto: () => t().cerca }),
    // Rimandati come `cerca`: la busta dice su quali prove ha contato.
    ha: elenco(scelta(CAMPI_PROVA), { aiuto: () => t().ha }),
    senza: elenco(scelta(CAMPI_PROVA), { aiuto: () => t().senza }),
    ...CAMPI_PAGINA,
    momenti: elenco(oggetto({
      id: testo({ aiuto: () => t().id }),
      corsoId: testo({ aiuto: () => t().corsoIdMomento }),
      corso: testo({ aiuto: () => t().corsoMomento }),
      titolo: testo(),
      tipo: testo({ aiuto: () => t().tipo }),
      data: testo(),
      peso: numero({ aiuto: () => t().peso }),
      voti: numero({ intero: true, aiuto: () => t().voti }),
      assenti: numero({ intero: true, aiuto: () => t().assenti }),
      media: numero({ aiuto: () => t().media }),
      daRiconsegnare: numero({ intero: true, aiuto: () => t().daRiconsegnare }),
      recuperi: numero({ intero: true, aiuto: () => t().recuperi }),
      conAllegati: booleano({ aiuto: () => t().conAllegati }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: () => p().corso },
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
          { campo: 'ha', etichetta: () => parole().con, formato: 'elenco' },
          { campo: 'senza', etichetta: () => parole().senza, formato: 'elenco' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'momenti',
        colonne: [
          { campo: 'data', testo: () => parole().giorno, formato: 'data' },
          { campo: 'corso', testo: () => p().corso },
          { campo: 'titolo', testo: () => p().prova },
          { campo: 'tipo', testo: () => p().genere },
          { campo: 'peso', testo: () => p().peso, formato: 'numero' },
          { campo: 'voti', testo: () => p().votiMessi, formato: 'numero' },
          { campo: 'media', testo: () => p().media, formato: 'numero' },
          { campo: 'daRiconsegnare', testo: () => p().daRiconsegnare, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Un id di corso sbagliato deve dire «non c'è», non dare un elenco vuoto.
    const corso = ingresso.corsoId ? corsoPerId(r, ingresso.corsoId) ?? null : null
    if (ingresso.corsoId && !corso) throw errore.nonTrovato('corso')
    const classe = corso ? classeDelCorsoId(r, corso.id) : null
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)

    // Il periodo lo risolve `risolviPeriodo` con la classe accanto: i semestri
    // dell'anno di quella classe, o gli estremi dell'anno.
    const { dal, al } = risolviPeriodo(r, ingresso, classe)

    const { corrisponde } = filtroTesto(ingresso.cerca)
    // I corsi di cui si parla (quello chiesto, quelli della classe chiesta, o
    // tutti) come insieme: corso e classe si compongono, e danno «niente» solo se
    // il corso non è di quella classe.
    const ammessi = new Set(
      (ingresso.classeId ? corsiDellaClasse(r, ingresso.classeId) : r.corsi)
        .filter((c) => !corso || c.id === corso.id)
        .map((c) => c.id),
    )

    const dettoIl = (corsoId: string): string => {
      const suo = corsoPerId(r, corsoId)
      if (!suo) return ''
      const sua = classeDelCorsoId(r, suo.id)
      return [sua?.nome, materiaDelCorso(r, suo)?.nome].filter(Boolean).join(' — ') || suo.titolo
    }

    const scelte = r.valutazioni
      .filter((v) => ammessi.has(v.corsoId) && nelPeriodo(v.data, dal, al))
      .filter((v) => corrisponde([v.titolo, v.tipo, dettoIl(v.corsoId)].join(' ')))
      .filter((v) => passaPresenza(valoriDi(v), ingresso.ha, ingresso.senza))
      .sort((a, b) => a.data.localeCompare(b.data))

    const { pagina: momenti, quante, da, troncato, ancora } = taglia(scelte, ingresso)

    return {
      corsoId: corso?.id ?? null,
      corso: corso ? dettoIl(corso.id) : '',
      dal,
      al,
      cerca: ingresso.cerca ?? '',
      ha: ingresso.ha ?? [],
      senza: ingresso.senza ?? [],
      quante,
      da,
      troncato,
      ancora,
      momenti: momenti
        .map((momento) => {
          const messi = votiMessi(momento)
          const somma = messi.reduce((totale, voto) => totale + (voto.valore ?? 0), 0)
          return {
            id: momento.id,
            corsoId: momento.corsoId,
            corso: dettoIl(momento.corsoId),
            titolo: momento.titolo,
            tipo: momento.tipo,
            data: momento.data,
            peso: momento.peso,
            voti: messi.length,
            assenti: momento.voti.filter((voto) => voto.assente).length,
            media: messi.length > 0 ? somma / messi.length : 0,
            daRiconsegnare: messi.filter((voto) => !voto.riconsegnataIl).length,
            recuperi: momento.recuperi?.length ?? 0,
            conAllegati: momento.allegati.length > 0,
          }
        }),
    }
  },
})
