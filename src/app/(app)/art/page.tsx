import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArtForm } from "@/components/art/ArtForm";

export default async function ArtPage() {
  const t = await getTranslations("art");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Link href="/art/gallery" className="text-sm font-medium text-accent hover:underline">
          {t("viewGallery")}
        </Link>
      </div>
      <ArtForm />
    </div>
  );
}
