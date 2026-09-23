; Quel che la disinstallazione toglie oltre ai file del programma.
;
; Il lavoro lo fa `src/cli/disinstalla.mjs`, lo stesso che la voce di menu
; «Disinstalla…» lancia sugli altri sistemi: la cartella dei dati, le cartelle
; temporanee rimaste indietro, `regdoc` e la sua voce nel PATH, l'associazione
; dei `.registro` e l'avvio automatico. Un elenco solo, in un posto solo.
;
; Lo esegue l'eseguibile del registro con `ELECTRON_RUN_AS_NODE`, perché un
; Node sulla macchina di un docente non c'è. Va fatto qui, in `customUnInstall`,
; perché dopo questa macro i file del programma non ci sono più.
;
; Se non va in porto, la cartella dei dati la toglie comunque electron-builder,
; per via di `deleteAppDataOnUninstall` in `electron-builder.json`.
;
; Non durante un aggiornamento: l'installer nuovo chiama il disinstallatore del
; vecchio, e lì non c'è niente da togliere.

!macro customUnInstall
  ${ifNot} ${isUpdated}
    System::Call 'Kernel32::SetEnvironmentVariable(t "ELECTRON_RUN_AS_NODE", t "1")i'
    ExecWait '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "$INSTDIR\resources\app.asar.unpacked\src\cli\disinstalla.mjs" --eseguibile "$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
    System::Call 'Kernel32::SetEnvironmentVariable(t "ELECTRON_RUN_AS_NODE", p 0)i'
  ${endIf}
!macroend
