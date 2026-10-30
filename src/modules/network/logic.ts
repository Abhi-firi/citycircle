export type ConnectionRow = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted";
};

export type Relationship =
  | { state: "none" }
  | { state: "sent"; connectionId: string }
  | { state: "received"; connectionId: string }
  | { state: "connected"; connectionId: string };

/** How `me` relates to `other`, given the connection rows visible to `me`. */
export function relationshipWith(
  rows: ConnectionRow[],
  me: string,
  other: string,
): Relationship {
  const row = rows.find(
    (r) =>
      (r.requesterId === me && r.addresseeId === other) ||
      (r.requesterId === other && r.addresseeId === me),
  );
  if (!row) return { state: "none" };
  if (row.status === "accepted")
    return { state: "connected", connectionId: row.id };
  return row.requesterId === me
    ? { state: "sent", connectionId: row.id }
    : { state: "received", connectionId: row.id };
}

export function otherPartyId(row: ConnectionRow, me: string): string {
  return row.requesterId === me ? row.addresseeId : row.requesterId;
}

export type Grouped = {
  incoming: ConnectionRow[];
  sent: ConnectionRow[];
  connected: ConnectionRow[];
};

export function groupConnections(rows: ConnectionRow[], me: string): Grouped {
  return {
    incoming: rows.filter(
      (r) => r.status === "pending" && r.addresseeId === me,
    ),
    sent: rows.filter((r) => r.status === "pending" && r.requesterId === me),
    connected: rows.filter((r) => r.status === "accepted"),
  };
}

/** Cleans a typed name for a PostgREST ilike filter: trims and escapes LIKE wildcards. */
export function toNamePattern(query: string): string | null {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 2) return null;
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%${escaped}%`;
}
