import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/community"];
export const metadata = pageMetadata("/community", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
