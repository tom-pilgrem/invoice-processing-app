import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/upload", "/review", "/browse"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = user ? "/upload" : "/signin";
    return NextResponse.redirect(url);
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith("/signin")) {
    const url = request.nextUrl.clone();
    url.pathname = "/upload";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
