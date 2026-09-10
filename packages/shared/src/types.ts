import type { NeedTag } from "./need-tags";

/** Tarama kaynağı kanalları. Her biri ayrı bir Cloudflare Worker modülüdür. */
export const SOURCE_CHANNELS = [
  "google_search",
  "google_maps",
  "yahoo_search",
  "linkedin",
  "tiktok",
  "instagram",
  "tender_site",
  "freelancer_gallery",
] as const;
export type SourceChannel = (typeof SOURCE_CHANNELS)[number];

/** Sahibine onaylatılmadan hiçbir gönderim yapılamaz - durum akışı budur. */
export const CANDIDATE_STATUSES = [
  "discovered",
  "evaluated",
  "proposal_drafted",
  "pending_approval",
  "approved",
  "rejected",
  "sent",
  "responded",
  "converted",
  "declined",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

/** Gönderim/iletişim kanalları. Sesli arama başlangıçta pasif (feature-flag). */
export const OUTREACH_CHANNELS = ["whatsapp", "email", "voice_call"] as const;
export type OutreachChannel = (typeof OUTREACH_CHANNELS)[number];

export interface Candidate {
  id: string;
  name: string;
  /** SECTORS içindeki slug, veya PARALLEL_TRACK.slug */
  sectorSlug: string;
  sourceChannel: SourceChannel;
  sourceUrl: string | null;
  country: string; // Faz 1: her zaman "TR"
  needTags: NeedTag[];
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  contactLinkedin: string | null;
  discoveredAt: string; // ISO timestamp
  status: CandidateStatus;
  evaluationNotes: string | null;
  proposalDraft: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  lastContactChannel: OutreachChannel | null;
  rawMetadata: Record<string, unknown> | null;
}

export interface CommunicationLogEntry {
  id: string;
  candidateId: string;
  channel: OutreachChannel;
  direction: "outbound" | "inbound";
  content: string;
  status: "queued" | "sent" | "failed" | "received";
  createdAt: string;
}

/** Bir tarama worker'ının control API'ye bildirdiği ham bulgu. */
export interface ScanResult {
  name: string;
  sectorSlug: string;
  sourceChannel: SourceChannel;
  sourceUrl: string | null;
  needTags: NeedTag[];
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
  contactLinkedin?: string | null;
  rawMetadata?: Record<string, unknown>;
}
