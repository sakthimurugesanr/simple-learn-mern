import Link from 'next/link';
import { serverApi } from '@/lib/server-api';
import { Button } from '@/components/ui/button';
export default async function Page() {
  const { data } = await serverApi<any>('/settings', null);
  return (
    <div className="shell max-w-2xl py-24">
      <p className="eyebrow">HERE TO HELP</p>
      <h1 className="section-heading">A little conversation.</h1>
      <p className="mb-8 text-sm leading-7 text-muted-foreground">
        Have a question about a piece, delivery, or an existing order? Find your order in your
        account or speak to our team.
      </p>
      {data?.whatsappNumber ? (
        <Button asChild>
          <a href={`https://wa.me/${data.whatsappNumber}`}>Chat with us on WhatsApp</a>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Direct store support will be available when the business contact is configured.
        </p>
      )}
      <Button asChild variant="outline" className="ml-3">
        <Link href="/account">Your orders</Link>
      </Button>
    </div>
  );
}
