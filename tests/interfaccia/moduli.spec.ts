// Le finestre dei moduli che nessun'altra prova apre, su Chromium.
//
// Ogni prova apre il suo modulo (da `prova.moduli`, o dalla strada vera quando
// è corta), compila i campi minimi per ruolo ed etichetta, salva, e guarda due
// cose dall'esterno: l'azione che parte verso il ponte, con i suoi campi
// chiave, e la finestra che si chiude. Dove ha senso, anche il fuoco iniziale
// sul primo campo e Esc che chiede prima di buttare quel che si è scritto.
//
// Non guardano come la finestra è fatta dentro: ruoli ARIA, etichette dei
// cataloghi italiani, i nomi dei campi che il modulo legge al salvataggio. Così
// devono passare uguali prima e dopo la conversione a React (ADR-56).
//
// Il ponte di prova risponde «fatto» a ogni azione e non riscrive il registro;
// le prove che hanno bisogno di una risposta con dati (un id creato, una
// lettura) se la scrivono.

import { expect, test, type Locator, type Page } from '@playwright/test'

import { FOTOGRAMMA, ULTIMA, attendi, attendiRisposte, pannello, ponte, valuta } from './banco'

type Azione = Record<string, unknown>

/** Apre un modulo con il codice dato e aspetta che la finestra sia disegnata. */
async function apri (page: Page, codice: string, arg?: unknown): Promise<void> {
  await valuta(page, 'richieste.length = 0')
  await valuta(page, codice, arg)
  await valuta(page, FOTOGRAMMA)
}

/** Aspetta che parta un'azione di quel tipo e la rende. */
async function partita (page: Page, tipo: string): Promise<Azione> {
  await attendi(page, `richieste.some(m=>m.azione?.tipo===${JSON.stringify(tipo)})`)
  return await valuta<Azione>(page, ULTIMA, tipo)
}

/** Quante azioni di quel tipo sono partite dall'ultimo svuotamento. */
async function quante (page: Page, tipo: string): Promise<number> {
  return await valuta<number>(page, `richieste.filter(m=>m.azione?.tipo===${JSON.stringify(tipo)}).length`)
}

/** Il pulsante che salva: l'ultimo tasto primario del piede, col suo nome. */
function tasto (dialogo: Locator, nome: string): Locator {
  return dialogo.getByRole('button', { name: nome, exact: true })
}

// ------------------------------------------------------------------ il corso

// `corso.crea` risponde con l'id del corso nato, come l'host.
const CORSO_NATO = "m.azione?.tipo === 'corso.crea'" +
  " ? { tipo: 'risposta', id: m.id, ok: true, creato: { id: 'corso-nuovo' } }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

test('corso nuovo: classe, materia, una fascia, e le tre azioni in fila', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(CORSO_NATO) })
  const [classeId, materiaId] = await valuta<[string, string]>(page,
    '[prova.stato.registro.classi[1].id, prova.stato.registro.materie[1].id]')
  await apri(page, '() => prova.moduli.corso({ dopo: (id) => { window.corsoNato = id } })')

  const dialogo = page.getByRole('dialog', { name: 'Nuovo corso' })
  await expect(dialogo).toBeVisible()
  const classe = dialogo.getByRole('combobox', { name: /^Classe/ })
  await expect(classe, 'il fuoco iniziale non è sul primo campo').toBeFocused()
  await classe.selectOption(classeId)
  await dialogo.getByRole('combobox', { name: /^Materia/ }).selectOption(materiaId)
  // Il titolo si scrive da solo con classe e materia.
  const titolo = dialogo.getByRole('textbox', { name: /Come si chiama/ })
  await expect(titolo).not.toHaveValue('')
  const titoloProposto = await titolo.inputValue()

  await dialogo.getByRole('button', { name: 'Aggiungi una fascia' }).click()
  await tasto(dialogo, 'Crea il corso').click()

  const creato = await partita(page, 'corso.crea')
  expect(creato).toEqual({ tipo: 'corso.crea', classeId, materiaId, titolo: titoloProposto })
  const orario = await partita(page, 'orario.imposta')
  expect(orario.corsoId).toBe('corso-nuovo')
  expect((orario.orario as unknown[]).length).toBe(1)
  // «Genera le lezioni appena creato il corso» è spuntata di serie.
  const genera = await partita(page, 'orario.genera')
  expect(genera.corsoId).toBe('corso-nuovo')
  expect(genera.al).toBe('2027-06-30')
  await expect(dialogo).toHaveCount(0)
  expect(await valuta(page, 'window.corsoNato')).toBe('corso-nuovo')

  // Senza classe e materia non parte niente: lo si dice in cima.
  await apri(page, '() => prova.moduli.corso()')
  const vuoto = page.getByRole('dialog', { name: 'Nuovo corso' })
  await tasto(vuoto, 'Crea il corso').click()
  await expect(vuoto).toBeVisible()
  expect(await quante(page, 'corso.crea')).toBe(0)
  await page.keyboard.press('Escape')
  await expect(vuoto).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

