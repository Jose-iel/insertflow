import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database (DEV)...');

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

  const template = await prisma.template.create({
    data: {
      name: 'Template Feed - 3 Produtos com Destaque',
      orgId: org.id,
      folderId: folder.id,
      format: 'feed',
      width: 1080,
      height: 1440,
      productSlots: 3,
      data: {
        background: {
          type: 'gradient',
          value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        },
        elements: [
          {
            id: 'img-1',
            type: 'image',
            x: 100,
            y: 100,
            width: 400,
            height: 400,
            rotation: 0,
            layer: 0,
            locked: false,
            opacity: 1,
            src: null,
            variable: '{{imagem_produto_1}}',
          },
          {
            id: 'text-1',
            type: 'text',
            x: 100,
            y: 520,
            width: 400,
            height: 60,
            rotation: 0,
            layer: 1,
            locked: false,
            opacity: 1,
            content: '{{nome_produto_1}}',
            fontSize: 32,
            fontFamily: 'Roboto',
            fontWeight: 700,
            color: '#ffffff',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'text-2',
            type: 'text',
            x: 100,
            y: 590,
            width: 400,
            height: 80,
            rotation: 0,
            layer: 2,
            locked: false,
            opacity: 1,
            content: 'R$ {{preco_produto_1}}',
            fontSize: 48,
            fontFamily: 'Roboto',
            fontWeight: 900,
            color: '#fbbf24',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'img-2',
            type: 'image',
            x: 580,
            y: 100,
            width: 400,
            height: 400,
            rotation: 0,
            layer: 3,
            locked: false,
            opacity: 1,
            src: null,
            variable: '{{imagem_produto_2}}',
          },
          {
            id: 'text-3',
            type: 'text',
            x: 580,
            y: 520,
            width: 400,
            height: 60,
            rotation: 0,
            layer: 4,
            locked: false,
            opacity: 1,
            content: '{{nome_produto_2}}',
            fontSize: 24,
            fontFamily: 'Roboto',
            fontWeight: 600,
            color: '#ffffff',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'text-4',
            type: 'text',
            x: 580,
            y: 590,
            width: 400,
            height: 60,
            rotation: 0,
            layer: 5,
            locked: false,
            opacity: 1,
            content: 'R$ {{preco_produto_2}}',
            fontSize: 36,
            fontFamily: 'Roboto',
            fontWeight: 700,
            color: '#fbbf24',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'img-3',
            type: 'image',
            x: 340,
            y: 750,
            width: 400,
            height: 400,
            rotation: 0,
            layer: 6,
            locked: false,
            opacity: 1,
            src: null,
            variable: '{{imagem_produto_3}}',
          },
          {
            id: 'text-5',
            type: 'text',
            x: 340,
            y: 1170,
            width: 400,
            height: 60,
            rotation: 0,
            layer: 7,
            locked: false,
            opacity: 1,
            content: '{{nome_produto_3}}',
            fontSize: 24,
            fontFamily: 'Roboto',
            fontWeight: 600,
            color: '#ffffff',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'text-6',
            type: 'text',
            x: 340,
            y: 1240,
            width: 400,
            height: 60,
            rotation: 0,
            layer: 8,
            locked: false,
            opacity: 1,
            content: 'R$ {{preco_produto_3}}',
            fontSize: 36,
            fontFamily: 'Roboto',
            fontWeight: 700,
            color: '#fbbf24',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 0,
            align: 'center',
          },
          {
            id: 'img-logo',
            type: 'image',
            x: 40,
            y: 40,
            width: 150,
            height: 150,
            rotation: 0,
            layer: 9,
            locked: false,
            opacity: 1,
            src: null,
            variable: '{{logo_marca}}',
          },
          {
            id: 'text-promo',
            type: 'text',
            x: 200,
            y: 40,
            width: 680,
            height: 100,
            rotation: 0,
            layer: 10,
            locked: false,
            opacity: 1,
            content: '{{texto_promocao}}',
            fontSize: 56,
            fontFamily: 'Bebas Neue',
            fontWeight: 700,
            color: '#fbbf24',
            italic: false,
            underline: false,
            lineHeight: 1.2,
            letterSpacing: 2,
            align: 'center',
          },
        ],
        groups: [
          {
            id: 'group-destaque',
            type: 'group',
            elementIds: ['img-1', 'text-1', 'text-2'],
            isHighlight: true,
            name: 'Produto Destaque',
          },
        ],
      },
    },
  });

  console.log('✅ Template criado:', template.name);
  console.log('   - 3 produtos (1 destaque)');
  console.log('   - 2 variáveis customizadas: {{logo_marca}}, {{texto_promocao}}');

  console.log('\n🎉 Seed DEV concluído!');
  console.log('\n📝 Credenciais:');
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
