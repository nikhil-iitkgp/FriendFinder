@echo off
REM FriendFinder Documentation Export Script for Windows
REM This script helps you export and backup your project documentation

echo 🚀 FriendFinder Documentation Export Tool
echo ==========================================

REM Create export directory with timestamp
for /f "tokens=1-5 delims=/ " %%a in ('date /t') do set mydate=%%c%%a%%b
for /f "tokens=1-3 delims=: " %%a in ('time /t') do set mytime=%%a%%b%%c
set EXPORT_DIR=friendfinder-docs-%mydate%-%mytime%
mkdir "%EXPORT_DIR%"

echo 📁 Creating documentation export in: %EXPORT_DIR%

REM Copy documentation files
if exist "docs" (
    echo 📚 Copying documentation files...
    xcopy docs\* "%EXPORT_DIR%" /S /E /Y > nul
) else (
    echo ❌ Documentation directory not found!
    pause
    exit /b 1
)

REM Copy important project files
echo 📋 Copying project metadata...
if exist "README.md" copy "README.md" "%EXPORT_DIR%\00-README.md" > nul
if exist "package.json" copy "package.json" "%EXPORT_DIR%\package.json" > nul
if exist "tsconfig.json" copy "tsconfig.json" "%EXPORT_DIR%\tsconfig.json" > nul

REM Create a project summary
echo # FriendFinder Project Summary > "%EXPORT_DIR%\project-summary.md"
echo. >> "%EXPORT_DIR%\project-summary.md"
echo Generated on: %date% %time% >> "%EXPORT_DIR%\project-summary.md"
echo Project Location: %cd% >> "%EXPORT_DIR%\project-summary.md"
echo. >> "%EXPORT_DIR%\project-summary.md"
echo ## Quick Facts >> "%EXPORT_DIR%\project-summary.md"
echo - **Framework**: Next.js 15 with App Router >> "%EXPORT_DIR%\project-summary.md"
echo - **Frontend**: React 19 + TypeScript >> "%EXPORT_DIR%\project-summary.md"
echo - **Backend**: Node.js + MongoDB >> "%EXPORT_DIR%\project-summary.md"
echo - **Real-time**: Socket.IO + WebRTC >> "%EXPORT_DIR%\project-summary.md"
echo - **Styling**: Tailwind CSS >> "%EXPORT_DIR%\project-summary.md"
echo - **Testing**: Jest + Playwright >> "%EXPORT_DIR%\project-summary.md"
echo. >> "%EXPORT_DIR%\project-summary.md"
echo --- >> "%EXPORT_DIR%\project-summary.md"
echo *This export was created using the FriendFinder documentation export tool.* >> "%EXPORT_DIR%\project-summary.md"

REM Create ZIP archive if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo 📦 Creating ZIP archive...
    powershell -command "Compress-Archive -Path '%EXPORT_DIR%' -DestinationPath '%EXPORT_DIR%.zip'"
    echo ✅ ZIP archive created: %EXPORT_DIR%.zip
)

echo.
echo 🎉 Documentation export completed!
echo.
echo 📂 Available formats:
echo    - Folder: %EXPORT_DIR%\
if exist "%EXPORT_DIR%.zip" echo    - ZIP: %EXPORT_DIR%.zip
echo.
echo 🔗 You can now:
echo    1. Copy the folder to any location
echo    2. Upload the ZIP to cloud storage
echo    3. Add to your GitHub repository
echo    4. Share the documentation with your team
echo.
echo 💡 Tip: Add the docs/ folder to your git repository to version control your documentation!
echo.
pause