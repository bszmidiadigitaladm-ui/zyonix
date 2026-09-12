import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { GlowBackdrop } from "@/components/ui/GlowBackdrop";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
      <GlowBackdrop />
      <div className="relative z-10 flex max-w-xl flex-col items-center gap-6">
        <Eyebrow>Sua fé. Infinitas possibilidades.</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
        <p className="max-w-md text-balance text-muted">
          Artes que tocam, devocionais que acompanham e um espaço de reflexão bíblica —
          tudo em um só lugar, feito para quem cria conteúdo de fé.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button>Começar agora</Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary">Entrar</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
