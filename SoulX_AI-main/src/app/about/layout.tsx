import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/about"];
export const metadata = pageMetadata("/about", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
