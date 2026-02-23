"use client";

import { useState } from "react";
import { feedimAlert } from "@/components/FeedimAlert";

interface CopyrightVerificationFormProps {
  postId: number;
  matchedAuthor?: string;
  matchedCompany?: string;
  similarity?: number;
  onSubmit?: () => void;
}

export default function CopyrightVerificationForm({
  postId,
  matchedAuthor,
  matchedCompany,
  similarity,
  onSubmit,
}: CopyrightVerificationFormProps) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [proofDescription, setProofDescription] = useState("");
  const [proofUrls, setProofUrls] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);

  const addProofUrl = () => {
    if (proofUrls.length < 5) setProofUrls([...proofUrls, ""]);
  };

  const removeProofUrl = (index: number) => {
    setProofUrls(proofUrls.filter((_, i) => i !== index));
  };

  const updateProofUrl = (index: number, value: string) => {
    const updated = [...proofUrls];
    updated[index] = value;
    setProofUrls(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ownerName.trim() || !ownerEmail.trim() || !proofDescription.trim()) {
      feedimAlert("warning", "Lütfen zorunlu alanları doldurun.");
      return;
    }

    const filteredUrls = proofUrls.filter((u) => u.trim());

    setLoading(true);
    try {
      const res = await fetch("/api/copyright-claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          owner_name: ownerName.trim(),
          owner_email: ownerEmail.trim(),
          company_name: companyName.trim() || undefined,
          proof_description: proofDescription.trim(),
          proof_urls: filteredUrls.length > 0 ? filteredUrls : undefined,
          matched_author: matchedAuthor,
          matched_company: matchedCompany,
          similarity,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Bir hata oluştu.");
      }

      feedimAlert("success", "Telif hakkı talebiniz başarıyla gönderildi. İnceleme sonrası size bilgi verilecektir.");
      onSubmit?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Bir hata oluştu.";
      feedimAlert("error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-bg-secondary rounded-xl p-5 space-y-4 mt-2.5">
      <p className="text-base font-semibold">Telif Hakkı Formu</p>
      {matchedCompany && (
        <div className="flex gap-2.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0 mt-0.5"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
          <div>
            <p className="text-sm text-text-muted leading-relaxed">
              {matchedAuthor ? (
                <a href={`/u/${matchedAuthor}`} target="_blank" rel="noopener noreferrer" className="font-medium text-text-primary hover:underline">{matchedCompany}</a>
              ) : (
                <span className="font-medium text-text-primary">{matchedCompany}</span>
              )} tarafından bu içerik doğrulandı.
              Bu içeriğin size ait olduğunu doğrulamamız için bilgileri doldurun.
              İnsan moderatörler tarafından kontrol sağlanacaktır.
            </p>
            <a href="/help/copyright" target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:underline mt-1 inline-block">Daha fazla bilgi</a>
          </div>
        </div>
      )}

      {/* Owner Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Ad Soyad / Şirket Adı</label>
        <input
          type="text"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          placeholder="Adınızı veya şirket adınızı girin"
          className="input-modern w-full"
        />
      </div>

      {/* Owner Email */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">İletişim E-postası</label>
        <input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
          placeholder="ornek@email.com"
          className="input-modern w-full"
        />
      </div>

      {/* Company Name (optional) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Şirket Adı <span className="text-xs text-text-muted">(opsiyonel)</span>
        </label>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Şirket adı"
          className="input-modern w-full"
        />
      </div>

      {/* Proof Description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Kanıt Açıklaması</label>
        <textarea
          value={proofDescription}
          onChange={(e) => setProofDescription(e.target.value)}
          required
          placeholder="İçeriğin size ait olduğunu kanıtlayan bilgileri açıklayın..."
          rows={4}
          className="input-modern w-full resize-none"
        />
      </div>

      {/* Proof URLs */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Kanıt Linkleri</label>
        <p className="text-xs text-text-muted">Orijinal içeriğe ait linkler (en fazla 5)</p>
        <div className="space-y-2">
          {proofUrls.map((url, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="url"
                value={url}
                onChange={(e) => updateProofUrl(i, e.target.value)}
                placeholder="https://..."
                className="input-modern w-full"
              />
              {proofUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeProofUrl(i)}
                  className="text-text-muted hover:text-error text-lg shrink-0 w-8 h-8 flex items-center justify-center"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
        {proofUrls.length < 5 && (
          <button
            type="button"
            onClick={addProofUrl}
            className="text-xs text-text-muted hover:text-text-primary mt-1"
          >
            + Link ekle
          </button>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="t-btn accept w-full relative"
        aria-label="Telif Talebini Gönder"
      >
        {loading ? (
          <span className="loader" style={{ width: 18, height: 18 }} />
        ) : (
          "Telif Talebini Gönder"
        )}
      </button>
    </form>
  );
}
