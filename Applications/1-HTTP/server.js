'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

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

const receiveArgs = async req => {
	const buffers = [];
	for await (const chunk of req) {
		buffers.push(chunk);
	}
	const data = Buffer.concat(buffers).toString();
	return JSON.parse(data);
};

const httpError = (res, status, message) => {
	res.statusCode = status;
	res.end(`${message}`);
};

http.createServer(async (req, res) => {
	const url = req.url === '/' ? '/index.html' : req.url;
	const [first, second] = url.substring(1).split('/');
	if (first === 'api') {
		const method = api.get(second);
		const args = await receiveArgs(req);
		try {
			const result = await method(...args);
			if (!result) {
				httpError(res, 500, 'Sever error');
				return;
			}
			res.end(JSON.stringify(result));
		} catch (error) {
			console.dir({ error });
			httpError(res, 500, 'Sever error');
		}
	} else {
		const path = `./static/${first}`;
		try {
			const data = await fs.promises.readFile(path);
			res.end(data);
		} catch (error) {
			httpError(res, 404, 'File is not found');
		}
	}
}).listen(8000);
