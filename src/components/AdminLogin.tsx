import { adminConfigured } from '@/lib/admin-auth';

export default function AdminLogin({ failed }: { failed: boolean }) {
  if (!adminConfigured()) {
    return (
      <p className="mx-auto max-w-md rounded-md bg-gray-100 p-4 text-sm">
        A área de admin está desativada: defina <code>ADMIN_PASSWORD</code> e um <code>ADMIN_SESSION_SECRET</code> com 32+ caracteres no servidor.
      </p>
    );
  }
  return (
    <form action="/api/admin/login" method="post" className="mx-auto max-w-sm space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-bold">Login do admin</h1>
      {failed && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Senha incorreta.
        </p>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-md border px-3 py-2" />
      </label>
      <button className="w-full rounded-md bg-gray-900 py-2 font-semibold text-white hover:bg-gray-700">Entrar</button>
    </form>
  );
}
