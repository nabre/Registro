"""Regressioni UI su Chromium senza avviare Electron o toccare dati reali.
Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/navigation.py`
"""
from pathlib import Path
from datetime import date, timedelta
import re
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content('<html lang="it"><body class="app"><div id="radice"></div></body></html>')
    page.add_script_tag(content='''window.richieste=[]; window.tutte=[]; window.acquireVsCodeApi=()=>({getState:()=>null,setState:()=>{},postMessage:m=>{richieste.push(m); tutte.push(m); if(m.id) setTimeout(()=>window.dispatchEvent(new MessageEvent('message',{data:{tipo:'risposta',id:m.id,ok:true}})),0)}})''')
    page.add_style_tag(path=str(root / 'dist-tests/ui.css'))
    page.add_script_tag(path=str(root / 'dist-tests/ui.js'))
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('navigation', name='Navigazione principale')).to_be_visible()
    navigazione = page.locator('[data-fuoco="apri-navigazione"]')
    laterale = page.locator('#navigazione-laterale')
    expect(laterale.locator('.sidebar__pagina')).to_have_count(page.evaluate('prova.PAGINE.length'))
    expect(laterale.locator('[aria-current="page"]')).to_have_count(1)
    # Cinque gruppi, ognuno una domanda sola: la giornata, il corso, la classe,
    # l'anagrafe dell'anno, il programma.
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='agenda').map(p=>p.id)")         == ['pagina.oggi', 'pagina.calendario', 'pagina.pendenze', 'pagina.daSmistare']
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='anno').map(p=>p.id)")         == ['pagina.classi', 'pagina.persone', 'pagina.mappa', 'pagina.corsi']
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='sistema').map(p=>p.id)")         == ['pagina.impostazioni', 'pagina.guida']
    gruppi = page.evaluate("prova.gruppiDiPagine().map(g=>g.gruppo)")
    assert [g for g in gruppi if g != 'classe'] == ['agenda', 'registro', 'anno', 'sistema'], gruppi
    # L'interruttore sta nell'intestazione della navigazione, e l'intestazione
    # resta ferma in cima mentre le pagine scorrono.
    expect(laterale.locator('.sidebar__marchio [data-fuoco="apri-navigazione"]')).to_have_count(1)
    expect(page.locator('.barra-titolo [data-fuoco="apri-navigazione"]')).to_have_count(0)
    assert laterale.locator('.sidebar__marchio').evaluate('(el) => getComputedStyle(el).position') == 'sticky'
    # Un aggiornamento dei dati non deve riportare in cima la sidebar scorsa.
    page.set_viewport_size({'width': 1440, 'height': 500})
    navigazione.focus()
    laterale.evaluate('(el) => el.scrollTop = el.scrollHeight')
    scorrimento = laterale.evaluate('(el) => el.scrollTop')
    assert scorrimento > 0
    alto = laterale.bounding_box()['y']
    assert abs(laterale.locator('.sidebar__marchio').bounding_box()['y'] - alto) < 1
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert laterale.evaluate('(el) => el.scrollTop') == scorrimento
    page.set_viewport_size({'width': 1440, 'height': 1000})
    prima = page.locator('main').bounding_box()['width']
    navigazione.click()
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    assert page.locator('main').bounding_box()['width'] > prima
    expect(laterale.get_by_role('button', name='Corsi', exact=True)).to_be_visible()
    laterale.get_by_role('button', name='Corsi', exact=True).click()
    expect(laterale.get_by_role('button', name='Corsi', exact=True)).to_have_attribute('aria-current', 'page')
    laterale.get_by_role('button', name='Calendario', exact=True).click()
    page.screenshot(path=str(root / 'dist-tests/sidebar-compatta.png'))
    navigazione.click()
    expect(laterale).to_be_visible()
    # Il ridisegno della sidebar arriva un frame dopo: aperto prima, il menu si
    # richiuderebbe.
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # Menu: frecce, Home/End, Escape e restituzione del focus.
    file = page.get_by_role('button', name='File', exact=True)
    file.focus(); page.keyboard.press('ArrowDown')
    expect(file).to_have_attribute('aria-expanded', 'true')
    page.keyboard.press('End')
    expect(page.locator('.menu__voce').last).to_be_focused()
    page.keyboard.press('Home'); page.keyboard.press('ArrowDown'); page.keyboard.press('Escape')
    expect(file).to_be_focused()
    expect(file).to_have_attribute('aria-expanded', 'false')
    # Il file recente invia il percorso e lascia la pagina corrente. I preferiti
    # sono un gruppo loro, con la stella come icona: il nome comincia con l'anno.
    file.click(); page.get_by_role('menuitem', name='2025-2026').click()
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='documento.apri' && m.azione.percorso==='C:/esempio/2025-2026.regi')")
    # Il tasto destro su un recente apre accanto il suo riquadro col nome del file;
    # freccia a sinistra lo chiude, a destra lo riapre; il tasto destro su una riga
    # senza riquadro lo chiude.
    padre = page.locator('.menu:not(.menu--figlio)')
    figlio = page.locator('.menu--figlio')
    riga = padre.locator('.menu__voce[data-voce="C:/esempio/2025-2026.regi"]')
    file.click()
    riga.click(button='right')
    expect(figlio).to_have_attribute('aria-label', '2025-2026')
    page.keyboard.press('ArrowLeft')
    expect(figlio).to_have_count(0)
    expect(riga).to_be_focused()
    page.keyboard.press('ArrowRight')
    expect(figlio).to_have_count(1)
    padre.get_by_role('menuitem', name='Apri un anno…').click(button='right')
    expect(figlio).to_have_count(0)
    expect(padre).to_have_count(1)
    page.keyboard.press('Escape')
    # La stella dal riquadro lascia il menu aperto col fuoco sulla riga del file:
    # né lo scorrimento né un secondo ridisegno lo chiudono. Il secondo clic su
    # «File» lo richiude.
    page.set_viewport_size({'width': 1440, 'height': 500})
    laterale.evaluate('(el) => el.scrollTop = el.scrollHeight')
    for _ in range(2):
        file.click()
        riga.click(button='right')
        figlio.locator('.menu__voce').first.click()
        for _ in range(3):
            page.evaluate('()=>new Promise(requestAnimationFrame)')
        expect(padre).to_have_count(1)
        expect(riga).to_be_focused()
        page.evaluate('prova.aggiorna({})')
        for _ in range(3):
            page.evaluate('()=>new Promise(requestAnimationFrame)')
        expect(padre).to_have_count(1)
        expect(file).to_have_attribute('aria-expanded', 'true')
        file.click()
        expect(padre).to_have_count(0)
        expect(file).to_have_attribute('aria-expanded', 'false')
    assert page.evaluate("prova.stato.documenti.elenco[0].preferito") is True
    page.set_viewport_size({'width': 1440, 'height': 1000})
    # La scelta del corso nel registro cambia davvero la lezione aperta.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))")
    select = page.locator('[data-fuoco="barra-comandi-corso"]')
    select.select_option(page.evaluate('prova.stato.registro.corsi[1].id'))
    page.wait_for_function('prova.stato.registro.lezioni.find(l=>l.id===prova.stato.lezioneId).corsoId===prova.stato.corsoId')
    expect(select).to_have_value(page.evaluate('prova.stato.corsoId'))
    # La tendina del corso sta nella barra, non nel registro della lezione; i
    # gesti dell'ora sono comandi della pagina, non pulsanti in testata.
    assert page.evaluate("document.querySelectorAll('.navigatore-registro select').length") == 1
    assert page.evaluate("document.querySelectorAll('.vista--lezione .testata button').length") == 0
    for id in ['lezione.stato.pianificata', 'lezione.stato.svolta',
               'lezione.stato.annullata', 'lezione.modifica']:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)
    # Le esportazioni stanno tutte in Documenti: nessun comando le porta altrove.
    assert page.evaluate(
        r"prova.COMANDI_UI.filter(c=>/^(corso\.esporta|corso\.verbale|lezione\.calendario|corso\.nuovaOra)/.test(c.id))"
        ".every(c=>!c.dove.includes('lezione'))"
    )
    page.screenshot(path=str(root / 'dist-tests/lezione-compatta.png'))
    # Visita tutte le destinazioni con un contesto valido.
    ids = page.evaluate('prova.PAGINE.map(p=>p.id)')
    for id in ids:
        page.evaluate("prova.scegliCorso(prova.stato.registro.corsi[0].id)")
        page.evaluate('()=>new Promise(requestAnimationFrame)')
        titolo = page.evaluate("id=>prova.PAGINE.find(p=>p.id===id).titolo", id)
        laterale.get_by_role('button', name=titolo, exact=True).click()
        expect(laterale.locator('[aria-current="page"]')).to_have_count(1)
        page.wait_for_function('document.querySelector("main")?.textContent.length > 0')
        page.evaluate('()=>new Promise(requestAnimationFrame)')
        assert page.evaluate('prova.gruppiDiPagine().filter(g=>g.attivo).length') == 1, id
        assert page.evaluate('id=>prova.gruppiDiPagine().find(g=>g.attivo).gruppo===prova.PAGINE.find(p=>p.id===id).gruppo', id), id
    # Le tendine del contesto compaiono solo dove filtrano qualcosa.
    corso_select = page.locator('[data-fuoco="barra-comandi-corso"]')
    classe_select = page.locator('[data-fuoco="barra-comandi-classe"]')
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.valutazioni'))")
    expect(corso_select).to_be_visible()
    expect(classe_select).to_have_count(0)
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
    expect(classe_select).to_be_visible()
    expect(corso_select).to_have_count(0)
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    expect(corso_select).to_have_count(0)
    expect(classe_select).to_have_count(0)
    # I comandi del calendario stanno nella barra, non nella testata della vista.
    comandi_calendario = ['registro.oggi', 'calendario.indietro', 'calendario.avanti',
                          'calendario.settimana', 'calendario.mese', 'calendario.anno', 'calendario.agenda']
    for id in comandi_calendario:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)
    # «Oggi» del calendario sta nella riga delle azioni, una volta; la voce «Oggi»
    # della barra laterale è la pagina omonima.
    expect(page.locator('#azioni-pagina').get_by_role('button', name='Oggi', exact=True)).to_have_count(1)
    expect(page.locator('main').get_by_role('button', name='Oggi', exact=True)).to_have_count(0)
    # La modalità si legge sul pulsante acceso, e le frecce spostano il periodo.
    page.locator('[data-fuoco="comando-calendario.mese"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.modoCalendario') == 'mese'
    expect(page.locator('[data-fuoco="comando-calendario.mese"]')).to_have_attribute('aria-pressed', 'true')
    prima = page.evaluate('prova.stato.data')
    page.locator('[data-fuoco="comando-calendario.avanti"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.data') != prima
    page.locator('[data-fuoco="comando-registro.oggi"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # La data locale, come `oggi()` in `dominio/date.ts`: `toISOString()` darebbe
    # quella UTC, diversa fra mezzanotte e le due in estate.
    oggi = page.evaluate(
        "(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")
    assert page.evaluate('prova.stato.data') == oggi
    page.locator('[data-fuoco="comando-calendario.settimana"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # La striscia delle settimane segna un confine solo: la fine del semestre che
    # ne ha un altro dopo (la fine dell'ultimo è il bordo della striscia).
    expect(page.locator('.striscia-settimane')).to_have_count(1)
    expect(page.locator('.striscia-settimane__voce--apre-semestre')).to_have_count(0)
    confini = page.locator('.striscia-settimane__voce--chiude-semestre')
    semestri = page.evaluate('()=>prova.stato.registro.anni[0].semestri.length')
    expect(confini).to_have_count(semestri - 1)
    # E cade sulla settimana in cui il semestre finisce. Il titolo conta i soli
    # giorni mostrati, il confine si cerca su tutti e sette (`weekStrip.ts`): un
    # semestre che finisce di domenica, con Sab/Dom nascosti, sta nella settimana
    # che il titolo chiude al venerdì. Si confronta col lunedì e la domenica.
    fine = page.evaluate('()=>prova.stato.registro.anni[0].semestri[0].fine')
    titolo = confini.first.get_attribute('title')
    assert 'finisce il' in titolo, titolo
    estremi = re.findall(r'\d{2}\.\d{2}\.\d{4}', titolo)

    def iso(scritta):
        g, m, a = scritta.split('.')
        return f'{a}-{m}-{g}'

    primo = date.fromisoformat(iso(estremi[0]))
    lunedi = primo - timedelta(days=primo.weekday())
    domenica = lunedi + timedelta(days=6)
    assert lunedi.isoformat() <= fine <= domenica.isoformat(), (titolo, fine)
    # Il filtro per corso del calendario sta nella barra ed è indipendente da
    # quello del registro: due campi diversi.
    filtro_agenda = page.locator('[data-fuoco="barra-comandi-corso-agenda"]')
    expect(filtro_agenda).to_be_visible()
    expect(corso_select).to_have_count(0)
    assert page.evaluate("document.querySelectorAll('.vista--calendario select').length") == 0
    corso_registro = page.evaluate('prova.stato.corsoId')
    altro = page.evaluate('prova.stato.registro.corsi[1].id')
    filtro_agenda.select_option(altro)
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.filtroCorsoAgendaId') == altro
    assert page.evaluate('prova.stato.corsoId') == corso_registro
    assert page.evaluate('prova.lezioniInAgenda().every(l=>l.corsoId===prova.stato.filtroCorsoAgendaId)')
    # E il corso del registro non tocca quello del calendario.
    page.evaluate("prova.scegliCorso(prova.stato.registro.corsi[0].id)")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.filtroCorsoAgendaId') == altro
    filtro_agenda.select_option('')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.filtroCorsoAgendaId') is None
    # Un filtro puntato su un corso che nel documento aperto non c'è (il campo è
    # ricordato fra un anno e l'altro) lascia la tendina in bianco: se il browser
    # accendesse «Tutti i corsi», riscegliere quella voce non farebbe partire
    # nessun `change`.
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        tendina = page.locator(f'[data-fuoco="{fuoco}"]')
        expect(tendina).to_have_count(1)
        assert tendina.evaluate('(e) => e.options[0].textContent') == 'Tutti i corsi', fuoco
    page.evaluate("prova.aggiorna({filtroCorsoAgendaId:'corso-di-un-altro-anno'})")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        tendina = page.locator(f'[data-fuoco="{fuoco}"]')
        assert tendina.evaluate('(e) => e.selectedIndex') == -1, fuoco
        assert tendina.evaluate('(e) => e.options[0].selected') is False, fuoco
        assert tendina.input_value() == '', fuoco
    # Un corso che c'è si accende: `h` applica il `value` dopo aver appeso le
    # option.
    page.evaluate('prova.aggiorna({filtroCorsoAgendaId:prova.stato.registro.corsi[1].id})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        assert page.locator(f'[data-fuoco="{fuoco}"]').input_value()             == page.evaluate('prova.stato.filtroCorsoAgendaId'), fuoco
    page.evaluate('prova.aggiorna({filtroCorsoAgendaId:null})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        assert page.locator(f'[data-fuoco="{fuoco}"]').evaluate('(e) => e.selectedIndex') == 0, fuoco
    page.screenshot(path=str(root / 'dist-tests/calendario-compatto.png'))
    # Pendenze: i tre filtri sono comandi della pagina, e l'acceso si legge sul
    # pulsante.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.pendenze'))")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for id in ['todo.tutte', 'todo.mie', 'todo.classi']:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)
    assert page.evaluate("document.querySelectorAll('.vista--todo .testata .selettore').length") == 0
    expect(page.locator('[data-fuoco="comando-todo.tutte"]')).to_have_attribute('aria-pressed', 'true')
    page.locator('[data-fuoco="comando-todo.mie"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.filtroTodo') == 'mie'
    expect(page.locator('[data-fuoco="comando-todo.mie"]')).to_have_attribute('aria-pressed', 'true')
    expect(page.locator('[data-fuoco="comando-todo.tutte"]')).to_have_attribute('aria-pressed', 'false')
    page.locator('[data-fuoco="comando-todo.tutte"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # Il riepilogo è compatto: una riga per famiglia, la spiegazione nel titolo.
    # Una scheda per tipologia, quante ne dichiara il dominio.
    expect(page.locator('.todo-sintesi__scheda')).to_have_count(
        page.evaluate('prova.FAMIGLIE_TODO.length'))
    assert page.evaluate("document.querySelector('.todo-sintesi__scheda').getBoundingClientRect().height < 64")
    assert page.evaluate("!!document.querySelector('.todo-sintesi__scheda').title")
    # Una linguetta per classe con lavoro, piu' «Tutte», e ognuna filtra.
    schede = page.locator('.todo-schede .selettore__voce')
    expect(schede).to_have_count(3)
    expect(page.locator('.todo-classi > *')).to_have_count(2)
    # Con una linguetta aperta il riquadro della classe sparisce: il nome è già
    # sulla linguetta.
    schede.nth(1).click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.classeTodoId') is not None
    expect(page.locator('.todo-classi')).to_have_count(0)
    expect(page.locator('.todo-classe')).to_have_count(0)
    assert page.evaluate("document.querySelectorAll('.todo-famiglia').length > 0")
    # La linguetta aperta si legge: il filo sotto, non una pastiglia piena.
    expect(page.locator('.todo-schede .selettore__voce--attiva')).to_have_count(1)
    page.screenshot(path=str(root / 'dist-tests/pendenze-compatto.png'))
    schede.nth(0).click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.classeTodoId') is None
    expect(page.locator('.todo-classi > *')).to_have_count(2)
    # Accendendo lo schermo compare la scheda Proiezione, già scelta, e la riga
    # delle azioni passa ai comandi dello schermo.
    def proiezione(aperta):
        page.evaluate("a=>{const i=prova.stato.proiezione.impostazioni; window.dispatchEvent(new MessageEvent('message',{data:{tipo:'proiezione.stato',aperta:a,impostazioni:i}}))}", aperta)
        page.evaluate('()=>new Promise(requestAnimationFrame)')

    proiezione(True)
    expect(page.locator('[data-fuoco="scheda-proiezione"]')).to_be_visible()
    assert page.evaluate('prova.stato.schedaComandi') == 'schermo'
    for id in ['proiezione.nomi', 'proiezione.misure', 'proiezione.pausa', 'proiezione.indietro',
               'proiezione.avanti', 'proiezione.blocco.consegne', 'proiezione.calendario.mese']:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)
    # La fascia non ripete i comandi: restano le sole linguette a tre stati.
    assert page.evaluate("document.querySelectorAll('.barra-proiezione button').length")         == page.evaluate("document.querySelectorAll('.barra-proiezione .blocco-proiettato').length")
    # Cambiando pagina la riga torna ai comandi della pagina, e la scheda resta.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('prova.stato.schedaComandi') == 'pagina'
    expect(page.locator('[data-fuoco="comando-proiezione.nomi"]')).to_have_count(0)
    expect(page.locator('[data-fuoco="comando-calendario.avanti"]')).to_have_count(1)
    expect(page.locator('[data-fuoco="scheda-proiezione"]')).to_be_visible()
    page.locator('[data-fuoco="scheda-proiezione"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('[data-fuoco="comando-proiezione.nomi"]')).to_have_count(1)
    # La scheda in piu' non manda la barra fuori dalla finestra stretta.
    page.set_viewport_size({'width': 560, 'height': 850})
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(root / 'dist-tests/barra-proiezione-560.png'))
    page.set_viewport_size({'width': 1440, 'height': 1000})
    # Spegnendo, la scheda se ne va con lo schermo e la riga torna alla pagina.
    proiezione(False)
    expect(page.locator('[data-fuoco="scheda-proiezione"]')).to_have_count(0)
    expect(page.locator('.barra-proiezione')).to_have_count(0)
    assert page.evaluate('prova.stato.schedaComandi') == 'pagina'
    expect(page.locator('[data-fuoco="comando-calendario.avanti"]')).to_have_count(1)
    # Le pagine del docente di classe non si spengono mai, e da un corso di una
    # classe senza fascicolo aprono quella che ce l'ha.
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='classe').every(p=>!p.impedimento)")
    page.evaluate("()=>{prova.scegliCorso(prova.stato.registro.corsi[1].id); prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.pendenze'))}")
    assert page.evaluate("prova.stato.vista") == 'docenteClasse'
    assert page.evaluate("prova.stato.registro.classi.find(c=>c.id===prova.stato.classeId).docenteDiClasse")
    # Senza nessuna docenza di classe la sezione sparisce, e torna con la spunta.
    page.evaluate("()=>{const r=structuredClone(prova.stato.registro); r.classi.forEach(c=>{c.docenteDiClasse=false}); prova.aggiorna({registro:r,vista:'calendario'})}")
    assert page.evaluate("prova.gruppiDiPagine().every(g=>g.gruppo!=='classe')")
    expect(page.get_by_role('button', name='Docente di classe')).to_have_count(0)
    page.evaluate("()=>{const r=structuredClone(prova.stato.registro); r.classi[0].docenteDiClasse=true; prova.aggiorna({registro:r,classeId:r.classi[0].id})}")
    assert page.evaluate("prova.gruppiDiPagine().some(g=>g.gruppo==='classe')")
    # «Oggi» non ha riga delle azioni (le sue tessere portano altrove):
    # l'interruttore delle azioni si prova sul calendario.
    page.evaluate("prova.vaiA(prova.PAGINE[0])")
    assert page.evaluate('prova.stato.vista') == 'oggi'
    expect(page.locator('#azioni-pagina')).to_have_count(0)
    expect(page.locator('[data-fuoco="mostra-azioni"]')).to_have_count(0)
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
    expect(page.locator('#azioni-pagina')).to_be_visible()
    page.keyboard.press('Control+Shift+b')
    expect(page.locator('#azioni-pagina')).to_be_visible()
    page.keyboard.press('Control+b')
    expect(page.locator('#azioni-pagina')).to_be_hidden()
    expect(page.get_by_role('navigation', name='Navigazione principale')).to_be_visible()
    page.keyboard.press('Control+b')
    # Finestra stretta e menu lungo: scroll interno non chiude il menu.
    for width in [1440, 900, 560]:
        page.set_viewport_size({'width': width, 'height': 850})
        page.screenshot(path=str(root / f'dist-tests/barra-{width}.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
    file.click()
    page.locator('.menu').evaluate('(m)=>m.scrollTop=m.scrollHeight')
    expect(page.locator('.menu')).to_be_visible()
    page.keyboard.press('Escape')
    # Nella colonna compatta la navigazione da tastiera conserva il focus sulla voce.
    voce_corsi = laterale.get_by_role('button', name='Corsi', exact=True)
    voce_corsi.focus()
    page.keyboard.press('Enter')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(voce_corsi).to_be_focused()
    # Su finestra stretta il pannello si apre a richiesta e si chiude scegliendo.
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    navigazione.click()
    expect(laterale).to_be_visible()
    page.screenshot(path=str(root / 'dist-tests/sidebar-560.png'))
    laterale.get_by_role('button', name='Corsi', exact=True).click()
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    expect(navigazione).to_be_focused()
    navigazione.click()
    laterale.get_by_role('button', name='Calendario', exact=True).focus()
    page.keyboard.press('Escape')
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    expect(navigazione).to_be_focused()
    # Assistente aperto su finestra stretta: la colonna della navigazione la
    # decide il telaio, resta minimizzata, e l'interruttore per espanderla sparisce.
    navigazione.click()
    expect(laterale).to_have_class('sidebar')
    page.evaluate("()=>prova.aggiorna({programma:[{chiave:'registroDocenti.assistente.attivo',valore:true,tipo:'boolean'}],assistenteAperto:true})")
    expect(page.locator('.riquadro-assistente')).to_be_visible()
    expect(navigazione).to_have_count(0)
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    assert laterale.bounding_box()['width'] < 80
    page.screenshot(path=str(root / 'dist-tests/sidebar-assistente-560.png'))
    # Chiuso il riquadro la colonna torna com'era: la scelta era solo sospesa.
    page.evaluate("()=>prova.aggiorna({assistenteAperto:false})")
    expect(navigazione).to_have_count(1)
    expect(laterale).to_have_class('sidebar')
    navigazione.click()
    page.evaluate("()=>prova.aggiorna({programma:[]})")
    page.evaluate("prova.vaiA(prova.PAGINE[0])")
    page.emulate_media(color_scheme='dark')
    page.set_viewport_size({'width': 1440, 'height': 1000})
    page.screenshot(path=str(root / 'dist-tests/navigazione-scura.png'))
    # Docente di classe: una sola navigazione e un solo comando per operazione.
    page.emulate_media(color_scheme='light')
    schede = {'pendenze': 'todo', 'documenti': 'documenti', 'assenze': 'assenze',
               'messaggistica': 'messaggistica'}
    for destinazione, comando in [('pendenze', 'Nuova pendenza'), ('documenti', 'Chiedi un documento'),
                                  ('assenze', 'Nuovo periodo'), ('messaggistica', 'Nuova comunicazione')]:
        page.evaluate("id => prova.vaiA(prova.PAGINE.find(p => p.id === 'pagina.classe.' + id))", destinazione)
        page.evaluate('()=>new Promise(requestAnimationFrame)')
        expect(page.locator('#azioni-pagina').get_by_role('button', name=comando, exact=True)).to_have_count(1)
        expect(page.locator('main').get_by_role('button', name=comando, exact=True)).to_have_count(0)
        # Quanti comandi ha la scheda lo dice l'elenco dei comandi, non un numero
        # scritto qui.
        attesi = page.evaluate(
            "scheda => prova.COMANDI_UI.filter(c => c.id.startsWith('docente.')"
            " && c.dove.includes('docenteClasse')"
            " && (!c.schedaDocente || c.schedaDocente === scheda)).length",
            schede[destinazione])
        expect(page.locator('[data-fuoco^="comando-docente."]')).to_have_count(attesi)
        expect(page.locator('#azioni-pagina').get_by_role('button', name='Elenco della classe', exact=True)).to_be_visible()
        expect(page.locator('[data-fuoco="comando-classe.nuovoAllievo"]')).to_have_count(0)
        expect(page.locator('[data-fuoco="comando-classe.incollaElenco"]')).to_have_count(0)
        expect(page.locator('.docente-classe > .selettore')).to_have_count(0)
        page.screenshot(path=str(root / f'dist-tests/docente-{destinazione}.png'))
    # Archivio documentale: una scansione si guarda nella cornice della pagina,
    # non nel lettore del sistema. La cornice vive fuori dalla vista: si prova qui
    # che un ridisegno non la porti via.
    registro_prima = page.evaluate('structuredClone(prova.stato.registro)')
    page.evaluate("""() => {
      const r = structuredClone(prova.stato.registro)
      const classe = r.classi.find(c => c.id === prova.stato.classeId)
      classe.allievi = [{ id: 'alv-p', cognome: 'Rossi', nome: 'Maria', attivo: true }]
      const corso = r.corsi.find(c => c.classeId === classe.id)
      r.consegne = [...r.consegne, {
        id: 'con-arch', corsoId: corso.id, testo: 'Pagella', tipo: 'consegna',
        documento: 'modulo', a: 'classe', allieviIds: [], data: '2026-09-02',
        dataLezioneId: null, scadenza: null, scadenzaLezioneId: null, note: '',
        fatte: [{ chi: 'alv-p', fattaIl: '2026-09-20T08:00:00.000Z', modo: 'mano' }],
        documenti: [{ allievoId: 'alv-p', file: 'archivio/pagella.pdf', nome: 'pagella.pdf',
                      aggiuntoIl: '2026-09-20T08:00:00.000Z' }],
        mailAllievo: true, mailTutore: true,
        creataIl: '2026-09-01T08:00:00.000Z', aggiornataIl: '2026-09-01T08:00:00.000Z',
      }]
      prova.aggiorna({ registro: r, schedaDocente: 'documenti', semestreId: null,
        archiviati: [{ percorso: 'archivio/pagella.pdf', misura: 12345, revisione: 0 }],
        radiceDati: 'https://esempio.invalido/dati' })
    }""")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # A cornice chiusa la matrice prende tutta la larghezza: una colonna sola.
    expect(page.locator('.archivio--con-foglio')).to_have_count(0)
    # La casella piena è l'unico elenco dei fogli raccolti, e premendola si apre
    # il documento: nessun secondo riquadro che li ripeta.
    expect(page.locator('.cella-documento--file')).to_have_count(1)
    page.locator('.cella-documento--file').first.click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(1)
    expect(page.locator('.archivio__titolo')).to_have_text('Rossi Maria')
    # La casella della matrice si accende: si vede da dove si era partiti.
    expect(page.locator('.cella-documento--aperta')).to_have_count(1)
    # Il telaio del lettore non sta nella vista: un ridisegno non lo porta via.
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.cornice-posto')).to_have_count(1)
    assert page.evaluate("document.querySelectorAll('.cornice-fissa__telaio').length") == 1
    page.screenshot(path=str(root / 'dist-tests/archivio-documentale.png'))
    page.locator('.archivio__testa').get_by_title('Torna alla matrice a schermo intero').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(0)
    assert page.evaluate('prova.stato.anteprimaArchivio') is None
    # Caricare un PDF non chiede niente: il documento lo dice la casella su cui si
    # lasciano cadere le pagine. Quel che parte porta la classe, o una scansione
    # muta finirebbe in quarantena senza classe.
    page.evaluate('richieste.length = 0')
    page.locator('[data-fuoco="comando-docente.caricaPdf"]').first.click()
    expect(page.locator('.modale')).to_have_count(0)
    caricamento = page.evaluate(
        "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.carica')")
    assert caricamento, page.evaluate('richieste.map(r => r.azione && r.azione.tipo)')
    assert caricamento[0]['consegnaId'] is None, caricamento[0]
    assert caricamento[0]['classeId'] == page.evaluate('prova.stato.classeId'), caricamento[0]
    page.evaluate('registro=>prova.aggiorna({registro})', registro_prima)

    # Nuovo periodo: due date e basta. Il nome lo ricava chi salva dal semestre,
    # e le date partono dal semestre di oggi.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('[data-fuoco="comando-docente.assenze"]').first.click()
    expect(page.locator('.modale')).to_have_count(1)
    modale = page.locator('.modale')
    expect(modale.locator('[name="etichetta"]')).to_have_count(0)
    # Due campi data veri, col calendario del sistema: la data si guarda, non si
    # sa a memoria.
    date = modale.locator('input[type="date"]')
    expect(date).to_have_count(2)
    dal = date.nth(0)
    al = date.nth(1)
    # Partono dal semestre di oggi, e non sono mai lo stesso giorno.
    assert dal.input_value() != '', 'la data di inizio parte vuota'
    assert dal.input_value() != al.input_value(), (dal.input_value(), al.input_value())
    # Il calendario è chiuso dentro l'anno scolastico: fuori non si sceglie.
    anno = page.evaluate("()=>{const a=prova.stato.registro.anni[0]; return [a.inizio, a.fine]}")
    for campo_data in (dal, al):
        assert campo_data.get_attribute('min') == anno[0], campo_data.get_attribute('min')
        assert campo_data.get_attribute('max') == anno[1], campo_data.get_attribute('max')
        assert campo_data.input_value() >= anno[0] and campo_data.input_value() <= anno[1]
    page.screenshot(path=str(root / 'dist-tests/assenze-nuovo-periodo.png'))
    modale.get_by_role('button', name='Annulla', exact=True).click()
    expect(page.locator('.modale')).to_have_count(0)

    # Assenze: un rapporto caricato si guarda nella cornice della pagina, con lo
    # stesso telaio dell'archivio documentale, senza aprire il lettore di sistema
    # per ogni foglio.
    page.evaluate("""() => {
      const r = structuredClone(prova.stato.registro)
      const classe = r.classi.find(c => c.id === prova.stato.classeId)
      classe.allievi = [{ id: 'alv-p', cognome: 'Rossi', nome: 'Maria', attivo: true }]
      r.fascicoli = [{
        id: 'fas-ass', classeId: classe.id, recapiti: [], documenti: [], comunicazioni: [],
        assenze: [{
          id: 'blo-ass', etichetta: '1° semestre', dal: '2026-09-01', al: '2027-01-31',
          oggetto: 'Assenze', corpo: 'Testo', aAllievo: false, aTutore: false,
          recapitiIds: [], note: '',
          righe: [{ allievoId: 'alv-p', invio: null, fogli: [{
            tipo: 'assenze', firmato: false, file: 'archivio/assenze.pdf',
            nome: 'assenze.pdf', aggiuntoIl: '2026-09-20T08:00:00.000Z' }] }],
          creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z',
        }],
        creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z',
      }]
      prova.aggiorna({ registro: r, schedaDocente: 'assenze', semestreId: null,
        bloccoAssenzeId: 'blo-ass',
        archiviati: [{ percorso: 'archivio/assenze.pdf', misura: 4321, revisione: 0 }],
        radiceDati: 'https://esempio.invalido/dati' })
    }""")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # A cornice chiusa la matrice prende tutta la larghezza.
    expect(page.locator('.archivio--con-foglio')).to_have_count(0)
    casella = page.locator('.tabella--assenze .cella-documento--consegnato')
    expect(casella).to_have_count(1)
    casella.first.click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(1)
    expect(page.locator('.archivio__titolo')).to_have_text('Rossi Maria')
    # Di chi è e che foglio è: due rapporti della stessa persona si somigliano.
    expect(page.locator('.archivio__testa .pastiglia')).to_have_text('assenze')
    expect(page.locator('.archivio__conto')).to_have_text('1 di 1')
    # La casella della matrice si accende: si vede da dove si era partiti.
    expect(page.locator('.cella-documento--aperta')).to_have_count(1)
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.cornice-posto')).to_have_count(1)
    page.screenshot(path=str(root / 'dist-tests/docente-assenze-cornice.png'))
    # Cambiando periodo la cornice si chiude: il foglio era di quel periodo.
    page.evaluate("prova.aggiorna({ bloccoAssenzeId: 'altro' })")
    assert page.evaluate('prova.stato.anteprimaAssenze') is None
    page.evaluate("prova.aggiorna({ bloccoAssenzeId: 'blo-ass' })")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('.tabella--assenze .cella-documento--consegnato').first.click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('.archivio__testa').get_by_title('Torna alla matrice a schermo intero').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(0)
    assert page.evaluate('prova.stato.anteprimaAssenze') is None
    page.evaluate('registro=>prova.aggiorna({registro, schedaDocente: "todo"})', registro_prima)

    # La pendenza non deve ricadere sul corso di un'altra classe.
    page.evaluate("()=>{const r=structuredClone(prova.stato.registro); r.corsi=r.corsi.filter(c=>c.classeId!==prova.stato.classeId); prova.aggiorna({registro:r,schedaDocente:'todo'})}")
    expect(page.locator('[data-fuoco="comando-docente.pendenza"]')).to_be_disabled()
    page.evaluate('registro=>prova.aggiorna({registro})', registro_prima)
    # Il fascicolo: senza spunte il comando è spento, con due chiede il nome e
    # manda i percorsi nell'ordine della pagina.
    page.evaluate("()=>{const c=prova.stato.registro.corsi[0];"
                  " prova.aggiorna({vista:'documenti',paginaId:null,schedaDocumenti:'corso',"
                  " corsoId:c.id,filtroClasseId:c.classeId,documentiScelti:[],anteprima:null})}")
    combina = page.locator('[data-fuoco="comando-documenti.combina"]')
    expect(combina).to_be_disabled()
    # Le caselle delle righe, cliccate davvero: sono l'unico modo di accendere
    # «Combina».
    percorsi = page.evaluate("""()=>{const r=prova.stato.registro, c=r.corsi[0];
      return ['presenze','valutazioni'].map(g=>{const d=prova.collocazioneDi(r,g,c.id,{semestreId:null});
        return d?prova.percorsoDi(d):null}).filter(Boolean)}""")
    assert len(percorsi) == 2, percorsi
    page.evaluate('p=>prova.aggiorna({esportati:p.map(percorso=>({percorso,misura:10,revisione:0}))})', percorsi)
    caselle = page.locator('.documenti__spunta:not(.documenti__spunta--vuota)')
    # La prima casella è quella in testa alla scheda, che le spunta tutte.
    expect(caselle).to_have_count(3)
    # Spuntate dal basso: l'ordine nel fascicolo è quello della pagina, non quello
    # dei clic.
    caselle.nth(2).click()
    expect(combina).to_be_disabled()
    caselle.nth(1).click()
    expect(combina).to_be_enabled()
    assert page.evaluate('prova.stato.documentiScelti') == [percorsi[1], percorsi[0]]
    combina.click()
    # La modale mostra l'elenco in quell'ordine, prima di comporre.
    assert page.locator('.composizione__ordine li').count() == 2
    assert 'presenze' in page.locator('.composizione__ordine li').first.inner_text().lower()
    page.get_by_role('textbox', name='Nome della composizione').fill('Ordine di pagina')
    page.locator('.modale').get_by_role('button', name='Combina', exact=True).click()
    page.wait_for_timeout(100)
    assert page.evaluate("richieste.find(m=>m.azione?.tipo==='composizione.crea'"
                         " && m.azione.nome==='Ordine di pagina').azione.percorsi") == percorsi
    # E la casella in testa toglie tutto in un gesto solo.
    page.evaluate('p=>prova.aggiorna({documentiScelti:p})', percorsi)
    caselle.nth(0).click()
    assert page.evaluate('prova.stato.documentiScelti') == []
    expect(combina).to_be_disabled()
    page.evaluate('prova.aggiorna({documentiScelti:[],esportati:[]})')
    # Le spunte valgono per quel che sta nella cartella: un percorso buttato via non
    # conta. Questi due non sono righe disegnate, e restano nell'ordine di scelta.
    page.evaluate("prova.aggiorna({documentiScelti:['esportazioni/b.pdf','esportazioni/a.pdf'],"
                  " esportati:[{percorso:'esportazioni/a.pdf',misura:10,revisione:0},"
                  " {percorso:'esportazioni/b.pdf',misura:10,revisione:0}]})")
    expect(combina).to_be_enabled()
    expect(page.locator('[data-fuoco="comando-documenti.svuotaScelta"]')).to_be_enabled()
    combina.click()
    page.get_by_role('textbox', name='Nome della composizione').fill('Consiglio di classe')
    page.locator('.modale').get_by_role('button', name='Combina', exact=True).click()
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='composizione.crea'"
                         " && m.azione.nome==='Consiglio di classe'"
                         " && m.azione.percorsi[0]==='esportazioni/b.pdf')")
    page.screenshot(path=str(root / 'dist-tests/documenti-fascicolo.png'))
    # Il riquadro dei fascicoli compare solo quando ce n'è uno, e la riga offre di
    # rifarlo.
    page.evaluate("prova.aggiorna({documentiScelti:[],composizioni:[{id:'fas-1',nome:'Consiglio di classe',"
                  "percorsi:['esportazioni/a.pdf','esportazioni/b.pdf'],creataIl:'',aggiornataIl:''}]})")
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_be_visible()
    # Il PDF non c'è ancora: il pulsante dice «Fa», non «Rifà».
    page.get_by_title('Fa la composizione «Consiglio di classe» e mostra il foglio qui accanto').click()
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='composizione.aggiorna' && m.azione.id==='fas-1')")
    # Il cestino del fascicolo chiede conferma e butta ricetta e PDF con
    # `composizione.elimina`: un'eliminazione qualunque lascerebbe la ricetta a
    # nominare un file che non c'è. Il gesto compare col puntatore sopra la riga.
    page.evaluate("pdf=>prova.aggiorna({esportati:[{percorso:pdf,misura:1234,revisione:0}]})",
                  'esportazioni/composizioni/Consiglio di classe.pdf')
    riga = page.locator('.documenti__riga').filter(has_text='Consiglio di classe').first
    riga.hover()
    page.get_by_title('Butta via la composizione «Consiglio di classe» dalla cartella').click()
    page.locator('.modale').get_by_role('button', name='Butta via', exact=True).click()
    page.wait_for_timeout(100)
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='composizione.elimina' && m.azione.id==='fas-1')")
    assert not page.evaluate("richieste.some(m=>m.azione?.tipo==='esportazione.elimina')")
    # La riga se ne va subito, senza aspettare lo stato dall'host: altrimenti si
    # leggerebbe «non ha funzionato».
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_have_count(0)
    assert page.evaluate('prova.stato.composizioni') == []
    page.evaluate("prova.aggiorna({esportati:[]})")
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_have_count(0)
    # Un CSV si guarda nella cornice come tabella: la prima riga del file (il
    # titolo dell'esportazione) va sopra, i numeri a destra.
    corpo = '\r\n'.join(['﻿DIC4a — Presenze', '', 'Persona;UD;Assenze %',
                         'Rossi Mario;24;12%', '"Bianchi; Anna";24;0%', ''])
    page.route('**/*.csv*', lambda rotta: rotta.fulfill(
        status=200, content_type='text/csv; charset=utf-8', body=corpo))
    csv = page.evaluate("""()=>{const r=prova.stato.registro, c=r.corsi[0];
      const d=prova.collocazioneDi(r,'presenze',c.id,{semestreId:prova.stato.semestreId});
      return prova.percorsoDi(d,'csv')}""")
    page.evaluate("p=>prova.aggiorna({radiceDati:'https://esempio.invalid/dati',"
                  " esportati:[{percorso:p,misura:120,revisione:0}],anteprima:p})", csv)
    tabella = page.locator('.documenti__csv .tabella--csv')
    expect(tabella).to_be_visible(timeout=5000)
    expect(page.locator('.documenti__csv-titolo')).to_have_text('DIC4a — Presenze')
    expect(tabella.locator('thead th')).to_have_text(['Persona', 'UD', 'Assenze %'])
    # Il punto e virgola fra virgolette non spezza la cella.
    expect(tabella.locator('tbody tr').nth(1).locator('td')).to_have_text(['Bianchi; Anna', '24', '0%'])
    expect(tabella.locator('tbody tr').first.locator('td').nth(1)).to_have_class('tabella__numero')
    # Un CSV non va in una composizione: niente casella, e quella in testa non lo
    # spunta.
    assert page.evaluate("()=>[...document.querySelectorAll('.documenti__spunta:not("
                         ".documenti__spunta--vuota)')].length") == 0
    page.evaluate("prova.aggiorna({anteprima:null,esportati:[],radiceDati:null})")
    # Un PDF in esportazioni/composizioni senza elenco compare lo stesso (se no non
    # si potrebbe togliere), dice che cos'è, e il pulsante per rifarlo è spento.
    page.evaluate("pdf=>prova.aggiorna({composizioni:[],esportati:[{percorso:pdf,misura:999,revisione:0}]})",
                  'esportazioni/composizioni/Vecchio pacchetto.pdf')
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_be_visible()
    orfano = page.locator('.documenti__riga').filter(has_text='Vecchio pacchetto').first
    expect(orfano.get_by_text('senza elenco')).to_be_visible()
    expect(orfano.get_by_title('Questo PDF non ha più l’elenco di che cosa ci sta dentro: '
                               'non si può rifare, si guarda e si butta via.')).to_be_disabled()
    orfano.hover()
    page.get_by_title('Butta via il PDF «Vecchio pacchetto» dalla cartella').click()
    page.locator('.modale').get_by_role('button', name='Butta via', exact=True).click()
    page.wait_for_timeout(100)
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='esportazione.elimina'"
                         " && m.azione.percorso==='esportazioni/composizioni/Vecchio pacchetto.pdf')")
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_have_count(0)
    # La casella «Cerca su Hugging Face» si scrive mentre la pagina si ridisegna
    # (quattro volte al secondo durante uno scarico): `data-fuoco` tiene il fuoco
    # e le lettere. Il vecchio indirizzo porta alle impostazioni del programma.
    page.evaluate("prova.aggiorna({vista:'modelliLinguistici'})")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # Senza risposta dall'host la pagina resta in attesa, senza casella: si
    # risponde come il guscio.
    page.evaluate('''() => {
      const spento = { attivo: false, modello: '', pronto: false, motivo: '' }
      for (const m of tutte.filter(r => r.procedura === 'llm.modelli')) {
        window.dispatchEvent(new MessageEvent('message', { data: {
          tipo: 'riscontro', id: m.id, ok: true,
          dati: { cartella: 'C:/esempio/modelli', modelli: [], assistente: spento, ocr: spento },
        } }))
      }
    }''')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    casella = 'input[type="search"][aria-label="Cerca un modello su Hugging Face"]'
    expect(page.locator(casella)).to_have_count(1)
    page.locator(casella).click()
    page.keyboard.type('qwen')
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator(casella)).to_be_focused()
    expect(page.locator(casella)).to_have_value('qwen')
    # Si continua a battere senza riprendere il campo, mentre i ridisegni arrivano.
    page.keyboard.type('-vl')
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator(casella)).to_have_value('qwen-vl')
    page.screenshot(path=str(root / 'dist-tests/modelli-linguistici.png'))

    # Nessun corso e corso senza lezioni non lasciano una vista incoerente.
    page.evaluate("()=>{prova.aggiorna({vista:'lezione'}); prova.stato.registro.lezioni=[]; prova.scegliCorso(prova.stato.registro.corsi[0].id)}")
    assert page.evaluate('prova.stato.vista') == 'piani'
    page.evaluate("prova.aggiorna({registro:prova.registroVuoto(),vista:'calendario'})")
    expect(page.get_by_role('navigation', name='Navigazione principale')).to_be_visible()
    assert not errors, errors
    browser.close()
print('OK: pagine, contesto, comandi e filtri di calendario e pendenze, scheda della proiezione, tendine corso/classe (anche quando il filtro punta a un corso sparito), sezione docente, file recenti, tastiera, azioni nascoste, responsive, casella di ricerca dei modelli che regge i ridisegni, registro vuoto; nessun errore JS')
