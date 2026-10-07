export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