test('corso esistente: le fasce dell’orario, «Genera le lezioni», «Salva»', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const [corsoId, minutiUd] = await valuta<[string, number]>(page,
    '[prova.stato.registro.corsi[0].id, prova.stato.registro.impostazioni.minutiUd]')
  await apri(page, '() => prova.moduli.corso({ corso: prova.stato.registro.corsi[0] })')

  const dialogo = page.getByRole('dialog', { name: /^Corso — / })
  await expect(dialogo).toBeVisible()
  // Classe e materia sono ferme: il primo campo che prende il fuoco è il nome.
  const titolo = dialogo.getByRole('textbox', { name: /Come si chiama/ })
  await expect(titolo).toBeFocused()
  await expect(dialogo.getByRole('combobox', { name: /^Classe/ })).toHaveCount(0)

  // Una fascia, poi la stessa ripetuta in un altro giorno; la prima dura due UD.
  await dialogo.getByRole('button', { name: 'Aggiungi una fascia' }).click()
  await dialogo.getByRole('button', { name: 'Ripeti questa fascia in un altro giorno' }).first().click()
  const righe = dialogo.locator('.slot-riga')
  await expect(righe).toHaveCount(2)
  const ud = righe.first().getByRole('spinbutton')
  await ud.fill('2')
  await ud.press('Tab')

  // «Genera le lezioni» salva l'orario scritto e poi genera.
  await dialogo.getByRole('button', { name: 'Genera le lezioni' }).click()
  const imposta = await partita(page, 'orario.imposta')
  expect(imposta.corsoId).toBe(corsoId)
  const genera = await partita(page, 'orario.genera')
  expect(genera.corsoId).toBe(corsoId)
  await attendiRisposte(page)

  await titolo.fill('Matematica di prova')
  await tasto(dialogo, 'Salva').click()
  const salvato = await partita(page, 'corso.salva')
  const corso = salvato.corso as { id: string, titolo: string, orario: Array<{ giorno: number, durataMin: number }> }
  expect(corso.id).toBe(corsoId)
  expect(corso.titolo).toBe('Matematica di prova')
  expect(corso.orario.map((r) => r.giorno)).toEqual([1, 2])
  expect(corso.orario[0].durataMin).toBe(2 * minutiUd)
  await expect(dialogo).toHaveCount(0)

  // Togliendo una fascia, il salvataggio la perde.
  await apri(page, '() => prova.moduli.corso({ corso: prova.stato.registro.corsi[0] })')
  const ancora = page.getByRole('dialog', { name: /^Corso — / })
  await ancora.getByRole('button', { name: 'Aggiungi una fascia' }).click()
  await expect(ancora.locator('.slot-riga')).toHaveCount(1)
  await ancora.getByRole('button', { name: 'Togli questa fascia' }).click()
  await expect(ancora.locator('.slot-riga')).toHaveCount(0)
  await tasto(ancora, 'Salva').click()
  const senza = await partita(page, 'corso.salva')
  expect((senza.corso as { orario: unknown[] }).orario).toEqual([])

  expect(errori).toEqual([])
  await page.close()
})

