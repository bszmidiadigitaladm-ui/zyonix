import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Palette } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArtForm } from "@/components/art/ArtForm";

export default async function ArtPage() {
  const t = await getTranslations("art");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        icon={Palette}
        title={t("title")}
        actions={
          <Link href="/art/gallery" className="text-sm font-medium text-accent hover:underline">
            {t("viewGallery")}
          </Link>
        }
      />
      <ArtForm />
    </div>
  );
}
