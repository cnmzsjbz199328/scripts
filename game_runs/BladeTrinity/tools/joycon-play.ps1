<#
.SYNOPSIS
  One-step local Joy-Con 2 session for BladeTrinity: adapter + static server + browser.

.DESCRIPTION
  1. Finds the Joycon checkout: -JoyconDir, else $env:JOYCON_DIR, else a "Joycon" folder next
     to this repository. If none exists, clones https://github.com/cnmzsjbz199328/Joycon and
     checks out the pinned commit (protocol v2, the version this game was built against).
  2. First run only: creates <Joycon>\.venv and installs adapter\requirements.txt.
  3. Starts the adapter in its own window, unless something already listens on 127.0.0.1:<AdapterPort>.
  4. Serves game_runs\ on http://127.0.0.1:<GamePort>, unless that port already serves the game.
  5. Opens the game page. Then hold Sync on each Joy-Con until the LEDs run.
  The Joycon checkout is only read, never modified. Close the two windows to stop.

.EXAMPLE
  .\joycon-play.ps1                      # real Joy-Cons
  .\joycon-play.ps1 -Source synthetic    # no hardware: scripted fake input
  .\joycon-play.ps1 -JoyconDir D:\src\Joycon
  .\joycon-play.ps1 -Source synthetic -AdapterPort 8799 -GamePort 8011 -NoBrowser   # side-by-side test
#>
param(
  [string]$JoyconDir = $env:JOYCON_DIR,
  [ValidateSet('joycon2', 'synthetic')][string]$Source = 'joycon2',
  [int]$GamePort = 8000,
  [int]$AdapterPort = 8765,   # the game's default; any other port is passed to the page as ?joycon=
  [switch]$NoBrowser
)
$ErrorActionPreference = 'Stop'

$Pinned = 'ce5abf5a4468ebce18dbe570cb899b799a882555'   # README section 7.3; keep in sync with _engine/joycon.js
$RepoUrl = 'https://github.com/cnmzsjbz199328/Joycon.git'
$GameRuns = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$RepoRoot = Split-Path $GameRuns -Parent
if (-not $JoyconDir) { $JoyconDir = Join-Path (Split-Path $RepoRoot -Parent) 'Joycon' }
$PageUrl = "http://127.0.0.1:$GamePort/BladeTrinity/index.html"
if ($AdapterPort -ne 8765) { $PageUrl += "?joycon=ws://127.0.0.1:$AdapterPort" }

function Say([string]$msg) { Write-Host "[joycon-play] $msg" }
function Fail([string]$msg) { Write-Host "[joycon-play] $msg" -ForegroundColor Red; exit 1 }
function Test-Listening([int]$port) {
  [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}
function Wait-Listening([int]$port, [int]$seconds) {
  for ($i = 0; $i -lt $seconds * 4; $i++) {
    if (Test-Listening $port) { return $true }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

# -- 1. Joycon checkout --
if (-not (Test-Path (Join-Path $JoyconDir 'adapter\src\service.py'))) {
  if (Test-Path $JoyconDir) { Fail "$JoyconDir exists but is not a Joycon checkout. Pass -JoyconDir or set JOYCON_DIR." }
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'git is required to fetch the Joycon adapter.' }
  Say "Cloning Joycon into $JoyconDir (pinned $($Pinned.Substring(0, 7)))..."
  git clone --quiet $RepoUrl $JoyconDir
  if ($LASTEXITCODE -ne 0) { Fail 'git clone failed.' }
  git -C $JoyconDir -c advice.detachedHead=false checkout --quiet $Pinned
  if ($LASTEXITCODE -ne 0) { Fail "checkout of $Pinned failed." }
}
$head = $null
if (Test-Path (Join-Path $JoyconDir '.git')) { $head = git -C $JoyconDir rev-parse HEAD }
if ($head -and $head.Trim() -ne $Pinned) {
  Say "Note: $JoyconDir is at $($head.Trim().Substring(0, 7)), this game was built against $($Pinned.Substring(0, 7))."
}
$contracts = Join-Path $JoyconDir 'shared\protocol\contracts.mjs'
if (-not (Select-String -Path $contracts -Pattern 'PROTOCOL_VERSION = 2;' -Quiet)) {
  Fail "$contracts does not declare protocol v2; this game only speaks v2."
}
# Known upstream bug at ce5abf5 (README section 7.6): the adapter exits when a browser tab disconnects.
$server = Join-Path $JoyconDir 'adapter\src\websocket\server.py'
if (-not (Select-String -Path $server -Pattern 'for ws in list\(self\._clients\)' -Quiet)) {
  Write-Host '[joycon-play] Warning: this adapter version exits when the game page reloads or closes.' -ForegroundColor Yellow
  Write-Host '              Avoid reloading, or fix adapter\src\websocket\server.py: "for ws in list(self._clients):"' -ForegroundColor Yellow
}

# -- 2. Python environment (first run) --
$py = Join-Path $JoyconDir '.venv\Scripts\python.exe'
if (-not (Test-Path $py)) {
  $sys = Get-Command python -ErrorAction SilentlyContinue
  if (-not $sys) { Fail 'Python 3 is required (python not found on PATH).' }
  Say 'Creating the adapter environment (first run only)...'
  & $sys.Source -m venv (Join-Path $JoyconDir '.venv')
  if ($LASTEXITCODE -ne 0) { Fail 'python -m venv failed.' }
  & $py -m pip install --quiet --disable-pip-version-check -r (Join-Path $JoyconDir 'adapter\requirements.txt')
  if ($LASTEXITCODE -ne 0) { Remove-Item -Recurse -Force (Join-Path $JoyconDir '.venv'); Fail 'pip install failed; run again once the network is available.' }
}

# -- 3. Adapter --
if (Test-Listening $AdapterPort) {
  Say "An adapter is already listening on 127.0.0.1:$AdapterPort, using it."
} else {
  Say "Starting the adapter (--source $Source) in a new window..."
  Start-Process -FilePath $py -ArgumentList '-m', 'adapter.src.service', '--source', $Source, '--side', 'both', '--port', "$AdapterPort" `
    -WorkingDirectory $JoyconDir | Out-Null
  if (-not (Wait-Listening $AdapterPort 15)) { Fail 'The adapter did not start listening within 15 s; check its window for the error.' }
}

# -- 4. Game server --
if (Test-Listening $GamePort) {
  $ok = $false
  try { $ok = (Invoke-WebRequest -Uri $PageUrl -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200 } catch { $ok = $false }
  if (-not $ok) { Fail "Port $GamePort is busy with something that is not serving the game. Use -GamePort." }
  Say "Port $GamePort already serves the game, using it."
} else {
  Say "Serving game_runs on http://127.0.0.1:$GamePort ..."
  Start-Process -FilePath $py -ArgumentList '-m', 'http.server', "$GamePort", '--bind', '127.0.0.1', '--directory', "`"$GameRuns`"" `
    -WindowStyle Minimized | Out-Null
  if (-not (Wait-Listening $GamePort 10)) { Fail "The game server did not start on port $GamePort." }
}

# -- 5. Browser --
if (-not $NoBrowser) { Start-Process $PageUrl }
Say "Game: $PageUrl"
if ($Source -eq 'joycon2') {
  Say 'Now hold Sync on each Joy-Con until the LEDs run. The status line at the bottom-left of the page turns green when both are in.'
}
Say 'To stop: close the adapter window and the minimized server window.'
