export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-4xl">Privacy and receipt retention</h1>
      <p>
        Receipt photographs, payment details, transaction numbers, exact GPS, OCR dumps, and user
        identity are private. Public pages show store, product, package size, price, date, freshness,
        status, and an anonymous evidence count.
      </p>
      <h2 className="text-2xl">Retention</h2>
      <p>
        Raw receipt images are compressed, stripped of extra metadata, and kept in a private bucket
        for 14 to 30 days. After that they are deleted unless the receipt is tied to an open dispute.
        Structured price history remains.
      </p>
      <h2 className="text-2xl">Access</h2>
      <p>
        Only the submitter, market moderators, and protected server code can read a receipt file, and
        then only through signed URLs. There is no public URL for a receipt photo.
      </p>
    </article>
  );
}
