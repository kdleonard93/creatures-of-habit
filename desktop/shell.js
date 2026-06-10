// Production URL the desktop app connects to. Must stay in sync with
// ALLOWED_HOSTS in src-tauri/src/lib.rs and the CSP in src-tauri/tauri.conf.json.
const APP_URL = 'https://creatures-of-habit-production.up.railway.app';

// Static asset used as a connectivity probe. Loading it as an image works
// cross-origin without CORS headers and fails on gateway errors (e.g. 502).
const PROBE_PATH = '/favicon.png';
const PROBE_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 5000;

const status = document.getElementById('status');
const retryButton = document.getElementById('retry');

function probeServer() {
	return new Promise((resolve, reject) => {
		const image = new Image();
		const timer = setTimeout(() => {
			image.src = '';
			reject(new Error('timeout'));
		}, PROBE_TIMEOUT_MS);
		image.onload = () => {
			clearTimeout(timer);
			resolve();
		};
		image.onerror = () => {
			clearTimeout(timer);
			reject(new Error('unreachable'));
		};
		image.src = `${APP_URL}${PROBE_PATH}?probe=${Date.now()}`;
	});
}

async function connect() {
	retryButton.hidden = true;
	status.textContent = 'Connecting…';
	try {
		await probeServer();
		status.textContent = 'Loading your creatures…';
		window.location.replace(APP_URL);
	} catch {
		status.textContent = 'Unable to reach Creatures of Habit. Check your internet connection.';
		retryButton.hidden = false;
		setTimeout(connect, RETRY_DELAY_MS);
	}
}

retryButton.addEventListener('click', connect);
connect();
