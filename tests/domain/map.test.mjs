// La mappa: la geometria, la rubrica degli indirizzi, e chi sta dove sta un altro.
//
// Tre cose queste prove tengono ferme.
//
// La **proiezione**, che non è un dettaglio grafico: i tasselli che il registro
// scarica sono disegnati in Web Mercator, e un punto proiettato in un altro modo
// finisce accanto alla strada sbagliata. Qui si fissano i due fatti che lo
// garantiscono — l'andata e il ritorno si chiudono, e il meridiano zero cade a
// metà del piano.
//
// La **chiave sull'indirizzo**. Le coordinate stanno in una raccolta a sé, e la
// chiave è l'indirizzo ridotto alla forma confrontabile: da lì viene che una
// domanda al geocodificatore vale per tutti quelli che a quell'indirizzo
// stanno, e che due scritture diverse della stessa via non sono due portoni.
//
// I **legami**: chi condivide la casa, chi condivide la ditta. Sono il fatto per
// cui la mappa si guarda, e devono comparire soltanto dove ci sono davvero — una
// persona che abita dove lavora non è un legame con nessuno.

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  leggiIndirizzo,
  SEDE,
  chiaveIndirizzo,
  collocato,
  condivisioni,
  contiDellaMappa,
  coordinataDi,
  creaAllievo,
  creaAnno,
  creaClasse,
  distanzaKm,
  indirizziDaRisolvere,
  indirizziUsati,
  inquadraturaPer,
  posizioneNelRiquadro,
  proietta,
  riproietta,
  rubricaDi,
  scomponiIndirizzo,
  scriviDistanza,
  segniDellaMappa,
  tasselliVisibili,
  tragitti,
} from '../../dist-tests/domain.mjs'

const TUTTO = { domicili: true, lavori: true, sede: true }

const CASA_LUGANO = 'Via Zurigo 1, 6900 Lugano'
const CASA_BIASCA = 'Via Cantonale 9, 6710 Biasca'
const DITTA = 'Via Industria 2, 6828 Balerna'

/** Una voce della rubrica, come la scriverebbe la geocodifica. */
function punto (indirizzo, lat, lon) {
  return {
    chiave: chiaveIndirizzo(indirizzo),
    indirizzo,
    lat,
    lon,
    trovatoIl: '2026-09-15T08:00:00.000Z',
  }
}

/**
 * Una classe di tre: due fratelli nella stessa casa, e due che fanno il
 * tirocinio nella stessa ditta. È il minimo per provare i due legami.
 */
function classeConIndirizzi () {
  const anno = creaAnno('2026-09-01', '2027-06-30')
  const classe = creaClasse(anno.id, 'I MEC A')
  classe.colore = '#123456'

  const rossi = creaAllievo('Rossi', 'Maria')
  rossi.indirizzo = leggiIndirizzo(CASA_LUGANO)
  rossi.azienda = 'Officina Bianchi'
  rossi.indirizzoDatore = leggiIndirizzo(DITTA)

  const rossiDue = creaAllievo('Rossi', 'Paolo')
  // La stessa casa scritta un po' diversamente: per il registro è la stessa.
  rossiDue.indirizzo = leggiIndirizzo('via zurigo 1,  6900 Lugano')
  rossiDue.azienda = 'Officina Bianchi'
  rossiDue.indirizzoDatore = leggiIndirizzo(DITTA)

  const verdi = creaAllievo('Verdi', 'Anna')
  verdi.indirizzo = leggiIndirizzo(CASA_BIASCA)

  classe.allievi.push(rossi, rossiDue, verdi)
  return { classe, rossi, rossiDue, verdi }
}

function rubricaPiena () {
  return rubricaDi({
    coordinate: [
      punto(CASA_LUGANO, 46.005, 8.951),
      punto(CASA_BIASCA, 46.36, 8.97),
      punto(DITTA, 45.845, 9.005),
    ],
  })
}

