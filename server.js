const http = require('http');
const fs = require('fs');
const path = require('path');
const scheduleHandler = require('./api/schedule');
const healthHandler = require('./api/health');

// Read port from environment or fallback to 3000
const PORT = process.env.PORT || 3000;

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Mock res.status(code).json(data) helper for Vercel handler compatibility
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    this.end(JSON.stringify(data));
    return this;
  };

  // Helper to read JSON body
  if (pathname === '/api/schedule' || pathname === '/api/health') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : null;
      } catch (e) {
        req.body = rawBody;
      }

      if (pathname === '/api/schedule') {
        scheduleHandler(req, res);
      } else if (pathname === '/api/health') {
        healthHandler(req, res);
      }
    });
    return;
  }

  // Serve static assets
  if (pathname === '/' || pathname === '/index.html') {
    sendFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
  } else if (pathname.endsWith('.xlsx')) {
    const filename = path.basename(pathname);
    sendFile(res, path.join(__dirname, decodeURIComponent(filename)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  } else {
    // Fallback to index.html
    sendFile(res, path.join(__dirname, 'index.html'), 'text/html; charset=utf-8');
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Shift Schedule Server is running on port ${PORT}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`📡 API URL:   http://localhost:${PORT}/api/schedule`);
  console.log(`🩺 Health:    http://localhost:${PORT}/api/health`);
  console.log(`==================================================\n`);
});
