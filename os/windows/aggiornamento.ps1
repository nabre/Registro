<#
.SYNOPSIS
  La finestra dell'aggiornamento: chiude, installa, verifica e riapre il registro.

.DESCRIPTION
  La lancia `src/environment/updateInstaller.ts` quando una versione nuova è
  scaricata e si è premuto «Riavvia e aggiorna», o quando si esce dal registro
  con «installa alla chiusura» acceso. Non la lancia nessun altro.

  Una finestra a parte perché l'installatore non può sostituire i file mentre
  il registro gira; PowerShell 5.1 e WPF ci sono su ogni Windows 10. Il
  registro copia script e icona nei temporanei: a metà aggiornamento la
  cartella del programma è vuota.

    1. Aspetta che il registro abbia salvato e sia uscito (il processo che l'ha
       lanciato, poi ogni processo della cartella del programma): l'installatore
       chiude il registro dopo un secondo e mezzo, anche a salvataggio in corso.
    2. Lancia l'installatore muto (`/S`), da aggiornamento (`--updated`: tiene i
       dati) e nella stessa cartella (`/D=`).
    3. Misura l'avanzamento (archivio estratto, file copiati) rispetto alla
       cartella di prima; se non trova dove lavora l'installatore, la barra
       scorre senza percentuale.
    4. Controlla la versione scritta nell'eseguibile, non solo il codice
       d'uscita: un'installazione per tutti gli utenti si rilancia da
       amministratore e il codice non dice com'è andata.
    5. Riapre il registro, aspetta il file `riaperto` (scritto da
       `concludiAggiornamento()` a riquadro d'avvio visibile) e se ne va.

  Parla con il registro via file nella cartella di lavoro: `stato.json` (da
  qui), `riaperto` e `apri` (dal registro nuovo). `diario.txt` resta solo se
  qualcosa va storto.

  Il file va salvato in UTF-8 con BOM: senza, PowerShell 5.1 usa la codepage
  di sistema e rovina gli accenti.

.PARAMETER Parametri
  Il percorso di `parametri.json`, scritto dal registro accanto allo script.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$Parametri
)

$ErrorActionPreference = 'Stop'

$lavoro = Split-Path -Parent $Parametri
$fileStato = Join-Path $lavoro 'stato.json'
$fileDiario = Join-Path $lavoro 'diario.txt'
$fileRiaperto = Join-Path $lavoro 'riaperto'
$fileApri = Join-Path $lavoro 'apri'

# Senza BOM: `stato.json` lo legge `JSON.parse`, che davanti al BOM si ferma.
# In lettura lo si salta comunque, se c'è.
$senzaBom = New-Object Text.UTF8Encoding($false)

function Diario ([string]$testo) {
  try {
    $riga = '{0:yyyy-MM-dd HH:mm:ss.fff} {1}' -f (Get-Date), $testo
    [IO.File]::AppendAllText($fileDiario, $riga + "`r`n", $senzaBom)
  } catch { }
}

# Lo stato si scrive di fianco e poi si sposta: nessuno legge un JSON tronco.
function Scrivi-Stato ([string]$fase, [hashtable]$altro = @{}) {
  try {
    $dati = @{ fase = $fase; pid = $PID; quando = (Get-Date).ToString('o') }
    foreach ($chiave in $altro.Keys) { $dati[$chiave] = $altro[$chiave] }
    $provvisorio = $fileStato + '.tmp'
    [IO.File]::WriteAllText($provvisorio, ($dati | ConvertTo-Json -Compress), $senzaBom)
    Move-Item -LiteralPath $provvisorio -Destination $fileStato -Force
  } catch {
    Diario "stato non scritto: $($_.Exception.Message)"
  }
}

try {
  $p = [IO.File]::ReadAllText($Parametri, $senzaBom) | ConvertFrom-Json
  foreach ($campo in 'installatore', 'cartella', 'eseguibile', 'pid', 'da', 'a', 'tema', 'pagina') {
    if ($null -eq $p.$campo -or "$($p.$campo)" -eq '') { throw "manca il parametro «$campo»" }
  }
  Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
} catch {
  Diario "avvio non riuscito: $($_.Exception.Message)"
  Scrivi-Stato 'guasto' @{ errore = $_.Exception.Message }
  exit 1
}

Diario "aggiornamento dalla $($p.da) alla $($p.a) in «$($p.cartella)»"

# ------------------------------------------------------------------ le parole
#
# La lingua è quella del registro (`lingua` in `parametri.json`), non di
# Windows; se sconosciuta, l'italiano. I dati entrano con `{0}` e `-f`.
# Attenzione: PowerShell prende ‘ ’ per apici semplici e “ ” per doppi, quindi
# l'apostrofo tipografico va fra doppi apici e le virgolette inglesi fra semplici.

