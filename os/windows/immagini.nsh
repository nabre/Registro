; Le immagini della procedura, posate senza deformarle.
;
; Modern UI stira ogni immagine nel suo riquadro in unità di dialogo
; (`FitControl`), che dipendono dal carattere («Segoe UI» 9) e
; dall'ingrandimento: le proporzioni della bitmap non tornano più.
; `AspectFitHeight` e `NoStretchNoCrop` non scalano, e le nostre bitmap sono
; disegnate più grandi. Quindi, appena la pagina c'è, si ricarica l'immagine
; alla misura giusta:
;
; - `copri`: la fascia riempie il riquadro, l'eccedenza si taglia a metà per parte;
; - `contieni`: la testata sta dentro, accostata a destra e centrata in altezza.
;
; Si rimpicciolisce con `HALFTONE` (media dei pixel): `LoadImage` salta i pixel
; e fa i bordi a scalini.

!include LogicLib.nsh

; La funzione che adatta un'immagine, una per l'installatore e una per il
; disinstallatore: NSIS vuole il prefisso `un.` sulle funzioni di quest'ultimo.
;
; Sulla pila, dall'alto: il modo (`copri` o `contieni`), il file, il controllo.
; Lascia sulla pila, dall'alto, la bitmap nuova e quella che il controllo
; mostrava prima (0 se non è andata): liberarle è del chiamante, perché la
; vecchia a volte ha già un padrone.
!macro registroFunzioneImmagine UN
  Function ${UN}registroImmagine
    System::Store "S"
    Pop $R0 ; il modo
    Pop $R1 ; il file
    Pop $R2 ; il controllo

    ; Il riquadro del controllo, nelle coordinate della finestra che lo tiene.
    System::Call 'user32::GetParent(p R2) p.R3'
    System::Call '*(i 0, i 0, i 0, i 0) p.R4'
    System::Call 'user32::GetWindowRect(p R2, p R4)'
    System::Call 'user32::MapWindowPoints(p 0, p R3, p R4, i 2)'
    System::Call '*$R4(i .r1, i .r2, i .r3, i .r4)'
    System::Free $R4
    IntOp $3 $3 - $1
    IntOp $4 $4 - $2

    ; La bitmap alla sua misura vera: LR_LOADFROMFILE | LR_CREATEDIBSECTION.
    System::Call 'user32::LoadImage(p 0, t R1, i 0, i 0, i 0, i 0x2010) p.R5'
    StrCpy $R9 0
    ${If} $R5 P<> 0
    ${AndIf} $3 > 0
    ${AndIf} $4 > 0
      ; BITMAP: tipo, larghezza, altezza, …
      System::Call '*(&i32) p.R6'
      System::Call 'gdi32::GetObject(p R5, i 32, p R6)'
      System::Call '*$R6(i, i .r5, i .r6)'
      System::Free $R6

      ; La misura di arrivo, $7×$8, con le proporzioni della bitmap $5×$6.
      ; Il riquadro è più largo, in proporzione, della bitmap?
      IntOp $R6 $3 * $6
      IntOp $R7 $4 * $5
      ${If} $R0 == "copri"
        ${If} $R6 > $R7
          StrCpy $7 $3
          IntOp $8 $3 * $6
          IntOp $8 $8 / $5
        ${Else}
          StrCpy $8 $4
          IntOp $7 $4 * $5
          IntOp $7 $7 / $6
        ${EndIf}
      ${Else}
        ${If} $R6 > $R7
          StrCpy $8 $4
          IntOp $7 $4 * $5
          IntOp $7 $7 / $6
        ${Else}
          StrCpy $7 $3
          IntOp $8 $3 * $6
          IntOp $8 $8 / $5
        ${EndIf}
      ${EndIf}

      ; Ridisegnata alla misura di arrivo, con la media dei pixel.
      System::Call 'user32::GetDC(p 0) p.R3'
      System::Call 'gdi32::CreateCompatibleDC(p R3) p.R6'
      System::Call 'gdi32::CreateCompatibleDC(p R3) p.R7'
      System::Call 'gdi32::CreateCompatibleBitmap(p R3, i r7, i r8) p.R9'
      System::Call 'user32::ReleaseDC(p 0, p R3)'
      System::Call 'gdi32::SelectObject(p R6, p R5) p.R3'
      System::Call 'gdi32::SelectObject(p R7, p R9) p.R8'
      System::Call 'gdi32::SetStretchBltMode(p R7, i 4)'
      System::Call 'gdi32::SetBrushOrgEx(p R7, i 0, i 0, p 0)'
      System::Call 'gdi32::StretchBlt(p R7, i 0, i 0, i r7, i r8, p R6, i 0, i 0, i r5, i r6, i 0x00CC0020)'
      System::Call 'gdi32::SelectObject(p R6, p R3)'
      System::Call 'gdi32::SelectObject(p R7, p R8)'
      System::Call 'gdi32::DeleteDC(p R6)'
      System::Call 'gdi32::DeleteDC(p R7)'
      System::Call 'gdi32::DeleteObject(p R5)'

      ; Dove va il controllo, che un'immagine statica prende la misura della
      ; sua bitmap: `copri` lo centra sul riquadro e taglia quel che esce,
      ; `contieni` lo accosta a destra e lo centra in altezza.
      IntOp $5 $7 - $3
      IntOp $6 $8 - $4
      ${If} $R0 == "copri"
        IntOp $5 $5 / 2
        IntOp $6 $6 / 2
        IntOp $1 $1 - $5
        IntOp $2 $2 - $6
      ${Else}
        IntOp $1 $1 - $5
        IntOp $6 $6 / 2
        IntOp $2 $2 - $6
      ${EndIf}

      SendMessage $R2 0x0172 0 $R9 $R3 ; STM_SETIMAGE, IMAGE_BITMAP
      System::Call 'user32::SetWindowPos(p R2, p 0, i r1, i r2, i r7, i r8, i 0x14)'

      ${If} $R0 == "copri"
        ; Si vede solo il riquadro di Modern UI: il resto sta sotto le parole.
        IntOp $3 $3 + $5
        IntOp $4 $4 + $6
        System::Call 'gdi32::CreateRectRgn(i r5, i r6, i r3, i r4) p.R4'
        System::Call 'user32::SetWindowRgn(p R2, p R4, i 1)'
      ${EndIf}
    ${ElseIf} $R5 P<> 0
      System::Call 'gdi32::DeleteObject(p R5)'
    ${EndIf}

    Push $R3
    Push $R9
    System::Store "L"
  FunctionEnd
