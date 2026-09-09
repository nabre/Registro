# Fase 4 — Menu, scorciatoie, impostazioni

**Rende possibile:** tutto quel che nel `.vsix` sta nella palette comandi o nelle
impostazioni di VS Code è raggiungibile anche nell'app.

> Leggere `00-premessa.md` prima di cominciare.

---

## Prerequisiti

- Le fasi 1, 2 e 3 sono chiuse e verificate.
- Leggere in `package.json`: `contributes.commands`, `contributes.keybindings`,
  `contributes.menus.commandPalette` e `contributes.configuration.properties`.
  Sono la sorgente di verità di questa fase.

## Perimetro

**Si crea:** `desktop/menu.ts`, `desktop/impostazioni.html`.
**Si modifica:** nulla di esistente.

---

## 1. Il menu

`desktop/menu.ts` costruisce il menu dell'applicazione **leggendo
`contributes.commands` e `contributes.keybindings` da `package.json`** e
richiamando `executeCommand`.

Leggere invece di ricopiare, di nuovo per la stessa ragione delle impostazioni
predefinite (fase 1 §5): un elenco ricopiato a mano diverge dall'originale nel
giro di pochi mesi, e la divergenza si scopre da un comportamento diverso fra
`.vsix` e app — cioè nel modo più scomodo possibile.

Le scorciatoie `ctrl+alt+r`, `ctrl+alt+t`, `ctrl+alt+n` diventano `accelerator`,
con `Ctrl` tradotto in `CommandOrControl` perché funzioni anche su macOS.

### Che cosa entra nel menu e che cosa no

I comandi che nel `.vsix` sono nascosti dalla palette — quelli con `"when": "false"`
in `contributes.menus.commandPalette` — restano fuori anche dal menu. Sono le
azioni dell'albero (`lezioneApri`, `lezioneDuplica`, `lezioneElimina`,
`pianoPerLezione`, `valutazioneDelCorso`, `orarioGenera`, `corsoEsportaPresenze`,
`apriElemento`) e senza albero non hanno un argomento su cui lavorare. Torneranno
alla fase 7.

Attenzione: questo vuol dire che dopo questa fase alcune funzioni del registro
restano irraggiungibili sul desktop finché non c'è l'albero. È voluto e va detto
all'utente, non aggirato inventando un selettore.

### Ordinamento suggerito

- **Registro** — apri, vai a oggi, nuova lezione, proietta per la classe
- **Nuovo** — classe, corso, piano lezione, momento di valutazione, anno scolastico
- **Posta** — collega la casella, prova il collegamento, scollega, azzera
- **Cartelle** — cartella dei dati, cassetta dei PDF in arrivo, cambia cartella di
  lavoro (il comando introdotto alla fase 2 §2)
- **Aiuto** — guida, avvio guidato

Su macOS il primo menu deve essere quello dell'applicazione, con le voci
canoniche: Electron non lo aggiunge da sé.

## 2. La finestra delle impostazioni

Sul desktop non c'è l'editor delle impostazioni di VS Code, e `registroDocenti.*`
ha una ventina di voci con descrizioni scritte con molta cura — vale la pena
rileggerle in `package.json` prima di cominciare: dicono cose che l'interfaccia
deve continuare a dire.

### Generare il modulo dallo schema

`contributes.configuration.properties` è già un JSON Schema completo: `type`,
`default`, `enum`, `enumDescriptions`, `description`, `format`.
`desktop/impostazioni.html` lo percorre e produce un campo per voce:

| `type` nello schema | Campo |
|---|---|
| `boolean` | interruttore |
| `number` con `enum` | elenco a discesa, con `enumDescriptions` come aiuto per voce |
| `number` senza `enum` | campo numerico |
| `string` con `enum` | elenco a discesa |
| `string` con `format: 'email'` | campo testo con validazione |
| `string` | campo testo |

`description` va sotto ogni campo come testo d'aiuto. Sono descrizioni lunghe e
discorsive — è lo stile del progetto — quindi il modulo deve essere pensato per
righe di testo generose, non per una griglia stretta.

Il vantaggio non è risparmiare lavoro adesso: è che aggiungendo domani
un'impostazione al `package.json` per il `.vsix`, la finestra del desktop se la
trova già.

### Due voci vanno escluse

- **`posta.autenticazione`** — la imposta il comando «collega la casella», che è
  quel che dice la sua stessa descrizione. Lasciarla modificabile a mano vuol dire
  invitare l'utente a metterla in uno stato incoerente con il portachiavi.
- **`proiezione.finestraSeparata`** — sul desktop non fa niente (fase 3 §2).

### Il salvataggio

Scrivere passando da `workspace.getConfiguration(…).update(…)`, non toccando il
JSON direttamente: è quel che fa scattare `onDidChangeConfiguration`, ed è così
che `estensione.ts` si accorge di un cambio di `cartellaDati` e ricarica, e che
`pannello.ts` si accorge di un cambio in `ocr` e ridisegna. Scrivere il file a
mano vorrebbe dire un'app che chiede di essere riavviata per una spunta.

---

## Criterio di accettazione

- [ ] tutti i comandi di `contributes.commands` non nascosti dalla palette sono nel
      menu e funzionano
- [ ] le tre scorciatoie funzionano
- [ ] le impostazioni si modificano dalla finestra
- [ ] cambiando `cartellaDati` il registro ricarica **senza riavviare**
- [ ] cambiando `ocr.attivo` il pannello se ne accorge **senza riavviare**
- [ ] aggiungendo a mano una voce finta in `contributes.configuration.properties`,
      la finestra la mostra senza altre modifiche (poi togliere la voce finta)
- [ ] `npm run controllo-tipi`, `npm test`, `npm run pacchetto` verdi
- [ ] le quattro prove manuali di `00-premessa.md` §6 passano

