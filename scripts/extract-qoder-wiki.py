#!/usr/bin/env python3
"""
Qoder Wiki Extraction Tool
This script helps extract and organize wiki content from Qoder IDE
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime

def create_wiki_structure():
    """Create the documentation structure based on Qoder wiki catalog"""
    
    # Base documentation directory
    docs_dir = Path("docs")
    docs_dir.mkdir(exist_ok=True)
    
    # Wiki sections from your Qoder catalog
    wiki_sections = {
        "Getting Started": "01-getting-started.md",
        "Technology Stack": "02-technology-stack.md",
        "Project Structure": "03-project-structure.md",
        "Frontend Architecture": "04-frontend-architecture.md",
        "Backend Architecture": "05-backend-architecture.md",
        "API Endpoints Reference": "06-api-reference.md",
        "Real-Time Communication": "07-realtime-communication.md",
        "Component Architecture": "08-component-architecture.md",
        "State Management Integration": "09-state-management.md",
        "Authentication Flow": "10-authentication-flow.md",
        "Data Models & ORM Mapping": "11-data-models.md",
        "Middleware & Request Processing": "12-middleware.md",
        "Routing & Navigation": "13-routing-navigation.md"
    }
    
    # Create template files for each section
    for section_name, filename in wiki_sections.items():
        file_path = docs_dir / filename
        if not file_path.exists():
            create_section_template(file_path, section_name)
            print(f"✅ Created template: {filename}")
    
    # Create main README
    create_main_readme(docs_dir)
    
    print(f"\n🎉 Wiki structure created in: {docs_dir.absolute()}")
    print("\nNext steps:")
    print("1. Copy content from Qoder wiki to corresponding markdown files")
    print("2. Run the export script to create downloadable archives")
    print("3. Add to git repository for version control")

def create_section_template(file_path, section_name):
    """Create a template markdown file for a wiki section"""
    
    template = f"""# {section_name}

## Overview

*[Copy the content from Qoder Wiki Catalog → {section_name} section here]*

## Table of Contents

*[Add section table of contents here]*

## Detailed Documentation

*[Paste the detailed documentation from Qoder here]*

---

*This documentation was extracted from Qoder Wiki Catalog on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(template)

def create_main_readme(docs_dir):
    """Create the main documentation README"""
    
    readme_content = f"""# FriendFinder Documentation

*Extracted from Qoder Wiki Catalog on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*

## Documentation Sections

### Getting Started
- [Getting Started](./01-getting-started.md) - Project setup and initial configuration
- [Technology Stack](./02-technology-stack.md) - Technologies and frameworks used

### Architecture
- [Project Structure](./03-project-structure.md) - File organization and structure
- [Frontend Architecture](./04-frontend-architecture.md) - React component architecture
- [Backend Architecture](./05-backend-architecture.md) - API and server architecture
- [Component Architecture](./08-component-architecture.md) - UI component design

### Development
- [API Endpoints Reference](./06-api-reference.md) - Complete API documentation
- [Real-Time Communication](./07-realtime-communication.md) - Socket.IO and WebRTC
- [State Management Integration](./09-state-management.md) - React Context and hooks
- [Authentication Flow](./10-authentication-flow.md) - User authentication system

### Data & Infrastructure
- [Data Models & ORM Mapping](./11-data-models.md) - Database schemas and models
- [Middleware & Request Processing](./12-middleware.md) - Request handling and middleware
- [Routing & Navigation](./13-routing-navigation.md) - App routing system

## How to Use This Documentation

1. **Start with Getting Started** for project setup
2. **Review Architecture sections** to understand the system design
3. **Use API Reference** for endpoint documentation
4. **Check specific sections** for detailed implementation guides

## Preservation Methods

This documentation can be preserved using multiple methods:

- **Git Repository**: Add to your project's git repository
- **Export Archive**: Use the export scripts to create downloadable backups
- **Cloud Storage**: Upload to Google Drive, Dropbox, or similar
- **Documentation Site**: Convert to a website using GitHub Pages or similar

## Export Instructions

To create downloadable archives of this documentation:

```bash
# Windows
scripts\\export-docs.bat

# Linux/Mac
./scripts/export-docs.sh
```

---

*This documentation was generated from Qoder IDE's Wiki Catalog feature and preserved for permanent access.*
"""
    
    readme_path = docs_dir / "README.md"
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)

def main():
    """Main function to run the wiki extraction"""
    print("🚀 Qoder Wiki Extraction Tool")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("package.json").exists():
        print("❌ Please run this script from your FriendFinder project root directory")
        return
    
    # Create the wiki structure
    create_wiki_structure()

if __name__ == "__main__":
    main()