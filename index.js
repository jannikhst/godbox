const express = require('express');
const app = express();
const cors = require('cors');
const Document = require('./document');
const Log = require('./log');
const hash = require('object-hash');
const fs = require('fs');
const path = require('path');
const io = require("socket.io-client");
const unirest = require('unirest');

const port = process.env.PORT || 8080;
const router = express.Router();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(router);

const serialKey = fs.readFileSync(path.join(__dirname, 'serial.key')).toString();
let serverUrl = fs.readFileSync(path.join(__dirname, 'serverurl.txt')).toString();

// const socket = io('http://localhost:3000/', { auth: { token: serialKey } });

const socket = io(serverUrl, { auth: { token: serialKey } });

socket.on('connect', () => {
    console.log('connected!');
    new Log(Date.now(), 'Socket connected.').save(() => { });
});

socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
        socket.connect();
    }
    new Log(Date.now(), 'Socket disconnect: ' + reason).save(() => { });
});

socket.on('connect_error', () => {
    setTimeout(() => {
        socket.connect();
    }, 1000);
});


socket.on('logs', () => {
    Log.fetchAll((logs) => socket.emit('logs-result', logs));
});

socket.on('new', (json) => {
    console.log('new event!')
    const filename = json.filename;
    const content = json.content;
    const author = json.author;
    const password = json.password;
    if (!filename || !content || !author || !password) {
        socket.emit('new-result', {
            message: 'request has the wrong parameters',
            found: {
                'filename': !!filename,
                'content': !!content,
                'author': !!author,
                'password': !!password,
            }
        });
        return;
    }
    const response = {
        filename: filename,
        message: '',
    };
    checkPassword(password, (isCorrect) => {
        if (isCorrect) {
            let document = new Document(filename, hash(content), Date.now(), author);
            document.save((stat) => {
                response.message = stat;
                socket.emit('new-result', response);
            });
        } else {
            response.message = 'password incorrect';
            socket.emit('new-result', response);
        }
    });
});

socket.on('documents', (password) => {
    checkPassword(password, (isCorrect) => {
        if (isCorrect) {
            Document.fetchAll((documents) => {
                socket.emit('documents-result', documents);
            });
        } else {
            socket.emit('documents-result', []);
            new Log(Date.now(), 'incorrect password').save(() => { });
        }
    });
});

router.post('/new', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const filename = req.body['filename'];
    const password = req.body['password'];
    const content = req.body['content'];
    const author = req.body['author'];
    if (!filename || !content || !author || !password) {
        res.send(JSON.stringify({
            message: 'request has the wrong parameters',
            found: {
                'filename': !!filename,
                'content': !!content,
                'author': !!author,
                'password': !!password,
            }
        }));
        return;
    }
    checkPassword(password, (isCorrect) => {
        const json = {
            filename: filename,
            message: '',
        };
        if (isCorrect) {
            let document = new Document(filename, hash(content), Date.now(), author);
            document.save((stat) => {
                json.message = stat;
                res.send(JSON.stringify(json));
            });
        } else {
            json.message = 'password incorrect';
            res.send(JSON.stringify(json));
        }
    });
});

router.get('/documents', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    checkPassword(req.query.password, (isCorrect) => {
        if (isCorrect) {
            Document.fetchAll((documents) => res.send(JSON.stringify(documents)));
        } else {
            res.send(JSON.stringify([]));
            new Log(Date.now(), 'incorrect password').save(() => { });
        }
    });
});

router.get('/logs', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    Log.fetchAll((logs) => res.send(JSON.stringify(logs)));
});

router.post('/change-server-url', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const newUrl = req.body['url'];
    if (newUrl) {
        fs.writeFileSync(path.join(__dirname, 'serverurl.txt'), newUrl);
        serverUrl = newUrl;
        res.send(JSON.stringify({ message: 'changed successfully to: ' + serverUrl }));
    } else {
        res.send(JSON.stringify({ message: 'no url found' }))
    }
});

router.post('/deleteAllLogs', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    Log.deleteAll();
    new Log(Date.now(), 'deleted all logs').save(() => { });
});

router.get('/getByHash/:hashvalue', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    checkPassword(req.query.password, (isCorrect) => {
        if (isCorrect) {
            const value = req.params.hashvalue;
            Document.findByHash(value, (doc) => res.send(JSON.stringify(doc)));
        } else {
            res.send();
            new Log(Date.now(), 'incorrect password').save(() => { });
        }
    });
});

router.get('/getByName/:name', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    checkPassword(req.query.password, (isCorrect) => {
        if (isCorrect) {
            const name = req.params.name;
            Document.findByFilename(name, (doc) => res.send(JSON.stringify(doc)));
        } else {
            res.send();
            new Log(Date.now(), 'incorrect password').save(() => { });
        }
    });
});

router.get('/isup', (req, res, next) => {
    res.send('is running');
});

router.get('/hashAll', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    Document.fetchAll((documents) => {
        let hashed = hash(JSON.stringify(documents));
        res.send(JSON.stringify({
            timestamp: Date.now(),
            hash: hashed,
        }));
    });
});

app.listen(port, () => {
    console.log('started api');
    socket.connect();
});

const checkPassword = (password, cb) => {
    var pwd = encodeURIComponent(password);
    var serial = encodeURIComponent(serialKey);
    var req = unirest('GET', 'https://orcafilm.de/tools/godbox/auth/serialpassword.php?password=' + pwd + '&serial=' + serial)
        .end(function (res) {
            if (res.error) {
                cb(false);
            } else {
                cb(res.raw_body === 'true');
            }
        });
};