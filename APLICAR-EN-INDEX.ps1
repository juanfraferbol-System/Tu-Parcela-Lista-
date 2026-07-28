$path = Join-Path $PSScriptRoot "..\index.html"
if (-not (Test-Path $path)) { Write-Host "No se encontro index.html en la carpeta superior."; exit 1 }
$content = Get-Content $path -Raw
$content = $content -replace 'tpl-site-shell\.css\?v=[0-9-]+', 'tpl-site-shell.css?v=20260728-3'
$content = $content -replace 'tpl-site-shell\.js\?v=[0-9-]+', 'tpl-site-shell.js?v=20260728-3'
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "index.html actualizado para cargar la nueva version del header y portada compacta."
