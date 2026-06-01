async function requireAdminSession(redirectTo) {
  const loginPath = redirectTo || "../admin/login.html";
  const session = await getSession();
  if (!session) {
    window.location.href = loginPath;
    return null;
  }

  const admin = await isAdminUser();
  if (!admin) {
    window.location.href = loginPath + "?denied=1";
    return null;
  }
  return session;
}

document.addEventListener("DOMContentLoaded", () => {
  const guardEl = document.documentElement;
  if (guardEl.dataset.requireAdmin !== "true") return;
  requireAdminSession(guardEl.dataset.adminLogin || "../admin/login.html");
});
