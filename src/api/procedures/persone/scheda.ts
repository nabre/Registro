// Una persona in formazione, tutta insieme.
//
// È la lettura che chiude il giro degli id del contesto: `allievoId` c'era in
// ogni busta e non lo prendeva nessuno. Chi chiede «com'è messo Rossi» stava
// guardando la sua scheda, e la risposta era «non lo so».
//
// Quel che esce è **la scheda come la si legge a schermo**, non la riga
// dell'anagrafica: i recapiti, l'azienda, e poi il perché si guarda una scheda
// — in quali corsi sta, quante ore ha perso, che media ha. I conti non si
// rifanno qui: li dà `matriceCorso`, cioè la stessa funzione da cui escono le
// tabelle della pagina e la busta di `corso.presenze`. Una seconda formula per
// la media di una persona sarebbe la terza cifra che il dominio esiste apposta
// per non far nascere.
//
// **L'indirizzo esce due volte**, e non è una ripetizione: `indirizzo` è la
// riga come si scrive su una busta — ed è anche la chiave con cui la mappa
// ritrova il punto — mentre `via`, `cap` e `localita` sono le caselle da cui
// quella riga è composta. Con la sola riga «di dove è questa persona» si
// risponde leggendola con gli occhi: il NAP dentro una frase non si confronta
// e il comune dentro una frase non si conta, e chi chiama da fuori finiva a
// spezzarla per conto suo — cioè a riscrivere `leggiIndirizzo` peggio.
//
// `comune` e `cap` in ingresso non nascondono la scheda: una persona chiesta
// per id c'è, e sparire perché abita altrove si leggerebbe come «non trovata».
// Rispondono nel campo `nellaZona`, che è la stessa domanda detta in modo che
// una scheda possa portarla — vero anche quando la zona non è stata chiesta,
// perché senza filtro tutti sono nella zona.
//
// ------------------------------------------------------------- il periodo
//
// `dal` e `al` venivano da qui dentro: due campi dichiarati a mano, con un
// aiuto scritto a mano, e il periodo risolto a mano con `intervalloAnno`. È
// esattamente il difetto per cui `common/filters.ts` esiste — un filtro scritto
// ogni volta è un filtro che ogni volta si comporta un po' diversamente — e il
// guasto qui era di quelli che non si vedono: `intervalloAnno` torna `null`
// quando l'anno **non ha semestri**, e il ripiego scritto in questa procedura
// era `'0000-01-01'`/`'9999-12-31'`. Cioè: su un anno senza semestri la scheda
// non contava l'anno, contava **tutto il tempo** — ogni ora e ogni voto mai
// registrati, di qualunque anno, dentro la colonna «assenza» di un anno solo.
// `risolviPeriodo`, che sta sotto a `periodiDa`, ripiega invece su
// `anno.inizio`/`anno.fine`, che è il periodo che quell'anno dichiara di essere.
//
// ------------------------------------------------------------- i periodi
//
// Una scheda che dice «14% di assenza» sull'anno nasconde che al primo
// semestre era il 4% e al secondo il 24%, ed è esattamente la cosa per cui un
// tutore apre questa scheda: non il livello, la **china**. Un numero solo
// spalmato su dieci mesi è la media di chi è migliorato e di chi è crollato,
// e le due si leggono identiche.
//
// Quindi il raggruppamento per periodo — dove «periodo» è il semestre, la
// scansione su cui il registro raggruppa le valutazioni e su cui si compilano
// le pagelle — è la **forma normale** della risposta, non un di più che si
// chiede. Senza `semestreId` la busta porta l'array dei valori rispetto ai
// periodi; con `semestreId` ne porta uno solo. L'array resta un array anche
// quando l'anno non ha semestri — un periodo con `semestreId` vuoto — così chi
// legge la busta non deve scrivere due strade.
//
// Questa scheda è di **una persona sola** e la sua busta ha una forma diversa
// dalle altre tre letture della famiglia: non ha righe per persona, ha un
// elenco `corsi`. Il raggruppamento va quindi **dentro ogni riga di `corsi`**,
// più un elenco `periodi` in cima che dice quali sono e su quali giorni veri.
// I nomi dei campi sono **gli stessi ai due livelli** (`udPreviste`,
// `udAssenza`, `assenza`, `presenza`, `ritardi`, `prove`, `media`): due nomi
// per la stessa cosa è il modo più sicuro di far sbagliare chi legge.
//
// Tre cose che i conti per periodo non sono, e che nessuna riscrittura deve
// far diventare:
//
//   1. **`udPreviste` non si divide.** Viene da `udPrevisteDaOrario` con gli
//      estremi di quel periodo, una chiamata per periodo. È il denominatore
//      dei rapporti stampati, e ricavarlo dimezzando il totale darebbe quote
//      che non tornano col foglio che qualcuno firma — un semestre di
//      vacanze e uno pieno non hanno lo stesso monte ore.
//   2. **Le quote non si mediano.** `assenza` e `presenza` di un periodo si
//      ricalcolano sui denominatori **di quel periodo**. La media di due quote
//      è la quota giusta solo quando i due denominatori sono uguali, e non lo
//      sono mai.
//   3. **La media non è la media delle medie.** Quella di un periodo è pesata
//      sulle prove di quel periodo; quella totale resta calcolata come oggi,
//      cioè su tutte le prove dell'intervallo in un mucchio solo. Chi fa sei
//      prove al primo semestre e una al secondo non ha una media d'anno a metà
//      strada fra le due. Sta scritto qui perché è la «semplificazione» che
//      qualcuno farebbe domani credendo di ripulire.
//
// `matriceCorso` un intervallo non lo prende: vuole le lezioni e i momenti
// **già filtrati** da chi chiama — «il periodo è una scelta di chi guarda, non
// una proprietà del corso», sta scritto lì — più le UD previste. Quindi per
// periodo le si rifiltra e la si richiama: i conti restano suoi, e qui non
// nasce nessuna seconda formula.

