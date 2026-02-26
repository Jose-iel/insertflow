import { prisma } from './prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getPrismaWithTenant() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.orgId) {
    throw new Error('User must belong to an organization');
  }

  const orgId = session.user.orgId;

  return new Proxy(prisma, {
    get(target, prop) {
      const original = target[prop as keyof typeof target];

      if (typeof original !== 'object' || original === null) {
        return original;
      }

      return new Proxy(original, {
        get(modelTarget: any, modelProp) {
          const modelMethod = modelTarget[modelProp];

          if (typeof modelMethod !== 'function') {
            return modelMethod;
          }

          const methodsToWrap = [
            'findMany',
            'findFirst',
            'findUnique',
            'count',
            'aggregate',
            'groupBy',
            'update',
            'updateMany',
            'delete',
            'deleteMany',
            'create',
          ];

          if (!methodsToWrap.includes(modelProp as string)) {
            return modelMethod;
          }

          return function (args: any = {}) {
            const hasOrgId = ['folder', 'template', 'product', 'image', 'generationJob'].includes(
              prop as string
            );

            if (!hasOrgId) {
              return modelMethod.call(modelTarget, args);
            }

            if (modelProp === 'create') {
              const data = args.data || {};
              args.data = { ...data, orgId };
            } else {
              const where = args.where || {};
              args.where = { ...where, orgId };
            }

            return modelMethod.call(modelTarget, args);
          };
        },
      });
    },
  });
}

export async function createWithTenant<T extends { orgId: string }>(
  model: any,
  data: Omit<T, 'orgId'>
): Promise<T> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.orgId) {
    throw new Error('User must belong to an organization');
  }

  return model.create({
    data: {
      ...data,
      orgId: session.user.orgId,
    },
  });
}
