import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'iDarknesl1';

async function main() {
  console.log('Start seeding ...');
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  // 1. Crear usuario Administrador
  const adminEmail = 'admin@confiape.com';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      nombre: 'Administrador Principal',
      rol: Rol.ADMIN,
      emailVerified: true,
    },
  });
  console.log(`Created admin user: ${adminUser.email}`);

  // 2. Crear usuarios Clientes
  const clientes = [
    { email: 'cliente1@test.com', nombre: 'Juan Pérez' },
    { email: 'cliente2@test.com', nombre: 'María García' },
  ];

  for (const clienteData of clientes) {
    const user = await prisma.user.upsert({
      where: { email: clienteData.email },
      update: {},
      create: {
        email: clienteData.email,
        password: hashedPassword,
        nombre: clienteData.nombre,
        rol: Rol.CLIENTE,
        emailVerified: true,
      },
    });

    await prisma.cliente.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });
    console.log(`Created client user: ${user.email}`);
  }

  // 3. Crear usuarios Técnicos
  const tecnicos = [
    {
      email: 'tecnico1@test.com',
      nombre: 'Carlos Rodríguez',
      dni: '12345678',
      oficio: 'Electricista',
    },
    {
      email: 'tecnico2@test.com',
      nombre: 'Ana Martínez',
      dni: '87654321',
      oficio: 'Plomero',
    },
  ];

  for (const tecnicoData of tecnicos) {
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

    const nombreParts = tecnicoData.nombre.split(' ');
    const nombres = nombreParts.slice(0, 1).join(' ');
    const apellidos = nombreParts.slice(1).join(' ');

    await prisma.tecnico.upsert({
      where: { userId: user.id },
      update: {
        oficio: tecnicoData.oficio,
      },
      create: {
        userId: user.id,
        dni: tecnicoData.dni,
        nombres: nombres,
        apellidos: apellidos,
        oficio: tecnicoData.oficio,
        verificado: true, // Se crean como verificados para facilitar las pruebas
        disponible: true,
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