describe('la chiave di un indirizzo', () => {
  it('non distingue maiuscole, spazi doppi e virgole attaccate', () => {
    assert.equal(
      chiaveIndirizzo('Via Zurigo 1,6900  Lugano'),
      chiaveIndirizzo('  via zurigo 1, 6900 Lugano '),
    )
  })

  it('distingue due indirizzi diversi', () => {
    assert.notEqual(chiaveIndirizzo('Via Zurigo 1, 6900 Lugano'), chiaveIndirizzo('Via Zurigo 2, 6900 Lugano'))
  })

  it('ritrova il punto di un indirizzo scritto in un altro modo', () => {
    const rubrica = rubricaPiena()
    const trovato = coordinataDi(rubrica, 'VIA ZURIGO 1,6900 LUGANO')
    assert.ok(trovato)
    assert.equal(trovato.lat, 46.005)
  })
})

describe('gli indirizzi dell’anagrafica', () => {
  it('si raccolgono per indirizzo, non per persona', () => {
    const { classe } = classeConIndirizzi()
    const usati = indirizziUsati([classe], rubricaPiena())
    // Tre indirizzi distinti: due case e una ditta — non cinque righe.
    assert.equal(usati.length, 3)
    const ditta = usati.find((v) => v.chiave === chiaveIndirizzo(DITTA))
    assert.equal(ditta.usi.length, 2)
    assert.deepEqual(
      ditta.usi.map((u) => u.genere),
      ['lavoro', 'lavoro'],
    )
  })

  it('una domanda per indirizzo, anche quando lo usano in tanti', () => {
    const { classe } = classeConIndirizzi()
    const vuota = rubricaDi({ coordinate: [] })
    const daFare = indirizziDaRisolvere([classe], vuota)
    assert.equal(daFare.length, 3)
  })

  it('con la rubbrica piena non resta niente da chiedere', () => {
    const { classe } = classeConIndirizzi()
    assert.equal(indirizziDaRisolvere([classe], rubricaPiena()).length, 0)
    assert.equal(indirizziDaRisolvere([classe], rubricaPiena(), { rifaiTutto: true }).length, 3)
  })

  it('un indirizzo cambiato torna da cercare, e il punto di prima resta per chi non l’ha cambiato', () => {
    const { classe, rossi } = classeConIndirizzi()
    rossi.indirizzo = leggiIndirizzo('Via Nuova 7, 6900 Lugano')
    const rubrica = rubricaPiena()
    assert.equal(collocato(rubrica, rossi, 'domicilio'), false)
    // Il fratello non si è mosso: la sua casa è ancora sulla mappa.
    assert.equal(collocato(rubrica, classe.allievi[1], 'domicilio'), true)
    const daFare = indirizziDaRisolvere([classe], rubrica)
    assert.equal(daFare.length, 1)
    assert.equal(daFare[0].indirizzo, 'Via Nuova 7, 6900 Lugano')
  })

  it('chi si è ritirato non porta indirizzi', () => {
    const { classe, verdi } = classeConIndirizzi()
    verdi.attivo = false
    const usati = indirizziUsati([classe], rubricaPiena())
    assert.equal(usati.some((v) => v.chiave === chiaveIndirizzo(CASA_BIASCA)), false)
  })
})

