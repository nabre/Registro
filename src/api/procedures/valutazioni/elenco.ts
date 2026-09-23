// I momenti di valutazione di un corso, nel periodo che si sta guardando.
//
// «Quante prove ho fatto», «quando è la prossima», «quella di novembre quanto
// pesava»: tre domande che l'assistente non poteva nemmeno cominciare a
// leggere, perché dei voti non c'era **niente** — `corso.presenze` porta la
// media e basta, e una media senza le prove che la compongono è un numero su
// cui non si può discutere.
//
// I voti non escono di qui: sono `valutazioni.voti`, che ne vuole uno per
// volta. Venticinque righe per ognuno dei dodici momenti sono trecento righe
// che nessuno ha chiesto, e la domanda «quante prove» non ne vuole nemmeno una.

import {
  classeDelCorsoId, corsiDellaClasse, materiaDelCorso,
} from '../../../domain/courses.js'
import { definisci, errore } from '../../contract.js'
import { SCUOLA } from '../../../domain/lexicon.js'
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

/**
 * I campi di una prova che possono restare vuoti.
 *
 * Sono le cinque cose che di una prova si fanno **dopo**: correggere,
 * allegare il testo, scrivere che cosa chiedeva, promuovere un recupero,
 * ridare i fogli. Titolo, data e peso non ci stanno, perché una prova li ha
 * nel momento in cui nasce. «Quali prove non ho ancora corretto» era la
 * domanda di ogni fine semestre, e l'unica strada era aprirle una per una.
 */
const CAMPI_PROVA = ['voti', 'allegati', 'descrizione', 'recuperi', 'daRiconsegnare'] as const

/**
 * I voti messi, non le righe aperte.
 *
 * Una riga senza valore è una prova non ancora corretta. Una funzione sola
 * perché la stessa distinzione la fanno in due — il filtro prima di tagliare,
 * e la busta quando conta i voti, fa la media e conta i fogli da ridare — e
 * due copie da tenere allineate sono il modo in cui la stessa busta finisce
 * per dare due conti diversi della stessa prova.
 */
function votiMessi (momento: MomentoValutazione): Voto[] {
  return momento.voti.filter((voto) => voto.valore !== null)
}

/**
 * La prova come la vede il filtro: un valore per campo, e basta che `pieno`
 * sappia dire se c'è.
 *
 * Due campi non sono quel che sembrano. I voti sono quelli **messi**, non le
 * righe: una riga senza valore è una prova non ancora corretta, ed è la
 * stessa distinzione con cui poco più sotto si fa la media — contarle
 * toglierebbe dall'elenco proprio le prove che si stanno cercando. Le
 * Il secondo è `daRiconsegnare`, e si chiamava `riconsegne`: era pieno quando
 * **almeno un** foglio era tornato indietro, e quindi `senza: ['riconsegne']`
 * buttava fuori dall'elenco una prova riconsegnata a metà — quella che nella
 * stessa busta porta `daRiconsegnare: 1`. La busta diceva che un foglio è
 * ancora in mano a chi insegna e il filtro diceva che non c'è niente da
 * smaltire. Adesso il campo è pieno quando **resta** qualcosa da riconsegnare,
 * che è la pila vera, e vuol dire esattamente il numero che le sta accanto:
 * `senza` sono le prove chiuse, `ha` è quel che resta sulla scrivania.
 */
function valoriDi (momento: MomentoValutazione): Record<string, unknown> {
  return {
    voti: votiMessi(momento),
    allegati: momento.allegati,
    descrizione: momento.descrizione,
    // Assente vuol dire che nessuno ha ancora promosso niente: è lo stato di
    // partenza, e `?? []` lo dice senza far cadere i registri vecchi.
    recuperi: momento.recuperi ?? [],
    // Gli stessi voti su cui poco più sotto si conta `daRiconsegnare`: due
    // conti della stessa cosa nello stesso file sarebbero due occasioni di
    // rispondere in due modi alla domanda «questa prova è chiusa?».
    daRiconsegnare: votiMessi(momento).filter((voto) => !voto.riconsegnataIl),
  }
}

