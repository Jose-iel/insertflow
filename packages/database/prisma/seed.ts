import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@insertflow.com' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin já existe, pulando seed...');
    return;
  }

  const admin = await prisma.user.create({
    data: {
      email: 'admin@insertflow.com',
      name: 'Admin',
      password: '$2a$10$t6t7sje5T2gd2nSmx6ZP5eHrjtONP49kpR594Bgce48QSHm9Enie.',
      role: 'admin',
    },
  });

  console.log('✅ Admin criado:', admin.email);
  console.log('\n🎉 Seed concluído!');
  console.log('\n📝 Credenciais:');
  console.log('Email: admin@insertflow.com');
  console.log('Senha: InsertFlow@2024!');
  console.log('\nHash da senha: $2a$10$t6t7sje5T2gd2nSmx6ZP5eHrjtONP49kpR594Bgce48QSHm9Enie.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
