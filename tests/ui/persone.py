"""Persone in formazione: l'elenco laterale che scorre resta la stessa scatola.

Qui si prova che:

- scegliere un nome (un ridisegno completo: cambia la persona del contesto)
  tiene lo stesso nodo dell'elenco laterale, con la sua posizione: la catena
  di telaio arriva fin lì (`data-telaio` su vista, colonne ed elenco), e la
  rotella in corsa non si perde;
- la scelta resta sulla pagina Persone e porta classe e persona nel contesto;
- «A tutta pagina» apre la scheda della persona (`pagina.allievo`).

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/persone.py`.
"""
from playwright.sync_api import expect

from banco import FRAME, esegui, pannello


def elenco_tenuto(browser):
    page, errori = pannello(browser, 1400, 500)
    # Trenta persone in più: l'elenco è lungo abbastanza da scorrere.
    page.evaluate('''() => {
      const r = structuredClone(prova.stato.registro)
      for (let n = 0; n < 30; n += 1) {
        r.classi[0].allievi.push({ ...r.classi[0].allievi[0], id: `alv-${n}`, cognome: `Cognome${n}` })
      }
      prova.aggiorna({ registro: r })
    }''')
    page.evaluate("prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.persone'))")
    page.evaluate(FRAME)
    elenco = page.locator('.vista--persone .elenco-laterale')
    expect(elenco).to_have_count(1)
    chiusi = page.locator('.elenco-laterale__gruppo:not([aria-expanded="true"])')
    while chiusi.count() > 0:
        chiusi.first.click()
    voci = elenco.locator('.voce-laterale')
    assert voci.count() > 1, voci.count()
    page.evaluate("()=>{const e=document.querySelector('.elenco-laterale');e.scrollTop=40;"
                  "window.__elenco=e}")
    alto = page.evaluate("document.querySelector('.elenco-laterale').scrollTop")
    assert alto > 0, 'l’elenco non scorre'
    # Il clic da script: quello di Playwright porterebbe la voce in vista, scorrendo.
    voci.nth(3).evaluate('b => b.click()')
    page.evaluate(FRAME)
    allievo = page.evaluate('prova.stato.allievoId')
    assert allievo, allievo
    assert page.evaluate('prova.postoCorrente()') == {'pagina': 'pagina.persone'}, page.evaluate('prova.postoCorrente()')
    classe = page.evaluate("id=>prova.stato.registro.classi.find(c=>c.allievi.some(a=>a.id===id)).id", allievo)
    assert page.evaluate('prova.stato.classeId') == classe, classe
    expect(page.locator('.voce-laterale--attiva')).to_have_count(1)
    assert page.evaluate("document.querySelector('.elenco-laterale')===window.__elenco"), \
        'l’elenco laterale si è rifatto'
    dopo = page.evaluate("document.querySelector('.elenco-laterale').scrollTop")
    assert dopo == alto, (alto, dopo)

    # A tutta pagina: la scheda della persona scelta.
    page.locator('.vista--persone .testata__azioni button').first.click()
    assert page.evaluate('prova.postoCorrente()') == {
        'pagina': 'pagina.allievo', 'soggetto': {'tipo': 'allievo', 'id': allievo}}
    expect(page.locator('.vista--allievo')).to_have_count(1)
    assert not errori, errori
    page.close()


esegui('persone', [elenco_tenuto])
