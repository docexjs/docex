const supertest = require('supertest');
const server = require('./express');

describe('express', () => {
    it('simple server', (done) => {
        supertest(server)
            .get('/')
            .expect(200)
            .end(() => {
                done();
                server.close();
            });
    });
});
