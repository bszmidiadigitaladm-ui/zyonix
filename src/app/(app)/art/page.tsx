import Link from "next/link";
import { ArtForm } from "@/components/art/ArtForm";

export default function ArtPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bible Art Generator</h1>
        <Link href="/art/gallery" className="text-sm font-medium underline">
          View gallery
        </Link>
      </div>
      <ArtForm />
    </div>
  );
}
