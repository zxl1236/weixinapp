# Simple backend upload script
# Usage: .\upload-backend-simple.ps1

# ====== CONFIG ======
$ServerIp   = "121.41.78.148"
$ServerUser = "root"
$RemotePath = "/var/www/k12-backend"
$LocalPath  = "$PSScriptRoot\backend"   # backend folder next to this script
$ZipFile    = "$PSScriptRoot\backend-upload.zip"

Write-Host "=== Backend upload tool ===" -ForegroundColor Cyan
Write-Host "Local backend path : $LocalPath"
Write-Host "Remote path        : $RemotePath"
Write-Host ""

# 1) Check backend folder
if (-not (Test-Path $LocalPath)) {
    Write-Host "ERROR: backend folder not found: $LocalPath" -ForegroundColor Red
    exit 1
}

# 2) Remove old zip if exists
if (Test-Path $ZipFile) {
    Write-Host "Remove old zip file..." -ForegroundColor Yellow
    Remove-Item -Force $ZipFile
}

# 3) Build file list (exclude node_modules, data, *.db)
Write-Host "Collecting files (exclude node_modules, data, *.db)..." -ForegroundColor Cyan

$items = Get-ChildItem -Path $LocalPath -Recurse -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\' -and
    $_.FullName -notmatch '\\data\\' -and
    $_.Extension -notin @(".db", ".db-shm", ".db-wal")
}

if ($items.Count -eq 0) {
    Write-Host "ERROR: no files found to pack." -ForegroundColor Red
    exit 1
}

# 4) Create zip
Write-Host "Creating zip file..." -ForegroundColor Cyan
Compress-Archive -Path $items.FullName -DestinationPath $ZipFile -Force

$sizeMB = [math]::Round((Get-Item $ZipFile).Length / 1MB, 2)
Write-Host "Zip created: $ZipFile ($sizeMB MB)" -ForegroundColor Green
Write-Host ""

# 5) Ask upload method
Write-Host "1) Upload with scp"
Write-Host "2) Only create zip (upload manually)"
$choice = Read-Host "Choose 1 or 2"

if ($choice -eq "1") {
    # Test scp command
    if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: scp command not found on this machine." -ForegroundColor Red
        Write-Host "Please upload the zip manually: $ZipFile" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Uploading zip via scp..." -ForegroundColor Cyan
    $remoteFile = "$RemotePath/backend-upload.zip"
    scp $ZipFile "$ServerUser@${ServerIp}:$remoteFile"


    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: scp failed. Please upload manually." -ForegroundColor Red
        Write-Host "Local zip: $ZipFile" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Upload success." -ForegroundColor Green
    Write-Host "Now run these commands on the server:" -ForegroundColor Cyan
    Write-Host "  cd $RemotePath"
    Write-Host "  unzip -o backend-upload.zip"
    Write-Host "  rm -f backend-upload.zip"
}
else {
    Write-Host "Zip only mode. File created at:" -ForegroundColor Green
    Write-Host "  $ZipFile"
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
