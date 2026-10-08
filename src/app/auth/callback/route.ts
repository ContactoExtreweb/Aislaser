import { NextResponse, type NextRequest } from "next/server";
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE } from "@/lib/auth-constants";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Vuelta desde los emails de Supabase (recuperar contraseña, invitaciones) */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/panel";
  const next = nextParam.startsWith("/panel") && !nextParam.startsWith("//") ? nextParam : "/panel";

  if (code) {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      // Viene del enlace de recuperación: puede poner contraseña nueva sin escribir la actual
      if (next === "/panel/nueva-contrasena" && data.user) {
        response.cookies.set(RECOVERY_COOKIE, data.user.id, {
          httpOnly: true,
          secure: origin.startsWith("https"),
          sameSite: "lax",
          path: "/panel",
          maxAge: RECOVERY_COOKIE_MAX_AGE,
        });
      }
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/panel/login?error=enlace`);
}
