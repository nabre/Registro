# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\interfaccia\navigation.spec.ts >> navigation
- Location: tests\interfaccia\navigation.spec.ts:25:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button "File" [ref=e8] [cursor=pointer]
      - button "Annulla" [disabled] [ref=e12]
      - button "Ripristina" [disabled] [ref=e16]
    - 'generic "Nessun anno aperto: si apre da «File»"':
      - generic: Nessun anno aperto
      - 'navigation "Percorso: Area Registro, Su che cosa DIC4b · Matematica, Pagina Lezione, Aperto LUN 14.09.2026 08:20, Scheda Amministrazione"':
        - generic:
          - generic [aria-hidden]: ›
          - generic: DIC4b · Matematica
        - generic:
          - generic [aria-hidden]: ›
          - generic: Lezione
        - generic:
          - generic [aria-hidden]: ›
          - generic: LUN 14.09.2026 08:20
    - button "Cerca pagine, comandi, persone in formazione, corsi e classi" [ref=e21]:
      - generic [ref=e25]: Cerca…
      - generic [aria-hidden] [ref=e26]:
        - generic [ref=e27]: Ctrl
        - generic [ref=e28]: K
  - complementary [ref=e29]:
    - generic [ref=e30]:
      - generic [ref=e35]:
        - strong [ref=e36]: Registro
        - generic [ref=e37]: Spazio docente
      - button "Navigazione" [expanded] [ref=e38] [cursor=pointer]
    - navigation "Navigazione principale" [ref=e42]:
      - generic [ref=e43]:
        - heading "Agenda" [level=2] [ref=e44]
        - button "Dashboard" [ref=e46] [cursor=pointer]
        - button "Calendario" [ref=e53] [cursor=pointer]
        - button "Pendenze" [ref=e58] [cursor=pointer]:
          - generic [ref=e62]: "1"
        - button "Da smistare" [ref=e63] [cursor=pointer]
      - 'button "Cambia corso: DIC4b · Matematica" [ref=e69] [cursor=pointer]':
        - generic [ref=e70]: DIC4b · Matematica
      - generic [ref=e74]:
        - heading "Registro" [level=2] [ref=e75]
        - button "Lezione" [ref=e77] [cursor=pointer]
        - button "Valutazioni" [ref=e82] [cursor=pointer]
        - button "Check" [ref=e88] [cursor=pointer]
        - button "Documenti" [ref=e94] [cursor=pointer]
      - generic [ref=e99]:
        - heading "Progettazione" [level=2] [ref=e100]
        - button "Panoramica" [ref=e102] [cursor=pointer]
        - button "Piani lezione" [ref=e109] [cursor=pointer]
        - button "Integrazione progetti" [ref=e114] [cursor=pointer]
      - generic [ref=e120]:
        - heading "Docente di classe DIC4a" [level=2] [ref=e121]:
          - generic [ref=e122]: Docente di classe
          - generic [ref=e123]: DIC4a
        - button "Check della classe" [ref=e124] [cursor=pointer]
        - button "Archivio documentale" [ref=e130] [cursor=pointer]
        - button "Assenze" [ref=e135] [cursor=pointer]
        - button "Messaggistica" [ref=e141] [cursor=pointer]
      - generic [ref=e146]:
        - heading "Anno scolastico" [level=2] [ref=e147]
        - button "Classi" [ref=e149] [cursor=pointer]
        - button "Persone in formazione" [ref=e155] [cursor=pointer]
        - button "Mappa" [ref=e160] [cursor=pointer]
        - button "Corsi" [ref=e165] [cursor=pointer]
        - button "Progetti" [ref=e171] [cursor=pointer]
      - generic [ref=e177]:
        - heading "Il programma" [level=2] [ref=e178]
        - button "Impostazioni" [ref=e180] [cursor=pointer]
        - button "Guida" [ref=e185] [cursor=pointer]
  - generic [ref=e189]:
    - generic [ref=e190]:
      - generic [ref=e191]:
        - generic [ref=e192]:
          - generic [ref=e193]: Anno
          - strong [ref=e194]: 2026/2027
        - 'button "Periodo: Anno intero" [ref=e195] [cursor=pointer]':
          - generic [ref=e196]: Periodo
          - strong [ref=e197]: Anno intero
        - 'button "Corso: DIC4b · Matematica" [active] [ref=e200] [cursor=pointer]':
          - generic [ref=e201]: Corso
          - strong [ref=e202]: DIC4b · Matematica
      - 'generic "L’orario della lezione è finito: la si può concludere" [ref=e205]': Passata
      - button "Proietta" [ref=e209] [cursor=pointer]
      - button "Nascondi le azioni" [expanded] [ref=e214] [cursor=pointer]
    - 'region "Azioni: Lezione" [ref=e217]':
      - group "Adesso" [ref=e218]:
        - button "Lezione da compilare" [disabled] [ref=e220]
      - group "Stato della lezione" [ref=e225]:
        - generic [ref=e226]:
          - button "Modificabile" [pressed] [ref=e227] [cursor=pointer]
          - button "Conclusa" [ref=e232] [cursor=pointer]
          - button "Annullata" [ref=e236] [cursor=pointer]
  - main [ref=e240]:
    - generic [ref=e241]:
      - generic [ref=e242]:
        - heading [level=2] [ref=e243]:
          - button "Ora precedente di questo corso" [disabled] [ref=e244]
          - combobox "Lezione del corso" [ref=e247] [cursor=pointer]:
            - option "1. LUN 14.09.2026 · 08:20" [selected]
          - button "Ora successiva di questo corso" [disabled] [ref=e248]
        - paragraph [ref=e251]:
          - strong [ref=e252]: DIC4b
          - text: ·
          - generic [ref=e253]: lun 14.09.2026
          - text: · 08:20–09:05
        - 'button "Prepara la supplenza: allievi, piano e risorse in uno zip per chi tiene l’ora" [ref=e254] [cursor=pointer]'
        - generic [ref=e258]: 1 di 1
      - radiogroup "Scheda" [ref=e259]:
        - radio "Amministrazione" [checked] [ref=e260] [cursor=pointer]
        - radio "Lezione" [ref=e265] [cursor=pointer]
        - radio "Annotazioni" [ref=e270] [cursor=pointer]
      - generic [ref=e275]:
        - generic [ref=e277]:
          - generic [ref=e278]:
            - generic [ref=e279]:
              - heading "Appello" [level=3] [ref=e280]
              - paragraph [ref=e281]: 1 caselle da fare · 0 presenti su 0 · 1 UD
            - generic [ref=e282]:
              - button "Tutti presenti" [ref=e283] [cursor=pointer]
              - button "Rimette ogni casella a «non impostato»" [ref=e287] [cursor=pointer]:
                - generic [ref=e291]: Azzera
          - table [ref=e294]:
            - rowgroup [ref=e295]:
              - row [ref=e296]:
                - columnheader "Persona in formazione" [ref=e297]
                - columnheader "UD 1 08:20 Tutta la classe, UD 1 (08:20–09:05)" [ref=e298]:
                  - generic [ref=e299]: UD 1
                  - generic [ref=e300]: 08:20
                  - button "Tutta la classe, UD 1 (08:20–09:05)" [ref=e301] [cursor=pointer]: "-"
                - columnheader "nota" [ref=e302]
            - rowgroup [ref=e303]:
              - row [ref=e304]:
                - rowheader "Tutta la lezione di Esempio Anna Esempio Anna" [ref=e305]:
                  - button "Tutta la lezione di Esempio Anna" [ref=e306] [cursor=pointer]: "-"
                  - generic [ref=e307]: Esempio Anna
                - cell [ref=e308]:
                  - button "Esempio Anna, UD 1 (08:20–09:05)" [ref=e310] [cursor=pointer]: "-"
                - cell [ref=e311]:
                  - button "Nota su Esempio Anna" [ref=e312] [cursor=pointer]
        - generic [ref=e315]:
          - generic [ref=e316]:
            - generic [ref=e317]:
              - generic [ref=e318]:
                - heading "Pendenze" [level=3] [ref=e319]
                - paragraph [ref=e320]: quel che si è dato da fare, finché non è fatto
              - button "Nuova consegna" [ref=e322] [cursor=pointer]
            - generic [ref=e328]:
              - heading "Ancora aperte 1" [level=4] [ref=e329]:
                - generic [ref=e330]: Ancora aperte
                - generic [ref=e331]: "1"
              - article [ref=e332]:
                - generic [ref=e333]:
                  - generic "compito" [ref=e334]
                  - strong [ref=e338]: Esercizi di DIC4b
                  - generic [ref=e339]: classe
                  - button "Spunta i 1 che mancano" [ref=e344] [cursor=pointer]
                  - button "Modifica la consegna" [ref=e347] [cursor=pointer]
                - paragraph [ref=e351]: data il lun 14 · senza termine
                - button "Esempio A." [ref=e353] [cursor=pointer]
          - paragraph [ref=e355]:
            - text: Nessun check per questo corso.
            - button "Prepara le colonne nella pagina Check" [ref=e360] [cursor=pointer]
  - contentinfo "Stato del registro" [ref=e361]:
    - generic [ref=e363]:
      - generic "Non ci sono lezioni da fare né da compilare, fra quelle che i filtri qui accanto lasciano vedere" [ref=e364]: nessuna lezione in programma
      - button "2 da chiudere" [ref=e369] [cursor=pointer]
      - button "1 pendenza" [ref=e375] [cursor=pointer]
    - generic [ref=e380]:
      - button "bozze in file .eml" [ref=e381] [cursor=pointer]
      - button "2026/2027" [ref=e386] [cursor=pointer]
