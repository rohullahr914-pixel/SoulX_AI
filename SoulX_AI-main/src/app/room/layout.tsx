import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/room"];
export const metadata = pageMetadata("/room", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
