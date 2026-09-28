"""Le matrici larghe: un clic non riporta lo scorrimento orizzontale a sinistra.

L'appello, il check e la matrice dei corsi scorrono di lato quando le colonne
non ci stanno. Il registro rifà l'albero a ogni cambio di stato (ADR-06): una
presenza segnata, una spunta. Se la scatola che scorre è ricreata, chi era
arrivato alle ultime unità didattiche torna alla prima a ogni clic. Qui si
fissa che la scatola è lo stesso nodo prima e dopo il ridisegno (catena di
`data-telaio` dalla radice della vista) e che lo scorrimento resta dov'era.

Il ponte di prova risponde «fatto» e non riscrive il registro: il ritorno
dell'host lo fa la prova, con un `aggiorna` del registro.

Prerequisiti: Python playwright, Chromium installato; npm install.
Esecuzione dalla cartella app: `npm run ui-tests`, oppure da sola
`node esbuild.mjs --ui` e poi `python tests/ui/tabelle.py`
"""
from banco import FOTOGRAMMA, attendi_risposte, esegui, pannello

# Un'ora lunga (sedici unità didattiche) con tre persone: in una finestra
# stretta la matrice dell'appello scorre di lato.
ORA_LUNGA = '''() => {
  const r = prova.stato.registro
  const classe = r.classi[0]
  const allievi = [0, 1, 2].map((i) => ({ ...classe.allievi[0], id: `al-${i}`, cognome: `Prova${i}` }))
  const classi = r.classi.map((c) => c.id === classe.id ? { ...c, allievi } : c)
  const base = r.lezioni.find((l) => l.corsoId === r.corsi[0].id)
  const slot = [{ ...base.slot[0], inizio: '07:00', fine: '19:00' }]
  const lezione = { ...base, id: 'lez-lunga', slot }
  prova.aggiorna({ registro: { ...r, classi, lezioni: [...r.lezioni, lezione] } })
  prova.apriLezione('lez-lunga')
  prova.aggiorna({ schedaLezione: 'amministrazione' })
}'''

# Il ritorno dell'host dopo il clic: il registro con la presenza cambiata.
RITORNO = '''() => {
  const r = prova.stato.registro
  const lezioni = r.lezioni.map((l) => l.id !== 'lez-lunga' ? l : {
    ...l, presenze: [{ allievoId: 'al-0', stati: Array(20).fill('presente'), minuti: 0, nota: '' }] })
  prova.aggiorna({ registro: { ...r, lezioni } })
}'''


def appello_resta_a_destra(browser):
    page, errori = pannello(browser, 620, 800)
    page.evaluate(ORA_LUNGA)
    page.evaluate(FOTOGRAMMA)

    telaio = page.locator('.appello__telaio')
    assert telaio.count() == 1, 'la matrice dell\'appello non c\'è'
    larga = telaio.evaluate('(el) => el.scrollWidth - el.clientWidth')
    assert larga > 100, f'la matrice non scorre di lato: la prova non direbbe niente ({larga})'

    telaio.evaluate('(el) => { el.scrollLeft = el.scrollWidth; window.__appello = el }')

    # Un clic di presenza sull'ultima unità, che a destra si vede già, poi il
    # ritorno dell'host.
    page.locator('[data-fuoco="ud-al-0-15"]').click()
    attendi_risposte(page)
    sinistra = telaio.evaluate('(el) => el.scrollLeft')
    assert sinistra > 100, f'la matrice non è scorsa a destra: {sinistra}'
    page.evaluate(RITORNO)
    page.evaluate(FOTOGRAMMA)

    assert telaio.evaluate('(el) => el === window.__appello'), 'la matrice è un nodo nuovo dopo il ridisegno'
    dopo = telaio.evaluate('(el) => el.scrollLeft')
    assert dopo == sinistra, f'lo scorrimento orizzontale è tornato indietro: {dopo} invece di {sinistra}'
    assert not errori, f'errori JS: {errori}'
    page.close()



# Il check del primo corso con sedici colonne: in una finestra stretta scorre.
CHECK_LARGO = '''() => {
  const r = prova.stato.registro
  const corso = r.corsi[0]
  const colonne = Array.from({ length: 16 }, (_, i) => ({ id: `c${i}`, titolo: `Colonna ${i}` }))
  const check = { id: 'chk-largo', corsoId: corso.id, colonne, spunte: [],
    creatoIl: '2026-09-01T08:00:00.000Z', aggiornatoIl: '2026-09-01T08:00:00.000Z' }
  prova.aggiorna({ registro: { ...r, check: [check] } })
  prova.vai({ pagina: 'pagina.corso.check', soggetto: { tipo: 'corso', id: corso.id } })
}'''

