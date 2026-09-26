// Una persona in formazione, tutta insieme: recapiti, azienda, corsi, ore
// perse, media. I conti vengono da `matriceCorso`, come nella pagina e in
// `corso.presenze`; `matriceCorso` vuole lezioni e momenti già filtrati, quindi
// la si richiama per ogni periodo.
//
// L'indirizzo esce come riga da busta (`indirizzo`, chiave della mappa) e nelle
// sue caselle. `comune` e `cap` non nascondono la scheda: rispondono in
// `nellaZona`.
//
// Raggruppata per semestre (`periodiDa`): `periodi` in cima e, in ogni riga di
// `corsi`, le cifre per periodo con gli stessi nomi del totale. `udPreviste` si
// ricalcola per periodo e le quote non si mediano.

import { allieviAttivi, ordinaAllievi } from '../../../domain/calculations.js'
import {
  annoDellaClasse,
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import { scriviIndirizzo } from '../../../domain/addresses.js'
import { matriceCorso } from '../../../domain/courseMatrix.js'
import { udPrevisteDaOrario } from '../../../domain/timetable.js'
import { definisci, errore } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, testo } from '../../schemas.js'
import {
  nellaZona,
  nelPeriodo,
  periodiDa,
  periodo,
  periodoScelto,
  SCHEDA_PERIODO,
  zona,
} from '../common/filters.js'
import { testi as testiComuni } from '../common/common.testi.js'
import { parole } from '../../../domain/words.testi.js'
import { testi as t } from './scheda.testi.js'

const p = () => t().presentazione

/** Le cifre di un corso in un pezzo di tempo: le stesse ai due livelli. */
interface Cifre {
  udPreviste: number
  udAssenza: number
  assenza: number | null
  presenza: number | null
  ritardi: number
  prove: number
  media: number | null
}

/**
 * I campi di `Cifre` nello schema d'uscita, una volta sola: li usano il totale
 * della riga e ogni voce dei suoi `periodi`.
 */
const CIFRE = {
  udPreviste: numero({ aiuto: () => t().udPreviste }),
  udAssenza: numero(),
  assenza: nullabile(numero({ aiuto: () => t().assenza })),
  presenza: nullabile(numero({ aiuto: () => t().presenza })),
  ritardi: numero({ intero: true }),
  prove: numero({ intero: true }),
  media: nullabile(numero({ aiuto: () => t().media })),
}

