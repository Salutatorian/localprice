export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-4xl">Methodology</h1>
      <p>
        LocalPrice publishes anonymous price observations. A newly submitted price never overwrites
        an older one. History stays in the ledger.
      </p>
      <h2 className="text-2xl">How a price gets here</h2>
      <ol className="list-decimal space-y-2 pl-5">
        <li>Someone photographs a receipt after signing in.</li>
        <li>The image is stored privately and processed on the server.</li>
        <li>The model returns structured fields. The server still validates arithmetic and dates.</li>
        <li>The contributor corrects yellow uncertain fields and confirms.</li>
        <li>Matching line items become provisional public observations.</li>
        <li>A second independent receipt or a moderator can verify them.</li>
      </ol>
      <h2 className="text-2xl">What browsing does not do</h2>
      <p>
        Selecting Guam while standing in Saipan cannot assign a Saipan receipt to Guam. Assignment
        uses the verified store branch, receipt address, market boundary, and optional coarse device
        location.
      </p>
      <h2 className="text-2xl">Trust</h2>
      <p>
        Trust is earned per market. Helpful receipts in Saipan do not grant authority in an unrelated
        city.
      </p>
    </article>
  );
}
