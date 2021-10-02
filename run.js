const express = require('express')
const app = express()
const { MongoClient, ObjectId } = require('mongodb');
const Yml = require('yml')
const config = Yml.load('config.yml')
const package = require('./package.json')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const colors = require('colors');

const port = 7654

app.use(morgan('combined'))
app.use(express.json())
app.use(bodyParser.json())

const url = `mongodb://${config.db.host}:${config.db.port}`;
const mongoClient = new MongoClient(url);
const dbName = config.db.name;
let db;

const collections = config.collections

const run = async () => {
    console.log('Mini-Mango')
    console.log('version:', package.version, '\n')

    await mongoClient.connect();
    console.log('Mongo conn | ✓ Connected successfully to server');
    db = mongoClient.db(dbName);

    const versions = await db.collection('versions')

    app.get('/', (req, res) => res.send({ name: 'Mini-Mango', version: package.version }))

    app.listen(port, () => console.log('Mini-Mango | ✓ listening on', port))

    for await (const collectionSrc of collections) {
        const collection = Yml.load(collectionSrc)
        const dbVersion = (await versions.findOne({ name: collection.name })).version
        const text = ['Mini-Mango | collection:', collection.name, ', db version:', dbVersion, ', config version:', collection.version]

        if (dbVersion === collection.version) {
            console.log(...text)
        } else {
            console.log(colors.yellow('!!', ...text))
        }

        app.use('/' + collection.name, generateRouter(collection))
    }

    console.log('\npress ctrl + c to exit\n')

    return ''
}

const generateRouter = (collection) => {
    const router = express.Router()

    router.get('/', async (req, res, next) => {
        const conn = db.collection(collection.name);
        try {
            const data = await conn.find({}).toArray()

            if (data) {
                res.send(data)
            } else {
                res.status(404).send()
            }
        } catch (error) {
            res.status(500).send(error)
        }
    })

    router.get('/:id', async (req, res, next) => {
        const id = req.params.id
        const conn = db.collection(collection.name);
        try {
            const data = await conn.findOne({ _id: ObjectId(id) })

            if (data) {
                res.send(data)
            } else {
                res.status(404).send()
            }
        } catch (error) {
            res.status(500).send(error)
        }
    })

    router.put('/:id', async (req, res, next) => {
        const id = req.params.id
        const conn = db.collection(collection.name);
        try {
            const data = await conn.updateOne(
                { _id: ObjectId(id) },
                {
                    $set: req.body,
                    $currentDate: { lastModified: true }
                }
            )

            res.send(data)
        } catch (error) {
            res.status(500).send(error)
        }
    })

    router.post('/', async (req, res, next) => {
        const conn = db.collection(collection.name);
        try {
            const data = await conn.insertOne(
                req.body
            )
    
            res.send(data)
        } catch (error) {
            res.status(500).send(error)
        }
    })

    router.delete('/:id', async (req, res, next) => {
        const id = req.params.id
        const conn = db.collection(collection.name);
        try {
            const data = await conn.deleteOne({ _id: ObjectId(id) })
            
            if (data.deletedCount === 1) {
                res.send(data)
            } else if (data.acknowledged && data.deletedCount === 0) {
                res.status(404).send(data)
            } else {
                res.status(500).send(data)
            }
        } catch (error) {
            res.status(500).send(error)
        }
    })

    return router
}

module.exports = { run }