test('Esc su un modulo scritto chiede prima di lasciarlo', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await apri(page, '() => prova.moduli.corso({ corso: prova.stato.registro.corsi[0] })')
  const dialogo = page.getByRole('dialog', { name: /^Corso — / })

  // Niente scritto: Esc chiude subito.
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)

  await apri(page, '() => prova.moduli.corso({ corso: prova.stato.registro.corsi[0] })')
  await dialogo.getByRole('textbox', { name: /Come si chiama/ }).fill('Scritto e non salvato')
  await page.keyboard.press('Escape')
  const domanda = page.getByRole('dialog', { name: 'Lasciare le modifiche?' })
  await expect(domanda).toBeVisible()
  // «Annulla» alla domanda: il modulo resta, con quel che c'era scritto.
  await tasto(domanda, 'Annulla').click()
  await expect(domanda).toHaveCount(0)
  await expect(dialogo.getByRole('textbox', { name: /Come si chiama/ })).toHaveValue('Scritto e non salvato')
  // «Lascia»: se ne vanno tutti e due, e non parte niente.
  await page.keyboard.press('Escape')
  await tasto(domanda, 'Lascia').click()
  await expect(domanda).toHaveCount(0)
  await expect(dialogo).toHaveCount(0)
  expect(await quante(page, 'corso.salva')).toBe(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ la consegna

test('consegna: che cosa ed entro un giorno preciso', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const corsoId = await valuta<string>(page, 'prova.stato.registro.corsi[0].id')
  await apri(page, '(c) => prova.moduli.consegna({ corsoId: c, corsoFisso: true })', corsoId)

  const dialogo = page.getByRole('dialog', { name: 'Nuova consegna' })
  await expect(dialogo).toBeVisible()
  const cheCosa = dialogo.getByRole('textbox', { name: /Che cosa/ })
  await expect(cheCosa).toBeFocused()
  await cheCosa.fill('Esercizi 4–7 pagina 132')
  await dialogo.getByRole('combobox', { name: /Il termine è/ }).selectOption('data')
  const entro = dialogo.getByRole('textbox', { name: /Entro il/ })
  await expect(entro).toBeVisible()
  await entro.fill('30.9.26')
  await entro.press('Tab')
  await tasto(dialogo, 'Salva').click()

  const salvata = await partita(page, 'consegna.salva')
  const consegna = salvata.consegna as Record<string, unknown>
  expect(consegna.testo).toBe('Esercizi 4–7 pagina 132')
  expect(consegna.corsoId).toBe(corsoId)
  expect(consegna.scadenza).toBe('2026-09-30')
  expect(consegna.scadenzaLezioneId).toBeNull()
  expect(consegna.a).toBe('classe')
  await expect(dialogo).toHaveCount(0)

  // Solo alcune persone: si spunta chi, e l'azione porta i loro id.
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')
  await apri(page, '(c) => prova.moduli.consegna({ corsoId: c, corsoFisso: true })', corsoId)
  const seconda = page.getByRole('dialog', { name: 'Nuova consegna' })
  await seconda.getByRole('textbox', { name: /Che cosa/ }).fill('Relazione')
  await seconda.getByRole('combobox', { name: /A chi tocca/ }).selectOption('allievi')
  await seconda.getByRole('checkbox', { name: /Esempio/ }).check()
  await seconda.getByRole('combobox', { name: /Il termine è/ }).selectOption('nessuno')
  await tasto(seconda, 'Salva').click()
  const perAlcuni = (await partita(page, 'consegna.salva')).consegna as Record<string, unknown>
  expect(perAlcuni.a).toBe('allievi')
  expect(perAlcuni.allieviIds).toEqual([allievo])
  expect(perAlcuni.scadenza).toBeNull()
  await expect(seconda).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ la valutazione

// Un momento di valutazione del primo corso, nel registro: il modulo lo corregge.
const MOMENTO = `() => {
  const r = prova.stato.registro
  const momento = { id: 'val-prova', corsoId: r.corsi[0].id, lezioneId: null, pianoId: null,
    attivitaId: null, titolo: 'Verifica', tipo: 'scritto', data: '2026-09-14', peso: 1,
    scala: { ...r.impostazioni.scala }, descrizione: '', allegati: [], voti: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, valutazioni: [...r.valutazioni, momento] } })
}`

test('valutazione: titolo e peso del momento', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, MOMENTO)
  await apri(page, "() => prova.moduli.valutazione(prova.stato.registro.valutazioni.find(v => v.id === 'val-prova'))")

  const dialogo = page.getByRole('dialog', { name: 'Momento di valutazione' })
  await expect(dialogo).toBeVisible()
  const titolo = dialogo.getByRole('textbox', { name: /^Titolo/ })
  await expect(titolo).toBeFocused()
  await expect(titolo).toHaveValue('Verifica')
  await titolo.fill('Verifica sulle equazioni')
  await dialogo.getByRole('spinbutton', { name: /^Peso/ }).fill('2')
  await titolo.press('Enter')

  const salvata = (await partita(page, 'valutazione.salva')).valutazione as Record<string, unknown>
  expect(salvata.id).toBe('val-prova')
  expect(salvata.titolo).toBe('Verifica sulle equazioni')
  expect(salvata.peso).toBe(2)
  expect(salvata.data).toBe('2026-09-14')
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ la materia

test('materia: nome e sigla, e il richiamo al doppione', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await apri(page, '() => prova.moduli.materia()')

  const dialogo = page.getByRole('dialog', { name: 'Nuova materia' })
  await expect(dialogo).toBeVisible()
  const nome = dialogo.getByRole('textbox', { name: /^Nome/ })
  await expect(nome).toBeFocused()
  // Un nome che assomiglia a una materia che c'è (un refuso: lo stesso nome
  // scritto uguale è un doppione, che rifiuta il salvataggio): lo si dice prima.
  await nome.fill('Matematca')
  await nome.press('Tab')
  await expect(dialogo).toContainText('Assomiglia a «Matematica»')

  await nome.fill('Storia')
  await dialogo.getByRole('textbox', { name: /^Sigla/ }).fill('STO')
  // Invio da un campo salva.
  await nome.press('Enter')
  const salvata = (await partita(page, 'materia.salva')).materia as Record<string, unknown>
  expect(salvata.nome).toBe('Storia')
  expect(salvata.sigla).toBe('STO')
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ le assenze

test('periodo di assenze: date, lettera, e il periodo al rovescio', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const classeId = await valuta<string>(page, 'prova.stato.registro.classi[0].id')
  await apri(page, '() => prova.moduli.assenze(prova.stato.registro.classi[0])')

  const dialogo = page.getByRole('dialog', { name: 'Nuovo periodo di assenze' })
  await expect(dialogo).toBeVisible()
  const dal = dialogo.locator('input[name="dal"]')
  const al = dialogo.locator('input[name="al"]')
  await expect(dal).toBeFocused()

  // Al prima di Dal: l'errore in cima, la finestra resta, non parte niente.
  await dal.fill('2026-12-01')
  await al.fill('2026-11-01')
  await tasto(dialogo, 'Salva').click()
  await expect(dialogo.getByRole('alert').locator('li')).not.toHaveCount(0)
  expect(await quante(page, 'assenze.salva')).toBe(0)

  await al.fill('2027-01-29')
  await dialogo.getByRole('textbox', { name: /^Oggetto/ }).fill('Assenze di {allievo}')
  await tasto(dialogo, 'Salva').click()
  const salvato = await partita(page, 'assenze.salva')
  expect(salvato.classeId).toBe(classeId)
  const blocco = salvato.blocco as Record<string, unknown>
  expect(blocco.dal).toBe('2026-12-01')
  expect(blocco.al).toBe('2027-01-29')
  expect(blocco.oggetto).toBe('Assenze di {allievo}')
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ il docente di classe

test('docente di classe: recapito e comunicazione', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const classeId = await valuta<string>(page, 'prova.stato.registro.classi[0].id')

  // Il recapito: etichetta e indirizzo.
  await apri(page, '() => prova.moduli.recapito(prova.stato.registro.classi[0])')
  const recapito = page.getByRole('dialog', { name: 'Nuovo recapito' })
  await expect(recapito).toBeVisible()
  const etichetta = recapito.getByRole('textbox', { name: /^Etichetta/ })
  await expect(etichetta).toBeFocused()
  await etichetta.fill('Segreteria')
  await recapito.getByRole('textbox', { name: /^Indirizzo/ }).fill('segreteria@scuola.ch')
  await recapito.getByRole('checkbox', { name: /In copia a ogni comunicazione nuova/ }).check()
  await tasto(recapito, 'Salva').click()
  const salvato = await partita(page, 'recapito.salva')
  expect(salvato.classeId).toBe(classeId)
  expect(salvato.recapito).toMatchObject({
    etichetta: 'Segreteria', email: 'segreteria@scuola.ch', predefinito: true,
  })
  await expect(recapito).toHaveCount(0)

  // La comunicazione: «Salva bozza» la tiene.
  await apri(page, '() => prova.moduli.comunicazione(prova.stato.registro.classi[0])')
  const comunicazione = page.getByRole('dialog', { name: 'Nuova comunicazione' })
  await expect(comunicazione).toBeVisible()
  const oggetto = comunicazione.getByRole('textbox', { name: /^Oggetto/ })
  await expect(oggetto).toBeFocused()
  await oggetto.fill('Uscita di classe')
  await comunicazione.getByRole('textbox', { name: /^Testo/ }).fill('Venerdì si esce alle 10.')
  await tasto(comunicazione, 'Salva bozza').click()
  const bozza = await partita(page, 'comunicazione.salva')
  expect(bozza.classeId).toBe(classeId)
  expect(bozza.comunicazione).toMatchObject({ oggetto: 'Uscita di classe', corpo: 'Venerdì si esce alle 10.' })
  await expect(comunicazione).toHaveCount(0)

  // «Salva e apri nella posta»: chiede prima, poi salva e manda.
  await apri(page, '() => prova.moduli.comunicazione(prova.stato.registro.classi[0])')
  await comunicazione.getByRole('textbox', { name: /^Oggetto/ }).fill('Riunione')
  await comunicazione.getByRole('textbox', { name: /^Testo/ }).fill('Giovedì alle 18.')
  await comunicazione.getByRole('button', { name: 'Salva e apri nella posta' }).click()
  const domanda = page.getByRole('dialog', { name: /^Preparare la bozza per/ })
  await expect(domanda).toBeVisible()
  await tasto(domanda, 'Prepara').click()
  const inviata = await partita(page, 'comunicazione.invia')
  expect(inviata.classeId).toBe(classeId)
  const salvataPrima = await valuta<Azione>(page, ULTIMA, 'comunicazione.salva')
  expect((salvataPrima.comunicazione as { id: string }).id).toBe(inviata.comunicazioneId)
  await expect(comunicazione).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ il recupero

// Un momento con la prima persona assente alla prova, e il suo recupero da
// fissare, come lo calcola la tabella dei recuperi.
const RECUPERO = `() => {
  const r = prova.stato.registro
  const allievo = r.classi[0].allievi[0]
  const momento = { id: 'val-recupero', corsoId: r.corsi[0].id, lezioneId: null, pianoId: null,
    attivitaId: null, titolo: 'Verifica', tipo: 'scritto', data: '2026-09-14', peso: 1,
    scala: { ...r.impostazioni.scala }, descrizione: '', allegati: [],
    voti: [{ allievoId: allievo.id, valore: null, assente: true }],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, valutazioni: [...r.valutazioni, momento] } })
  window.recuperoDiProva = { momento, allievo, corsoId: momento.corsoId, classeId: r.classi[0].id,
    stato: 'daFissare', previstoIl: null, riconsegnataIl: null, nota: '', voto: null,
    documento: null, daAppello: false }
}`

test('recupero: il giorno in cui si rifà, e «Non si recupera»', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, RECUPERO)
  const allievo = await valuta<string>(page, 'prova.stato.registro.classi[0].allievi[0].id')
  await apri(page, '() => prova.moduli.recupero(window.recuperoDiProva)')

  const dialogo = page.getByRole('dialog', { name: 'Recupero della prova' })
  await expect(dialogo).toBeVisible()
  const giorno = dialogo.getByRole('textbox', { name: /^Si rifà il/ })
  await expect(giorno).toBeFocused()
  await giorno.fill('1.10.26')
  await giorno.press('Tab')
  await dialogo.getByRole('textbox', { name: /^Nota/ }).fill('in laboratorio')
  await tasto(dialogo, 'Salva').click()
  const fissato = await partita(page, 'recupero.imposta')
  expect(fissato).toMatchObject({
    valutazioneId: 'val-recupero', allievoId: allievo, previstoIl: '2026-10-01',
    nota: 'in laboratorio', dispensato: false,
  })
  await expect(dialogo).toHaveCount(0)

  await apri(page, '() => prova.moduli.recupero(window.recuperoDiProva)')
  await dialogo.getByRole('button', { name: 'Non si recupera' }).click()
  await attendi(page, "richieste.some(m=>m.azione?.tipo==='recupero.imposta')")
  const dispensato = await valuta<Azione>(page, ULTIMA, 'recupero.imposta')
  expect(dispensato).toMatchObject({ valutazioneId: 'val-recupero', previstoIl: null, dispensato: true })
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ la supplenza

test('supplenza: l’indirizzo serve, le ore si spuntano', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const [prima, seconda] = await valuta<[string, string]>(page,
    '[prova.stato.registro.lezioni[0].id, prova.stato.registro.lezioni[1].id]')
  await apri(page, '() => prova.moduli.supplenza(prova.stato.registro.lezioni[0])')

  const dialogo = page.getByRole('dialog', { name: 'Prepara la supplenza' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('combobox', { name: /A chi mandarlo/ })).toBeFocused()
  // L'ora da cui si parte è spuntata, l'altra dello stesso giorno no.
  await expect(dialogo.getByRole('checkbox')).toHaveCount(2)
  const suaOra = dialogo.getByRole('checkbox', { name: /DIC4a/ })
  const altraOra = dialogo.getByRole('checkbox', { name: /DIC4b/ })
  await expect(suaOra).toBeChecked()
  await expect(altraOra).not.toBeChecked()

  // Al supplente senza indirizzo: l'errore in cima, niente parte.
  await dialogo.getByRole('textbox', { name: /^Supplente/ }).fill('Maria Rossi')
  await tasto(dialogo, 'Prepara').click()
  await expect(dialogo.getByRole('alert')).toContainText('Manca l’indirizzo e-mail.')
  expect(await quante(page, 'supplenza.prepara')).toBe(0)

  await dialogo.getByRole('textbox', { name: /^E-mail/ }).fill('maria.rossi@scuola.ch')
  await altraOra.check()
  await tasto(dialogo, 'Prepara').click()
  const preparata = await partita(page, 'supplenza.prepara')
  expect(preparata).toMatchObject({
    supplente: 'Maria Rossi', email: 'maria.rossi@scuola.ch', segretariato: false,
  })
  expect([...(preparata.lezioniIds as string[])].sort()).toEqual([prima, seconda].sort())
  await expect(dialogo).toHaveCount(0)

  // Solo lo zip: niente indirizzo, e l'azione non ne porta.
  await apri(page, '() => prova.moduli.supplenza(prova.stato.registro.lezioni[0])')
  await dialogo.getByRole('combobox', { name: /A chi mandarlo/ }).selectOption('nessuno')
  await tasto(dialogo, 'Prepara').click()
  const soloZip = await partita(page, 'supplenza.prepara')
  expect(soloZip.lezioniIds).toEqual([prima])
  expect('email' in soloZip).toBe(false)
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ le risorse

// Un piano del primo corso, aperto nella pagina dei piani, con un collegamento.
const PIANO = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const piano = { id: 'piano-risorse', corsoId: corso.id, obiettivi: ['Le frazioni'], prerequisiti: '',
    attivita: [], tag: [], creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z',
    risorse: [{ id: 'ris-1', tipo: 'collegamento', titolo: 'Esercizi in rete', url: 'https://esempio.ch/a',
      aggiuntaIl: '2026-09-01T08:00:00.000Z' }] }
  const lezioni = r.lezioni.map((l) => l.corsoId === corso.id ? { ...l, pianoId: piano.id } : l)
  const ora = lezioni.find((l) => l.corsoId === corso.id)
  prova.vai({ pagina: 'pagina.corso.piani', soggetto: { tipo: 'piano', id: piano.id } },
    { contesto: { corsoId: corso.id, lezioneId: ora.id },
      altro: { registro: { ...r, lezioni, piani: [...r.piani, piano] } } })
}`

test('risorse del piano: un collegamento nuovo e la modifica di uno che c’è', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  await valuta(page, PIANO)
  await valuta(page, FOTOGRAMMA)
  await valuta(page, 'richieste.length = 0')

  const vista = page.locator('.vista--piani')
  // Il nome è il titolo del pulsante o il suo testo: tutti e due dicono «collegamento».
  await vista.getByRole('button', { name: /^(Aggiungi un collegamento|Collegamento)$/ }).first().click()
  const nuovo = page.getByRole('dialog', { name: 'Nuovo collegamento' })
  await expect(nuovo).toBeVisible()
  const indirizzo = nuovo.getByRole('textbox', { name: /^Indirizzo/ })
  await expect(indirizzo).toBeFocused()
  await indirizzo.fill('https://esempio.ch/frazioni')
  await nuovo.getByRole('textbox', { name: /^Titolo/ }).fill('Frazioni in rete')
  await tasto(nuovo, 'Aggiungi').click()
  const aggiunta = await partita(page, 'risorsa.aggiungi')
  expect(aggiunta).toMatchObject({
    pianoId: 'piano-risorse', attivitaId: null, genere: 'collegamento',
    url: 'https://esempio.ch/frazioni', titolo: 'Frazioni in rete',
  })
  await expect(nuovo).toHaveCount(0)
  await attendiRisposte(page)

  // La matita della risorsa che c'è: titolo e note.
  await vista.getByRole('button', { name: 'Modifica la risorsa' }).first().click()
  const modifica = page.getByRole('dialog', { name: 'Risorsa Esercizi in rete' })
  await expect(modifica).toBeVisible()
  await modifica.getByRole('textbox', { name: /^Titolo/ }).fill('Esercizi sulle frazioni')
  await modifica.getByRole('textbox', { name: /^Note/ }).fill('per casa')
  await tasto(modifica, 'Salva').click()
  const salvata = await partita(page, 'risorsa.salva')
  expect(salvata.pianoId).toBe('piano-risorse')
  expect(salvata.risorsa).toMatchObject({ id: 'ris-1', titolo: 'Esercizi sulle frazioni', note: 'per casa' })
  await expect(modifica).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ l'evento ICS

const EVENTO = {
  chiave: 'cal-1:2026-09-21T10:00', data: '2026-09-21', inizio: '10:00', fine: '10:45',
  titolo: 'MAT 4a', luogo: 'Aula 3', annullato: false,
}

test('evento ICS: la lezione dall’evento e la regola che lo riconosce', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const corsoId = await valuta<string>(page, 'prova.stato.registro.corsi[0].id')
  await apri(page, "(e) => prova.moduli.eventoIcs({ evento: e, gruppo: [e], modo: 'genera' })", EVENTO)

  const dialogo = page.getByRole('dialog', { name: 'Genera la lezione dall’evento' })
  await expect(dialogo).toBeVisible()
  await dialogo.getByRole('combobox', { name: /^Corso/ }).selectOption(corsoId)
  await expect(dialogo.getByRole('textbox', { name: /^Aula/ })).toHaveValue('Aula 3')
  await expect(dialogo.getByRole('textbox', { name: /Riconosci gli eventi che dicono/ })).toHaveValue('MAT 4a')
  await expect(dialogo.getByRole('checkbox', { name: /Ricorda l’abbinamento/ })).toBeChecked()
  await tasto(dialogo, 'Genera la lezione').click()

  const applica = await partita(page, 'calendario.applica')
  const crea = applica.crea as Array<Record<string, unknown>>
  expect(crea).toHaveLength(1)
  expect(crea[0]).toMatchObject({ corsoId, data: '2026-09-21', aula: 'Aula 3' })
  const regole = applica.regole as Array<{ testo: string, corsoId: string | null }>
  expect(regole.some((r) => r.testo === 'MAT 4a' && r.corsoId === corsoId), JSON.stringify(regole)).toBe(true)
  expect(applica.allinea).toEqual([])
  expect(applica.annulla).toEqual([])
  await expect(dialogo).toHaveCount(0)

  // Senza testo da riconoscere e con la spunta: lo si dice, non parte niente.
  await apri(page, "(e) => prova.moduli.eventoIcs({ evento: e, gruppo: [e], modo: 'genera' })", EVENTO)
  await dialogo.getByRole('textbox', { name: /Riconosci gli eventi che dicono/ }).fill('')
  await tasto(dialogo, 'Genera la lezione').click()
  await expect(dialogo.getByRole('alert').locator('li')).toHaveCount(1)
  expect(await quante(page, 'calendario.applica')).toBe(0)
  await page.keyboard.press('Escape')
  await tasto(page.getByRole('dialog', { name: 'Lasciare le modifiche?' }), 'Lascia').click()
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ il confronto col calendario

// Il confronto dell'host: un evento da creare sul primo corso. Le domande che
// non sono il confronto restano senza risposta, come prima.
const CONFRONTO = "m.procedura === 'calendario.confronta' ? { tipo: 'riscontro', id: m.id, ok: true, dati: {" +
  " voci: [{ id: 'v1', esito: 'nuova', corsoId: prova.stato.registro.corsi[0].id, via: 'regola'," +
  " data: '2026-09-21', inizio: '08:20', fine: '09:05'," +
  " fasce: [{ inizio: '08:20', fine: '09:05', tipo: 'lezione' }], aula: 'A12', titoli: ['MAT']," +
  ' lezioneId: null, statoLezione: null, differenze: [], cambiaOrario: false }],' +
  ' senzaCorso: [], assenti: [], ignorati: 0, scartati: 0, eventi: 1,' +
  " copre: { dal: '2026-09-21', al: '2026-09-21' } } }" +
  " : { tipo: 'risposta', id: m.id, ok: true }"

test('calendario: aggiungere un indirizzo e applicare le spunte del confronto', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(CONFRONTO) })

  // Senza calendari non c'è niente da scegliere, e l'indirizzo si aggiunge con
  // Invio senza salvare.
  await apri(page, '() => prova.moduli.calendario()')
  const dialogo = page.getByRole('dialog', { name: 'Confronto con il calendario' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo.getByRole('combobox')).toHaveCount(0)
  const indirizzo = dialogo.getByRole('textbox', { name: 'Indirizzo o file di un calendario da aggiungere' })
  await indirizzo.fill('https://esempio.ch/orario.ics')
  await indirizzo.press('Enter')
  const aggiunto = await partita(page, 'calendario.aggiungi')
  expect(aggiunto.origine).toBe('https://esempio.ch/orario.ics')
  expect(await quante(page, 'calendario.applica')).toBe(0)
  await expect(dialogo).toBeVisible()
  // Quel che è scritto nel campo dell'indirizzo conta come modulo scritto.
  await page.keyboard.press('Escape')
  await tasto(page.getByRole('dialog', { name: 'Lasciare le modifiche?' }), 'Lascia').click()
  await expect(dialogo).toHaveCount(0)

  // Con un calendario: il confronto propone un'ora da creare, spuntata.
  await valuta(page, `() => {
    const r = prova.stato.registro
    const impostazioni = { ...r.impostazioni, calendario: {
      calendari: [{ id: 'cal-1', nome: 'Orario', origine: 'https://esempio.ch/orario.ics' }], regole: [] } }
    prova.aggiorna({ registro: { ...r, impostazioni } })
  }`)
  await apri(page, "() => prova.moduli.calendario('cal-1')")
  await expect(dialogo.getByRole('combobox', { name: 'Il calendario da confrontare' })).toHaveValue('cal-1')
  await expect(dialogo).toContainText('Da creare')
  const voce = dialogo.getByRole('checkbox', { name: /08:20$/ })
  await expect(voce).toBeChecked()
  await tasto(dialogo, 'Applica le spunte').click()
  const applica = await partita(page, 'calendario.applica')
  const corsoId = await valuta<string>(page, 'prova.stato.registro.corsi[0].id')
  expect(applica.crea).toEqual([{
    corsoId, data: '2026-09-21', fasce: [{ inizio: '08:20', fine: '09:05', tipo: 'lezione' }], aula: 'A12',
  }])
  expect(applica.allinea).toEqual([])
  expect(applica.annulla).toEqual([])
  await expect(dialogo).toHaveCount(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ OneDrive

test('OneDrive: si apre e si chiude senza rete', async ({ browser }) => {
  const { page, errori } = await pannello(browser)

  // Senza account: la finestra propone di collegarne uno, e si chiude.
  await apri(page, "() => prova.COMANDI_UI.find(c => c.id === 'file.apriDaOneDrive').al()")
  const dialogo = page.getByRole('dialog', { name: 'Apri da OneDrive' })
  await expect(dialogo).toBeVisible()
  await expect(dialogo).toContainText('Nessun account con OneDrive')
  await expect(dialogo.getByRole('button', { name: 'Collega un account' })).toBeVisible()
  await dialogo.getByRole('button', { name: 'Chiudi', exact: true }).last().click()
  await expect(dialogo).toHaveCount(0)
  expect(await quante(page, 'microsoft.aggiungi')).toBe(0)

  // Con un account: chiede la cartella; Esc chiude anche mentre aspetta.
  await valuta(page, `prova.aggiorna({ microsoft: { ...prova.stato.microsoft,
    account: [{ indirizzo: 'prova@scuola.ch', sulComputer: true, onedrive: true }] } })`)
  await apri(page, "() => prova.COMANDI_UI.find(c => c.id === 'file.apriDaOneDrive').al()")
  await expect(dialogo).toBeVisible()
  await attendi(page, "richieste.some(m => m.procedura === 'onedrive.elenco' && m.ingresso?.account === 'prova@scuola.ch')")
  await page.keyboard.press('Escape')
  await expect(dialogo).toHaveCount(0)
  expect(await quante(page, 'onedrive.apri')).toBe(0)

  expect(errori).toEqual([])
  await page.close()
})

// ------------------------------------------------------------------ l'importazione da un altro registro

// Quel che `registro.altrove` dice dell'altro registro: una classe, due materie.
const ALTROVE = "m.procedura === 'registro.altrove' ? { tipo: 'riscontro', id: m.id, ok: true, dati: {" +
  " anno: '2025-2026', impostazioni: { scala: '1–6', carte: 1, loghi: 0, docente: '', liste: 0 }," +
  " materie: [{ nome: 'Matematica', nuova: false }, { nome: 'Fisica', nuova: true }]," +
  " classi: [{ id: 'cl-altrove', nome: 'DIC3a', persone: 12, corsi: 2, materie: ['Matematica'], piani: 3," +
  ' esiste: false }], calendari: [], regole: 0 } }' +
  " : { tipo: 'risposta', id: m.id, ok: true }"

test('importazione da un altro registro: origine, blocchi, «Importa»', async ({ browser }) => {
  const { page, errori } = await pannello(browser, { ponteJs: ponte(ALTROVE) })
  await apri(page, "() => prova.COMANDI_UI.find(c => c.id === 'file.importaRegistro').al()")

  const dialogo = page.getByRole('dialog', { name: 'Importa da un altro registro' })
  await expect(dialogo).toBeVisible()
  const origine = dialogo.getByRole('combobox', { name: /Da quale registro/ })
  await expect(origine).toHaveValue('C:/esempio/2025-2026.regi')
  await attendi(page, "richieste.some(m => m.procedura === 'registro.altrove' && m.ingresso?.percorso === 'C:/esempio/2025-2026.regi')")
  await expect(dialogo).toContainText('Anno 2025-2026')

  // Le caselle seguono quel che l'altro registro ha: spuntate di serie, piani no.
  await expect(dialogo.getByRole('checkbox', { name: /^Impostazioni del documento/ })).toBeChecked()
  await expect(dialogo.getByRole('checkbox', { name: /^Tutte le materie/ })).toBeChecked()
  const classe = dialogo.getByRole('checkbox', { name: /^DIC3a/ })
  await expect(classe).toBeChecked()
  await dialogo.getByRole('checkbox', { name: /^Impostazioni del documento/ }).uncheck()

  await tasto(dialogo, 'Importa').click()
  const importa = await partita(page, 'registro.importa')
  expect(importa).toEqual({
    tipo: 'registro.importa',
    percorso: 'C:/esempio/2025-2026.regi',
    impostazioni: false,
    materie: true,
    classi: [{ classeId: 'cl-altrove', anagrafica: true, corsi: true }],
    piani: false,
    calendari: false,
  })
  await expect(dialogo).toHaveCount(0)

  // Niente spuntato: lo si dice, e non parte niente.
  await apri(page, "() => prova.COMANDI_UI.find(c => c.id === 'file.importaRegistro').al()")
  await expect(dialogo).toContainText('Anno 2025-2026')
  for (const nome of [/^Impostazioni del documento/, /^Tutte le materie/, /^Le classi spuntate/]) {
    await dialogo.getByRole('checkbox', { name: nome }).uncheck()
  }
  await tasto(dialogo, 'Importa').click()
  await expect(dialogo.getByRole('alert')).toContainText('Non c’è niente di spuntato da portare.')
  expect(await quante(page, 'registro.importa')).toBe(0)

  expect(errori).toEqual([])
  await page.close()
})
