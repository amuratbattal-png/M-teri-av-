export function newId(): string {
  return crypto.randomUUID();
}

// Karıştırılabilecek karakterler (0/O, 1/I) çıkarıldı - katılımcı bu kodu
// elle de yazabilir diye (QR okutamazsa yedek).
const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newJoinCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += JOIN_CODE_ALPHABET[bytes[i] % JOIN_CODE_ALPHABET.length];
  }
  return out;
}

export function newSpeakerToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
