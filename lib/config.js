require('../.env');

const environments = {
    staging: {
        httpPort: process.env.httpPort || 3000,
        httpsPort: process.env.httpsPort || 3001,
        envName: process.env.envName || 'staging',
        hashingSecret: process.env.hashingSecret || 'This is a secret',
        maxChecks: 5,
        twilio: {
            accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
            authToken: '9455e3eb3109edc12e3d8c92768f7a67',
            fromPhone: '+15005550006'
        }
    },
    production: {
        httpPort: process.env.httpPort || 5000,
        httpsPort: process.env.httpsPort || 5001,
        envName: process.env.envName || 'production',
        hashingSecret: process.env.hashingSecret || 'This is a secret',
        maxChecks: 5,
        twilio: {
            faccountSid: '',
            authToken: '',
            fromPhone: ''
        }
    }
};

const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ?
    process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ?
    environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;