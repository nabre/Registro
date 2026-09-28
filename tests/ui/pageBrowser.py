"""Lo sfoglio delle pagine di un PDF da dividere, provato su Chromium.

Prova le due cose che non si possono provare con `node --test`, perche' vivono
nel browser: che pdfjs disegni davvero le pagine dentro il pannello — sul filo
principale, senza worker, vedi `components/thumbnails.ts` — e che una pagina
trascinata su una casella della matrice faccia partire l'azione giusta, con le
pagine giuste.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/pageBrowser.py`
"""
import json
import subprocess
from playwright.sync_api import expect

from banco import BUNDLE, FOTOGRAMMA, RADICE, chromium, pannello, schermata


# Un PDF di tre pagine, un nome per pagina: la prima e la terza sono della
# stessa persona, quindi le pagine si scelgono a mano.
pdf = BUNDLE / 'sfoglio-prova.pdf'
subprocess.run(
    ['node', '-e', f"""
const {{ PDFDocument, StandardFonts }} = require('@cantoo/pdf-lib')
const fs = require('node:fs')
;(async () => {{
  const documento = await PDFDocument.create()
  const font = await documento.embedFont(StandardFonts.Helvetica)
  for (const nome of ['Esempio Anna', 'Altro Nome', 'Esempio Anna']) {{
    const pagina = documento.addPage([595, 842])
    pagina.drawText('Pagella', {{ x: 60, y: 780, size: 16, font }})
    pagina.drawText('Allievo: ' + nome, {{ x: 60, y: 740, size: 12, font }})
  }}
  fs.writeFileSync({json.dumps(str(pdf))}, await documento.save())
}})()
"""],
    cwd=RADICE, check=True,
)
byte = pdf.read_bytes()

consolle = []


def prepara(page):
    # Anche la console: una chiusura di PDF che fallisce non fa cadere la pagina ma
    # lascia un errore qui, così si vede se `thumbnails.ts` smette di chiudere.
    page.on('console', lambda m: consolle.append(m.text) if m.type == 'error' and 'ERR_UNKNOWN_URL_SCHEME' not in m.text else None)
    # La cartella dei dati servita da qui (nel pannello è `registro://`): basta un
    # indirizzo da cui `fetch` porti dei byte.
    page.route('https://dati.prova/**', lambda rotta: rotta.fulfill(
        status=200, content_type='application/pdf', body=byte))


