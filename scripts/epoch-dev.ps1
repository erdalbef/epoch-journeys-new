$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$originalLocation = Get-Location

# Unique single-instance lock for this project
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes(
        $projectRoot.ToLowerInvariant()
    )
    $hash = [System.BitConverter]::ToString(
        $sha.ComputeHash($bytes)
    ).Replace("-", "").Substring(0, 16)
}
finally {
    $sha.Dispose()
}

$mutexName = "Local\EpochJourneysDev_$hash"
$mutex = [System.Threading.Mutex]::new($false, $mutexName)
$acquired = $false

try {
    try {
        $acquired = $mutex.WaitOne(0)
    }
    catch [System.Threading.AbandonedMutexException] {
        $acquired = $true
    }

    if (-not $acquired) {
        Write-Host ""
        Write-Host "Epoch Journeys is already running or starting."
        Write-Host "Use the URL shown in the existing terminal."
        Write-Host "No second server is necessary."
        Write-Host ""
        exit 0
    }

    Set-Location $projectRoot

    $nextCli = ".\node_modules\next\dist\bin\next"

    if (-not (Test-Path $nextCli)) {
        throw "Next.js is not installed. Run npm install."
    }

    Write-Host ""
    Write-Host "Starting Epoch Journeys..."
    Write-Host "Next.js will select an available port."
    Write-Host ""

    & node $nextCli dev --webpack
    $exitCode = $LASTEXITCODE
}
finally {
    Set-Location $originalLocation

    if ($acquired) {
        $mutex.ReleaseMutex()
    }

    $mutex.Dispose()
}

exit $exitCode
