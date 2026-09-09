<#
.SYNOPSIS
  Sonda della posta: scopre quale via Microsoft lascia aperta alla casella.

.DESCRIPTION
  Non spedisce niente. Per ognuna delle vie con cui il registro sa entrare in
  una casella Microsoft 365 chiede un gettone e racconta com'è andata: chi ha
  detto di sì, chi ha detto di no e con quale codice AADSTS. Le prove che
  ottengono un gettone SMTP lo presentano anche a smtp.office365.com con
  AUTH XOAUTH2, senza mandare nessun messaggio: è l'unico modo di sapere se
  la consegna SMTP è accesa sulla casella.

  Ogni prova apre la pagina di Microsoft con un codice — il codice finisce
  negli appunti — e aspetta che si entri. Si entra con la casella della
  scuola, non con altre.

  Le vie provate:
    1  VS Code (client di Microsoft)      → SMTP.Send            [quella dell'estensione]
    2  VS Code (client di Microsoft)      → Graph Mail.Send
    3  Microsoft Graph PowerShell         → SMTP.Send
    4  Microsoft Graph PowerShell         → Graph Mail.Send
    5  ID applicazione proprio (-ClientId) → SMTP.Send
    6  Password (-ProvaPassword)          → AUTH LOGIN su smtp.office365.com

  Un sì alla 1 vuol dire che l'estensione funziona così com'è. Un sì alla 3 o
  alla 4 vuol dire che il tenant lascia il consenso agli utenti per le
  applicazioni pubblicate da Microsoft, e che basta cambiare client id. Un sì
  alla 5 vuol dire che si può registrare un'applicazione propria. La 2 e la 4
  dicono se conviene passare da Graph invece che da SMTP.

.EXAMPLE
  .\sonda-posta.ps1
  .\sonda-posta.ps1 -Solo 1,3
  .\sonda-posta.ps1 -ClientId 00000000-0000-0000-0000-000000000000 -Solo 5
  .\sonda-posta.ps1 -ProvaPassword -Solo 6
#>
param(
  [string]$Indirizzo = 'vxg140@edu.ti.ch',
  [string]$Tenant = '04b6c6e1-a4ce-485d-a5b6-09c0363a2609',
  [string]$ClientId = '',
  [switch]$ProvaPassword,
  [int[]]$Solo,
  [switch]$Elenco
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$CLIENT_VSCODE = 'aebc6443-996d-45c2-90f0-388ff96faa56'
$CLIENT_GRAPH_PS = '14d82eec-204b-4c2f-b7e8-296a70dab67e'
$SCOPO_SMTP = 'https://outlook.office.com/SMTP.Send offline_access openid profile'
$SCOPO_GRAPH = 'https://graph.microsoft.com/Mail.Send offline_access openid profile'
$SERVER_SMTP = 'smtp.office365.com'
$PORTA_SMTP = 587

# ------------------------------------------------------------ Microsoft

# Una chiamata all'endpoint OAuth. Le risposte 400 sono la norma qui — «non
# ancora autorizzato» arriva come 400 — e vanno lette, non lanciate.
function Chiedi-Microsoft ([string]$Dove, [hashtable]$Corpo) {
  $url = "https://login.microsoftonline.com/$Tenant/oauth2/v2.0/$Dove"
  try {
    return Invoke-RestMethod -Method Post -Uri $url -Body $Corpo -ContentType 'application/x-www-form-urlencoded'
  } catch [System.Net.WebException] {
    $testo = $_.ErrorDetails.Message
    if (-not $testo -and $_.Exception.Response) {
      $flusso = $_.Exception.Response.GetResponseStream()
      if ($flusso.CanSeek) { $flusso.Position = 0 }
      $testo = (New-Object IO.StreamReader($flusso)).ReadToEnd()
    }
    try { return ($testo | ConvertFrom-Json) } catch { return @{ error = 'http'; error_description = $testo } }
  }
}

function Decodifica-Jwt ([string]$Gettone) {
  $parte = $Gettone.Split('.')[1].Replace('-', '+').Replace('_', '/')
  switch ($parte.Length % 4) { 2 { $parte += '==' } 3 { $parte += '=' } }
  return ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($parte)) | ConvertFrom-Json)
}

