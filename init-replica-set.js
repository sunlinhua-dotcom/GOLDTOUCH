// 初始化MongoDB Replica Set
const { MongoClient } = require('mongodb');

async function initReplicaSet() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const admin = client.db('admin');

        // 初始化replica set
        const result = await admin.command({
            replSetInitiate: {
                _id: 'rs0',
                members: [{ _id: 0, host: 'localhost:27017' }]
            }
        });

        console.log('Replica set initialized:', result);

        // 等待replica set准备好
        console.log('Waiting for replica set to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const status = await admin.command({ replSetGetStatus: 1 });
        console.log('Replica set status:', status.ok === 1 ? 'OK' : 'Not ready');

    } catch (error) {
        if (error.codeName === 'AlreadyInitialized') {
            console.log('Replica set already initialized - this is fine!');
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await client.close();
    }
}

initReplicaSet();
