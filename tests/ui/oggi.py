"""La Dashboard: la giornata in una schermata, a tessere che portano altrove.

Qui si prova che:

- al primo avvio, senza uno stato ricordato, il registro si apre sulla Dashboard,
  prima voce dell'agenda nella barra laterale;
- la pagina non ha comandi nella riga delle azioni (ADR-07: si guarda e si va);
- le quattro tessere dicono gli stessi numeri delle pagine a cui portano, e
  ognuna porta alla sua: ore → Calendario (su oggi), da compilare → l'ora che
  aspetta, pendenze → Pendenze, da smistare → Da smistare;
- la scheda statistiche mostra gli indicatori di avanzamento, piani, presenze e valutazioni;
- i due box «Oggi» e «La prossima giornata» mostrano le rispettive lezioni in ordine;
- le ore di oggi stanno in ordine, con la loro fase, e quella in corso è accesa;
  un clic apre l'ora;
- un'ora aperta da qui porta al Registro con l'ora per soggetto, e il
  contesto la segue: il suo corso e il filtro sulla sua classe;
- le quattro statistiche portano alle loro pagine (piani, assenze, valutazioni);
- il minuto che passa rifà solo le ore di oggi e le tessere: la fase «in
  corso» si spegne senza ridisegnare la pagina;
- le prossime valutazioni partono da oggi e un clic apre la prova;
- i compleanni di oggi compaiono solo se ce n'è;
- la voce «Pendenze» della barra laterale porta il suo conto.

L'orologio della pagina è fermo su martedì 15 settembre 2026 alle 9:30
(`page.clock`): le fasi delle ore dipendono dall'ora, e una prova che passa al
mattino e cade la sera non prova niente.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `node esbuild.mjs --ui` e poi
`python tests/ui/oggi.py`. Le fotografie vanno in `dist-tests/schermate/`, o
nella cartella di `SCATTI`.
"""
from playwright.sync_api import expect

from banco import FRAME, chromium, pannello, schermata

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