$testiPerLingua = @{
  it = @{
    Titolo = 'Aggiornamento di Regiclass'
    Sottotitolo = 'Aggiornamento dalla versione {0} alla {1}'
    Piede = "Il documento dell’anno non si tocca. Non spegnere il computer finché non ha finito."
    Passo1 = 'Salvataggio e chiusura del registro'
    Passo2 = 'Installazione della versione {0}'
    Passo3Riapri = 'Riapertura del registro'
    Passo3Verifica = "Verifica dell’installazione"
    InstallatoreSparito = "Il file dell’installatore non c’è più: forse l’ha tolto l’antivirus o la pulizia del disco."
    InstallatoreSparitoDettaglio = 'Riapri il registro: lo scaricherà di nuovo. Oppure scarica la versione nuova dalla pagina delle release.'
    Preparo = 'Preparo i file della versione nuova…'
    Amministratore = 'Windows chiede il permesso di amministratore: conferma per proseguire.'
    NonPartito = "L’installatore non è partito."
    InterrottaAMeta = "L’installazione si è interrotta a metà: il programma non è più al suo posto."
    InterrottaDettaglio = "Riprova, oppure scarica l’installatore dalla pagina delle release. Codice d’uscita: {0}."
    Annullata = "L’installazione è stata annullata, e la versione di prima è rimasta al suo posto."
    AnnullataDettaglio = "Se Windows ha chiesto il permesso di amministratore, serve un «Sì». Codice d’uscita: {0}."
    NonRiuscita = "L’installazione non è andata a buon fine: c’è ancora la versione {0}."
    Codice = "Codice d’uscita: {0}."
    Installato = 'Regiclass {0} è installato.'
    LaTrovi = 'La trovi alla prossima apertura. Questa finestra si chiude da sé.'
    ApriRegistro = 'Apri il registro'
    Chiudi = 'Chiudi'
    Riapro = 'Riapro il registro…'
    PrendeIlPosto = 'Il registro nuovo prende il posto di questa finestra.'
    NonRiaperto = 'Il registro è aggiornato, ma non si è riaperto da sé.'
    RiprovaAdAprirlo = 'Riprova ad aprirlo'
    NonRiuscito = "L’aggiornamento non è riuscito."
    Diario = 'Il diario è in «{0}».'
    Riprova = 'Riprova'
    PaginaRelease = 'Pagina delle release'
    Salvo = 'Salvo quel che hai scritto e chiudo il registro…'
    Aspetto = 'Aspetto che il registro abbia chiuso tutte le sue finestre…'
    Estraggo = 'Estraggo i file della versione nuova…'
    Copio = 'Copio i file nella cartella del programma…'
    Lento = "Ci sta mettendo più del solito: di solito è l’antivirus che controlla i file nuovi."
    VentiMinuti = "L’installatore lavora da più di venti minuti senza finire."
    VentiMinutiDettaglio = 'Potrebbe essere fermo su una domanda nascosta. Chiudi questa finestra e riavvia il computer prima di riprovare.'
    Aggiornato = 'Il registro è aggiornato.'
    NonAncoraAperto = "Il registro non si è ancora aperto. Forse è partito nascosto accanto all’orologio."
    Pronto = 'Regiclass {0} è pronto.'
    Storto = "Qualcosa è andato storto mentre seguivo l’installazione."
  }
  de = @{
    Titolo = 'Aktualisierung von Regiclass'
    Sottotitolo = 'Aktualisierung von Version {0} auf {1}'
    Piede = 'Das Dokument des Schuljahrs wird nicht angetastet. Schalte den Computer nicht aus, bis alles fertig ist.'
    Passo1 = 'Klassenbuch speichern und schliessen'
    Passo2 = 'Version {0} installieren'
    Passo3Riapri = 'Klassenbuch wieder öffnen'
    Passo3Verifica = 'Installation prüfen'
    InstallatoreSparito = 'Die Datei des Installationsprogramms ist nicht mehr da: Vielleicht hat sie der Virenschutz oder die Datenträgerbereinigung entfernt.'
    InstallatoreSparitoDettaglio = 'Öffne das Klassenbuch wieder: Es lädt sie erneut herunter. Oder lade die neue Version von der Seite der Releases herunter.'
    Preparo = 'Ich bereite die Dateien der neuen Version vor…'
    Amministratore = 'Windows fragt nach Administratorrechten: Bestätige, um fortzufahren.'
    NonPartito = 'Das Installationsprogramm ist nicht gestartet.'
    InterrottaAMeta = 'Die Installation wurde mittendrin unterbrochen: Das Programm ist nicht mehr an seinem Platz.'
    InterrottaDettaglio = 'Versuche es erneut, oder lade das Installationsprogramm von der Seite der Releases herunter. Exitcode: {0}.'
    Annullata = 'Die Installation wurde abgebrochen, und die bisherige Version ist an ihrem Platz geblieben.'
    AnnullataDettaglio = 'Wenn Windows nach Administratorrechten gefragt hat, braucht es ein «Ja». Exitcode: {0}.'
    NonRiuscita = 'Die Installation hat nicht geklappt: Es ist immer noch Version {0} da.'
    Codice = 'Exitcode: {0}.'
    Installato = 'Regiclass {0} ist installiert.'
    LaTrovi = 'Du findest sie beim nächsten Öffnen. Dieses Fenster schliesst sich von selbst.'
    ApriRegistro = 'Klassenbuch öffnen'
    Chiudi = 'Schliessen'
    Riapro = 'Ich öffne das Klassenbuch wieder…'
    PrendeIlPosto = 'Das neue Klassenbuch tritt an die Stelle dieses Fensters.'
    NonRiaperto = 'Das Klassenbuch ist aktualisiert, hat sich aber nicht von selbst wieder geöffnet.'
    RiprovaAdAprirlo = 'Erneut öffnen'
    NonRiuscito = 'Die Aktualisierung hat nicht geklappt.'
    Diario = 'Das Protokoll liegt in «{0}».'
    Riprova = 'Erneut versuchen'
    PaginaRelease = 'Seite der Releases'
    Salvo = 'Ich speichere, was du geschrieben hast, und schliesse das Klassenbuch…'
    Aspetto = 'Ich warte, bis das Klassenbuch alle seine Fenster geschlossen hat…'
    Estraggo = 'Ich entpacke die Dateien der neuen Version…'
    Copio = 'Ich kopiere die Dateien in den Programmordner…'
    Lento = 'Es dauert länger als sonst: Meist ist es der Virenschutz, der die neuen Dateien prüft.'
    VentiMinuti = 'Das Installationsprogramm arbeitet seit mehr als zwanzig Minuten, ohne fertig zu werden.'
    VentiMinutiDettaglio = 'Vielleicht hängt es an einer verborgenen Frage. Schliesse dieses Fenster und starte den Computer neu, bevor du es erneut versuchst.'
    Aggiornato = 'Das Klassenbuch ist aktualisiert.'
    NonAncoraAperto = 'Das Klassenbuch hat sich noch nicht geöffnet. Vielleicht ist es versteckt neben der Uhr gestartet.'
    Pronto = 'Regiclass {0} ist bereit.'
    Storto = 'Etwas ist schiefgegangen, während ich die Installation verfolgte.'
  }
  fr = @{
    Titolo = 'Mise à jour de Regiclass'
    Sottotitolo = 'Mise à jour de la version {0} à la {1}'
    Piede = "Le document de l’année n’est pas touché. N’éteins pas l’ordinateur avant que ce soit fini."
    Passo1 = 'Enregistrement et fermeture du registre'
    Passo2 = 'Installation de la version {0}'
    Passo3Riapri = 'Réouverture du registre'
    Passo3Verifica = "Vérification de l’installation"
    InstallatoreSparito = "Le fichier de l’installateur n’est plus là : l’antivirus ou le nettoyage du disque l’a peut-être supprimé."
    InstallatoreSparitoDettaglio = 'Rouvre le registre : il le téléchargera à nouveau. Ou télécharge la nouvelle version depuis la page des versions publiées.'
    Preparo = 'Je prépare les fichiers de la nouvelle version…'
    Amministratore = "Windows demande l’autorisation d’administrateur : confirme pour continuer."
    NonPartito = "L’installateur n’a pas démarré."
    InterrottaAMeta = "L’installation s’est interrompue en cours de route : le programme n’est plus à sa place."
    InterrottaDettaglio = "Réessaie, ou télécharge l’installateur depuis la page des versions publiées. Code de sortie : {0}."
    Annullata = "L’installation a été annulée, et la version précédente est restée à sa place."
    AnnullataDettaglio = "Si Windows a demandé l’autorisation d’administrateur, il faut répondre « Oui ». Code de sortie : {0}."
    NonRiuscita = "L’installation n’a pas abouti : c’est encore la version {0}."
    Codice = 'Code de sortie : {0}.'
    Installato = 'Regiclass {0} est installé.'
    LaTrovi = 'Tu la trouveras à la prochaine ouverture. Cette fenêtre se ferme toute seule.'
    ApriRegistro = 'Ouvrir le registre'
    Chiudi = 'Fermer'
    Riapro = 'Je rouvre le registre…'
    PrendeIlPosto = 'Le nouveau registre prend la place de cette fenêtre.'
    NonRiaperto = "Le registre est à jour, mais il ne s’est pas rouvert tout seul."
    RiprovaAdAprirlo = "Réessayer de l’ouvrir"
    NonRiuscito = "La mise à jour n’a pas abouti."
    Diario = 'Le journal se trouve dans « {0} ».'
    Riprova = 'Réessayer'
    PaginaRelease = 'Page des versions publiées'
    Salvo = "J’enregistre ce que tu as écrit et je ferme le registre…"
    Aspetto = "J’attends que le registre ait fermé toutes ses fenêtres…"
    Estraggo = "J’extrais les fichiers de la nouvelle version…"
    Copio = 'Je copie les fichiers dans le dossier du programme…'
    Lento = "Ça prend plus de temps que d’habitude : c’est souvent l’antivirus qui contrôle les nouveaux fichiers."
    VentiMinuti = "L’installateur travaille depuis plus de vingt minutes sans finir."
    VentiMinutiDettaglio = "Il est peut-être bloqué sur une question cachée. Ferme cette fenêtre et redémarre l’ordinateur avant de réessayer."
    Aggiornato = 'Le registre est à jour.'
    NonAncoraAperto = "Le registre ne s’est pas encore ouvert. Il a peut-être démarré caché près de l’horloge."
    Pronto = 'Regiclass {0} est prêt.'
    Storto = "Quelque chose s’est mal passé pendant que je suivais l’installation."
  }
  en = @{
    Titolo = 'Regiclass update'
    Sottotitolo = 'Updating from version {0} to {1}'
    Piede = "The year’s document is not touched. Don’t switch the computer off until it has finished."
    Passo1 = 'Saving and closing the register'
    Passo2 = 'Installing version {0}'
    Passo3Riapri = 'Reopening the register'
    Passo3Verifica = 'Checking the installation'
    InstallatoreSparito = 'The installer file is no longer there: maybe the antivirus or a disk clean-up removed it.'
    InstallatoreSparitoDettaglio = 'Reopen the register: it will download it again. Or download the new version from the releases page.'
    Preparo = 'Preparing the files of the new version…'
    Amministratore = 'Windows is asking for administrator permission: confirm to continue.'
    NonPartito = 'The installer did not start.'
    InterrottaAMeta = 'The installation stopped halfway: the program is no longer in its place.'
    InterrottaDettaglio = 'Try again, or download the installer from the releases page. Exit code: {0}.'
    Annullata = 'The installation was cancelled, and the previous version stayed in its place.'
    AnnullataDettaglio = 'If Windows asked for administrator permission, it needs a “Yes”. Exit code: {0}.'
    NonRiuscita = 'The installation did not succeed: version {0} is still there.'
    Codice = 'Exit code: {0}.'
    Installato = 'Regiclass {0} is installed.'
    LaTrovi = "You’ll find it the next time you open it. This window closes by itself."
    ApriRegistro = 'Open the register'
    Chiudi = 'Close'
    Riapro = 'Reopening the register…'
    PrendeIlPosto = 'The new register takes the place of this window.'
    NonRiaperto = 'The register is updated, but it did not reopen by itself.'
    RiprovaAdAprirlo = 'Try opening it again'
    NonRiuscito = 'The update did not succeed.'
    Diario = 'The log is in “{0}”.'
    Riprova = 'Try again'
    PaginaRelease = 'Releases page'
    Salvo = 'Saving what you wrote and closing the register…'
    Aspetto = 'Waiting for the register to close all its windows…'
    Estraggo = 'Extracting the files of the new version…'
    Copio = 'Copying the files into the program folder…'
    Lento = 'It is taking longer than usual: usually it is the antivirus checking the new files.'
    VentiMinuti = 'The installer has been working for more than twenty minutes without finishing.'
    VentiMinutiDettaglio = 'It may be stuck on a hidden question. Close this window and restart the computer before trying again.'
    Aggiornato = 'The register is updated.'
    NonAncoraAperto = 'The register has not opened yet. Maybe it started hidden next to the clock.'
    Pronto = 'Regiclass {0} is ready.'
    Storto = 'Something went wrong while I was following the installation.'
  }
}
$lingua = if ("$($p.lingua)" -in $testiPerLingua.Keys) { "$($p.lingua)" } else { 'it' }
$T = $testiPerLingua[$lingua]

