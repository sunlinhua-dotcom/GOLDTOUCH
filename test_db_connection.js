// Quick test to verify MongoDB connection via Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
});

async function testConnection() {
    try {
        console.log('Testing MongoDB connection...');

        // Try to count users
        const count = await prisma.user.count();
        console.log('✅ Connection successful!');
        console.log(`Found ${count} users in database`);

        await prisma.$disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('Full error:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

testConnection();
