; L'aspetto e le parole della procedura d'installazione, che deve sembrare lo
; stesso programma: immagini coi colori dell'icona (`tools/icons.cjs`), fondo e
; carattere del registro.
;
; Gli aggiornamenti non vedono queste pagine: li conduce
; `os/windows/aggiornamento.ps1` con `/S --updated`, e con `--updated` le pagine
; si saltano comunque.
;
; electron-builder accetta un file incluso solo: `uninstall.nsh` si include da qui.

!include "${__FILEDIR__}\immagini.nsh"
!include "${__FILEDIR__}\uninstall.nsh"

; ------------------------------------------------------------- l'aspetto

; Nitida sugli schermi ingranditi: senza, Windows la allarga come un'immagine
; sfocata. Per questo le immagini sono disegnate al triplo.
ManifestDPIAware true

; Il carattere dell'interfaccia di Windows, come il registro (`--carattere`).
; Cambia le proporzioni dei riquadri delle immagini: le posa `immagini.nsh`.
SetFont "Segoe UI" 9

; `--sfondo` e `--testo` del tema chiaro (`src/ui/styles/theme.css`); il fondo
; è anche quello di `installerHeader.bmp`, che ci si deve confondere.
!define MUI_BGCOLOR "FAFAFA"
!define MUI_TEXTCOLOR "1A1A1D"

; Modern UI carica la testata stirandola: subito dopo la si ricarica con le sue proporzioni.
!ifdef BUILD_UNINSTALLER
  !define MUI_CUSTOMFUNCTION_UNGUIINIT un.registroTestata
!else
  !define MUI_CUSTOMFUNCTION_GUIINIT registroTestata
!endif

; Chiudere a metà chiede conferma: un'installazione interrotta non parte.
!define MUI_ABORTWARNING
!define MUI_UNABORTWARNING

; ------------------------------------------------------------ le parole
;
; Quattro lingue (`installerLanguages` in `electron-builder.json`), scelte nel
; selettore che apre la procedura: propone quella di Windows se è fra queste,
; altrimenti l'italiano, il primo caricato. Muta (gli aggiornamenti) il
; selettore non compare. Una `LangString` per lingua (1040 it, 1031 de, 1036 fr,
; 1033 en), letta con `$(nome)`.

; Il selettore viene prima di ogni lingua: il titolo è il marchio e la domanda
; è detta in tutte e quattro. Tutte le lingue anche se il code page di Windows
; non è il loro: altrimenti su un Windows giapponese l'elenco resterebbe vuoto.
!define MUI_LANGDLL_WINDOWTITLE "Regiklass"
!define MUI_LANGDLL_INFO "Lingua · Sprache · Langue · Language"
!define MUI_LANGDLL_ALLLANGUAGES
;
; L'ultimo paragrafo del benvenuto dice che cosa il registro cambia nel sistema
; (PATH per `regi`, apertura dei `.regi`, controllo degli aggiornamenti): lo
; chiede SignPath, uguale in ogni lingua.

LangString registroBenvenutoTitolo 1040 "Benvenuto in Regiklass"
LangString registroBenvenutoTitolo 1031 "Willkommen bei Regiklass"
LangString registroBenvenutoTitolo 1036 "Bienvenue dans Regiklass"
LangString registroBenvenutoTitolo 1033 "Welcome to Regiklass"

