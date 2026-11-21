param(
    [ValidateSet('setup','verify','status','cleanup')]
    [string] $Mode = 'setup'
)
$ErrorActionPreference = 'Stop'
& {
    $projectRoot = 'C:\Users\emrev\epoch-journeys'
    $expectedHost = 'ep-red-waterfall-ai5fcms9.c-4.us-east-1.aws.neon.tech'
    $credentialFile = Join-Path $env:LOCALAPPDATA 'EpochJourneys\neon-development-connection.dpapi'
    $jsFile = Join-Path $PSScriptRoot 'finance-http-fixture.cjs'
    if (-not (Test-Path -LiteralPath $credentialFile) -or -not (Test-Path -LiteralPath $jsFile) -or -not (Test-Path -LiteralPath (Join-Path $projectRoot 'package.json'))) {
        throw 'STOP: Expected encrypted development credential, test file, or project is missing.'
    }
    $ptr = [IntPtr]::Zero
    $previous = [Environment]::GetEnvironmentVariable('EPOCH_FINANCE_TEST_DATABASE_URL','Process')
    try {
        $encrypted = (Get-Content -LiteralPath $credentialFile -Raw -ErrorAction Stop).Trim()
        $secure = ConvertTo-SecureString -String $encrypted -ErrorAction Stop
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $connection = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        if ([string]::IsNullOrWhiteSpace($connection)) { throw 'STOP: Empty stored development credential.' }
        $uri = [Uri]$connection
        if ($uri.Host -ne $expectedHost -or $uri.Scheme -notin @('postgresql','postgres')) {
            throw ('STOP: Wrong database host (' + $uri.Host + ').')
        }
        $env:EPOCH_FINANCE_TEST_DATABASE_URL = $connection
        $connection = $null
        Set-Location -LiteralPath $projectRoot
        & node $jsFile $Mode
        if ($LASTEXITCODE -ne 0) { throw 'STOP: Fixture command failed. See FAIL details above.' }
    }
    finally {
        [Environment]::SetEnvironmentVariable('EPOCH_FINANCE_TEST_DATABASE_URL',$previous,'Process')
        if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
        Remove-Variable connection -ErrorAction SilentlyContinue
    }
}
