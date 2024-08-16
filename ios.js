const { v4 } = require("uuid");
const http2 = require('http2');
const fs = require('fs');

const CERTIFICATE_KEY_FILE_NAME = '/root/projects/firebase-notification-nodejs/voip.key.pem';
const CERTIFICATE_FILE_NAME = '/root/projects/firebase-notification-nodejs/voip.crt.pem';

const send = function (token, name, phone, status) {
    return new Promise((resolve) => {
        const uuid = v4();
        const payload = {
            "uuid": uuid,
            "name": name,
            "phone": parseInt(phone),
            "status": status,
        }

        const headers = {
            ':method': 'POST',
            ':scheme': 'https',
            ':path': `/3/device/${token}`,
            'apns-topic': 'am.ats.ipats-client.voip',
            'apns-push-type': 'voip',
            'apns-priority': '10',
            'apns-id': uuid,
            'apns-unique-id': uuid,
            'apns-expiration': '0',
            'content-type': 'application/json; charset=utf-8',
        }

        let output = {
            'request': {
                'payload': payload,
                'headers': headers,
            },
            'response': {
                'headers': {},
                'data': '',
            },
            'error': null,
        };

        try {
            const client = http2.connect('https://api.push.apple.com:443', {
                key: fs.readFileSync(CERTIFICATE_KEY_FILE_NAME),
                cert: fs.readFileSync(CERTIFICATE_FILE_NAME),
            });

            client.on('error', (err) => {
                output['error'] = `${err}`;
                resolve(output);
            });

            const request = client.request(headers);
            request.on('error', (err) => {
                output['error'] = `${err}`;
                resolve(output);
            });
            request.setEncoding('utf8');
            request.on('response', (headers, flags) => {
                for (const name in headers) {
                    output['response']['headers'][name] = headers[name];
                }
            });
            request.on('data', (chunk) => { output['response']['data'] += chunk; });
            request.write(JSON.stringify(payload))
            request.on('end', () => {
                resolve(output);
                client.close();
            });
            request.end();
        } catch(err) {
            output['error'] = `${err}`;
            resolve(output);
        }
    });
}

send('d82e8b1c33cecd577f8eff12fe0a680cfaec0d120cb06ed4695d28c1c742139e', 'TestingPush123', '945', 'incoming').then(res => {
    console.log(JSON.stringify(res, null, 4));
});

// setTimeout(() => {
//     send('d82e8b1c33cecd577f8eff12fe0a680cfaec0d120cb06ed4695d28c1c742139e', 'TestingPush123', '945', 'finish').then(res => {
//         console.log(JSON.stringify(res, null, 4));
//     });
// }, 5000);

module.exports = send;
