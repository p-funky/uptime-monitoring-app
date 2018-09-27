const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const handlers = require('./handlers');
const helpers = require('./helpers');

const server = {};

server.httpServer = http.createServer(function(req, res) {
    server.unifiedServer(req, res);
});

server.httpsServerOptions = {
    key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
    server.unifiedServer(req, res);
});

server.unifiedServer = function(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const queryStringObject = parsedUrl.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', function(data) {
        buffer += decoder.write(data);
    });

    req.on('end', function() {
        buffer += decoder.end();

        const selectedHandler = server.router[trimmedPath] ? server.router[trimmedPath]: handlers.notFound;
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        selectedHandler(data, function(statusCode, payload) {
            statusCode = typeof statusCode === 'number' ? statusCode : 200;
            payload = payload ? payload : {};
            const payloadString = JSON.stringify(payload);
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode);
            res.end(payloadString); 
        });
    });
}

server.router = {
    ping: handlers.ping,
    users: handlers.users,
    tokens: handlers.tokens,
    checks: handlers.checks
};

server.init = function() {
    server.httpServer.listen(config.httpPort, function() {
        console.log(`The server is listening on port ${config.httpPort}`);
    });
    server.httpsServer.listen(config.httpsPort, function() {
        console.log(`The server is listening on port ${config.httpsPort}`);
    });
}

module.exports = server;