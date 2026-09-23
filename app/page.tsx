import ChatPanel from "@/components/chat-panel";

export default function HomePage() {
  return (
    <main className="page">
      <div className="page-center">
        <ChatPanel enabled={process.env.SITES_STATIC_PREVIEW !== "1"} />
      </div>
    </main>
  );
}
