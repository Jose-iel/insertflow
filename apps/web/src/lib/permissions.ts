import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function canManageOrganizations() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function canManageUsers() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function canAccessOrganization(orgId: string) {
  const session = await getServerSession(authOptions);
  
  if (session?.user?.role === 'admin') {
    return true;
  }
  
  return session?.user?.orgId === orgId;
}

export async function canCreateTemplate() {
  const session = await getServerSession(authOptions);
  return !!session?.user?.orgId;
}

export async function canGenerateEncartes() {
  const session = await getServerSession(authOptions);
  return !!session?.user?.orgId;
}
