"""Scelte alternative: radio complete, una scelta e movimento da tastiera."""
from playwright.sync_api import expect

from banco import FOTOGRAMMA, FRAME, PAGINA_CON_TITOLO, chromium, pannello

with chromium() as browser:
    page, errors = pannello(browser, html=PAGINA_CON_TITOLO)
    page.evaluate("""()=>{
      const corso=prova.stato.registro.corsi[0]
      prova.scegliCorso(corso.id)
      prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))
    }""")
    page.evaluate(FRAME)

    gruppi = page.get_by_role('radiogroup')
    assert gruppi.count() > 0
    for indice in range(gruppi.count()):
        gruppo = gruppi.nth(indice)
        radio = gruppo.get_by_role('radio')
        assert radio.count() > 1
        expect(gruppo.locator('[role="radio"][aria-checked="true"]')).to_have_count(1)
        expect(gruppo.locator('[role="radio"][tabindex="0"]')).to_have_count(1)
        expect(gruppo.locator('[role="radio"][aria-checked="false"]')).to_have_count(
            radio.count() - 1)

    gruppo = gruppi.first
    attiva = gruppo.locator('[role="radio"][aria-checked="true"]')
    attiva.focus()
    page.keyboard.press('ArrowRight')
    page.evaluate(FOTOGRAMMA)
    nuova = page.get_by_role('radiogroup').first.locator(
        '[role="radio"][aria-checked="true"]')
    expect(nuova).to_be_focused()
    expect(nuova).to_have_attribute('tabindex', '0')

    assert not errors, errors

print('selectorA11y: ok')
