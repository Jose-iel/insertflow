import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }
  
  return session;
}

export async function requireOrg() {
  const session = await requireAuth();
  
  // Admin sem orgId pode acessar o dashboard (mas não terá dados de org específica)
  // Usuário comum DEVE ter orgId
  if (!session.user.orgId && session.user.role !== 'admin') {
    redirect('/login');
  }
  
  return session;
}

export async function getSession() {
  return await getServerSession(authOptions);
}
