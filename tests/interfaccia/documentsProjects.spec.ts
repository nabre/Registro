// Pagina Documenti, scheda delle persone in formazione: con dei progetti nel
// corso i documenti stanno in linguette, «Corso» e una per progetto.
//
// Si fissa che:
//
// - «Corso» ha le schede di ognuno e non più le righe dei progetti;
// - la linguetta di un progetto ha una riga per persona, col suo rapporto;
// - la scelta si ricorda per corso, regge un ridisegno, si cambia con le frecce;
// - un progetto che sparisce riporta su «Corso», e senza progetti non c'è selettore.
//
// Esecuzione: `node esbuild.mjs --ui` e poi
// `npx playwright test -c tests/interfaccia/playwright.config.ts documentsProjects`.

import { expect, test } from '@playwright/test'

import { FRAME, attendi, pannello, valuta } from './banco'

const PREPARA = `() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const classe = r.classi.find((c) => c.id === corso.classeId)
  const attivi = classe.allievi.filter((a) => a.attivo)
  const ist = '2026-09-01T08:00:00.000Z'
  const progetto = (id, titolo) => ({ id, corsoId: corso.id, titolo, obiettivi: [], stato: 'in-corso',
    fasi: [{ id: 'f1', titolo: 'Fase' }], criteri: [], livelli: [], compiti: [], giudizi: [],
    matrice: [], risorse: [], creatoIl: ist, aggiornatoIl: ist })
  const registro = { ...r, progetti: [progetto('prg-a', 'Giornale di classe'), progetto('prg-b', 'Orto')] }
  const dove = prova.collocazioneDi(registro, 'progetto-allievo', 'prg-a', { allievoId: attivi[0].id })
  const percorso = prova.percorsoDi(dove, 'pdf')
  prova.vai({ pagina: 'pagina.corso.documenti', soggetto: { tipo: 'corso', id: corso.id } }, {
    contesto: { filtroClasseId: corso.classeId },
    altro: { registro, schedaDocumenti: 'allievi', semestreId: null, linguetteDocumenti: {},
      esportati: [{ percorso, misura: 10, revisione: 0 }], anteprima: null } })
  return { corsoId: corso.id, persone: attivi.length, percorso }
}`

interface Preparato { corsoId: string, persone: number, percorso: string }

test('documentsProjects', async ({ browser }) => {
  const { page, errori } = await pannello(browser)
  const { corsoId, persone, percorso } = await valuta<Preparato>(page, PREPARA)
  await valuta(page, FRAME)
  expect(persone).toBeGreaterThan(0)

  const gruppo = page.getByRole('radiogroup', { name: 'Corso o progetto' })
  const voci = gruppo.getByRole('radio')
  const elenco = page.locator('.documenti--allievi .documenti__elenco')
  await expect(voci).toHaveText(['Corso', 'Giornale di classe', 'Orto'])
  await expect(gruppo.getByRole('radio', { name: 'Corso' })).toHaveAttribute('aria-checked', 'true')
  // «Corso»: le schede di ognuno, i rapporti dei progetti non più in fila.
  await expect(elenco.locator('.documenti__riga').first()).toContainText('· Corso')
  await expect(elenco).not.toContainText('Progetto:')

  // Un progetto: una riga per persona, il nome soltanto; il rapporto fatto si apre.
  await gruppo.getByRole('radio', { name: 'Giornale di classe' }).click()
  await valuta(page, FRAME)
  expect(await valuta(page, `() => prova.stato.linguetteDocumenti['${corsoId}']`)).toBe('prg-a')
  await expect(elenco.locator('.documenti__riga')).toHaveCount(persone)
  await expect(elenco).not.toContainText('· Corso')
  const apribile = elenco.locator('.documenti__riga--apribile .documenti__nome-apri')
  await expect(apribile).toHaveCount(1)
  await apribile.press('Enter')
  await attendi(page, '(p) => prova.stato.anteprima === p', percorso)

  // Il ridisegno non cambia linguetta; le frecce sì, e il fuoco la segue.
  await valuta(page, 'prova.ridisegna()')
  await valuta(page, FRAME)
  const giornale = gruppo.getByRole('radio', { name: 'Giornale di classe' })
  await expect(giornale).toHaveAttribute('aria-checked', 'true')
  await giornale.focus()
  await giornale.press('ArrowRight')
  await valuta(page, FRAME)
  const orto = gruppo.getByRole('radio', { name: 'Orto' })
  await expect(orto).toHaveAttribute('aria-checked', 'true')
  await expect(orto).toBeFocused()

  // Il progetto ricordato sparisce: si torna su «Corso».
  await valuta(page, `() => prova.aggiorna({ registro: { ...prova.stato.registro,
    progetti: prova.stato.registro.progetti.filter((p) => p.id !== 'prg-b') } })`)
  await valuta(page, FRAME)
  await expect(voci).toHaveText(['Corso', 'Giornale di classe'])
  await expect(gruppo.getByRole('radio', { name: 'Corso' })).toHaveAttribute('aria-checked', 'true')

  // Senza progetti niente linguette: solo le schede del corso.
  await valuta(page, '() => prova.aggiorna({ registro: { ...prova.stato.registro, progetti: [] } })')
  await valuta(page, FRAME)
  await expect(gruppo).toHaveCount(0)
  await expect(elenco.locator('.documenti__riga').first()).toContainText('· Corso')

  expect(errori).toEqual([])
})
