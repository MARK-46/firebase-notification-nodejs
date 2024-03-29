const request = require("request");
const firebase = require("firebase-admin");

const account = require("./service-account.json");
console.log(account);
const fcm = firebase.initializeApp({
    credential: firebase.credential.cert(account),
    projectId: account.project_id,
});

const app = require('express')();
app.get('/api/notify', async (req, res) => {
    try {
        fcm.auth().app.INTERNAL.getToken().then(token => {
            const url = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`;
            const options = {
                url: url,
                method: 'post',
                headers: {
                    'Authorization': `Bearer ${token.accessToken}`,
                    'X-Firebase-Client': 'fire-admin-node/11.11.1',
                    'access_token_auth': 'true',
                    'content-type': 'application/json',
                },
                json: {
                    "message": {
                        "token": req.query.token,
                        // "notification": {
                        //     "title": "Incoming call",
                        //     "body": req.query.body
                        // },
                        "data": {
                            "content-available": "1"
                        },
                        "fcmOptions": {
                            "analyticsLabel": "Incoming call"
                        },
                        "android": {
                            "ttl": "1000s",
                            "priority": "high"
                        },
                        "apns": {
                            "payload": {
                                "aps": {
                                    "badge": 0,
                                    "priority": "high",
                                    "apns-push-type": "voip",
                                    "apns-priority": "10",
                                    "content-available": 1,
                                    "mutable-content": 1
                                }
                            }
                        }
                    }
                }
            };
            request(url, options,function (error, response, body) {
                const opt = Object.freeze(options);
                opt.headers.Authorization = opt.headers.Authorization.length;
                res.json({
                    options: options,
                    error: error,
                    headers: response.headers,
                    status_code: response.statusCode,
                    body: body === response.body ? body : {
                        body1: body,
                        body2: response.body,
                    },
                });
            });
        });
    } catch (error) {
        res.json(error);
    }
});

const port = 1337;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${ port }/api/notify?title=Incoming%20call&body=Test&token=...`);
});
