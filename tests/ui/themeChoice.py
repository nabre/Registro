"""Il tema si sceglie guardandolo: tre schede con la miniatura del registro.

Impostazioni › Programma › Generale. Il tema era una tendina con tre frasi;
adesso sono tre schede, ognuna con il registro disegnato nel suo tema, e si
sceglie con un clic o con le frecce come un gruppo di pulsanti radio. Qui si
prova che:

- le schede sono tre, in un `radiogroup` che si chiama come l'impostazione, e
  una sola porta `aria-checked="true"`;
- il clic e le frecce mandano la stessa richiesta della tendina
  (`programma.salva` nel pannello, `scrivi` nella finestra nativa);
- la miniatura «chiaro» resta chiara quando l'applicazione è scura, e la
  «scuro» resta scura quando è chiara: la miniatura mostra il tema che
  sceglie, non quello che c'è;
- «Sistema» dice che cosa sta seguendo adesso, quando è la scelta attiva;
- la fascia delle sezioni sta a 16px dal contenuto, non a 28.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/themeChoice.py`
Le fotografie vanno in `dist-tests/`, o nella cartella di `SCATTI`.
"""
from pathlib import Path
import json
import os
import subprocess
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
scatti = Path(os.environ.get('SCATTI', root / 'dist-tests'))
scatti.mkdir(parents=True, exist_ok=True)
etichetta = os.environ.get('ETICHETTA', 'dopo')
# Solo le fotografie, senza asserzioni: per fermare il «prima» di un cambio.
solo_scatti = os.environ.get('SOLO_SCATTI') == '1'

CHIAVE = 'registroDocenti.aspetto.tema'

# La voce come la manda `vociImpostazioni()`: le scelte sono quelle del
# manifesto, lette dal bundle delle prove invece che ricopiate.
scelte = json.loads(subprocess.run(
    ['node', '--input-type=module', '-e',
     "const { IMPOSTAZIONI } = await import('./dist-tests/manifest.mjs');"
     f"process.stdout.write(JSON.stringify(IMPOSTAZIONI['{CHIAVE}'].scelte))"],
    cwd=root, check=True, capture_output=True, encoding='utf-8',
).stdout)


def voce(valore='sistema'):
    return {
        'chiave': CHIAVE, 'tipo': 'string', 'etichetta': 'Tema', 'descrizione': 'Chiaro o scuro.',
        'formato': None, 'scelte': scelte, 'minimo': None, 'massimo': None,
        'predefinito': 'sistema', 'valore': valore, 'scritta': valore != 'sistema',
        'bloccata': None, 'dipendeDa': None, 'sospesa': False, 'avanzata': False,
    }


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
FONDO = "(el)=>getComputedStyle(el.querySelector('.figura-tema')).backgroundColor"


def pannello(browser, schema):
    page = browser.new_page(viewport={'width': 1280, 'height': 900}, color_scheme=schema)
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    page.evaluate(
        "(v)=>prova.aggiorna({vista:'impostazioni',ambitoImpostazioni:'programma',"
        "schedaProgramma:'aspetto',programma:[v]})", voce())
    page.evaluate(FRAME)
    return page, errori


