"""I comandi che partono da fuori dalla loro pagina.

Giro 13. Tre strade arrivano a un comando senza passare dalla barra, e tutte e
tre lo facevano partire in un posto dove la barra non l'avrebbe mai mostrato:

- la palette elencava tutti i comandi, anche quelli di un'altra pagina: aperta
  un'ora, tornati al calendario, Ctrl+K «svolta» Invio segnava svolta un'ora
  che non si vedeva più;
- Ctrl+Alt+N dal menu nativo apriva un modulo «Nuova lezione» senza il corso
  scelto e sul giorno di oggi invece che su quello guardato — non quello del
  pulsante «Nuova ora», che dice di essere la stessa cosa;
- Ctrl+Alt+T portava il calendario a oggi ma lasciava la striscia dei mesi
  dov'era stata scorsa, e oggi non si vedeva;
- un acceleratore del menu con una finestra aperta cambiava pagina sotto la
  finestra, o ne apriva una seconda sopra.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/giro13_comandi.py`
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

# Come fa l'host: un messaggio `naviga` che arriva dalla finestra.
NAVIGA = "(m) => window.dispatchEvent(new MessageEvent('message', { data: { tipo: 'naviga', ...m } }))"

OGGI = ("(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")

FRAME = '()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'


def pagina(browser):
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    return page, errori


def palette_fuori_posto(browser):
    """Ctrl+K «svolta» dal calendario non segna l'ora aperta prima."""
    page, errori = pagina(browser)
    lezione = page.evaluate('prova.stato.registro.lezioni[0].id')
    page.evaluate(f"prova.aggiorna({{ vista: 'lezione', lezioneId: '{lezione}' }})")
    page.evaluate(FRAME)
    page.evaluate("prova.aggiorna({ vista: 'calendario' })")
    page.evaluate(FRAME)
    # L'ora è ancora quella «del contesto», ma la pagina non la mostra più.
    assert page.evaluate('prova.stato.lezioneId') == lezione
    page.evaluate('richieste.length = 0')
    page.locator('body').press('Control+k')
    campo = page.locator('.palette__campo')
    expect(campo).to_be_focused()
    campo.fill('svolta')
    riga = page.locator('.palette__voce').filter(has_text='Svolta').first
    # La riga c'è ancora («dov'era quella cosa?»), ma spenta e con il perché.
    expect(riga).to_have_class(re.compile(r'palette__voce--impedita'))
    campo.press('Enter')
    page.evaluate(FRAME)
    partite = page.evaluate("richieste.filter(m => m.azione?.tipo === 'lezione.stato').length")
    assert partite == 0, 'Svolta partita da una pagina che non mostra l’ora'
    expect(page.locator('.notifica--avviso')).to_have_count(1)
    # Nella sua pagina invece risponde, come prima.
    page.evaluate("prova.aggiorna({ vista: 'lezione' })")
    page.evaluate(FRAME)
    page.locator('body').press('Control+k')
    page.locator('.palette__campo').fill('svolta')
    page.locator('.palette__campo').press('Enter')
    page.wait_for_function("richieste.some(m => m.azione?.tipo === 'lezione.stato')")
    assert errori == [], errori
    page.close()


def nuova_ora_dal_menu(browser):
    """Ctrl+Alt+N dal menu apre lo stesso modulo del pulsante «Nuova ora»."""
    page, errori = pagina(browser)
    corso = page.evaluate('prova.stato.registro.corsi[1].id')
    page.evaluate(f"prova.aggiorna({{ vista: 'calendario', corsoId: '{corso}', "
                  "filtroClasseId: null, data: '2026-09-16' })")
    page.evaluate(FRAME)
    # L'host manda sempre «oggi»: è il pannello che sa quale giorno si guarda.
    page.evaluate(NAVIGA, {'vista': 'calendario', 'data': '2026-10-20', 'nuovo': True})
    modale = page.locator('.modale')
    expect(modale).to_have_count(1)
    expect(modale.locator('select[name="corsoId"]')).to_have_value(corso)
    expect(modale.locator('input[name="data"]')).to_have_value('2026-09-16')
    assert errori == [], errori
    page.close()


def oggi_dal_menu(browser):
    """Ctrl+Alt+T riporta la striscia dei mesi su oggi, come il pulsante «Oggi»."""
    page, errori = pagina(browser)
    oggi = page.evaluate(OGGI)
    page.evaluate(f"prova.aggiorna({{ vista: 'calendario', modoCalendario: 'mese', data: '{oggi}' }})")
    page.evaluate(FRAME)
    striscia = page.locator('.mese__scorrevole')
    expect(striscia).to_have_count(1)
    centrata = striscia.evaluate('(el) => el.scrollTop')
    striscia.evaluate('(el) => { el.scrollTop = el.scrollTop + 900; el.dispatchEvent(new Event("scroll")) }')
    page.evaluate(FRAME)
    assert abs(striscia.evaluate('(el) => el.scrollTop') - centrata) > 100
    page.evaluate(NAVIGA, {'vista': 'calendario', 'data': oggi})
    page.evaluate(FRAME)
    page.evaluate(FRAME)
    assert abs(page.locator('.mese__scorrevole').evaluate('(el) => el.scrollTop') - centrata) < 50, \
        'La striscia è rimasta dove era stata scorsa'
    assert errori == [], errori
    page.close()


def menu_con_modale_aperta(browser):
    """Un acceleratore del menu non cambia pagina sotto una finestra aperta."""
    page, errori = pagina(browser)
    page.evaluate("prova.aggiorna({ vista: 'calendario' })")
    page.evaluate(FRAME)
    page.evaluate(NAVIGA, {'vista': 'calendario', 'nuovo': True})
    expect(page.locator('.modale')).to_have_count(1)
    page.evaluate(NAVIGA, {'vista': 'classi', 'nuovo': True})
    page.evaluate(FRAME)
    expect(page.locator('.modale')).to_have_count(1)
    assert page.evaluate('prova.stato.vista') == 'calendario'
    expect(page.locator('.notifica--avviso')).to_have_count(1)
    page.evaluate(NAVIGA, {'vista': 'impostazioni'})
    page.evaluate(FRAME)
    assert page.evaluate('prova.stato.vista') == 'calendario'
    assert errori == [], errori
    page.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    fallite = []
    for prova in (palette_fuori_posto, nuova_ora_dal_menu, oggi_dal_menu, menu_con_modale_aperta):
        try:
            prova(browser)
            print(f'ok   {prova.__name__}')
        except Exception as errore:  # noqa: BLE001 — si raccolgono tutte, poi si esce
            fallite.append(prova.__name__)
            print(f'NO   {prova.__name__}: {errore}')
    browser.close()
    if fallite:
        raise SystemExit(f'fallite: {", ".join(fallite)}')
    print('giro13_comandi: tutto verde')
