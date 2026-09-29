// La prova del fumo dell'interfaccia: il registro vero, in un Electron vero,
// sul campione. Le altre prove montano il bundle `ui` in un Chromium con un
// ponte finto; qui il pannello arriva dal main process di `dist/main.cjs`,
// dal protocollo `registro://` e dal documento aperto davvero.
//
// Vuole `dist/` costruita (`tools/uiTests.mjs` la costruisce) e un display: su
// Linux senza X servirebbe `xvfb-run`. Lavora in una cartella provvisoria che
// fa da `userData`, come `tools/fumo.mjs`, e non tocca quella vera.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { _electron as electron, expect, test, type Page } from '@playwright/test'

import { RADICE } from './banco'

const CAMPIONE = join(RADICE, 'tests', 'samples', 'anno_esempio.regi')
const PRINCIPALE = join(RADICE, 'dist', 'main.cjs')

/** Il nome della cartella dei dati sotto `APPDATA`, come in `tools/fumo.mjs`. */
const NOME_APPLICAZIONE = 'Regiklass'

test('il registro si accende sul campione e mostra il pannello', async () => {
  expect(existsSync(PRINCIPALE), `manca ${PRINCIPALE}: costruisci con npm run build`).toBe(true)
  test.setTimeout(120_000)

  const radice = mkdtempSync(join(tmpdir(), 'regiklass-interfaccia-'))
  const appData = join(radice, 'AppData')
  const userData = join(appData, NOME_APPLICAZIONE)
  const lavoro = join(radice, 'lavoro')
  const temporanei = join(radice, 'temp')
  for (const cartella of [userData, lavoro, temporanei]) mkdirSync(cartella, { recursive: true })

  // Una copia: il registro può riscrivere il documento che apre, il campione no.
  const documento = join(lavoro, 'anno_esempio.regi')
  copyFileSync(CAMPIONE, documento)
  writeFileSync(join(userData, 'impostazioni.json'), JSON.stringify({
    cartellaLavoro: lavoro,
    // Nessuna rete all'avvio (ADR-45), e nessun condotto: qui si guarda la finestra.
    'registroDocenti.aggiornamenti.controlloAutomatico': false,
    // La lingua del sistema varia da macchina a macchina (il runner di CI è in
    // inglese): la prova cerca le etichette italiane.
    'registroDocenti.aspetto.lingua': 'it',
  }, null, 2))

  const ambiente: Record<string, string> = {}
  for (const [chiave, valore] of Object.entries(process.env)) {
    if (valore !== undefined) ambiente[chiave] = valore
  }
  const ereditate = ['REGISTRO_CONDOTTO', 'REGISTRO_CHIAVE', 'REGISTRO_DATI', 'REGISTRO_USERDATA', 'ELECTRON_RUN_AS_NODE']
  for (const chiave of ereditate) Reflect.deleteProperty(ambiente, chiave)
  Object.assign(ambiente, {
    APPDATA: appData,
    XDG_CONFIG_HOME: appData,
    TEMP: temporanei,
    TMP: temporanei,
    TMPDIR: temporanei,
    // Associazione dei `.regi`, `regi` nel PATH, identità delle notifiche:
    // tutte scritture nel registro di Windows o nel profilo.
    REGISTRO_SENZA_INTEGRAZIONE: '1',
    REGISTRO_SENZA_IDENTITA: '1',
  })

  // Il pacchetto `electron`, letto da Node, è il percorso dell'eseguibile.
  const eseguibile = createRequire(__filename)('electron') as string
  const app = await electron.launch({
    executablePath: eseguibile,
    args: [RADICE, `--user-data-dir=${userData}`, documento],
    cwd: radice,
    env: ambiente,
  })
  const errori: string[] = []
  try {
    // Prima vengono la schermata d'avvio e la sentinella: il pannello è la
    // finestra che carica una pagina del registro.
    let pannello: Page | undefined
    await expect.poll(() => {
      pannello = app.windows().find((finestra) => finestra.url().startsWith('registro://pagina/'))
      return pannello !== undefined
    }, { timeout: 60_000 }).toBe(true)
    const page = pannello as Page
    page.on('pageerror', (e) => errori.push(String(e)))

    const navigazione = page.getByRole('navigation', { name: 'Navigazione principale' })
    await expect(navigazione).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('main')).not.toBeEmpty()
    // Il documento aperto è la copia del campione: il main process lo dice nel
    // titolo della sua finestra, senza ponte finto.
    const titoli = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map((finestra) => finestra.getTitle()))
    expect(titoli).toContain(`anno_esempio — ${NOME_APPLICAZIONE}`)
    expect(errori).toEqual([])
  } finally {
    await app.close()
    // Windows lascia togliere la cartella solo quando l'ultimo processo ha
    // lasciato i suoi file.
    rmSync(radice, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  }
})
