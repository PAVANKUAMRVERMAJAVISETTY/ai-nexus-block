@echo off
setlocal enableextensions enabledelayedexpansion

set "DIR=%~dp0"
set "MAVEN_VER=3.9.6"
set "MAVEN_HOME=%DIR%\.mvn\apache-maven-%MAVEN_VER%"
set "MAVEN_BIN=%MAVEN_HOME%\bin\mvn.cmd"

if exist "%MAVEN_BIN%" (
    goto EXECUTE
)

echo [Maven Wrapper] Downloading Apache Maven %MAVEN_VER%...
if not exist "%DIR%\.mvn" mkdir "%DIR%\.mvn"

set "ZIP_PATH=%DIR%\.mvn\apache-maven-%MAVEN_VER%-bin.zip"
set "DOWNLOAD_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VER%/apache-maven-%MAVEN_VER%-bin.zip"

powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '[Maven Wrapper] Downloading Maven from %DOWNLOAD_URL%...'; Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_PATH%'; Write-Host '[Maven Wrapper] Extracting archive...'; Expand-Archive -Path '%ZIP_PATH%' -DestinationPath '%DIR%\.mvn' -Force; Remove-Item -Path '%ZIP_PATH%' -Force"

if not exist "%MAVEN_BIN%" (
    echo [Maven Wrapper] ERROR: Failed to bootstrap Apache Maven %MAVEN_VER%.
    exit /b 1
)

:EXECUTE
"%MAVEN_BIN%" %*
exit /b %ERRORLEVEL%
