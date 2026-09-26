"""Il suggerimento dietro la «i», provato su Chromium.

Le cose che `node --test` non vede, perché vivono nel puntatore e nei tasti:

- la spiegazione non si vede finché non la si chiede, ma il lettore di schermo
  la trova lo stesso (`aria-describedby` su un testo nascosto);
- il puntatore fermo sopra la «i» la apre dopo un attimo, e andandosene la
  chiude; il clic la ferma aperta, un clic altrove la chiude;
- dentro una finestra modale Esc chiude la spiegazione e **non** la finestra
  (era il rischio: un solo Esc si portava via quel che c'era scritto);
- il campo con l'aiuto porta la descrizione anche lui, e il suo nome resta la
  sua etichetta — senza il nome del segno che ci sta dentro;
- un ridisegno che toglie la «i» dalla pagina chiude il fumetto invece di
  lasciarlo appeso all'aria.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/hint.py`
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]

# Il check del primo corso, con una colonna: serve per la finestra «Scegli la
# data…», che ha un campo con la sua «i».
PREPARA = '''() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const check = { id: 'chk-prova', corsoId: corso.id,
    colonne: [{ id: 'c1', titolo: 'Regolamento' }], spunte: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-10T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, check: [check] }, vista: 'check', corsoId: corso.id })
}'''

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

    # La pagina delle classi: la testata porta la sua «i».
    page.evaluate("() => prova.aggiorna({ vista: 'classi' })")
    page.evaluate('()=>new Promise(requestAnimationFrame)')

    fumetto = page.locator('.suggerimento__fumetto')
    titolo = page.locator('.vista--classi .testata__titolo')
    segno = titolo.locator('.suggerimento__segno')
    expect(segno).to_have_count(1)

    # Chiusa: il testo c'è, per chi ascolta, ma non si vede.
    testo = titolo.locator('.suggerimento__testo')
    expect(testo).to_be_hidden()
    expect(testo).to_contain_text('recapiti')
    assert segno.get_attribute('aria-describedby') == testo.get_attribute('id')
    assert segno.get_attribute('aria-expanded') == 'false'
    assert segno.get_attribute('title') is None, 'un title farebbe comparire la frase due volte'
    expect(fumetto).to_have_count(0)

    # Il puntatore fermo la apre, andandosene la chiude.
    segno.hover()
    expect(fumetto).to_have_count(1)
    expect(fumetto).to_contain_text('recapiti')
    assert segno.get_attribute('aria-expanded') == 'true'
    page.mouse.move(5, 995)
    expect(fumetto).to_have_count(0)

    # Il clic la ferma: il puntatore che se ne va non la chiude più.
    segno.click()
    expect(fumetto).to_have_count(1)
    page.mouse.move(5, 995)
    page.wait_for_timeout(400)
    expect(fumetto).to_have_count(1)
    # Sta nella finestra, sotto o sopra il segno.
    riquadro = fumetto.bounding_box()
    assert riquadro and riquadro['x'] >= 0 and riquadro['x'] + riquadro['width'] <= 1440, riquadro
    # Un clic altrove la chiude.
    page.mouse.click(700, 990)
    expect(fumetto).to_have_count(0)

    # Un ridisegno toglie la «i» di sotto: il fumetto non resta orfano.
    segno.click()
    expect(fumetto).to_have_count(1)
    page.evaluate("() => prova.aggiorna({ vista: 'calendario' })")
    expect(fumetto).to_have_count(0)
    page.evaluate(PREPARA)
    page.evaluate('()=>new Promise(requestAnimationFrame)')

    # Dentro una modale: «Scegli la data…» ha il campo con la sua «i».
    allievo = page.evaluate('prova.stato.registro.classi[0].allievi[0].id')
    page.locator(f'[data-fuoco="check-{allievo}-c1"]').click(button='right')
    page.locator('.menu').get_by_role('menuitem', name='Scegli la data…').click()
    finestra = page.locator('form.modale')
    expect(finestra).to_have_count(1)
    segno_campo = finestra.locator('.campo .suggerimento__segno')
    expect(segno_campo).to_have_count(1)
    expect(finestra.locator('small.campo__aiuto')).to_have_count(0)
    # Il campo porta la stessa descrizione del segno.
    descritto = finestra.locator('input.campo__controllo--data')
    assert descritto.get_attribute('aria-describedby') == segno_campo.get_attribute('aria-describedby')
    # Il segno sta nella sua `<label>` ma non entra nel nome del campo: «Fatto
    # il», non «Fatto il Spiegazione: Fatto il».
    nome = page.evaluate('''() => {
      const c = document.querySelector('form.modale input.campo__controllo--data')
      return c.getAttribute('aria-label')
    }''')
    etichetta = finestra.locator('label.campo__etichetta').first.evaluate('l => l.firstChild.textContent')
    assert nome == etichetta, (nome, etichetta)

    # Col tabulatore si apre da sé; Esc chiude lei e non la finestra.
    segno_campo.focus()
    page.keyboard.press('Shift+Tab')
    page.keyboard.press('Tab')
    expect(fumetto).to_have_count(1)
    page.keyboard.press('Escape')
    expect(fumetto).to_have_count(0)
    expect(finestra).to_have_count(1)
    # A fumetto chiuso Esc è di nuovo della finestra.
    page.keyboard.press('Escape')
    expect(finestra).to_have_count(0)

    assert not errors, errors
    browser.close()

print('suggerimento: ok')
