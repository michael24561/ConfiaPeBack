// prisma/clear-calificaciones.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando limpieza de la tabla "calificaciones"...')
  
  const { count } = await prisma.calificacion.deleteMany({})
  
  console.log(`Se han eliminado ${count} registros de la tabla "calificaciones".`)
  console.log('Limpieza completada.')
}

main()
  .catch((e) => {
    console.error('Ocurrió un error durante la limpieza:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
