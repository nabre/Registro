// La giornata di scuola: Impostazioni › Calendario › Giornata.
//
// Quattro schede in fila, numerate nell'ordine in cui le misure si concatenano:
// l'unità didattica, le pause, l'inizio e la fine, i giorni. Qui si prova che:
//
// - le schede sono quattro, in quell'ordine, e il numero lo mette il foglio di
//   stile contandole;
// - l'etichetta della distanza fra le pause dice la durata dell'UD del
//   documento, non i quarantacinque minuti di fabbrica;
// - sotto la terza scheda la giornata è disegnata: le UD numerate, le pause, e
//   i minuti che non fanno un'UD segnati come avanzo;
// - − e + aggiungono o tolgono un'UD prima della prima pausa e dopo l'ultima,
//   e senza pause compare l'ora di riferimento da cui contarle;
// - «Porta alle …» manda l'orario sulla griglia con `impostazioni.salva`;
// - l'UD si sceglie da una tendina (45, 50, 60, 90, «Altro…»); cambiarla con
//   ore sul calendario chiede conferma, e annullando la tendina torna com'era
//   senza mandare niente;
// - con un'ora che ha l'appello il campo dell'UD è spento, e si dice perché.
//
// Le fotografie vanno in `dist-tests/schermate/`, o nella cartella di `SCATTI`.

import { expect, test, type Page } from '@playwright/test'

import { FRAME, pannello, schermata, valuta } from './banco'

interface Impostazioni { oraInizioGiornata?: string, oraFineGiornata?: string, minutiUd?: number }

// Ricreazione alle 9:30, poi due UD e dieci minuti; la giornata dalle 7:30, che
// non sta sulla griglia: dieci minuti prima della ricreazione avanzano.
const GIORNATA = `()=>{
  const i = prova.stato.registro.impostazioni
  i.pause = { prima: { inizio: '09:30', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] }
  i.oraInizioGiornata = '07:30'
  i.oraFineGiornata = '13:00'
  prova.vai({ pagina: 'pagina.impostazioni', scheda: 'documento.calendario' })
}`

async function salvate (page: Page): Promise<Impostazioni[]> {
  return await valuta<Impostazioni[]>(page,
    "()=>richieste.filter(m=>m.azione?.tipo==='impostazioni.salva').map(m=>m.azione.impostazioni)")
}

