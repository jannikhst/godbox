const express = require('express');
const app = express();
const cors = require('cors');
const Document = require('./document');
const hash = require('object-hash');

const port = process.env.PORT || 8080;
const router = express.Router();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(router);


router.post('/new', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const filename = req.body['filename'];
    const content = req.body['content'];
    if (!filename || !content) {
        res.send(JSON.stringify({
            message: 'request has the wrong parameters',
            hints: ['check for null values', 'check for typo mistakes']
        }));
        return;
    }
    const json = {
        filename: filename,
        message: '',
    };
    let document = new Document(filename, hash(content), Date.now());
    document.save((stat) => {
        json.message = stat;
        res.send(JSON.stringify(json));
    });
});

router.get('/documents', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    Document.fetchAll((documents) => res.send(JSON.stringify(documents)));
});

router.get('/getByHash/:hashvalue', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const value = req.params.hashvalue;
    Document.findByHash(value, (doc) => res.send(JSON.stringify(doc)));
});

router.get('/getByName/:name', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    const name = req.params.name;
    Document.findByFilename(name, (doc) => res.send(JSON.stringify(doc)));
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

app.listen(port, () => { console.log('started api') });
