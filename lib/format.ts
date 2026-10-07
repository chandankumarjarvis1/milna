export function lastActive(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 10) return "Active just now";
  if (mins < 60) return `Active ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Active yesterday" : `Active ${days} days ago`;
}

export function meetDate(iso: string): { day: string; time: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }),
    weekday: d.toLocaleDateString("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }),
    time: d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }),
  };
}

export function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}