# ------------------------------------------------------------------ i colori
#
# Quelli di `src/ui/styles/theme.css`; il tema è quello del registro, non di
# Windows. Se cambiano là, vanno cambiati qui.

$tavolozze = @{
  chiaro = @{
    Sfondo = '#fafafa'; SfondoAlto = '#f3f3f4'; SfondoAlto2 = '#e6e6e8'
    Bordo = '#b2b2b8'; Testo = '#1a1a1d'; Quieto = '#5b5b62'
    Accento = '#3d7a0c'; AccentoCaldo = '#2f6108'; SuTinta = '#ffffff'
    Positivo = '#15803d'; Negativo = '#b42318'; Fuoco = '#1d4ed8'; Ombra = '0.22'
  }
  scuro = @{
    Sfondo = '#141416'; SfondoAlto = '#1b1b1e'; SfondoAlto2 = '#252529'
    Bordo = '#44444b'; Testo = '#ececee'; Quieto = '#a1a1a9'
    Accento = '#8fcf4c'; AccentoCaldo = '#a8dd6e'; SuTinta = '#111113'
    Positivo = '#4ade80'; Negativo = '#f87060'; Fuoco = '#60a5fa'; Ombra = '0.55'
  }
}
$c = if ($p.tema -eq 'scuro') { $tavolozze.scuro } else { $tavolozze.chiaro }

# ------------------------------------------------------------------- la forma
#
# Come il riquadro d'avvio, più largo: senza cornice, angoli `--raggio-grande`,
# la barra sottile e sotto i tre passi. Si trascina per la superficie.

$passi = ''
foreach ($n in 1, 2, 3) {
  $passi += @"
      <Grid Margin="0,0,0,9">
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="28"/>
          <ColumnDefinition/>
        </Grid.ColumnDefinitions>
        <Grid Width="18" Height="18" HorizontalAlignment="Left" VerticalAlignment="Center">
          <Ellipse x:Name="P${n}Cerchio" StrokeThickness="1.5" Stroke="@@Bordo@@"/>
          <Ellipse x:Name="P${n}Punto" Width="8" Height="8" Fill="@@Accento@@" Visibility="Collapsed"/>
          <Path x:Name="P${n}Segno" Stroke="@@SuTinta@@" StrokeThickness="1.9"
                StrokeStartLineCap="Round" StrokeEndLineCap="Round" StrokeLineJoin="Round"
                Visibility="Collapsed"/>
        </Grid>
        <TextBlock x:Name="P${n}Testo" Grid.Column="1" VerticalAlignment="Center"
                   Foreground="@@Quieto@@" TextTrimming="CharacterEllipsis"/>
      </Grid>
"@
}

