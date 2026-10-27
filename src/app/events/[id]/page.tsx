import { EventView } from "@/components/EventView";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventView eventId={id} />;
}
