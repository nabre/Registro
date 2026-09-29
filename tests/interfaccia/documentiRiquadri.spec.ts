// Pagina Documenti: ogni aggiornamento resta nel suo riquadro (ADR-48).
//
// Si fissa che:
//
// - dopo un ridisegno completo e dopo «Aggiorna tutto» a contenuto uguale
//   (l'inventario torna con gli stessi percorsi, misure e revisioni) il lettore
//   dell'anteprima è lo stesso `<iframe>` e il suo `src` non cambia: il PDF non
//   ricarica e non torna a pagina uno;
// - un foglio riscritto davvero (revisione nuova) ricarica;
// - la barra dei riquadri è telaio: un ridisegno non la ricrea, quindi il gesto
//   di scorrimento in corsa non si perde.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, valuta } from './banco'

const PREPARA = `() => {
  const r = prova.stato.registro
  const c = r.corsi[0]
  const percorso = (genere, estensione) => {
    const d = prova.collocazioneDi(r, genere, c.id, { semestreId: null })
    return prova.percorsoDi(d, estensione)
  }
  const pdf = percorso('corso', 'pdf')
  const esportati = [
    { percorso: pdf, misura: 1000, revisione: 0 },
    { percorso: percorso('presenze', 'csv'), misura: 10, revisione: 0 },
  ]
  prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.corso.documenti'))
  prova.aggiorna({ schedaDocumenti: 'corso', semestreId: null, esportati,
    anteprima: pdf, radiceDati: 'https://esempio.invalido/dati' })
  return pdf
}`

// Segna i nodi con una proprietà JS: un nodo ricreato non la porta.
const SEGNA = `() => {
  const telaio = document.querySelector('iframe')
  const barra = document.querySelector('.documenti__barra')
  telaio.__segnato = true
  barra.__segnata = true
  return telaio.getAttribute('src')
}`

const STESSO_TELAIO = `() => {
  const telaio = document.querySelector('iframe')
  return { stesso: telaio?.__segnato === true, src: telaio?.getAttribute('src'),
           quanti: document.querySelectorAll('iframe').length }
}`

const STESSA_BARRA = "() => document.querySelector('.documenti__barra')?.__segnata === true"

interface Telaio { stesso: boolean, src: string | null, quanti: number }

test('cornice_tenuta', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PREPARA)
  await valuta(page, FRAME)
  const src = await valuta<string | null>(page, SEGNA)
  expect(src, 'nessun lettore nell\'anteprima').toBeTruthy()

  // Il segnaposto del disegno nuovo non entra mai nel documento: se entrasse,
  // ogni ridisegno chiederebbe di nuovo la sorgente del PDF.
  const indirizzo = await valuta<string>(page, "() => document.querySelector('iframe').src")
  const richieste: string[] = []
  page.on('request', (r) => { if (r.url() === indirizzo) richieste.push(r.url()) })
  for (let i = 0; i < 5; i++) {
    await valuta(page, 'prova.ridisegna()')
    await valuta(page, FRAME)
  }
  expect(richieste).toEqual([])

  // Ridisegno completo senza cambiare niente.
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FRAME)
  let dopo = await valuta<Telaio>(page, STESSO_TELAIO)
  expect(dopo.stesso, JSON.stringify(dopo)).toBeTruthy()
  expect(dopo.src, JSON.stringify(dopo)).toBe(src)
  expect(dopo.quanti, JSON.stringify(dopo)).toBe(1)
  expect(await valuta(page, STESSA_BARRA), 'la barra dei riquadri è stata ricreata').toBeTruthy()

  // «Aggiorna tutto» a contenuto uguale: l'host rispinge l'inventario, oggetti
  // nuovi con gli stessi valori.
  await valuta(page, 'prova.aggiorna({ esportati: prova.stato.esportati.map((e) => ({ ...e })) })')
  await valuta(page, FRAME)
  dopo = await valuta<Telaio>(page, STESSO_TELAIO)
  expect(dopo.stesso, JSON.stringify(dopo)).toBeTruthy()
  expect(dopo.src, JSON.stringify(dopo)).toBe(src)
  expect(await valuta(page, STESSA_BARRA), 'la barra dei riquadri è stata ricreata').toBeTruthy()

  // Il foglio riscritto davvero ricarica: revisione nuova, indirizzo nuovo.
  await valuta(page, 'prova.aggiorna({ esportati: prova.stato.esportati.map((e) => ({ ...e, revisione: e.revisione + 1 })) })')
  await valuta(page, FRAME)
  dopo = await valuta<Telaio>(page, STESSO_TELAIO)
  expect(dopo.src, JSON.stringify(dopo)).not.toBe(src)
  expect(dopo.quanti, JSON.stringify(dopo)).toBe(1)
  expect(errori).toEqual([])
})
