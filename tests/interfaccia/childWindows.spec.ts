// Le finestre figlie del registro, nel registro vero: Electron, il main
// process di `dist/main.cjs`, il campione. Una figlia nasce sul posto della
// principale, quel che vi si scrive arriva alla principale (la coda e i dati
// sono uno solo), Ctrl+Z dalla principale lo annulla, chiudendo la principale
// le figlie se ne vanno, e riaprendo il registro tornano sulla loro pagina.
// Corso, classe del docente di classe e periodo sono gli stessi in tutte.
//
// Come `electron.spec.ts`: vuole `dist/` costruita e un display, e lavora in
// una cartella provvisoria che fa da `userData`.

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'

import { RADICE } from './banco'

const CAMPIONE = join(RADICE, 'tests', 'samples', 'anno_esempio.regi')
const PRINCIPALE = join(RADICE, 'dist', 'main.cjs')
const NOME_APPLICAZIONE = 'Regiklass'

/** La cartella provvisoria di una prova: dati, documento, ambiente. */
interface Banco {
  radice: string
  userData: string
  documento: string
  ambiente: Record<string, string>
}

function preparaBanco (): Banco {
  const radice = mkdtempSync(join(tmpdir(), 'regiklass-figlie-'))
  const appData = join(radice, 'AppData')
  const userData = join(appData, NOME_APPLICAZIONE)
  const lavoro = join(radice, 'lavoro')
  const temporanei = join(radice, 'temp')
  for (const cartella of [userData, lavoro, temporanei]) mkdirSync(cartella, { recursive: true })
  const documento = join(lavoro, 'anno_esempio.regi')
  copyFileSync(CAMPIONE, documento)
  writeFileSync(join(userData, 'impostazioni.json'), JSON.stringify({
    cartellaLavoro: lavoro,
    'registroDocenti.aggiornamenti.controlloAutomatico': false,
    'registroDocenti.aspetto.lingua': 'it',
    // L'icona accanto all'orologio terrebbe vivo il registro a finestre chiuse.
    'registroDocenti.vassoio.attivo': false,
  }, null, 2))
  const ambiente: Record<string, string> = {}
  for (const [chiave, valore] of Object.entries(process.env)) {
    if (valore !== undefined) ambiente[chiave] = valore
  }
  for (const chiave of ['REGISTRO_CONDOTTO', 'REGISTRO_CHIAVE', 'REGISTRO_DATI', 'REGISTRO_USERDATA', 'ELECTRON_RUN_AS_NODE']) {
    Reflect.deleteProperty(ambiente, chiave)
  }
  Object.assign(ambiente, {
    APPDATA: appData,
    XDG_CONFIG_HOME: appData,
    TEMP: temporanei,
    TMP: temporanei,
    TMPDIR: temporanei,
    REGISTRO_SENZA_INTEGRAZIONE: '1',
    REGISTRO_SENZA_IDENTITA: '1',
  })
  return { radice, userData, documento, ambiente }
}

async function accendi (banco: Banco): Promise<ElectronApplication> {
  const eseguibile = createRequire(__filename)('electron') as string
  return electron.launch({
    executablePath: eseguibile,
    args: [RADICE, `--user-data-dir=${banco.userData}`, banco.documento],
    cwd: banco.radice,
    env: banco.ambiente,
  })
}

/**
 * Chiude il registro e aspetta che il processo sia uscito: chiusa l'ultima
 * finestra esce da sé, e i suoi file restano tenuti finché non è finito.
 */
async function spegni (app: ElectronApplication): Promise<void> {
  const processo = app.process()
  if (processo.exitCode !== null) return
  const uscito = new Promise((risolvi) => processo.once('exit', risolvi))
  await app.close().catch(() => undefined)
  await uscito
}

/** Toglie la cartella della prova. Windows può tenere un file ancora un attimo. */
function smonta (banco: Banco): void {
  try {
    rmSync(banco.radice, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 })
  } catch (errore) {
    console.warn(`cartella della prova non tolta: ${banco.radice}`, errore)
  }
}

/** Le pagine del registro aperte, per numero di finestra (1 la principale). */
async function finestreDelRegistro (app: ElectronApplication): Promise<Map<number, Page>> {
  const trovate = new Map<number, Page>()
  for (const pagina of app.windows()) {
    if (!pagina.url().startsWith('registro://pagina/')) continue
    const numero = await pagina
      .evaluate(() => Number(document.documentElement.dataset.finestra ?? 1))
      .catch(() => null)
    if (numero !== null) trovate.set(numero, pagina)
  }
  return trovate
}