$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Width="492" SizeToContent="Height" ResizeMode="NoResize"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        WindowStartupLocation="CenterScreen" ShowInTaskbar="True"
        FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="13"
        UseLayoutRounding="True" SnapsToDevicePixels="True"
        TextOptions.TextFormattingMode="Display">
  <Window.TaskbarItemInfo>
    <TaskbarItemInfo/>
  </Window.TaskbarItemInfo>
  <Window.Resources>
    <!-- Il filo del fuoco: WPF lo mostra solo a chi usa la tastiera, come
         `:focus-visible` nelle pagine del registro. -->
    <Style x:Key="Filo">
      <Setter Property="Control.Template">
        <Setter.Value>
          <ControlTemplate>
            <Border Margin="-3" CornerRadius="8" BorderThickness="2" BorderBrush="@@Fuoco@@"/>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Pulsante" TargetType="Button">
      <Setter Property="Foreground" Value="@@Testo@@"/>
      <Setter Property="Background" Value="@@SfondoAlto2@@"/>
      <Setter Property="BorderBrush" Value="@@Bordo@@"/>
      <Setter Property="Padding" Value="14,6"/>
      <Setter Property="MinWidth" Value="92"/>
      <Setter Property="Margin" Value="8,0,0,0"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="FocusVisualStyle" Value="{StaticResource Filo}"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Fondo" Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}" BorderThickness="1"
                    CornerRadius="5" Padding="{TemplateBinding Padding}">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Fondo" Property="Opacity" Value="0.86"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
    <Style x:Key="Conferma" TargetType="Button" BasedOn="{StaticResource Pulsante}">
      <Setter Property="Foreground" Value="@@SuTinta@@"/>
      <Setter Property="Background" Value="@@Accento@@"/>
      <Setter Property="BorderBrush" Value="Transparent"/>
      <Setter Property="FontWeight" Value="Medium"/>
    </Style>
  </Window.Resources>

  <Border Margin="18" CornerRadius="2" Background="@@Sfondo@@"
          BorderBrush="@@Bordo@@" BorderThickness="1">
    <Border.Effect>
      <DropShadowEffect BlurRadius="26" ShadowDepth="6" Direction="270" Opacity="@@Ombra@@"/>
    </Border.Effect>
    <StackPanel Margin="26,24,26,22">

      <Grid>
        <Grid.ColumnDefinitions>
          <ColumnDefinition Width="Auto"/>
          <ColumnDefinition/>
        </Grid.ColumnDefinitions>
        <Image x:Name="Icona" Width="44" Height="44" Margin="0,0,14,0"
               RenderOptions.BitmapScalingMode="HighQuality" VerticalAlignment="Center"/>
        <StackPanel Grid.Column="1" VerticalAlignment="Center">
          <TextBlock Text="Regiclass" FontSize="17" FontWeight="SemiBold"
                     Foreground="@@Testo@@"/>
          <TextBlock x:Name="Sottotitolo" Foreground="@@Quieto@@" Margin="0,2,0,0"/>
        </StackPanel>
      </Grid>

      <Border x:Name="Pista" Height="4" CornerRadius="2" Margin="0,22,0,0"
              Background="@@SfondoAlto2@@" ClipToBounds="True">
        <Canvas ClipToBounds="True">
          <Border x:Name="Corsa" Height="4" CornerRadius="2" Background="@@Accento@@" Width="0"/>
        </Canvas>
      </Border>

      <Grid Margin="0,10,0,18">
        <Grid.ColumnDefinitions>
          <ColumnDefinition/>
          <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        <TextBlock x:Name="Fase" Foreground="@@Quieto@@" TextTrimming="CharacterEllipsis"/>
        <TextBlock x:Name="Percento" Grid.Column="1" Foreground="@@Quieto@@" Margin="12,0,0,0"/>
      </Grid>

      $passi

      <Border x:Name="Riquadro" Visibility="Collapsed" Margin="0,8,0,0" Padding="12,10"
              CornerRadius="2" Background="@@SfondoAlto@@" BorderBrush="@@Bordo@@"
              BorderThickness="1">
        <StackPanel>
          <TextBlock x:Name="Messaggio" TextWrapping="Wrap" Foreground="@@Testo@@"/>
          <TextBlock x:Name="Dettaglio" TextWrapping="Wrap" Foreground="@@Quieto@@"
                     FontSize="11.5" Margin="0,6,0,0" Visibility="Collapsed"/>
        </StackPanel>
      </Border>

      <TextBlock x:Name="Piede" Margin="0,16,0,0" Foreground="@@Quieto@@" FontSize="11.5"
                 TextWrapping="Wrap"/>

      <StackPanel x:Name="Gesti" Orientation="Horizontal" HorizontalAlignment="Right"
                  Margin="0,16,0,0" Visibility="Collapsed">
        <Button x:Name="Terzo" Style="{StaticResource Pulsante}" Visibility="Collapsed"/>
        <Button x:Name="Secondo" Style="{StaticResource Pulsante}" Visibility="Collapsed"/>
        <Button x:Name="Primo" Style="{StaticResource Conferma}" Visibility="Collapsed"/>
      </StackPanel>
    </StackPanel>
  </Border>
</Window>
"@

foreach ($nome in $c.Keys) { $xaml = $xaml.Replace("@@$nome@@", $c[$nome]) }

try {
  $w = [Windows.Markup.XamlReader]::Parse($xaml)
} catch {
  Diario "finestra non costruita: $($_.Exception.Message)"
  Scrivi-Stato 'guasto' @{ errore = $_.Exception.Message }
  exit 1
}

function Elemento ([string]$nome) { $w.FindName($nome) }

$pennelli = New-Object Windows.Media.BrushConverter
function Pennello ([string]$colore) { $pennelli.ConvertFromString($colore) }

$el = @{}
foreach ($nome in 'Icona', 'Sottotitolo', 'Pista', 'Corsa', 'Fase', 'Percento', 'Riquadro',
  'Messaggio', 'Dettaglio', 'Piede', 'Gesti', 'Primo', 'Secondo', 'Terzo') {
  $el[$nome] = Elemento $nome
}

# `OnLoad` legge l'icona subito, così il file non resta aperto e la cartella si toglie.
if ($p.icona -and (Test-Path -LiteralPath $p.icona)) {
  try {
    $immagine = New-Object Windows.Media.Imaging.BitmapImage
    $immagine.BeginInit()
    $immagine.CacheOption = [Windows.Media.Imaging.BitmapCacheOption]::OnLoad
    $immagine.UriSource = New-Object Uri($p.icona)
    $immagine.EndInit()
    $immagine.Freeze()
    $el.Icona.Source = $immagine
    $w.Icon = $immagine
  } catch {
    Diario "icona non letta: $($_.Exception.Message)"
  }
}