!macroend

; Le pagine con la fascia — benvenuto e fine — e la testata di tutte le altre.
; Si chiamano dal `SHOW` delle pagine e dal `GUIINIT` della finestra: vedi
; `installer.nsh` e `uninstall.nsh`, che le mettono al loro posto.
;
; Niente variabili di Modern UI (`$mui.WelcomePage.Image`…): la pagina di fine
; del disinstallatore le dichiara dopo l'ultima macro nostra. Il controllo è il
; primo che nsDialogs crea nella pagina, 1200.
!macro registroFunzioniImmagini UN
  !insertmacro registroFunzioneImmagine "${UN}"

  ; La bitmap di Modern UI resta sua, e la libera lui quando la pagina se ne
  ; va; la nostra si libera alla pagina con la fascia successiva.
  Function ${UN}registroFascia
    Var /GLOBAL registroFascia
    FindWindow $0 "#32770" "" $HWNDPARENT
    GetDlgItem $0 $0 1200
    Push $0
    Push "$PLUGINSDIR\modern-wizard.bmp"
    Push "copri"
    Call ${UN}registroImmagine
    Pop $0
    Pop $1
    ${If} $0 P<> 0
      ${If} $registroFascia P<> 0
        System::Call 'gdi32::DeleteObject(p $registroFascia)'
      ${EndIf}
      StrCpy $registroFascia $0
    ${EndIf}
  FunctionEnd

  ; La testata la carica Modern UI in `.onGUIInit`, nel controllo 1046, e la
  ; bitmap non la tiene: la vecchia si libera qui, la nuova resta finché resta
  ; la finestra.
  Function ${UN}registroTestata
    GetDlgItem $0 $HWNDPARENT 1046
    Push $0
    Push "$PLUGINSDIR\modern-header.bmp"
    Push "contieni"
    Call ${UN}registroImmagine
    Pop $0
    Pop $1
    ${If} $0 P<> 0
    ${AndIf} $1 P<> 0
      System::Call 'gdi32::DeleteObject(p r1)'
    ${EndIf}
  FunctionEnd
!macroend
