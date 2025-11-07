import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Crear usuario administrador
  const adminEmail = 'admin@confia.pe';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      nombre: 'Administrador',
      rol: Rol.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Crear usuarios técnicos de prueba
  const tecnicos = [
    {
      email: 'roberto.valeriano@test.com',
      nombre: 'ROBERTO CARLOS VALERIANO DIESTRA',
      dni: '42043632',
      oficio: 'Electricista',
    },
    {
      email: 'franclin.gonzales@test.com',
      nombre: 'FRANCLIN JUNIOR GONZALES ALEJANDRIA',
      dni: '75492475',
      oficio: 'Gasfitero',
    },
  ];

  for (const tecnicoData of tecnicos) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.upsert({
      where: { email: tecnicoData.email },
      update: {},
      create: {
        email: tecnicoData.email,
        password: hashedPassword,
        nombre: tecnicoData.nombre,
        rol: Rol.TECNICO,
        emailVerified: true,
      },
    });

    await prisma.tecnico.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        dni: tecnicoData.dni,
        nombres: tecnicoData.nombre.split(' ').slice(0, 2).join(' '),
        apellidos: tecnicoData.nombre.split(' ').slice(2).join(' '),
        oficio: tecnicoData.oficio,
        verificado: false,
      },
    });

    console.log(`Created technician user: ${user.email}`);
  }


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