$riapri = [bool]$p.riapri
$w.Title = $T.Titolo
$el.Sottotitolo.Text = $T.Sottotitolo -f $p.da, $p.a
$el.Piede.Text = $T.Piede
(Elemento 'P1Testo').Text = $T.Passo1
(Elemento 'P2Testo').Text = $T.Passo2 -f $p.a
(Elemento 'P3Testo').Text = if ($riapri) { $T.Passo3Riapri } else { $T.Passo3Verifica }

# ----------------------------------------------------------------- la barra
#
# Senza misura corre, con una misura si riempie. Con le animazioni ridotte di
# Windows è piena, ferma e velata.

$movimento = [Windows.SystemParameters]::ClientAreaAnimation
$S = @{
  fase = 'chiusura'; corre = $false; frazione = 0.0; tick = 0
  inizio = Get-Date; inizioFase = Get-Date; ultimaMisura = [datetime]::MinValue
  processo = $null; avvioInstallatore = $null; cartellaNs = $null
  attesa = 0L; pesoInstallatore = 0L; versionePrima = $null; scrivibile = $true
  chiusura = $null; lento = $false; esito = $null
}

function Larghezza-Pista {
  $larga = $el.Pista.ActualWidth
  if ($larga -le 0) { $larga = 400 }
  $larga
}

function Barra-Corre {
  if ($S.corre) { return }
  $S.corre = $true
  $larga = Larghezza-Pista
  $el.Corsa.BeginAnimation([Windows.FrameworkElement]::WidthProperty, $null)
  $el.Percento.Text = ''
  $w.TaskbarItemInfo.ProgressState = [Windows.Shell.TaskbarItemProgressState]::Indeterminate
  if (-not $movimento) {
    [Windows.Controls.Canvas]::SetLeft($el.Corsa, 0)
    $el.Corsa.Width = $larga
    $el.Corsa.Opacity = 0.55
    return
  }
  $el.Corsa.Opacity = 1
  $el.Corsa.Width = $larga * 0.4
  $corsa = [Windows.Media.Animation.DoubleAnimation]::new(
    (-$larga * 0.4), $larga, [Windows.Duration]::new([TimeSpan]::FromMilliseconds(1400)))
  $corsa.RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever
  $dolce = New-Object Windows.Media.Animation.SineEase
  $dolce.EasingMode = [Windows.Media.Animation.EasingMode]::EaseInOut
  $corsa.EasingFunction = $dolce
  $el.Corsa.BeginAnimation([Windows.Controls.Canvas]::LeftProperty, $corsa)
}

function Barra-Misura ([double]$frazione) {
  $frazione = [Math]::Max(0.0, [Math]::Min(1.0, $frazione))
  # La barra non torna indietro: una misura più bassa è l'installatore che sposta file.
  if (-not $S.corre -and $frazione -lt $S.frazione) { return }
  if ($S.corre) {
    $S.corre = $false
    $el.Corsa.BeginAnimation([Windows.Controls.Canvas]::LeftProperty, $null)
    [Windows.Controls.Canvas]::SetLeft($el.Corsa, 0)
    $el.Corsa.Opacity = 1
    $el.Corsa.Width = (Larghezza-Pista) * $S.frazione
  }
  $S.frazione = $frazione
  $w.TaskbarItemInfo.ProgressState = [Windows.Shell.TaskbarItemProgressState]::Normal
  $w.TaskbarItemInfo.ProgressValue = $frazione
  # Sotto l'uno per cento niente numero: «0%» accanto a una barra che si muove sembra un blocco.
  $el.Percento.Text = if ($frazione -ge 0.01) { '{0:0}%' -f ($frazione * 100) } else { '' }
  $verso = (Larghezza-Pista) * $frazione
  if ($movimento) {
    $passo = [Windows.Media.Animation.DoubleAnimation]::new(
      $verso, [Windows.Duration]::new([TimeSpan]::FromMilliseconds(420)))
    $el.Corsa.BeginAnimation([Windows.FrameworkElement]::WidthProperty, $passo)
  } else {
    $el.Corsa.Width = $verso
  }
}

function Barra-Colore ([string]$colore) { $el.Corsa.Background = Pennello $colore }

# ------------------------------------------------------------------- i passi

$geometriaSpunta = [Windows.Media.Geometry]::Parse('M5,9.4 L7.8,12.1 L13,6.4')
$geometriaCroce = [Windows.Media.Geometry]::Parse('M6.2,6.2 L11.8,11.8 M11.8,6.2 L6.2,11.8')

function Passo ([int]$n, [string]$come) {
  $cerchio = Elemento "P${n}Cerchio"
  $punto = Elemento "P${n}Punto"
  $segno = Elemento "P${n}Segno"
  $testo = Elemento "P${n}Testo"
  $punto.BeginAnimation([Windows.UIElement]::OpacityProperty, $null)
  $punto.Visibility = 'Collapsed'
  $segno.Visibility = 'Collapsed'
  $cerchio.Fill = [Windows.Media.Brushes]::Transparent
  $testo.FontWeight = [Windows.FontWeights]::Normal
  switch ($come) {
    'attesa' {
      $cerchio.Stroke = Pennello $c.Bordo
      $testo.Foreground = Pennello $c.Quieto
    }
    'corso' {
      $cerchio.Stroke = Pennello $c.Accento
      $punto.Visibility = 'Visible'
      $testo.Foreground = Pennello $c.Testo
      $testo.FontWeight = [Windows.FontWeights]::SemiBold
      if ($movimento) {
        $respiro = [Windows.Media.Animation.DoubleAnimation]::new(
          1.0, 0.35, [Windows.Duration]::new([TimeSpan]::FromMilliseconds(900)))
        $respiro.AutoReverse = $true
        $respiro.RepeatBehavior = [Windows.Media.Animation.RepeatBehavior]::Forever
        $punto.BeginAnimation([Windows.UIElement]::OpacityProperty, $respiro)
      }
    }
    'fatto' {
      $cerchio.Stroke = Pennello $c.Positivo
      $cerchio.Fill = Pennello $c.Positivo
      $segno.Data = $geometriaSpunta
      $segno.Visibility = 'Visible'
      $testo.Foreground = Pennello $c.Testo
    }
    'errore' {
      $cerchio.Stroke = Pennello $c.Negativo
      $cerchio.Fill = Pennello $c.Negativo
      $segno.Data = $geometriaCroce
      $segno.Visibility = 'Visible'
      $testo.Foreground = Pennello $c.Testo
      $testo.FontWeight = [Windows.FontWeights]::SemiBold
    }
  }
}

