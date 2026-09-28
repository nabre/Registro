# Il cantiere

Il tavolo di lavoro: solo le voci aperte, per area. Una voce chiusa si
cancella (la storia sta in git); una decisione presa migra in
[DECISIONI.md](DECISIONI.md).

**Regola del file:** una voce si chiude quando il lavoro è **fatto e
verificato** — `npx tsc --noEmit` pulito, `npx eslint .` senza errori,
`npm test` verde (skill `verifica`). Non prima.

## 1. Regole di lavoro

| # | Regola |
| --- | --- |
| D1 | Il lavoro largo procede a **giri di sciame**: esplorare in parallelo, verificare in modo avversariale, applicare su perimetri disgiunti; un giro alla volta, leggendo il risultato prima del successivo (skill `sciame`). |
| D2 | **Nessun cambiamento di comportamento non richiesto**: riordini e rimozioni lasciano verdi tutte le prove senza toccarle. Una prova da cambiare è il segno che il comportamento è cambiato. |
| D3 | I difetti si correggono prima di riordinare le cartelle. |
| D4 | La riga di comando è un cliente del condotto: non importa il codice interno, chiede tutto a `$elenco` e `$schema`. |
| D5 | Un riordino delle cartelle si scrive prima come mappa «da → a» (ARCHITETTURA § 3), poi `git mv` in un commit che non contiene altro. |
| D6 | Un export senza consumatori esterni **non si cancella se è vivo**: si rende interno. Si cancella solo quel che nessuno chiama, dopo che una prova l'ha confermato. |
| D7 | Le funzionalità si aggiungono dichiarandole (`definisci()`, schemi, nucleo, giornale), non cablandole; niente librerie nuove per questo. |
| D8 | Cinque strati: `core/`, `contract/`, `desktop/`, `ui/`, `cli/` ([ARCHITETTURA.md](ARCHITETTURA.md)). |
| D9 | `contract/` ha la forma di tRPC senza tRPC: `router()`, `chiamante()` tipizzato, `Link`. |
| D10 | La riga di comando resta nuda: solo moduli `node:`, nessuna dipendenza, nessuna build. |
| D11 | `core/` diventa puro invertendo `apparato`, non riscrivendo (ARCHITETTURA § 3). |
| D12 | `core/` importa da `contract/` solo tipi. |
| D13 | Le regole degli strati le verifica `npm run layers`. |
| D14–D16 | I nomi dicono il ruolo, non un prodotto (`apparato`, non `vscode`): ADR-02. |

## 2. Piano di lavoro a lotti (ADR-46)

Il lavoro derivante dalle decisioni di ADR-46 è suddiviso in cinque lotti
disgiunti da sviluppare sequenzialmente, ciascuno verificato prima del
successivo con `npm run ci -- --solo verifica`.

### Lotto 1 — Dominio e regole puntuali (D-5, D-6, D-7)

Obiettivo: coerenza di calcolo del tempo, tipizzazione rigorosa dei parametri
d'orario e piena reversibilità delle spunte sulle consegne.

- [x] **D-6: `pause` obbligatorio in `udPrevisteDaOrario`**
      In `core/dominio/timetable.ts`, rendere il parametro `pause` obbligatorio
      nel tipo TypeScript (`pause: Giornata['pause']`).
      Allineare tutti i chiamanti:
      `contract/procedure/corso/presenze.ts`,
      `contract/procedure/persone/assenze.ts`,
      `contract/procedure/persone/scheda.ts`,
      `core/dominio/courseMatrix.ts`,
      `ui/pannello/views/student/attendance.ts` e le prove in
      `tests/api/cancelledHours.test.mjs`.
- [x] **D-5: Arrotondamento canonico a 5 minuti nel dominio**
      In `core/dominio/calculations.ts`, garantire che `durataPiano`,
      `scalettaSulleUd` e `minutiDiScarto` operino sulle durate effettive
      arrotondate a 5 minuti (minimo 5 minuti), allineando la contabilità
      interna a quanto esposto da `minutiAttivita` e visibile a schermo.
      Aggiornare e verificare `tests/domain/calculations.test.mjs`.
- [x] **D-7: Rimozione spunta per consegne spedite per posta**
      In `core/azioni/assignments.ts` (`consegna.spunta`), consentire
      `fatta: false` anche quando la spunta era stata apposta dall'invio di una
      e-mail (`modo: 'email'`), rifiutando la deselezione unicamente in
      presenza di un documento raccolto a mano da staccare con
      `consegna.documento.togli`. Aggiornare `docs/CATALOGO.md` e relative prove.

*Verifica lotto 1:* `npx tsc --noEmit && npm test` (completato e verde)

### Lotto 2 — Purezza della vista piani (D-2)