export const procedura = definisci({
  nome: 'persone.scheda',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    allievoId: identificatore({ aiuto: () => t().allievoId }),
    ...periodo(() => t().oreEVoti),
    ...periodoScelto(() => t().laScheda),
    ...zona(),
  }),
  uscita: oggetto({
    id: testo(),
    cognome: testo(),
    nome: testo(),
    classeId: testo(),
    classe: testo(),
    attivo: booleano({ aiuto: () => t().attivo }),
    dataNascita: testo(),
    indirizzo: testo({ aiuto: () => t().indirizzo }),
    via: testo({ aiuto: () => t().via }),
    cap: testo({ aiuto: () => t().cap }),
    localita: testo({ aiuto: () => t().localita }),
    nellaZona: booleano({ aiuto: () => t().nellaZona }),
    email: testo(),
    emailTutore: testo(),
    azienda: testo(),
    emailDatore: testo(),
    dal: testo(),
    al: testo(),
    // I periodi anche in cima: `semestreId` da solo non dice quando è il semestre.
    periodi: elenco(oggetto(SCHEDA_PERIODO), { aiuto: () => t().periodi }),
    corsi: elenco(oggetto({
      corsoId: testo(),
      corso: testo({ aiuto: () => t().corso }),
      materia: testo(),
      ...CIFRE,
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: () => t().semestreId }),
        ...CIFRE,
      }), { aiuto: () => t().periodiCorso }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'cognome', etichetta: () => parole().cognome },
          { campo: 'nome', etichetta: () => parole().nome },
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'azienda', etichetta: () => p().azienda },
          { campo: 'indirizzo', etichetta: () => p().domicilio },
          { campo: 'email', etichetta: () => p().posta },
          { campo: 'dal', etichetta: () => parole().dal, formato: 'data' },
          { campo: 'al', etichetta: () => parole().al, formato: 'data' },
        ],
      },
      // Si impaginano i periodi, non le cifre per periodo (`corsi[].periodi` è un
      // array dentro un array, oltre quel che `impagina()` regge): la tabella resta
      // sui totali, più la colonna annidata qui sotto, e il dettaglio viaggia nella
      // busta.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: () => p().suQualiPeriodi,
        colonne: [
          { campo: 'etichetta', testo: () => parole().periodo },
          { campo: 'dal', testo: () => parole().dal, formato: 'data' },
          { campo: 'al', testo: () => parole().al, formato: 'data' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'corsi',
        titolo: () => p().corsoPerCorso,
        colonne: [
          { campo: 'corso', testo: () => p().corso },
          { campo: 'udAssenza', testo: () => p().udPerse, formato: 'numero' },
          { campo: 'assenza', testo: () => p().assenza, formato: 'quota' },
          // Le quote di semestre nella stessa cella: il 14% d'anno può essere 4% e 24%.
          { campo: 'periodi', dentro: 'assenza', testo: () => p().perSemestre, formato: 'quota' },
          { campo: 'presenza', testo: () => p().presenza, formato: 'quota' },
          { campo: 'ritardi', testo: () => p().ritardi, formato: 'numero' },
          { campo: 'prove', testo: () => p().prove, formato: 'numero' },
          { campo: 'media', testo: () => p().media, formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const classe = r.classi.find((c) => c.allievi.some((a) => a.id === ingresso.allievoId))
    const allievo = classe?.allievi.find((a) => a.id === ingresso.allievoId)
    if (!classe || !allievo) {
      // Il rimedio nella busta: senza, un modello prova altri id inventati.
      throw errore.nonTrovato('pif', testiComuni().rimedioPersona)
    }

    const anno = annoDellaClasse(r, classe)
    // Il periodo della classe di questa persona, non dell'anno in uso: con più
    // anni aperti non coincidono.
    const { dal, al, periodi } = periodiDa(r, ingresso, classe)
    // Gli stessi allievi con cui la pagina compone la matrice.
    const iscritti = ordinaAllievi(allieviAttivi(classe))

    return {
      id: allievo.id,
      cognome: allievo.cognome,
      nome: allievo.nome,
      classeId: classe.id,
      classe: classe.nome,
      attivo: allievo.attivo,
      dataNascita: allievo.dataNascita ?? '',
      // La riga composta e le caselle: la prima si stampa ed è la chiave della mappa,
      // le seconde servono a filtrare. Vedi `domain/addresses.ts`.
      indirizzo: scriviIndirizzo(allievo.indirizzo),
      via: allievo.indirizzo?.via ?? '',
      cap: allievo.indirizzo?.cap ?? '',
      localita: allievo.indirizzo?.localita ?? '',
      nellaZona: nellaZona(allievo.indirizzo, ingresso),
      email: allievo.email ?? '',
      emailTutore: allievo.emailTutore ?? '',
      azienda: allievo.azienda ?? '',
      emailDatore: allievo.emailDatore ?? '',
      dal,
      al,
      periodi,
      corsi: corsiDellaClasse(r, classe.id).map((corso) => {
        // Le annullate non contano, come nella pagina e in `persone.assenze`.
        const tutte = registroDelCorso(r, corso.id)
          .filter((lezione) => lezione.stato !== 'annullata')
        /**
         * Le cifre di questo corso fra due giorni: una chiamata a `matriceCorso` per
         * periodo, così nessun numero è ricavato per divisione.
         */
        const cifre = (inizio: string, fine: string): Cifre => {
          const lezioni = tutte.filter((l) => nelPeriodo(l.data, inizio, fine))
          const momenti = r.valutazioni.filter(
            (v) => v.corsoId === corso.id && nelPeriodo(v.data, inizio, fine),
          )
          const previste = anno
            ? udPrevisteDaOrario(anno, corso, inizio, fine, r.impostazioni.minutiUd, r.lezioni)
            : 0
          const matrice = matriceCorso(iscritti, lezioni, momenti, r.impostazioni, previste)
          const riga = matrice.righe.find((voce) => voce.allievo.id === allievo.id)

          return {
            udPreviste: matrice.udPreviste,
            udAssenza: riga?.udAssenza ?? 0,
            assenza: riga?.assenza ?? null,
            presenza: riga?.presenza ?? null,
            ritardi: riga?.ritardi ?? 0,
            prove: riga?.prove ?? 0,
            media: riga?.media ?? null,
          }
        }

        return {
          corsoId: corso.id,
          corso: `${classe.nome} — ${materiaDelCorso(r, corso)?.nome ?? corso.titolo}`,
          materia: materiaDelCorso(r, corso)?.nome ?? '',
          // Il totale si conta sull'intervallo intero: quote e media non si ricompongono
          // dai periodi.
          ...cifre(dal, al),
          periodi: periodi.map((suo) => ({
            semestreId: suo.semestreId,
            ...cifre(suo.dal, suo.al),
          })),
        }
      }),
    }
  },
})
