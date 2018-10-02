const path =  require('path');
const fs =  require('fs');
const http =  require('http');
const https =  require('https');
const url =  require('url');
const util = require('util');

const _data =  require('./data');
const helpers =  require('./helpers');
const _logs =  require('./logs');

const debug = util.debuglog('workers');

const workers = {};

workers.alertUserToStatusChanged = checkData => {
    const message = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`;
    helpers.sendTwilioSms(checkData.userPhone, message, function(err) {
        if (!err) {
            debug("Success: User was alerted to a status change in their check via sms: ", message);
        } else {
            debug("Error: Could not send sms alert to user who had a state change in their check", err);
        }
    });
};

workers.processCheckOutcome = (checkData, checkOutcome) => {
    const state = !checkOutcome.error && checkOutcome.responseCode
        && checkData.successCodes.indexOf(checkOutcome.responseCode > -1) ?
            'up' : 'down';
    const alertWarranted = checkData.lastChecked && checkData.state !== state ? true : false;
    const newCheckData = checkData;
    newCheckData.state = state;
    const timeOfCheck = Date.now();
    newCheckData.lastChecked = timeOfCheck;

    workers.log(checkData, checkOutcome, state, alertWarranted, timeOfCheck);

    _data.update('checks', newCheckData.id, newCheckData, function (err) {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChanged(newCheckData);
            } else {
                debug('Check outcome has not changed, no alert needed');
            }
        } else {
            debug("Error trying to save updates to one of the checks");
        }
    })
};

workers.performCheck = checkData => {
    const checkOutcome = { error: false, responseCode: false };
    let outcomeSent = false;
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

    const req = eval(checkData.protocol).request(requestDetails, function(res) {
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
    const { id, userPhone, protocol, url, method, successCodes, timeOutSeconds } = originalCheckData;
    if (id && userPhone && protocol && url && method && successCodes && timeOutSeconds) {
        workers.performCheck(originalCheckData);
    } else {
        debug('Error: One of the checks is not properly formatted. Skipping it.');
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
                        debug('Error reading one of the check\'s data')
                    }
                });
            });
        } else {
            debug('Error: could not find any checks to process');
        }
    });
};

workers.log = (checkData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    const logData = {
        check: checkData,
        outcome: checkOutcome,
        state,
        alert: alertWarranted,
        time: timeOfCheck
    };
    const logString = JSON.stringify(logData);
    const logFileName = checkData.id;

    _logs.append(logFileName, logString, function(err) {
        if(!err) {
            debug('Logging to file succeeded');
        } else {
            debug('Logging to file failed');
        }
    })
};

workers.loop = () => {
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60)
};

workers.rotateLogs = () => {
    _logs.list(false, function(err, logs) {
        if (!err && logs && logs.length) {
            logs.forEach(logName => {
                const logId = logName.replace('.log', '');
                const newFileId = logId + '-' + Date.now();
                _logs.compress(logId, newFileId, function(err) {
                    if (!err) {
                        _logs.truncate(logId, function(err) {
                            if (!err) {
                                debug('Success truncating log file');
                            } else {
                                debug('Error truncting log file');
                            }
                        });
                    } else {
                        debug('Error compressing one of the log files', err);
                    }
                });
            });
        } else {
            consol.log('Error: Could not find any logs to rotate');
        }
    })
};

workers.logRotationLoop = () => {
    setInterval(function() {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24)
};

workers.init = function() {

    console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

    workers.gatherAllChecks();

    workers.loop();

    workers.rotateLogs();
    workers.logRotationLoop();
};

module.exports = workers;