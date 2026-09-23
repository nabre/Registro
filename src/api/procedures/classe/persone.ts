// Chi c'è in una classe, con quel che serve per parlarne.
//
// L'altra metà del buco che `classi.elenco` apre: si sa che la 4a ha ventidue
// persone, e non chi sono. Il contesto manda `classeId` e l'elenco degli id a
// schermo — «chi ha più assenze» si chiede su una classe — e senza questa
// lettura quegli id non avevano un nome da nessuna parte.
//
// **Recapiti sì, ma quelli della scuola.** Escono l'azienda e le caselle a cui
// il registro scrive davvero — persona, rappresentante legale, datore di lavoro
// — perché sono quel che serve per dire «a chi scrivo per giustificare».
//
// **E l'indirizzo, nelle sue caselle.** Prima non usciva affatto: chi lo
// voleva apriva una scheda alla volta, e «chi abita a Lugano» in una classe di
// venticinque erano venticinque schede. Esce in una riga sola — quella che si
// stampa su una busta — e insieme nei pezzi di cui è fatta, perché una riga
// composta non si filtra e non si raggruppa: il NAP dentro una frase non si
// ordina, e il comune dentro una frase non si conta. Con `comune` e `cap` la
// domanda si fa qui, in una chiamata, e la busta dice su che cosa ha risposto.

import { nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import { scriviIndirizzo } from '../../../domain/addresses.js'
import { definisci } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { nellaZona, zona } from '../common/filters.js'
import { esigiClasse } from '../common/register.js'

export const procedura = definisci({
  nome: 'classe.persone',
  versione: 1,
  genere: 'lettura',
  titolo: 'Le persone in formazione di una classe, con recapiti e azienda',
  idempotente: true,
  ingresso: oggetto({
    classeId: identificatore({ aiuto: 'La classe di cui si vuole l’elenco' }),
    ritirati: opzionale(booleano({
      aiuto: 'Vero per avere anche chi non frequenta più: di norma restano fuori',
    })),
    // La zona guarda il **domicilio** e non l'azienda: «chi abita a Lugano» e
    // «chi lavora a Lugano» sono due domande, e una coppia sola di campi che
    // le accontentasse tutte e due risponderebbe sempre alla più larga.
    ...zona(),
  }),
  uscita: oggetto({
    classeId: testo(),
    classe: testo(),
    quante: numero({ intero: true, aiuto: 'Quante persone tornano in questa busta' }),
    comune: testo({ aiuto: 'Il comune chiesto. Vuoto quando non se n’è chiesto' }),
    cap: testo({ aiuto: 'Il NAP chiesto, anche a metà. Vuoto quando non se n’è chiesto' }),
    // Il contraltare della zona, con la stessa ragione di `escluse`: una
    // classe filtrata rispondeva «3 persone» e nient'altro, e chi legge ne
    // deduce una classe di tre. Nullo quando la zona non è stata chiesta.
    fuoriZona: nullabile(numero({
      intero: true,
      aiuto: 'Quante restano fuori perché il domicilio non è nella zona chiesta',
    })),
    // Il contraltare di `quante`: una classe in cui tutti si sono ritirati
    // rispondeva «0 persone» e nient'altro, e chi legge — un modello, uno
    // script — ne deduce una classe vuota. Sono due fatti diversi, e il
    // secondo va detto insieme al primo.
    // Nullo e non zero quando non c'è nessuna da escludere: il pannello scrive
    // una riga per ogni valore che c'è, e «Ritirate: 0» è una riga che parla di
    // un problema che non esiste.
    escluse: nullabile(numero({
      intero: true,
      aiuto: 'Quante restano fuori perché non frequentano più: con «ritirati» a vero rientrano',
    })),
    persone: elenco(oggetto({
      id: testo(),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo({ aiuto: 'Come si scrive parlandone: «Rossi Maria»' }),
      attivo: booleano({ aiuto: 'Falso per chi si è ritirato: resta nel registro' }),
      azienda: testo(),
      email: testo(),
      emailTutore: testo(),
      emailDatore: testo(),
      telefoni: numero({ intero: true, aiuto: 'Quanti numeri ha in rubrica' }),
      indirizzo: testo({ aiuto: 'Il domicilio in una riga, come si scrive su una busta' }),
      via: testo({ aiuto: 'La via con il civico, da sola: è la casella, non la frase' }),
      cap: testo({ aiuto: 'Il NAP: si ordina e si raggruppa, la riga composta no' }),
      localita: testo({ aiuto: 'Il comune: è quel che si conta in «chi viene da dove»' }),
      indirizzoDatore: testo({ aiuto: 'Dove sta l’azienda, in una riga. Vuoto se non c’è' }),
      viaDatore: testo(),
      capDatore: testo(),
      localitaDatore: testo(),
    })),
  }),
  presentazione: {
    titolo: 'Le persone della classe',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classe', etichetta: 'Classe' },
          { campo: 'quante', etichetta: 'Persone', formato: 'numero' },
          { campo: 'escluse', etichetta: 'Ritirate, fuori dal filtro', formato: 'numero' },
          { campo: 'comune', etichetta: 'Comune' },
          { campo: 'cap', etichetta: 'NAP' },
          { campo: 'fuoriZona', etichetta: 'Fuori dalla zona', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'cognome', testo: 'Cognome' },
          { campo: 'nome', testo: 'Nome' },
          { campo: 'azienda', testo: 'Azienda' },
          { campo: 'localita', testo: 'Domicilio' },
          { campo: 'email', testo: 'Posta' },
          { campo: 'attivo', testo: 'Frequenta', formato: 'siNo' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const classe = esigiClasse(ambito, ingresso.classeId)
    const iscritte = ordinaAllievi(
      classe.allievi.filter((allievo) => ingresso.ritirati === true || allievo.attivo),
    )
    const persone = iscritte.filter((allievo) => nellaZona(allievo.indirizzo, ingresso))
    const zonaChiesta = Boolean(ingresso.comune || ingresso.cap)

    return {
      classeId: classe.id,
      classe: classe.nome,
      quante: persone.length,
      comune: ingresso.comune ?? '',
      cap: ingresso.cap ?? '',
      fuoriZona: zonaChiesta ? iscritte.length - persone.length : null,
      escluse: ingresso.ritirati === true
        ? null
        : classe.allievi.filter((allievo) => !allievo.attivo).length || null,
      persone: persone.map((allievo) => ({
        id: allievo.id,
        cognome: allievo.cognome,
        nome: allievo.nome,
        // Scritto già insieme: è il modo in cui il registro nomina una persona
        // — cognome davanti — e ricomporlo altrove vorrebbe dire due ordini
        // diversi per lo stesso nome.
        nomeCompleto: nomeCompleto(allievo),
        attivo: allievo.attivo,
        azienda: allievo.azienda ?? '',
        email: allievo.email ?? '',
        emailTutore: allievo.emailTutore ?? '',
        emailDatore: allievo.emailDatore ?? '',
        // Quanti numeri ha in rubrica, non quali: un elenco di venticinque righe
        // con dentro i numeri di casa è una rubrica, e chi ne vuole uno apre la
        // scheda della persona.
        telefoni: (allievo.telefoni ?? []).filter((t) => t.numero !== '').length,
        // La riga composta **e** le caselle, tutte e due: la prima è quella
        // che si stampa e che la mappa usa come chiave, le seconde sono quelle
        // su cui si filtra. Tenerne una sola vorrebbe dire ricomporla o
        // rispezzarla da qualche altra parte, e le due strade non tornano
        // sempre alla stessa riga — vedi `domain/addresses.ts`.
        indirizzo: scriviIndirizzo(allievo.indirizzo),
        via: allievo.indirizzo?.via ?? '',
        cap: allievo.indirizzo?.cap ?? '',
        localita: allievo.indirizzo?.localita ?? '',
        indirizzoDatore: scriviIndirizzo(allievo.indirizzoDatore),
        viaDatore: allievo.indirizzoDatore?.via ?? '',
        capDatore: allievo.indirizzoDatore?.cap ?? '',
        localitaDatore: allievo.indirizzoDatore?.localita ?? '',
      })),
    }
  },
})
