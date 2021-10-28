'use strict';

const socket = new WebSocket('ws://127.0.0.1:8000/');

socket.onmessage = event => {
	const res = JSON.parse(event.data);
	const { method, error, data } = res;
	if (error) {
		console.log(`Error: ${error}, method: ${method}`);
		return;
	}
	if (method === 'render') {
		const output = document.getElementById('output');
		output.innerHTML = data;
		return;
	}
	console.log(`Method: ${method}, data: ${data}`);
};

const buildAPI = methods => {
	const api = {};
	for (const method of methods) {
		api[method] = async (...args) => {
			socket.send(JSON.stringify({ method, args }));
		};
	}
	console.log({ api });
	return api;
};

const api = buildAPI(['rect', 'move', 'rotate', 'read', 'render', 'resize']);

const scenario = async () => {
	await api.rect('Rect1', -10, 10, 10, -10);
	await api.move('Rect1', 5, 5);
	await api.rotate('Rect1', 5);
	await api.read('Rect1');
	await api.render('Rect1');
};

socket.onopen = () => {
	scenario();
};
