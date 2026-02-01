const { MongoClient } = require('mongodb');

// Connection URL provided by the user (Public Endpoint)
const url = 'mongodb://mongo:k01q2u7YTPby56g4ZSH83jrMw9DsIzvN@43.157.240.98:32025/mojin?authSource=admin&directConnection=true';
const client = new MongoClient(url);

async function main() {
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected successfully to server.');

        const adminDb = client.db('admin');

        // Check if already replica set
        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log('Already in Replica Set mode:', status.set);
            return;
        } catch (e) {
            console.log('Not yet a replica set. Initializing...');
        }

        // Initialize Replica Set
        const result = await adminDb.command({
            replSetInitiate: {
                _id: "rs0",
                members: [
                    { _id: 0, host: "mongo:27017" }
                ]
            }
        });

        console.log('Replica Set Initialized:', result);
        console.log('SUCCESS! You can now use Prisma with this database.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

main();
