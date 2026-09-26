// Trovare una persona per nome, come al telefono: dà l'id che `persone.scheda`
// e le altre letture vogliono, invece di lasciarlo indovinare al modello.
//
// Si cerca a pezzi, come nella pagina: «rossi dic» trova Rossi della DIC4a, non
// tutti i Rossi più tutta la DIC4a. Vale per nome, classe e azienda insieme.

import { ordinaAllievi } from '../../../domain/calculations.js'
import type { Allievo } from '../../../domain/models.js'
import { pezziDiRicerca } from '../../../domain/text.js'
import { definisci } from '../../contract.js'
import {
  booleano,
  elenco,
  nullabile,
  numero,
  oggetto,
  opzionale,
  scelta,
  testo,
} from '../../schemas.js'
import {
  CAMPI_PAGINA,
  CAMPI_RIGA_PERSONA,
  filtroTesto,
  pagina,
  nellaZona,
  passaPresenza,
  presenzaDi,
  rigaPersona,
  taglia,
  zona,
} from '../common/filters.js'
import { parole } from '../../../domain/words.testi.js'
import { testi as t } from './cerca.testi.js'

const p = () => t().presentazione


/**
 * Le parole che nominano la categoria («allievo»), e che quindi non sono un
 * filtro: cercarle vuol dire «tutte». Il modello le cerca anche quando il
 * prompt glielo vieta, quindi la regola è codice. Si tolgono e si dice che
 * sono state tolte.
 *
 * Restano fuori le parole che potrebbero essere un nome di persona o di classe
 * («meccanico», «prima», «donna»).
 */
const PAROLE_CATEGORIA: ReadonlySet<string> = new Set([
  'allievo', 'allieva', 'allievi', 'allieve',
  'studente', 'studentessa', 'studenti', 'studentesse',
  'alunno', 'alunna', 'alunni', 'alunne',
  'persona', 'persone', 'pif', 'formazione',
  'iscritto', 'iscritta', 'iscritti', 'iscritte',
  'tutti', 'tutte', 'tutto',
  // Le stesse parole nelle altre lingue, già normalizzate come in
  // `pezziDiRicerca` (minuscole, senza accenti). Fuori quelle che possono essere
  // un cognome o parte del nome di un'azienda («Schuler», «alle», «all»).
  'lernende', 'lernender', 'lernenden', 'auszubildende', 'auszubildender', 'auszubildenden',
  'lehrling', 'lehrlinge', 'personen',
  'eleve', 'eleves', 'apprenti', 'apprentie', 'apprentis', 'apprenties',
  'etudiant', 'etudiante', 'etudiants', 'etudiantes', 'personne', 'personnes', 'pef',
  'formation', 'inscrit', 'inscrite', 'inscrits', 'inscrites', 'tous', 'toutes',
  'learner', 'learners', 'student', 'students', 'pupil', 'pupils', 'apprentice',
  'apprentices', 'trainee', 'trainees', 'person', 'people', 'everyone', 'everybody',
])

/**
 * I campi di una persona che possono restare vuoti: recapiti e dati raccolti
 * strada facendo. Cognome e nome ci sono sempre, e non servono come filtro.
 */
const CAMPI_PERSONA = [
  'email', 'emailTutore', 'emailDatore', 'telefono', 'indirizzo',
  'azienda', 'dataNascita', 'foto',
] as const

/**
 * La persona come la vede il filtro: un valore per campo, e `pieno` dice se
 * c'è. Un telefono senza numero non conta come telefono, un indirizzo senza
 * via non conta come indirizzo: non servono a chiamare né a scrivere.
 */
function valoriDi (allievo: Allievo): Record<string, unknown> {
  return {
    email: allievo.email,
    emailTutore: allievo.emailTutore,
    emailDatore: allievo.emailDatore,
    telefono: allievo.telefoni.filter((telefono) => telefono.numero.trim() !== ''),
    indirizzo: allievo.indirizzo?.via,
    azienda: allievo.azienda,
    dataNascita: allievo.dataNascita,
    foto: allievo.foto,
  }
}

/**
 * La riga che dice a chi legge che cosa fare adesso; vuota quando non c'è
 * niente da fare. I casi sono in ordine d'importanza: prima l'errore di chi
 * chiama, poi quel che il filtro nasconde.
 */
