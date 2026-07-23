$ErrorActionPreference = "Stop"
$port = 8787
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Test-Port($p) {
  try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',$p); $c.Close(); return $true } catch { return $false }
}

if (Test-Port $port) {
  Start-Process "http://127.0.0.1:$port/index.html"
  exit 0
}

$python = Get-Command py -ErrorAction SilentlyContinue
if ($python) {
  Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$root'; py -m http.server $port --bind 127.0.0.1" -WindowStyle Normal
  Start-Sleep -Seconds 2
  Start-Process "http://127.0.0.1:$port/index.html"
  exit 0
}
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
  Start-Process powershell -ArgumentList '-NoExit','-Command',"Set-Location '$root'; python -m http.server $port --bind 127.0.0.1" -WindowStyle Normal
  Start-Sleep -Seconds 2
  Start-Process "http://127.0.0.1:$port/index.html"
  exit 0
}

Add-Type -AssemblyName System.Net.HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")
$listener.Start()
Start-Process "http://127.0.0.1:$port/index.html"
Write-Host "Vacunas a Tiempo activo en http://127.0.0.1:$port/"
Write-Host "No cierre esta ventana mientras utiliza el sistema."
$mime = @{'.html'='text/html; charset=utf-8';'.css'='text/css; charset=utf-8';'.js'='application/javascript; charset=utf-8';'.json'='application/json; charset=utf-8';'.png'='image/png';'.svg'='image/svg+xml'}
while ($listener.IsListening) {
  $ctx=$listener.GetContext(); $path=$ctx.Request.Url.LocalPath.TrimStart('/'); if([string]::IsNullOrWhiteSpace($path)){$path='index.html'}
  $full=[IO.Path]::GetFullPath((Join-Path $root $path));
  if(!$full.StartsWith([IO.Path]::GetFullPath($root)) -or !(Test-Path $full -PathType Leaf)){$ctx.Response.StatusCode=404;$bytes=[Text.Encoding]::UTF8.GetBytes('No encontrado')}
  else{$ext=[IO.Path]::GetExtension($full).ToLower();$ctx.Response.ContentType=if($mime.ContainsKey($ext)){$mime[$ext]}else{'application/octet-stream'};$bytes=[IO.File]::ReadAllBytes($full)}
  $ctx.Response.ContentLength64=$bytes.Length;$ctx.Response.OutputStream.Write($bytes,0,$bytes.Length);$ctx.Response.OutputStream.Close()
}
