const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const dgram = require('dgram');

const app = express();

app.use(bodyParser.json());
app.set('trust proxy', true);

const connectionString = process.env.DATABASE_URL || 'mongodb.net/testEnviroment';
const [, db] = connectionString.match(/mongodb.net\/(.*)$/);


app.get('/udp', async (req, res) => {
    function udpWork(successCallback, errorCallback) {
        const socket = dgram.createSocket('udp6');
        const response = {
            ['log-listening']: [],
            ['log-error']: [],
            ['log-message']: [],
        }

        socket.on('listening', () => {
            const { address, port } = socket.address();
            response['log-listening'].push(`Listening for UDP packets at container@${address}@${port}`);
            response['log-listening'].push(`Remote tcp/http packets comming from@${req.socket.remoteAddress}@${req.socket.remotePort}`);
            response['log-listening'].push(`Local tcp/http packets comming from@${req.socket.localAddress}@${req.socket.localPort}`);
        });

        socket.on('error', (err) => {
            response['log-error'].push(`UDP error@${err.stack}`);
            socket.close()
            errorCallback(response)
        });

        socket.on('message', async (msg, rinfo) => {
            let client = null;
            try {
                client = new MongoClient(connectionString);
                const database = client.db(db);
                const records = database.collection('servers');
                const address = rinfo.address;
                const port = rinfo.port;
                const toInsert = { address, port };
                const { insertedId } = await records.insertOne(toInsert);
            } finally {
                await client.close();
            }
            response['log-message'].push(`Received on socket@${msg.toString()}@${rinfo.address}@${rinfo.port}@${rinfo.family}@${rinfo.size}`)
        });

        socket.bind(process.env.PORT || 3001);     // listen for UDP with dgram
        socket.send("server punching that hole remote", req.socket.remotePort, req.socket.remoteAddress);
        socket.send("server punching that hole remote again", req.socket.remotePort, req.socket.remoteAddress);
        socket.send("server punching that hole local", req.socket.localPort, req.socket.localAddress);
        socket.send("server punching that hole local again", req.socket.localPort, req.socket.localAddress);

        setTimeout(function () {
            response['log-error'].push('time out');
            socket.close()
            successCallback(response);
        }, parseInt(req.query.time) || 1000);
    }

    const waitedResp = new Promise((resolve, reject) => {
        udpWork((successResponse) => {
            resolve(successResponse);
        }, (errorResponse) => {
            reject(errorResponse);
        });
    });

    const resp = await waitedResp;

    return res.status(200).json(resp);
});

app.get('/ip', (req, res) => {
    const result = {
        ['req-ip']: req.ip,
        ['x-forwarded-for']: req.headers['x-forwarded-for'],
        ['req-ips']: req.ips,
        ['socket-remoteFamily']: req.socket.remoteFamily,
        ['socket-remotePort']: req.socket.remotePort,
        ['socket-remoteAddress']: req.socket.remoteAddress,
        ['socket-localAddress']: req.socket.localAddress,
        ['socket-localPort']: req.socket.localPort,
        ['socket-localFamily']: req.socket.localFamily,
        ['socket-boundTo']: JSON.stringify(req.socket.address()),
        headers: JSON.stringify(req.headers),
    }
    return res.status(200).json(result)
});

app.get('/', async (req, res) => {
    let client = null;
    try {
        client = new MongoClient(connectionString);
        const database = client.db(db);
        const records = database.collection('servers');
        const result = await records.find({}).toArray();
        return res.status(200).json(result)
    } finally {
        await client.close();
    }
});

app.post('/', async (req, res) => {
    let client = null;
    try {
        client = new MongoClient(connectionString);
        const database = client.db(db);
        const records = database.collection('servers');

        const toInsert = { address, port };
        const { insertedId } = await records.insertOne(toInsert);
        return res.status(201).json(toInsert);
    } finally {
        await client.close();
    }
});

app.delete('/', async (req, res) => {
    let client = null;
    try {
        client = new MongoClient(connectionString);
        const database = client.db(db);
        const records = database.collection('servers');
        const { deletedCount } = await records.deleteMany({});
        return res.statusCode(204);
    } finally {
        await client.close();
    }
});

module.exports = app;
