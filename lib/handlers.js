const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const handlers = {
    ping: function(data, callback) {
        callback(200);
    },
    notFound: function(data, callback) {
        callback(404);
    },
    users: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete'];
        if (acceptableMethods.indexOf(data.method) !== -1) {
            handlers._users[ data.method ](data, callback);
        }
        else {
            callback(405);
        }
    },
    tokens: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete'];
        if (acceptableMethods.indexOf(data.method) !== -1) {
            handlers._tokens[ data.method ](data, callback);
        }
        else {
            callback(405);
        }
    },
    checks: function(data, callback) {
        const acceptableMethods = ['post', 'get', 'put', 'delete'];
        if (acceptableMethods.indexOf(data.method) !== -1) {
            handlers._checks[ data.method ](data, callback);
        }
        else {
            callback(405);
        }
    }
};

const processRequiredField = (field, payload) => {
    let processedField;
    const requiredField = payload[field];
    if (typeof(payload[field]) === 'string') {
        processedField = requiredField.trim();
        if (field === 'phone') {
            return processedField.length === 10 ? processedField : false;
        }
        return processedField.length > 0 ? processedField : false;
    }
    else {
        return requiredField === true ? true : false;
    }
}

handlers._users = {};

handlers._users.post = function(data, callback) {
    const firstName = processRequiredField('firstName', data.payload);
    const lastName = processRequiredField('lastName', data.payload);
    const phone = processRequiredField('phone', data.payload);
    const password = processRequiredField('password', data.payload);
    const tosAgreement = processRequiredField('tosAgreement', data.payload);

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, function(err, data) {
            if (err) {
                const hashedPassword = helpers.hash(password);
                const userObject = {
                    firstName,
                    lastName,
                    phone,
                    password: hashedPassword,
                    tosAgreement
                };
                _data.create('users', phone, userObject, function(err) {
                    if (!err) {
                        callback(200);
                    }
                    else {
                        console.log(err);
                        callback(400, {Error: 'Could not create a new user'});
                    }
                });
            }
            else {
                callback(400, {Error: 'A user with that phone number already exists'});
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required fields'});
    }
};

handlers._users.get = function(data, callback) {
    const requestPhone = data.queryStringObject.phone;
    const phone = typeof(requestPhone) === 'string' && requestPhone.trim().length === 10 ?
        requestPhone.trim() : false;
    if (phone) {
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function(err, userData) {
                    if (!err && userData) {
                        delete userData.password;
                        callback(200, userData);
                    }
                    else {
                        callback(404)
                    }
                });
            } else {
                callback(403, {Error: 'Missing required token in header or token is invalid'});
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required field'});
    }
};

handlers._users.put = function(data, callback) {
    const firstName = processRequiredField('firstName', data.payload);
    const lastName = processRequiredField('lastName', data.payload);
    const phone = processRequiredField('phone', data.payload);
    const password = processRequiredField('password', data.payload);
    if (phone) {
        if (firstName || lastName || password) {
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
                if (tokenIsValid) {
                    _data.read('users', phone, function(err, userData) {
                        if (!err && userData) {
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.password = helpers.hash(password);
                            }
                            _data.update('users', phone, userData, function(err) {
                                if (!err) {
                                    callback(200);
                                }
                                else {
                                    console.log(err);
                                    callback(500, {Error: 'Could not update the user'});
                                }
                            });
                        }
                        else {
                            callback(400, {Error: 'The specified user does not exist'});
                        }
                    });
                } else {
                    callback(403, {Error: 'Missing required token in header or token is invalid'});
                }
            });
        }
        else {
            callback(400, {Error: 'Missing required field'});
        }
    }
    else {
        callback(400, {Error: 'Missing required field'});
    }
};

handlers._users.delete = function(data, callback) {
    const requestPhone = data.queryStringObject.phone;
    const phone = typeof(requestPhone) === 'string' && requestPhone.trim().length === 10 ?
        requestPhone.trim() : false;
    if (phone) {
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        handlers._tokens.verifyToken(token, phone, function(tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users', phone, function(err, userData) {
                    if (!err && userData) {
                        _data.delete('users', phone, function(err) {
                            if (!err) {
                                callback(200);
                            }
                            else {
                                callback(500, {Error: 'Could not delete the specified user'});
                            }
                        });
                    }
                    else {
                        callback(400, {Error: 'Could not find the specified user'});
                    }
                });
            } else {
                callback(403, {Error: 'Missing required token in header or token is invalid'});
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required field'});
    }
};

handlers._tokens = {};