with chromium() as browser:
    page, errors = pannello(browser, 1600, prima=prepara)

    # Un PDF in attesa sulla classe di cui si è docente, agganciato a una
    # richiesta.
    page.evaluate('''() => {
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      const consegna = s.registro.consegne.find((c) => c.corsoId === s.registro.corsi.find((x) => x.classeId === classe.id).id)
      consegna.documento = 'pagella'
      consegna.a = 'classe'
      const smistamento = {
        id: 'sm-prova',
        consegnaId: consegna.id,
        classeId: classe.id,
        file: 'quarantena/scansione.pdf',
        nome: 'scansione.pdf',
        pagine: 3,
        letture: [1, 2, 3].map((numero) => ({ numero, testo: '', lettura: 'niente',
          riquadroNome: numero === 1 ? { x: 0.2, y: 0.1, larghezza: 0.4, altezza: 0.05 } : undefined })),
        assegnate: [],
        blocchi: [{ id: 'b1', da: 1, a: 3, allievoId: classe.allievi[0].id, motivo: 'senza-testo', estratto: '', fiducia: 0.9, lettura: 'niente' }],
        divisione: { modo: 'mano' },
        arrivatoIl: '2026-09-14T08:00:00.000Z',
      }
      s.registro.smistamenti.push(smistamento)
      // L'inventario del documento dell'anno: senza, la cornice direbbe che il
      // file non c'e' piu' — e sarebbe vero, perche' qui dentro nessuno l'ha
      // mai scritto.
      prova.aggiorna({
        registro: s.registro,
        radiceDati: 'https://dati.prova',
        archiviati: [{ percorso: smistamento.file, misura: 12345, revisione: 0 }],
      })
      prova.vaiA(prova.PAGINE.find((p) => p.id === 'pagina.classe.documenti'))
    }''')

    # Il nome del PDF, sopra la matrice, apre la cornice.
    page.locator('.da-dividere__pdf').first.click()
    pagine = page.locator('.pagina-sfoglio')
    expect(pagine).to_have_count(3)

    # pdfjs disegna: la prima pagina compare senza worker e senza uscire.
    expect(pagine.first.locator('img')).to_be_visible(timeout=30000)

    # Due scorrimenti, uno per riquadro, nessuno annidato: la rotella muove quel
    # che si sta guardando.
    scorrimenti = page.evaluate('''() => {
      const scorre = (el) => ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)
      return [...document.querySelectorAll('.archivio, .archivio *')]
        .filter(scorre)
        .map((el) => el.className.split(' ')[0])
    }''')
    assert sorted(scorrimenti) == ['archivio__barra', 'sfoglio__pagine'], scorrimenti
    assert page.evaluate(
        "getComputedStyle(document.querySelector('.tabella-contenitore--griglia')).overflowY"
    ) == 'visible', 'la matrice scorre ancora dentro di sé'
    # La pagina intera non scorre: il telaio è alto quanto lo spazio che c'è.
    assert page.evaluate(
        "(() => { const c = document.querySelector('.contenuto');"
        " return c.scrollHeight - c.clientHeight })()") < 4

    # Con una classe vera scorre il riquadro, e la testata dei documenti resta in
    # cima: si sa su quale colonna si lasciano le pagine.
    page.evaluate('''() => {
      const s = prova.stato
      const classe = s.registro.classi.find((c) => c.docenteDiClasse)
      for (let n = 0; n < 30; n += 1) {
        classe.allievi.push({ id: `alv-${n}`, cognome: `Cognome${n}`, nome: 'Prova', attivo: true })
      }
      prova.aggiorna({ registro: s.registro })
    }''')
    page.evaluate(FOTOGRAMMA)
    barra = page.locator('.archivio__barra')
    assert barra.evaluate('el => el.scrollHeight > el.clientHeight + 2'), 'il riquadro non scorre'
    barra.evaluate('el => { el.scrollTop = 300 }')
    page.evaluate(FOTOGRAMMA)
    appiccicata = page.evaluate('''() => {
      const barra = document.querySelector('.archivio__barra')
      const testa = document.querySelector('.tabella--documenti thead th')
      return testa.getBoundingClientRect().top - barra.getBoundingClientRect().top
    }''')
    assert -1 <= appiccicata <= 2, f'la testata della matrice non resta in cima: {appiccicata}'

    # Lo zoom ridisegna più fitto, non stira la stessa fotografia.
    larga_prima = pagine.first.locator('img').evaluate('img => img.naturalWidth')
    misura_prima = pagine.first.bounding_box()['width']
    cursore = page.locator('.sfoglio__zoom')
    cursore.fill(str(page.evaluate('prova.MISURE_SFOGLIO.length - 1')))
    cursore.dispatch_event('change')
    # pdfjs ridisegna ogni pagina alla misura nuova, più fitta.
    page.wait_for_function('''([larga, misura]) => {
      const prima = document.querySelector('.pagina-sfoglio')
      const img = prima?.querySelector('img')
      return prima.getBoundingClientRect().width > misura && img?.complete && img.naturalWidth > larga
    }''', arg=[larga_prima, misura_prima], timeout=30000)
    assert pagine.first.bounding_box()['width'] > misura_prima, 'le pagine non si sono allargate'
    larga_dopo = pagine.first.locator('img').evaluate('img => img.naturalWidth')
    assert larga_dopo > larga_prima, f'disegnata alla stessa risoluzione: {larga_prima} -> {larga_dopo}'
    # La misura scelta si ricorda: è una preferenza.
    assert page.evaluate('prova.stato.zoomSfoglio') == page.evaluate('prova.MISURE_SFOGLIO.at(-1)')
    cursore.fill('2')
    cursore.dispatch_event('change')
    page.wait_for_function('''(larga) => {
      const img = document.querySelector('.pagina-sfoglio img')
      return prova.stato.zoomSfoglio === prova.MISURE_SFOGLIO[2] && img?.complete && img.naturalWidth < larga
    }''', arg=larga_dopo, timeout=30000)

    # Due pagine che non si toccano: la prima, e la terza con Ctrl.
    pagine.nth(0).click()
    pagine.nth(2).click(modifiers=['Control'])
    expect(page.locator('.pagina-sfoglio--scelta')).to_have_count(2)
    expect(page.locator('.sfoglio__scelte')).to_contain_text('pagine 1 e 3')

    # Trascinate sulla casella della persona, nella colonna del documento.
    casella = page.locator('.tabella--documenti tbody .cella-documento__gruppo').first
    pagine.nth(0).drag_to(casella)

    chiesto = page.evaluate("richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.assegnaPagine')")
    assert chiesto, f'nessuna azione di assegnazione: {page.evaluate("richieste.map(r => r.azione && r.azione.tipo)")}'
    assert chiesto[0]['pagine'] == [1, 3], chiesto[0]
    assert chiesto[0]['smistamentoId'] == 'sm-prova', chiesto[0]

    # Archiviate le pagine, la scelta si lascia andare.
    expect(page.locator('.pagina-sfoglio--scelta')).to_have_count(0)

    # Una pagina non scelta porta se stessa e parte lo stesso, anche dopo un
    # ridisegno.
    page.evaluate('richieste.length = 0')
    pagine.nth(1).drag_to(casella)
    chiesto = page.evaluate("richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.assegnaPagine')")
    assert chiesto and chiesto[0]['pagine'] == [2], chiesto

    # Il riquadro sul punto in cui è stato letto il nome.
    expect(page.locator('.pagina-sfoglio__nome')).to_have_count(1)
    misure = page.evaluate('''() => {
      const segno = document.querySelector('.pagina-sfoglio__nome').getBoundingClientRect()
      const foto = document.querySelector('.pagina-sfoglio__foto').getBoundingClientRect()
      return { segnoL: segno.width, segnoY: segno.top, fotoL: foto.width, fotoY: foto.top }
    }''')
    assert misure['segnoL'] > 0, 'il riquadro non si vede'
    assert misure['segnoL'] < misure['fotoL'], 'il riquadro copre tutta la pagina'
    assert misure['segnoY'] > misure['fotoY'], 'il riquadro non sta dentro la pagina'

    # Il tasto destro: rileggere una scansione, assegnare senza trascinare,
    # buttare quel che non è di nessuno.
    pagine.nth(1).click(button='right')
    menu = page.locator('.menu')
    expect(menu).to_have_count(1)
    expect(menu).to_contain_text('Assegna a')
    expect(menu).to_contain_text('Butta via')
    page.keyboard.press('Escape')
    expect(page.locator('.menu')).to_have_count(0)

    # Una pagina archiviata sparisce dall'elenco; l'interruttore la rimette in
    # fila.
    page.evaluate("""() => {
      const sm = prova.stato.registro.smistamenti[0]
      const classe = prova.stato.registro.classi.find((c) => c.docenteDiClasse)
      sm.assegnate = [{ allievoId: classe.allievi[0].id, consegnaId: sm.consegnaId, da: 2, a: 2 }]
      sm.letture = sm.letture.filter((l) => l.numero !== 2)
      sm.blocchi = [{ id: 'b1', da: 1, a: 1, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' },
                    { id: 'b3', da: 3, a: 3, allievoId: null, motivo: 'senza-testo', estratto: '', fiducia: 0, lettura: 'niente' }]
      prova.aggiorna({ registro: prova.stato.registro })
    }""")
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.pagina-sfoglio')).to_have_count(2)
    interruttore = page.locator('.sfoglio__testa button', has_text='Archiviate (1)')
    expect(interruttore).to_be_visible()
    interruttore.click()
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.pagina-sfoglio')).to_have_count(3)
    expect(page.locator('.pagina-sfoglio--archiviata')).to_have_count(1)

    # E sull'archiviata il menu è un altro: quello che la riprende.
    page.evaluate('richieste.length = 0')
    page.locator('.pagina-sfoglio--archiviata').click(button='right')
    expect(page.locator('.menu')).to_contain_text('Riprendila')
    page.locator('.menu__voce', has_text='Riprendila').first.click()
    ripresa = page.evaluate(
        "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.riprendiPagine')")
    assert ripresa and ripresa[0]['pagine'] == [2], ripresa

    # Le due chiusure (cambiare versione del file, dimenticarlo). In pdfjs 5
    # `destroy` sta sul compito, non sul documento, e un errore finirebbe in un
    # `catch` vuoto: si prova per comportamento, chiudendo e riaprendo.
    esito = page.evaluate('''async () => {
      const url = 'https://dati.prova/scansione.pdf'
      const a1 = await prova.miniatura(url, 'rev-1', 1, 300)
      // Chiave diversa: si chiude il precedente e si apre questo.
      const b1 = await prova.miniatura(url, 'rev-2', 1, 300)
      // E il primo si riapre da capo. Se la chiusura avesse toccato l'oggetto
      // sbagliato — o non fosse avvenuta — di qui non si tornerebbe uguali.
      const a2 = await prova.miniatura(url, 'rev-1', 1, 300)
      prova.dimentica()
      const a3 = await prova.miniatura(url, 'rev-1', 1, 300)
      return { a1, b1, a2, a3 }
    }''')
    for nome in ('a1', 'b1', 'a2', 'a3'):
        foto = esito[nome]
        assert isinstance(foto, str) and foto.startswith('data:image/jpeg'), \
            f"{nome} non e una fotografia: {str(foto)[:60]}"
    assert esito['a2'] == esito['a1'], 'riaperto dopo il cambio di versione, esce diverso'
    assert esito['a3'] == esito['a1'], 'riaperto dopo dimentica(), esce diverso'

    schermata(page, 'sfoglio.png')
    assert not errors, errors
    assert not consolle, consolle
    print('sfoglio: ok')
