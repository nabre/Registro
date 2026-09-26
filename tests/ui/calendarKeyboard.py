"""Calendario mensile: giorni raggiungibili e azionabili da tastiera.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `node esbuild.mjs --ui` e poi
`python tests/ui/calendarKeyboard.py`.
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


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    page.evaluate("prova.aggiorna({modoCalendario:'mese', data:'2026-09-16'})")
    page.evaluate(FRAME)

    # Nome completo, ruolo compatibile coi pulsanti delle lezioni annidati e scorciatoie esposte.
    giorno = page.get_by_role('group', name=re.compile(r'lunedì 14 settembre 2026', re.I))
    expect(giorno).to_have_count(1)
    expect(giorno).to_have_attribute('tabindex', '0')
    expect(giorno).to_have_attribute('aria-keyshortcuts', 'Enter Space F2')

    # Tab dalla settimana entra nel primo giorno, senza ricorrere al puntatore.
    settimana = page.locator('.mese__settimana').filter(has=giorno).locator('.mese__settimana-numero')
    settimana.focus()
    page.keyboard.press('Tab')
    primo = page.locator('.mese__settimana').filter(has=giorno).locator('.mese__cella').first
    expect(primo).to_be_focused()

    # Invio e Spazio eseguono l'azione primaria: scelgono il giorno.
    primo.press('Enter')
    page.evaluate(FRAME)
    assert page.evaluate('prova.stato.data') == '2026-09-14'

    giorno = page.get_by_role('group', name=re.compile(r'martedì 15 settembre 2026', re.I))
    giorno.press('Space')
    page.evaluate(FRAME)
    assert page.evaluate('prova.stato.data') == '2026-09-15'

    # F2 sostituisce il doppio clic in modifica e apre il modulo sul giorno scelto.
    page.evaluate("prova.aggiorna({editorCalendario:true, filtroCorsoAgendaId:null})")
    page.evaluate(FRAME)
    giorno = page.get_by_role('group', name=re.compile(r'lunedì 14 settembre 2026', re.I))
    giorno.press('F2')
    expect(page.locator('.modale')).to_be_visible()
    expect(page.locator('.modale input[type="hidden"][name="data"]')).to_have_value('2026-09-14')

    assert not errori, errori
    browser.close()

print('calendarKeyboard: ok')
