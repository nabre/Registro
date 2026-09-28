"""Lo sfoglio si aggiorna nel suo riquadro, provato su Chromium.

Con un PDF di venti pagine aperto nella cornice dell'archivio:

- scegliere una pagina rifà solo lo sfoglio (isola `sfoglio:<id>`): le
  fotografie sono gli stessi `<img>`, i riquadri gli stessi `<li>`, e fuori
  dall'isola (la matrice, la testata della cornice) non si tocca niente;
- una pagina letta dalla coda (messaggio `lavoro`) rifà l'isola
  `coda-lettura`: riquadri e fotografie restano gli stessi oggetti — un
  riquadro tolto dal documento annullerebbe il trascinamento in corso — e la
  matrice resta dov'è. Il primo messaggio, che porta il PDF nella lettura,
  ridisegna tutto (`main.ts`): anche lì fotografie e riquadri restano.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/sfoglioIsole.py`
"""
import json
import subprocess
from playwright.sync_api import expect

from banco import BUNDLE, FRAME, RADICE, chromium, pannello

PAGINE = 20

pdf = BUNDLE / 'sfoglio-isole.pdf'
subprocess.run(
    ['node', '-e', f"""
const {{ PDFDocument, StandardFonts }} = require('@cantoo/pdf-lib')
const fs = require('node:fs')
;(async () => {{
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (let n = 1; n <= {PAGINE}; n += 1) {{
    const pagina = documento.addPage([595, 842])
    pagina.drawText('Pagina ' + n, {{ x: 60, y: 780, size: 16, font }})
  }}
  fs.writeFileSync({json.dumps(str(pdf))}, await documento.save())
}})()
"""],
    cwd=RADICE, check=True,
)
byte = pdf.read_bytes()


def prepara(page):
    page.route('https://dati.prova/**', lambda rotta: rotta.fulfill(
        status=200, content_type='application/pdf', body=byte))


def lavoro(page, pagina, coda):
    """Un messaggio `lavoro` dell'host: la pagina in lettura e quelle in coda."""
    etichetta = lambda n: f'scansione.pdf · pagina {n}'  # noqa: E731
    page.evaluate('(m) => window.dispatchEvent(new MessageEvent("message", { data: m }))', {
        'tipo': 'lavoro',
        'corrente': {'smistamentoId': 'sm-isole', 'pagina': pagina, 'etichetta': etichetta(pagina)},
        'fatte': pagina - 1,
        'totale': PAGINE,
        'coda': [{'smistamentoId': 'sm-isole', 'pagina': n, 'etichetta': etichetta(n)} for n in coda],
    })
    page.evaluate(FRAME)


# Quel che si segna prima del gesto: le fotografie e i riquadri, e due nodi
# fuori dallo sfoglio. Dopo il gesto devono essere ancora gli stessi oggetti.
SEGNA = '''() => {
  const riquadri = [...document.querySelectorAll('.pagina-sfoglio')]
  window.segnati = {
    riquadri,
    foto: riquadri.map((r) => r.querySelector('img')).filter(Boolean),
    matrice: document.querySelector('.tabella--documenti'),
    testa: document.querySelector('.archivio__testa'),
  }
  return window.segnati.foto.length
}'''

CONFRONTA = '''() => {
  const s = window.segnati
  const riquadri = [...document.querySelectorAll('.pagina-sfoglio')]
  return {
    riquadri: riquadri.length === s.riquadri.length && riquadri.every((r, i) => r === s.riquadri[i]),
    foto: s.foto.every((img) => img.isConnected &&
      riquadri.some((r) => r.querySelector('img') === img)),
    matrice: s.matrice.isConnected,
    testa: s.testa.isConnected,
  }
}'''

