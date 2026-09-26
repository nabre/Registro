<#
.SYNOPSIS
  Controlla nome del prodotto e versione scritti dentro gli eseguibili.

.DESCRIPTION
  Le configurazioni degli artefatti di SignPath
  (`.signpath/artifact-configuration/`) firmano un eseguibile solo se il suo
  nome del prodotto è «Regiclass» e la sua versione è quella del
  rilascio: è una condizione di SignPath Foundation. Qui si fa lo stesso
  controllo prima di mandarlo, con i valori che legge Windows — la
  ProductName e la ProductVersion della tabella delle stringhe, quelle che
  mostra la scheda «Dettagli» delle proprietà del file — così un guasto dice
  che cosa non torna invece di arrivare come un rifiuto di SignPath.

  Lo lancia `.github/workflows/rilascio.yml`, con la versione calcolata da
  `node tools/signing.mjs versioni`. Si può lanciare anche a mano su
  `pacchetti/` dopo `npm run package`.

.EXAMPLE
  ./tools/peMetadata.ps1 -Attesa 1.0.0.0 -File 'pacchetti/win-unpacked/Regiclass.exe'
#>
param(
  [Parameter(Mandatory)] [string] $Attesa,
  [Parameter(Mandatory)] [string[]] $File,
  [string] $Prodotto = 'Regiclass'
)

$ErrorActionPreference = 'Stop'
$guasti = 0
foreach ($percorso in $File) {
  $info = (Get-Item -LiteralPath $percorso).VersionInfo
  $nome = Split-Path -Leaf $percorso
  Write-Host "${nome}: ProductName «$($info.ProductName)», ProductVersion «$($info.ProductVersion)»"
  if ($info.ProductName -ne $Prodotto) {
    Write-Host "::error::${nome}: il nome del prodotto è «$($info.ProductName)», atteso «${Prodotto}»."
    $guasti++
  }
  if ($info.ProductVersion -ne $Attesa) {
    Write-Host "::error::${nome}: la versione è «$($info.ProductVersion)», attesa «${Attesa}»."
    $guasti++
  }
}
if ($guasti) { exit 1 }
