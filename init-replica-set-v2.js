
// init-replica-set-v2.js
// 运行命令: mongosh --port 27017 init-replica-set-v2.js
// 或者: node init-replica-set-v2.js (如果这是一个 Node 脚本)

// 鉴于它是 .js 后缀且在 Node 环境工程中，通常是用 mongosh 执行或 node 执行驱动。
// 用户给的指令是: node init-replica-set-v2.js
// 所以这应该是一个 Node.js 脚本，使用 mongodb driver 或者 child_process 调用。

const { MongoClient } = require('mongodb');

async function initReplicaSet() {
    const uri = "mongodb://127.0.0.1:27017";
    const client = new MongoClient(uri, { directConnection: true });

    try {
        await client.connect();
        console.log("Connected to MongoDB");

        const adminDb = client.db('admin');

        // Check current status
        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log("Replica set already initialized:", status.set);
            if (status.set === 'rs0') {
                console.log("✅ Replica Set 'rs0' is active.");
                return;
            }
        } catch (e) {
            console.log("Replica set not initialized yet (Expected).");
        }

        // Initialize
        const config = {
            _id: "rs0",
            members: [
                { _id: 0, host: "127.0.0.1:27017" }
            ]
        };

        console.log("Initializing replica set with config:", config);
        const result = await adminDb.command({ replSetInitiate: config });
        console.log("✅ Replica Set initialized:", result);

    } catch (err) {
        if (err.codeName === 'AlreadyInitialized') {
            console.log("✅ Replica Set 'rs0' is already active.");
        } else {
            console.error("❌ Failed:", err);
        }
    } finally {
        await client.close();
    }
}

initReplicaSet();
