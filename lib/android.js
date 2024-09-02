const request = require("request");
const uuid = require("uuid");
const firebase = require("firebase-admin");

const account = require("../secrets/service-account.json");
const fcm = firebase.initializeApp({
    credential: firebase.credential.cert(account),
    projectId: account.project_id,
});

const send = function (deviceToken, name, phone, status) {
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
                            "phone": phone,
                            "status": status,
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

// send('dLa5fQsIQhqq4Ij4zkzsJ-:APA91bH_479ohLbRDGAXgqqjg4kOcSyeoOPh22cNW8NO1vP_B-94QmsKZlwjVxvhm7qABbJo7Q7XYAXwiRjhdds6A72YtI9SOVL59EBu6PBhCeUHDGTjuelFhklgjIxUPUK52bYPDMYb', 'Mark', '175', 'incoming').then(res => {
// 	console.log(JSON.stringify(res, null, 4));
// });

// setTimeout(() => {
// 	send('fPbuKpsFSoy7pSNArvDjQV:APA91bEiYjpER_SRN5kEFPxrqL_Iry2dDsWIa0fK2tDfSLFBIpr5rWQ08ielub16me4CXLo3WTLCmT3n-7CCMaK3qTddHDkxal5b5CiuA1frKQwwPAGeqIJKk3Tfd2z8vIm-acBbj-SD', 'Mark', '445', 'finish').then(res => {
// 	        console.log(JSON.stringify(res, null, 4));
// 	});	
// }, 10000);

module.exports = send;