LangString registroBenvenutoTesto 1040 "Il registro di classe per chi insegna: il calendario delle lezioni, le classi e le persone in formazione, i piani lezione e i momenti di valutazione.$\r$\n$\r$\nNelle prossime pagine scegli per chi installarlo e dove. Non servono i permessi di amministratore, se lo installi solo per te.$\r$\n$\r$\nI documenti degli anni scolastici — i file .regi — stanno dove decidi tu, e l'installazione non li tocca.$\r$\n$\r$\nPer il tuo utente di Windows il registro aggiunge i collegamenti nel menu Start e sul desktop, l'apertura dei file .regi con un doppio clic e il comando regi nel PATH; la disinstallazione li toglie. Può chiedere a GitHub se c'è una versione nuova, senza mandare niente del registro: si attiva in Impostazioni › Programma › Aggiornamenti."
LangString registroBenvenutoTesto 1031 "Das Klassenbuch für Lehrpersonen: der Kalender der Stunden, die Klassen und die Lernenden, die Unterrichtspläne und die Leistungsbeurteilungen.$\r$\n$\r$\nAuf den nächsten Seiten wählst du, für wen und wohin es installiert wird. Installierst du es nur für dich, brauchst du keine Administratorrechte.$\r$\n$\r$\nDie Dokumente der Schuljahre — die .regi-Dateien — liegen, wo du willst, und die Installation rührt sie nicht an.$\r$\n$\r$\nFür dein Windows-Benutzerkonto fügt das Klassenbuch Verknüpfungen im Startmenü und auf dem Desktop hinzu, das Öffnen von .regi-Dateien per Doppelklick und den Befehl regi im PATH; die Deinstallation entfernt sie wieder. Es kann bei GitHub nachfragen, ob es eine neue Version gibt, ohne etwas aus dem Klassenbuch zu senden: Einschalten lässt sich das unter Einstellungen › Programm › Aktualisierungen."
LangString registroBenvenutoTesto 1036 "Le registre de classe pour celles et ceux qui enseignent : le calendrier des leçons, les classes et les personnes en formation, les plans de leçon et les évaluations.$\r$\n$\r$\nDans les pages suivantes, tu choisis pour qui l’installer et où. Pas besoin des droits d’administrateur si tu l’installes seulement pour toi.$\r$\n$\r$\nLes documents des années scolaires — les fichiers .regi — restent là où tu le décides, et l’installation n’y touche pas.$\r$\n$\r$\nPour ton utilisateur Windows, le registre ajoute les raccourcis dans le menu Démarrer et sur le bureau, l’ouverture des fichiers .regi par double-clic et la commande regi dans le PATH ; la désinstallation les retire. Il peut demander à GitHub s’il existe une nouvelle version, sans rien envoyer du registre : cela s’active dans Paramètres › Programme › Mises à jour."
LangString registroBenvenutoTesto 1033 "The class register for teachers: the lesson calendar, the classes and the learners, the lesson plans and the assessments.$\r$\n$\r$\nOn the next pages you choose who to install it for and where. You don’t need administrator rights if you install it just for yourself.$\r$\n$\r$\nThe school-year documents — the .regi files — stay wherever you decide, and the installation doesn’t touch them.$\r$\n$\r$\nFor your Windows user the register adds shortcuts in the Start menu and on the desktop, opening .regi files with a double-click and the regi command in the PATH; uninstalling removes them. It can ask GitHub whether there is a new version, without sending anything from the register: this can be turned on in Settings › Program › Updates."

LangString registroFineTitolo 1040 "Il registro è installato"
LangString registroFineTitolo 1031 "Das Klassenbuch ist installiert"
LangString registroFineTitolo 1036 "Le registre est installé"
LangString registroFineTitolo 1033 "The register is installed"

LangString registroFineTesto 1040 "Regiklass ${VERSION} è pronto. Lo trovi nel menu Start e sul desktop.$\r$\n$\r$\nLe versioni nuove si cercano nelle impostazioni con «Controlla adesso», o attivando la ricerca automatica: il registro le scarica e le installa quando esci, oppure premendo «Riavvia e aggiorna» — senza ripassare da queste pagine."
LangString registroFineTesto 1031 "Regiklass ${VERSION} ist bereit. Du findest es im Startmenü und auf dem Desktop.$\r$\n$\r$\nNeue Versionen werden in den Einstellungen mit «Jetzt prüfen» oder über die automatische Suche gesucht: Das Klassenbuch lädt sie herunter und installiert sie beim Beenden oder bei «Neu starten und aktualisieren» — ohne diese Seiten noch einmal zu durchlaufen."
LangString registroFineTesto 1036 "Regiklass ${VERSION} est prêt. Tu le trouves dans le menu Démarrer et sur le bureau.$\r$\n$\r$\nLes nouvelles versions se cherchent dans les paramètres avec « Vérifier maintenant », ou en activant la recherche automatique : le registre les télécharge et les installe quand tu le quittes, ou en appuyant sur « Redémarrer et mettre à jour » — sans repasser par ces pages."
LangString registroFineTesto 1033 "Regiklass ${VERSION} is ready. You’ll find it in the Start menu and on the desktop.$\r$\n$\r$\nNew versions are checked in Settings with “Check now”, or by turning on automatic checking: the register downloads and installs them when you quit, or when you press “Restart and update” — without going through these pages again."

