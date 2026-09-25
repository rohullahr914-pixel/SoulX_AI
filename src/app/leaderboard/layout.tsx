import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/leaderboard"];
export const metadata = pageMetadata("/leaderboard", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