describe('i punti della mappa', () => {
  it('un segnaposto per indirizzo, con dentro tutti quelli che ci stanno', () => {
    const { classe } = classeConIndirizzi()
    const segni = segniDellaMappa([classe], TUTTO, rubricaPiena())
    // Tre indirizzi più la sede.
    assert.equal(segni.length, 4)
    const ditta = segni.find((s) => s.chiave === chiaveIndirizzo(DITTA))
    assert.equal(ditta.usi.length, 2)
    assert.equal(ditta.titolo, 'Officina Bianchi')
    assert.equal(ditta.genere, 'lavoro')
  })

  it('la casa dei due fratelli è un punto solo', () => {
    const { classe } = classeConIndirizzi()
    const segni = segniDellaMappa([classe], TUTTO, rubricaPiena())
    const casa = segni.find((s) => s.chiave === chiaveIndirizzo(CASA_LUGANO))
    assert.equal(casa.usi.length, 2)
    assert.equal(casa.titolo, '2 persone')
  })

  it('la casa porta il colore della classe, e la distanza dalla sede', () => {
    const { classe } = classeConIndirizzi()
    const casa = segniDellaMappa([classe], TUTTO, rubricaPiena()).find(
      (s) => s.chiave === chiaveIndirizzo(CASA_LUGANO),
    )
    assert.equal(casa.colore, '#123456')
    assert.ok(casa.distanzaKm > 0)
  })

  it('l’azienda resta neutra: non è di nessuna classe', () => {
    const { classe } = classeConIndirizzi()
    const ditta = segniDellaMappa([classe], TUTTO, rubricaPiena()).find(
      (s) => s.chiave === chiaveIndirizzo(DITTA),
    )
    assert.equal(ditta.colore, undefined)
  })

  it('una casa divisa fra due classi non prende nessuno dei due colori', () => {
    const { classe } = classeConIndirizzi()
    const anno = creaAnno('2026-09-01', '2027-06-30')
    const altra = creaClasse(anno.id, 'I MEC B')
    altra.colore = '#abcdef'
    const ospite = creaAllievo('Neri', 'Ivo')
    ospite.indirizzo = leggiIndirizzo(CASA_LUGANO)
    altra.allievi.push(ospite)
    const casa = segniDellaMappa([classe, altra], TUTTO, rubricaPiena()).find(
      (s) => s.chiave === chiaveIndirizzo(CASA_LUGANO),
    )
    assert.equal(casa.colore, undefined)
  })

  it('gli strati spengono gli usi, non gli indirizzi', () => {
    const { classe } = classeConIndirizzi()
    const soloCase = segniDellaMappa([classe], { domicili: true, lavori: false, sede: false }, rubricaPiena())
    assert.deepEqual([...new Set(soloCase.map((s) => s.genere))], ['domicilio'])
    assert.equal(soloCase.length, 2)
  })

  it('un indirizzo senza coordinate non si disegna', () => {
    const { classe } = classeConIndirizzi()
    const rubrica = rubricaDi({ coordinate: [punto(CASA_LUGANO, 46.005, 8.951)] })
    const segni = segniDellaMappa([classe], TUTTO, rubrica)
    assert.equal(segni.filter((s) => s.genere !== 'sede').length, 1)
  })

  it('il tragitto c’è per ognuno dei due fratelli', () => {
    const { classe } = classeConIndirizzi()
    const righe = tragitti(segniDellaMappa([classe], TUTTO, rubricaPiena()))
    assert.equal(righe.length, 2)
    assert.ok(righe.every((r) => r.km > 0))
  })

  it('ogni tragitto ha un nome suo, e dice a quali punti è attaccato', () => {
    const { classe } = classeConIndirizzi()
    const segni = segniDellaMappa([classe], TUTTO, rubricaPiena())
    const righe = tragitti(segni)
    const nomi = new Set(righe.map((r) => r.id))
    // Due fratelli che abitano insieme e lavorano nello stesso posto fanno due
    // righe sovrapposte: sono due tragitti, e la mappa deve poterli distinguere.
    assert.equal(nomi.size, righe.length)
    const idSegni = new Set(segni.map((s) => s.id))
    for (const riga of righe) {
      assert.ok(idSegni.has(riga.daId))
      assert.ok(idSegni.has(riga.aId))
    }
  })
})

describe('gli indirizzi in comune', () => {
  it('trova la casa condivisa e la ditta condivisa', () => {
    const { classe } = classeConIndirizzi()
    const gruppi = condivisioni([classe], rubricaPiena())
    assert.equal(gruppi.length, 2)
    const tipi = gruppi.map((g) => g.tipo).sort()
    assert.deepEqual(tipi, ['domicilio', 'lavoro'])
    const ditta = gruppi.find((g) => g.tipo === 'lavoro')
    assert.equal(ditta.azienda, 'Officina Bianchi')
    assert.equal(ditta.usi.length, 2)
  })

  it('una persona sola non condivide niente, nemmeno se abita dove lavora', () => {
    const anno = creaAnno('2026-09-01', '2027-06-30')
    const classe = creaClasse(anno.id, 'I MEC B')
    const solo = creaAllievo('Neri', 'Ivo')
    solo.indirizzo = leggiIndirizzo('Via Bottega 1, 6600 Locarno')
    solo.indirizzoDatore = leggiIndirizzo('via bottega 1, 6600 Locarno')
    solo.azienda = 'Neri SA'
    classe.allievi.push(solo)
    assert.equal(condivisioni([classe], rubricaDi({ coordinate: [] })).length, 0)
  })

  it('un indirizzo che è casa di uno e ditta di un altro è misto', () => {
    const { classe, verdi } = classeConIndirizzi()
    const altro = creaAllievo('Gialli', 'Ugo')
    altro.azienda = 'Verdi & figli'
    altro.indirizzoDatore = leggiIndirizzo(CASA_BIASCA)
    classe.allievi.push(altro)
    const gruppo = condivisioni([classe], rubricaPiena()).find(
      (g) => g.chiave === chiaveIndirizzo(CASA_BIASCA),
    )
    assert.equal(gruppo.tipo, 'misto')
    assert.equal(gruppo.usi.length, 2)
    assert.ok(gruppo.usi.some((u) => u.allievoId === verdi.id))
  })

  it('i conti dicono quanti indirizzi ci sono, quanti collocati e quanti in comune', () => {
    const { classe } = classeConIndirizzi()
    const conti = contiDellaMappa([classe], rubricaPiena())
    assert.equal(conti.scritti, 3)
    assert.equal(conti.collocati, 3)
    assert.equal(conti.condivisi, 2)
    assert.equal(conti.senzaIndirizzo, 0)
  })

  it('chi non ha nessun indirizzo si conta a parte', () => {
    const { classe } = classeConIndirizzi()
    classe.allievi.push(creaAllievo('Bruni', 'Sara'))
    assert.equal(contiDellaMappa([classe], rubricaPiena()).senzaIndirizzo, 1)
  })
})

