const db = require('./database')
const fastify = require('fastify')
//! Define other server options
const serverOptions = {
    logger: true
}

const app = fastify(serverOptions)

app.route({
    url: '/',
    method: 'GET',
    onRequest: async (request, reply) => {
        if (!isAuthenticated(request)) {
            return reply.redirect('/login');
        }
    },
    handler: indexHandler
})

app.route({
    url: '/login',
    method: 'GET',
    handler: loginHandler
})

function isAuthenticated (request) {
    /**
     * ! Implement authenticated user check
     * * session-cookie, JWT, etc.
     */
    return false;
}

async function indexHandler (request, reply) {
    reply.send({ helloFrom: this.server.address() })
}

async function loginHandler (request, reply) {
    reply.send({ helloFrom: '/login' })
}

app.listen({
    port: 4242,
    host: '0.0.0.0'
})
    .then((address) => {
         console.log(`Server listening on ${address}`)
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });