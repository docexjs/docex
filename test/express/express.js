const http = require('http');
const express = require('express');

const docex = require('../../dist/docex.js').default;

const app = express();

app.use((req, res, next) => {
    const send = res.send;
    res.send = function() {
        res.body = arguments[0];
        send.apply(res, arguments);
    };
    next();
});

app.use(docex({ openapiPath: './openapi.yaml' }));

app.get('/', (req, res, next) => {
    const obj = {
        foo: 'bar'
    };
    res.send(obj);

    return obj;
});

module.exports = http.createServer(app).listen(5000);
