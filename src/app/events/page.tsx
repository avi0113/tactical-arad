import { Suspense } from "react";
import { EventsView } from "@/components/EventsView";
import { LoadingBlock } from "@/components/ui";

export default function Page() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <EventsView />
    </Suspense>
  );
}