/** Aspetta la finestra del registro con quel numero, col pannello disegnato. */
async function finestra (app: ElectronApplication, numero: number): Promise<Page> {
  let trovata: Page | undefined
  await expect.poll(async () => {
    trovata = (await finestreDelRegistro(app)).get(numero)
    return trovata !== undefined
  }, { timeout: 60_000 }).toBe(true)
  const pagina = trovata as Page
  await expect(pagina.getByRole('navigation', { name: 'Navigazione principale' })).toBeVisible({ timeout: 30_000 })
  return pagina
}

/** Preme una voce del menu nativo, come farebbe il suo acceleratore. */
async function voceDelMenu (app: ElectronApplication, id: string): Promise<void> {
  await app.evaluate(({ Menu }, voce) => {
    Menu.getApplicationMenu()?.getMenuItemById(voce)?.click()
  }, id)
}

/** I titoli delle finestre native, per vedere chi c'è. */
async function titoli (app: ElectronApplication): Promise<string[]> {
  return app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().filter((f) => !f.isDestroyed()).map((f) => f.getTitle()))
}

/** Un'ora del campione ancora da fare, con l'appello vuoto. */
const ORA = 'lez-mus50qhg-90nysu83'

/** La casella dell'appello di una persona nella prima UD. */
function casella (pagina: Page, persona: string) {
  return pagina.getByRole('button', { name: new RegExp(`^${persona}, UD 1 \\(`) })
}

/** Chiude una finestra nativa dal suo titolo, come la sua ✕. */
async function chiudiDalTitolo (app: ElectronApplication, pezzo: string): Promise<void> {
  await app.evaluate(({ BrowserWindow }, cerca) => {
    BrowserWindow.getAllWindows()
      .find((f) => !f.isDestroyed() && f.getTitle().includes(cerca))
      ?.close()
  }, pezzo)
}

test('una figlia lavora sui dati della principale, e si chiude con lei', async () => {
  expect(existsSync(PRINCIPALE), `manca ${PRINCIPALE}: costruisci con npm run build`).toBe(true)
  test.setTimeout(240_000)
  const banco = preparaBanco()
  const app = await accendi(banco)
  const errori: string[] = []
  try {
    const principale = await finestra(app, 1)
    principale.on('pageerror', (e) => errori.push(String(e)))
    // La navigazione dell'host, come la manda un promemoria.
    await principale.evaluate((ora) => {
      window.postMessage({ tipo: 'naviga', vista: 'lezione', elementoId: ora }, '*')
    }, ORA)
    await expect(casella(principale, 'Bianchi Luca')).toHaveText('-')

    // «Nuova finestra» accanto a «Proietta» (lo stesso comando di Ctrl+Maiusc+N):
    // la figlia nasce sull'ora della principale.
    const nuova = principale.getByRole('button', { name: 'Nuova finestra' })
    await expect(nuova).toHaveAttribute('title', /Ctrl\+Maiusc\+N/)
    await nuova.click()
    const figlia = await finestra(app, 2)
    figlia.on('pageerror', (e) => errori.push(String(e)))
    await expect(casella(figlia, 'Bianchi Luca')).toHaveText('-')
    await expect.poll(() => titoli(app)).toEqual(expect.arrayContaining([
      'anno_esempio — Regiklass (principale)',
      'Lezione · anno_esempio — Regiklass [2]',
    ]))
    // Le etichette: la principale si nomina solo ora che c'è una figlia; la
    // figlia è snella, senza barra di stato, con il ritorno alla principale.
    await expect(principale.locator('.barra-titolo__finestra')).toHaveText('Principale · 2')
    await expect(figlia.locator('.barra-titolo__finestra')).toHaveText('Finestra 2 · Lezione')
    await expect(figlia.getByRole('button', { name: '↖ Principale' })).toBeVisible()
    await expect(figlia.locator('.barra-stato')).toHaveCount(0)
    await expect(principale.locator('.barra-stato')).toHaveCount(1)
    // Il menu delle finestre della principale, e l'elenco nel menu nativo.
    await principale.locator('.barra-titolo__finestra').click()
    await expect(principale.getByRole('menuitem', { name: 'Porta davanti' })).toHaveCount(1)
    await principale.keyboard.press('Escape')
    await expect.poll(() => app.evaluate(({ Menu }) => {
      const cerca = (voci: Electron.MenuItem[]): string[] | null => {
        for (const voce of voci) {
          if (voce.label === 'Finestre del registro') return voce.submenu?.items.map((v) => v.label) ?? []
          const dentro = voce.submenu ? cerca(voce.submenu.items) : null
          if (dentro) return dentro
        }
        return null
      }
      return cerca(Menu.getApplicationMenu()?.items ?? [])
    })).toEqual(['Principale · Lezione', 'Finestra 2 · Lezione'])

    // Segnata nella figlia, la presenza arriva alla principale.
    await casella(figlia, 'Bianchi Luca').click()
    await expect(casella(figlia, 'Bianchi Luca')).not.toHaveText('-')
    const segnata = await casella(figlia, 'Bianchi Luca').textContent()
    await expect(casella(principale, 'Bianchi Luca')).toHaveText(segnata ?? '')

    // Ctrl+Z dalla principale la toglie, anche nella figlia: la storia è una.
    // Dopo il salvataggio: l'eco della scrittura sul disco non deve svuotare la storia.
    const annulla = principale.locator('.barra-titolo__storia').first()
    await expect(annulla).toBeEnabled()
    await principale.waitForTimeout(2000)
    await expect(annulla).toBeEnabled()
    await principale.keyboard.press('Control+z')
    await expect(casella(principale, 'Bianchi Luca')).toHaveText('-')
    await expect(casella(figlia, 'Bianchi Luca')).toHaveText('-')

    // Un campo a metà nella figlia non lo copre la scrittura della principale:
    // il valore dello stato entra solo in un campo senza fuoco.
    for (const pagina of [principale, figlia]) await pagina.getByRole('radio', { name: 'Fine ora' }).click()
    const argomentiFiglia = figlia.locator('textarea[name="argomenti"]')
    await argomentiFiglia.fill('Scritto nella figlia')
    const argomentiPrincipale = principale.locator('textarea[name="argomenti"]')
    await argomentiPrincipale.fill('Dalla principale')
    await argomentiPrincipale.press('Tab')
    // La scrittura è arrivata: la principale la tiene, e il ↶ ha un passo.
    await expect(principale.locator('.barra-titolo__storia').first()).toBeEnabled()
    await figlia.waitForTimeout(500)
    await expect(argomentiFiglia).toBeFocused()
    await expect(argomentiFiglia).toHaveValue('Scritto nella figlia')
    // Lasciato il campo, vince l'ultima scrittura, e la principale la vede.
    await argomentiFiglia.press('Tab')
    await expect(argomentiPrincipale).toHaveValue('Scritto nella figlia')

    // Chiusa la principale, la figlia se ne va con lei.
    await chiudiDalTitolo(app, '(principale)')
    await expect.poll(async () => (await finestreDelRegistro(app).catch(() => new Map())).size, {
      timeout: 20_000,
    }).toBe(0)
    expect(errori).toEqual([])
  } finally {
    await spegni(app)
    smonta(banco)
  }
})

