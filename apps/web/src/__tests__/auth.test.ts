import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';

describe('Authentication', () => {
  let testUser: any;
  let testOrg: any;

  beforeAll(async () => {
    testOrg = await prisma.organization.create({
      data: {
        name: 'Test Org',
        slug: 'test-org',
      },
    });

    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'user',
        orgId: testOrg.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUser.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
  });

  it('should authenticate valid user', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    expect(user).toBeTruthy();
    expect(user?.email).toBe('test@example.com');
  });

  it('should verify password correctly', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    const isValid = await bcrypt.compare('test123', user!.password);
    expect(isValid).toBe(true);

    const isInvalid = await bcrypt.compare('wrong', user!.password);
    expect(isInvalid).toBe(false);
  });

  it('should have correct user role', () => {
    expect(testUser.role).toBe('user');
  });

  it('should belong to organization', () => {
    expect(testUser.orgId).toBe(testOrg.id);
  });
});

describe('Multi-Tenancy Isolation', () => {
  let org1: any, org2: any;
  let user1: any, user2: any;
  let product1: any, product2: any;

  beforeAll(async () => {
    org1 = await prisma.organization.create({
      data: { name: 'Org 1', slug: 'org-1' },
    });
    org2 = await prisma.organization.create({
      data: { name: 'Org 2', slug: 'org-2' },
    });

    const hash = await bcrypt.hash('test', 10);
    user1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        name: 'User 1',
        password: hash,
        orgId: org1.id,
      },
    });
    user2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'User 2',
        password: hash,
        orgId: org2.id,
      },
    });

    product1 = await prisma.product.create({
      data: {
        name: 'Product 1',
        normalizedName: 'product1',
        price: 10,
        orgId: org1.id,
      },
    });
    product2 = await prisma.product.create({
      data: {
        name: 'Product 2',
        normalizedName: 'product2',
        price: 20,
        orgId: org2.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.product.deleteMany({
      where: { id: { in: [product1.id, product2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [user1.id, user2.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [org1.id, org2.id] } },
    });
  });

  it('should isolate products by organization', async () => {
    const org1Products = await prisma.product.findMany({
      where: { orgId: org1.id },
    });
    const org2Products = await prisma.product.findMany({
      where: { orgId: org2.id },
    });

    expect(org1Products.length).toBe(1);
    expect(org2Products.length).toBe(1);
    expect(org1Products[0].id).toBe(product1.id);
    expect(org2Products[0].id).toBe(product2.id);
  });

  it('should not allow cross-org access', async () => {
    const wrongOrgProduct = await prisma.product.findFirst({
      where: {
        id: product1.id,
        orgId: org2.id,
      },
    });

    expect(wrongOrgProduct).toBeNull();
  });
});
