const fs = require('fs');
const path = require('path');

const logsPath = path.join(__dirname, 'logs.json');

const getLogsFromFile = (cb) => {
    fs.readFile(logsPath, (err, fileContent) => {
        if (err) {
            cb([], 'error during read');
        } else {
            cb(JSON.parse(fileContent), 'ok');
        }
    });
};

module.exports = class Log {
    constructor(timestamp, message) {
        this.timestamp = timestamp;
        this.message = message;
    }

    save(callback) {
        getLogsFromFile((logs, status) => {
            if (logs) {
                logs.push(this);
                if(logs.length > 100) logs.shift();
                fs.writeFileSync(logsPath, JSON.stringify(logs), err => {
                    callback('error during log saving');
                });
                callback('success');
            } else {
                callback('logs result is undefined');
            }
        });
    }

    static fetchAll(cb) {
        getLogsFromFile(cb);
    }

    static deleteAll() {
        fs.writeFileSync(logsPath, JSON.stringify([]), err => { });
    }
};
