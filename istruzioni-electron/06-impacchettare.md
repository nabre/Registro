# Fase 6 — Impacchettare

**Rende possibile:** l'app si installa e si apre su una macchina che non ha né
Node né VS Code.

> Leggere `00-premessa.md` prima di cominciare.

---

## Prerequisiti

- Le fasi da 1 a 5 sono chiuse e verificate.
- Avere a disposizione una macchina (o una macchina virtuale) **pulita**, senza
  Node, senza VS Code, senza la cartella del progetto. Senza quella, questa fase
  non si può chiudere: l'unica prova che conta è l'installazione da zero.

## Perimetro

**Si crea:** `electron-builder.json`.
**Si modifica:** `package.json` (solo lo script `pacchetto:desktop`, già previsto
alla fase 1).

---

## 1. La configurazione

```json
{
  "appId": "ch.edu.ti.cptt.registro-docenti",
  "productName": "Registro docenti",
  "directories": { "output": "pacchetti" },
  "extraMetadata": { "main": "dist-desktop/principale.cjs" },
  "files": ["dist-desktop/**/*", "desktop/*.html", "media/**/*", "package.json"],
  "asarUnpack": ["**/pdf.worker.mjs"],
  "win": { "target": ["nsis", "portable"] },
  "nsis": { "oneClick": false, "allowToChangeInstallationDirectory": true }
}
```

### `extraMetadata.main`

Serve perché il campo `main` del `package.json` deve restare `./dist/estensione.js`
per il `.vsix`. `extraMetadata` lo sovrascrive **solo** nel pacchetto prodotto,
lasciando intatto il file sul disco. È la ragione per cui non serve una seconda
`package.json`, con la manutenzione doppia che si porterebbe dietro.

### `asarUnpack` e il worker di pdfjs

pdfjs carica il worker con un `import()` di un file URL. Quell'`import()` **non
passa dal `fs` con la patch asar** che Electron installa: dentro un archivio asar
il caricamento fallisce, e l'errore non nomina l'asar, cosicché sembra un problema
di percorsi.

Il sintomo: lo smistamento dei PDF smette di funzionare **solo nella versione
impacchettata**, mentre in sviluppo va. Verificare che `extensionUri` punti ad
`app.asar.unpacked` per quel file, o tenere l'intera `dist-desktop/` fuori
dall'asar.

**Questa è la prima cosa da provare** dopo aver prodotto il primo pacchetto:
lasciar cadere un PDF nella cassetta `in-arrivo/` della versione installata.

### Il bersaglio `portable`

Merita attenzione, non è un di più. In una scuola l'installazione può richiedere
diritti che il docente non ha, e un eseguibile singolo su chiavetta è spesso
l'unica via realmente percorribile. Provarlo davvero, non solo produrlo.

Da verificare sulla versione portabile: `app.getPath('userData')` — dove finiscono
impostazioni e portachiavi — e se sia il caso di tenerli accanto all'eseguibile
invece che nel profilo dell'utente. Sono scelte con conseguenze diverse; **chiedere
prima di decidere**.

## 2. L'icona

`media/registro.svg` è l'icona dell'estensione. electron-builder vuole un `.ico`
per Windows (256×256 compreso) e un `.icns` per macOS. Generarli dall'SVG e metterli
in `build/`, che è dove electron-builder li cerca per convenzione.

## 3. La firma del codice

**Da riferire, non da risolvere in autonomia.**

Senza firma, Windows SmartScreen mostra all'apertura un avviso che dice, in
sostanza, che il programma non è attendibile. Su una macchina scolastica quell'avviso
può bastare a fermare un collega, o a far intervenire l'amministrazione.

Un certificato di firma costa (dell'ordine di qualche centinaio di franchi
all'anno) e va conservato con cura. Va detto all'utente e lasciato decidere a lui:
è una scelta che dipende da quante persone useranno l'app e da come, non dal
codice.

## 4. La versione

`package.json` è a `1.0.0`, ed è la versione del `.vsix`. electron-builder legge
la stessa. Va bene: l'app e l'estensione sono lo stesso prodotto e hanno senso con
lo stesso numero. Dirlo in un commento, perché la prima reazione di chi arriva dopo
è separarle.

---

## Criterio di accettazione

Su una macchina **pulita**:

- [ ] l'installer NSIS installa e apre l'app
- [ ] all'apertura l'app chiede la cartella di lavoro
- [ ] scegliendo una cartella con un registro esistente, i dati si vedono
- [ ] scegliendo una cartella vuota, l'avvio guidato parte
- [ ] **lo smistamento di un PDF funziona** (la prova dell'asar)
- [ ] i PDF dei rapporti si generano
- [ ] la proiezione si apre sul secondo schermo
- [ ] l'eseguibile portabile funziona da una chiavetta
- [ ] chiudendo dalla X e riaprendo, l'ultima modifica c'è

E sulla macchina di sviluppo:

- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` ancora verdi
- [ ] il `.vsix` prodotto si installa ancora in VS Code e funziona
- [ ] la prova 4 di `00-premessa.md` §6: `.vsix` e app aprono lo stesso registro
      senza che nessuno dei due migri niente

