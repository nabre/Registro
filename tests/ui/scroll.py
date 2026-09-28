"""Lo scorrimento: chi ricorda dov'era, chi riparte dall'alto, chi segue il fondo.

Sta in un file suo e non dentro `navigation.py` perché è una cosa sola e la si
legge tutta insieme: `navigation.py` sono novecento righe di navigazione,
comandi e filtri, e una regressione dello scorrimento vi si perderebbe in mezzo.

Che cosa difende, e da che cosa. Il registro **rifà l'albero intero a ogni
cambio di stato** — una spunta, l'orologio che batte il minuto, una lettera
scritta in un filtro — e `rimpiazza` in `ui/dom.ts` svuota e ricostruisce: ogni
scatola che scorre riparte da capo, salvo quelle marcate `data-scorrimento`.
`main.contenuto`, che è la superficie su cui scorre quasi ogni pagina del
registro, non era marcata: chi si era scorso in fondo alle pendenze tornava in
cima a ogni gesto. Queste prove sarebbero state rosse prima di quel marchio.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/scroll.py`
"""
from banco import FOTOGRAMMA, chromium, pannello

with chromium() as browser:
    # Bassa apposta: su una finestra alta la Guida non scorre.
    page, errors = pannello(browser, 1280, 600)

    contenuto = page.locator('main.contenuto')

    # La pagina dichiara che cosa si sta guardando: è la chiave con cui
    # `ricordaScorrimenti` la ritrova dopo il ridisegno.
    chiave = contenuto.get_attribute('data-scorrimento')
    assert chiave and chiave.startswith('pagina:'), f'chiave assente o storta: {chiave!r}'

    # Una pagina lunga, scorsa a metà, sopravvive a un ridisegno che non cambia
    # niente (si spunta una riga e la pagina si rifà).
    page.evaluate("prova.vai({pagina:'pagina.guida'})")
    page.evaluate(FOTOGRAMMA)
    contenuto.evaluate('(el) => el.scrollTop = 400')
    dove = contenuto.evaluate('(el) => el.scrollTop')
    assert dove > 0, 'la Guida non scorre: la prova non direbbe niente'
    page.evaluate('prova.ridisegna()')
    page.evaluate(FOTOGRAMMA)
    assert contenuto.evaluate('(el) => el.scrollTop') == dove, 'la pagina è tornata in cima'

    # Cambiando vista si riparte dall'alto: è un'altra cosa che si guarda.
    page.evaluate("prova.vai({pagina:'pagina.impostazioni'})")
    page.evaluate(FOTOGRAMMA)
    assert contenuto.evaluate('(el) => el.scrollTop') == 0, 'la vista nuova eredita lo scorrimento della precedente'

    # La regola unica di `styles/foundations.css` arriva sulla scatola: il gesto
    # si ferma in fondo, lo spazio della barra è riservato, la barra è sottile.
    stile = contenuto.evaluate(
        "(el) => { const s = getComputedStyle(el);"
        " return [s.overscrollBehaviorY, s.scrollbarGutter, s.scrollbarWidth].join('|') }"
    )
    assert 'contain' in stile, f'manca `overscroll-behavior: contain`: {stile}'
    assert 'stable' in stile, f'manca `scrollbar-gutter: stable`: {stile}'
    assert 'thin' in stile, f'manca `scrollbar-width: thin`: {stile}'

    # La rotella mentre il registro si ridisegna di continuo (l'orologio, una
    # risposta dell'host, il filo di lavoro): la scatola che scorre è la stessa
    # di prima, e gli scatti in corsa arrivano tutti. Ricreata a ogni disegno,
    # Chromium li perdeva per strada e la pagina «tornava su».
    page.evaluate("prova.vai({pagina:'pagina.guida'})")
    page.evaluate(FOTOGRAMMA)

    def rotella(con_ridisegni):
        contenuto.evaluate('(el) => el.scrollTop = 0')
        page.wait_for_timeout(100)
        if con_ridisegni:
            page.evaluate('window.__ridisegni = setInterval(() => prova.ridisegna(), 50)')
        page.mouse.move(700, 400)
        for _ in range(10):
            page.mouse.wheel(0, 150)
            page.wait_for_timeout(30)
        page.wait_for_timeout(500)
        if con_ridisegni:
            page.evaluate('clearInterval(window.__ridisegni)')
        return contenuto.evaluate('(el) => el.scrollTop')

    senza = rotella(False)
    con = rotella(True)
    assert senza > 600, f'la Guida scorre troppo poco perché la prova dica qualcosa: {senza}'
    assert abs(con - senza) <= 150, f'scatti persi durante i ridisegni: {con} invece di {senza}'

    # Un ridisegno lento, e intanto la pagina scorre (il compositore non aspetta
    # JavaScript): alla fine si resta dove si è arrivati, non dove si era
    # all'inizio del disegno. Lo scorrimento a metà costruzione lo simula la
    # prima lettura di `stato.avvisi`, che avviene solo dentro il telaio.
    contenuto.evaluate('(el) => el.scrollTop = 400')
    page.evaluate('''() => {
      const s = prova.stato
      let valore = s.avvisi
      let armato = true
      Object.defineProperty(s, 'avvisi', {
        configurable: true, enumerable: true,
        get () {
          if (armato) {
            armato = false
            document.querySelector('main.contenuto').scrollTop += 300
          }
          return valore
        },
        set (nuovo) { valore = nuovo },
      })
      window.__rimetti = () => Object.defineProperty(s, 'avvisi', {
        configurable: true, enumerable: true, writable: true, value: valore,
      })
    }''')
    page.evaluate('prova.ridisegna()')
    page.evaluate(FOTOGRAMMA)
    page.evaluate('window.__rimetti()')
    dopo = contenuto.evaluate('(el) => el.scrollTop')
    assert dopo == 700, f'il ridisegno lento ha riportato indietro lo scorrimento: {dopo} invece di 700'

    assert not errors, f'errori JS: {errors}'

print('scorrimento: ok')
