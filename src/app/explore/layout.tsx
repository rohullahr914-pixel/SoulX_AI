import { pageMetadata, publicPages } from "@/lib/seo";
const page = publicPages["/explore"];
export const metadata = pageMetadata("/explore", page.title, page.description);
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
