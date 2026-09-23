// Il settimo giro di sciame: i conti che sbagliavano di poco e si vedevano molto.
//
// Un voto che diventa 3.8000000000000003 in un PDF, una persona esattamente al
// 7% di assenza che risulta oltre il 7%, un invio a mezzanotte e quaranta che
// porta la data del giorno prima, la IV INF10 che viene prima della IV INF2, un
// titolo lungo che fa fallire la scrittura del file. Ognuna di queste prove era
// rossa prima della correzione che la accompagna.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  arrotondaVoto,
  compleanniDelGiorno,
  creaAllievo,
  creaBloccoAssenze,
  creaClasse,
  creaLezione,
  giornoDi,
  nomeFileArchivio,
  notaFineSemestre,
  oltreSoglia,
  richiesteFirma,
  riepilogoTodo,
  segnalazioniDelCorso,
  votiDellaScala,
} from '../../dist-tests/domain.mjs'
import { scuolaMinima } from '../helpers/register.mjs'

/** Una scala da 1 a 6 con il passo dato. */
function scala (passo) {
  return { min: 1, max: 6, sufficienza: 4, passo }
}

describe('i voti sul passo, senza residui', () => {
  it('con il passo 0,1 ogni voto della tendina si salva uguale', () => {
    assert.equal(arrotondaVoto(3.8, scala(0.1)), 3.8)
    for (const voto of votiDellaScala(scala(0.1))) {
      assert.equal(arrotondaVoto(Number(voto), scala(0.1)), Number(voto), `il ${voto}`)
    }
    for (const voto of votiDellaScala(scala(0.2))) {
      assert.equal(arrotondaVoto(Number(voto), scala(0.2)), Number(voto), `il ${voto}`)
    }
  })

  it('il passo si conta dal minimo della scala, come la tendina', () => {
    // Minimo 1 e passo 0,3: 1; 1,3; 1,6… — non 0,9; 1,2; 1,5.
    assert.equal(arrotondaVoto(1.3, scala(0.3)), 1.3)
    assert.equal(arrotondaVoto(1, scala(0.3)), 1, 'il minimo resta nella scala')
    assert.equal(arrotondaVoto(6, scala(0.3)), 6, 'e anche il massimo')
  })

  it('a quarti e a mezzi non cambia niente', () => {
    assert.equal(arrotondaVoto(4.13, scala(0.25)), 4.25)
    assert.equal(arrotondaVoto(4.12, scala(0.25)), 4)
    assert.equal(arrotondaVoto(4.75, scala(0.5)), 5)
    assert.equal(arrotondaVoto(7.3, { min: 1, max: 10, sufficienza: 6, passo: 0.5 }), 7.5)
  })

  it('la nota di fine semestre: senza residui, e dentro la scala', () => {
    assert.equal(notaFineSemestre(3.77, scala(0.25), 0.1), 3.8)
    assert.equal(notaFineSemestre(4.37, scala(0.25), 0.5), 4.5)
    // Un passo che scavalca il massimo non porta la nota fuori scala.
    assert.equal(notaFineSemestre(6, scala(0.25), 4), 6)
  })
})

describe('la soglia di assenza, esatta', () => {
  it('alla soglia non si è oltre, anche dove la virgola mobile sbaglia', () => {
    for (const soglia of [7, 14, 28, 29, 56, 57]) {
      assert.equal(oltreSoglia(soglia, soglia / 100), false, `${soglia}%`)
    }
    assert.equal(oltreSoglia(7, 0.0701), true)
  })

  it('chi è oltre di poco non legge una percentuale uguale alla soglia', () => {
    // Tre martedì da due UD: sei previste. Due perse sono il 33,3%, e con la
    // soglia al 33 la persona è oltre: «33% di assenza» direbbe il contrario.
    const base = scuolaMinima()
    base.corso.orario = [{ giorno: 2, inizio: '08:00', durataMin: 90 }]
    for (const [i, data] of ['2026-09-15', '2026-09-22', '2026-09-29'].entries()) {
      const lezione = creaLezione(base.corso.id, data, '08:00', 90)
      const stati = i === 0 ? ['assente', 'assente'] : ['presente', 'presente']
      lezione.presenze = [{ allievoId: base.rossi.id, stati }]
      base.registro.lezioni.push(lezione)
    }
    base.registro.impostazioni.sogliaAssenza = 33
    const periodo = { id: 'p', numero: 1, etichetta: 'prova', inizio: '2026-09-15', fine: '2026-09-29' }

    const [segnalazione] = segnalazioniDelCorso(base.registro, base.corso, periodo)

    assert.equal(segnalazione.allievoId, base.rossi.id)
    assert.equal(segnalazione.percento, 33.4)
  })
})