def prova_pannello(browser, schema):
    page, errori = pannello(browser, schema)
    page.locator('.voce-opzione').first.screenshot(path=str(scatti / f'pannello-{schema}-{etichetta}.png'))
    page.screenshot(path=str(scatti / f'pagina-{schema}-{etichetta}.png'))
    if solo_scatti:
        return

    # La fascia delle sezioni: il `gap` della vista e basta. Si confronta con quel
    # che la vista dichiara: si guarda che non si aggiunga niente sopra.
    distanza, passo = page.evaluate('''()=>{
      const f=document.querySelector('.impostazioni__fascia')
      return [f.nextElementSibling.getBoundingClientRect().top - f.getBoundingClientRect().bottom,
              parseFloat(getComputedStyle(f.parentElement).rowGap)]}''')
    assert abs(distanza - passo) < 0.5, f'fascia a {distanza}px dal contenuto, il passo è {passo}px'

    gruppo = page.get_by_role('radiogroup', name='Tema')
    expect(gruppo).to_have_count(1)
    schede = gruppo.get_by_role('radio')
    expect(schede).to_have_count(3)
    expect(gruppo.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
    expect(gruppo.get_by_role('radio', name='Sistema')).to_have_attribute('aria-checked', 'true')
    # Le altre scelte restano tendine: la voce senza figura non cambia.
    expect(page.locator('select[name="registroDocenti.aspetto.tema"]')).to_have_count(0)

    # Ogni miniatura nel suo tema, qualunque sia quello dell'applicazione.
    chiaro = gruppo.get_by_role('radio', name='Chiaro')
    scuro = gruppo.get_by_role('radio', name='Scuro')
    assert chiaro.evaluate(FONDO) == 'rgb(250, 250, 250)', chiaro.evaluate(FONDO)
    assert scuro.evaluate(FONDO) == 'rgb(20, 20, 22)', scuro.evaluate(FONDO)
    # L'aiuto del manifesto sta sotto la miniatura, senza il nome ripetuto.
    expect(chiaro).to_contain_text('È quello che si legge meglio proiettato.')
    # «Sistema», scelto, dice che cosa sta seguendo.
    atteso = 'adesso: scuro, come Windows' if schema == 'dark' else 'adesso: chiaro, come Windows'
    expect(gruppo.get_by_role('radio', name='Sistema')).to_contain_text(atteso)

    # Il clic chiede lo stesso salvataggio della tendina.
    scuro.click()
    page.evaluate(FRAME)
    assert page.evaluate(
        "richieste.some(m=>m.azione?.tipo==='programma.salva' && m.azione.chiave==='%s'"
        " && m.azione.valore==='scuro')" % CHIAVE)
    expect(scuro).to_have_attribute('aria-checked', 'true')
    expect(scuro).to_be_focused()

    # Il ridisegno che arriva con lo stato nuovo lascia il fuoco dov'era.
    page.evaluate("(v)=>prova.aggiorna({programma:[v]})", voce('scuro'))
    page.evaluate(FRAME)
    scuro = page.get_by_role('radiogroup', name='Tema').get_by_role('radio', name='Scuro')
    expect(scuro).to_be_focused()
    expect(scuro).to_have_attribute('tabindex', '0')

    # Le frecce: a sinistra torna a «Chiaro», e da «Sistema» si gira in fondo.
    page.keyboard.press('ArrowLeft')
    assert page.evaluate(
        "richieste.some(m=>m.azione?.tipo==='programma.salva' && m.azione.valore==='chiaro')")
    expect(page.get_by_role('radio', name='Chiaro')).to_be_focused()
    page.keyboard.press('Home')
    expect(page.get_by_role('radio', name='Sistema')).to_have_attribute('aria-checked', 'true')
    page.keyboard.press('ArrowLeft')
    expect(page.get_by_role('radio', name='Scuro')).to_have_attribute('aria-checked', 'true')
    assert not errori, errori


def prova_nativa(browser, schema):
    page = browser.new_page(viewport={'width': 760, 'height': 700}, color_scheme=schema)
    errori = []
    page.on('pageerror', lambda e: errori.append(str(e)))
    page.set_content(
        '<html lang="it"><body><header><h1 id="titolo">Impostazioni</h1>'
        '<input id="cerca" type="text"></header>'
        '<div id="rimando"><button id="apri-pannello" type="button">Apri</button></div>'
        '<main id="radice"></main></body></html>')
    page.add_script_tag(content=PONTE)
    page.add_style_tag(path=str(root / 'dist-tests/native-settings.css'))
    page.add_script_tag(path=str(root / 'dist-tests/native-settings.js'))
    page.evaluate(
        "(v)=>window.dispatchEvent(new MessageEvent('message',{data:{impostazioni:'schema',"
        "titolo:'Impostazioni',voci:[v]}}))", voce())
    page.evaluate(FRAME)
    page.locator('.voce').first.screenshot(path=str(scatti / f'nativa-{schema}-{etichetta}.png'))
    if solo_scatti:
        return

    gruppo = page.get_by_role('radiogroup', name='Tema')
    expect(gruppo.get_by_role('radio')).to_have_count(3)
    expect(gruppo.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
    chiaro = gruppo.get_by_role('radio', name='Chiaro')
    scuro = gruppo.get_by_role('radio', name='Scuro')
    assert chiaro.evaluate(FONDO) == 'rgb(250, 250, 250)', chiaro.evaluate(FONDO)
    assert scuro.evaluate(FONDO) == 'rgb(20, 20, 22)', scuro.evaluate(FONDO)
    scuro.click()
    assert page.evaluate(
        "richieste.some(m=>m.impostazioni==='scrivi' && m.chiave==='%s' && m.valore==='scuro')"
        % CHIAVE)
    expect(scuro).to_be_focused()
    page.keyboard.press('ArrowRight')
    assert page.evaluate("richieste.some(m=>m.impostazioni==='scrivi' && m.valore==='sistema')")
    # Il valore che torna dal main process rimette le schede d'accordo.
    page.evaluate(
        "(v)=>window.dispatchEvent(new MessageEvent('message',{data:{impostazioni:'valori',voci:[v]}}))",
        voce('chiaro'))
    expect(chiaro).to_have_attribute('aria-checked', 'true')
    expect(gruppo.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
    assert not errori, errori


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for schema in ('light', 'dark'):
        prova_pannello(browser, schema)
        prova_nativa(browser, schema)
    browser.close()
print('OK: tema a schede con miniature, nel pannello e nella finestra nativa, in tutti e due i temi')
