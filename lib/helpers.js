const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const config = require('./config');

const helpers = {};

helpers.hash = function(password) {
    if (typeof(password) === 'string' && password.length) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
        return hash;
    }
    else {
        return false;
    }
};

helpers.parseJsonToObject = buffer => {
    try {
        const obj = JSON.parse(buffer);
        return obj;
    }
    catch (err) {
        return {};
    }
};

helpers.createRandomString = input => {
    stringLength = typeof(input) === 'number' && input > 0 ? input : false;
    if (stringLength) {
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (i = 0; i < stringLength; i++) {
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            randomString += randomCharacter;
        }
        return randomString;
    }
    return false;
};

helpers.sendTwilioSms = (phone, message, callback) => {
    const phoneNumber = typeof(phone) === 'string' && phone.trim().length === 10 ?
        phone.trim() : false;
    const messageToSend = typeof(message) === 'string' && message.trim().length > 0 && message.trim().length <= 100 ?
        message.trim() : false;
    if (phoneNumber && messageToSend) {
        const payload = {
            From: config.twilio.fromPhone,
            To: `+234${phoneNumber}`,
            Body: messageToSend
        };
        const stringPayload = querystring.stringify(payload);
        const requestDetails = {
            protocol: 'https:',
            hostname: 'api.twilio.com',
            method: 'POST',
            path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            auth: `${config.twilio.accountSid}: ${config.twilio.authToken}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };
        
        const req = https.request(requestDetails, function(res) {
            const status = res.statusCode;
            if (status === 200 || status === 201) {
                callback(false);
            } else {
                callback(`Status code returned was ${status}`);
            }
        });

        req.on('error', function(error) {
            callback(error);
        });

        req.write(stringPayload);
        req.end();
    } else {
        callback('Given parameters were missing or invalid');
    }
}

module.exports = helpers;