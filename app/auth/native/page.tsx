import { nativeCallbackFromParams } from "@/lib/native-auth";

export default async function NativeAuthHopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const href = nativeCallbackFromParams(await searchParams);

  return (
    <div className="mx-auto max-w-md rounded-[2rem] bg-till p-7 text-center ring-1 ring-white/8">
      <h1 className="text-2xl">Returning to LocalPrice</h1>
      <p className="mt-2 text-muted-foreground">
        Google sign-in finished. Open the app to continue. If nothing happens, tap the button below.
      </p>
      <a
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground"
        href={href}
      >
        Open LocalPrice
      </a>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(href)});`,
        }}
      />
    </div>
  );
}
