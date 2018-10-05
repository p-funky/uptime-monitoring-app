const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');
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

helpers.validateChecksFields = payload => {
    const reqProtocol = payload.protocol;
    const protocol = typeof(reqProtocol) === 'string' && ['https', 'http'].indexOf(reqProtocol) > -1 ?
        reqProtocol: false;
    const reqUrl = payload.url;
    const url = typeof(reqUrl) === 'string' && reqUrl.trim().length > 0 ?
        reqUrl : false;;
    const reqMethod = payload.method;
    const method = typeof(reqMethod) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(reqMethod) > -1 ?
        reqMethod: false;
    const reqSuccessCodes = payload.successCodes;
    const successCodes = typeof(reqSuccessCodes) === 'object' && reqSuccessCodes instanceof Array && reqSuccessCodes.length > 0 ?
        reqSuccessCodes: false;
    const reqTimeOut = payload.timeOutSeconds;
    const timeOutSeconds = typeof(reqTimeOut) === 'number' && reqTimeOut % 1 === 0 && reqTimeOut >= 1 && reqTimeOut <= 5 ?
        reqTimeOut: false;
    return {
        protocol,
        url,
        method,
        successCodes,
        timeOutSeconds
    };
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
};

helpers.getTemplate = (templateName, data, callback) => {
    templateName = templateName && typeof templateName === 'string' ? templateName : false;
    data = typeof data === 'object' && data !== null ? data : {};

    if (templateName) {
        const templatesDirectory = path.join(__dirname, '/../templates/');
        fs.readFile(templatesDirectory + templateName + '.html', 'utf8', function(err, str) {
            if (!err && str) {
                const finalString = helpers.interpolate(str, data);
                callback(false, finalString);
            } else {
                callback('No template could be found');
            }
        });
    } else {
        callback('A valid template name was not specified');
    }
};

helpers.addUniversalTemplates = (str, data, callback) => {
    str = str && typeof str === 'string' ? str : false;
    data = typeof data === 'object' && data !== null ? data : {};

    helpers.getTemplate('_header', data, function(err, headerString) {
        if (!err && headerString) {
            helpers.getTemplate('_footer', data, function(err, footerString) {
                if (!err && footerString) {
                    const fullString = headerString + str + footerString;
                    callback(false, fullString);
                } else {
                    callback('Could not find the footer template');
                }
            });
        } else {
            callback('Could not find the header template');
        }
    });
};

helpers.interpolate = (str, data) => {
    str = str && typeof str === 'string' ? str : false;
    data = typeof data === 'object' && data !== null ? data : {};

    for (let keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.' + keyName] = config.templateGlobals[keyName];
        }
    }
    for (let key in data) {
        if (data.hasOwnProperty(key) && typeof data[key] === 'string') {
            data['global.' + key] = config.templateGlobals[key];
            const replace = data[key];
            const find = '{' + key + '}';
            str = str.replace(find, replace);
        }
    }
    return str;
};

module.exports = helpers;