CHECK_RITORNO = '''(allievoId) => {
  const r = prova.stato.registro
  const check = r.check.map((c) => ({ ...c, spunte: [{ allievoId, colonnaId: 'c15', lezioneId: null,
    data: '2026-09-14', fattaIl: '2026-09-14T08:00:00.000Z' }] }))
  prova.aggiorna({ registro: { ...r, check } })
}'''


def check_resta_a_destra(browser):
    page, errori = pannello(browser, 620, 800)
    page.evaluate(CHECK_LARGO)
    page.evaluate(FOTOGRAMMA)
    allievo = page.evaluate('prova.stato.registro.classi[0].allievi[0].id')

    telaio = page.locator('.vista--check .check__telaio')
    assert telaio.count() == 1, 'la griglia del check manca'
    assert telaio.evaluate('(el) => el.scrollWidth - el.clientWidth') > 100, 'il check non scorre di lato'
    telaio.evaluate('(el) => { el.scrollLeft = el.scrollWidth; window.__check = el }')

    page.locator(f'[data-fuoco="check-{allievo}-c15"]').click()
    attendi_risposte(page)
    sinistra = telaio.evaluate('(el) => el.scrollLeft')
    assert sinistra > 100, f'il check non è scorso a destra: {sinistra}'
    page.evaluate(CHECK_RITORNO, allievo)
    page.evaluate(FOTOGRAMMA)

    assert telaio.evaluate('(el) => el === window.__check'), 'la griglia è un nodo nuovo dopo il ridisegno'
    dopo = telaio.evaluate('(el) => el.scrollLeft')
    assert dopo == sinistra, f'il check è tornato indietro: {dopo} invece di {sinistra}'
    assert not errori, f'errori JS: {errori}'
    page.close()


# Quattordici classi in più: la matrice dei corsi è più larga della finestra.
CORSI_LARGHI = '''() => {
  const r = prova.stato.registro
  const modello = r.classi[1]
  const altre = Array.from({ length: 14 }, (_, i) => ({ ...modello, id: `cl-${i}`, nome: `Z${String(i).padStart(2, '0')}`,
    allievi: [], docenteDiClasse: false }))
  prova.aggiorna({ registro: { ...r, classi: [...r.classi, ...altre] } })
  prova.vai({ pagina: 'pagina.corsi', soggetto: { tipo: 'corso', id: r.corsi[0].id } })
}'''

# Il ritorno dell'host dopo «accendi»: il corso nuovo all'incrocio.
CORSI_RITORNO = '''() => {
  const r = prova.stato.registro
  const corso = { ...r.corsi[0], id: 'corso-nuovo', classeId: 'cl-13', titolo: 'Z13 · Matematica' }
  prova.aggiorna({ registro: { ...r, corsi: [...r.corsi, corso] } })
}'''


def corsi_restano_a_destra(browser):
    page, errori = pannello(browser, 620, 800)
    page.evaluate(CORSI_LARGHI)
    page.evaluate(FOTOGRAMMA)
    materia = page.evaluate('prova.stato.registro.corsi[0].materiaId')

    telaio = page.locator('.matrice-corsi')
    assert telaio.count() == 1, 'la matrice dei corsi manca'
    assert telaio.evaluate('(el) => el.scrollWidth - el.clientWidth') > 100, 'la matrice non scorre di lato'
    telaio.evaluate('(el) => { el.scrollLeft = el.scrollWidth; window.__corsi = el }')

    page.locator(f'[data-fuoco="corso-cl-13-{materia}"]').click()
    attendi_risposte(page)
    sinistra = telaio.evaluate('(el) => el.scrollLeft')
    assert sinistra > 100, f'la matrice non è scorsa a destra: {sinistra}'
    page.evaluate(CORSI_RITORNO)
    page.evaluate(FOTOGRAMMA)

    assert telaio.evaluate('(el) => el === window.__corsi'), 'la matrice è un nodo nuovo dopo il ridisegno'
    dopo = telaio.evaluate('(el) => el.scrollLeft')
    assert dopo == sinistra, f'la matrice è tornata indietro: {dopo} invece di {sinistra}'
    assert not errori, f'errori JS: {errori}'
    page.close()


esegui('tabelle', [appello_resta_a_destra, check_resta_a_destra, corsi_restano_a_destra])