# Il flusso del codice: si chiede un codice, lo si mostra, si aspetta.
function Gettone-ConCodice ([string]$Client, [string]$Scopo) {
  $chiesto = Chiedi-Microsoft 'devicecode' @{ client_id = $Client; scope = $Scopo }
  if ($chiesto.error) {
    return @{ ok = $false; errore = "$($chiesto.error): $($chiesto.error_description)" }
  }

  try { Set-Clipboard -Value $chiesto.user_code } catch { }
  Write-Host ''
  Write-Host "  Apri $($chiesto.verification_uri) e incolla il codice: $($chiesto.user_code) (è negli appunti)" -ForegroundColor Yellow
  Write-Host "  Entra come $Indirizzo. Aspetto fino a $([int]($chiesto.expires_in / 60)) minuti; Ctrl+C per saltare." -ForegroundColor Yellow
  try { Start-Process $chiesto.verification_uri } catch { }

  $intervallo = [int]$chiesto.interval
  if ($intervallo -lt 1) { $intervallo = 5 }
  $scadenza = (Get-Date).AddSeconds([int]$chiesto.expires_in)

  while ((Get-Date) -lt $scadenza) {
    Start-Sleep -Seconds $intervallo
    $risposta = Chiedi-Microsoft 'token' @{
      grant_type = 'urn:ietf:params:oauth:grant-type:device_code'
      client_id = $Client
      device_code = $chiesto.device_code
    }
    if ($risposta.access_token) { return @{ ok = $true; gettone = $risposta.access_token } }
    switch ($risposta.error) {
      'authorization_pending' { continue }
      'slow_down' { $intervallo += 5; continue }
      default { return @{ ok = $false; errore = "$($risposta.error): $($risposta.error_description)" } }
    }
  }
  return @{ ok = $false; errore = 'Il codice è scaduto prima che fosse autorizzato.' }
}

# ------------------------------------------------------------ SMTP

# Legge una risposta SMTP intera: le righe «250-» continuano, «250 » chiude.
function Leggi-Smtp ([IO.StreamReader]$Lettore) {
  $righe = @()
  while ($true) {
    $riga = $Lettore.ReadLine()
    if ($null -eq $riga) { break }
    $righe += $riga
    if ($riga -match '^\d{3} ') { break }
  }
  return ($righe -join "`n")
}

function Scrivi-Smtp ([IO.StreamWriter]$Scrittore, [string]$Riga) {
  $Scrittore.Write("$Riga`r`n")
  $Scrittore.Flush()
}

# Apre il canale, fa STARTTLS e presenta le credenziali. Torna l'ultima
# risposta del server e chiude senza mandare niente.
function Prova-AuthSmtp ([string[]]$Comandi) {
  $tcp = New-Object Net.Sockets.TcpClient($SERVER_SMTP, $PORTA_SMTP)
  $tcp.ReceiveTimeout = 30000
  $flusso = $tcp.GetStream()
  $lettore = New-Object IO.StreamReader($flusso, [Text.Encoding]::ASCII)
  $scrittore = New-Object IO.StreamWriter($flusso, [Text.Encoding]::ASCII)
  try {
    [void](Leggi-Smtp $lettore)
    Scrivi-Smtp $scrittore "EHLO sonda"
    [void](Leggi-Smtp $lettore)
    Scrivi-Smtp $scrittore 'STARTTLS'
    $risposta = Leggi-Smtp $lettore
    if ($risposta -notmatch '^220') { return "STARTTLS rifiutato: $risposta" }

    $tls = New-Object Net.Security.SslStream($flusso, $false)
    $tls.AuthenticateAsClient($SERVER_SMTP)
    $lettore = New-Object IO.StreamReader($tls, [Text.Encoding]::ASCII)
    $scrittore = New-Object IO.StreamWriter($tls, [Text.Encoding]::ASCII)
    Scrivi-Smtp $scrittore "EHLO sonda"
    [void](Leggi-Smtp $lettore)

    foreach ($comando in $Comandi) {
      Scrivi-Smtp $scrittore $comando
      $risposta = Leggi-Smtp $lettore
      if ($risposta -notmatch '^334') { break }
    }
    try { Scrivi-Smtp $scrittore 'QUIT' } catch { }
    return $risposta
  } finally {
    $tcp.Close()
  }
}

function Base64 ([string]$Testo) {
  return [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Testo))
}

function Spiega-Smtp ([string]$Risposta) {
  if ($Risposta -match '^235') { return 'SÌ — Exchange accetta la consegna SMTP da questa casella.' }
  if ($Risposta -match 'SmtpClientAuthentication is disabled') {
    return "NO — la consegna SMTP è spenta sul tenant o sulla casella: la riaccende solo un amministratore. ($Risposta)"
  }
  if ($Risposta -match 'basic authentication is disabled') {
    return "NO — l'accesso con password è spento sul tenant. ($Risposta)"
  }
  return "NO — $Risposta"
}

