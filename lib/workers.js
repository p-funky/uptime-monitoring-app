const path =  require('path');
const fs =  require('fs');
const http =  require('http');
const https =  require('https');
const url =  require('url');
const _data =  require('./data');
const helpers =  require('./helpers');

const workers = {};

workers.alertUserToStatusChanged = checkData => {
    const message = `Alert: Your check for ${checkData.method.toUpperCase()}
        ${checkData.protocol}:// is currently ${checkData.state}`;
    helpers.sendTwilioSms(checkData.userPhone, message, function(err) {
        if (!err) {
            console.log("Success: User was alerted to a status change in their check via sms: ", message);
        } else {
            console.log("Error: Could not send sms alert to user who had a state change in their check");
        }
    });
}

workers.processCheckOutcome = (checkData, checkOutcome) => {
    const state = !checkOutcome.error && checkOutcome.responseCode
        && checkData.successCodes.indexOf(checkOutcome.responseCode > -1) ?
            'up' : 'down';
    const alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;
    const newCheckData = checkData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    _data.update('checks', newCheckData.id, newCheckData, function (err) {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChanged(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log("Error trying to save updates to one of the checks");
        }
    })
};

workers.performCheck = checkData => {
    const checkOutcome = { error: false, responseCode: false };
    const outcomeSent = false;
    const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
    const hostname = parsedUrl.hostname;
    const path = parsedUrl.path;

    const requestDetails = {
        protocol: `${checkData.protocol}:`,
        hostname,
        method: checkData.method.toUpperCase(),
        path,
        timeout: checkData.timeOutSeconds * 1000,
    };

    const outcomeRoutine = () => {
        if (!outcomeSent) {
            workers.processCheckOutcome(checkData, checkOutcome);
            outcomeSent = true;
        }
    };

    const req = window[checkData.protocol].request(requestDetails, function(res) {
        checkOutcome.responseCode = res.statusCode;
        outcomeRoutine();
    });

    req.on('error', function(err) {
        checkOutcome.error = {
            error: true,
            value: err
        };
        outcomeRoutine();
    });

    req.on('timeout', function(err) {
        checkOutcome.error = {
            error: true,
            value: 'timeout'
        };
        outcomeRoutine();
    });

    req.end();
};

workers.validateCheckData = checkData => {
    const originalCheckData = helpers.validateChecksFields(checkData);
    originalCheckData.id = typeof(checkData.id) === 'string' && checkData.id.trim().length === 20 ?
        checkData.id.trim() : false;
    originalCheckData.userPhone = typeof(checkData.userPhone) === 'string' && checkData.userPhone.trim().length === 10 ?
        checkData.userPhone.trim() : false;
    originalCheckData.state = typeof(checkData.state) === 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ?
        checkData.state : 'down';
    originalCheckData.lastChecked = typeof(checkData.lastChecked) === 'number' && checkData.lastChecked > 0 ?
        checkData.lastChecked : false;
    const { id, userPhone, protocol, url, method, successCodes, timeOutSeconds, state, lastChecked } = originalCheckData;
    if (id && userPhone && protocol && url && method && successCodes && timeOutSeconds) {
        workers.performCheck(originalCheckData);
    } else {
        console.log('Error: One of the checks is not properly formatted. Skipping it.');
    }
};

workers.gatherAllChecks = () => {
    _data.list('checks', function(err, checks) {
        if (!err && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, function(err, originalCheckData) {
                    if (!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log('Error reading one of the check\'s data')
                    }
                });
            });
        } else {
            console.log('Error: could not find any checks to process');
        }
    });
};

workers.loop = () => {
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60)
};

workers.init = function() {
    workers.gatherAllChecks();

    workers.loop();
}

module.exports = workers;