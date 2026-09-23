import { adminConfigured } from '@/lib/admin-auth';

export default function AdminLogin({ failed }: { failed: boolean }) {
  if (!adminConfigured()) {
    return (
      <p className="mx-auto max-w-md bg-mist p-4 text-sm">
        A área de admin está desativada: defina <code>ADMIN_PASSWORD</code> e um <code>ADMIN_SESSION_SECRET</code> com 32+ caracteres no servidor.
      </p>
    );
  }
  return (
    <form action="/api/admin/login" method="post" className="mx-auto max-w-sm py-6 text-center">
      <h1 className="text-[32px] md:text-[40px]">Login do admin</h1>
      {failed && (
        <p role="alert" className="mt-6 text-left text-sm text-[#b12704]">
          Senha incorreta.
        </p>
      )}
      <div className="relative mt-8 text-left">
        <input id="admin-password" name="password" type="password" required autoComplete="current-password" placeholder="Senha" className="field peer" />
        <label htmlFor="admin-password" className="field-label">Senha</label>
      </div>
      <button className="btn mt-6 w-full">Entrar</button>
    </form>
  );
}
