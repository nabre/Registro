"""La pagina «Oggi»: la giornata in una schermata, a tessere che portano altrove.

Qui si prova che:

- al primo avvio, senza uno stato ricordato, il registro si apre su «Oggi», e
  «Oggi» è la prima voce dell'agenda nella barra laterale;
- la pagina non ha comandi nella riga delle azioni (ADR-07: si guarda e si va);
- le quattro tessere dicono gli stessi numeri delle pagine a cui portano, e
  ognuna porta alla sua: ore → Calendario (su oggi), da compilare → l'ora che
  aspetta, pendenze → Pendenze, da smistare → Da smistare;
- le ore di oggi stanno in ordine, con la loro fase, e quella in corso è accesa;
  un clic apre l'ora;
- le prossime valutazioni partono da oggi e un clic apre la prova;
- i compleanni di oggi compaiono solo se ce n'è;
- la voce «Pendenze» della barra laterale porta il suo conto.

L'orologio della pagina è fermo su martedì 15 settembre 2026 alle 9:30
(`page.clock`): le fasi delle ore dipendono dall'ora, e una prova che passa al
mattino e cade la sera non prova niente.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `node esbuild.mjs --ui` e poi
`python tests/ui/oggi.py`. Le fotografie vanno in `dist-tests/`, o nella
cartella di `SCATTI`.
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

# Quattro ore martedì 15: alle 8:20 finita senza appello, alle 9:30 in corso,
# alle 10:15 da fare, e una annullata. Più due prove (oggi e giovedì) e un
# compleanno. Le ore copiano quella che il ponte di prova mette il 14, con
# tutti i campi.
GIORNATA = '''()=>{
  const r = structuredClone(prova.stato.registro)
  const [c0, c1] = r.corsi
  const modello = r.lezioni[0]
  const ora = (id, corsoId, inizio, fine, stato = 'pianificata') => ({
    ...structuredClone(modello), id, corsoId, data: '2026-09-15', stato,
    slot: [{ id: id + '-s', inizio, fine, tipo: 'lezione' }],
  })
  r.lezioni.push(
    ora('oggi-3', c0.id, '10:15', '11:00'),
    ora('oggi-1', c0.id, '08:20', '09:05'),
    ora('oggi-2', c1.id, '09:10', '09:55'),
    ora('oggi-4', c1.id, '13:30', '14:15', 'annullata'),
  )
  const prova_ = (id, titolo, data, corsoId) => ({
    id, corsoId, lezioneId: null, pianoId: null, titolo, tipo: 'scritto', data, peso: 1,
    scala: { min: 1, max: 6, sufficienza: 4, passo: 0.25 }, descrizione: '', voti: [], allegati: [],
  })
  r.valutazioni.push(
    prova_('v-passata', 'Prova vecchia', '2026-09-10', c0.id),
    prova_('v-giovedi', 'Frazioni', '2026-09-17', c1.id),
    prova_('v-oggi', 'Equazioni', '2026-09-15', c0.id),
  )
  r.classi[0].allievi[0].dataNascita = '2010-09-15'
  prova.aggiorna({ registro: r })
}'''


def apri_oggi(page):
    page.evaluate("prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.oggi'))")
    page.evaluate(FRAME)
    expect(page.locator('.vista--oggi')).to_have_count(1)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for schema in ['light', 'dark']:
        page = browser.new_page(viewport={'width': 1400, 'height': 1000}, color_scheme=schema)
        errori = []
        page.on('pageerror', lambda e: errori.append(str(e)))
        page.clock.set_fixed_time('2026-09-15T09:30:00')
        page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
        page.add_script_tag(content=PONTE)
        page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
        page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
        page.wait_for_load_state('networkidle')

        # Senza uno stato ricordato si comincia da «Oggi», prima voce dell'agenda.
        assert page.evaluate('prova.stato.vista') == 'oggi'
        assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='agenda')[0].id") == 'pagina.oggi'
        laterale = page.locator('#navigazione-laterale')
        expect(laterale.get_by_role('button', name='Oggi', exact=True)).to_have_attribute('aria-current', 'page')

        page.evaluate(GIORNATA)
        page.evaluate(FRAME)
        vista = page.locator('.vista--oggi')
        expect(vista.locator('.testata__titolo')).to_have_text('Oggi')
        expect(vista.locator('.testata__sottotitolo')).to_contain_text('martedì 15 settembre 2026')
        # Niente riga delle azioni: la pagina porta altrove, non fa.
        expect(page.locator('#azioni-pagina')).to_have_count(0)
        page.screenshot(path=str(scatti / f'oggi-{schema}.png'), full_page=True)

        # Le tessere: quattro, ognuna con la sua destinazione.
        tessere = vista.locator('.oggi-tessera')
        expect(tessere).to_have_count(4)
        assert tessere.evaluate_all('ts => ts.map(t => t.dataset.pagina)') == [
            'pagina.calendario', 'pagina.corso.registro', 'pagina.pendenze', 'pagina.daSmistare',
        ]
        # Le ore vive sono tre: l'annullata si vede ma non si conta.
        expect(tessere.nth(0).locator('.oggi-tessera__valore')).to_have_text('3')
        expect(tessere.nth(0).locator('.oggi-tessera__nota')).to_have_text('In corso fino alle 09:55')
        # I numeri sono quelli delle pagine di destinazione: la tessera delle pendenze
        # e la pastiglia della barra laterale dicono lo stesso, non zero.
        pendenze = tessere.nth(2).locator('.oggi-tessera__valore').inner_text()
        assert int(pendenze) > 0
        voce_pendenze = laterale.get_by_role('button', name='Pendenze', exact=True)
        expect(voce_pendenze).to_contain_text(pendenze)

        # Le ore, in ordine, con la loro fase; quella in corso è accesa.
        ore = vista.locator('.oggi-ora')
        expect(ore).to_have_count(4)
        assert ore.evaluate_all('os => os.map(o => o.dataset.lezione)') == ['oggi-1', 'oggi-2', 'oggi-3', 'oggi-4']
        expect(ore.nth(0).locator('.pastiglia')).to_have_text('Da chiudere')
        expect(ore.nth(1).locator('.pastiglia')).to_have_text('In corso')
        expect(ore.nth(3).locator('.pastiglia')).to_have_text('Annullata')
        expect(vista.locator('.oggi-ora--evidenza')).to_have_count(1)
        assert vista.locator('.oggi-ora--evidenza').get_attribute('data-lezione') == 'oggi-2'

        # Le prove da oggi in poi, dalla più vicina; quella della settimana scorsa no.
        expect(vista.locator('.oggi-prova__titolo')).to_have_text(['Equazioni', 'Frazioni'])
        expect(vista.locator('.oggi-compleanno')).to_have_count(1)

        # Ogni tessera porta alla sua pagina.
        tessere.nth(2).click()
        assert page.evaluate('prova.stato.vista') == 'todo'
        expect(voce_pendenze).to_have_attribute('aria-current', 'page')
        apri_oggi(page)
        tessere.nth(3).click()
        assert page.evaluate('prova.stato.vista') == 'daSmistare'
        apri_oggi(page)
        page.evaluate("prova.aggiorna({ data: '2027-03-01' })")
        tessere.nth(0).click()
        assert page.evaluate('prova.stato.vista') == 'calendario'
        assert page.evaluate('prova.stato.data') == '2026-09-15', 'il calendario non si è portato su oggi'
        apri_oggi(page)
        # «Da compilare» apre l'ora che aspetta da più tempo (quella del 14), come il
        # comando «Ora da compilare».
        tessere.nth(1).press('Enter')
        assert page.evaluate('prova.stato.vista') == 'lezione'
        attesa = page.evaluate("prova.stato.registro.lezioni.filter(l=>l.data==='2026-09-14').map(l=>l.id)")
        assert page.evaluate('prova.stato.lezioneId') in attesa

        # Un'ora si apre con un clic, una prova anche.
        apri_oggi(page)
        ore.nth(2).click()
        assert page.evaluate('[prova.stato.vista, prova.stato.lezioneId]') == ['lezione', 'oggi-3']
        apri_oggi(page)
        vista.locator('.oggi-prova').nth(1).click()
        assert page.evaluate('[prova.stato.vista, prova.stato.valutazioneId]') == ['valutazioni', 'v-giovedi']

        # Senza compleanni la scheda non c'è; senza ore, il vuoto lo dice.
        page.evaluate('''()=>{
          const r = structuredClone(prova.stato.registro)
          r.classi[0].allievi[0].dataNascita = null
          r.lezioni = r.lezioni.filter(l => !l.id.startsWith('oggi-'))
          prova.aggiorna({ registro: r })
        }''')
        apri_oggi(page)
        expect(vista.locator('.oggi-compleanno')).to_have_count(0)
        expect(vista.locator('.oggi-scheda--ore .stato-vuoto')).to_be_visible()
        expect(tessere.nth(0).locator('.oggi-tessera__valore')).to_have_text('0')

        # Stretta: una colonna, e nessuno scorrimento di lato.
        page.set_viewport_size({'width': 700, 'height': 1000})
        page.evaluate(FRAME)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

        assert not errori, errori
        page.close()
    browser.close()

print('oggi: ok')