Obiettivo: eliminare ogni mutazione di stato durante il disegno o la navigazione
della vista piani, garantendo il vincolo «una vista non scrive mai dati».

- [ ] **Rimozione auto-generazione in render**
      In `ui/pannello/views/plans.ts` (righe ~924–946), eliminare la chiamata
      asincrona ad azione durante il rendering per lezioni prive di piano.
- [ ] **Navigazione pulita senza scritture in `vaiA`**
      In `ui/pannello/views/plans.ts` (righe ~330–343), fare in modo che la
      selezione di una lezione senza piano navighi mostrando lo stato vuoto
      invece di lanciare `piano.perLezione`.
- [ ] **Pannello di stato vuoto e pulsante esplicito**
      Nella vista destra di `plans.ts`, quando una lezione è priva di piano,
      mostrare un messaggio informativo con pulsante esplicito «Crea piano»
      o «Assegna piano esistente».
- [ ] **Prova UI Playwright per creazione/annullamento piano**
      Verificare che la modale «Nuovo piano» con annullamento non lasci piani
      orfani nel documento (suite `tests/ui/`).

*Verifica lotto 2:* `npx tsc --noEmit && npx eslint . && npm test`

### Lotto 3 — Dati strutturati del docente e integrazione documenti (D-4)

Obiettivo: formalizzare la mono-docenza del registro e arricchire il modello dati
con l'anagrafica strutturata del docente, iniettandola nei modelli di stampa e
rapporti PDF.

- [ ] **Estensione del modello dati del docente**
      In `core/dominio/models.ts` e `core/dominio/normalization.ts`, introdurre
      la struttura anagrafica del docente (`appellativo`, `nome`, `cognome`)
      accanto o all'interno di `Impostazioni.intestazione`, mantenendo
      piena retrocompatibilità per la stringa `docente`.
- [ ] **Migrazione formato se necessaria (ADR-37, skill `formato`)**
      Se i campi persistono nel `.regi`, definire il passo in
      `core/dominio/upgrades.ts`, aggiornare l'impronta e rigenerare il campione.
- [ ] **Interfaccia impostazioni documento**
      Aggiornare la scheda intestazione in `ui/pannello/views/settings/` e
      `contract/manifesto.ts` per l'inserimento separato dei tre campi con
      composizione automatica del nome visualizzato.
- [ ] **Integrazione segnaposto nei modelli e nei report**
      In `core/dati/reportsPdf.ts`, `core/dominio/reportData.ts` e `templates/`,
      esporre le variabili `{{docente.appellativo}}`, `{{docente.nome}}`,
      `{{docente.cognome}}`, `{{docente.completo}}`, preservando `{{docente}}`
      per tutti i modelli esistenti.
- [ ] **Aggiornamento guida in-app**
      Allineare la documentazione utente in `ui/pannello/views/help/`.

*Verifica lotto 3:* `npm run templates && npm test && npm run docs`

### Lotto 4 — Azioni atomiche per campo (D-3)

Obiettivo: impedire la perdita di dati per sovrascrittura di oggetti interi
concorrenti, introducendo azioni e procedure mirate per singolo campo o intento.

- [ ] **Procedure atomiche per classe**
      In `contract/procedure/classi/`, definire le procedure a grana fine:
      `classe.rinomina`, `classe.archivia`, `classe.impostaDocenteDiClasse`,
      `classe.colore`, `classe.note`.
- [ ] **Azioni di dominio mirate**
      In `core/azioni/register.ts`, implementare le relative azioni atomiche
      con `contesto.modifica` puntuale sulla sola collezione `classi`.
- [ ] **Aggiornamento del protocollo e del catalogo**
      Registrare le azioni in `contract/protocollo.ts` e rigenerare con
      `npm run tools`.
- [ ] **Adozione nell'interfaccia**
      In `ui/pannello/views/classes.ts`, aggiornare `scriviClasse` per invocare
      le nuove azioni atomiche invece di inviare l'intero oggetto `Classe`.
- [ ] **Estensione a corsi e anni scolastici**
      Applicare il medesimo pattern alle proprietà veloci di corsi e anni
      (`corso.colore`, `corso.note`, `anno.rinomina`).

*Verifica lotto 4:* `npm run procedures && npm run census && npm run layers && npm test`

### Lotto 5 — Font Liberation 2.x OFL (D-8)

Obiettivo: sostituire i font tipografici Liberation 1.x con la versione 2.x sotto
licenza libera SIL Open Font License (OFL).

- [ ] **Sostituzione binari font**
      Aggiornare i file TrueType di LiberationSans (Regular, Bold, Italic,
      BoldItalic) alla versione 2.x e aggiungere il file `OFL.txt` o `LICENSE`.
