const environments = {
    staging: {
        httpPort: process.env.httpPort || 3000,
        httpsPort: process.env.httpsPort || 3001,
        envName: process.env.envName || 'staging',
        hashingSecret: process.env.hashingSecret || 'This is a secret',
        maxChecks: 5
    },
    production: {
        httpPort: process.env.httpPort || 5000,
        httpsPort: process.env.httpsPort || 5001,
        envName: process.env.envName || 'production',
        hashingSecret: process.env.hashingSecret || 'This is a secret',
        maxChecks: 5
    }
};

const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ?
    process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ?
    environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;