# Regiklass

Applicazione desktop Electron/TypeScript per gestire un registro di classe. Il
codice, i nomi di dominio, i commenti e la documentazione sono in italiano; i
nomi dei file sono in inglese (ADR-53).

## Prima di modificare

- Leggi `docs/CANTIERE.md` per il lavoro aperto e `docs/DECISIONI.md` prima di
  cambiare un vincolo strutturale.
- Per orientarti usa `docs/INDICE.md`; non duplicare nei documenti fatti già
  descritti altrove.
- Scrivi come il codice vicino. I commenti spiegano il perché, non il codice.
- Non allegare né committare documenti `.regi` reali: possono contenere dati
  personali. I campioni ammessi sono sotto `tests/samples/`.

## Comandi

| Comando | Scopo |
| --- | --- |
| `npm ci` | Installa esattamente le dipendenze del lockfile; richiede Node.js 24. |
| `npm run dev` | Avvia Electron («Regiklass-dev», bundle in `dist-dev/`) con build in ascolto e ricarica; Ctrl+Shift+F12 apre le opzioni di sviluppo; convive con `npm run start`. |
| `npm run build` | Compila una volta in `dist/`. |
| `npm run typecheck` | Controlla i tipi del TypeScript e, via JSDoc, di `cli/` e `tools/`. |
| `npm run lint` | Esegue ESLint; i warning `max-len` non sono errori. |
| `npm test` | Ricostruisce `dist-tests/` ed esegue i test `node:test`. |
| `npm run ui-tests` | Esegue i test UI; richiede `npx playwright install chromium`. |
| `npm run ci` | Ripete localmente i passi di `.github/workflows/verifica.yml`. |
| `npm run clean` | Elimina bundle e cache quando si sospettano artefatti vecchi. |

Prima di dichiarare concluso un cambiamento esegui `npm run ci -- --solo verifica`.
La spiegazione dei controlli e dei falsi positivi noti è in
`.claude/skills/verifica/SKILL.md`.

## Architettura

```text
core/       dominio puro, dati e archivio, azioni applicative, i18n, apparato
contract/   protocollo, manifesto, procedure API, centralino, bridge, schemi
desktop/    guscio Electron (shell/), apparato host, pannelli webview, trasporti, widget, avvio
ui/         interfaccia del pannello webview (views, forms, components)
cli/        client a riga di comando autonomo (cli/main.mjs)
templates/  sorgenti dei rapporti stampabili
tools/      build, generatori e controlli statici del progetto
tests/      test API, dominio, ambiente, dati e interfaccia
```

Il flusso principale è UI/CLI → azioni o procedure → dominio/dati. Non
aggirare i confini: `npm run layers` li verifica. La descrizione completa è in
`docs/ARCHITETTURA.md`.

## Skill locali obbligatorie

Apri la skill pertinente prima di intervenire:

- `.claude/skills/architettura/SKILL.md`: i cinque strati (core, contract,
  desktop, ui, cli), regole di isolamento e verifica con `npm run layers`.
- `.claude/skills/impostazione/SKILL.md`: aggiungere, cambiare o togliere
  impostazioni.
- `.claude/skills/procedure-api/SKILL.md`: procedure, schemi, API, condotto,
  CLI e strumenti dell'assistente.
- `.claude/skills/formato/SKILL.md`: campi persistiti, migrazioni e
  compatibilità dei documenti `.regi`.
- `.claude/skills/testi/SKILL.md`: qualsiasi testo visibile o traduzione; le
  lingue sono italiano, tedesco, francese e inglese.
- `.claude/skills/verifica/SKILL.md`: verifica finale e lettura dei controlli.
- `.claude/skills/sciame/SKILL.md`: lavori larghi con agenti o perimetri
  paralleli disgiunti.

## Regole non ovvie

- Una funzione visibile richiede anche l'aggiornamento della guida in
  `ui/views/help/`; `tests/ui/help.test.mjs` ne controlla la coerenza.
- Non modificare a mano `resources/tools.json`,
  `core/dati/defaultTemplates.ts`, `core/dominio/schoolCalendarTicino.ts`,
  `core/dati/recommendedModels.ts` o `tests/samples/anno_esempio.regi`:
  rigenerali con gli script indicati in `docs/GUIDA.md`.
- Una lettura non deve scrivere né creare file. Le scritture dichiarano le
  collezioni toccate e passano da `contesto.modifica`.
- Un export senza consumatori non implica codice morto: se il comportamento è
  vivo, rendilo interno; cancellalo solo dopo una prova.
- Non aggiornare i conteggi documentali a memoria: usa i controlli e i test che
  li derivano dal codice.
- Chiesta una release nuova, prima di alzare `package.json` compatta
  `VERSIONE_DATI`: skill `formato` § «Compattare prima di una release».
- Una voce di `docs/CANTIERE.md` si rimuove soltanto quando il lavoro è fatto e
  la verifica richiesta è verde.
