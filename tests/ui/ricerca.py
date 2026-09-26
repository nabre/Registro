"""La ricerca sempre visibile e il percorso accorciato.

- La pastiglia «Cerca…» nella barra del titolo apre la stessa palette di
  Ctrl+K, si toglie dall'area di trascinamento, e alla chiusura ridà il fuoco
  a sé stessa.
- La palette trova anche le persone in formazione, i corsi e le classi, sotto
  i loro titoletti e nell'ordine fisso pagine → comandi → persone → corsi →
  classi; senza accenti trova chi li ha; Invio porta dove si aspetta.
- Il percorso in cima non ripete l'area della barra laterale né la linguetta
  accesa, ma a voce li dice ancora.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/ricerca.py`
"""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

PONTE = '''
window.richieste = []
window.acquireVsCodeApi = () => ({
  getState: () => null, setState: () => {},
  postMessage: (m) => {
    richieste.push(m)
    if (m.id) setTimeout(() => window.dispatchEvent(new MessageEvent('message',
      { data: { tipo: 'risposta', id: m.id, ok: true } })), 0)
  },
})
'''

FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'


def pagina(browser, larga=1440):
    page = browser.new_page(viewport={'width': larga, 'height': 900})
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    return page, errori


def titoletti(page):
    return page.locator('.palette__gruppo-titolo > span:first-child').all_text_contents()


def pastiglia_apre_la_palette(browser):
    """Clic sulla pastiglia: la palette, il fuoco nel campo, e di nuovo sulla pastiglia dopo Esc."""
    page, errori = pagina(browser)
    cerca = page.locator('.barra-titolo .barra-titolo__cerca')
    expect(cerca).to_have_count(1)
    expect(cerca).to_have_attribute('aria-keyshortcuts', 'Control+K')
    expect(cerca).to_contain_text('Cerca')
    # La barra si trascina, la pastiglia no, o premerla sposterebbe la finestra.
    # Chromium legge la proprietà anche fuori da Electron.
    regione = "el => getComputedStyle(el).getPropertyValue('-webkit-app-region')"
    assert page.locator('.barra-titolo').evaluate(regione) == 'drag'
    assert cerca.evaluate(regione) == 'no-drag', cerca.evaluate(regione)
    cerca.click()
    campo = page.locator('.palette__campo')
    expect(campo).to_be_focused()
    # A campo vuoto: pagine e comandi, e la scelta su una riga che funziona.
    assert titoletti(page) == ['Pagine', 'Comandi'], titoletti(page)
    scelta = page.locator('.palette__voce--scelta')
    expect(scelta).not_to_have_class(re.compile(r'palette__voce--impedita'))
    expect(page.locator('.palette__piede kbd')).to_have_count(4)
    campo.press('Escape')
    expect(page.locator('.palette')).to_have_count(0)
    expect(page.locator('.barra-titolo__cerca')).to_be_focused()
    assert errori == [], errori
    page.close()


def persone_corsi_classi(browser):
    """«esémpio» trova le due Anna, ognuna con la sua classe; Invio apre la scheda."""
    page, errori = pagina(browser)
    page.locator('body').press('Control+k')
    campo = page.locator('.palette__campo')
    # L'accento in più non conta, e le maiuscole nemmeno.
    campo.fill('esémpio')
    persone = (page.locator('.palette__gruppo')
               .filter(has_text='Persone in formazione').locator('.palette__voce'))
    expect(persone).to_have_count(2)
    assert persone.locator('.palette__aiuto').all_inner_texts() == ['DIC4a', 'DIC4b']
    campo.press('ArrowDown')
    campo.press('Enter')
    page.evaluate(FRAME)
    seconda = page.evaluate("prova.stato.registro.classi[1]")
    assert page.evaluate('prova.stato.vista') == 'allievo'
    assert page.evaluate('prova.stato.allievoId') == seconda['allievi'][0]['id']
    assert page.evaluate('prova.stato.classeId') == seconda['id']

    # «dic4b»: la persona, il corso e la classe, in quest'ordine.
    page.locator('body').press('Control+k')
    page.locator('.palette__campo').fill('dic4b')
    assert titoletti(page) == ['Persone in formazione', 'Corsi', 'Classi'], titoletti(page)
    page.locator('.palette__gruppo').filter(has_text='Corsi').locator('.palette__voce').click()
    page.evaluate(FRAME)
    corso = page.evaluate('prova.stato.registro.corsi[1]')
    assert page.evaluate('prova.stato.vista') == 'corsi'
    assert page.evaluate('prova.stato.corsoId') == corso['id']
    assert page.evaluate('prova.stato.filtroClasseId') == corso['classeId']

    page.locator('body').press('Control+k')
    page.locator('.palette__campo').fill('dic4b')
    page.locator('.palette__gruppo').filter(has_text='Classi').locator('.palette__voce').click()
    page.evaluate(FRAME)
    assert page.evaluate('prova.stato.vista') == 'classi'
    assert page.evaluate('prova.stato.classeId') == seconda['id']
    assert errori == [], errori
    page.close()


def percorso_corto_ma_intero_a_voce(browser):
    """In cima non c'è «Registro» né la linguetta; nell'etichetta sì."""
    page, errori = pagina(browser)
    lezione = page.evaluate('prova.stato.registro.lezioni[0].id')
    page.evaluate(f"prova.aggiorna({{ vista: 'lezione', lezioneId: '{lezione}' }})")
    page.evaluate(FRAME)
    percorso = page.locator('.barra-titolo .percorso')
    expect(percorso.locator('.percorso__passo--mestiere')).to_have_count(0)
    expect(percorso.locator('.percorso__passo--porzione')).to_have_count(0)
    expect(percorso.locator('.percorso__passo--qui')).to_have_count(1)
    etichetta = percorso.get_attribute('aria-label') or ''
    assert 'Area Registro' in etichetta, etichetta
    assert 'Scheda ' in etichetta, etichetta
    assert errori == [], errori
    page.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    fallite = []
    for prova in (pastiglia_apre_la_palette, persone_corsi_classi, percorso_corto_ma_intero_a_voce):
        try:
            prova(browser)
            print(f'ok   {prova.__name__}')
        except Exception as errore:  # noqa: BLE001 — si raccolgono tutte, poi si esce
            fallite.append(prova.__name__)
            print(f'NO   {prova.__name__}: {errore}')
    browser.close()
    if fallite:
        raise SystemExit(f'fallite: {", ".join(fallite)}')
    print('ricerca: tutto verde')
