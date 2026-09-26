// Annulla e ripristina: la storia dei gesti, in memoria nell'archivio. Un
// gesto di più scritture torna indietro tutto insieme, un gesto nuovo toglie
// il ripristinabile, e un annulla non cancella mai in silenzio quel che nel
// frattempo è cambiato per un'altra strada (smistamento, condotto).
//
// L'archivio si apre senza documento: la storia non ha bisogno del disco.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import * as percorso from 'node:path'
import { after, before, describe, it } from 'node:test'

const radice = mkdtempSync(percorso.join(tmpdir(), 'registro-storia-'))
const lavoro = percorso.join(radice, 'lavoro')
process.env.REGISTRO_USERDATA = percorso.join(radice, 'userData')

after(() => rmSync(radice, { recursive: true, force: true }))

let api

before(async () => {
  mkdirSync(process.env.REGISTRO_USERDATA, { recursive: true })
  mkdirSync(lavoro, { recursive: true })
  writeFileSync(
    percorso.join(process.env.REGISTRO_USERDATA, 'impostazioni.json'),
    JSON.stringify({ cartellaLavoro: lavoro }),
  )
  api = await import('../../dist-tests/api.mjs')
  api.registraTutte()
})

/** Un archivio nuovo, aperto su niente. */
async function archivioVuoto () {
  const archivio = new api.Archivio()
  await archivio.apri(null)
  return archivio
}

/** Una classe in più, dentro il gesto in corso se ce n'è uno. */
function aggiungiClasse (archivio, nome) {
  const classe = api.creaClasse('anno-prova', nome)
  archivio.modifica((r) => { r.classi.push(classe) }, ['classi'])
  return classe
}

const nomi = (archivio) => archivio.registro.classi.map((c) => c.nome)

describe('la storia dei gesti', () => {
  it('annulla un gesto intero, anche fatto di più scritture con un’attesa in mezzo', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => {
      aggiungiClasse(archivio, 'I A')
      // Un'attesa vera: il passo deve seguire il gesto oltre il primo `await`.
      await new Promise((fatto) => setTimeout(fatto, 5))
      archivio.modifica((r) => { r.classi[0].nome = 'I B' }, ['classi'])
    })
    assert.deepEqual(nomi(archivio), ['I B'])
    assert.deepEqual(archivio.contiStoria, { annulla: 1, ripristina: 0 })

    const revisione = archivio.revisione
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [])
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 1 })
    // Un annulla è una modifica come le altre per chi guarda: si riscrive.
    assert.ok(archivio.revisione > revisione, 'la revisione deve muoversi')
    assert.equal(archivio.statoSalvataggio.inSospeso, true)

    assert.equal(archivio.ripristina().ok, true)
    assert.deepEqual(nomi(archivio), ['I B'])
    assert.deepEqual(archivio.contiStoria, { annulla: 1, ripristina: 0 })
    archivio.dispose()
  })

  it('annulla due gesti di fila sulla stessa collezione, e li rifà nell’ordine', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'II A') })
    assert.deepEqual(nomi(archivio), ['I A', 'II A'])

    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), ['I A'])
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [])
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'vuota' })

    assert.equal(archivio.ripristina().ok, true)
    assert.equal(archivio.ripristina().ok, true)
    assert.deepEqual(nomi(archivio), ['I A', 'II A'])
    assert.deepEqual(archivio.ripristina(), { ok: false, motivo: 'vuota' })
    archivio.dispose()
  })

  it('un gesto nuovo toglie il ripristino; un gesto che non cambia niente no', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    archivio.annulla()
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 1 })

    // Aprire un allegato, esportare: un gesto che non scrive non è un passo.
    await archivio.inUnPasso(async () => undefined)
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 1 })

    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'III A') })
    assert.deepEqual(archivio.contiStoria, { annulla: 1, ripristina: 0 })
    archivio.dispose()
  })

  it('prende la copia di prima anche da chi cambia lo stato prima di dichiararlo', async () => {
    // Il modo del contesto delle azioni: cambia lo stato vivo, poi chiama
    // `modifica` con un'operazione vuota.
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => {
      archivio.ricordaPrima(['classi'])
      archivio.registro.classi.push(api.creaClasse('anno-prova', 'IV A'))
      archivio.modifica(() => undefined, ['classi'])
    })
    assert.deepEqual(nomi(archivio), ['IV A'])
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [], 'la copia di prima era già quella di dopo')
    archivio.dispose()
  })

  it('annulla anche le impostazioni del documento', async () => {
    const archivio = await archivioVuoto()
    const prima = archivio.registro.impostazioni.sogliaAssenza
    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => { r.impostazioni.sogliaAssenza = 77 }, ['registro'])
    })
    assert.equal(archivio.registro.impostazioni.sogliaAssenza, 77)
    assert.equal(archivio.annulla().ok, true)
    assert.equal(archivio.registro.impostazioni.sogliaAssenza, prima)
    archivio.dispose()
  })

  it('fonde le battute dello stesso gesto in un passo solo', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    for (const nome of ['I', 'I B', 'I BI']) {
      await archivio.inUnPasso(async () => {
        archivio.modifica((r) => { r.classi[0].nome = nome }, ['classi'])
      }, 'classe.salva|id=1')
    }
    assert.deepEqual(archivio.contiStoria, { annulla: 2, ripristina: 0 })
    archivio.annulla()
    assert.deepEqual(nomi(archivio), ['I A'])
    archivio.dispose()
  })
})

