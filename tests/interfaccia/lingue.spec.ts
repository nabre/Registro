// Il pannello nelle altre lingue: nessuna parola italiana rimasta sullo schermo.
//
// Il controllo statico (`npm run i18n`) trova il testo scritto nel codice fuori
// da un catalogo; questa prova guarda il risultato. Per ogni lingua che non è
// l'italiano apre ogni pagina della barra laterale e legge il testo visibile:
// una parola che esiste solo in italiano — «della», «questo», «più», «nessuna»
// — vuol dire una frase che non è passata dal catalogo, o una traduzione
// lasciata a metà.
//
// Il registro di prova ha dati italiani — «Matematica», «Esercizi di DIC4a» —
// e quelli restano come sono in ogni lingua: sono scritti dal docente. Le parole
// cercate qui non compaiono in quei dati.
//
// La lingua arriva alla pagina come in Electron: `window.registroLingua`, letta
// da `src/i18n/page.ts` prima di ogni altro modulo.

import { expect, test } from '@playwright/test'

import { FRAME, pannello, schermata, valuta } from './banco'

// Il confine di parola di Python, che conta come lettere anche «ù» ed «é»: il
// `\b` di JavaScript guarda solo l'ASCII e non vedrebbe «più» né «perché».
const LETTERA = '[\\p{L}\\p{N}_]'

// Parole che in tedesco, francese e inglese non esistono (preposizioni
// articolate, avverbi comuni). Una parola attaccata a un punto o a una barra è
// un nome di file o di procedura (`impostazioni.json`, `corsi.elenco`), che si
// cita com'è.
const SOLO_ITALIANO = new RegExp(
  `(?<![./])(?<!${LETTERA})(della|delle|dello|degli|nella|nelle|negli|sulla|sulle|questo|questa|` +
  'sono|anche|perché|più|già|nessuna|nessun|ancora|oppure|quando|dove|' +
  `lezione|lezioni|classi|corsi|impostazioni|aggiungi|salva|chiudi|elimina)(?!${LETTERA})` +
  `(?![./]${LETTERA})`,
  'iu',
)

// Dati che restano in italiano in ogni lingua, come quelli del docente: la
// fonte del calendario ufficiale ticinese (`core/dati/schoolCalendarTicino.ts`)
// è il nome di chi pubblica i PDF, e sta nella pagina Calendario › Chiusure.
const DATI_ITALIANI = ['Dipartimento dell\'educazione, della cultura e dello sport']

test('lingue', async ({ browser }) => {
  const erroriTotali: string[] = []

  for (const lingua of ['de', 'fr', 'en']) {
    // Senza `lang`: deve metterlo il pannello, dalla lingua.
    const { page, errori } = await pannello(browser, {
      larghezza: 1400,
      html: '<html><body class="app"><div id="radice"></div></body></html>',
      lingua,
    })
    expect(await valuta(page, 'document.documentElement.lang')).toBe(lingua)

    const ids = await valuta<string[]>(page, 'prova.PAGINE.map(p=>p.id)')
    for (const pagina of ids) {
      await valuta(page, 'id=>prova.vaiA(prova.PAGINE.find(p=>p.id===id))', pagina)
      await valuta(page, FRAME)
      const testo = await valuta<string>(page, 'document.body.innerText')
      for (let riga of testo.split('\n')) {
        if (DATI_ITALIANI.some((dato) => riga.includes(dato))) continue
        const trovata = SOLO_ITALIANO.exec(riga)
        if (trovata) {
          riga = riga.trim().slice(0, 100)
          erroriTotali.push(`${lingua} ${pagina}: «${trovata[0]}» in «${riga}»`)
        }
      }
      if (pagina === 'pagina.calendario') {
        await schermata(page, `lingua-${lingua}.png`)
      }
    }

    expect(errori).toEqual([])
    await page.close()
  }

  const righe = [...new Set(erroriTotali)].sort()
  expect(righe, `${righe.length} righe con parole italiane\n${righe.join('\n')}`).toEqual([])
})
