'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@insertflow/ui';

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      Sair
    </Button>
  );
}
