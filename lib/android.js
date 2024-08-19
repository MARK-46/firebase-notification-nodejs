const request = require("request");
const uuid = require("uuid");
const firebase = require("firebase-admin");

const account = require("../secrets/service-account.json");
const fcm = firebase.initializeApp({
    credential: firebase.credential.cert(account),
    projectId: account.project_id,
});

const send = function (deviceToken, name, phone) {
    return new Promise((resolve) => {
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
                resolve(error ?? response.body);
            });
        });
    });
};

send('ePqT6OMLSzCyIDknBIk8ua:APA91bGXs0Ek4ygPNahtRpjKzzaH5h07-PKaqVLUK8wuYjPUQkVXryqogoN97Yeem4M9xO3ovA_JsIu2BcUn8JWNCBR3gOq-Zu_A8xU39RmnrCVi16kw7cr-hhou_0ueMGUkeQhauwuA', 'Test', '123', 'incoming').then(res => {
	console.log(JSON.stringify(res, null, 4));
});

module.exports = send;