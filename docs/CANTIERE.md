# Il cantiere

Il tavolo di lavoro: solo le voci aperte, per area. Una voce chiusa si
cancella (la storia sta in git); una decisione presa migra in
[DECISIONI.md](DECISIONI.md).

**Regola del file:** una voce si chiude quando il lavoro è **fatto e
verificato** — `npm run ci -- --solo verifica` verde (tipi, stile, prove e
controlli statici; skill `verifica`). Non prima.

## 1. Regole di lavoro

| # | Regola |
| --- | --- |
| D1 | Il lavoro largo procede a **giri di sciame**: esplorare in parallelo, verificare in modo avversariale, applicare su perimetri disgiunti; un giro alla volta, leggendo il risultato prima del successivo (skill `sciame`). |
| D2 | **Nessun cambiamento di comportamento non richiesto**: riordini e rimozioni lasciano verdi tutte le prove senza toccarle. Una prova da cambiare è il segno che il comportamento è cambiato. |
| D3 | I difetti si correggono prima di riordinare le cartelle. |
| D4 | La riga di comando è un cliente del condotto: non importa il codice interno, chiede tutto a `$elenco` e `$schema`. |
| D5 | Un riordino delle cartelle si scrive prima come mappa «da → a» (ARCHITETTURA § 3), poi `git mv` in un commit che non contiene altro. |
| D6 | Un export senza consumatori esterni **non si cancella se è vivo**: si rende interno. Si cancella solo quel che nessuno chiama, dopo che una prova l'ha confermato. |
| D7 | Le funzionalità si aggiungono dichiarandole (`definisci()`, schemi, nucleo, giornale), non cablandole. Le librerie si giudicano con i criteri di ADR-50. |
| D8 | Cinque strati: `core/`, `contract/`, `desktop/`, `ui/`, `cli/` ([ARCHITETTURA.md](ARCHITETTURA.md)). |
| D9 | `contract/` ha la forma di tRPC senza tRPC: `router()`, `chiamante()` tipizzato, `Link`. |
| D10 | La riga di comando resta nuda: solo moduli `node:`, nessuna dipendenza, nessuna build. |
| D11 | `core/` diventa puro invertendo `apparato`, non riscrivendo (ARCHITETTURA § 3). |
| D12 | `core/` importa da `contract/` solo tipi. |
| D13 | Le regole degli strati le verifica `npm run layers`. |
| D14 | I nomi dicono il ruolo, non un prodotto (`apparato`, non `vscode`): ADR-02. |

## 2. Lavoro aperto

### Archivio e sincronizzazione

- [ ] Due PC sullo stesso `.regi`: con il file cambiato fuori, `salva` fa
      `rifai` di tutte le voci in memoria (`core/dati/package.ts`, «chi salva
      per ultimo copre») e cancella il lavoro dell'altro, anche in collezioni
      non toccate. Proposta: riaprire dal disco e riapplicare solo le
      collezioni pendenti; conflitto sulla stessa collezione → copia accanto e
      avviso. Decisione strutturale (ADR-19): da scrivere in DECISIONI prima.


### Impostazioni

- [ ] Riordino delle pagine Impostazioni secondo [PIANO-IMPOSTAZIONI.md](PIANO-IMPOSTAZIONI.md):
      fase 0 (guasti G1–G8) fatta; restano contratto dei controlli, gerarchia
      ad aree, doppioni (piano § 7). Decisioni aperte in § 8 del piano.


### Strati

- [ ] Otto deroghe dichiarate in `tools/layers.mjs` (`DEROGHE`), da togliere
      una per una: `contract/` → `desktop/azioni/projection.ts` (cinque: la
      proiezione va chiesta dall'apparato); `core/azioni/system.ts` →
      `desktop/apparato/settings.ts` (impostazioni dichiarate in `core/` o
      passate dall'apparato); `core/dominio/schoolCalendar.ts` →
      `core/dati/schoolCalendars.ts` e `ui/pannello/forms/schoolCalendar.ts` →
      `core/dati/schoolCalendarTicino.ts` (i calendari generati sono dati puri:
      indice nel dominio).


### Sicurezza

- [x] `desktop/apparato/theme.ts`: finestre col ponte con `sandbox:false`;
      preload in bundle senza `require` di Node (`sandbox: true`).
- [x] Fuses Electron (`NodeOptions`, `NodeCliInspect`, asar integrity):
      `RunAsNode` serve a `regi` (`electronFuses` in `electron-builder.json`).
- [x] `node-llama-cpp` nel main process legge GGUF di depositi qualunque:
      `utilityProcess`, impronta fissata per il catalogo consigliato.
- [x] Dettatura: `127.0.0.1:17493` occupabile da un altro utente se voicebox è
      spento; token o verifica del processo.
- [x] Condotto: dopo un arresto brutale `condotto.segreto` resta; la riga di
      comando dovrebbe verificare il proprietario della pipe
      (`GetNamedPipeServerProcessId`).

### Prove

- [ ] Le viste di `ui/pannello` si provano su Chromium (`tests/interfaccia/`), che
      `npm run copertura` non vede: funzioni al 13%. Misurarle o accettarlo.
- [ ] Mutanti sopravvissuti (misura di prima, `deletions.ts` 87%,
      `calculations.ts:330-735` 97,7%): piano eliminato senza prova che
      dichiari `lezioni` (~:755); guardie `n > 0` delle perdite (~:343-413: una
      perdita a zero non deve comparire); `calculations.ts` ~:344 (lezione
      senza appello nei dati di prova). Rimisurare con `npm run mutanti`.
- [ ] In locale gira Node 26.7, il progetto e la CI chiedono Node 24: `npm ci`
      e le prove vanno ripetute con la versione giusta.

### Modelli e assistente

- [ ] Le scansioni senza programma esterno, il giorno in cui `node-llama-cpp`
      accetta immagini: via `mtmd.ts` e `ocr.programma`.

### Rilascio, firma, nome

- [ ] SignPath (differito): domanda come Regiklass (progetto `regiklass`); 2FA; app GitHub;
      configurazioni `eseguibile` e `installatori`; politica
      `release-signing`; segreto e variabile su GitHub (GUIDA § «La firma del
      codice»).
- [ ] Prima release firmata: togliere l'avviso SmartScreen dal README e «quando
      la firma sarà attiva» da SECURITY.
- [ ] Sei pacchetti MIT di produzione senza file LICENSE (`npm run licenze` li
      elenca): `@reflink/reflink`, `@reflink/reflink-win32-x64-msvc`,
      `simple-git`, `@simple-git/args-pathspec`, `@simple-git/argv-parser`,
      `lazy-val`. L'avviso MIT va portato nel pacchetto per altra via.

### Da provare a mano

- [ ] «Disinstalla…» su macOS, AppImage, portabile, Windows installato.
