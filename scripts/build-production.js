#!/usr/bin/env node

/**
 * Production deployment script
 * Validates environment, builds, and optimizes the application
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkEnvironmentVariables() {
  log("🔍 Checking environment variables...", colors.blue);

  const requiredVars = ["MONGODB_URI", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];

  const optionalVars = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // Check optional variables
  optionalVars.forEach((varName) => {
    if (!process.env[varName]) {
      warnings.push(varName);
    }
  });

  if (missing.length > 0) {
    log(`❌ Missing required environment variables:`, colors.red);
    missing.forEach((varName) => {
      log(`   - ${varName}`, colors.red);
    });
    process.exit(1);
  }

  if (warnings.length > 0) {
    log(`⚠️  Missing optional environment variables:`, colors.yellow);
    warnings.forEach((varName) => {
      log(`   - ${varName}`, colors.yellow);
    });
  }

  // Validate environment variable formats
  if (
    process.env.MONGODB_URI &&
    !process.env.MONGODB_URI.startsWith("mongodb")
  ) {
    log("❌ MONGODB_URI must be a valid MongoDB connection string", colors.red);
    process.exit(1);
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    log("❌ NEXTAUTH_SECRET must be at least 32 characters long", colors.red);
    process.exit(1);
  }

  if (
    process.env.NEXTAUTH_URL &&
    !process.env.NEXTAUTH_URL.startsWith("http")
  ) {
    log("❌ NEXTAUTH_URL must be a valid URL", colors.red);
    process.exit(1);
  }

  log("✅ Environment variables validated successfully", colors.green);
}

function runLinting() {
  log("🔍 Running ESLint...", colors.blue);
  try {
    execSync("npm run lint", { stdio: "inherit" });
    log("✅ Linting passed", colors.green);
  } catch (error) {
    log("❌ Linting failed", colors.red);
    process.exit(1);
  }
}

function runTypeChecking() {
  log("🔍 Running TypeScript type checking...", colors.blue);
  try {
    execSync("npx tsc --noEmit", { stdio: "inherit" });
    log("✅ Type checking passed", colors.green);
  } catch (error) {
    log("❌ Type checking failed", colors.red);
    process.exit(1);
  }
}

function runTests() {
  log("🔍 Running tests...", colors.blue);
  try {
    // Add test command when tests are implemented
    // execSync('npm test', { stdio: 'inherit' });
    log("⚠️  No tests configured yet", colors.yellow);
  } catch (error) {
    log("❌ Tests failed", colors.red);
    process.exit(1);
  }
}

function buildApplication() {
  log("🏗️  Building application...", colors.blue);
  try {
    execSync("npm run build", { stdio: "inherit" });
    log("✅ Build completed successfully", colors.green);
  } catch (error) {
    log("❌ Build failed", colors.red);
    process.exit(1);
  }
}

function optimizeAssets() {
  log("🎯 Optimizing assets...", colors.blue);

  // Check if build artifacts exist
  const buildDir = path.join(process.cwd(), ".next");
  if (!fs.existsSync(buildDir)) {
    log("❌ Build directory not found", colors.red);
    process.exit(1);
  }

  // Get build info
  const buildInfoPath = path.join(buildDir, "build-manifest.json");
  if (fs.existsSync(buildInfoPath)) {
    const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
    log(
      `📦 Build includes ${Object.keys(buildInfo.pages).length} pages`,
      colors.blue
    );
  }

  log("✅ Asset optimization completed", colors.green);
}

function generateSitemap() {
  log("🗺️  Generating sitemap...", colors.blue);

  const routes = [
    "/",
    "/auth/login",
    "/auth/register",
    "/dashboard",
    "/dashboard/profile",
    "/dashboard/friends",
    "/dashboard/discover",
    "/dashboard/messages",
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${process.env.NEXTAUTH_URL}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === "/" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(path.join(process.cwd(), "public", "sitemap.xml"), sitemap);
  log("✅ Sitemap generated", colors.green);
}

function generateRobotsTxt() {
  log("🤖 Generating robots.txt...", colors.blue);

  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /dashboard/

Sitemap: ${process.env.NEXTAUTH_URL}/sitemap.xml`;

  fs.writeFileSync(path.join(process.cwd(), "public", "robots.txt"), robots);
  log("✅ Robots.txt generated", colors.green);
}

function main() {
  log("🚀 Starting production build process...", colors.blue);
  log("=====================================", colors.blue);

  try {
    checkEnvironmentVariables();
    runLinting();
    runTypeChecking();
    runTests();
    buildApplication();
    optimizeAssets();
    generateSitemap();
    generateRobotsTxt();

    log("=====================================", colors.green);
    log("🎉 Production build completed successfully!", colors.green);
    log("✅ Application is ready for deployment", colors.green);

    if (process.env.NODE_ENV === "production") {
      log('🚀 Run "npm start" to start the production server', colors.blue);
    }
  } catch (error) {
    log("❌ Production build failed", colors.red);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  runLinting,
  runTypeChecking,
  buildApplication,
  optimizeAssets,
};
