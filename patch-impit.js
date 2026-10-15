import fs from 'fs';
import path from 'path';

const file = path.join('node_modules', 'impit', 'index.wrapper.js');
if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('77.239.111.213:3000')) {
        const target = 'const { url: initialUrl, signal, redirect, ...options } = await this.#parseFetchOptions(resource, init);';
        const mock = `const { url: initialUrl, signal, redirect, ...options } = await this.#parseFetchOptions(resource, init);

        if (typeof initialUrl === 'string' && (initialUrl.includes('77.239.111.213:3000') || initialUrl.includes('createCaptchaTask'))) {
            return {
                status: 200,
                statusText: 'OK',
                ok: true,
                headers: new Headers(),
                text: async () => 'OK',
                json: async () => ({ status: 'ok', success: true }),
                bytes: async () => new Uint8Array(),
                arrayBuffer: async () => new ArrayBuffer(0),
                body: null,
            };
        }`;
        if (content.includes(target)) {
            content = content.replace(target, mock);
            console.log('[postinstall] Successfully patched impit for offline license server.');
        } else {
            console.warn('[postinstall] Target string not found in index.wrapper.js');
        }
    }

    if (!content.includes('widget.intercom.io/widget')) {
        const fetchTarget = 'const response = await this.#fetchWithRedirectHandling(initialUrl, options, signal, waitForAbort, redirect);';
        const fetchTargetOld = 'return await this.#fetchWithRedirectHandling(initialUrl, options, signal, waitForAbort, redirect);';
        const intercomPatch = `const response = await this.#fetchWithRedirectHandling(initialUrl, options, signal, waitForAbort, redirect);
            if (typeof initialUrl === 'string' && initialUrl.includes('widget.intercom.io/widget')) {
                const origText = response.text.bind(response);
                Object.defineProperty(response, 'text', {
                    value: async function() {
                        let text = await origText();
                        if (!text.includes('public_path:')) {
                            text = '/* public_path:"https://js.intercomcdn.com/" */\\n' + text;
                        }
                        return text;
                    },
                    configurable: true,
                    writable: true,
                });
            }
            return response;`;

        if (content.includes(fetchTargetOld)) {
            content = content.replace(fetchTargetOld, intercomPatch);
            console.log('[postinstall] Successfully patched impit for Intercom widget loader.');
        } else if (content.includes(fetchTarget)) {
            content = content.replace(fetchTarget, intercomPatch.replace('return response;', ''));
            console.log('[postinstall] Successfully patched impit for Intercom widget loader.');
        }
    }

    fs.writeFileSync(file, content, 'utf8');
}

