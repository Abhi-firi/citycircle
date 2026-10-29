export type NotificationType =
  "connection_request" | "connection_accepted" | "comment" | "community_live";

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  citySlug: string;
  domainSlug: string;
  createdAt: string;
  read: boolean;
};

/** The sentence and link for a notification. Names are resolved by the caller. */
export function describeNotification(
  n: AppNotification,
  actorName: string,
  communityName: string,
): { text: string; href: string } {
  const who = actorName || "Someone";
  const communityHref = `/cities/${n.citySlug}/${n.domainSlug}/`;
  switch (n.type) {
    case "connection_request":
      return {
        text: `${who} sent you a connection request.`,
        href: "/network/",
      };
    case "connection_accepted":
      return {
        text: `${who} accepted your connection request.`,
        href: n.actorId
          ? `/members/?id=${encodeURIComponent(n.actorId)}`
          : "/network/",
      };
    case "comment":
      return {
        text: `${who} commented on your post in ${communityName}.`,
        href: communityHref,
      };
    case "community_live":
      return {
        text: `${communityName} is now open. Say hello!`,
        href: communityHref,
      };
  }
}

export function unreadCount(list: AppNotification[]): number {
  return list.filter((n) => !n.read).length;
}