LangString registroFineApri 1040 "Apri il registro adesso"
LangString registroFineApri 1031 "Klassenbuch jetzt öffnen"
LangString registroFineApri 1036 "Ouvrir le registre maintenant"
LangString registroFineApri 1033 "Open the register now"

; La pagina della disinstallazione che chiede che cosa tenere: `uninstall.nsh`.

LangString registroDatiTitolo 1040 "Dati del registro"
LangString registroDatiTitolo 1031 "Daten des Klassenbuchs"
LangString registroDatiTitolo 1036 "Données du registre"
LangString registroDatiTitolo 1033 "Register data"

LangString registroDatiSottotitolo 1040 "Scegli che cosa togliere insieme al programma."
LangString registroDatiSottotitolo 1031 "Wähle, was zusammen mit dem Programm entfernt wird."
LangString registroDatiSottotitolo 1036 "Choisis ce qui est retiré avec le programme."
LangString registroDatiSottotitolo 1033 "Choose what to remove along with the program."

LangString registroDatiSpiegazione 1040 "Il registro ha salvato per sé alcuni dati in «$APPDATA\${PRODUCT_NAME}». Quelli che lasci spenti restano, e li ritrovi se lo reinstalli. I documenti degli anni scolastici — i file .regi — non si toccano comunque."
LangString registroDatiSpiegazione 1031 "Das Klassenbuch hat einige Daten für sich in «$APPDATA\${PRODUCT_NAME}» gespeichert. Was du nicht ankreuzt, bleibt, und du findest es bei einer Neuinstallation wieder. Die Dokumente der Schuljahre — die .regi-Dateien — werden in keinem Fall angerührt."
LangString registroDatiSpiegazione 1036 "Le registre a enregistré pour lui quelques données dans « $APPDATA\${PRODUCT_NAME} ». Celles que tu laisses décochées restent, et tu les retrouves si tu le réinstalles. Les documents des années scolaires — les fichiers .regi — ne sont de toute façon pas touchés."
LangString registroDatiSpiegazione 1033 "The register saved some data for itself in “$APPDATA\${PRODUCT_NAME}”. What you leave unticked stays, and you’ll find it again if you reinstall. The school-year documents — the .regi files — are not touched in any case."

LangString registroDatiModelli 1040 "Modelli scaricati: modelli del linguaggio (.gguf), dettatura e lettura"
LangString registroDatiModelli 1031 "Heruntergeladene Modelle: Sprachmodelle (.gguf), Diktat und Lesen der Scans"
LangString registroDatiModelli 1036 "Modèles téléchargés : modèles de langage (.gguf), dictée et lecture des scans"
LangString registroDatiModelli 1033 "Downloaded models: language models (.gguf), dictation and scan reading"

LangString registroDatiAccount 1040 "Account: password della posta e collegamento con l'account Microsoft"
LangString registroDatiAccount 1031 "Konten: Mail-Passwörter und Verbindung mit dem Microsoft-Konto"
LangString registroDatiAccount 1036 "Comptes : mots de passe de la messagerie et liaison avec le compte Microsoft"
LangString registroDatiAccount 1033 "Accounts: email passwords and the link with the Microsoft account"

LangString registroDatiImpostazioni 1040 "Impostazioni: impostazioni del programma, registri recenti, finestre"
LangString registroDatiImpostazioni 1031 "Einstellungen: Programmeinstellungen, zuletzt geöffnete Klassenbücher, Fenster"
LangString registroDatiImpostazioni 1036 "Paramètres : paramètres du programme, registres récents, fenêtres"
LangString registroDatiImpostazioni 1033 "Settings: program settings, recent registers, windows"

LangString registroAssociazioneTipo 1040 "Anno scolastico Regiklass"
LangString registroAssociazioneTipo 1031 "Regiklass-Schuljahr"
LangString registroAssociazioneTipo 1036 "Année scolaire Regiklass"
LangString registroAssociazioneTipo 1033 "Regiklass school year"

