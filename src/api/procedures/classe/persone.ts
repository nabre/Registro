// Chi c'è in una classe, con quel che serve per parlarne: dà un nome agli id
// che il contesto manda.
//
// Recapiti della scuola: azienda e caselle a cui il registro scrive davvero
// (persona, rappresentante legale, datore di lavoro).
//
// L'indirizzo esce come riga da busta e nelle sue caselle, che si filtrano e
// si raggruppano; con `comune` e `cap` «chi abita a Lugano» è una chiamata sola.

import { nomeCompleto, ordinaAllievi } from '../../../domain/calculations.js'
import { scriviIndirizzo } from '../../../domain/addresses.js'
import { definisci } from '../../contract.js'
import { booleano, elenco, identificatore, nullabile, numero, oggetto, opzionale, testo } from '../../schemas.js'
import { nellaZona, zona } from '../common/filters.js'
import { esigiClasse } from '../common/register.js'
import { parole } from '../../../domain/words.testi.js'
import { testi } from './classe.testi.js'

const t = () => testi().persone
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'classe.persone',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    classeId: identificatore({ aiuto: () => t().classeId }),
    ritirati: opzionale(booleano({ aiuto: () => t().ritirati })),
    // La zona guarda il domicilio, non l'azienda.
    ...zona(),
  }),
  uscita: oggetto({
    classeId: testo(),
    classe: testo(),
    quante: numero({ intero: true, aiuto: () => t().quante }),
    comune: testo({ aiuto: () => t().comune }),
    cap: testo({ aiuto: () => t().cap }),
    // Quanti la zona ha lasciato fuori, per non leggere una classe di tre. Nullo
    // quando la zona non è stata chiesta.
    fuoriZona: nullabile(numero({ intero: true, aiuto: () => t().fuoriZona })),
    // Quanti ritirati sono stati esclusi: «0 persone» non vuol dire classe vuota.
    // Nullo e non zero quando non c'è nessuno da escludere, così il pannello non
    // scrive righe inutili.
    escluse: nullabile(numero({ intero: true, aiuto: () => t().escluse })),
    persone: elenco(oggetto({
      id: testo(),
      cognome: testo(),
      nome: testo(),
      nomeCompleto: testo({ aiuto: () => t().nomeCompleto }),
      attivo: booleano({ aiuto: () => t().attivo }),
      azienda: testo(),
      email: testo(),
      emailTutore: testo(),
      emailDatore: testo(),
      telefoni: numero({ intero: true, aiuto: () => t().telefoni }),
      indirizzo: testo({ aiuto: () => t().indirizzo }),
      via: testo({ aiuto: () => t().via }),
      cap: testo({ aiuto: () => t().capPersona }),
      localita: testo({ aiuto: () => t().localita }),
      indirizzoDatore: testo({ aiuto: () => t().indirizzoDatore }),
      viaDatore: testo(),
      capDatore: testo(),
      localitaDatore: testo(),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'classe', etichetta: () => p().classe },
          { campo: 'quante', etichetta: () => p().persone, formato: 'numero' },
          { campo: 'escluse', etichetta: () => p().ritirate, formato: 'numero' },
          { campo: 'comune', etichetta: () => p().comune },
          { campo: 'cap', etichetta: () => p().nap },
          { campo: 'fuoriZona', etichetta: () => p().fuoriZona, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'persone',
        colonne: [
          { campo: 'cognome', testo: () => parole().cognome },
          { campo: 'nome', testo: () => parole().nome },
          { campo: 'azienda', testo: () => p().azienda },
          { campo: 'localita', testo: () => p().domicilio },
          { campo: 'email', testo: () => p().posta },
          { campo: 'attivo', testo: () => p().frequenta, formato: 'siNo' },
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
        // Il nome come lo scrive il registro, cognome davanti.
        nomeCompleto: nomeCompleto(allievo),
        attivo: allievo.attivo,
        azienda: allievo.azienda ?? '',
        email: allievo.email ?? '',
        emailTutore: allievo.emailTutore ?? '',
        emailDatore: allievo.emailDatore ?? '',
        // Quanti numeri, non quali: per un numero si apre la scheda.
        telefoni: (allievo.telefoni ?? []).filter((t) => t.numero !== '').length,
        // La riga composta e le caselle: la prima si stampa ed è la chiave della
        // mappa, le seconde servono a filtrare. Vedi `domain/addresses.ts`.
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