handlers._tokens.post = function(data, callback) {
    const phone = processRequiredField('phone', data.payload);
    const password = processRequiredField('password', data.payload);
    if (phone && password) {
        _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
                const hashedPassword = helpers.hash(password);
                if (hashedPassword === userData.password) {
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;
                    const tokenObject = {
                        phone,
                        id: tokenId,
                        expires
                    };
                    _data.create('tokens', tokenId, tokenObject, function(err) {
                        if (!err) {
                            callback(200, tokenObject);
                        }
                        else {
                            callback(500, {Error: 'Could not create the new token'});
                        }
                    });
                }
                else {
                    callback(400, {Error: 'Password did not match the specified user\'s stored password'});
                }
            }
            else {
                callback(400, {Error: 'Could not find the specified user'});
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required fields'});
    }
};

handlers._tokens.get = function(data, callback) {
    const requestId = data.queryStringObject.id;
    const id = typeof(requestId) === 'string' && requestId.trim().length === 20 ?
        requestId.trim() : false;
    if (id) {
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                callback(200, tokenData);
            }
            else {
                callback(404)
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required field'});
    } 
};

handlers._tokens.put = function(data, callback) {
    const requestId = data.payload.id;
    const id = typeof(requestId) === 'string' && requestId.trim().length === 20 ?
        requestId.trim() : false;
    const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ?
        true : false;
    if (id && extend) {
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    _data.update('tokens', id, tokenData, function(err) {
                        if (err) {
                            callback(500, {Error: 'Could not update the token\'s expiration'});
                        }
                    });
                } else {
                    callback(400, {Error: 'The token has already expired and cannot be extended'});
                }
                callback(200, tokenData);
            }
            else {
                callback(400, {Error: 'Specified token does not exist'})
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required field(s) or field(s) are invalid'});
    } 
};

handlers._tokens.delete = function(data, callback) {
    const requestId = data.queryStringObject.id;
    const id = typeof(requestId) === 'string' && requestId.trim().length === 20 ?
        requestId.trim() : false;
    if (id) {
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', id, function(err) {
                    if (!err) {
                        callback(200);
                    }
                    else {
                        callback(500, {Error: 'Could not delete the specified token'});
                    }
                });
            }
            else {
                callback(400, {Error: 'Could not find the specified token'});
            }
        });
    }
    else {
        callback(400, {Error: 'Missing required field'});
    }
};

handlers._tokens.verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

handlers._checks = {};

handlers._checks.post = function(data, callback) {
    const reqProtocol = data.payload.protocol;
    const protocol = typeof(reqProtocol) === 'string' && ['https', 'http'].indexOf(reqProtocol) > -1 ?
        reqProtocol: false;
    const url = processRequiredField('url', data.payload);
    const reqMethod = data.payload.method;
    const method = typeof(reqMethod) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(reqMethod) > -1 ?
        reqMethod: false;
    const reqSuccessCodes = data.payload.successCodes;
    const successCodes = typeof(reqSuccessCodes) === 'object' && reqSuccessCodes instanceof Array && reqSuccessCodes.length > 0 ?
        reqSuccessCodes: false;
    const reqTimeOut = data.payload.timeOutSeconds;
    const timeOutSeconds = typeof(reqTimeOut) === 'number' && reqTimeOut % 1 === 0 && reqTimeOut >= 1 && reqTimeOut <= 5 ?
        reqTimeOut: false;
    
    if (protocol && url && method && successCodes && timeOutSeconds) {
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        _data.read('tokens', token, function(err, tokenData) {
            if (!err && tokenData) {
                const userPhone = tokenData.phone;
                _data.read('users', userPhone, function(err, userData) {
                    if (!err && userData) {
                        const userChecks = typeof userData.checks === 'object' && userData.checks instanceof Array ?
                            userData.checks : [];
                        if (userChecks.length < config.maxChecks) {
                            const checkId = helpers.createRandomString(20);
                            const checkObject = {
                                id: checkId,
                                userPhone,
                                protocol,
                                url,
                                method,
                                successCodes,
                                timeOutSeconds
                            };
                            _data.create('checks', checkId, checkObject, function(err) {
                                if (!err) {
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);
                                    _data.update('users', userPhone, userData, function(err) {
                                        if (!err) {
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, {Error: 'Could not update the user with the new check'});
                                        }
                                    })
                                } else {
                                    callback(500, {Error: 'Could not create the new check'});
                                }
                            });
                        } else {
                            callback(400, {Error: `The user already has the maximum number of checks (${config.maxChecks})`});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, {Error: 'Missing required inputs or inputs are invalid'})
    }
};

handlers._checks.get = function(data, callback) {

};

handlers._checks.put = function(data, callback) {

};

handlers._checks.delete = function(data, callback) {

};

module.exports = handlers;