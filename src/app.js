const express = require("express");
const bodyParser = require("body-parser");
const { MongoClient } = require("mongodb");
const dgram = require('dgram');

const app = express();

app.use(bodyParser.json());
app.set('trust proxy', true);

const socket = dgram.createSocket('udp4');
const connectionString = process.env.DATABASE_URL || 'mongodb.net/testEnviroment';
const [, db] = connectionString.match(/mongodb.net\/(.*)$/);


socket.on('listening', () => {
    let addr = socket.address();
    console.log(`Listening for UDP packets at ${addr.address}:${addr.port}`);
});

socket.on('error', (err) => {
    console.error(`UDP error: ${err.stack}`);
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
    console.log(msg, rinfo.address, rinfo.port, rinfo.family, rinfo.size)
});

socket.bind(process.env.PORT || 3001);     // listen for UDP with dgram

app.get('/udp', (req, res) => {
    let addr = socket.address();
    socket.send("mandei", addr.port, addr.address);
    return res.sendStatus(200);
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
