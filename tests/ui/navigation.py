"""Regressioni UI su Chromium senza avviare Electron o toccare dati reali.
Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: python tests/ui/navigation.py
"""
from pathlib import Path
import re
import subprocess
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
subprocess.run(['node', '-e', "require('esbuild').buildSync({entryPoints:['tests/ui/startup.ts'],bundle:true,outfile:'dist-tests/ui.js',platform:'browser',format:'iife'})"], cwd=root, check=True)
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
    expect(laterale.locator('button')).to_have_count(page.evaluate('prova.PAGINE.length'))
    expect(laterale.locator('[aria-current="page"]')).to_have_count(1)
    # Corsi e Classi stanno sotto «Il programma», non in Gestione.
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='gestione').map(p=>p.id)")         == ['pagina.calendario', 'pagina.pendenze', 'pagina.daSmistare', 'pagina.persone', 'pagina.mappa']
    assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='sistema').map(p=>p.id)")         == ['pagina.corsi', 'pagina.classi', 'pagina.modelli', 'pagina.modelliLinguistici', 'pagina.impostazioni', 'pagina.guida']
    # Un aggiornamento dei dati non deve riportare in cima la sidebar scorsa.
    page.set_viewport_size({'width': 1440, 'height': 500})
    navigazione.focus()
    laterale.evaluate('(el) => el.scrollTop = el.scrollHeight')
    scorrimento = laterale.evaluate('(el) => el.scrollTop')
    assert scorrimento > 0
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
    # Il ridisegno della sidebar e' differito di un frame: aprire il menu prima
    # che sia arrivato vorrebbe dire trovarselo chiuso dal ridisegno stesso.
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
    # Il file recente invia il percorso e lascia la pagina corrente.
    file.click(); page.get_by_role('menuitem', name='★ 2025-2026').click()
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='documento.apri' && m.azione.percorso==='C:/esempio/2025-2026.registro')")
    # La scelta del corso nel registro cambia davvero la lezione aperta.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))")
    select = page.locator('[data-fuoco="barra-comandi-corso"]')
    select.select_option(page.evaluate('prova.stato.registro.corsi[1].id'))
    page.wait_for_function('prova.stato.registro.lezioni.find(l=>l.id===prova.stato.lezioneId).corsoId===prova.stato.corsoId')
    expect(select).to_have_value(page.evaluate('prova.stato.corsoId'))
    # Il registro della lezione non ha una seconda tendina del corso: quella e'
    # nella barra. I gesti dell'ora sono comandi della pagina, non pulsanti in
    # testata.
    assert page.evaluate("document.querySelectorAll('.navigatore-registro select').length") == 1
    assert page.evaluate("document.querySelectorAll('.vista--lezione .testata button').length") == 0
    for id in ['lezione.stato.pianificata', 'lezione.stato.svolta',
               'lezione.stato.annullata', 'lezione.modifica']:
        expect(page.locator(f'[data-fuoco="comando-{id}"]')).to_have_count(1)
    # Le esportazioni stanno tutte in Documenti: nessun comando le porta altrove.
    assert page.evaluate(
        "prova.COMANDI_UI.filter(c=>/^(corso\.esporta|corso\.verbale|lezione\.calendario|corso\.nuovaOra)/.test(c.id))"
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
    expect(page.get_by_role('button', name='Oggi', exact=True)).to_have_count(1)
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
    # L'orologio di chi guarda, non quello di Greenwich: `oggi()` in
    # `dominio/date.ts` legge `getFullYear/getMonth/getDate`, cioè la data
    # locale. Con `toISOString()` questa riga confrontava la data locale con
    # quella UTC, e fra mezzanotte e le due — ora legale dell'Europa centrale —
    # le due non sono lo stesso giorno: la prova cadeva per un fuso orario.
    oggi = page.evaluate(
        "(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');"
        "return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()")
    assert page.evaluate('prova.stato.data') == oggi
    page.locator('[data-fuoco="comando-calendario.settimana"]').click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # La striscia delle settimane segna un confine solo: la fine del semestre
    # che ne ha un altro dopo. La fine dell'ultimo è la fine dell'anno, cioè il
    # bordo della striscia, e l'inizio del semestre dopo è la stessa riga detta
    # due volte.
    expect(page.locator('.striscia-settimane')).to_have_count(1)
    expect(page.locator('.striscia-settimane__voce--apre-semestre')).to_have_count(0)
    confini = page.locator('.striscia-settimane__voce--chiude-semestre')
    semestri = page.evaluate('()=>prova.stato.registro.anni[0].semestri.length')
    expect(confini).to_have_count(semestri - 1)
    # E cade sulla settimana in cui il semestre finisce davvero: il titolo dice
    # da che giorno a che giorno va, e la fine del semestre ci sta dentro.
    fine = page.evaluate('()=>prova.stato.registro.anni[0].semestri[0].fine')
    titolo = confini.first.get_attribute('title')
    assert 'finisce il' in titolo, titolo
    estremi = re.findall(r'\d{2}\.\d{2}\.\d{4}', titolo)

    def iso(scritta):
        g, m, a = scritta.split('.')
        return f'{a}-{m}-{g}'

    assert iso(estremi[0]) <= fine <= iso(estremi[1]), (titolo, fine)
    # Il filtro per corso del calendario sta nella barra ed è indipendente da
    # quello del registro: scrivono in due campi diversi, e non si toccano.
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
    # Un filtro rimasto puntato su un corso che nel documento aperto non c'e'
    # — succede aprendo un altro anno, perche' quel campo e' ricordato — non
    # deve accendere la prima voce. Appoggiandosi al solo `selected` sulle
    # option nessuna lo portava, il browser accendeva «Tutti i corsi», e da li'
    # non si usciva piu': riscegliere quella voce non cambia il `value` e
    # nessun `change` parte. Meglio in bianco, che e' la verita'.
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
    # E un corso che c'e' si accende davvero: `h` applica il `value` di una
    # tendina dopo averle appeso le option, altrimenti non attecchirebbe.
    page.evaluate('prova.aggiorna({filtroCorsoAgendaId:prova.stato.registro.corsi[1].id})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        assert page.locator(f'[data-fuoco="{fuoco}"]').input_value()             == page.evaluate('prova.stato.filtroCorsoAgendaId'), fuoco
    page.evaluate('prova.aggiorna({filtroCorsoAgendaId:null})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    for fuoco in ['barra-comandi-corso-agenda', 'barra-stato-corso']:
        assert page.locator(f'[data-fuoco="{fuoco}"]').evaluate('(e) => e.selectedIndex') == 0, fuoco
    page.screenshot(path=str(root / 'dist-tests/calendario-compatto.png'))
    # Pendenze: i tre filtri sono comandi della pagina, non un selettore nella
    # testata, e l'acceso si legge sul pulsante.
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
    # Il riepilogo e' compatto: una riga per famiglia, senza la frase di
    # spiegazione, che resta nel titolo.
    # Una scheda per tipologia, quante ne dichiara il dominio: un numero fisso
    # qui dentro diventa falso il giorno in cui se ne aggiunge una.
    expect(page.locator('.todo-sintesi__scheda')).to_have_count(
        page.evaluate('prova.FAMIGLIE_TODO.length'))
    assert page.evaluate("document.querySelector('.todo-sintesi__scheda').getBoundingClientRect().height < 64")
    assert page.evaluate("!!document.querySelector('.todo-sintesi__scheda').title")
    # Una linguetta per classe con lavoro, piu' «Tutte», e ognuna filtra.
    schede = page.locator('.todo-schede .selettore__voce')
    expect(schede).to_have_count(3)
    expect(page.locator('.todo-classi > *')).to_have_count(2)
    # Con una linguetta aperta il riquadro della classe sparisce: il nome sta
    # gia' sulla linguetta, e restano le quattro famiglie nude.
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
    # Accendendo lo schermo compare la scheda Proiezione, gia' scelta, e la riga
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
    # classe senza fascicolo aprono comunque quella che ce l'ha.
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
    page.evaluate("prova.vaiA(prova.PAGINE[0])")
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
    # Riquadro dell'assistente aperto su finestra stretta: la colonna della
    # navigazione la decide il telaio, torna minimizzata anche se era aperta, e
    # l'interruttore che prometteva di espanderla sparisce invece di restare
    # lì a non allargare niente.
    navigazione.click()
    expect(laterale).to_have_class('sidebar')
    page.evaluate("()=>prova.aggiorna({programma:[{chiave:'registroDocenti.assistente.attivo',valore:true,tipo:'boolean'}],assistenteAperto:true})")
    expect(page.locator('.riquadro-assistente')).to_be_visible()
    expect(navigazione).to_have_count(0)
    expect(laterale).to_have_class('sidebar sidebar--compatta')
    assert laterale.bounding_box()['width'] < 80
    page.screenshot(path=str(root / 'dist-tests/sidebar-assistente-560.png'))
    # Chiuso il riquadro la colonna torna a chi lavora: la scelta di prima era
    # solo sospesa, non buttata via.
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
        # Quanti comandi ha quella scheda lo dice l'elenco dei comandi, non un
        # numero scritto qui: aggiungendone uno la prova non deve cadere.
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
    # Archivio documentale: una scansione raccolta si guarda nella cornice
    # della pagina, e non nel lettore del sistema. È il gesto che regge tutta
    # la pagina — dopo «chi ha portato» viene «che cosa ha portato» — e la
    # prova sta qui perché la cornice vive fuori dalla vista: un ridisegno che
    # la portasse via non si vedrebbe da nessun'altra parte.
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
    # La casella piena è l'unico elenco dei fogli raccolti che la pagina ha, e
    # premendola si apre il documento: non c'è un secondo riquadro che li
    # ripeta in colonna, e non ci deve tornare.
    expect(page.locator('.cella-documento--file')).to_have_count(1)
    page.locator('.cella-documento--file').first.click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(1)
    expect(page.locator('.archivio__titolo')).to_have_text('Rossi Maria')
    # La casella della matrice si accende: è lo stesso foglio, visto dall'altro
    # elenco, e senza quel segno non si sa più da dove si era partiti.
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
    # Caricare un PDF non chiede niente: il documento lo dice la casella su cui
    # si lasciano cadere le pagine, e il taglio si corregge guardandole. Quel
    # che parte porta la classe da cui il file entra — senza, una scansione muta
    # finirebbe in quarantena senza classe, cioè in nessun archivio.
    page.evaluate('richieste.length = 0')
    page.locator('[data-fuoco="comando-docente.caricaPdf"]').first.click()
    expect(page.locator('.modale')).to_have_count(0)
    caricamento = page.evaluate(
        "richieste.map(r => r.azione).filter(a => a && a.tipo === 'smistamento.carica')")
    assert caricamento, page.evaluate('richieste.map(r => r.azione && r.azione.tipo)')
    assert caricamento[0]['consegnaId'] is None, caricamento[0]
    assert caricamento[0]['classeId'] == page.evaluate('prova.stato.classeId'), caricamento[0]
    page.evaluate('registro=>prova.aggiorna({registro})', registro_prima)

    # Nuovo periodo: due date e nient'altro. Il nome del periodo non si chiede
    # — lo ricava chi salva dal semestre in cui le date cadono — e le date
    # partono dal semestre di oggi, non da «oggi–oggi».
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    page.locator('[data-fuoco="comando-docente.assenze"]').first.click()
    expect(page.locator('.modale')).to_have_count(1)
    modale = page.locator('.modale')
    expect(modale.locator('[name="etichetta"]')).to_have_count(0)
    # Due campi data veri, con il calendario del sistema: qui la data non si sa
    # a memoria, si guarda — «fin dove arriva il primo semestre» — e il campo
    # scritto costringerebbe a cercarla altrove.
    date = modale.locator('input[type="date"]')
    expect(date).to_have_count(2)
    dal = date.nth(0)
    al = date.nth(1)
    # Partono dal semestre di oggi, e non sono mai lo stesso giorno: un rapporto
    # di assenze lungo un giorno non esiste.
    assert dal.input_value() != '', 'la data di inizio parte vuota'
    assert dal.input_value() != al.input_value(), (dal.input_value(), al.input_value())
    # E il calendario si apre già chiuso dentro l'anno scolastico: le date fuori
    # non si possono nemmeno prendere.
    anno = page.evaluate("()=>{const a=prova.stato.registro.anni[0]; return [a.inizio, a.fine]}")
    for campo_data in (dal, al):
        assert campo_data.get_attribute('min') == anno[0], campo_data.get_attribute('min')
        assert campo_data.get_attribute('max') == anno[1], campo_data.get_attribute('max')
        assert campo_data.input_value() >= anno[0] and campo_data.input_value() <= anno[1]
    page.screenshot(path=str(root / 'dist-tests/assenze-nuovo-periodo.png'))
    modale.get_by_role('button', name='Annulla', exact=True).click()
    expect(page.locator('.modale')).to_have_count(0)

    # Assenze: un rapporto caricato si guarda nella cornice della pagina, con lo
    # stesso telaio dell'archivio documentale. È lo stesso lavoro — controllare
    # una cartella di scansioni prima di mandarla fuori — e prima costava una
    # finestra del lettore di sistema per foglio, cioè venticinque finestre da
    # ritrovare nella barra delle applicazioni.
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
    # A cornice chiusa la matrice prende tutta la larghezza: cinque colonne per
    # venticinque nomi, e mezzo schermo lasciato a un riquadro vuoto sarebbe
    # pagato tutti i giorni.
    expect(page.locator('.archivio--con-foglio')).to_have_count(0)
    casella = page.locator('.tabella--assenze .cella-documento--consegnato')
    expect(casella).to_have_count(1)
    casella.first.click()
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.archivio--con-foglio')).to_have_count(1)
    expect(page.locator('.archivio__titolo')).to_have_text('Rossi Maria')
    # Di chi è e che foglio è: due rapporti della stessa persona si somigliano
    # fin quasi alla firma in fondo, ed è quella che si sta cercando.
    expect(page.locator('.archivio__testa .pastiglia')).to_have_text('assenze')
    expect(page.locator('.archivio__conto')).to_have_text('1 di 1')
    # La casella della matrice si accende: senza quel segno non si sa più da
    # dove si era partiti.
    expect(page.locator('.cella-documento--aperta')).to_have_count(1)
    page.evaluate('prova.aggiorna({})')
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    expect(page.locator('.cornice-posto')).to_have_count(1)
    page.screenshot(path=str(root / 'dist-tests/docente-assenze-cornice.png'))
    # Cambiando periodo la cornice si chiude: il foglio aperto era di *quel*
    # periodo, e le frecce scorrono i suoi.
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
    # manda i percorsi nell'ordine in cui sono stati scelti.
    page.evaluate("()=>{const c=prova.stato.registro.corsi[0];"
                  " prova.aggiorna({vista:'documenti',paginaId:null,schedaDocumenti:'corso',"
                  " corsoId:c.id,filtroClasseId:c.classeId,documentiScelti:[],anteprima:null})}")
    combina = page.locator('[data-fuoco="comando-documenti.combina"]')
    expect(combina).to_be_disabled()
    # Le caselle delle righe, cliccate come le clicca chi consegna: sono l'unico
    # modo di accendere «Combina», e una prova che scrive `documentiScelti` a
    # mano non direbbe niente di quel gesto.
    percorsi = page.evaluate("""()=>{const r=prova.stato.registro, c=r.corsi[0];
      return ['presenze','valutazioni'].map(g=>{const d=prova.collocazioneDi(r,g,c.id,{semestreId:null});
        return d?prova.percorsoDi(d):null}).filter(Boolean)}""")
    assert len(percorsi) == 2, percorsi
    page.evaluate('p=>prova.aggiorna({esportati:p.map(percorso=>({percorso,misura:10,revisione:0}))})', percorsi)
    caselle = page.locator('.documenti__spunta:not(.documenti__spunta--vuota)')
    # La prima è quella in testa alla scheda, che le spunta tutte: le righe
    # vengono dopo.
    expect(caselle).to_have_count(3)
    # Spuntate al contrario, dal basso: l'ordine dentro il fascicolo è quello
    # della pagina, non quello dei clic. È la differenza fra consegnare le
    # schede in ordine alfabetico e consegnarle nell'ordine in cui la mano è
    # passata sulle caselle.
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
    # Le spunte valgono per quel che sta davvero nella cartella: un percorso
    # spuntato e poi buttato via non deve gonfiare il conto del comando. Questi
    # due non sono righe disegnate: di loro la pagina non sa l'ordine, e
    # restano in quello in cui sono stati scelti.
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
    # Il riquadro dei fascicoli compare solo quando ce n'è uno, e la sua riga
    # offre di rifarlo: è la ragione per cui la ricetta esiste.
    page.evaluate("prova.aggiorna({documentiScelti:[],composizioni:[{id:'fas-1',nome:'Consiglio di classe',"
                  "percorsi:['esportazioni/a.pdf','esportazioni/b.pdf'],creataIl:'',aggiornataIl:''}]})")
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_be_visible()
    # Il PDF non c'è ancora — nessuno lo ha composto in questa prova — e il
    # pulsante lo dice: «Fa», non «Rifà».
    page.get_by_title('Fa la composizione «Consiglio di classe» e mostra il foglio qui accanto').click()
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='composizione.aggiorna' && m.azione.id==='fas-1')")
    # Il cestino del fascicolo: chiede conferma e butta via tutto e due — la
    # ricetta e il PDF — con `composizione.elimina` e non con l'eliminazione di
    # un documento qualunque, che lascerebbe la ricetta a nominare un file che
    # non c'è. Il gesto si vede solo con la riga sotto il puntatore: passarci
    # sopra fa parte della prova, perché è quel che fa la mano.
    page.evaluate("pdf=>prova.aggiorna({esportati:[{percorso:pdf,misura:1234,revisione:0}]})",
                  'esportazioni/composizioni/Consiglio di classe.pdf')
    riga = page.locator('.documenti__riga').filter(has_text='Consiglio di classe').first
    riga.hover()
    page.get_by_title('Butta via la composizione «Consiglio di classe» dalla cartella').click()
    page.locator('.modale').get_by_role('button', name='Butta via', exact=True).click()
    page.wait_for_timeout(100)
    assert page.evaluate("richieste.some(m=>m.azione?.tipo==='composizione.elimina' && m.azione.id==='fas-1')")
    assert not page.evaluate("richieste.some(m=>m.azione?.tipo==='esportazione.elimina')")
    # E la riga se ne va subito, senza aspettare lo stato che l'host rispinge:
    # un fascicolo ancora in elenco dopo la conferma si legge come «non ha
    # funzionato», e lo si butta via due volte.
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_have_count(0)
    assert page.evaluate('prova.stato.composizioni') == []
    page.evaluate("prova.aggiorna({esportati:[]})")
    expect(page.get_by_role('heading', name='Composizioni', exact=True)).to_have_count(0)
    # Un CSV si guarda nella cornice come un PDF, ma non inquadrato: la pagina
    # lo legge dal protocollo e ne disegna la tabella. La prima riga del file e'
    # il titolo dell'esportazione e va sopra, non dentro; i numeri stanno a
    # destra come in un foglio di calcolo.
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
    # Il punto e virgola dentro le virgolette non spezza la riga: sono tre
    # celle, non quattro.
    expect(tabella.locator('tbody tr').nth(1).locator('td')).to_have_text(['Bianchi; Anna', '24', '0%'])
    expect(tabella.locator('tbody tr').first.locator('td').nth(1)).to_have_class('tabella__numero')
    # Un CSV non si puo' mettere in una composizione: niente casella sulla sua
    # riga, e quella in testa alla scheda non lo spunta.
    assert page.evaluate("()=>[...document.querySelectorAll('.documenti__spunta:not("
                         ".documenti__spunta--vuota)')].length") == 0
    page.evaluate("prova.aggiorna({anteprima:null,esportati:[],radiceDati:null})")
    # Un PDF rimasto sotto esportazioni/composizioni senza il suo elenco: il
    # riquadro lo mostra lo stesso — altrimenti non ci sarebbe nessun posto da
    # cui toglierlo — ma dice che cos'è, e il pulsante che lo rifarebbe e'
    # spento, perche' di che cosa fosse fatto non lo sa piu' nessuno.
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
    # La casella «Cerca su Hugging Face» si scrive mentre la pagina si rifa'
    # sotto le dita: durante uno scarico il ridisegno arriva quattro volte al
    # secondo, per scelta. Senza `data-fuoco` il ridisegno ricreava la casella,
    # il fuoco saltava via e le lettere sparivano una a una mentre si battevano.
    page.evaluate("prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.modelliLinguistici'))")
    page.evaluate('()=>new Promise(requestAnimationFrame)')
    # La pagina chiede l'elenco all'host e senza risposta resta sullo stato
    # d'attesa, dove la casella non c'e'. Si risponde come farebbe il guscio.
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
    # E si continua a battere dove si era rimasti, senza riprendere il campo:
    # e' il gesto vero, perche' i ridisegni arrivano mentre si sta scrivendo.
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
