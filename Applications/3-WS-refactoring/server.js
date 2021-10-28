'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const api = new Map();

const apiPath = './api/';

const cacheFile = name => {
	const filePath = apiPath + name;
	const key = path.basename(filePath, '.js');
	try {
		const libPath = require.resolve(filePath);
		delete require.cache[libPath];
	} catch (error) {
		return;
	}
	try {
		const method = require(filePath);
		api.set(key, method);
	} catch (error) {
		api.delete(key);
	}
};

const cacheFolder = path => {
	fs.readdir(path, (err, files) => {
		if (err) return;
		files.forEach(cacheFile);
	});
};

const watch = path => {
	fs.watch(path, (event, file) => {
		cacheFile(file);
	});
};

cacheFolder(apiPath);
watch(apiPath);

setTimeout(() => {
	console.dir({ api });
}, 1000);

const server = http.createServer(async (req, res) => {
	const url = req.url === '/' ? '/index.html' : req.url;
	const [file] = url.substring(1).split('/');
	const path = `./static/${file}`;
	try {
		const data = await fs.promises.readFile(path);
		res.end(data);
	} catch (error) {
		res.statusCode = 404;
		res.end('File is not found');
	}
}).listen(8000);

const ws = new WebSocket.Server({ server });

const makeResponse = (method, error, data = undefined) =>
	JSON.stringify({ method, error, data });

ws.on('connection', (connection, req) => {
	console.log('Connected' + req.socket.remoteAddress);
	connection.on('message', async message => {
		console.log('Received:' + message);
		const obj = JSON.parse(message);
		const { method, args } = obj;
		const fn = api.get(method);
		try {
			const result = await fn(...args);
			if (!result) {
				connection.send(makeResponse(method, 'No result'));
				return;
			}
			connection.send(makeResponse(method, null, result));
		} catch (error) {
			connection.send(makeResponse(method, 'Server error'));
		}
	});
});
