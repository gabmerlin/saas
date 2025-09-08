import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import OwnerOnboardingClient from "./Client";

export const dynamic = "force-dynamic";

// Next 15: on AWAITE cookies() et on passe l'objet synchrone au helper
async function getUser() {
const cookieStore = await cookies();
const supabase = createServerComponentClient({
  cookies: (() => cookieStore) as unknown as () => ReturnType<typeof cookies>,
});
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}




// Next 15: params est asynchrone en dev -> on l'await
// ...
export default async function OwnerOnboardingPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const user = await getUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(`/${locale}/owner`)}`);

  const rootDomain = process.env.ROOT_DOMAIN || "example.com"; // fallback propre
  return <OwnerOnboardingClient locale={locale} email={user.email || ""} rootDomain={rootDomain} />;
}
