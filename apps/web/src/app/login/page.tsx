import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">InsertFlow</h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para continuar
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
