const supertest = require('supertest');
const server = require('./koa');

describe('koa', () => {
    it('simple server', (done) => {
        supertest(server)
            .get('/')
            .expect(200)
            .end(done);
    });
});