describe('la storia non perde niente in silenzio', () => {
  it('rifiuta di annullare se la stessa collezione è cambiata fuori dal gesto', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    // Una scrittura che non viene da un gesto: lo smistamento, il condotto.
    aggiungiClasse(archivio, 'dallo smistamento')

    const esito = archivio.annulla()
    assert.deepEqual(esito, { ok: false, motivo: 'cambiata', collezioni: ['classi'] })
    assert.deepEqual(nomi(archivio), ['I A', 'dallo smistamento'], 'niente è stato toccato')
    // E la storia si svuota: da qui in giù non si può più garantire niente.
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    archivio.dispose()
  })

  it('lascia annullare se fuori è cambiata un’altra collezione', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    archivio.modifica((r) => {
      r.coordinate.push({ chiave: 'via prova 1', indirizzo: 'Via Prova 1' })
    }, ['coordinate'])
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [])
    assert.equal(archivio.registro.coordinate.length, 1)
    archivio.dispose()
  })

  it('rifiuta di ripristinare se dopo l’annulla è cambiato qualcosa fuori', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    archivio.annulla()
    aggiungiClasse(archivio, 'da fuori')
    assert.equal(archivio.ripristina().ok, false)
    assert.deepEqual(nomi(archivio), ['da fuori'])
    archivio.dispose()
  })

  it('non mette in pila un gesto in mezzo al quale ha scritto qualcun altro', async () => {
    const archivio = await archivioVuoto()
    let lascia
    const inCorso = archivio.inUnPasso(async () => {
      aggiungiClasse(archivio, 'dal gesto')
      await new Promise((fatto) => { lascia = fatto })
      archivio.modifica((r) => { r.classi[0].nome = 'dal gesto, ritoccata' }, ['classi'])
    })
    // Mentre il gesto aspetta, arriva una scrittura da fuori sulla stessa collezione.
    aggiungiClasse(archivio, 'da fuori')
    lascia()
    await inCorso
    // Annullare il gesto porterebbe via anche la classe venuta da fuori.
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    archivio.dispose()
  })
})

describe('la storia vive in memoria', () => {
  it('si azzera quando il documento si riapre', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    assert.equal(archivio.contiStoria.annulla, 1)
    await archivio.apri(null)
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    archivio.dispose()
  })

  it('si azzera quando il documento si chiude', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    await archivio.chiudi()
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    archivio.dispose()
  })

  it('tiene al massimo cento passi, buttando via i più vecchi', async () => {
    const archivio = await archivioVuoto()
    for (let i = 0; i < 105; i++) {
      await archivio.inUnPasso(async () => { aggiungiClasse(archivio, `classe ${i}`) })
    }
    assert.deepEqual(archivio.contiStoria, { annulla: 100, ripristina: 0 })
    while (archivio.annulla().ok);
    // I primi cinque gesti non si annullano più: sono usciti dalla storia.
    assert.deepEqual(nomi(archivio), ['classe 0', 'classe 1', 'classe 2', 'classe 3', 'classe 4'])
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 100 })
    archivio.dispose()
  })
})

