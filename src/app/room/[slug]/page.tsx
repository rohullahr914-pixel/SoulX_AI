import { RoomChat } from "@/components/rooms/room-chat";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RoomChat slug={slug} />;
}
