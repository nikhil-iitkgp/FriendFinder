@echo off
echo 🚀 Uploading Documentation to GitHub
echo =====================================

REM Check if git repository exists
if not exist ".git" (
    echo ❌ No git repository found. Initializing...
    git init
    git remote add origin https://github.com/yourusername/friendfinder.git
)

echo 📝 Adding documentation files...
git add docs/
git add scripts/

echo 💬 Committing changes...
git commit -m "Add comprehensive Qoder wiki documentation

- Extracted from Qoder IDE Wiki Catalog
- Includes all project sections and architecture
- Added export scripts and preservation guide
- Documentation now permanently preserved"

echo 🚀 Pushing to GitHub...
git push origin main

echo ✅ Documentation successfully uploaded to GitHub!
echo 🔗 View at: https://github.com/yourusername/friendfinder

pause