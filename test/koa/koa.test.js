const supertest = require('supertest');
const server = require('./koa');

describe('koa', () => {
    it('simple server', (done) => {
        supertest(server)
            .get('/')
            .query({
                ext: 'pdf',
                type: 'table'
            })
            .expect(200)
            .end(() => {
                done();
                server.close();
            });
    });
});
