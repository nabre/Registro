"""Cassetto responsive: sovrapposizione, misure stabili e tastiera."""
from playwright.sync_api import expect

from banco import FOTOGRAMMA, chromium, pannello

with chromium() as browser:
    page, errors = pannello(browser, 720, 850)

    for width in (720, 900, 1024):
        page.set_viewport_size({'width': width, 'height': 850})
        page.evaluate('prova.aggiorna({sidebarMobile:false})')
        page.evaluate(FOTOGRAMMA)
        toggle = page.locator('[data-fuoco="apri-navigazione"]')
        sidebar = page.locator('#navigazione-laterale')
        expect(toggle).to_have_attribute('aria-controls', 'navigazione-laterale')
        expect(toggle).to_have_attribute('aria-expanded', 'false')
        prima = page.locator('main').bounding_box()
        toggle.click()
        expect(toggle).to_have_attribute('aria-expanded', 'true')
        expect(page.locator('.sidebar__sfondo')).to_be_visible()
        dopo = page.locator('main').bounding_box()
        assert prima == dopo, (width, prima, dopo)
        scatola = sidebar.bounding_box()
        assert scatola['x'] == 0 and scatola['width'] < width, (width, scatola)
        assert sidebar.evaluate('(el)=>getComputedStyle(el).position') == 'fixed'
        sidebar.get_by_role('button', name='Calendario', exact=True).focus()
        page.keyboard.press('Escape')
        expect(toggle).to_have_attribute('aria-expanded', 'false')
        expect(toggle).to_be_focused()

        toggle.click()
        sidebar.get_by_role('button', name='Corsi', exact=True).click()
        expect(toggle).to_have_attribute('aria-expanded', 'false')
        expect(toggle).to_be_focused()

        toggle.click()
        page.locator('.sidebar__sfondo').click(position={'x': width - 10, 'y': 20})
        expect(toggle).to_have_attribute('aria-expanded', 'false')
        expect(toggle).to_be_focused()

    # Sopra il punto di rottura resta la sidebar desktop, non un cassetto.
    page.set_viewport_size({'width': 1100, 'height': 850})
    page.evaluate('prova.aggiorna({sidebarDesktop:true})')
    expect(page.locator('.sidebar__sfondo')).to_have_count(0)
    assert page.locator('#navigazione-laterale').evaluate('(el)=>getComputedStyle(el).position') != 'fixed'
    assert not errors, errors

print('sidebar drawer: ok')
