// I voti di una prova, riga per riga, con i nomi davanti: «chi è andato male
// all'ultima verifica». Esce anche chi deve rifarla (i recuperi del momento),
// per non segnare insufficiente chi ha già rifatto la prova.

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
import { parole } from '../../../domain/words.testi.js'
import { esigiMomento } from './common.js'
import { testi } from './valutazioni.testi.js'

const t = () => testi().voti
const p = () => t().presentazione

export const procedura = definisci({
  nome: 'valutazioni.voti',
  versione: 1,
  genere: 'lettura',
  titolo: () => t().titolo,
  idempotente: true,
  ingresso: oggetto({
    valutazioneId: identificatore({ aiuto: () => t().valutazioneId }),
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
    sufficienza: numero({ aiuto: () => t().sufficienza }),
    media: nullabile(numero({ aiuto: () => t().media })),
    insufficienti: numero({ intero: true }),
    righe: elenco(oggetto({
      allievoId: testo(),
      cognome: testo(),
      nome: testo(),
      voto: nullabile(numero({ aiuto: () => t().voto })),
      assente: booleano(),
      sufficiente: nullabile(booleano({ aiuto: () => t().sufficiente })),
      nota: testo(),
      riconsegnata: testo({ aiuto: () => t().riconsegnata }),
      daRifare: booleano({ aiuto: () => t().daRifare }),
      recuperoIl: testo({ aiuto: () => t().recuperoIl }),
    })),
  }),
  presentazione: {
    titolo: () => p().titolo,
    blocchi: [
      {
        tipo: 'valori',
        campi: [
          { campo: 'titolo', etichetta: () => p().prova },
          { campo: 'corso', etichetta: () => p().corso },
          { campo: 'data', etichetta: () => parole().giorno, formato: 'data' },
          { campo: 'peso', etichetta: () => p().peso, formato: 'numero' },
          { campo: 'media', etichetta: () => p().media, formato: 'numero' },
          { campo: 'insufficienti', etichetta: () => p().insufficienti, formato: 'numero' },
          { campo: 'sufficienza', etichetta: () => p().soglia, formato: 'numero' },
        ],
      },
      {
        tipo: 'tabella',
        da: 'righe',
        colonne: [
          { campo: 'cognome', testo: () => parole().cognome },
          { campo: 'nome', testo: () => parole().nome },
          { campo: 'voto', testo: () => p().voto, formato: 'numero' },
          { campo: 'assente', testo: () => p().assente, formato: 'siNo' },
          { campo: 'daRifare', testo: () => p().daRifare, formato: 'siNo' },
          { campo: 'riconsegnata', testo: () => p().riconsegnata, formato: 'data' },
          { campo: 'nota', testo: () => p().nota },
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
    const recuperi = new Map(
      (momento.recuperi ?? []).map((recupero) => [recupero.allievoId, recupero]),
    )

    // Gli stessi voti su cui conta il dominio (`votiEffettivi`), senza gli assenti.
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
      // La scala copiata il giorno della prova, non quella corrente del registro.
      scalaMin: momento.scala.min,
      scalaMax: momento.scala.max,
      sufficienza: momento.scala.sufficienza,
      media: mediaMomento(momento),
      insufficienti: contati.filter((voto) => voto.valore < momento.scala.sufficienza).length,
      // Le righe sono quelle della classe: anche chi non ha un voto deve comparire.
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
