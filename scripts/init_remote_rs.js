const { MongoClient } = require('mongodb');

const { MongoClient } = require('mongodb');

// Dynamically get URL from environment (Zeabur injects this)
let url = process.env.DATABASE_URL;

if (!url) {
    console.warn('⚠️ DATABASE_URL is not set. Skipping RS init.');
    // We exit successfully to allow the app to attempt startup anyway
    process.exit(0);
}

// Force directConnection=true for the initialization step
// This allows connecting to the instance even before it's a Replica Set
if (!url.includes('directConnection=true') && !url.includes('replicaSet=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}directConnection=true`;
}

console.log('Using Database URL for Init:', url.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

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
