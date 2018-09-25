const crypto = require('crypto');
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

module.exports = helpers;