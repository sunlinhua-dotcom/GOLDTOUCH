const { MongoClient } = require('mongodb');

// Internal Zeabur Connection URL (for running inside the cluster)
// Username: mongo
// Password: k01q2u7YTPby56g4ZSH83jrMw9DsIzvN
// Host: mongo (Zeabur service name)
// Port: 27017 (Internal port)
const url = 'mongodb://mongo:k01q2u7YTPby56g4ZSH83jrMw9DsIzvN@mongo:27017/mojin?authSource=admin&directConnection=true';

const client = new MongoClient(url, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000
});

async function main() {
    console.log('--- MongoDB RS Init Script ---');
    try {
        console.log('Connecting to MongoDB (Internal)...');
        await client.connect();
        console.log('Connected successfully to server.');

        const adminDb = client.db('admin');

        // Check current status
        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log('✅ Already in Replica Set mode. Set Name:', status.set);
            return;
        } catch (e) {
            console.log('⚠️ Not yet a replica set. Initializing...');
        }

        // Initialize Replica Set
        // Important: "host" here must be how other nodes see this node.
        // Inside Zeabur, "mongo:27017" is the stable internal address.
        const result = await adminDb.command({
            replSetInitiate: {
                _id: "rs0",
                members: [
                    { _id: 0, host: "mongo:27017" }
                ]
            }
        });

        console.log('✅ Replica Set Initialized:', result);

    } catch (error) {
        console.error('❌ Error during RS Init:', error.message);
        // We don't exit with error code because we want the app to try starting anyway
        // (Maybe it's already initialized but connection failed transiently)
    } finally {
        await client.close();
        console.log('--- End Script ---');
    }
}

main();