test('le figlie tornano col documento, sulla loro pagina; chiuse a mano no', async () => {
  expect(existsSync(PRINCIPALE), `manca ${PRINCIPALE}: costruisci con npm run build`).toBe(true)
  test.setTimeout(240_000)
  const banco = preparaBanco()
  let app = await accendi(banco)
  try {
    await finestra(app, 1)
    // Ctrl+Maiusc+N dal menu nativo, poi la figlia va sul calendario.
    await voceDelMenu(app, 'registroDocenti.nuovaFinestra')
    const figlia = await finestra(app, 2)
    await figlia.evaluate(() => {
      window.postMessage({ tipo: 'naviga', vista: 'calendario' }, '*')
    })
    await expect.poll(() => titoli(app)).toContain('Calendario · anno_esempio — Regiklass [2]')

    // Si esce col programma: la disposizione resta, e al riavvio la figlia torna.
    await spegni(app)
    app = await accendi(banco)
    await finestra(app, 1)
    const tornata = await finestra(app, 2)
    await expect(tornata.locator('.barra-titolo__finestra')).toHaveText('Finestra 2 · Calendario')
    await expect.poll(() => titoli(app)).toContain('Calendario · anno_esempio — Regiklass [2]')

    // Chiusa a mano esce dalla disposizione: al riavvio c'è solo la principale.
    await chiudiDalTitolo(app, '[2]')
    await expect.poll(async () => (await finestreDelRegistro(app)).size).toBe(1)
    await spegni(app)
    app = await accendi(banco)
    await finestra(app, 1)
    await app.evaluate(() => new Promise((risolvi) => setTimeout(risolvi, 1500)))
    expect([...(await finestreDelRegistro(app)).keys()]).toEqual([1])
  } finally {
    await spegni(app)
    smonta(banco)
  }
})

/** Manda un'azione all'host dalla pagina, come fa `invia`, con un numero che la pagina non usa. */
async function azione (pagina: Page, id: number, azioneDaFare: Record<string, unknown>): Promise<void> {
  await pagina.evaluate(({ id, azioneDaFare }) => {
    const api = (window as unknown as { acquireVsCodeApi: () => { postMessage: (m: unknown) => void } })
      .acquireVsCodeApi()
    api.postMessage({ id, azione: azioneDaFare })
  }, { id, azioneDaFare })
}

