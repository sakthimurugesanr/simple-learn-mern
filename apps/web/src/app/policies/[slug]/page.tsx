import { notFound } from 'next/navigation';
const content: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: 'Shipping & returns',
    body: [
      'Standard delivery is estimated at 5–7 business days. Express delivery is estimated at 2–4 business days. Actual delivery depends on the destination and courier availability. Shipping fees are displayed at checkout.',
      'Return eligibility, cancellation terms, return windows and refund timelines must be confirmed with the business before launch. Please contact the store before returning an item.',
    ],
  },
  privacy: {
    title: 'Privacy policy',
    body: [
      'This store processes the account, address and order information needed to fulfil purchases. Passwords are stored as hashes, and session cookies are used to keep accounts signed in.',
      'Business identity, data retention periods, processor details, rights requests and the privacy contact must be reviewed and published by the store owner before collecting real customer data.',
    ],
  },
  terms: {
    title: 'Terms of service',
    body: [
      'Orders are subject to stock availability. Prices and discounts are validated at checkout. Cash on delivery and WhatsApp ordering do not constitute online payment.',
      'The business must publish its legal identity, registered address, grievance contact, jurisdiction, cancellation policy and final consumer terms before accepting real orders.',
    ],
  },
};
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = content[slug];
  if (!p) notFound();
  return (
    <article className="shell max-w-3xl py-20">
      <p className="eyebrow text-muted-foreground">THE DETAILS</p>
      <h1 className="section-heading mb-8">{p.title}</h1>
      <p className="mb-8 border bg-secondary p-4 text-xs">
        Draft policy · Store-owner legal review required before launch.
      </p>
      {p.body.map((text) => (
        <p key={text} className="text-sm leading-8 text-muted-foreground">
          {text}
        </p>
      ))}
    </article>
  );
}
