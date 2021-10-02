const { MongoClient, ObjectId } = require('mongodb');
const Yml = require('yml')
const config = Yml.load('config.yml')
const package = require('./package.json')

const url = `mongodb://${config.db.host}:${config.db.port}`;
const mongoClient = new MongoClient(url);
const dbName = config.db.name;
let db;

const migrate = async () => {
    console.log('Mini-Mango | migrate')
    console.log('version:', package.version)
    console.log('')

    await mongoClient.connect();
    console.log('Mongo conn | ✓ Connected successfully to server');
    db = mongoClient.db(dbName);

    const collections = config.collections
    const dbCollections = await mongoClient.db().listCollections().toArray();
    const collectionNames = dbCollections.map(c => c.name);
    const versions = await db.collection('versions')

    for await (const collectionSrc of collections) {
        const collection = Yml.load(collectionSrc)
        const collectionExists = collectionNames.indexOf(collection.name) !== -1

        let validator = {}

        if (collectionNames.indexOf('versions') === -1) {
            db.createCollection('versions')    
        }
      
        if (collection.properties) {
            validator = { 
                $jsonSchema: {
                    bsonType: "object",
                    required: collection.required,
                    properties: collection.properties
                }
            }
        }
        
        if (collectionExists) {
            const dbVersion = (await versions.findOne({ name: collection.name })).version

            if (dbVersion !== collection.version) {
                console.log('Mongo conn | Updating', collection.name, 'version from', dbVersion, 'to', collection.version)

                await db.command({
                    "collMod": collection.name,
                    "validator": validator,
                    "validationLevel": "moderate"
                })

                await versions.updateOne({ name: collection.name },
                {
                    $set: { version: collection.version },
                    $currentDate: { lastModified: true }
                })
            } else {
                console.log('Mongo conn |', collection.name, 'ok')
            }
        } else {
            console.log('Mongo conn | Creating', collection.name, 'version', collection.version)

            await db.createCollection(
                collection.name, 
                { validator }
            )

            await versions.insertOne({ name: collection.name, version: collection.version })
        }
    }

    console.log('Mongo conn | closing')
    mongoClient.close()

    return ''
}

module.exports = { migrate }