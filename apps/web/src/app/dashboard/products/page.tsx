import { requireOrg } from '@/lib/auth-helpers';
import { ProductsList } from './products-list';
import { CreateProductButton } from './create-product-button';

export default async function ProductsPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Produtos</h1>
          <CreateProductButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <ProductsList />
      </main>
    </div>
  );
}
