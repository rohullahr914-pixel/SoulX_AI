import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/challenges"];
export const metadata = pageMetadata("/challenges", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
