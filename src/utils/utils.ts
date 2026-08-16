import { Converter } from 'showdown';
import { v4 as uuidv4 } from 'uuid';

export class Utils {
	static showdownConverter = new Converter({ simpleLineBreaks: true, tables: true });

	// Rendering the builder converts the same few hundred description strings to
	// HTML on every keystroke and every click, and the conversion is a pure
	// function of the text, so the result is worth keeping. The cap keeps a
	// long session from holding on to every string a user has ever typed into a
	// homebrew description; entries are evicted oldest-first.
	private static markdownCache = new Map<string, string>();

	static markdownToHtml = (text: string) => {
		const cached = Utils.markdownCache.get(text);
		if (cached !== undefined) {
			return cached;
		}

		const html = Utils.showdownConverter.makeHtml(text);

		if (Utils.markdownCache.size >= 2000) {
			const oldest = Utils.markdownCache.keys().next();
			if (!oldest.done) {
				Utils.markdownCache.delete(oldest.value);
			}
		}
		Utils.markdownCache.set(text, html);

		return html;
	};

	static isDev = () => {
		return window.location.hostname === 'localhost';
	};

	static guid = () => {
		return uuidv4();
	};

	// From: https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js
	static hashCode = (str: string, seed: number = 0): number => {
		let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
		for (let i = 0, ch; i < str.length; i++) {
			ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
		h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
		h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
		h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
		return 4294967296 * (2097151 & h2) + (h1 >>> 0);
	};

	static copy = <T>(object: T) => {
		if (typeof structuredClone === 'function') {
			return structuredClone<T>(object);
		}

		return JSON.parse(JSON.stringify(object)) as T;
	};

	static textMatches = (sources: string[], searchTerm: string) => {
		if (!searchTerm) {
			return true;
		}

		const tokens = searchTerm
			.toLowerCase()
			.split(' ');

		return sources.some(text => tokens.every(token => text.toLowerCase().includes(token)));
	};

	static intersects = (light: { a: { x: number, y: number }, b: { x: number, y: number } }, wall: { a: { x: number, y: number }, b: { x: number, y: number } }) => {
		const det = (light.b.x - light.a.x) * (wall.b.y - wall.a.y) - (wall.b.x - wall.a.x) * (light.b.y - light.a.y);
		if (det === 0) {
			return false;
		} else {
			const lambda = ((wall.b.y - wall.a.y) * (wall.b.x - light.a.x) + (wall.a.x - wall.b.x) * (wall.b.y - light.a.y)) / det;
			const gamma = ((light.a.y - light.b.y) * (wall.b.x - light.a.x) + (light.b.x - light.a.x) * (wall.b.y - light.a.y)) / det;
			return (0 <= lambda && lambda <= 1) && (0 <= gamma && gamma <= 1);
		}
	};

	static getResizedImage = (data: string): Promise<string> => {
		return new Promise(resolve => {
			const img = new Image();
			img.onload = () => {
				const maxSize = 500;
				const canvas = document.createElement('canvas');
				canvas.width = maxSize;
				canvas.height = maxSize;
				const ctx = canvas.getContext('2d');
				if (ctx) {
					const scale = Math.min(maxSize / img.width, maxSize / img.height);
					const scaledWidth = img.width * scale;
					const scaledHeight = img.height * scale;
					const offsetX = (maxSize - scaledWidth) / 2;
					const offsetY = (maxSize - scaledHeight) / 2;
					ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
					const mime = data.match(/^data:([^;,]+)[;,]/)?.[1] || 'image/png';
					resolve(canvas.toDataURL(mime));
				} else {
					resolve(data);
				}
			};
			img.src = data;
		});
	};

	static exportData = (name: string, obj: unknown, ext: string) => {
		Utils.saveFile(obj, name, ext);
	};

	static saveFile = (data: unknown, name: string, type: string) => {
		const json = JSON.stringify(data, null, '\t');
		const blob = new Blob([ json ], { type: 'application/octet-stream' });

		const a = document.createElement('a');
		a.download = `${name}.ds-${type}`;
		a.href = window.URL.createObjectURL(blob);
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	static isNullOrEmpty = (str: string | null | undefined) => {
		return (str === null || str === undefined || str.trim() === '');
	};

	// Returns the given default if the value is:
	//    - null
	//    - undefined
	//    - an empty string
	//    - ZERO (0)
	// Otherwise, returns the value as a string.
	static valueOrDefault = (value: string | number | null | undefined, defaultValue: string): string => {
		let result = defaultValue;

		if (value && !Utils.isNullOrEmpty(value.toString())) {
			result = value.toString();
		}

		return result;
	};

	static fixHostnameUrl = (value: string) => {
		return value.toLowerCase().replace(/\/+$/, '');
	};

	static getErrorMessage = (error: unknown): string => {
		if (error instanceof Error) {
			return error.message;
		}
		return String(error);
	};
}