describe('le azioni della storia', () => {
  it('storia.annulla e storia.ripristina rispondono con una frase breve', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })

    const annullato = await api.esegui(archivio, { tipo: 'storia.annulla' })
    assert.equal(annullato.ok, true, JSON.stringify(annullato))
    assert.equal(annullato.messaggio?.testo, 'Annullato.')
    assert.deepEqual(nomi(archivio), [])

    const ripristinato = await api.esegui(archivio, { tipo: 'storia.ripristina' })
    assert.equal(ripristinato.ok, true, JSON.stringify(ripristinato))
    assert.equal(ripristinato.messaggio?.testo, 'Ripristinato.')
    assert.deepEqual(nomi(archivio), ['I A'])
    archivio.dispose()
  })

  it('il rifiuto per un cambiamento nel frattempo dice dove, e non scrive', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    aggiungiClasse(archivio, 'da fuori')

    const esito = await api.esegui(archivio, { tipo: 'storia.annulla' })
    assert.equal(esito.ok, false)
    assert.match(esito.errori.join(' '), /Nel frattempo è cambiato altro in classi/)
    assert.deepEqual(nomi(archivio), ['I A', 'da fuori'])

    const vuota = await api.esegui(archivio, { tipo: 'storia.annulla' })
    assert.equal(vuota.ok, false)
    assert.match(vuota.errori.join(' '), /niente da annullare/)
    archivio.dispose()
  })
})

