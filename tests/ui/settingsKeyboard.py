"""Schede delle impostazioni: relazioni ARIA, roving tabindex e tastiera APG."""
from playwright.sync_api import expect

from banco import FOTOGRAMMA, chromium, pannello

with chromium() as browser:
    page, errors = pannello(browser)
    page.evaluate("prova.vai({pagina:'pagina.impostazioni',scheda:'documento.anno'})")
    page.evaluate(FOTOGRAMMA)

    # I gruppi cambiano insieme di schede: pulsanti, non una falsa tablist annidata.
    gruppi = page.locator('.impostazioni__gruppi')
    expect(gruppi).not_to_have_attribute('role', 'tablist')
    expect(gruppi.locator('button[aria-pressed="true"]')).to_have_count(1)

    lista = page.locator('.impostazioni__sezioni[role="tablist"]')
    expect(lista).to_have_count(1)
    schede = lista.get_by_role('tab')
    assert schede.count() > 1
    expect(lista.locator('[role="tab"][aria-selected="true"]')).to_have_count(1)
    expect(lista.locator('[role="tab"][tabindex="0"]')).to_have_count(1)
    expect(lista.locator('[role="tab"][tabindex="-1"]')).to_have_count(schede.count() - 1)

    pannello = page.get_by_role('tabpanel')
    attiva = lista.locator('[role="tab"][aria-selected="true"]')
    assert attiva.get_attribute('aria-controls') == pannello.get_attribute('id')
    assert pannello.get_attribute('aria-labelledby') == attiva.get_attribute('id')

    # Attivazione automatica. Il ridisegno conserva fuoco sulla nuova scheda.
    attiva.focus()
    page.keyboard.press('ArrowRight')
    page.evaluate(FOTOGRAMMA)
    nuova = page.locator('.impostazioni__sezioni [role="tab"][aria-selected="true"]')
    expect(nuova).to_be_focused()
    expect(nuova).to_have_attribute('tabindex', '0')

    page.keyboard.press('End')
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.impostazioni__sezioni [role="tab"]').last).to_be_focused()
    page.keyboard.press('Home')
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.impostazioni__sezioni [role="tab"]').first).to_be_focused()
    page.keyboard.press('ArrowLeft')
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.impostazioni__sezioni [role="tab"]').last).to_be_focused()
    page.keyboard.press('ArrowUp')
    page.evaluate(FOTOGRAMMA)
    expect(page.locator('.impostazioni__sezioni [role="tab"]').nth(-2)).to_be_focused()

    assert not errors, errors

print('impostazioni tastiera: ok')
