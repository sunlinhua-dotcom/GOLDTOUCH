
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.analysisReport.count();
    console.log('Total reports:', count);
}
main();
