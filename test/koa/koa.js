const Koa = require('koa');
const Router = require('koa-router');

const docex = require('../../dist/docex.js').default;

const app = new Koa();
const router = new Router();

router.get('/', () => {
    return {
        foo: 'bar'
    }
});

app.use(docex());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000);

module.exports = app.callback();