function suggerimento (stato: {
  quante: number
  inRegistro: number
  cerca: string
  tolti: readonly string[]
  ha: readonly string[]
  senza: readonly string[]
  escluseRitirate: number | null
  escluseArchiviate: number | null
}): string {
  const frasi: string[] = []
  const f = t().frasi

  if (stato.tolti.length > 0) {
    frasi.push(
      stato.cerca === ''
        ? f.categoriaSenzaFiltro(stato.tolti)
        : f.categoriaTolta(stato.tolti, stato.cerca),
    )
  }

  if (stato.quante === 0 && stato.inRegistro > 0) {
    // Nomina il filtro che ha svuotato l'elenco: con `ha` o `senza` accesi,
    // togliere solo `cerca` darebbe ancora un elenco vuoto.
    const chiesti = [...stato.ha, ...stato.senza]
    if (chiesti.length > 0) {
      frasi.push(f.nessunaConICampi(stato.inRegistro, stato.cerca, chiesti))
    } else {
      frasi.push(
        stato.cerca === ''
          ? f.nessunaPassa(stato.inRegistro)
          : f.nessunaCorrisponde(stato.cerca, stato.inRegistro),
      )
    }
  }

  const rientri: string[] = []
  if (stato.escluseRitirate !== null) rientri.push(f.ritiratiAVero)
  if (stato.escluseArchiviate !== null) rientri.push(f.archiviateAVero)
  if (rientri.length > 0 && stato.quante === 0) {
    frasi.push(f.rientrano(rientri))
  }

  return frasi.join(' ')
}

