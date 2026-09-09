# Fase 5 — La posta

**Rende possibile:** collegare la casella e mandare una comunicazione alle famiglie.
**È la fase con più incognite**, e va affrontata solo dopo che il resto funziona.

> Leggere `00-premessa.md` prima di cominciare.

---

## Prerequisiti

- Le fasi da 1 a 4 sono chiuse e verificate.
- Leggere `src/dati/oauth.ts` per intero (592 righe): è il file che decide questa
  fase. In particolare `modoAccesso()` (riga ~120), `sessioneVsCode()` (riga ~200)
  e il flusso device-code (righe ~400-470).
- Leggere `src/dati/exchange.ts` righe 80-160 (il portachiavi e il conto) e
  `src/dati/posta.ts` righe 650-720 (`collegaAccount`).

## Perimetro

**Si crea:** `src/ambiente/autenticazione.ts`.
**Si modifica:** `src/dati/oauth.ts`, **una stringa sola** (§3). Nient'altro.

---

## Il punto di partenza

`dati/oauth.ts` conosce tre modi di entrare nella casella:

| Modo | Che cos'è | Sul desktop |
|---|---|---|
| `vscode` | l'account Microsoft di VS Code, dal menu degli account | **non esiste** |
| `oauth` | il flusso device-code, con il codice da incollare nel browser | funziona |
| `password` | una password per le app, generata dal profilo Microsoft | funziona |

Il modo `vscode` è il predefinito nel `package.json`, ed è l'unica cosa che VS Code
regalava e che Electron non ha.

## 1. `authentication` restituisce niente

`src/ambiente/autenticazione.ts`:

- `getSession(...)` restituisce `null`
- `onDidChangeSessions` è un emettitore che non emette mai

Così `sessioneVsCode()` ripiega, che è esattamente il comportamento voluto: il
codice per ripiegare esiste già ed è provato.

**Non lanciare un errore** da `getSession`: `oauth.ts` si aspetta un `null`, e un
errore risalirebbe fino all'utente sotto forma di «impossibile collegare la
casella» invece di far scattare il ripiego.

## 2. Il predefinito diventa `oauth`

Già previsto nella fase 1 §5, da verificare qui sul campo:

- il predefinito del target desktop per `registroDocenti.posta.autenticazione` è
  `oauth`
- se il file contiene `vscode` — perché l'utente arriva dal `.vsix`, o perché ha
  sincronizzato le impostazioni — va **letto come `oauth`**, senza riscriverlo

Il flusso device-code già scritto in `oauth.ts` diventa così la via principale.
Usa `env.clipboard.writeText`, `env.openExternal`, `showInformationMessage` con
bottoni e `withProgress`: tutto coperto dalle fasi 2 e 3.

**Dovrebbe funzionare senza toccare `oauth.ts`. Provare prima di scrivere
qualunque cosa.** Se non funziona, il difetto è quasi certamente in uno di quei
quattro pezzi dello shim, non nel flusso.

## 3. L'unica stringa da correggere

`oauth.ts`, riga ~379, dentro le istruzioni che il registro stampa all'utente per
registrare l'applicazione su `entra.microsoft.com`:

```
'4. URI di reindirizzamento: scegli «Client pubblico / nativo (desktop e
dispositivi mobili)» e metti https://vscode.dev/redirect. Registra.'
```

Sul desktop l'URI di reindirizzamento non è più quello di VS Code. **Va corretto**,
o l'utente registra l'applicazione con un valore sbagliato e si trova un errore
di Microsoft che non ha modo di interpretare.

Con il flusso device-code l'URI di reindirizzamento non serve affatto: la voce va
tolta o sostituita con quel che serve davvero. Verificare sulla documentazione
Microsoft corrente prima di scrivere il testo nuovo — e scriverlo nella stessa
lingua e nello stesso tono del resto di quelle istruzioni, che sono scritte con
cura per un docente, non per uno sviluppatore.

Nella stessa area c'è anche la descrizione di `posta.clientId` in `package.json`,
che nomina `https://vscode.dev/redirect` e `ms-appx-web://Microsoft.AAD.BrokerPlugin/`:
per il `.vsix` resta giusta. Se serve differenziarla, farlo nella finestra delle
impostazioni del desktop (fase 4), **non** modificando il `package.json`.

## 4. Quel che funziona senza toccare niente

- **`dati/exchange.ts`** — SMTP su `smtp.office365.com`. Gira già in Node: il
  portachiavi arriva dallo shim (fase 1 §6) e il resto è identico.
- **`dati/outlook.ts`** — PowerShell e COM di Outlook classico. Gira già in Node
  con `execFile('powershell.exe', …)`. Verificare soltanto che `outlookPossibile()`
  continui a riconoscere Windows: sul desktop `process.platform` è lo stesso, ma
  vale la pena provarlo davvero.
- **Le bozze `.eml`** — `posta.ts` le scrive in `esportazioni/` e le apre con il
  programma predefinito. Passa da `showTextDocument`, che alla fase 3 è diventato
  `shell.openPath`: è la via giusta, e sul desktop funziona meglio che dentro
  VS Code.

---

## Criterio di accettazione

- [ ] «collega la casella di posta» arriva in fondo e salva nel portachiavi
- [ ] «prova il collegamento della posta» risponde in modo sensato
- [ ] la password sopravvive alla chiusura e riapertura dell'app
- [ ] una comunicazione parte davvero, **oppure** produce un `.eml` che si apre nel
      programma di posta
- [ ] «azzera la posta» toglie tutto e il collegamento si può rifare da capo
- [ ] su Windows con Outlook classico installato, la via `bozze: outlook` funziona
- [ ] `git diff` mostra **una sola** modifica a un file esistente, e è una stringa
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi

---

## Una nota per chi prova

Questa fase si prova con una casella vera, in un tenant scolastico, con le sue
regole. Alcuni tenant rifiutano le password per le app; altri non autorizzano il
`clientId` di VS Code sulla posta (errore `AADSTS65002`) e obbligano a registrarne
uno proprio — `oauth.ts` lo spiega già all'utente quando capita.

Se il collegamento non riesce, **prima di modificare il codice** stabilire se il
rifiuto viene dal tenant o dallo shim: sono due guasti che si somigliano e portano
in direzioni opposte. Il segnale utile è il codice d'errore di Microsoft, che
`oauth.ts` già propaga.