describe('i gesti che la storia non sa rimettere', () => {
  /** Una scuola minima: classe, materia, corso. Scritta fuori da ogni gesto. */
  function scuola (archivio) {
    const classe = api.creaClasse('anno-prova', 'I A')
    const materia = api.creaMateria('Matematica')
    const corso = api.creaCorso(classe.id, materia.id, 'I A — Matematica')
    archivio.modifica((r) => {
      r.classi.push(classe)
      r.materie.push(materia)
      r.corsi.push(corso)
    }, ['classi', 'registro', 'corsi'])
    return { classe, corso }
  }

  it('eliminare una verifica con i suoi PDF non si annulla, e Ctrl+Z lo dice', async () => {
    const archivio = await archivioVuoto()
    const { corso } = scuola(archivio)
    // Un gesto di prima, che deve restare annullabile.
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'II A') })

    const momento = api.creaValutazione(corso.id, 'Verifica 1')
    momento.allegati.push({
      id: 'all-1', ruolo: 'verifica', allievoId: null, nome: 'verifica.pdf',
      file: 'archivio/verifica.pdf', aggiuntoIl: new Date().toISOString(),
    })
    archivio.modifica((r) => { r.valutazioni.push(momento) }, ['valutazioni'])

    const eliminato = await archivio.inUnPasso(() =>
      api.esegui(archivio, { tipo: 'valutazione.elimina', valutazioneId: momento.id }))
    assert.equal(eliminato.ok, true, JSON.stringify(eliminato))
    assert.equal(archivio.registro.valutazioni.length, 0)

    // Il PDF è uscito dal documento: rimettere la voce darebbe un allegato che
    // punta al vuoto.
    const rifiutato = await api.esegui(archivio, { tipo: 'storia.annulla' })
    assert.equal(rifiutato.ok, false)
    assert.match(rifiutato.errori.join(' '), /tolto dei file dal documento: non si può annullare/)
    assert.equal(archivio.registro.valutazioni.length, 0, 'la verifica non torna')

    // Il passo irreversibile fa da muro: quel che sta sotto presupponeva uno stato
    // che non c'è più.
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'vuota' })
    assert.deepEqual(nomi(archivio), ['I A', 'II A'])
    archivio.dispose()
  })

  it('sotto un gesto irreversibile non si torna: niente riferimenti a quel che è sparito', async () => {
    // Si elimina un'ora che segue un piano, poi il piano con i suoi file. Il
    // secondo gesto dichiara solo i piani: Ctrl+Z dopo il rifiuto non rimette
    // l'ora con un `pianoId` inesistente.
    const archivio = await archivioVuoto()
    const { corso } = scuola(archivio)
    const piano = api.creaPiano(corso.id)
    const ora = { ...api.creaLezione(corso.id, '2026-10-05', '08:00', 60), pianoId: piano.id }
    archivio.modifica((r) => {
      r.piani.push(piano)
      r.lezioni.push(ora)
    }, ['piani', 'lezioni'])

    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => { r.lezioni = r.lezioni.filter((l) => l.id !== ora.id) }, ['lezioni'])
    })
    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => { r.piani = r.piani.filter((p) => p.id !== piano.id) }, ['piani'])
      archivio.segnaIrreversibile()
    })

    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'irreversibile' })
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'vuota' })
    assert.equal(archivio.registro.lezioni.length, 0, 'l’ora non torna a puntare al piano sparito')
    archivio.dispose()
  })

  it('sotto un gesto guasto non si torna, come sotto uno irreversibile', async () => {
    // Un gesto in cui ha scritto qualcun altro non entra nella storia, ma le sue
    // scritture restano e i passi sotto le ignorano.
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    let lascia
    const inCorso = archivio.inUnPasso(async () => {
      archivio.modifica((r) => {
        r.coordinate.push({ chiave: 'via prova 1', indirizzo: 'Via Prova 1' })
      }, ['coordinate'])
      await new Promise((fatto) => { lascia = fatto })
      archivio.modifica((r) => { r.coordinate[0].indirizzo = 'Via Prova 2' }, ['coordinate'])
    })
    archivio.modifica((r) => {
      r.coordinate.push({ chiave: 'via fuori', indirizzo: 'Via Fuori' })
    }, ['coordinate'])
    lascia()
    await inCorso
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    assert.deepEqual(nomi(archivio), ['I A'])
    archivio.dispose()
  })

  it('eliminare una verifica senza file si annulla come ogni altro gesto', async () => {
    const archivio = await archivioVuoto()
    const { corso } = scuola(archivio)
    const momento = api.creaValutazione(corso.id, 'Verifica 1')
    archivio.modifica((r) => { r.valutazioni.push(momento) }, ['valutazioni'])

    await archivio.inUnPasso(() =>
      api.esegui(archivio, { tipo: 'valutazione.elimina', valutazioneId: momento.id }))
    assert.equal(archivio.annulla().ok, true)
    assert.equal(archivio.registro.valutazioni.length, 1)
    archivio.dispose()
  })

  it('il segno si dice una volta sola, anche se il gesto non ha cambiato collezioni', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    await archivio.inUnPasso(async () => { archivio.segnaIrreversibile() })
    // Il segno resta, da solo: quel che stava sotto se n'è andato con lui.
    assert.deepEqual(archivio.contiStoria, { annulla: 1, ripristina: 0 })
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'irreversibile' })
    assert.deepEqual(archivio.contiStoria, { annulla: 0, ripristina: 0 })
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'vuota' })
    assert.deepEqual(nomi(archivio), ['I A'])
    archivio.dispose()
  })

  it('dopo il segno la storia riparte: i gesti nuovi si annullano', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => { archivio.segnaIrreversibile() })
    await archivio.inUnPasso(async () => { aggiungiClasse(archivio, 'I A') })
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'irreversibile' })
    archivio.dispose()
  })

  it('un lavoro avviato da un gesto ma fuori dal suo passo non finisce in quel passo', async () => {
    const archivio = await archivioVuoto()
    await archivio.inUnPasso(async () => {
      aggiungiClasse(archivio, 'I A')
      // Come la coda dell'OCR: parte dal gesto, ma scrive a nome suo.
      archivio.fuoriDalPasso(() => {
        archivio.modifica((r) => {
          r.coordinate.push({ chiave: 'via prova 1', indirizzo: 'Via Prova 1' })
        }, ['coordinate'])
      })
    })
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [])
    assert.equal(archivio.registro.coordinate.length, 1, 'la scrittura di fuori resta')
    archivio.dispose()
  })
})

describe('l’intestazione intera torna indietro', () => {
  it('annulla gli anni e l’anno in uso, e lascia stare la cartella', async () => {
    const archivio = await archivioVuoto()
    const anno = { ...api.creaAnno('2026-09-01', '2027-06-30'), cartella: '2026-2027' }
    // Com'è dopo un'apertura: l'anno c'è, con la sua cartella, fuori da ogni gesto.
    archivio.modifica((r) => {
      r.anni = [anno]
      r.annoCorrenteId = anno.id
    }, ['registro'])

    // `anno.settimana` e `anno.salva` fanno così: riscrivono l'anno dichiarando 'registro'.
    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => {
        r.anni = [{ ...r.anni[0], etichetta: 'cambiata' }]
      }, ['registro'])
    })
    assert.equal(archivio.registro.anni[0].etichetta, 'cambiata')
    // La cartella cambia per conto suo (documento salvato altrove): non è un dato
    // del gesto, e l'annulla non la riporta indietro.
    archivio.registro.anni[0].cartella = 'spostata'

    assert.equal(archivio.annulla().ok, true)
    assert.equal(archivio.registro.anni[0].etichetta, anno.etichetta)
    assert.equal(archivio.registro.anni[0].cartella, 'spostata')

    // Eliminare l'anno lo toglie e sposta quello in uso: l'annulla rimette tutti e due.
    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => {
        r.anni = []
        r.annoCorrenteId = null
      }, ['registro'])
    })
    assert.equal(archivio.annulla().ok, true)
    assert.equal(archivio.registro.anni.length, 1)
    assert.equal(archivio.registro.annoCorrenteId, anno.id)
    archivio.dispose()
  })
})

