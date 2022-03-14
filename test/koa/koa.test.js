const supertest = require('supertest');
const application = require('./koa');

describe('koa', () => {
    it('server', done => {
        supertest(application)
            .get('/')
            .expect(200)
            .end(done);
    });
});