describe('scomporre un indirizzo', () => {
  // Sono righe vere, prese dall'anagrafica di una classe: è il genere di
  // scrittura che arriva quando l'indirizzo lo detta l'azienda.
  it('butta via la casella postale', () => {
    const pezzi = scomponiIndirizzo('Via del Tiglio 2, CP 934, 6512 Giubiasco')
    assert.equal(pezzi.via, 'Via del Tiglio 2')
    assert.equal(pezzi.civico, '2')
    assert.equal(pezzi.nap, '6512')
    assert.equal(pezzi.citta, 'Giubiasco')
    assert.deepEqual(pezzi.scartato, ['CP 934'])
  })

  it('butta via il nome dello studio davanti alla via', () => {
    const pezzi = scomponiIndirizzo("Studio d'ingegneria, Via Campagna 2.1, CP 570, 6512 Giubiasco")
    assert.equal(pezzi.via, 'Via Campagna 2.1')
    assert.equal(pezzi.soloVia, 'Via Campagna')
    assert.equal(pezzi.citta, 'Giubiasco')
    assert.ok(pezzi.scartato.includes("Studio d'ingegneria"))
  })

  it('butta via il nome di una persona davanti alla via', () => {
    const pezzi = scomponiIndirizzo('Antonio Mignami, Via Vallemaggia 117, 6600 Locarno')
    assert.equal(pezzi.via, 'Via Vallemaggia 117')
    assert.equal(pezzi.civico, '117')
    assert.deepEqual(pezzi.scartato, ['Antonio Mignami'])
  })

  it('legge i civici con la lettera e quelli con il punto', () => {
    assert.equal(scomponiIndirizzo('Via Filanda 4A, 6500 Bellinzona').civico, '4A')
    assert.equal(scomponiIndirizzo('Via F. Chiesa 60 F, 6834 Morbio Inferiore').civico, '60 F')
    assert.equal(scomponiIndirizzo('Via Campagna 2.1, 6512 Giubiasco').civico, '2.1')
  })

  it('tiene la via quando il civico non c’è', () => {
    const pezzi = scomponiIndirizzo('Via Trevano, 6952 Canobbio')
    assert.equal(pezzi.via, 'Via Trevano')
    assert.equal(pezzi.civico, '')
    assert.equal(pezzi.soloVia, 'Via Trevano')
  })

  it('regge un nucleo che non comincia con «via»', () => {
    const pezzi = scomponiIndirizzo('Sot i nos 34, 6535 Roveredo GR')
    assert.equal(pezzi.via, 'Sot i nos 34')
    assert.equal(pezzi.nap, '6535')
    assert.equal(pezzi.citta, 'Roveredo GR')
  })

  it('senza NAP tiene comunque la località', () => {
    const pezzi = scomponiIndirizzo('Via Roma 3, Lugano')
    assert.equal(pezzi.nap, '')
    assert.equal(pezzi.citta, 'Lugano')
    assert.equal(pezzi.via, 'Via Roma 3')
  })
})

