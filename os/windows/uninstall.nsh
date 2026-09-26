; Quel che la disinstallazione toglie oltre ai file del programma: lo fa
; `src/cli/disinstalla.mjs`, come la voce «Disinstalla…» sugli altri sistemi
; (dati, temporanei, `regi` e PATH, associazione dei `.regi`, avvio automatico).
;
; Lo esegue l'eseguibile del registro con `ELECTRON_RUN_AS_NODE`, in
; `customUnInstall` perché dopo i file del programma non ci sono più. Non
; durante un aggiornamento, dove il disinstallatore vecchio non deve togliere niente.

; ------------------------------------------------------ che cosa si tiene
;
; Dopo il benvenuto una pagina chiede che cosa togliere dei dati (modelli,
; account, impostazioni): quel che resta spento va a `disinstalla.mjs` come
; `--tieni`, coi nomi dei suoi `GRUPPI`. Il resto della cartella se ne va comunque.
; Con `/S` le pagine non si mostrano e si toglie tutto.
;
; Per questo `deleteAppDataOnUninstall` è spento in `electron-builder.json`. Se
; `disinstalla.mjs` fallisce e non si tiene niente, la cartella la toglie
; `customUnInstall`, sotto.

!ifdef BUILD_UNINSTALLER
  !include nsDialogs.nsh
  !include LogicLib.nsh

  Var sceltaModelli
  Var sceltaAccount
  Var sceltaImpostazioni
  Var tieni

  ; La fascia del benvenuto e della fine con le proporzioni giuste, e la
  ; testata: vedi `immagini.nsh`.
  !macro customUnWelcomePage
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.registroFascia
    !insertmacro MUI_UNPAGE_WELCOME
    !insertmacro registroFunzioniImmagini "un."
    UninstPage custom un.sceltaDati un.sceltaDatiFatta

    Function un.sceltaDati
      ${if} ${isUpdated}
        Abort
      ${endIf}
      !insertmacro MUI_HEADER_TEXT "$(registroDatiTitolo)" "$(registroDatiSottotitolo)"
      nsDialogs::Create 1018
      Pop $0
      ${if} $0 == error
        Abort
      ${endIf}

      ${NSD_CreateLabel} 0 0 100% 36u "$(registroDatiSpiegazione)"
      Pop $0

      ${NSD_CreateCheckbox} 0 42u 100% 12u "$(registroDatiModelli)"
      Pop $sceltaModelli
      ${NSD_Check} $sceltaModelli

      ${NSD_CreateCheckbox} 0 60u 100% 12u "$(registroDatiAccount)"
      Pop $sceltaAccount
      ${NSD_Check} $sceltaAccount

      ${NSD_CreateCheckbox} 0 78u 100% 12u "$(registroDatiImpostazioni)"
      Pop $sceltaImpostazioni
      ${NSD_Check} $sceltaImpostazioni

      nsDialogs::Show
    FunctionEnd

    Function un.sceltaDatiFatta
      StrCpy $tieni ""
      ${NSD_GetState} $sceltaModelli $0
      ${if} $0 != ${BST_CHECKED}
        StrCpy $tieni "$tieni,modelli"
      ${endIf}
      ${NSD_GetState} $sceltaAccount $0
      ${if} $0 != ${BST_CHECKED}
        StrCpy $tieni "$tieni,account"
      ${endIf}
      ${NSD_GetState} $sceltaImpostazioni $0
      ${if} $0 != ${BST_CHECKED}
        StrCpy $tieni "$tieni,impostazioni"
      ${endIf}
      ; Senza la virgola davanti, per chi legge il comando nel dettaglio.
      StrCpy $0 $tieni 1
      ${if} $0 == ","
        StrCpy $tieni $tieni "" 1
      ${endIf}
    FunctionEnd
  !macroend

  ; electron-builder la inserisce subito prima della pagina di fine: nessuna
  ; pagina in più, solo il `SHOW` di quella.
  !macro customUninstallPage
    !define MUI_PAGE_CUSTOMFUNCTION_SHOW un.registroFascia
  !macroend
!endif

!macro customUnInstall
  ${ifNot} ${isUpdated}
    System::Call 'Kernel32::SetEnvironmentVariable(t "ELECTRON_RUN_AS_NODE", t "1")i'
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\resources\app.asar.unpacked\src\cli\disinstalla.mjs" --eseguibile "$INSTDIR\${APP_EXECUTABLE_FILENAME}" --tieni "$tieni"'
    System::Call 'Kernel32::SetEnvironmentVariable(t "ELECTRON_RUN_AS_NODE", p 0)i'
    ; La rete sotto lo script, solo se non si tiene niente. I dati sono
    ; dell'utente anche con un'installazione per tutti; la cartella porta
    ; `PRODUCT_NAME`, non il nome dell'eseguibile.
    ${if} $tieni == ""
      SetShellVarContext current
      RMDir /r "$APPDATA\${PRODUCT_NAME}"
      ; Anche la cartella col nome precedente, se non è ancora stata spostata.
      RMDir /r "$APPDATA\Registro docenti"
      ${if} $installMode == "all"
        SetShellVarContext all
      ${endIf}
    ${endIf}
  ${endIf}
!macroend
