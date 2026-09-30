import { RoomEditor } from "@/components/rooms/room-editor";

export const metadata = { title: "Edit Room" };
export default async function EditRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <RoomEditor slug={slug} />;
}
