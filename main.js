const request = require("request");
const firebase = require("firebase-admin");

const account = require("./service-account.json");
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
                        "notification": {
                            "title": "Incoming call",
                            "body": req.query.body
                        },
                        "data": {
                            "content-available": "1"
                        },
                        "fcmOptions": {
                            "analyticsLabel": "Incoming call"
                        },
                        "android": {
                            "priority": "high"
                        },
                        "apns": {
                            "payload": {
                                "aps": {
                                    "priority": "high",
                                    "timeToLive": 3600,
                                    "contentAvailable": true,
                                    "content-available": 1,
                                    "content_available": 1,
                                    "mutable-content": true
                                }
                            },
                            "headers": {
                                "apns-priority": "10"
                            },
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
