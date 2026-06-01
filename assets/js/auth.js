async function signUp(email, password, displayName) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { display_name: displayName } : undefined,
    },
  });
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

function onAuthChange(callback) {
  return supabaseClient.auth.onAuthStateChange((_event, session) => callback(session));
}

const STAFF_ADMIN_EMAILS = new Set([
  "superdev.mk@gmail.com",
  "mickoski.darko@yahoo.com",
  "contact@mhra.mk",
]);
const SUPER_ADMIN_EMAILS = new Set(["alimiatdhe9@gmail.com"]);

async function getProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("getProfile error:", error);
    return null;
  }
  return data;
}

async function getUserRole() {
  const profile = await getProfile();
  if (profile?.role) return profile.role;

  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  if (email && SUPER_ADMIN_EMAILS.has(email)) return "super_admin";
  if (email && STAFF_ADMIN_EMAILS.has(email)) return "admin";
  return "user";
}

async function isAdminUser() {
  const role = await getUserRole();
  return role === "admin" || role === "super_admin";
}

async function isSuperAdminUser() {
  return (await getUserRole()) === "super_admin";
}