# ------------------------------------------------------------ le prove

function Racconta-Gettone ([string]$Gettone) {
  $dentro = Decodifica-Jwt $Gettone
  $chi = $dentro.upn
  if (-not $chi) { $chi = $dentro.unique_name }
  if (-not $chi) { $chi = $dentro.preferred_username }
  Write-Host "  gettone per $chi | risorsa $($dentro.aud) | permessi: $($dentro.scp)" -ForegroundColor Gray
}

function Prova-Oauth ([int]$Numero, [string]$Titolo, [string]$Client, [string]$Scopo, [bool]$PoiSmtp) {
  Write-Host ''
  Write-Host "[$Numero] $Titolo" -ForegroundColor Cyan
  $esito = Gettone-ConCodice $Client $Scopo
  if (-not $esito.ok) {
    Write-Host "  NO — $($esito.errore)" -ForegroundColor Red
    return
  }
  Racconta-Gettone $esito.gettone
  if (-not $PoiSmtp) {
    Write-Host '  SÌ — Microsoft ha dato il gettone: questa via è aperta.' -ForegroundColor Green
    return
  }
  $uno = [string][char]1
  $xoauth = Base64 ("user=$Indirizzo" + $uno + "auth=Bearer $($esito.gettone)" + $uno + $uno)
  $risposta = Prova-AuthSmtp @("AUTH XOAUTH2 $xoauth")
  $detto = Spiega-Smtp $risposta
  if ($detto -like 'SÌ*') { Write-Host "  $detto" -ForegroundColor Green } else { Write-Host "  $detto" -ForegroundColor Red }
}

function Prova-Password ([int]$Numero) {
  Write-Host ''
  Write-Host "[$Numero] Password (o password per le app) con AUTH LOGIN" -ForegroundColor Cyan
  $credenziali = Get-Credential -UserName $Indirizzo -Message 'La password della casella, o una password per le app'
  if (-not $credenziali) { Write-Host '  saltata' -ForegroundColor Gray; return }
  $chiaro = $credenziali.GetNetworkCredential().Password
  $risposta = Prova-AuthSmtp @('AUTH LOGIN', (Base64 $Indirizzo), (Base64 $chiaro))
  $detto = Spiega-Smtp $risposta
  if ($detto -like 'SÌ*') { Write-Host "  $detto" -ForegroundColor Green } else { Write-Host "  $detto" -ForegroundColor Red }
}

$prove = @(
  @{ n = 1; titolo = 'VS Code (client di Microsoft) → SMTP.Send'; client = $CLIENT_VSCODE; scopo = $SCOPO_SMTP; smtp = $true }
  @{ n = 2; titolo = 'VS Code (client di Microsoft) → Graph Mail.Send'; client = $CLIENT_VSCODE; scopo = $SCOPO_GRAPH; smtp = $false }
  @{ n = 3; titolo = 'Microsoft Graph PowerShell → SMTP.Send'; client = $CLIENT_GRAPH_PS; scopo = $SCOPO_SMTP; smtp = $true }
  @{ n = 4; titolo = 'Microsoft Graph PowerShell → Graph Mail.Send'; client = $CLIENT_GRAPH_PS; scopo = $SCOPO_GRAPH; smtp = $false }
)
if ($ClientId) {
  $prove += @{ n = 5; titolo = "ID applicazione proprio ($ClientId) → SMTP.Send"; client = $ClientId; scopo = $SCOPO_SMTP; smtp = $true }
}

if ($Elenco) {
  foreach ($p in $prove) { "[$($p.n)] $($p.titolo)" }
  if ($ProvaPassword) { '[6] Password con AUTH LOGIN' }
  return
}

Write-Host "Sonda della posta per $Indirizzo (tenant $Tenant). Non spedisce niente." -ForegroundColor White

foreach ($p in $prove) {
  if ($Solo -and ($Solo -notcontains $p.n)) { continue }
  try {
    Prova-Oauth $p.n $p.titolo $p.client $p.scopo $p.smtp
  } catch {
    Write-Host "  guasto: $($_.Exception.Message)" -ForegroundColor Red
  }
}

if ($ProvaPassword -and (-not $Solo -or $Solo -contains 6)) {
  try { Prova-Password 6 } catch { Write-Host "  guasto: $($_.Exception.Message)" -ForegroundColor Red }
}

Write-Host ''
Write-Host 'Fine. Riporta le righe SÌ/NO con i codici AADSTS: dicono quale via il tenant lascia aperta.' -ForegroundColor White
