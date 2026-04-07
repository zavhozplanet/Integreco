
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081;
const SAVE_DIR = path.join(__dirname, 'temp_save');

if (!fs.existsSync(SAVE_DIR)) {
    fs.mkdirSync(SAVE_DIR);
}

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `map_backup_${timestamp}.json`;
                const filepath = path.join(SAVE_DIR, filename);
                
                fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
                console.log(`Saved: ${filepath}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok', file: filename }));
            } catch (err) {
                console.error(err);
                res.writeHead(500);
                res.end('Error saving data');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Save backend listening on port ${PORT}`);
});
