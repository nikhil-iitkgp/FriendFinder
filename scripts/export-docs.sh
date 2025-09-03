#!/bin/bash

# FriendFinder Documentation Export Script
# This script helps you export and backup your project documentation

echo "🚀 FriendFinder Documentation Export Tool"
echo "=========================================="

# Create export directory with timestamp
EXPORT_DIR="friendfinder-docs-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo "📁 Creating documentation export in: $EXPORT_DIR"

# Copy documentation files
if [ -d "docs" ]; then
    echo "📚 Copying documentation files..."
    cp -r docs/* "$EXPORT_DIR/"
else
    echo "❌ Documentation directory not found!"
    exit 1
fi

# Copy important project files
echo "📋 Copying project metadata..."
cp README.md "$EXPORT_DIR/00-README.md" 2>/dev/null
cp package.json "$EXPORT_DIR/package.json" 2>/dev/null
cp tsconfig.json "$EXPORT_DIR/tsconfig.json" 2>/dev/null

# Create a project summary
cat > "$EXPORT_DIR/project-summary.md" << EOF
# FriendFinder Project Summary

Generated on: $(date)
Project Location: $(pwd)

## Quick Facts
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19 + TypeScript
- **Backend**: Node.js + MongoDB
- **Real-time**: Socket.IO + WebRTC
- **Styling**: Tailwind CSS
- **Testing**: Jest + Playwright

## Documentation Files
$(ls -la docs/ | tail -n +2 | awk '{print "- " $9}')

## Package Information
$(if [ -f package.json ]; then echo "- **Name**: $(jq -r .name package.json)"; fi)
$(if [ -f package.json ]; then echo "- **Version**: $(jq -r .version package.json)"; fi)
$(if [ -f package.json ]; then echo "- **Dependencies**: $(jq -r '.dependencies | keys | length' package.json) packages"; fi)

---
*This export was created using the FriendFinder documentation export tool.*
EOF

# Create ZIP archive
if command -v zip &> /dev/null; then
    echo "📦 Creating ZIP archive..."
    zip -r "${EXPORT_DIR}.zip" "$EXPORT_DIR"
    echo "✅ ZIP archive created: ${EXPORT_DIR}.zip"
fi

# Create tar.gz archive
if command -v tar &> /dev/null; then
    echo "📦 Creating tar.gz archive..."
    tar -czf "${EXPORT_DIR}.tar.gz" "$EXPORT_DIR"
    echo "✅ Tar archive created: ${EXPORT_DIR}.tar.gz"
fi

echo ""
echo "🎉 Documentation export completed!"
echo ""
echo "📂 Available formats:"
echo "   - Folder: $EXPORT_DIR/"
if [ -f "${EXPORT_DIR}.zip" ]; then
    echo "   - ZIP: ${EXPORT_DIR}.zip"
fi
if [ -f "${EXPORT_DIR}.tar.gz" ]; then
    echo "   - TAR.GZ: ${EXPORT_DIR}.tar.gz"
fi
echo ""
echo "🔗 You can now:"
echo "   1. Copy the folder to any location"
echo "   2. Upload the ZIP to cloud storage"
echo "   3. Add the tar.gz to your GitHub releases"
echo "   4. Share the documentation with your team"
echo ""
echo "💡 Tip: Add the docs/ folder to your git repository to version control your documentation!"