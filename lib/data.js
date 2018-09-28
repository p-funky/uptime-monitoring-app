const fs = require('fs');
const path = require('path');
const helpers =  require('./helpers');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data/');

const filePath = function (dir, file) {
    return lib.baseDir + dir + '/' + file + '.json';
};

lib.create = function(dir, file, data, callback) {
    fs.open(filePath(dir, file), 'wx', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            fs.writeFile(fileDescriptor, stringData, function(err) {
                if (err) {
                    callback('Error writing to new file');
                }
                else {
                    fs.close(fileDescriptor, function(err) {
                        if (err) {
                            callback('Error closing to new file');
                        }
                        else {
                            callback(false);
                        }
                    })
                }
            });
        }
        else {
            callback('Could not create new file, it may already exist');
        }
    });
};

lib.read = function(dir, file, callback) {
    fs.readFile(filePath(dir, file), 'utf8', function(err, data) {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        }
        else {
            callback(err, data);
        }
    });
}

lib.update = function(dir, file, data, callback) {
    fs.open(filePath(dir, file), 'r+', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            fs.truncate(fileDescriptor, function(err) {
                if (err) {
                    callback('Error truncating file');
                }
                else {
                    fs.writeFile(fileDescriptor, stringData, function(err) {
                        if(err) {
                            callback('Error writing to existing file');
                        }
                        else {
                            fs.close(fileDescriptor, function(err) {
                                if (err) {
                                    callback('Error closing existing file');
                                }
                                else {
                                    callback(false);
                                }
                            });
                        }
                    });
                }
            });
        }
        else {
            callback('Could not open the file for updating, it may not exist yet');
        }
    });
}

lib.delete = function(dir, file, callback) {
    fs.unlink(filePath(dir, file), function(err) {
        if (err) {
            callback('Error deleting file');
        }
        else {
            callback(false);
        }
    });
};

lib.list = function(dir, callback) {
    fs.readdir(lib.baseDir + dir + '/', function(err, data) {
        if (!err && data && data.length > 0) {
            const trimmedFileNames = [];
            data.forEach(fileName => {
                trimmedFileNames.push(fileName.replace('.json', ''));
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

module.exports = lib;