describe('il giorno di un istante', () => {
  it('si legge sull’orologio locale, non in UTC', () => {
    // Mezzanotte e quaranta del 15 marzo, qui: in UTC può essere ancora il 14.
    const istante = new Date(2026, 2, 15, 0, 40).toISOString()
    assert.equal(giornoDi(istante), '2026-03-15')
    const sera = new Date(2026, 2, 15, 23, 50).toISOString()
    assert.equal(giornoDi(sera), '2026-03-15')
  })

  it('una data senza ora resta quella', () => {
    assert.equal(giornoDi('2026-03-15'), '2026-03-15')
    assert.equal(giornoDi('2026-03-15 e poi'), '2026-03-15', 'un resto che non è un’ora non la sposta')
    assert.equal(giornoDi('2026-02-30T10:00:00Z'), null)
  })
})

describe('le classi in ordine numerico', () => {
  /** Due classi dello stesso anno, INF10 e INF2, con una persona ciascuna nata lo stesso giorno. */
  function dueClassi () {
    const base = scuolaMinima()
    const classi = ['INF10', 'INF2'].map((nome) => {
      const classe = creaClasse(base.anno.id, nome)
      const allievo = creaAllievo(`Neri ${nome}`, 'Ugo')
      allievo.dataNascita = '2008-10-19'
      classe.allievi.push(allievo)
      base.registro.classi.push(classe)
      return classe
    })
    return { ...base, classi }
  }

  it('nei compleanni del giorno', () => {
    const { registro, anno } = dueClassi()
    const giorno = compleanniDelGiorno(registro, anno.id, '2026-10-19')
    assert.deepEqual(giorno.map((c) => c.classe), ['INF2', 'INF10'])
  })

  it('nel riepilogo delle cose da fare', () => {
    const { registro, classi } = dueClassi()
    const riepilogo = riepilogoTodo(registro, classi, [], '2026-10-19')
    assert.deepEqual(riepilogo.classi.map((c) => c.classe), ['INF2', 'INF10'])
  })

  it('nelle richieste di firma', () => {
    const { classi } = dueClassi()
    const fascicoli = classi.map((classe) => ({
      classeId: classe.id,
      assenze: [
        {
          ...creaBloccoAssenze('2025-09-01', '2026-01-31', undefined, '1° semestre'),
          righe: [
            {
              allievoId: classe.allievi[0].id,
              fogli: [{ tipo: 'assenze', firmato: false, file: 'a.pdf', nome: 'a.pdf', aggiuntoIl: '2026-01-10' }],
              invio: null,
              note: '',
            },
          ],
        },
      ],
    }))
    const gruppi = richiesteFirma({ fascicoli }, classi)
    assert.deepEqual(gruppi.daSpedire.map((r) => r.classe), ['INF2', 'INF10'])
  })
})

describe('il nome di un file archiviato', () => {
  it('non supera i limiti del disco, per quanto lungo sia il dettaglio', () => {
    const nome = nomeFileArchivio('I MEC A', 'Rossi Maria', 'Verifica', 'x'.repeat(300), 'pdf')
    assert.ok(nome.length <= 160, `${nome.length} caratteri`)
    assert.ok(nome.startsWith('I MEC A_Verifica_Rossi Maria_x'))
    assert.ok(nome.endsWith('x.pdf'))
  })

  it('il taglio non lascia punti né spazi prima dell’estensione', () => {
    // «I MEC A_» sono otto caratteri: il punto e lo spazio cadono al 149 e al 150.
    const nome = nomeFileArchivio('I MEC A', null, `${'b'.repeat(140)}. ${'c'.repeat(100)}`, null, '.pdf')
    assert.equal(nome, `I MEC A_${'b'.repeat(140)}.pdf`)
  })

  it('i nomi corti restano quelli di prima', () => {
    const nome = nomeFileArchivio('I MEC A', 'Rossi Maria', 'Verifica', null, 'PDF')
    assert.equal(nome, 'I MEC A_Verifica_Rossi Maria.pdf')
  })
})
