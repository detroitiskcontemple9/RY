import { Card, PageHeader } from "@/components/admin";
import { getConfig } from "@/lib/config";
import { EventForm } from "../EventForm";

export default function NewEventPage() {
  return (
    <>
      <PageHeader title="New event" />
      <Card className="p-5 max-w-2xl">
        <EventForm appUrl={getConfig().appUrl} />
      </Card>
    </>
  );
}
