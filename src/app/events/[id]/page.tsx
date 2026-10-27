import { EventView } from "@/components/EventView";
import { demo } from "@/lib/seed";

export function generateStaticParams() {
  return demo.events.map((event) => ({ id: event.id }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventView eventId={id} />;
}
