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

## 2. Lavoro aperto

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
