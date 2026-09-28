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

### Modelli e assistente

- [ ] Le scansioni senza programma esterno, il giorno in cui `node-llama-cpp`
      accetta immagini: via `mtmd.ts` e `ocr.programma`.

### Rilascio, firma, nome

- [ ] SignPath: domanda come Regiklass (progetto `regiklass`); 2FA; app GitHub;
      configurazioni `eseguibile` e `installatori`; politica
      `release-signing`; segreto e variabile su GitHub (GUIDA § «La firma del
      codice»).
- [ ] Prima release firmata: togliere l'avviso SmartScreen dal README e «quando
      la firma sarà attiva» da SECURITY.
- [ ] Font Liberation 1.x di pdfjs (GPL con eccezione): i 2.x sono OFL, se
      chiesto. Sei pacchetti MIT senza file LICENSE.

### Da provare a mano

- [ ] «Disinstalla…» su macOS, AppImage, portabile, Windows installato.

### Questioni aperte

- [ ] Più docenti della stessa classe sullo stesso registro: nessuna struttura
      dice «di chi è» una scrittura.