export const procedura = definisci({
  nome: 'persone.cerca',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    // Facoltativo: senza `cerca` escono tutte. Un attrezzo che non sa dire «tutte»
    // costringe a inventare un filtro, che torna vuoto.
    cerca: opzionale(testo({
      // L'esempio dell'aiuto è un pezzo di sigla di classe, non un cognome: un
      // modello piccolo ricopierebbe il cognome come se fosse una persona vera.
      aiuto: () => t().cerca,
      esempio: 'dic4a',
    })),
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
    // Le classi archiviate hanno una porta: «la Rossi dell'anno scorso» è una
    // domanda vera.
    archiviate: opzionale(booleano({ aiuto: () => t().archiviate })),
    // «Chi non ha l'e-mail»: i due campi si compongono (`ha: ['telefono']` con
    // `senza: ['email']` = chi va chiamato invece che scritto).
    ...presenzaDi(CAMPI_PERSONA, () => t().lePersone),
    // La zona anche qui, come nelle altre letture: «chi abita a Lugano» si chiede
    // cercando.
    ...zona(),
    ...pagina(),
  }),
  uscita: oggetto({
    cerca: testo({ aiuto: () => t().cercaUscita }),
    // Che cosa è stato tolto dalla ricerca, e perché.
    ignorato: testo({ aiuto: () => t().ignorato }),
    comune: testo({ aiuto: () => t().comune }),
    cap: testo({ aiuto: () => t().cap }),
    // Rimandati come `cerca`: la busta dice su che cosa ha risposto. Vuoti, mai
    // nulli, quando non se n'è chiesto nessuno.
    ha: elenco(scelta(CAMPI_PERSONA), { aiuto: () => t().ha }),
    senza: elenco(scelta(CAMPI_PERSONA), { aiuto: () => t().senza }),
    // Il totale accanto al risultato distingue «zero corrispondono» da «zero ce ne
    // sono». Conta tutte le persone di tutte le classi, fuori da ogni filtro;
    // `esclusi…` dice quante ne tiene fuori ciascun interruttore.
    inRegistro: numero({ intero: true, aiuto: () => t().inRegistro }),
    // Piatti e non dentro un oggetto: la presentazione legge solo chiavi di primo
    // livello. Nulli e non zero quando non c'è niente da escludere, così il
    // pannello non scrive righe inutili.
    esclusiRitirati: nullabile(numero({ intero: true, aiuto: () => t().esclusiRitirati })),
    esclusiArchiviate: nullabile(numero({ intero: true, aiuto: () => t().esclusiArchiviate })),
    // Che cosa fare adesso: come il rimedio di `errore.nonTrovato`, per una busta
    // vuota ma valida.
    suggerimento: testo({ aiuto: () => t().suggerimento }),
    ...CAMPI_PAGINA,
    persone: elenco(oggetto({
      id: testo({ aiuto: () => t().id }),
      ...CAMPI_RIGA_PERSONA,
      azienda: testo(),
      attivo: booleano({ aiuto: () => t().attivo }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'cerca', etichetta: () => p().cercando },
          { campo: 'ha', etichetta: () => parole().con, formato: 'elenco' },
          { campo: 'senza', etichetta: () => parole().senza, formato: 'elenco' },
          { campo: 'quante', etichetta: () => p().trovate, formato: 'numero' },
          { campo: 'inRegistro', etichetta: () => p().nelRegistro, formato: 'numero' },
          { campo: 'esclusiRitirati', etichetta: () => p().ritirate, formato: 'numero' },
          { campo: 'esclusiArchiviate', etichetta: () => p().archiviate, formato: 'numero' },
          { campo: 'ignorato', etichetta: () => p().paroleTolte },
          { campo: 'suggerimento', etichetta: () => p().daSapere },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'cognome', testo: () => parole().cognome },
          { campo: 'nome', testo: () => parole().nome },
          { campo: 'classe', testo: () => p().classe },
          { campo: 'azienda', testo: () => p().azienda },
          { campo: 'attivo', testo: () => p().frequenta, formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    // Normalizzato prima di spezzare (minuscolo, senza accenti e punteggiatura):
    // «MÜLLER», «muller» e «Müller» sono la stessa ricerca.
    const chiesti = pezziDiRicerca(ingresso.cerca ?? '')
    // Le parole di categoria si tolgono.
    const pezzi = chiesti.filter((pezzo) => !PAROLE_CATEGORIA.has(pezzo))
    const tolti = chiesti.filter((pezzo) => PAROLE_CATEGORIA.has(pezzo))

    // I conti che il filtro non deve spegnere (persone in tutto, quante ne lascia
    // fuori ogni interruttore): si contano prima di filtrare.
    const tutteLeClassi = r.classi.flatMap((classe) =>
      classe.allievi.map((allievo) => ({ classe, allievo })),
    )
    const inRegistro = tutteLeClassi.length
    const esclusi = {
      ritirati: tutteLeClassi.filter(({ allievo }) => !allievo.attivo).length,
      archiviate: tutteLeClassi.filter(({ classe }) => classe.archiviata).length,
    }

    const candidate = r.classi
      // Le classi archiviate restano fuori se non le si chiede: un omonimo di anni fa
      // porterebbe alla scheda sbagliata.
      .filter((classe) => ingresso.archiviate === true || !classe.archiviata)
      .flatMap((classe) =>
        ordinaAllievi(classe.allievi)
          .filter((allievo) => ingresso.ritirati === true || allievo.attivo)
          .map((allievo) => ({ classe, allievo })),
      )
    // Lo stesso filtro delle altre letture: `filtroTesto` normalizza con la stessa
    // funzione dei pezzi. Si passano i pezzi già ripuliti, non `ingresso.cerca`.
    const { corrisponde } = filtroTesto(pezzi.join(' '))
    const tutte = candidate
      .filter(({ classe, allievo }) =>
        corrisponde([allievo.cognome, allievo.nome, classe.nome, allievo.azienda ?? ''].join(' ')),
      )
      // I campi vuoti dopo il testo: restringono quel che la ricerca ha già trovato.
      .filter(({ allievo }) => passaPresenza(valoriDi(allievo), ingresso.ha, ingresso.senza))
      // La zona per ultima, sulle righe rimaste.
      .filter(({ allievo }) => nellaZona(allievo.indirizzo, ingresso))

    const { pagina: persone, quante, da, troncato, ancora } = taglia(tutte, ingresso)

    // Nullo con l'interruttore già acceso o senza nessuno da escludere: un «0»
    // manderebbe il modello a riaccendere un interruttore acceso.
    const fuori = (quanti: number, acceso: boolean) => (acceso || quanti === 0 ? null : quanti)
    const escluseRitirate = fuori(esclusi.ritirati, ingresso.ritirati === true)
    const escluseArchiviate = fuori(esclusi.archiviate, ingresso.archiviate === true)

    return {
      // Quel che si è cercato davvero; la differenza con la richiesta la dice `ignorato`.
      cerca: pezzi.join(' '),
      ignorato: tolti.join(' '),
      ha: ingresso.ha ?? [],
      senza: ingresso.senza ?? [],
      comune: ingresso.comune ?? '',
      cap: ingresso.cap ?? '',
      quante,
      da,
      troncato,
      ancora,
      inRegistro,
      esclusiRitirati: escluseRitirate,
      esclusiArchiviate: escluseArchiviate,
      suggerimento: suggerimento({
        quante: tutte.length,
        inRegistro,
        cerca: pezzi.join(' '),
        tolti,
        ha: ingresso.ha ?? [],
        senza: ingresso.senza ?? [],
        escluseRitirate,
        escluseArchiviate,
      }),
      persone: persone.map(({ classe, allievo }) => ({
        id: allievo.id,
        ...rigaPersona(classe, allievo),
        azienda: allievo.azienda ?? '',
        attivo: allievo.attivo,
      })),
    }
  },
})