with chromium() as browser:
    for schema in ['light', 'dark']:
        page, errori = pannello(browser, 1400, color_scheme=schema,
                                prima=lambda page: page.clock.set_fixed_time('2026-09-15T09:30:00'))

        # Senza uno stato ricordato si comincia dalla Dashboard, prima voce dell'agenda.
        assert page.evaluate('prova.stato.vista') == 'oggi'
        assert page.evaluate("prova.PAGINE.filter(p=>p.gruppo==='agenda')[0].id") == 'pagina.oggi'
        laterale = page.locator('#navigazione-laterale')
        expect(laterale.get_by_role('button', name='Dashboard', exact=True)).to_have_attribute('aria-current', 'page')

        page.evaluate(GIORNATA)
        page.evaluate(FRAME)
        vista = page.locator('.vista--oggi')
        expect(vista.locator('.testata__titolo')).to_have_text('Dashboard')
        expect(vista.locator('.testata__sottotitolo')).to_contain_text('martedì 15 settembre 2026')
        # La Dashboard espone solo il Periodo: niente anno fermo, corso o classe.
        periodo = page.locator('[data-fuoco="barra-comandi-periodo"]')
        expect(periodo).to_have_count(1)
        expect(page.locator('.barra-comandi__scelta--ferma')).to_have_count(0)
        # Niente riga delle azioni: la pagina porta altrove, non fa.
        expect(page.locator('#azioni-pagina')).to_have_count(0)
        schermata(page, f'oggi-{schema}.png', full_page=True)

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

        # Le statistiche didattiche del periodo sono presenti e interattive.
        stat_tessere = vista.locator('.oggi-statistica-tessera')
        expect(stat_tessere).to_have_count(4)

        # Due box di giornate: oggi e la prossima giornata
        scheda_oggi = vista.locator('.oggi-scheda--oggi')
        scheda_prossima = vista.locator('.oggi-scheda--prossima')
        expect(scheda_oggi.locator('.scheda__titolo')).to_have_text('Le lezioni di oggi')
        expect(scheda_prossima.locator('.scheda__titolo')).to_have_text('Le lezioni della prossima giornata')

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
        expect(periodo).to_have_count(1)
        expect(page.locator('.barra-comandi__scelta--ferma')).to_have_count(1)
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

        # L'ora di un altro corso: il Registro si apre su di lei, e il contesto
        # (corso di lavoro, filtro per classe) passa al suo corso.
        page.evaluate("prova.scegliCorso(prova.stato.registro.corsi[0].id)")
        apri_oggi(page)
        ore.nth(1).click()
        posto = page.evaluate('prova.postoCorrente()')
        assert posto == {'pagina': 'pagina.corso.registro', 'soggetto': {'tipo': 'lezione', 'id': 'oggi-2'}}, posto
        corso = page.evaluate("prova.stato.registro.lezioni.find(l=>l.id==='oggi-2').corsoId")
        assert corso == page.evaluate('prova.stato.registro.corsi[1].id')
        assert page.evaluate('[prova.stato.contesto.corsoId, prova.stato.corsoId]') == [corso, corso]
        classe = page.evaluate('c=>prova.stato.registro.corsi.find(x=>x.id===c).classeId', corso)
        assert page.evaluate('prova.stato.filtroClasseId') == classe
        assert page.evaluate('[prova.stato.lezioneId, prova.stato.data]') == ['oggi-2', '2026-09-15']

        # Le statistiche portano alle pagine che esistono, non a nomi sbagliati.
        for chiave, pagina in [('piani', 'pagina.corso.piani'), ('presenze', 'pagina.classe.assenze'),
                               ('valutazioni', 'pagina.corso.valutazioni')]:
            apri_oggi(page)
            vista.locator(f'[data-fuoco="oggi-stat-{chiave}"]').click()
            assert page.evaluate('prova.postoCorrente().pagina') == pagina, chiave

        # Il minuto che passa: alle 9:56 l'ora delle 9:10 non è più in corso e si
        # accende la prossima. Solo le isole dell'ora si rifanno: la pagina è la stessa.
        apri_oggi(page)
        page.evaluate("()=>{window.__vistaOggi=document.querySelector('.vista--oggi');"
                      "window.__statistiche=document.querySelector('.oggi-scheda--statistiche')}")
        page.clock.set_fixed_time('2026-09-15T09:56:00')
        page.evaluate("window.dispatchEvent(new Event('focus'))")
        page.evaluate(FRAME)
        expect(ore.nth(1).locator('.pastiglia')).not_to_have_text('In corso')
        assert vista.locator('.oggi-ora--evidenza').get_attribute('data-lezione') == 'oggi-3'
        expect(tessere.nth(0).locator('.oggi-tessera__nota')).to_have_text('La prossima alle 10:15')
        assert page.evaluate("document.querySelector('.vista--oggi')===window.__vistaOggi"), 'la pagina si è rifatta'
        assert page.evaluate("document.querySelector('.oggi-scheda--statistiche')===window.__statistiche")
        page.clock.set_fixed_time('2026-09-15T09:30:00')
        page.evaluate("window.dispatchEvent(new Event('focus'))")

        # Senza ore oggi, la Dashboard anticipa la prossima giornata di lezione.
        page.evaluate('''()=>{
          const r = structuredClone(prova.stato.registro)
          r.classi[0].allievi[0].dataNascita = null
          r.lezioni = r.lezioni.filter(l => l.data < '2026-09-15')
          const modello = r.lezioni[0]
          r.lezioni.push({...modello, id: 'prossima-giornata', corsoId: r.corsi[0].id,
            data: '2026-09-17', stato: 'pianificata'})
          prova.aggiorna({ registro: r })
        }''')
        apri_oggi(page)
        expect(vista.locator('.testata__sottotitolo')).to_contain_text(
            'Prossima giornata di lezione: giovedì 17 settembre 2026')
        expect(vista.locator('.oggi-scheda--prossima .scheda__titolo')).to_have_text(
            'Le lezioni della prossima giornata')
        expect(vista.locator('[data-lezione="prossima-giornata"]')).to_have_count(1)

        # Stretta: una colonna, e nessuno scorrimento di lato.
        page.set_viewport_size({'width': 700, 'height': 1000})
        page.evaluate(FRAME)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')

        assert not errori, errori
        page.close()

print('oggi: ok')
