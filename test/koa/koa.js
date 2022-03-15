const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');

const docex = require('../../dist/docex.js').default;

const app = new Koa();
const router = new Router();

router.get('/', (ctx, next) => {
    const obj = {
        foo: 'bar'
    };
    ctx.body = obj;

    return obj;
});

app.use(docex());
app.use(router.routes());
app.use(router.allowedMethods());

module.exports = http.createServer(app.callback()).listen(3000);
