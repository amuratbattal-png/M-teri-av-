import { NEED_TAG_LABELS_TR, type NeedTag } from "@musteri-avcisi/shared";

/**
 * Çok basit bir teklif taslağı üretir. Bu sadece bir başlangıç noktası -
 * gerçek metin üretimi ileride bir LLM çağrısıyla zenginleştirilebilir.
 * Önemli olan: bu taslak asla otomatik gönderilmez, `pending_approval`
 * durumunda sahibinin onayını bekler.
 */
export function draftProposal(candidateName: string, needTags: NeedTag[]): string {
  const services = needTags.map((tag) => NEED_TAG_LABELS_TR[tag] ?? tag).join(", ");
  return [
    `Merhaba ${candidateName},`,
    "",
    `${services} konusunda ihtiyacınız olabileceğini fark ettik. ` +
      "Sizin için özel bir teklif hazırlamak isteriz.",
    "",
    "Uygun olduğunuzda kısaca görüşebilir miyiz?",
  ].join("\n");
}
