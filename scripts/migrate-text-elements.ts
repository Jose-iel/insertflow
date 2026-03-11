import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTextElements() {
  console.log('Iniciando migração de elementos de texto...');

  const templates = await prisma.template.findMany({
    select: {
      id: true,
      data: true,
    },
  });

  console.log(`Encontrados ${templates.length} templates para migrar`);

  let migratedCount = 0;

  for (const template of templates) {
    let needsMigration = false;
    const data = template.data as any;

    if (!data.elements) continue;

    // Migrar cada elemento de texto
    data.elements = data.elements.map((element: any) => {
      if (element.type !== 'text') return element;

      // Já migrado
      if (element.previewText !== undefined) return element;

      needsMigration = true;

      // Detectar se content tem variável
      const hasVariable = /{{.*?}}/.test(element.content);

      return {
        ...element,
        previewText: element.content, // usar content como preview inicial
        variable: hasVariable ? element.content : null, // se tem variável, configurar
      };
    });

    if (needsMigration) {
      await prisma.template.update({
        where: { id: template.id },
        data: { data },
      });
      migratedCount++;
      console.log(`✓ Template ${template.id} migrado`);
    }
  }

  console.log(`\nMigração concluída: ${migratedCount} templates migrados`);
}

migrateTextElements()
  .catch((error) => {
    console.error('Erro na migração:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
