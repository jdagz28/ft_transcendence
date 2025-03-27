const fastify = require('fastify')
const serverOptions = {
    logger: true
}

const app = fastify(serverOptions)

app.route({
    url: '/',
    method: 'GET',
    handler: myHandler
})

function myHandler (request, reply) {
    reply.send({ helloFrom: this.server.address() })
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