import { allieviAttivi, ordinaAllievi } from '../../../domain/calculations.js'
import {
  annoDellaClasse,
  corsiDellaClasse,
  materiaDelCorso,
  registroDelCorso,
} from '../../../domain/courses.js'
import { scriviIndirizzo } from '../../../domain/addresses.js'
import { PIF } from '../../../domain/lexicon.js'
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
 * I campi di `Cifre` nello schema d'uscita, dichiarati una volta sola.
 *
 * Li usano il totale della riga e ogni voce dei suoi `periodi`: scritti due
 * volte si sarebbero separati alla prima aggiunta, e una riga che porta un
 * campo che i suoi periodi non portano è la busta in cui chi legge comincia a
 * sommare a mano.
 */
const CIFRE = {
  udPreviste: numero({ aiuto: 'Le UD che l’orario prevedeva nel periodo' }),
  udAssenza: numero(),
  assenza: nullabile(numero({ aiuto: 'Quota di assenza sulle UD PREVISTE, da 0 a 1' })),
  presenza: nullabile(numero({ aiuto: 'Quota di presenza sulle UD CON APPELLO' })),
  ritardi: numero({ intero: true }),
  prove: numero({ intero: true }),
  media: nullabile(numero({ aiuto: 'Media pesata dei voti di quel corso' })),
}

export const procedura = definisci({
  nome: 'persone.scheda',
  versione: 1,
  genere: 'lettura',
  titolo: 'La scheda di una persona in formazione: anagrafica, corsi, presenze, per semestre',
  idempotente: true,
  ingresso: oggetto({
    allievoId: identificatore({ aiuto: 'La persona di cui si vuole la scheda' }),
    ...periodo('le ore e i voti contati'),
    ...periodoScelto('la scheda'),
    ...zona(),
  }),
  uscita: oggetto({
    id: testo(),
    cognome: testo(),
    nome: testo(),
    classeId: testo(),
    classe: testo(),
    attivo: booleano({ aiuto: 'Falso per chi si è ritirato' }),
    dataNascita: testo(),
    indirizzo: testo({ aiuto: 'In una riga, come si scrive su una busta' }),
    via: testo({ aiuto: 'La via con il civico, da sola: è la casella, non la frase' }),
    cap: testo({ aiuto: 'Il NAP: si confronta e si raggruppa, la riga composta no' }),
    localita: testo({ aiuto: 'Il comune: è quel che si conta in «chi viene da dove»' }),
    nellaZona: booleano({
      aiuto: 'Se il domicilio è nella zona chiesta. Vero quando non se n’è chiesta nessuna',
    }),
    email: testo(),
    emailTutore: testo(),
    azienda: testo(),
    emailDatore: testo(),
    dal: testo(),
    al: testo(),
    // I periodi in cima, e non solo dentro i corsi: `semestreId` da solo è un
    // id, e chi legge una voce di `corsi.periodi` deve poter sapere **quando**
    // è quel semestre senza una seconda chiamata. Qui stanno i nomi e i giorni
    // veri; là dentro stanno le cifre.
    periodi: elenco(oggetto(SCHEDA_PERIODO), {
      aiuto: 'I semestri su cui si è contato a parte. Uno solo se se n’è chiesto uno',
    }),
    corsi: elenco(oggetto({
      corsoId: testo(),
      corso: testo({ aiuto: 'Come si legge: «I MEC A — Matematica»' }),
      materia: testo(),
      ...CIFRE,
      periodi: elenco(oggetto({
        semestreId: testo({ aiuto: 'La voce di «periodi» in cima che dice quando è' }),
        ...CIFRE,
      }), {
        aiuto: 'Le stesse cifre, semestre per semestre: il totale nasconde la china',
      }),
    })),
  }),
  presentazione: {
    titolo: 'La scheda della persona',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'cognome', etichetta: 'Cognome' },
          { campo: 'nome', etichetta: 'Nome' },
          { campo: 'classe', etichetta: 'Classe' },
          { campo: 'azienda', etichetta: 'Azienda' },
          { campo: 'indirizzo', etichetta: 'Domicilio' },
          { campo: 'email', etichetta: 'Posta' },
          { campo: 'dal', etichetta: 'Dal', formato: 'data' },
          { campo: 'al', etichetta: 'Al', formato: 'data' },
        ],
      },
      // I periodi si impaginano, le cifre per periodo no: `impagina()` legge
      // una chiave dell'uscita e ne fa una tabella, e `corsi[].periodi` è un
      // array **dentro** un array — nessuno dei tre generi di blocco lo regge.
      // Quella tabella resta quindi quella dei totali, e il dettaglio per
      // semestre viaggia nella busta per chi la legge (il modello, la riga di
      // comando) ma non a schermo. Vedi il rapporto: inventare qui un quarto
      // genere vorrebbe dire cambiare `presentation.ts`, che non è di questa
      // procedura.
      {
        tipo: 'tabella',
        da: 'periodi',
        titolo: 'Su quali periodi si è contato',
        colonne: [
          { campo: 'etichetta', testo: 'Periodo' },
          { campo: 'dal', testo: 'Dal', formato: 'data' },
          { campo: 'al', testo: 'Al', formato: 'data' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'corsi',
        titolo: 'Come sta, corso per corso',
        colonne: [
          { campo: 'corso', testo: 'Corso' },
          { campo: 'udAssenza', testo: 'UD perse', formato: 'numero' },
          { campo: 'assenza', testo: 'Assenza (su previste)', formato: 'quota' },
          // Le due quote di semestre nella stessa cella: una scheda che dice «14%»
          // sull'anno nasconde che al primo era il 4% e al secondo il 24%, ed è
          // l'unica cosa per cui un tutore la guarda.
          { campo: 'periodi', dentro: 'assenza', testo: 'Per semestre', formato: 'quota' },
          { campo: 'presenza', testo: 'Presenza (su appello)', formato: 'quota' },
          { campo: 'ritardi', testo: 'Ritardi', formato: 'numero' },
          { campo: 'prove', testo: 'Prove', formato: 'numero' },
          { campo: 'media', testo: 'Media', formato: 'numero' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const classe = r.classi.find((c) => c.allievi.some((a) => a.id === ingresso.allievoId))
    const allievo = classe?.allievi.find((a) => a.id === ingresso.allievoId)
    if (!classe || !allievo) {
      // La via d'uscita, scritta nella busta: senza, un modello che non trova
      // l'id ne prova un altro, e il giornale ne ha registrati dieci di fila.
      throw errore.nonTrovato(
        PIF,
        'Le persone si cercano per nome con «persone.cerca», o si elencano per classe con ' +
        '«classe.persone»: l’id da passare qui viene da lì.',
      )
    }

    const anno = annoDellaClasse(r, classe)
    // Il periodo **della classe di questa persona**, non dell'anno in uso: in
    // un registro con più anni aperti non è lo stesso per tutte, e una scheda
    // che dichiara un periodo avendo contato su un altro è la busta in cui le
    // cifre sono giuste e l'intestazione no.
    const { dal, al, periodi } = periodiDa(r, ingresso, classe)
    // Gli stessi allievi con cui la pagina compone la matrice: il conto di una
    // persona sola si prende dalla riga sua, non da una formula scritta qui.
    const iscritti = ordinaAllievi(allieviAttivi(classe))

    return {
      id: allievo.id,
      cognome: allievo.cognome,
      nome: allievo.nome,
      classeId: classe.id,
      classe: classe.nome,
      attivo: allievo.attivo,
      dataNascita: allievo.dataNascita ?? '',
      // La riga composta **e** le caselle: la prima è quella che si stampa e
      // che la mappa usa come chiave, le seconde sono quelle su cui si
      // filtra. Ricomporre l'una dalle altre fuori di qui vorrebbe dire due
      // scritture diverse dello stesso indirizzo — vedi `domain/addresses.ts`.
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
        const tutte = registroDelCorso(r, corso.id)
        /**
         * Le cifre di questo corso fra due giorni.
         *
         * Una chiamata a `matriceCorso` per ogni pezzo di tempo, con le sue
         * lezioni, i suoi momenti e le sue UD previste. Costa una passata in
         * più per periodo, e in cambio non c'è nessuna cifra ricavata per
         * divisione: ogni numero della busta è stato contato sui giorni che
         * dichiara.
         */
        const cifre = (inizio: string, fine: string): Cifre => {
          const lezioni = tutte.filter((l) => nelPeriodo(l.data, inizio, fine))
          const momenti = r.valutazioni.filter(
            (v) => v.corsoId === corso.id && nelPeriodo(v.data, inizio, fine),
          )
          const previste = anno ? udPrevisteDaOrario(anno, corso, inizio, fine) : 0
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
          // Il totale si conta sull'intervallo intero e non si ricompone dai
          // periodi: per `udAssenza`, `ritardi` e `prove` verrebbe uguale, per
          // `assenza`, `presenza` e `media` no — e una busta in cui tre campi
          // su sette sono ricostruiti e quattro contati è una busta in cui
          // nessuno sa più quali.
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
