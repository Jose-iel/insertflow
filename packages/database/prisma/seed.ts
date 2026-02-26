import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.generatedEncarte.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.image.deleteMany();
  await prisma.product.deleteMany();
  await prisma.template.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: 'Supermercado Demo',
      slug: 'supermercado-demo',
      active: true,
    },
  });

  console.log('✅ Organização criada:', org.name);

  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@insertflow.com',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin criado:', admin.email);

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'usuario@supermercado.com',
      name: 'Usuário Demo',
      password: userPassword,
      role: 'user',
      orgId: org.id,
    },
  });

  console.log('✅ Usuário criado:', user.email);

  const folder = await prisma.folder.create({
    data: {
      name: 'Mercado Maré',
      orgId: org.id,
    },
  });

  console.log('✅ Pasta criada:', folder.name);

  const products = await Promise.all([
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Coca Cola 2L',
        normalizedName: 'cocacola2l',
        price: 8.99,
      },
    }),
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Arroz Tio João 5kg',
        normalizedName: 'arroztiojoao5kg',
        price: 25.90,
      },
    }),
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Feijão Preto 1kg',
        normalizedName: 'feijaopreto1kg',
        price: 7.50,
      },
    }),
  ]);

  console.log(`✅ ${products.length} produtos criados`);

  console.log('\n🎉 Seed concluído!');
  console.log('\nCredenciais:');
  console.log('Admin: admin@insertflow.com / admin123');
  console.log('Usuário: usuario@supermercado.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
