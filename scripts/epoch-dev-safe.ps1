# Epoch Journeys: verified, Windows-user-encrypted development DB launcher.
# Does not edit .env, .env.local, or database contents.
$ErrorActionPreference = 'Stop'
$expectedHost = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$credentialDir = Join-Path $env:LOCALAPPDATA 'EpochJourneys'
$credentialFile = Join-Path $credentialDir 'neon-development-connection.dpapi'
$originalDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')
$originalDirectUrl = [Environment]::GetEnvironmentVariable('DIRECT_URL', 'Process')
$ptr = [IntPtr]::Zero
$connection = $null

try {
    if (Test-Path -LiteralPath $credentialFile) {
        try {
            $protected = Get-Content -LiteralPath $credentialFile -Raw -ErrorAction Stop
            $secure = ConvertTo-SecureString -String $protected.Trim() -ErrorAction Stop
        }
        catch {
            throw 'STOP: Stored development credential cannot be decrypted. Remove the DPAPI credential file and restart to enter a new Neon connection.'
        }
    }
    else {
        Write-Host 'One-time setup: paste the NEW Neon development connection at the hidden prompt.'
        Write-Host 'The connection is encrypted for this Windows user; it is NOT written to .env.'
        $secure = Read-Host -Prompt 'Neon DEVELOPMENT connection string' -AsSecureString
    }

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $connection = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($connection)) {
        throw 'STOP: Empty development connection string. Application not started.'
    }
    $uri = [Uri]$connection
    if (($uri.Scheme -ne 'postgresql' -and $uri.Scheme -ne 'postgres') -or $uri.Host -ne $expectedHost) {
        throw ('STOP: Wrong database host (' + $uri.Host + '). Application not started.')
    }
    if (-not $uri.UserInfo -or -not $uri.AbsolutePath) {
        throw 'STOP: Incomplete development connection string. Application not started.'
    }

    if (-not (Test-Path -LiteralPath $credentialFile)) {
        New-Item -ItemType Directory -Path $credentialDir -Force | Out-Null
        $encrypted = ConvertFrom-SecureString -SecureString $secure
        [System.IO.File]::WriteAllText($credentialFile, $encrypted)
        Write-Host 'Stored Windows-user-encrypted development connection.'
    }

    # Existing process environment variables take precedence over .env in Next.js.
    $env:DATABASE_URL = $connection
    $env:DIRECT_URL = $connection
    Write-Host ('PASS: Development DB host verified: ' + $uri.Host)
    Write-Host 'Launching Epoch Journeys. No environment files modified.'
    Set-Location $projectRoot
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'epoch-dev.ps1')
    if ($LASTEXITCODE -ne 0) {
        throw ('Epoch Journeys launcher exited with code ' + $LASTEXITCODE)
    }
}
catch {
    # Show only our controlled error string, not database credentials or exception object.
    $message = [string]$_.Exception.Message
    if ($message -match '(?i)postgres(ql)?://') {
        Write-Host 'STOP: Launcher error. Connection details withheld.'
    }
    else {
        Write-Host $message
    }
    exit 1
}
finally {
    [Environment]::SetEnvironmentVariable('DATABASE_URL', $originalDatabaseUrl, 'Process')
    [Environment]::SetEnvironmentVariable('DIRECT_URL', $originalDirectUrl, 'Process')
    if ($ptr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
    Remove-Variable connection -ErrorAction SilentlyContinue
}
