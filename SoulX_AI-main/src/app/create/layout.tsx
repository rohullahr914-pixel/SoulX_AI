import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/create"];
export const metadata = pageMetadata("/create", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
