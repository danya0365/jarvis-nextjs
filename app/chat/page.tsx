import { ChatView } from "@/src/presentation/components/chat/ChatView";
import type { ChatViewModel } from "@/src/presentation/presenters/chat/ChatPresenter";
import { createServerChatPresenter } from "@/src/presentation/presenters/chat/ChatPresenterServerFactory";
import type { Metadata } from "next";
import Link from "next/link";

// Tell Next.js this is a dynamic page
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * Generate metadata for the page
 */
export async function generateMetadata(): Promise<Metadata> {
  const presenter = createServerChatPresenter();

  try {
    return presenter.generateMetadata();
  } catch (error) {
    console.error("Error generating metadata:", error);

    // Fallback metadata
    return {
      title: "แชท AI | Jarvis",
      description: "ระบบแชท AI คุยต่อเนื่องหลาย session",
    };
  }
}

/**
 * Chat page - Server Component for SEO optimization
 * Uses presenter pattern following Clean Architecture
 */
export default async function ChatPage() {
  const presenter = createServerChatPresenter();

  let viewModel: ChatViewModel | null = null;
  try {
    // Server ให้ view model ว่าง (ข้อมูลจริงอยู่ localStorage) — client hydrate เอง
    viewModel = await presenter.getViewModel();
  } catch (error) {
    console.error("Error fetching chat data:", error);
  }

  // Fallback UI — JSX อยู่นอก try/catch ตามกฎ react-hooks/error-boundaries
  if (!viewModel) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-muted-foreground mb-4">
            ไม่สามารถโหลดข้อมูลแชท AI ได้
          </p>
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return <ChatView initialViewModel={viewModel} />;
}