# ---------------------------------------------------------------- i pulsanti
#
# Tre posti, riempiti secondo il momento. Un gestore solo per pulsante, che
# chiama l'azione corrente: aggiungerne uno a ogni cambio moltiplicherebbe i clic.

$azioni = @{ Primo = $null; Secondo = $null; Terzo = $null }
foreach ($posto in 'Primo', 'Secondo', 'Terzo') {
  # Dal nome del pulsante e non da una variabile catturata: con `GetNewClosure`
  # il blocco non vedrebbe più le funzioni di qui.
  $el[$posto].Add_Click({
      param($mittente, $evento)
      try {
        $azione = $azioni[$mittente.Name]
        if ($azione) { & $azione }
      } catch {
        Diario "pulsante: $($_.Exception.Message)"
      }
    })
}

function Pulsanti ([array]$voci) {
  foreach ($posto in 'Primo', 'Secondo', 'Terzo') {
    $el[$posto].Visibility = 'Collapsed'
    $el[$posto].IsDefault = $false
    $azioni[$posto] = $null
  }
  # Da destra: la prima voce è il gesto principale, pieno d'accento.
  $posti = 'Primo', 'Secondo', 'Terzo'
  for ($i = 0; $i -lt $voci.Count -and $i -lt 3; $i++) {
    $posto = $posti[$i]
    $el[$posto].Content = $voci[$i].testo
    $el[$posto].Visibility = 'Visible'
    $azioni[$posto] = $voci[$i].azione
  }
  $el.Gesti.Visibility = if ($voci.Count -gt 0) { 'Visible' } else { 'Collapsed' }
  if ($voci.Count -gt 0) {
    $el.Primo.IsDefault = $true
    [void]$el.Primo.Focus()
  }
}

function Messaggio ([string]$testo, [string]$dettaglio = '', [string]$tono = 'normale') {
  $el.Riquadro.Visibility = 'Visible'
  $el.Messaggio.Text = $testo
  $el.Riquadro.BorderBrush = Pennello $(if ($tono -eq 'errore') { $c.Negativo } else { $c.Bordo })
  if ($dettaglio) {
    $el.Dettaglio.Text = $dettaglio
    $el.Dettaglio.Visibility = 'Visible'
  } else {
    $el.Dettaglio.Visibility = 'Collapsed'
  }
}

# ------------------------------------------------------------------ le misure

$nomeEseguibile = [IO.Path]::GetFileNameWithoutExtension($p.eseguibile)

# L'eseguibile da controllare e riaprire: quello di `parametri.json`, o
# `Regiclass.exe` nella stessa cartella se la versione installata si chiama così.
function Eseguibile {
  if (Test-Path -LiteralPath $p.eseguibile) { return $p.eseguibile }
  $nuovo = Join-Path (Split-Path -Parent $p.eseguibile) 'Regiclass.exe'
  if (Test-Path -LiteralPath $nuovo) { return $nuovo }
  return $p.eseguibile
}

