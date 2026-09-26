"""La giornata di scuola: Impostazioni › Anno e orario › Calendario.

Quattro schede in fila, numerate nell'ordine in cui le misure si concatenano:
l'unità didattica, le pause, l'inizio e la fine, i giorni. Qui si prova che:

- le schede sono quattro, in quell'ordine, e il numero lo mette il foglio di
  stile contandole;
- l'etichetta della distanza fra le pause dice la durata dell'UD del
  documento, non i quarantacinque minuti di fabbrica;
- sotto la terza scheda la giornata è disegnata: le UD numerate, le pause, e
  i minuti che non fanno un'UD segnati come avanzo;
- «Porta alle …» manda l'orario sulla griglia con `impostazioni.salva`;
- cambiare l'UD con ore sul calendario chiede conferma, e annullando il
  campo torna com'era senza mandare niente;
- con un'ora che ha l'appello il campo dell'UD è spento, e si dice perché.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/giornata.py`
Le fotografie vanno in `dist-tests/`, o nella cartella di `SCATTI`.
"""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
scatti = Path(os.environ.get('SCATTI', root / 'dist-tests'))
scatti.mkdir(parents=True, exist_ok=True)

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

# Ricreazione alle 9:30, poi due UD e dieci minuti; la giornata dalle 7:30, che
# non sta sulla griglia: dieci minuti prima della ricreazione avanzano.
GIORNATA = '''()=>{
  const i = prova.stato.registro.impostazioni
  i.pause = { prima: { inizio: '09:30', durataMin: 15 }, seguenti: [{ dopoUd: 2, durataMin: 10 }] }
  i.oraInizioGiornata = '07:30'
  i.oraFineGiornata = '13:00'
  prova.aggiorna({ vista: 'impostazioni', ambitoImpostazioni: 'documento', schedaDocumento: 'calendario' })
}'''


def salvate(page):
    return page.evaluate(
        "()=>richieste.filter(m=>m.azione?.tipo==='impostazioni.salva').map(m=>m.azione.impostazioni)")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for schema in ['light', 'dark']:
        page = browser.new_page(viewport={'width': 1280, 'height': 1400}, color_scheme=schema)
        errori = []
        page.on('pageerror', lambda e: errori.append(str(e)))
        page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
        page.add_script_tag(content=PONTE)
        page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
        page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
        page.wait_for_load_state('networkidle')
        page.evaluate(GIORNATA)
        page.evaluate(FRAME)
        page.screenshot(path=str(scatti / f'giornata-{schema}.png'), full_page=True)

        # Quattro passi, in quest'ordine, numerati dal contatore.
        passi = page.locator('.giornata-passi > .scheda .scheda__titolo')
        expect(passi).to_have_count(4)
        titoli = [t.strip() for t in passi.all_inner_texts()]
        assert titoli == [
            'Unità didattica', 'Pause della giornata', 'Inizio e fine della giornata', 'Giorni mostrati',
        ], titoli
        numero = page.evaluate(
            "()=>getComputedStyle(document.querySelectorAll('.giornata-passi > .scheda .scheda__titolo')[2],"
            "'::before').content")
        # Il numero lo scrive il contatore: il calcolato ne dice la formula.
        assert numero == 'counter(passo-giornata)', numero

        # La distanza fra le pause si legge nelle UD del documento.
        expect(page.get_by_label('Dopo (UD da 45 min)')).to_have_count(1)

        # La giornata disegnata: sei UD intere, due pause, due avanzi.
        linea = page.locator('.giornata-linea__tratto')
        expect(page.locator('.giornata-linea__tratto--ud')).to_have_count(6)
        expect(page.locator('.giornata-linea__tratto--pausa')).to_have_count(2)
        expect(page.locator('.giornata-linea__tratto--avanzo')).to_have_count(2)
        assert linea.count() == 10, linea.count()
        expect(page.locator('.giornata-linea__nota')).to_contain_text('2 avanzi')

        if schema == 'dark':
            assert not errori, errori
            page.close()
            continue

        # «Porta alle …»: l'inizio sulle partenze, la fine dove un'UD finisce.
        page.locator('button', has_text='Porta alle 07:15').click()
        page.evaluate(FRAME)
        assert any(i['oraInizioGiornata'] == '07:15' for i in salvate(page)), salvate(page)
        page.locator('button', has_text='Porta alle 12:55').click()
        page.evaluate(FRAME)
        assert any(i['oraFineGiornata'] == '12:55' for i in salvate(page)), salvate(page)

        # Con le ore sul calendario il cambio dell'UD chiede conferma; annullando
        # non parte niente e il campo torna com'era.
        prima = len(salvate(page))
        campo = page.locator('input[name="minutiUd"]')
        campo.fill('50')
        campo.press('Tab')
        modale = page.locator('.modale')
        expect(modale).to_contain_text('Unità didattica da 50 minuti?')
        expect(modale).to_contain_text('tengono le loro UD')
        modale.get_by_role('button', name='Annulla').click()
        page.evaluate(FRAME)
        assert len(salvate(page)) == prima, salvate(page)
        expect(campo).to_have_value('45')

        # Confermando, parte il salvataggio con la durata nuova.
        campo.fill('50')
        campo.press('Tab')
        page.locator('.modale').get_by_role('button', name='Cambia').click()
        page.evaluate(FRAME)
        assert any(i['minutiUd'] == 50 for i in salvate(page)), salvate(page)

        # Un'ora con l'appello fissa l'UD: il campo si spegne, e lo si dice.
        page.evaluate('''()=>{
          prova.stato.registro.lezioni[0].presenze = [{ allievoId: 'x', stati: ['presente'] }]
          prova.aggiorna({})
        }''')
        page.evaluate(FRAME)
        expect(page.locator('input[name="minutiUd"]')).to_be_disabled()
        expect(page.locator('.giornata-passi')).to_contain_text('Fissata: 1 ora ha già l’appello')

        assert not errori, errori
        page.close()
    browser.close()

print('giornata: ok')