export const procedura = definisci({
  nome: 'valutazioni.elenco',
  versione: 1,
  genere: 'lettura',
  titolo: 'I momenti di valutazione di un corso in un periodo',
  idempotente: true,
  ingresso: oggetto({
    // Non più obbligatorio, ed è la correzione di un difetto vero: «quali
    // prove ho a gennaio» è una domanda su tutti i corsi insieme, e con il
    // corso obbligatorio voleva dire una chiamata per corso e un'unione fatta
    // a mano da chi legge. Senza, sono le prove dell'anno in uso.
    corsoId: opzionale(identificatore({ aiuto: 'Solo le prove di questo corso' })),
    classeId: opzionale(identificatore({ aiuto: 'Solo le prove dei corsi di questa classe' })),
    ...periodo('le prove'),
    ...ricerca('titolo, genere o corso', 'verifica'),
    // Quel che di una prova manca ancora. I due campi si compongono, ed è
    // così che si trova la pila vera da smaltire: `ha: ['voti']` con
    // `ha: ['daRiconsegnare']` è la pila da smaltire, `senza` le prove chiuse.
    ...presenzaDi(CAMPI_PROVA, 'le prove'),
    ...pagina(),
  }),
  uscita: oggetto({
    // Nulli quando non si è chiesto un corso solo: una busta che scrivesse il
    // nome di uno dei corsi risposti farebbe credere di aver risposto su
    // quello, ed è il genere di equivoco che si scopre dopo aver stampato.
    corsoId: nullabile(testo({ aiuto: 'Il corso chiesto, o nullo se erano tutti' })),
    corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica». Vuoto se erano tutti' }),
    dal: testo(),
    al: testo(),
    cerca: testo({ aiuto: 'Il filtro di testo applicato. Vuoto quando non se n’è chiesto' }),
    // Rimandati come `cerca`: «tre prove» detto senza dire che si guardavano
    // solo quelle senza voti è un conto che chi lo rilegge prende per il
    // totale del periodo.
    ha: elenco(scelta(CAMPI_PROVA), { aiuto: 'I campi che si sono chiesti pieni' }),
    senza: elenco(scelta(CAMPI_PROVA), { aiuto: 'I campi che si sono chiesti vuoti' }),
    ...CAMPI_PAGINA,
    momenti: elenco(oggetto({
      id: testo({ aiuto: 'Da passare a «valutazioni.voti» per avere le righe' }),
      corsoId: testo({ aiuto: 'Di quale corso è: serve quando si chiedono tutti' }),
      corso: testo({ aiuto: 'Come si legge quel corso' }),
      titolo: testo(),
      tipo: testo({ aiuto: 'Scritto, orale, pratico, progetto, compito, osservazione' }),
      data: testo(),
      peso: numero({ aiuto: 'Quanto pesa nella media del semestre: zero vuol dire «non conta»' }),
      voti: numero({ intero: true, aiuto: 'Quanti voti sono già stati messi' }),
      assenti: numero({ intero: true, aiuto: 'Quante persone erano assenti alla prova' }),
      media: numero({ aiuto: 'La media dei voti messi, zero se non ce n’è nessuno' }),
      daRiconsegnare: numero({ intero: true, aiuto: 'Fogli corretti ancora in mano a chi insegna' }),
      recuperi: numero({ intero: true, aiuto: 'Quante persone devono rifarla' }),
      conAllegati: booleano({ aiuto: 'Se ha dei fogli allegati' }),
    })),
  }),
  presentazione: {
    titolo: 'I momenti di valutazione',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'corso', etichetta: 'Corso' },
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
          { campo: 'ha', etichetta: 'Con', formato: 'elenco' },
          { campo: 'senza', etichetta: 'Senza', formato: 'elenco' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'momenti',
        colonne: [
          { campo: 'data', testo: 'Giorno', formato: 'data' },
          { campo: 'corso', testo: 'Corso' },
          { campo: 'titolo', testo: 'Prova' },
          { campo: 'tipo', testo: 'Genere' },
          { campo: 'peso', testo: 'Peso', formato: 'numero' },
          { campo: 'voti', testo: 'Voti messi', formato: 'numero' },
          { campo: 'media', testo: 'Media', formato: 'numero' },
          { campo: 'daRiconsegnare', testo: 'Da riconsegnare', formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Il corso nominato, se ne è stato nominato uno: la guardia resta, perché
    // un id sbagliato deve dire «non c'è» e non tornare un elenco vuoto.
    const corso = ingresso.corsoId ? corsoPerId(r, ingresso.corsoId) ?? null : null
    if (ingresso.corsoId && !corso) throw errore.nonTrovato(SCUOLA.corso)
    const classe = corso ? classeDelCorsoId(r, corso.id) : null
    if (ingresso.classeId) esigiClasse(ambito, ingresso.classeId)

    // Il periodo viene dai semestri quando si guarda un corso solo — sono le
    // date di quell'anno — e dall'anno in uso quando si guardano tutti. È
    // esattamente quel che fa `risolviPeriodo` con la classe accanto, e qui la
    // stessa formula stava scritta a mano: la terza copia, dopo quelle di
    // `corso.presenze` e `persone.scheda`. Scritta a mano non ripiegava
    // sull'anno quando quell'anno i semestri non li ha, e una classe di un
    // altro anno si vedeva dichiarare il periodo di questo.
    const { dal, al } = risolviPeriodo(r, ingresso, classe)

    const { corrisponde } = filtroTesto(ingresso.cerca)
    // Di quali corsi si parla: quello chiesto, quelli della classe chiesta, o
    // tutti. Un insieme di id e non tre rami di `if`: i tre filtri si
    // compongono — corso **e** classe insieme è una domanda legittima, e
    // risponde «niente» solo se quel corso non è di quella classe.
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
