export function getPublicAppUrl(): string {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  return (configuredUrl || window.location.origin).replace(/\/+$/, "");
}
