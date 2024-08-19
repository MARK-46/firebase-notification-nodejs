const path = require('path');
const express = require('express');
const apnSend = require('./lib/ios');
const fcmSend = require('./lib/android');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
            fcmSend(deviceToken, name, phone, status).then(fcm_res => {
                console.log('%s - From: %s, To: %s, Result: %s', tag, phone, deviceToken, JSON.stringify(fcm_res));
                res.json({
                    device_token: deviceToken,
                    result: fcm_res,
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
    console.log(`Server is running on http://82.146.49.216:${port}/api/notify?name=MarkPC&phone=445&token=09dd8af913f4d037866412bd81a595e0573154fd94ce8fd2335e0f5cec914d5&status=incoming`);
});

process.on('warning', e => console.warn(e.stack));
