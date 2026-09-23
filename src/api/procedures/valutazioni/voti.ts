// I voti di una prova, riga per riga, con i nomi davanti.
//
// La seconda metà di `valutazioni.elenco`: là ci sono le prove, qui c'è com'è
// andata. È la lettura che permette di rispondere a «chi è andato male
// all'ultima verifica», che oggi finiva in un elenco di medie in cui non si
// distingue una prova dall'altra.
//
// Esce anche **chi deve rifarla**: i recuperi sono una tabella a parte nel
// momento di valutazione — chi rifà, quando, e se è stato dispensato — e
// tenerli fuori vorrebbe dire una riga «insufficiente» accanto a una persona
// che quella prova l'ha già rifatta.

import { mediaMomento, ordinaAllievi, votiEffettivi } from '../../../domain/calculations.js'
import { classeDelMomento, materiaDelCorso, corsoPerId } from '../../../domain/courses.js'
import { definisci } from '../../contract.js'
import {
  booleano,
  elenco,
  identificatore,
  nullabile,
  numero,
  oggetto,
  testo,
} from '../../schemas.js'
import { esigiMomento } from './common.js'

export const procedura = definisci({
  nome: 'valutazioni.voti',
  versione: 1,
  genere: 'lettura',
  titolo: 'I voti di un momento di valutazione, riga per riga',
  idempotente: true,
  ingresso: oggetto({
    valutazioneId: identificatore({ aiuto: 'Il momento, come lo elenca «valutazioni.elenco»' }),
  }),
  uscita: oggetto({
    id: testo(),
    titolo: testo(),
    tipo: testo(),
    data: testo(),
    peso: numero(),
    corsoId: testo(),
    corso: testo(),
    classe: testo(),
    scalaMin: numero(),
    scalaMax: numero(),
    sufficienza: numero({ aiuto: 'La soglia di quel giorno: la scala è una copia, e non cambia più' }),
    media: nullabile(numero({
      aiuto: 'La media dei voti che contano, nulla se non ce n’è nessuno: chi era assente non entra',
    })),
    insufficienti: numero({ intero: true }),
    righe: elenco(oggetto({
      allievoId: testo(),
      cognome: testo(),
      nome: testo(),
      voto: nullabile(numero({ aiuto: 'Nullo finché il voto non c’è: «non ancora messo» non è zero' })),
      assente: booleano(),
      sufficiente: nullabile(booleano({ aiuto: 'Nullo dove il voto non c’è' })),
      nota: testo(),
      riconsegnata: testo({ aiuto: 'Il giorno in cui ha riavuto il foglio corretto' }),
      daRifare: booleano({ aiuto: 'Se è nella tabella dei recuperi e non è stato dispensato' }),
      recuperoIl: testo({ aiuto: 'Quando rifà la prova, se è stato fissato' }),
    })),
  }),
  presentazione: {
    titolo: 'I voti della prova',
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'titolo', etichetta: 'Prova' },
          { campo: 'corso', etichetta: 'Corso' },
          { campo: 'data', etichetta: 'Giorno', formato: 'data' },
          { campo: 'peso', etichetta: 'Peso', formato: 'numero' },
          { campo: 'media', etichetta: 'Media', formato: 'numero' },
          { campo: 'insufficienti', etichetta: 'Insufficienti', formato: 'numero' },
          { campo: 'sufficienza', etichetta: 'Soglia', formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: 'Cognome' },
          { campo: 'nome', testo: 'Nome' },
          { campo: 'voto', testo: 'Voto', formato: 'numero' },
          { campo: 'assente', testo: 'Assente', formato: 'siNo' },
          { campo: 'daRifare', testo: 'Da rifare', formato: 'siNo' },
          { campo: 'riconsegnata', testo: 'Riconsegnata', formato: 'data' },
          { campo: 'nota', testo: 'Nota' },
        ],
      },
    ],
  },
  esegui: (ambito, ingresso) => {
    const r = ambito.contesto.registro
    const momento = esigiMomento(ambito, ingresso.valutazioneId)
    const classe = classeDelMomento(r, momento)
    const corso = corsoPerId(r, momento.corsoId)
    const persone = ordinaAllievi(classe?.allievi ?? [])
    const voti = new Map(momento.voti.map((voto) => [voto.allievoId, voto]))
    const recuperi = new Map((momento.recuperi ?? []).map((recupero) => [recupero.allievoId, recupero]))

    // Gli stessi voti su cui conta il dominio, e non un filtro rifatto qui:
    // quello di prima teneva dentro chi era segnato assente, e la prova si
    // leggeva con due medie diverse a seconda di dove la si guardava.
    const contati = votiEffettivi(momento.voti)

    return {
      id: momento.id,
      titolo: momento.titolo,
      tipo: momento.tipo,
      data: momento.data,
      peso: momento.peso,
      corsoId: momento.corsoId,
      corso: [classe?.nome, corso ? materiaDelCorso(r, corso)?.nome : null]
        .filter(Boolean).join(' — ') || corso?.titolo || '—',
      classe: classe?.nome ?? '—',
      // La scala è quella copiata il giorno della prova: cambiando quella del
      // registro i voti già dati non si riscrivono, e la soglia con cui si
      // giudica questa prova resta questa.
      scalaMin: momento.scala.min,
      scalaMax: momento.scala.max,
      sufficienza: momento.scala.sufficienza,
      media: mediaMomento(momento),
      insufficienti: contati.filter((voto) => voto.valore < momento.scala.sufficienza).length,
      // Le righe sono quelle della classe e non quelle dei voti: chi non ha
      // ancora un voto deve comparire, perché «chi manca» è metà della domanda.
      righe: persone.map((allievo) => {
        const voto = voti.get(allievo.id)
        const recupero = recuperi.get(allievo.id)
        return {
          allievoId: allievo.id,
          cognome: allievo.cognome,
          nome: allievo.nome,
          voto: voto?.valore ?? null,
          assente: voto?.assente ?? false,
          sufficiente: voto?.valore === null || voto?.valore === undefined
            ? null
            : voto.valore >= momento.scala.sufficienza,
          nota: voto?.nota ?? '',
          riconsegnata: voto?.riconsegnataIl ?? '',
          daRifare: Boolean(recupero) && recupero?.dispensato !== true,
          recuperoIl: recupero?.previstoIl ?? '',
        }
      }),
    }
  },
})