describe('proiezione', () => {
  it('mette il meridiano zero a metà del piano, e l’equatore a metà in altezza', () => {
    const dove = proietta({ lat: 0, lon: 0 }, 0)
    assert.equal(Math.round(dove.x), 128)
    assert.equal(Math.round(dove.y), 128)
  })

  it('torna indietro da dove è andata', () => {
    const partenza = { lat: SEDE.lat, lon: SEDE.lon }
    const dove = proietta(partenza, 14)
    const tornata = riproietta(dove.x, dove.y, 14)
    assert.ok(Math.abs(tornata.lat - partenza.lat) < 1e-9)
    assert.ok(Math.abs(tornata.lon - partenza.lon) < 1e-9)
  })

  it('mette al centro del riquadro il punto su cui è inquadrata', () => {
    const inquadratura = { centro: { lat: SEDE.lat, lon: SEDE.lon }, zoom: 13 }
    const dove = posizioneNelRiquadro(inquadratura.centro, inquadratura, 800, 600)
    assert.ok(Math.abs(dove.x - 400) < 1e-6)
    assert.ok(Math.abs(dove.y - 300) < 1e-6)
  })

  it('a nord il punto sta più in alto, a est più a destra', () => {
    const inquadratura = { centro: { lat: 46, lon: 9 }, zoom: 12 }
    const nord = posizioneNelRiquadro({ lat: 46.2, lon: 9 }, inquadratura, 800, 600)
    const est = posizioneNelRiquadro({ lat: 46, lon: 9.2 }, inquadratura, 800, 600)
    assert.ok(nord.y < 300)
    assert.ok(est.x > 400)
  })
})

describe('inquadratura', () => {
  it('senza punti guarda la sede', () => {
    const vista = inquadraturaPer([], 800, 600)
    assert.equal(vista.centro.lat, SEDE.lat)
    assert.equal(vista.centro.lon, SEDE.lon)
  })

  it('tiene dentro il riquadro tutti i punti che le si danno', () => {
    const punti = [
      { lat: 45.845, lon: 9.005 },
      { lat: 46.36, lon: 8.97 },
      { lat: SEDE.lat, lon: SEDE.lon },
    ]
    const vista = inquadraturaPer(punti, 800, 600)
    for (const p of punti) {
      const dove = posizioneNelRiquadro(p, vista, 800, 600)
      assert.ok(dove.x >= 0 && dove.x <= 800, `${dove.x} fuori in larghezza`)
      assert.ok(dove.y >= 0 && dove.y <= 600, `${dove.y} fuori in altezza`)
    }
  })

  it('con un punto solo non ingrandisce al massimo', () => {
    const vista = inquadraturaPer([{ lat: SEDE.lat, lon: SEDE.lon }], 800, 600)
    assert.equal(vista.zoom, 14)
  })

  it('i tasselli coprono tutto il riquadro', () => {
    const vista = { centro: { lat: SEDE.lat, lon: SEDE.lon }, zoom: 13 }
    const tasselli = tasselliVisibili(vista, 800, 600)
    assert.ok(tasselli.length >= 12)
    assert.ok(Math.min(...tasselli.map((t) => t.sinistra)) <= 0)
    assert.ok(Math.max(...tasselli.map((t) => t.sinistra + 256)) >= 800)
    assert.ok(Math.min(...tasselli.map((t) => t.sopra)) <= 0)
    assert.ok(Math.max(...tasselli.map((t) => t.sopra + 256)) >= 600)
    for (const tassello of tasselli) {
      assert.ok(tassello.x >= 0 && tassello.x < 2 ** 13)
      assert.ok(tassello.y >= 0 && tassello.y < 2 ** 13)
    }
  })
})

describe('distanze', () => {
  it('misura una distanza nota con l’approssimazione buona per una mappa', () => {
    // Lugano–Bellinzona, una ventina di chilometri in linea d'aria.
    const km = distanzaKm({ lat: 46.005, lon: 8.951 }, { lat: 46.195, lon: 9.023 })
    assert.ok(km > 20 && km < 23, `${km} km non è la distanza attesa`)
  })

  it('sotto il chilometro si scrive in metri', () => {
    assert.equal(scriviDistanza(0.4), '400 m')
    assert.equal(scriviDistanza(2.34), '2,3 km')
    assert.equal(scriviDistanza(18.7), '19 km')
  })
})
