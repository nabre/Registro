"""Il calendario scolastico ufficiale nel modulo di un anno nuovo, su Chromium.

- in cima la tendina «Anno scolastico», con gli anni del calendario: il primo
  è già scelto all'apertura, e con lui date e chiusure sono già nell'editor;
- sceglierne un altro scrive inizio, fine, etichetta e confine del primo
  semestre, e porta **tutte** le chiusure di quell'anno, collegate
  (`sos-ti-…`), al posto di quelle dell'anno di prima: la sezione del
  calendario dice «allineato»;
- una chiusura tolta dall'editor torna fra le voci da importare (e una di un
  giorno dice anche il mese), e `anno.crea` parte senza di lei;
- in fondo, ben visibile, «Importa da un altro registro».

Esecuzione: `npm run ui-tests`, oppure `node esbuild.mjs --ui` e poi
`python tests/ui/schoolCalendar.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')

    page.locator('.barra-comandi__programma').click()
    page.get_by_text('Nuovo anno scolastico').first.click()
    modale = page.locator('form.modale')
    expect(modale).to_have_count(1)

    scelta = modale.locator('.calendario-ufficiale__anno select')
    expect(scelta).to_have_count(1)
    # Il primo anno proposto è già scelto, con le sue chiusure nell'editor.
    primo = scelta.locator('option').first.get_attribute('value')
    assert scelta.input_value() == primo, (scelta.input_value(), primo)
    righe = modale.locator('.pausa-riga')
    assert righe.count() > 3, righe.count()
    expect(modale.locator('.calendario-ufficiale')).to_contain_text('allineato')

    expect(scelta.locator('option', has_text='2027/2028')).to_have_count(1)
    scelta.select_option('2027/2028')

    valore = lambda nome: modale.locator(f'input[name="{nome}"]').first.input_value()
    assert valore('inizio') == '2027-08-30', valore('inizio')
    assert valore('fine') == '2028-06-14', valore('fine')
    assert valore('etichetta') == '2027/2028', valore('etichetta')
    assert valore('confine') == '2028-01-31', valore('confine')
    expect(modale.locator('.calendario-ufficiale')).to_contain_text('allineato')
    nomi = [righe.nth(i).locator('.pausa-riga__nome').input_value() for i in range(righe.count())]
    assert 'Vacanze di Natale' in nomi and 'Immacolata' in nomi, nomi

    # Tolta dall'editor, l'Immacolata torna fra le voci da importare.
    righe.nth(nomi.index('Immacolata')).locator('button').click()
    voci = modale.locator('.calendario-ufficiale__voce')
    expect(voci).to_have_count(1)
    expect(voci.filter(has_text='Immacolata')).to_contain_text('dicembre')

    expect(modale.get_by_text('Importa da un altro registro')).to_be_visible()

    modale.locator('button[type=submit]').first.click()
    page.wait_for_timeout(300)
    crea = [m['azione'] for m in page.evaluate('richieste')
            if m.get('azione', {}).get('tipo') == 'anno.crea']
    assert len(crea) == 1, crea
    assert crea[0]['inizio'] == '2027-08-30'
    ids = [s['id'] for s in crea[0]['sospensioni']]
    assert 'sos-ti-2027-2028-vacanze-di-natale' in ids, ids
    assert 'sos-ti-2027-2028-immacolata' not in ids, ids
    assert all(i.startswith('sos-ti-2027-2028-') for i in ids), ids
    assert len(ids) == len(nomi) - 1, (ids, nomi)

    assert not errors, errors
    browser.close()
    print('calendario ufficiale: ok')