with chromium() as browser:
    page, errors = pannello(browser, 1600, prima=prepara)

    page.evaluate(f'''() => {{
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      const consegna = s.registro.consegne.find((c) => c.corsoId === s.registro.corsi.find((x) => x.classeId === classe.id).id)
      consegna.documento = 'pagella'
      consegna.a = 'classe'
      const pagine = Array.from({{ length: {PAGINE} }}, (_, i) => i + 1)
      s.registro.smistamenti.push({{
        id: 'sm-isole',
        consegnaId: consegna.id,
        classeId: classe.id,
        file: 'quarantena/isole.pdf',
        nome: 'isole.pdf',
        pagine: {PAGINE},
        letture: pagine.map((numero) => ({{ numero, testo: '', lettura: 'niente' }})),
        assegnate: [],
        blocchi: [{{ id: 'b1', da: 1, a: {PAGINE}, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' }}],
        divisione: {{ modo: 'mano' }},
        arrivatoIl: '2026-09-14T08:00:00.000Z',
      }})
      prova.aggiorna({{
        registro: s.registro,
        radiceDati: 'https://dati.prova',
        archiviati: [{{ percorso: 'quarantena/isole.pdf', misura: 54321, revisione: 0 }}],
        ocrAttivo: true,
      }})
      prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.classe.documenti'))
    }}''')

    page.locator('.da-dividere__pdf').first.click()
    riquadri = page.locator('.pagina-sfoglio')
    expect(riquadri).to_have_count(PAGINE)
    # Le fotografie delle pagine in vista (e dell'anticipo): pdfjs le disegna una
    # alla volta.
    page.wait_for_function('''() => {
      const foto = [...document.querySelectorAll('.pagina-sfoglio img')]
      return foto.length >= 4 && foto.every((img) => img.complete && img.naturalWidth > 0)
    }''', timeout=60000)
    page.evaluate(FRAME)

    # --- scegliere una pagina
    assert page.evaluate(SEGNA) >= 4
    riquadri.nth(1).click()
    expect(page.locator('.pagina-sfoglio--scelta')).to_have_count(1)
    expect(page.locator('.sfoglio__scelte')).to_contain_text('2')
    esito = page.evaluate(CONFRONTA)
    assert esito == {'riquadri': True, 'foto': True, 'matrice': True, 'testa': True}, \
        f'la scelta di una pagina ha rifatto troppo: {esito}'
    assert page.evaluate('prova.stato.pagineScelte') == {'smistamentoId': 'sm-isole', 'pagine': [2]}
    # Ctrl aggiunge: di nuovo solo classi, sugli stessi riquadri.
    riquadri.nth(4).click(modifiers=['Control'])
    expect(page.locator('.pagina-sfoglio--scelta')).to_have_count(2)
    assert page.evaluate(CONFRONTA)['riquadri'], 'i riquadri si sono rifatti'

    # --- il primo messaggio della coda: il PDF entra nella lettura, si ridisegna
    # tutto; riquadri e fotografie restano gli stessi.
    page.evaluate(SEGNA)
    lavoro(page, 3, [4, 5])
    expect(riquadri.nth(2)).to_have_class('pagina-sfoglio pagina-sfoglio--in-lettura')
    esito = page.evaluate(CONFRONTA)
    assert esito['riquadri'] and esito['foto'], f'un ridisegno completo ha rifatto lo sfoglio: {esito}'
    expect(page.locator('.lavoro-ocr')).to_have_count(1)
    expect(page.locator('.barra-stato')).to_contain_text(f'legge 3 di {PAGINE}')

    # --- una pagina letta dopo: solo l'isola della lettura.
    page.evaluate(SEGNA)
    lavoro(page, 4, [5])
    expect(page.locator('.pagina-sfoglio--in-lettura')).to_have_count(1)
    expect(riquadri.nth(3)).to_have_class('pagina-sfoglio pagina-sfoglio--in-lettura')
    expect(page.locator('.barra-stato')).to_contain_text(f'legge 4 di {PAGINE}')
    esito = page.evaluate(CONFRONTA)
    assert esito['riquadri'] and esito['foto'], f'una pagina letta ha rifatto lo sfoglio: {esito}'
    assert esito['matrice'], 'una pagina letta ha ridisegnato la matrice, fuori dall\'isola'
    # La scelta resta: sta nello stato, non nei riquadri.
    expect(page.locator('.pagina-sfoglio--scelta')).to_have_count(2)

    assert not errors, errors
    print('sfoglio a isole: ok')
