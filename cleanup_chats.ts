import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting chat cleanup...');

    // 1. Clean Client-Technician Duplicates
    const chatsWithTecnico = await prisma.chat.findMany({
        where: { tecnicoId: { not: null } },
        orderBy: { ultimoMensajeTimestamp: 'desc' } // Keep the most recent one
    });

    const seenTecnico = new Set<string>();
    const toDelete = new Set<string>();

    for (const chat of chatsWithTecnico) {
        // We know tecnicoId is not null here due to the where clause
        const key = `${chat.clienteId}-${chat.tecnicoId}`;
        if (seenTecnico.has(key)) {
            console.log(`Found duplicate Client-Technician chat: ${chat.id} (Client: ${chat.clienteId}, Tech: ${chat.tecnicoId})`);
            toDelete.add(chat.id);
        } else {
            seenTecnico.add(key);
        }
    }

    // 2. Clean Client-Admin Duplicates
    const chatsWithAdmin = await prisma.chat.findMany({
        where: { adminId: { not: null } },
        orderBy: { ultimoMensajeTimestamp: 'desc' }
    });

    const seenAdmin = new Set<string>();
    for (const chat of chatsWithAdmin) {
        const key = `${chat.clienteId}-${chat.adminId}`;
        if (seenAdmin.has(key)) {
            console.log(`Found duplicate Client-Admin chat: ${chat.id} (Client: ${chat.clienteId}, Admin: ${chat.adminId})`);
            toDelete.add(chat.id);
        } else {
            seenAdmin.add(key);
        }
    }

    console.log(`Found ${toDelete.size} chats to delete.`);

    if (toDelete.size > 0) {
        await prisma.chat.deleteMany({
            where: { id: { in: Array.from(toDelete) } }
        });
        console.log('Duplicates deleted successfully.');
    } else {
        console.log('No duplicates found.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