- [ ] **Script di build e test**
      Verificare che `esbuild.mjs` (`copiaCaratteriPdf`) distribuisca
      correttamente i nuovi font in `dist/pdf-fonts` e `dist-tests/pdf-fonts`.
- [ ] **Verifica rendering PDF**
      Eseguire le prove di generazione PDF (`tests/data/pdf.test.mjs`,
      `tests/data/sorting.test.mjs`) per confermare metriche e impaginazione.

*Verifica lotto 5:* `npm test && npm run ci -- --solo verifica`

## 3. Altre voci di cantiere aperte

### Archivio e sincronizzazione

- [ ] Due PC sullo stesso `.regi`: con il file cambiato fuori, `salva` fa
      `rifai` di tutte le voci in memoria (`core/dati/package.ts`, «chi salva
      per ultimo copre») e cancella il lavoro dell'altro, anche in collezioni
      non toccate. Proposta: riaprire dal disco e riapplicare solo le
      collezioni pendenti; conflitto sulla stessa collezione → copia accanto e
      avviso. Decisione strutturale (ADR-19): da scrivere in DECISIONI prima.
- [ ] `core/dati/archive.ts` `portaAlFormato`: se la copia in
      `versioni-precedenti` fallisce, `collezioniMigrate` si scrivono lo stesso
      e l'intestazione resta alla versione vecchia; non accodarle senza copia.
- [ ] `core/dati/zip.ts` `inizioCoda` accetta una coda vecchia nello spazio
      morto di un file scritto a metà: in ricarica pretendere la coda in fondo.
- [ ] `registro.json` illeggibile non entra in `illeggibili`: niente
      `mettiDaParte`, e una modifica la riscrive con `anno:null`.

### Coerenza dei dati

- [ ] `integrity.ts` non controlla ancora allievoId in `consegne.documenti`,
      smistamenti e fascicoli. `lezione.salva` non verifica che
      `lezioneId`/`pianoId` dei momenti siano dello stesso corso; `corsi.salva`
      senza `esigiClasse`/`esigiMateria` per i corsi nuovi.

### Sicurezza

- [ ] `desktop/apparato/theme.ts`: finestre col ponte con `sandbox:false`;
      preload in bundle senza `require` di Node.
- [ ] Fuses Electron (`NodeOptions`, `NodeCliInspect`, asar integrity):
      `RunAsNode` serve a `regi`.
- [ ] `node-llama-cpp` nel main process legge GGUF di depositi qualunque:
      `utilityProcess`, impronta fissata per il catalogo consigliato.
- [ ] Dettatura: `127.0.0.1:17493` occupabile da un altro utente se voicebox è
      spento; token o verifica del processo.
- [ ] Condotto: dopo un arresto brutale `condotto.segreto` resta; la riga di
      comando dovrebbe verificare il proprietario della pipe
      (`GetNamedPipeServerProcessId`).

### Prove

- [ ] `tests/data/kit.test.mjs` dura ~5 s: «conta il silenzio…» 2,2 s e ~3 s
      di coda a fine file (connessione lasciata aperta?).
- [ ] Le viste di `ui/pannello` si provano su Chromium (`tests/ui/*.py`), che
      `npm run copertura` non vede: funzioni al 13%. Misurarle o accettarlo.
- [ ] Mutation testing (Stryker, tap-runner, via `npx`): `deletions.ts` 87%,
      `calculations.ts:330-735` 97,7%. Sopravvissuti: piano eliminato senza
      prova che dichiari `lezioni` (~:755); guardie `n > 0` delle perdite
      (~:343-413: una perdita a zero non deve comparire); `calculations.ts`
      ~:344 (lezione senza appello nei dati di prova). Config da rifare fuori
      dal repo; non usare giunzioni su `node_modules` rimosse ricorsivamente.
- [ ] In locale gira Node 22.18, il progetto chiede Node 24: `npm ci` e le
      prove vanno ripetute con la versione giusta.

### Modelli e assistente

- [ ] Le scansioni senza programma esterno, il giorno in cui `node-llama-cpp`
      accetta immagini: via `mtmd.ts` e `ocr.programma`.

### Rilascio, firma, nome

- [ ] SignPath (D-9, differito): domanda come Regiklass (progetto `regiklass`); 2FA; app GitHub;
      configurazioni `eseguibile` e `installatori`; politica
      `release-signing`; segreto e variabile su GitHub (GUIDA § «La firma del
      codice»).
- [ ] Prima release firmata: togliere l'avviso SmartScreen dal README e «quando
      la firma sarà attiva» da SECURITY.
- [ ] Sei pacchetti MIT senza file LICENSE.

### Da provare a mano

- [ ] «Disinstalla…» su macOS, AppImage, portabile, Windows installato.
