const fs =  require('fs');
const path =  require('path');
const zlib =  require('zlib');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.logs/');

lib.append = (file, str, callback) => {
    fs.open(lib.baseDir + file + '.log', 'a', function(err, fileDescriptor) {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', function(err) {
                if (!err) {
                    fs.close(fileDescriptor, function(err) {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended');
                        }
                    });
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

lib.list = (includeCompressedLogs, callback) => {
    fs.readdir(lib.baseDir, function(err, data) {
        if (!err && data && data.length) {
            const trimmedFileNames = [];
            data.forEach(fileName => {
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            });
            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

lib.compress = (logId, newFileId, callback) => {
    const sourceFile = logId + '.log';
    const destinationFile = newFileId + '.gz.b64';

    fs.readFile(lib.baseDir + sourceFile, 'utf8', function(err, inputString) {
        if (!err && inputString) {
            zlib.gzip(inputString, function(err, buffer) {
                if (!err && buffer) {
                    fs.open(lib.baseDir + destinationFile, 'wx', function(err, fileDescriptor) {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                                if (!err) {
                                    fs.close(fileDescriptor, function(err) {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

lib.decompress = (fileId, callback) => {
    const fileName = fileId + '.gz.b64';
    fs.readFile(lib.baseDir + fileName, 'utf8', function(err, str) {
        if (!err && str) {
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, function(err, outputBuffer) {
                if (!err && outputBuffer) {
                    callback(false, outputBuffer.toString());
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

lib.truncate = (logId, callback) => {
    fs.truncate(lib.baseDir + logId + '.log', 0, function(err) {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
}
module.exports = lib;