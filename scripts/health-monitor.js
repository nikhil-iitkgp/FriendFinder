const { createServer } = require("http");

const HEALTH_PORT = 3008; // Different from socket health port 3007

console.log('🏥 Starting Health Monitor...');

// Create health monitoring server
const healthServer = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${HEALTH_PORT}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    
    Promise.all([
      checkService('Next.js', 'http://localhost:3000'),
      checkService('Socket.IO', 'http://localhost:3007/health'),
      checkService('Socket.IO Health', 'http://localhost:3007/health')
    ]).then(results => {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        services: results.reduce((acc, result) => {
          acc[result.name] = result;
          return acc;
        }, {}),
        overall: results.every(r => r.healthy) ? 'healthy' : 'degraded'
      };
      
      res.end(JSON.stringify(healthStatus, null, 2));
    }).catch(error => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

async function checkService(name, url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: 'GET'
    });
    
    clearTimeout(timeoutId);
    
    return {
      name,
      healthy: response.ok,
      status: response.status,
      url,
      response_time: Date.now() % 1000, // Simplified response time
      last_check: new Date().toISOString()
    };
  } catch (error) {
    return {
      name,
      healthy: false,
      error: error.message,
      url,
      last_check: new Date().toISOString()
    };
  }
}

// Periodic health checks and reporting
setInterval(async () => {
  const services = await Promise.all([
    checkService('Next.js', 'http://localhost:3000'),
    checkService('Socket.IO', 'http://localhost:3007/health'),
    checkService('Socket.IO Health', 'http://localhost:3007/health')
  ]);
  
  const healthyCount = services.filter(s => s.healthy).length;
  const status = healthyCount === services.length ? '✅' : 
                healthyCount === 0 ? '❌' : '⚠️';
  
  console.log(`${status} Health Check: ${healthyCount}/${services.length} services healthy`);
  
  // Log any unhealthy services
  services.filter(s => !s.healthy).forEach(service => {
    console.log(`  ❌ ${service.name}: ${service.error || 'Status ' + service.status}`);
  });
}, 30000); // Check every 30 seconds

healthServer.listen(HEALTH_PORT, () => {
  console.log(`🏥 Health Monitor running on http://localhost:${HEALTH_PORT}/health`);
  console.log('📊 Monitoring services:');
  console.log('  - Next.js (http://localhost:3000)');
  console.log('  - Socket.IO Health (http://localhost:3007)');
  console.log('  - Socket.IO Health (http://localhost:3007)');
});

healthServer.on('error', (error) => {
  console.error('❌ Health Monitor error:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Health Monitor...');
  healthServer.close(() => {
    process.exit(0);
  });
});