const fs = require('fs');
const path = require('path');

const documentsPath = path.join(__dirname, 'documents.json');

const getDocumentsFromFile = (cb) => {
  fs.readFile(documentsPath, (err, fileContent) => {
    if (err) {
      cb([], 'error during read');
    } else {
      cb(JSON.parse(fileContent), 'ok');
    }
  });
};

module.exports = class Document {
  constructor(filename, hash, timestamp, author) {
    this.filename = filename;
    this.hash = hash;
    this.timestamp = timestamp;
    this.author = author;
  }

  save(callback) {
    getDocumentsFromFile((docs, status) => {
      if (docs) {
        if (status === 'ok') {
          let documents = Array.from(docs);
          let fileNameExisting = documents.some((doc) => doc.filename === this.filename);
          if (fileNameExisting) {
            console.log('filename already exists');
            callback('filename already exists');
            return;
          }
          let hashExisting = documents.some((doc) => doc.hash === this.hash);
          if (hashExisting) {
            console.log('hash already exists');
            callback('hash already exists: ' + this.hash);
            return;
          }
          docs.push(this);
          fs.writeFileSync(documentsPath, JSON.stringify(docs), err => {
            callback('error during document saving');
          });
          callback('success');
        }
        else {
          callback(status);
          return;
        }
      } else {
        callback('documents result is undefined');
        return;
      }
    });
  }

  static fetchAll(cb) {
    getDocumentsFromFile(cb);
  }

  static findByFilename(filename, cb) {
    getDocumentsFromFile(documents => {
      const document = documents.find(d => d.filename === filename);
      cb(document);
    });
  }

  static findByHash(hash, cb) {
    getDocumentsFromFile(documents => {
      const document = documents.find(d => d.hash === hash);
      cb(document);
    });
  }
};
