const supertest = require('supertest');
const server = require('./koa');

describe('koa generate docs', () => {
    it('generate xlsx list', (done) => {
        supertest(server)
            .get('/')
            .query({
                ext: 'xlsx',
                type: 'table'
            })
            .expect(200)
            .end(() => {
                done();
                server.close();
            });
    })
    it('generate xlsx table', (done) => {
        supertest(server)
            .get('/')
            .query({
                ext: 'xlsx',
                type: 'list'
            })
            .expect(200)
            .end(() => {
                done();
                server.close();
            });
    });

    it('generate pdf list', (done) => {
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
    })
    it('generate pdf table', (done) => {
        supertest(server)
            .get('/')
            .query({
                ext: 'pdf',
                type: 'list'
            })
            .expect(200)
            .end(() => {
                done();
                server.close();
            });
    });
});
