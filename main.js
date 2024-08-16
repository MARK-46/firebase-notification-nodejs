const path = require('path');
const request = require("request");
const firebase = require("firebase-admin");
const uuid = require("uuid");
const express = require('express');
const app = express();
const apnSend = require('./ios');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const account = require("./service-account.json");
const fcm = firebase.initializeApp({
    credential: firebase.credential.cert(account),
    projectId: account.project_id,
});

app.post('/api/warp/logs', (req, res) => {
    const { dp, dt, dm, msg } = req.body;
    const line = `${dm || msg}`.replace(/\n+/g, '');
    console.log(`[${new Date().toISOString()}] DeviceLog, (${dp}, ${dt}) ${line}`);
    return res.json({result: 'ok'});
});

app.get('/api/notify', async (req, res) => {
    var deviceToken = req.query.token;
    var phone = req.query.phone;
    var name = req.query.name || phone;
    var status = req.query.status || 'incoming';
    var platform = deviceToken.length === 64 || deviceToken.length === 63 ? 'IOS' : 'Android';
    var tag = `[${new Date().toISOString()}] Asterisk, ` + (status == 'incoming' ? `SendIncomingCall` : `SendEndCall`) + `(${platform})`;

    if (!phone || phone.length === 0) {
        console.log('%s - From: %s, To: %s, Result: %s', tag, phone, deviceToken, 'Canceled, Invalid Phone Number!');
        return res.json({result: 'Canceled, Invalid Phone Number!'});
    }

    if (!deviceToken || deviceToken.length === 0) {
        console.log('%s - From: %s, To: %s, Result: %s', tag, phone, deviceToken, 'Canceled, Invalid Device Token!');
        return res.json({result: 'Canceled, Invalid Device Token!'});
    }

    if (status !== 'incoming' && platform === 'Android') {
        console.log('%s - From: %s, To: %s, Result: %s', tag, phone, deviceToken, 'Canceled, Not Supported For Android!');
        return res.json({result: 'Canceled, Not Supported For Android!'});
    }

    try {
        if (platform == 'IOS') {
            apnSend(deviceToken, name, phone, status).then(apn_res => {
                console.log('%s - From: %s, To: %s, Result: %s', tag, phone, deviceToken, JSON.stringify(apn_res));
                res.json({
                    device_token: deviceToken,
                    result: apn_res,
                });
            });
        } else {
            fcm.auth().app.INTERNAL.getToken().then(token => {
                const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
                const options = {
                    url: url,
                    method: 'post',
                    headers: {
                        "Keep-Alive": "timeout=5",
                        'Authorization': `Bearer ${token.accessToken}`,
                        'X-Firebase-Client': 'fire-admin-node/11.11.1',
                        'access_token_auth': 'true',
                        'content-type': 'application/json',
                    },
                    json: {
                        "message": {
                            "token": deviceToken,
                            "notification": {
                                "title": "Incoming call",
                                "body": phone
                            },
                            "data": {
                                "uuid": uuid.v4(),
                                "name": name,
                                "phone": phone
                            },
                            "android": {
                                "ttl": "1000s",
                                "priority": "high"
                            },
                        }
                    }
                };
                request(url, options, function (error, response, body) {
                    const opt = Object.freeze(options);
                    opt.headers.Authorization = opt.headers.Authorization.length;
                    console.log('%s - From: %s, To: %s, Result: %s - %s', tag, phone, deviceToken, response.statusCode, JSON.stringify(error ?? response.body));
                    res.json({
                        options: options,
                        error: error,
                        status_code: response.statusCode,
                        body: body === response.body ? body : {
                            body1: body,
                            body2: response.body,
                        },
                    });
                });
            });
        }
    } catch (error) {
        console.log('%s - From: %s, To: %s, Error: %s', tag, phone, deviceToken, error['message'] ?? error);
        console.error(error);
        res.json(error);
    }
});

const port = 1337;
app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}/api/notify?name=MarkPC&phone=445&token=1234`);
});

process.on('warning', e => console.warn(e.stack));