describe('i PDF seguono anche l’annulla', () => {
  after(async () => { await api?.fermaRapporti() })

  it('annullare e ripristinare un voto rimette in attesa i fogli del suo corso', async () => {
    const archivio = await archivioVuoto()
    const classe = api.creaClasse('anno-prova', 'I A')
    const materia = api.creaMateria('Matematica')
    const corso = api.creaCorso(classe.id, materia.id, 'I A — Matematica')
    const altro = api.creaCorso(classe.id, materia.id, 'I A — Matematica bis')
    archivio.modifica((r) => {
      r.impostazioni.pdfAutomatici = 'sempre'
      r.classi.push(classe)
      r.materie.push(materia)
      r.corsi.push(corso, altro)
    }, ['classi', 'registro', 'corsi'])

    await archivio.inUnPasso(async () => {
      archivio.modifica((r) => {
        r.valutazioni.push(api.creaValutazione(corso.id, 'Verifica 1', undefined, '2026-10-05'))
      }, ['valutazioni'])
    })

    await api.fermaRapporti()
    assert.equal(api.rigenerazioniInAttesa(), 0)
    const annullato = await api.esegui(archivio, { tipo: 'storia.annulla' })
    assert.equal(annullato.ok, true, JSON.stringify(annullato))
    // Il corso della verifica, e solo lui: l'altro non è stato toccato.
    assert.equal(api.rigenerazioniInAttesa(), 1)

    await api.fermaRapporti()
    const ripristinato = await api.esegui(archivio, { tipo: 'storia.ripristina' })
    assert.equal(ripristinato.ok, true, JSON.stringify(ripristinato))
    assert.equal(api.rigenerazioniInAttesa(), 1)

    await api.fermaRapporti()
    archivio.dispose()
  })
})

describe('i file tolti dal documento, detti alla storia da dove escono', () => {
  // Il deposito avvisa l'archivio a ogni file che esce: nessun annulla rimette
  // un riferimento a un file sparito. Le esportazioni fanno eccezione: si
  // rifanno dai dati.
  async function archivioConDocumento () {
    const archivio = new api.Archivio(api.Uri.file(process.env.REGISTRO_USERDATA))
    const file = percorso.join(lavoro, `storia-${Date.now()}-${Math.random().toString(36).slice(2)}.regi`)
    await archivio.creaAnno(api.creaAnno('2026-09-01', '2027-06-30'), api.Uri.file(file))
    return archivio
  }

  it('un file del docente tolto dentro un gesto rende il gesto non annullabile', async () => {
    const archivio = await archivioConDocumento()
    assert.equal(archivio.deposito.scrivi('archivio/scansione.pdf', new Uint8Array([1, 2, 3])), true)
    await archivio.inUnPasso(async () => {
      aggiungiClasse(archivio, 'I A')
      assert.equal(archivio.deposito.elimina('archivio/scansione.pdf'), true)
    })
    assert.deepEqual(archivio.annulla(), { ok: false, motivo: 'irreversibile' })
    assert.deepEqual(nomi(archivio), ['I A'])
    await archivio.chiudi()
    archivio.dispose()
  })

  it('un foglio stampato dal registro tolto dentro un gesto non gli toglie l’annulla', async () => {
    const archivio = await archivioConDocumento()
    assert.equal(archivio.deposito.scrivi('esportazioni/I A/griglia.pdf', new Uint8Array([1])), true)
    await archivio.inUnPasso(async () => {
      aggiungiClasse(archivio, 'I A')
      assert.equal(archivio.deposito.elimina('esportazioni/I A/griglia.pdf'), true)
    })
    assert.equal(archivio.annulla().ok, true)
    assert.deepEqual(nomi(archivio), [])
    await archivio.chiudi()
    archivio.dispose()
  })
})
