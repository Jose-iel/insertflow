import { requireOrg } from '@/lib/auth-helpers';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { AssistantChat } from '@/components/assistant-chat';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOrg();

  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar user={session.user} />
      <main className="flex-1 overflow-auto">{children}</main>
      <AssistantChat />
    </div>
  );
}
