import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/pricing"];
export const metadata = pageMetadata("/pricing", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