```

# Test source

```ts
  55  |     '(el) => getComputedStyle(el).position')).toBe('sticky')
  56  |   // Un aggiornamento dei dati non deve riportare in cima la sidebar scorsa.
  57  |   await page.setViewportSize({ width: 1440, height: 500 })
  58  |   await navigazione.focus()
  59  |   await valutaSu(laterale, '(el) => el.scrollTop = el.scrollHeight')
  60  |   const scorrimento = await valutaSu<number>(laterale, '(el) => el.scrollTop')
  61  |   expect(scorrimento).toBeGreaterThan(0)
  62  |   const alto = (await riquadro(laterale)).y
  63  |   expect(Math.abs((await riquadro(laterale.locator('.sidebar__marchio'))).y - alto))
  64  |     .toBeLessThan(1)
  65  |   await valuta(page, 'prova.ridisegna()')
  66  |   await valuta(page, FOTOGRAMMA)
  67  |   expect(await valutaSu(laterale, '(el) => el.scrollTop')).toBe(scorrimento)
  68  |   await page.setViewportSize({ width: 1440, height: 1000 })
  69  |   const larghezzaPrima = (await riquadro(page.locator('main'))).width
  70  |   await navigazione.click()
  71  |   await expect(laterale).toHaveClass('sidebar sidebar--compatta')
  72  |   expect((await riquadro(page.locator('main'))).width).toBeGreaterThan(larghezzaPrima)
  73  |   await expect(laterale.getByRole('button', { name: 'Corsi', exact: true })).toBeVisible()
  74  |   await laterale.getByRole('button', { name: 'Corsi', exact: true }).click()
  75  |   await expect(laterale.getByRole('button', { name: 'Corsi', exact: true }))
  76  |     .toHaveAttribute('aria-current', 'page')
  77  |   await laterale.getByRole('button', { name: 'Calendario', exact: true }).click()
  78  |   await schermata(page, 'sidebar-compatta.png')
  79  |   await navigazione.click()
  80  |   await expect(laterale).toBeVisible()
  81  |   // Il ridisegno della sidebar arriva un frame dopo: aperto prima, il menu si
  82  |   // richiuderebbe.
  83  |   await valuta(page, FOTOGRAMMA)
  84  |   // Menu: frecce, Home/End, Escape e restituzione del focus.
  85  |   const file = page.getByRole('button', { name: 'File', exact: true })
  86  |   await file.focus()
  87  |   await page.keyboard.press('ArrowDown')
  88  |   await expect(file).toHaveAttribute('aria-expanded', 'true')
  89  |   await page.keyboard.press('End')
  90  |   await expect(page.locator('.menu__voce').last()).toBeFocused()
  91  |   await page.keyboard.press('Home')
  92  |   await page.keyboard.press('ArrowDown')
  93  |   await page.keyboard.press('Escape')
  94  |   await expect(file).toBeFocused()
  95  |   await expect(file).toHaveAttribute('aria-expanded', 'false')
  96  |   // Il file recente invia il percorso e lascia la pagina corrente. I preferiti
  97  |   // sono un gruppo loro, con la stella come icona: il nome comincia con l'anno.
  98  |   await file.click()
  99  |   await page.getByRole('menuitem', { name: '2025-2026' }).click()
  100 |   expect(await valuta(page, "richieste.some(m=>m.azione?.tipo==='documento.apri' && " +
  101 |     "m.azione.percorso==='C:/esempio/2025-2026.regi')")).toBeTruthy()
  102 |   // Il tasto destro su un recente apre accanto il suo riquadro col nome del file;
  103 |   // freccia a sinistra lo chiude, a destra lo riapre; il tasto destro su una riga
  104 |   // senza riquadro lo chiude.
  105 |   const padre = page.locator('.menu:not(.menu--figlio)')
  106 |   const figlio = page.locator('.menu--figlio')
  107 |   const riga = padre.locator('.menu__voce[data-voce="C:/esempio/2025-2026.regi"]')
  108 |   await file.click()
  109 |   await riga.click({ button: 'right' })
  110 |   await expect(figlio).toHaveAttribute('aria-label', '2025-2026')
  111 |   await page.keyboard.press('ArrowLeft')
  112 |   await expect(figlio).toHaveCount(0)
  113 |   await expect(riga).toBeFocused()
  114 |   await page.keyboard.press('ArrowRight')
  115 |   await expect(figlio).toHaveCount(1)
  116 |   await padre.getByRole('menuitem', { name: 'Apri un anno…' }).click({ button: 'right' })
  117 |   await expect(figlio).toHaveCount(0)
  118 |   await expect(padre).toHaveCount(1)
  119 |   await page.keyboard.press('Escape')
  120 |   // La stella dal riquadro lascia il menu aperto col fuoco sulla riga del file:
  121 |   // né lo scorrimento né un secondo ridisegno lo chiudono. Il secondo clic su
  122 |   // «File» lo richiude.
  123 |   await page.setViewportSize({ width: 1440, height: 500 })
  124 |   await valutaSu(laterale, '(el) => el.scrollTop = el.scrollHeight')
  125 |   for (let volta = 0; volta < 2; volta++) {
  126 |     await file.click()
  127 |     await riga.click({ button: 'right' })
  128 |     await figlio.locator('.menu__voce').first().click()
  129 |     for (let i = 0; i < 3; i++) await valuta(page, FOTOGRAMMA)
  130 |     await expect(padre).toHaveCount(1)
  131 |     await expect(riga).toBeFocused()
  132 |     await valuta(page, 'prova.ridisegna()')
  133 |     for (let i = 0; i < 3; i++) await valuta(page, FOTOGRAMMA)
  134 |     await expect(padre).toHaveCount(1)
  135 |     await expect(file).toHaveAttribute('aria-expanded', 'true')
  136 |     await file.click()
  137 |     await expect(padre).toHaveCount(0)
  138 |     await expect(file).toHaveAttribute('aria-expanded', 'false')
  139 |   }
  140 |   expect(await valuta(page, 'prova.stato.documenti.elenco[0].preferito')).toBe(true)
  141 |   await page.setViewportSize({ width: 1440, height: 1000 })
  142 |   // La scelta del corso nel registro cambia davvero la lezione aperta.
  143 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.registro'))")
  144 |   const sceltaCorso = page.locator('[data-fuoco="barra-comandi-corso"]')
  145 |   await scegli(page, sceltaCorso, await valuta<string>(page, 'prova.stato.registro.corsi[1].id'))
  146 |   await attendi(page, 'prova.stato.registro.lezioni.find(l=>l.id===prova.stato.lezioneId)' +
  147 |     '.corsoId===prova.stato.corsoId')
  148 |   await expect(sceltaCorso).toHaveAttribute('data-valore', await valuta<string>(page, 'prova.stato.corsoId'))
  149 |   // La tendina del corso sta nella barra, non nel registro della lezione; la
  150 |   // tendina delle ore è il titolo. I gesti dell'ora sono comandi della pagina:
  151 |   // in testata ci sono solo le frecce del navigatore.
  152 |   expect(await valuta(page, "document.querySelectorAll('.vista--lezione .testata__titolo.navigatore-registro select').length"))
  153 |     .toBe(1)
  154 |   expect(await valuta(page,
> 155 |     "document.querySelectorAll('.vista--lezione .testata button:not(.navigatore-registro button)').length")).toBe(0)
      |                                                                                                              ^ Error: expect(received).toBe(expected) // Object.is equality
  156 |   for (const id of ['lezione.stato.pianificata', 'lezione.stato.svolta',
  157 |     'lezione.stato.annullata']) {
  158 |     await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  159 |   }
  160 |   // Giorno, orario e aula si cambiano dal calendario, non dalla pagina dell'ora.
  161 |   await expect(page.locator('[data-fuoco="comando-lezione.modifica"]')).toHaveCount(0)
  162 |   // Le esportazioni stanno tutte in Documenti: nessun comando le porta altrove.
  163 |   expect(await valuta(page,
  164 |     String.raw`prova.COMANDI_UI.filter(c=>/^(corso\.esporta|corso\.verbale|lezione\.calendario|corso\.nuovaOra)/.test(c.id))` +
  165 |     ".every(c=>!c.dove.includes('lezione'))",
  166 |   )).toBeTruthy()
  167 |   await schermata(page, 'lezione-compatta.png')
  168 |   // Visita tutte le destinazioni con un contesto valido.
  169 |   const ids = await valuta<string[]>(page, 'prova.PAGINE.map(p=>p.id)')
  170 |   for (const id of ids) {
  171 |     await valuta(page, 'prova.scegliCorso(prova.stato.registro.corsi[0].id)')
  172 |     await valuta(page, FOTOGRAMMA)
  173 |     const titolo = await valuta<string>(page, 'id=>prova.PAGINE.find(p=>p.id===id).titolo', id)
  174 |     await laterale.getByRole('button', { name: titolo, exact: true }).click()
  175 |     await expect(laterale.locator('[aria-current="page"]')).toHaveCount(1)
  176 |     await attendi(page, 'document.querySelector("main")?.textContent.length > 0')
  177 |     await valuta(page, FOTOGRAMMA)
  178 |     expect(await valuta(page, 'prova.gruppiDiPagine().filter(g=>g.attivo).length'), id).toBe(1)
  179 |     expect(await valuta(page, 'id=>prova.gruppiDiPagine().find(g=>g.attivo).gruppo===' +
  180 |       'prova.PAGINE.find(p=>p.id===id).gruppo', id), id).toBeTruthy()
  181 |   }
  182 |   // Le tendine del contesto compaiono solo dove filtrano qualcosa.
  183 |   const corsoSelect = page.locator('[data-fuoco="barra-comandi-corso"]')
  184 |   const classeSelect = page.locator('[data-fuoco="barra-comandi-classe"]')
  185 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.valutazioni'))")
  186 |   await expect(corsoSelect).toBeVisible()
  187 |   await expect(classeSelect).toHaveCount(0)
  188 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.pendenze'))")
  189 |   await expect(corsoSelect).toHaveCount(0)
  190 |   expect(await valuta(page, "prova.stato.vista === 'todo'")).toBeTruthy()
  191 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.corso.check'))")
  192 |   await expect(corsoSelect).toBeVisible()
  193 |   expect(await valuta(page, "prova.stato.ambitoCheck === 'corso'")).toBeTruthy()
  194 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.assenze'))")
  195 |   await expect(classeSelect).toBeVisible()
  196 |   await expect(corsoSelect).toHaveCount(0)
  197 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.classe.check'))")
  198 |   await expect(classeSelect).toBeVisible()
  199 |   await expect(corsoSelect).toHaveCount(0)
  200 |   expect(await valuta(page,
  201 |     "prova.stato.vista === 'check' && prova.stato.ambitoCheck === 'classe'")).toBeTruthy()
  202 |   await valuta(page, "prova.vaiA(prova.PAGINE.find(p=>p.id==='pagina.calendario'))")
  203 |   await expect(corsoSelect).toHaveCount(0)
  204 |   await expect(classeSelect).toHaveCount(0)
  205 |   // I comandi del calendario stanno nella barra, non nella testata della vista.
  206 |   const comandiCalendario = ['registro.oggi', 'calendario.indietro', 'calendario.avanti',
  207 |     'calendario.settimana', 'calendario.mese', 'calendario.anno', 'calendario.agenda']
  208 |   for (const id of comandiCalendario) {
  209 |     await expect(page.locator(`[data-fuoco="comando-${id}"]`)).toHaveCount(1)
  210 |   }
  211 |   // «Oggi» del calendario sta nella riga delle azioni, una volta; la voce «Oggi»
  212 |   // della barra laterale è la pagina omonima.
  213 |   await expect(page.locator('#azioni-pagina').getByRole('button', { name: 'Oggi', exact: true }))
  214 |     .toHaveCount(1)
  215 |   await expect(page.locator('main').getByRole('button', { name: 'Oggi', exact: true }))
  216 |     .toHaveCount(0)
  217 |   // La modalità si legge sul pulsante acceso, e le frecce spostano il periodo.
  218 |   await page.locator('[data-fuoco="comando-calendario.mese"]').click()
  219 |   await valuta(page, FOTOGRAMMA)
  220 |   expect(await valuta(page, 'prova.stato.modoCalendario')).toBe('mese')
  221 |   await expect(page.locator('[data-fuoco="comando-calendario.mese"]'))
  222 |     .toHaveAttribute('aria-pressed', 'true')
  223 |   const dataPrima = await valuta<string>(page, 'prova.stato.data')
  224 |   await page.locator('[data-fuoco="comando-calendario.avanti"]').click()
  225 |   await valuta(page, FOTOGRAMMA)
  226 |   expect(await valuta(page, 'prova.stato.data')).not.toBe(dataPrima)
  227 |   await page.locator('[data-fuoco="comando-registro.oggi"]').click()
  228 |   await valuta(page, FOTOGRAMMA)
  229 |   // La data locale, come `oggi()` in `dominio/date.ts`: `toISOString()` darebbe
  230 |   // quella UTC, diversa fra mezzanotte e le due in estate.
  231 |   const oggi = await valuta<string>(page,
  232 |     "(()=>{const o=new Date();const d=n=>String(n).padStart(2,'0');" +
  233 |     'return `${o.getFullYear()}-${d(o.getMonth()+1)}-${d(o.getDate())}`})()')
  234 |   expect(await valuta(page, 'prova.stato.data')).toBe(oggi)
  235 |   await page.locator('[data-fuoco="comando-calendario.settimana"]').click()
  236 |   await valuta(page, FOTOGRAMMA)
  237 |   // La striscia delle settimane segna un confine solo: la fine del semestre che
  238 |   // ne ha un altro dopo (la fine dell'ultimo è il bordo della striscia).
  239 |   await expect(page.locator('.striscia-settimane')).toHaveCount(1)
  240 |   await expect(page.locator('.striscia-settimane__voce--apre-semestre')).toHaveCount(0)
  241 |   const confini = page.locator('.striscia-settimane__voce--chiude-semestre')
  242 |   const semestri = await valuta<number>(page, '()=>prova.stato.registro.anni[0].semestri.length')
  243 |   await expect(confini).toHaveCount(semestri - 1)
  244 |   // E cade sulla settimana in cui il semestre finisce. Il titolo conta i soli
  245 |   // giorni mostrati, il confine si cerca su tutti e sette (`weekStrip.ts`): un
  246 |   // semestre che finisce di domenica, con Sab/Dom nascosti, sta nella settimana
  247 |   // che il titolo chiude al venerdì. Si confronta col lunedì e la domenica.
  248 |   const fine = await valuta<string>(page, '()=>prova.stato.registro.anni[0].semestri[0].fine')
  249 |   const titoloConfine = (await confini.first().getAttribute('title')) ?? ''
  250 |   expect(titoloConfine.includes('finisce il'), titoloConfine).toBeTruthy()
  251 |   const estremi = titoloConfine.match(/\d{2}\.\d{2}\.\d{4}/g) ?? []
  252 | 
  253 |   const iso = (scritta: string): string => {
  254 |     const [g, m, a] = scritta.split('.')
  255 |     return `${a}-${m}-${g}`
```