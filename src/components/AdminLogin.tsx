import { adminConfigured } from '@/lib/admin-auth';

export default function AdminLogin({ failed }: { failed: boolean }) {
  if (!adminConfigured()) {
    return (
      <p className="mx-auto max-w-md rounded-md bg-gray-100 p-4 text-sm">
        The admin area is disabled: set <code>ADMIN_PASSWORD</code> and a 32+ character <code>ADMIN_SESSION_SECRET</code> on the server.
      </p>
    );
  }
  return (
    <form action="/api/admin/login" method="post" className="mx-auto max-w-sm space-y-4 rounded-lg border bg-white p-6">
      <h1 className="text-xl font-bold">Admin login</h1>
      {failed && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">
          Wrong password.
        </p>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-md border px-3 py-2" />
      </label>
      <button className="w-full rounded-md bg-gray-900 py-2 font-semibold text-white hover:bg-gray-700">Log in</button>
    </form>
  );
}
