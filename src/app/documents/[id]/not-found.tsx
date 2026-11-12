import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold">Document not available</h1>
        <p className="mt-2 text-sm text-muted">
          It doesn&apos;t exist, or it hasn&apos;t been shared with this account. Try switching to the account that owns it.
        </p>
        <Link href="/documents" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          ← Back to documents
        </Link>
      </div>
    </main>
  );
}
