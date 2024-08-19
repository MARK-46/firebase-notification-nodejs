const { v4: uuidv4 } = require("uuid");
const http2 = require('http2');
const fs = require('fs/promises');

const CONFIG = {
    CERTIFICATE_KEY_FILE_NAME: './secrets/voip.key.pem',
    CERTIFICATE_FILE_NAME: './secrets/voip.crt.pem',
    APNS_SERVER: 'https://api.push.apple.com:443',
    APP_BUNDLE_ID: 'am.ats.ipats-client',
};

const APNS_TOPICS = {
    DEFAULT: CONFIG.APP_BUNDLE_ID,
    VOIP: `${CONFIG.APP_BUNDLE_ID}.voip`,
};

const APNS_PUSH_TYPES = {
    ALERT: 'alert',
    BACKGROUND: 'background',
    LOCATION: 'location',
    VOIP: 'voip',
    MDM: 'mdm',
};

const APNS_PRIORITIES = {
    IMMEDIATE: '10',
    POWER_CONSERVING: '5'
};

async function send(token, name, phone, status) {
    const uuid = uuidv4();
    const headers = {
        ':method': 'POST',
        ':scheme': 'https',
        ':path': `/3/device/${token}`,
        'apns-id': uuid,
        'apns-unique-id': uuid,
        'apns-expiration': '0',
        'content-type': 'application/json; charset=utf-8',
    }
    const payload = { uuid, name, phone, status };

    if (status === 'finish') {
        headers['apns-topic'] = APNS_TOPICS.DEFAULT;
        headers['apns-push-type'] = APNS_PUSH_TYPES.ALERT;
        headers['apns-priority'] = APNS_PRIORITIES.IMMEDIATE;

        payload['apn'] = {
            'title': `${name}`,
            'body': `End call ${phone}`,
        };

        return 'not implemented yet';
    } else {
        headers['apns-topic'] = APNS_TOPICS.VOIP;
        headers['apns-push-type'] = APNS_PUSH_TYPES.VOIP;
        headers['apns-priority'] = APNS_PRIORITIES.IMMEDIATE;
    }

    const output = {
        request: { payload, headers },
        response: { headers: {}, data: '' },
        error: null,
    };

    try {
        const [key, cert] = await Promise.all([
            fs.readFile(CONFIG.CERTIFICATE_KEY_FILE_NAME),
            fs.readFile(CONFIG.CERTIFICATE_FILE_NAME)
        ]);

        const client = http2.connect(CONFIG.APNS_SERVER, { key, cert });

        return new Promise((resolve) => {
            client.on('error', (err) => {
                output.error = err.message;
                resolve(output);
            });

            const request = client.request(headers);
            
            request.on('error', (err) => {
                output.error = err.message;
                resolve(output);
            });

            request.setEncoding('utf8');

            request.on('response', (headers) => {
                output.response.headers = { ...headers };
            });

            request.on('data', (chunk) => {
                output.response.data += chunk;
            });

            request.write(JSON.stringify(payload));

            request.on('end', () => {
                client.close();
                resolve(output.response);
            });

            request.end();
        });
    } catch(err) {
        output.error = err.message;
        return output;
    }
}

// send('3597cfe3726533e458a1e923523862cd03dbbb9758024bf72f075e9af42f785e', 'TestingPush123', '945', 'incoming').then(res => {
// 	console.log(JSON.stringify(res.response, null, 4));
// });

// send('d82e8b1c33cecd577f8eff12fe0a680cfaec0d120cb06ed4695d28c1c742139e', 'TestingPush123', '945', 'incoming').then(res => {
// 	console.log(JSON.stringify(res.response, null, 4));
// });

// send('d82e8b1c33cecd577f8eff12fe0a680cfaec0d120cb06ed4695d28c1c742139e', 'TestingPush123', '945', 'finish').then(res => {
// 	console.log(JSON.stringify(res, null, 4));
// });

module.exports = send;