!ifndef BUILD_UNINSTALLER
  !macro customWelcomePage
    !insertmacro skipPageIfUpdated
    !define MUI_WELCOMEPAGE_TITLE "$(registroBenvenutoTitolo)"
    !define MUI_WELCOMEPAGE_TEXT "$(registroBenvenutoTesto)"
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW registroFascia
    !insertmacro MUI_PAGE_WELCOME
    !insertmacro registroFunzioniImmagini ""
  !macroend

  !define MUI_FINISHPAGE_TITLE "$(registroFineTitolo)"
  !define MUI_FINISHPAGE_TEXT "$(registroFineTesto)"
  !define MUI_FINISHPAGE_RUN_TEXT "$(registroFineApri)"

  ; Copia della pagina finale di electron-builder (`assistedInstaller.nsh`), per
  ; poterle dare il `SHOW` della fascia. Se electron-builder cambia la sua, va riguardata.
  !macro customFinishPage
    !ifndef HIDE_RUN_AFTER_FINISH
      Function StartApp
        ${if} ${isUpdated}
          StrCpy $1 "--updated"
        ${else}
          StrCpy $1 ""
        ${endif}
        ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
      FunctionEnd

      !define MUI_FINISHPAGE_RUN
      !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !endif
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW registroFascia
    !insertmacro MUI_PAGE_FINISH
  !macroend

  !macro customInit
    ${if} $installMode == "current"
      ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\d199f7cf-2ae9-5477-aea0-9860e9f60bca" "UninstallString"
      ${if} $0 != ""
        ExecWait '$0 /S _?=$INSTDIR'
      ${endIf}
      ReadRegStr $0 HKLM "Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\d199f7cf-2ae9-5477-aea0-9860e9f60bca" "UninstallString"
      ${if} $0 != ""
        ExecWait '$0 /S _?=$INSTDIR'
      ${endIf}
    ${endIf}
  !macroend

  !macro customInstall
    ${if} $installMode == "all"
      WriteRegStr HKLM "Software\Classes\Regiklass" "" "$(registroAssociazioneTipo)"
    ${else}
      WriteRegStr HKCU "Software\Classes\Regiklass" "" "$(registroAssociazioneTipo)"
    ${endIf}
    !insertmacro registroLinguaAlRegistro
  !macroend

  ; ------------------------------------------- la lingua, dalla procedura al registro
  ;
  ; Chi ha scelto nel selettore una lingua diversa da quella di Windows la
  ; ritrova nel registro al primo avvio: la si scrive in `impostazioni.json`
  ; come `registroDocenti.aspetto.lingua` (`desktop/apparato/language.ts`).
  ; Lasciata quella proposta, il registro resta su «sistema» e segue Windows.
  ;
  ; Mai sopra una scelta già fatta: solo se il file delle impostazioni non c'è
  ; ancora, e se non c'è la cartella col nome di prima, che il registro
  ; trasloca all'avvio solo quando la nuova manca (`system/userData.ts`). Mai
  ; negli aggiornamenti, muti: lì `$LANGUAGE` non è una scelta.

  Var registroLinguaDiWindows

  ; `$LANGUAGE` prima del selettore è quella che NSIS ha ricavato da Windows.
  !macro preInit
    StrCpy $registroLinguaDiWindows $LANGUAGE
  !macroend

  !macro registroLinguaAlRegistro
    ${ifNot} ${Silent}
    ${andIfNot} ${isUpdated}
    ${andIf} $LANGUAGE != $registroLinguaDiWindows
      Push $0
      Push $1
      StrCpy $0 ""
      ${if} $LANGUAGE == 1040
        StrCpy $0 "it"
      ${elseIf} $LANGUAGE == 1031
        StrCpy $0 "de"
      ${elseIf} $LANGUAGE == 1036
        StrCpy $0 "fr"
      ${elseIf} $LANGUAGE == 1033
        StrCpy $0 "en"
      ${endIf}
      ; I dati sono dell'utente anche con un'installazione per tutti, come in `uninstall.nsh`.
      SetShellVarContext current
      ${if} $0 != ""
      ${andIfNot} ${FileExists} "$APPDATA\${PRODUCT_NAME}\impostazioni.json"
      ${andIfNot} ${FileExists} "$APPDATA\Regiclass\*.*"
        CreateDirectory "$APPDATA\${PRODUCT_NAME}"
        ClearErrors
        FileOpen $1 "$APPDATA\${PRODUCT_NAME}\impostazioni.json" w
        ${ifNot} ${Errors}
          FileWrite $1 '{$\r$\n  "registroDocenti.aspetto.lingua": "$0"$\r$\n}$\r$\n'
          FileClose $1
        ${endIf}
      ${endIf}
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endIf}
      Pop $1
      Pop $0
    ${endIf}
  !macroend
!endif

