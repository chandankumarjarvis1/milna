export interface Profile {
  id: string;
  name: string;
  age: number | null;
  headline: string;
  bio: string | null;
  interests: string[];
  open_to: string[];
  city: string;
  photo_url: string | null;
  status: "pending" | "approved" | "banned";
  last_active_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface Cafe {
  id: string;
  name: string;
  city: string;
  area: string | null;
  address: string | null;
  opens: string | null;
  closes: string | null;
  tags: string[];
}

export interface Meet {
  id: string;
  connection_id: string;
  proposer_id: string;
  cafe_id: string;
  meet_at: string;
  status: "proposed" | "confirmed" | "declined" | "cancelled";
  created_at: string;
}