/** La tendina della barra dei comandi con quel nome (`corso`, `classe`, `periodo`). */
function tendina (pagina: Page, nome: string) {
  return pagina.locator(`[data-fuoco="barra-comandi-${nome}"]`)
}

/** Sceglie una voce da una tendina della barra dei comandi. */
async function scegli (pagina: Page, nome: string, voce: string): Promise<void> {
  await tendina(pagina, nome).click()
  await pagina.getByRole('menuitem', { name: voce, exact: true }).click()
}

test('corso, classe del docente di classe e periodo sono gli stessi in tutte le finestre', async () => {
  expect(existsSync(PRINCIPALE), `manca ${PRINCIPALE}: costruisci con npm run build`).toBe(true)
  test.setTimeout(240_000)
  const banco = preparaBanco()
  const app = await accendi(banco)
  const errori: string[] = []
  try {
    const principale = await finestra(app, 1)
    principale.on('pageerror', (e) => errori.push(String(e)))
    // Il campione ha una classe e un corso: la classe diventa del docente di
    // classe, e la sua copia porta un secondo corso e una seconda classe.
    await azione(principale, 900_001, { tipo: 'classe.modifica', classeId: 'cls-mus50qhg-ex6637jz', docenteDiClasse: true })
    await azione(principale, 900_002, {
      tipo: 'classe.duplica', classeId: 'cls-mus50qhg-ex6637jz', annoId: 'ann-mus50qgt-a091dxvf', nome: 'I MEC B',
    })
    await principale.evaluate((ora) => {
      window.postMessage({ tipo: 'naviga', vista: 'lezione', elementoId: ora }, '*')
    }, ORA)
    await expect(casella(principale, 'Bianchi Luca')).toHaveText('-')

    await principale.getByRole('button', { name: 'Nuova finestra' }).click()
    const figlia = await finestra(app, 2)
    figlia.on('pageerror', (e) => errori.push(String(e)))
    await expect(casella(figlia, 'Bianchi Luca')).toHaveText('-')
    const corsoDiPrima = await tendina(principale, 'corso').getAttribute('data-valore')
    await expect(tendina(figlia, 'corso')).toHaveAttribute('data-valore', corsoDiPrima ?? '')

    // Il corso cambiato nella principale: la figlia, che guardava un'ora del
    // corso di prima, passa al corso nuovo come dalla sua tendina (il corso
    // copiato non ha ore, quindi i suoi piani).
    await scegli(principale, 'corso', 'I MEC B')
    await expect(tendina(principale, 'corso')).not.toHaveAttribute('data-valore', corsoDiPrima ?? '')
    const corsoNuovo = await tendina(principale, 'corso').getAttribute('data-valore')
    await expect(tendina(figlia, 'corso')).toHaveAttribute('data-valore', corsoNuovo ?? '')
    await expect(casella(figlia, 'Bianchi Luca')).toHaveCount(0)

    // Il periodo, dalla figlia alla principale: anche l'anno intero è una scelta.
    const periodoDiPrima = await tendina(figlia, 'periodo').getAttribute('data-valore')
    expect(periodoDiPrima).not.toBe('')
    await scegli(figlia, 'periodo', 'Anno intero')
    await expect(tendina(figlia, 'periodo')).toHaveAttribute('data-valore', '')
    await expect(tendina(principale, 'periodo')).toHaveAttribute('data-valore', '')

    // La classe del docente di classe, cambiata nella figlia: la principale si allinea.
    for (const pagina of [principale, figlia]) {
      await pagina.evaluate(() => { window.postMessage({ tipo: 'naviga', vista: 'docenteClasse' }, '*') })
      await expect(tendina(pagina, 'classe')).toHaveCount(1)
    }
    const classeDiPrima = await tendina(figlia, 'classe').getAttribute('data-valore')
    await expect(tendina(principale, 'classe')).toHaveAttribute('data-valore', classeDiPrima ?? '')
    await scegli(figlia, 'classe', classeDiPrima === 'cls-mus50qhg-ex6637jz' ? 'I MEC B' : 'I MEC A')
    await expect(tendina(figlia, 'classe')).not.toHaveAttribute('data-valore', classeDiPrima ?? '')
    const classeNuova = await tendina(figlia, 'classe').getAttribute('data-valore')
    await expect(tendina(principale, 'classe')).toHaveAttribute('data-valore', classeNuova ?? '')

    // Niente rimbalzi: dopo un attimo le due sono ancora lì.
    await principale.waitForTimeout(1000)
    await expect(tendina(figlia, 'classe')).toHaveAttribute('data-valore', classeNuova ?? '')
    await expect(tendina(principale, 'classe')).toHaveAttribute('data-valore', classeNuova ?? '')
    expect(errori).toEqual([])
  } finally {
    await spegni(app)
    smonta(banco)
  }
})
