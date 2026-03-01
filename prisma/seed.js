const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create default organization
    const org = await prisma.organization.upsert({
        where: { id: BigInt(1) },
        update: {},
        create: {
            id: BigInt(1),
            name: 'SC VISORO GLOBAL SRL',
            status: 'active',
        },
    });
    console.log('Organization created:', org.name);

    // Create default admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@visoro.ro' },
        update: {},
        create: {
            email: 'admin@visoro.ro',
            password: hashedPassword,
            name: 'Admin',
            role: 'admin',
            organizationId: org.id,
        },
    });
    console.log('Admin user created:', admin.email);

    // Create default groups
    const groupNames = [
        '1 Osztály', '2 Osztály', '3 Osztály', '4 Osztály',
        '5 Osztály', '6 Osztály', '7 Osztály',
        'Admin', 'Archívum', 'Financiar', 'HR', 'Productie-RENNS', 'Vânzări',
    ];

    for (let i = 0; i < groupNames.length; i++) {
        await prisma.statisticGroup.upsert({
            where: { id: i + 1 },
            update: {},
            create: {
                id: i + 1,
                organizationId: org.id,
                name: groupNames[i],
                displayOrder: i,
            },
        });
    }
    console.log('Groups created:', groupNames.length);

    console.log('Seeding complete!');
    console.log('Login: admin@visoro.ro / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