$radiceProgramma = $p.cartella.TrimEnd('\') + '\'

function Peso-Cartella ([string]$cartella) {
  $totale = 0L
  if (-not $cartella -or -not [IO.Directory]::Exists($cartella)) { return $totale }
  try {
    $radice = New-Object IO.DirectoryInfo($cartella)
    foreach ($file in $radice.EnumerateFiles('*', [IO.SearchOption]::AllDirectories)) {
      $totale += $file.Length
    }
  } catch {
    # L'installatore sposta file: vale quel che si è fatto in tempo a leggere.
  }
  $totale
}

function Peso-File ([string]$file) {
  try { return (New-Object IO.FileInfo($file)).Length } catch { return 0L }
}

function Processi-Del-Registro {
  @(Get-Process -Name $nomeEseguibile -ErrorAction SilentlyContinue | Where-Object {
      try { $_.Path -and $_.Path.StartsWith($radiceProgramma, [StringComparison]::OrdinalIgnoreCase) } catch { $false }
    })
}

function Vivo ([int]$numero) {
  try { return -not (Get-Process -Id $numero -ErrorAction Stop).HasExited } catch { return $false }
}

# La versione dell'eseguibile ridotta ai tre numeri (`FileVersion` «1.4.0»,
# `ProductVersion` con un quarto zero; «1.4.0-beta.1» diventa «1.4.0»).
function Tre-Numeri ([string]$versione) {
  if (-not $versione) { return '' }
  $trovata = [regex]::Match($versione, '^\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?')
  if (-not $trovata.Success) { return '' }
  $parti = foreach ($gruppo in 1, 2, 3) {
    if ($trovata.Groups[$gruppo].Success) { [int]$trovata.Groups[$gruppo].Value } else { 0 }
  }
  $parti -join '.'
}

function Versione-Installata {
  try {
    $eseguibile = Eseguibile
    if (-not (Test-Path -LiteralPath $eseguibile)) { return $null }
    return (Get-Item -LiteralPath $eseguibile).VersionInfo.FileVersion
  } catch { return $null }
}

function Cartella-Scrivibile {
  try {
    $prova = Join-Path $p.cartella ('.aggiornamento-' + [guid]::NewGuid().ToString('N'))
    [IO.File]::WriteAllText($prova, '')
    Remove-Item -LiteralPath $prova -Force
    return $true
  } catch { return $false }
}

# La cartella di lavoro dell'installatore: una `ns*.tmp` nei temporanei, nata
# dopo il suo avvio, con l'archivio del programma o la cartella di estrazione.
# Le altre (il disinstallatore) si riconoscono da quel che non hanno.
function Trova-Cartella-Installatore {
  try {
    $dopo = $S.avvioInstallatore.AddSeconds(-5)
    $candidate = Get-ChildItem -LiteralPath ([IO.Path]::GetTempPath()) -Directory -Filter 'ns*.tmp' -ErrorAction SilentlyContinue |
      Where-Object { $_.CreationTime -ge $dopo } |
      Sort-Object CreationTime -Descending
    foreach ($candidata in $candidate) {
      $archivi = @(Get-ChildItem -LiteralPath $candidata.FullName -Filter 'app-*.7z' -File -ErrorAction SilentlyContinue)
      if ($archivi.Count -gt 0 -or (Test-Path -LiteralPath (Join-Path $candidata.FullName '7z-out'))) {
        return $candidata.FullName
      }
    }
  } catch { }
  return $null
}

# Quanto è fatto, da zero a uno, o -1 se non si sa. Tre tratti pesati per la
# durata: l'archivio che esce dall'installatore, l'estrazione, la copia.
function Misura-Installazione {
  if ($S.attesa -le 0) { return -1 }
  if (-not $S.cartellaNs) { $S.cartellaNs = Trova-Cartella-Installatore }
  if (-not $S.cartellaNs) { return -1 }

  $archivio = @(Get-ChildItem -LiteralPath $S.cartellaNs -Filter 'app-*.7z' -File -ErrorAction SilentlyContinue) | Select-Object -First 1
  $estratti = Join-Path $S.cartellaNs '7z-out'
  $uscito = if ($archivio -and $S.pesoInstallatore -gt 0) { [Math]::Min(1.0, [double]$archivio.Length / $S.pesoInstallatore) } else { 0.0 }
  $estratto = 0.0
  $copiato = 0.0
  if (Test-Path -LiteralPath $estratti) {
    $uscito = 1.0
    $estratto = [Math]::Min(1.0, [double](Peso-Cartella $estratti) / $S.attesa)
    # La cartella del programma conta solo da qui: prima contiene la versione vecchia.
    $copiato = [Math]::Min(1.0, [double](Peso-Cartella $p.cartella) / $S.attesa)
  }
  # Mai il cento per cento prima della verifica: la barra piena dice «fatto».
  return [Math]::Min(0.98, 0.12 * $uscito + 0.63 * $estratto + 0.25 * $copiato)
}

# ------------------------------------------------------------------ le fasi

function Entra ([string]$fase) {
  $S.fase = $fase
  $S.inizioFase = Get-Date
  Diario "fase: $fase"
  Scrivi-Stato $fase
}

function Avvia-Installatore {
  $el.Riquadro.Visibility = 'Collapsed'
  Pulsanti @()
  Barra-Colore $c.Accento
  Passo 1 'fatto'
  Passo 2 'corso'
  Passo 3 'attesa'
  $S.frazione = 0.0
  $S.cartellaNs = $null
  $S.lento = $false
  $el.Corsa.BeginAnimation([Windows.FrameworkElement]::WidthProperty, $null)
  $el.Corsa.Width = 0
  $S.corre = $false
  Barra-Corre

  if (-not (Test-Path -LiteralPath $p.installatore)) {
    Fallisci $T.InstallatoreSparito $T.InstallatoreSparitoDettaglio $false
    return
  }

  $S.versionePrima = Versione-Installata
  $S.scrivibile = Cartella-Scrivibile
  $S.pesoInstallatore = Peso-File $p.installatore
  $el.Fase.Text = if ($S.scrivibile) { $T.Preparo } else { $T.Amministratore }

  # `/D=` in fondo e senza virgolette, anche con gli spazi: è la sola forma che NSIS capisce.
  $argomenti = "--updated /S /D=$($p.cartella)"
  Diario "installatore: «$($p.installatore)» $argomenti"
  try {
    $avvio = New-Object Diagnostics.ProcessStartInfo
    $avvio.FileName = $p.installatore
    $avvio.Arguments = $argomenti
    $avvio.UseShellExecute = $true
    $avvio.WorkingDirectory = [IO.Path]::GetTempPath()
    $S.avvioInstallatore = Get-Date
    $S.processo = [Diagnostics.Process]::Start($avvio)
    # Il codice d'uscita si legge solo con la maniglia presa a processo vivo.
    [void]$S.processo.Handle
  } catch {
    Diario "installatore non partito: $($_.Exception.Message)"
    Fallisci $T.NonPartito $_.Exception.Message $true
    return
  }
  Entra 'installazione'
}

function Concludi-Installazione {
  $codice = $null
  try { $codice = $S.processo.ExitCode } catch { }
  $dopo = Versione-Installata
  Diario "installatore uscito con $codice; versione prima «$($S.versionePrima)», adesso «$dopo»"

  $attesa = Tre-Numeri $p.a
  $trovata = Tre-Numeri $dopo
  $cambiata = (Tre-Numeri $S.versionePrima) -ne $trovata
  # Riuscito se l'eseguibile porta la versione nuova; a numeri uguali (da una
  # versione di prova alla sua uscita) conta anche il codice.
  $riuscito = $trovata -ne '' -and $trovata -eq $attesa -and ($codice -eq 0 -or $cambiata)

  if (-not $riuscito) {
    if (-not $dopo) {
      Fallisci $T.InterrottaAMeta ($T.InterrottaDettaglio -f $codice) $true
    } elseif ($codice -eq 1 -or $codice -eq 2) {
      Fallisci $T.Annullata ($T.AnnullataDettaglio -f $codice) $true
    } else {
      Fallisci ($T.NonRiuscita -f $dopo) ($T.Codice -f $codice) $true
    }
    return
  }

  Barra-Misura 1
  Passo 2 'fatto'
  if ($riapri -or (Test-Path -LiteralPath $fileApri)) {
    Riapri
  } else {
    Passo 3 'fatto'
    Entra 'fatto'
    $el.Fase.Text = $T.Installato -f $p.a
    $el.Percento.Text = ''
    $w.TaskbarItemInfo.ProgressState = [Windows.Shell.TaskbarItemProgressState]::None
    $el.Piede.Text = $T.LaTrovi
    $S.chiusura = (Get-Date).AddSeconds(12)
    Pulsanti @(
      @{ testo = $T.ApriRegistro; azione = { Riapri } },
      @{ testo = $T.Chiudi; azione = { Chiudi-Bene } }
    )
  }
}

function Riapri {
  Pulsanti @()
  $el.Riquadro.Visibility = 'Collapsed'
  $S.chiusura = $null
  Passo 3 'corso'
  $el.Fase.Text = $T.Riapro
  $el.Percento.Text = ''
  $el.Piede.Text = $T.PrendeIlPosto
  Entra 'riapertura'
  try {
    Start-Process -FilePath (Eseguibile) -WorkingDirectory $p.cartella
  } catch {
    Diario "riapertura: $($_.Exception.Message)"
    Passo 3 'errore'
    Messaggio $T.NonRiaperto $_.Exception.Message 'errore'
    Entra 'fatto'
    Pulsanti @(
      @{ testo = $T.RiprovaAdAprirlo; azione = { Riapri } },
      @{ testo = $T.Chiudi; azione = { Chiudi-Bene } }
    )
  }
}

function Fallisci ([string]$testo, [string]$dettaglio, [bool]$ripetibile) {
  Diario "errore: $testo — $dettaglio"
  Entra 'errore'
  Passo 2 'errore'
  Barra-Colore $c.Negativo
  Barra-Misura 1
  $el.Percento.Text = ''
  $w.TaskbarItemInfo.ProgressState = [Windows.Shell.TaskbarItemProgressState]::Error
  $el.Fase.Text = $T.NonRiuscito
  $el.Piede.Text = $T.Diario -f $fileDiario
  Messaggio $testo $dettaglio 'errore'
  $voci = @()
  if ($ripetibile -and (Test-Path -LiteralPath $p.installatore)) {
    $voci += @{ testo = $T.Riprova; azione = { Avvia-Installatore } }
  }
  $voci += @{ testo = $T.PaginaRelease; azione = { Start-Process $p.pagina } }
  if (Test-Path -LiteralPath (Eseguibile)) {
    $voci += @{ testo = $T.ApriRegistro; azione = { Riapri } }
  } else {
    $voci += @{ testo = $T.Chiudi; azione = { Chiudi-Bene } }
  }
  Pulsanti $voci
  $w.Activate() | Out-Null
}

function Chiudi-Bene {
  $S.esito = 'chiusa'
  $w.Close()
}

# Un passo ogni quarto di secondo sul filo della finestra, senza attese
# bloccanti: la barra corre anche mentre si aspetta.
function Giro {
  $S.tick++
  $adesso = Get-Date
  $inFase = ($adesso - $S.inizioFase).TotalSeconds

  switch ($S.fase) {
    'chiusura' {
      # Prima il processo che ha lanciato lo script (tetto di spegnimento: venti
      # secondi), poi i figli.
      $padreVivo = Vivo ([int]$p.pid)
      if ($padreVivo -and $inFase -lt 90) {
        $el.Fase.Text = $T.Salvo
        return
      }
      if ($S.tick % 4 -ne 0) { return }
      $rimasti = Processi-Del-Registro
      if ($rimasti.Count -gt 0 -and $inFase -lt 105) {
        $el.Fase.Text = $T.Aspetto
        return
      }
      if ($rimasti.Count -gt 0) { Diario "processi ancora vivi: $($rimasti.Count); ci pensa l'installatore" }
      # Il riferimento della barra: il peso del programma prima che
      # l'installatore lo tolga (la versione nuova pesa più o meno lo stesso).
      $S.attesa = Peso-Cartella $p.cartella
      Diario "cartella del programma: $([Math]::Round($S.attesa / 1MB)) MB"
      Avvia-Installatore
    }
    'installazione' {
      if ($S.processo.HasExited) {
        Concludi-Installazione
        return
      }
      if (($adesso - $S.ultimaMisura).TotalMilliseconds -ge 900) {
        $S.ultimaMisura = $adesso
        $fatto = Misura-Installazione
        if ($fatto -ge 0) {
          Barra-Misura $fatto
          $el.Fase.Text = if ($fatto -lt 0.12) {
            $T.Preparo
          } elseif ($fatto -lt 0.75) {
            $T.Estraggo
          } else {
            $T.Copio
          }
        } elseif (-not $S.scrivibile -and $inFase -gt 3) {
          $el.Fase.Text = $T.Amministratore
        }
      }
      if (-not $S.lento -and $inFase -gt 180) {
        $S.lento = $true
        $el.Piede.Text = $T.Lento
      }
      if ($inFase -gt 1200) {
        Fallisci $T.VentiMinuti $T.VentiMinutiDettaglio $false
      }
    }
    'riapertura' {
      if (Test-Path -LiteralPath $fileRiaperto) {
        Diario 'il registro ha dato il segnale'
        Passo 3 'fatto'
        Addio
        return
      }
      # Senza segnale (registro che parte nel vassoio) basta una sua finestra visibile.
      if ($inFase -gt 2 -and $S.tick % 4 -eq 0) {
        $conFinestra = @(Processi-Del-Registro | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero })
        if ($conFinestra.Count -gt 0) {
          Diario 'il registro ha una finestra'
          Passo 3 'fatto'
          Addio
          return
        }
      }
      if ($inFase -gt 60) {
        Passo 3 'errore'
        $el.Fase.Text = $T.Aggiornato
        Messaggio $T.NonAncoraAperto
        Entra 'fatto'
        Pulsanti @(
          @{ testo = $T.ApriRegistro; azione = { Riapri } },
          @{ testo = $T.Chiudi; azione = { Chiudi-Bene } }
        )
      }
    }
    'fatto' {
      if ($S.chiusura -and $adesso -ge $S.chiusura -and -not $w.IsMouseOver) { Chiudi-Bene }
    }
  }
}