test('giornata', async ({ browser }) => {
  for (const schema of ['light', 'dark'] as const) {
    const { page, errori } = await pannello(browser, {
      larghezza: 1280, altezza: 1400, colorScheme: schema,
    })
    await valuta(page, GIORNATA)
    await valuta(page, FRAME)
    await schermata(page, `giornata-${schema}.png`, { fullPage: true })

    // Quattro passi, in quest'ordine, numerati dal contatore.
    const passi = page.locator('.giornata-passi > .scheda .scheda__titolo')
    await expect(passi).toHaveCount(4)
    const titoli = (await passi.allInnerTexts()).map((t) => t.trim())
    expect(titoli).toEqual([
      'Unità didattica', 'Pause della giornata', 'Inizio e fine della giornata', 'Giorni mostrati',
    ])
    const numero = await valuta(page,
      "()=>getComputedStyle(document.querySelectorAll('.giornata-passi > .scheda .scheda__titolo')[2]," +
      "'::before').content")
    // Il numero lo scrive il contatore: il calcolato ne dice la formula.
    expect(numero).toBe('counter(passo-giornata)')

    // La distanza fra le pause si legge nelle UD del documento.
    await expect(page.getByLabel('Dopo (UD da 45 min)')).toHaveCount(1)

    // La giornata disegnata: sei UD intere, due pause, due avanzi.
    const linea = page.locator('.giornata-linea__tratto')
    await expect(page.locator('.giornata-linea__tratto--ud')).toHaveCount(6)
    await expect(page.locator('.giornata-linea__tratto--pausa')).toHaveCount(2)
    await expect(page.locator('.giornata-linea__tratto--avanzo')).toHaveCount(2)
    expect(await linea.count()).toBe(10)
    await expect(page.locator('.giornata-linea__nota')).toContainText('2 avanzi')

    if (schema === 'dark') {
      expect(errori).toEqual([])
      await page.close()
      continue
    }

    // − e + ai capi: fuori griglia il primo gesto ci porta sopra. Dalle 7:30
    // alla ricreazione stanno due UD e un avanzo; dopo l'ultima pausa due.
    await expect(page.locator('.contatore-ud__valore')).toHaveText(['2', '2'])
    await page.getByRole('button', { name: 'UD prima della prima pausa: una in meno' }).click()
    await valuta(page, FRAME)
    let fatte = await salvate(page)
    expect(fatte.some((i) => i.oraInizioGiornata === '08:00'), JSON.stringify(fatte)).toBeTruthy()
    await page.getByRole('button', { name: 'UD dopo l’ultima pausa: una in più' }).click()
    await valuta(page, FRAME)
    fatte = await salvate(page)
    expect(fatte.some((i) => i.oraFineGiornata === '13:40'), JSON.stringify(fatte)).toBeTruthy()

    // «Porta alle …»: l'inizio sulle partenze, la fine dove un'UD finisce.
    await page.locator('button', { hasText: 'Porta alle 07:15' }).click()
    await valuta(page, FRAME)
    fatte = await salvate(page)
    expect(fatte.some((i) => i.oraInizioGiornata === '07:15'), JSON.stringify(fatte)).toBeTruthy()
    await page.locator('button', { hasText: 'Porta alle 12:55' }).click()
    await valuta(page, FRAME)
    fatte = await salvate(page)
    expect(fatte.some((i) => i.oraFineGiornata === '12:55'), JSON.stringify(fatte)).toBeTruthy()

    // Con le ore sul calendario il cambio dell'UD chiede conferma; annullando
    // non parte niente e il campo torna com'era.
    const prima = (await salvate(page)).length
    const campo = page.locator('select[name="minutiUd"]')
    expect(await campo.locator('option').allInnerTexts())
      .toEqual(['45 min', '50 min', '60 min', '90 min', 'Altro…'])
    await campo.selectOption('50')
    const modale = page.locator('.modale')
    await expect(modale).toContainText('Unità didattica da 50 minuti?')
    await expect(modale).toContainText('tengono le loro UD')
    await modale.getByRole('button', { name: 'Annulla' }).click()
    await valuta(page, FRAME)
    fatte = await salvate(page)
    expect(fatte.length, JSON.stringify(fatte)).toBe(prima)
    await expect(campo).toHaveValue('45')

    // Confermando, parte il salvataggio con la durata nuova.
    await campo.selectOption('50')
    await page.locator('.modale').getByRole('button', { name: 'Cambia' }).click()
    await valuta(page, FRAME)
    fatte = await salvate(page)
    expect(fatte.some((i) => i.minutiUd === 50), JSON.stringify(fatte)).toBeTruthy()

    // Senza pause, l'ora di riferimento fa da pausa di zero minuti.
    await valuta(page, `()=>{
      delete prova.stato.registro.impostazioni.pause
      prova.ridisegna()
    }`)
    await valuta(page, FRAME)
    await expect(page.locator('input[name="riferimentoGiornata"]')).toHaveCount(1)
    await expect(page.getByRole('group', { name: 'UD dopo l’ora di riferimento' })).toHaveCount(1)

    // Un'ora con l'appello fissa l'UD: il campo si spegne, e lo si dice.
    await valuta(page, `()=>{
      prova.stato.registro.lezioni[0].presenze = [{ allievoId: 'x', stati: ['presente'] }]
      prova.ridisegna()
    }`)
    await valuta(page, FRAME)
    await expect(page.locator('select[name="minutiUd"]')).toBeDisabled()
    await expect(page.locator('.giornata-passi'))
      .toContainText('Fissata: 1 lezione ha già l’appello')

    expect(errori).toEqual([])
    await page.close()
  }
})