# Una dissolvenza breve: dietro c'è già il riquadro d'avvio del registro.
function Addio {
  Entra 'fatto'
  $S.esito = 'riuscito'
  $el.Fase.Text = $T.Pronto -f $p.a
  $w.TaskbarItemInfo.ProgressState = [Windows.Shell.TaskbarItemProgressState]::None
  if (-not $movimento) { $w.Close(); return }
  $dissolvenza = [Windows.Media.Animation.DoubleAnimation]::new(
    0.0, [Windows.Duration]::new([TimeSpan]::FromMilliseconds(260)))
  $dissolvenza.Add_Completed({ $w.Close() })
  $w.BeginAnimation([Windows.UIElement]::OpacityProperty, $dissolvenza)
}

# ------------------------------------------------------------------ l'avvio

$w.Add_MouseLeftButtonDown({
    try { $w.DragMove() } catch { }
  })

# Durante chiusura e installazione la finestra non si chiude: l'installatore
# andrebbe avanti senza nessuno a dire com'è finita.
$w.Add_Closing({
    param($mittente, $evento)
    if ($S.fase -in 'chiusura', 'installazione') { $evento.Cancel = $true }
  })

$w.Add_KeyDown({
    param($mittente, $evento)
    if ($evento.Key -eq 'Escape' -and $S.fase -in 'fatto', 'errore') { Chiudi-Bene }
  })

$orologio = New-Object Windows.Threading.DispatcherTimer
$orologio.Interval = [TimeSpan]::FromMilliseconds(250)
$orologio.Add_Tick({
    try {
      Giro
    } catch {
      Diario "giro: $($_.Exception.Message)"
      if ($S.fase -notin 'errore', 'fatto') {
        Fallisci $T.Storto $_.Exception.Message $true
      }
    }
  })

# «Pronto» solo a finestra visibile: il registro lo aspetta prima di uscire, e
# senza installa da sé, senza finestra.
$w.Add_ContentRendered({
    try {
      # Davanti a tutto una volta, o nascerebbe dietro la finestra che il sistema
      # porta in primo piano; poi non resta sopra.
      $w.Topmost = $true
      [void]$w.Activate()
      $w.Topmost = $false
      Passo 1 'corso'
      Passo 2 'attesa'
      Passo 3 'attesa'
      Barra-Corre
      $el.Fase.Text = $T.Salvo
      Scrivi-Stato 'pronto'
      Entra 'chiusura'
      $orologio.Start()
    } catch {
      Diario "avvio della finestra: $($_.Exception.Message)"
      Scrivi-Stato 'guasto' @{ errore = $_.Exception.Message }
      $w.Close()
    }
  })

try {
  [void]$w.ShowDialog()
} catch {
  Diario "finestra: $($_.Exception.Message)"
  Scrivi-Stato 'guasto' @{ errore = $_.Exception.Message }
  exit 1
}
$orologio.Stop()

# A lavoro riuscito la cartella si toglie; altrimenti resta col diario, e la
# toglie il registro dopo una settimana.
Diario "fine, in fase «$($S.fase)»"
if ($S.fase -eq 'fatto') {
  try { Remove-Item -LiteralPath $lavoro -Recurse -Force } catch { }
}
exit 0
