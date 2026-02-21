import { createAdminClient } from '@/lib/supabase/admin';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Feedim <noreply@feedim.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://feedim.com';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  template: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send an email via Resend API.
 * Falls back to console.log in development if no API key is set.
 */
export async function sendEmail({ to, subject, html, template, userId, metadata }: SendEmailOptions): Promise<boolean> {
  try {
    if (!RESEND_API_KEY) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Email] Would send to ${to}: ${subject}`);
      }
      return false;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const success = res.ok;

    // Log the email
    const admin = createAdminClient();
    await admin.from('email_logs').insert({
      user_id: userId || null,
      email_to: to,
      template,
      subject,
      status: success ? 'sent' : 'failed',
      metadata: metadata || {},
    });

    return success;
  } catch {
    return false;
  }
}

// ─── Email Templates ───

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="text-align:center;margin-bottom:24px">
        <img src="${SITE_URL}/imgs/feedim-logo.svg" alt="Feedim" height="28" style="height:28px">
      </div>
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:#999;font-size:12px">
      <p>Bu e-posta Feedim tarafından gönderilmiştir.</p>
      <p><a href="${SITE_URL}/dashboard/settings/notifications" style="color:#999">Bildirim ayarları</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: 'Feedim\'e hoş geldiniz!',
    html: baseLayout(`
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#111">Hoş geldiniz, ${name}!</h1>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">
        Feedim ailesine katıldığınız için mutluyuz. İçeriklerinizi yazın, premium okuyucular sayesinde jeton kazanın.
      </p>
      <a href="${SITE_URL}/dashboard" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Keşfetmeye Başla
      </a>
    `),
  };
}

export function newFollowerEmail(followerName: string, followerUsername: string): { subject: string; html: string } {
  return {
    subject: `${followerName} sizi takip etmeye başladı`,
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">Yeni takipçi!</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        <strong>${followerName}</strong> (@${followerUsername}) sizi takip etmeye başladı.
      </p>
      <a href="${SITE_URL}/u/${followerUsername}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Profili Gör
      </a>
    `),
  };
}

export function commentEmail(commenterName: string, postTitle: string, postSlug: string, commentText: string): { subject: string; html: string } {
  return {
    subject: `${commenterName} gönderinize yorum yaptı`,
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">Yeni yorum</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 8px">
        <strong>${commenterName}</strong> "<em>${postTitle}</em>" başlıklı gönderinize yorum yaptı:
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;color:#333;font-size:14px;line-height:1.5">
        ${commentText.slice(0, 200)}
      </div>
      <a href="${SITE_URL}/post/${postSlug}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Gönderiyi Gör
      </a>
    `),
  };
}

export function giftReceivedEmail(senderName: string, giftType: string, coinAmount: number): { subject: string; html: string } {
  return {
    subject: `${senderName} size hediye gönderdi!`,
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">Hediye aldınız!</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        <strong>${senderName}</strong> size bir <strong>${giftType}</strong> hediye gönderdi (+${coinAmount} jeton).
      </p>
      <a href="${SITE_URL}/dashboard/coins" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Cüzdana Git
      </a>
    `),
  };
}

export function withdrawalStatusEmail(status: 'completed' | 'rejected', amount: number, amountTry: number, reason?: string): { subject: string; html: string } {
  const isCompleted = status === 'completed';
  return {
    subject: isCompleted ? 'Çekim talebiniz onaylandı' : 'Çekim talebiniz reddedildi',
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">
        Çekim Talebi ${isCompleted ? 'Onaylandı' : 'Reddedildi'}
      </h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px">
        ${amount} jeton (${amountTry.toFixed(2)} TL) tutarındaki çekim talebiniz
        ${isCompleted ? 'onaylandı ve hesabınıza aktarıldı.' : 'reddedildi.'}
      </p>
      ${reason ? `<p style="color:#999;font-size:13px;margin:0 0 20px">Sebep: ${reason}</p>` : ''}
      <a href="${SITE_URL}/dashboard/coins" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Cüzdana Git
      </a>
    `),
  };
}

export function milestoneEmail(postTitle: string, viewCount: string, postSlug: string): { subject: string; html: string } {
  return {
    subject: `Tebrikler! Gönderiniz ${viewCount} görüntülenmeye ulaştı`,
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">Kilometre Taşı!</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        "<em>${postTitle}</em>" başlıklı gönderiniz <strong>${viewCount}</strong> görüntülenmeye ulaştı!
      </p>
      <a href="${SITE_URL}/post/${postSlug}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        Gönderiyi Gör
      </a>
    `),
  };
}

/**
 * Check if user has email notifications enabled for this type.
 * Returns the user's email if enabled, null if disabled.
 */
export async function getEmailIfEnabled(
  userId: string,
  notificationType: string
): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('user_id', userId)
    .single();

  if (!profile?.email) return null;

  const { data: settings } = await admin
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!settings) return profile.email; // Default: enabled

  const emailFieldMap: Record<string, string> = {
    follow: 'email_follow',
    comment: 'email_comment',
    reply: 'email_comment',
    like: 'email_like',
    gift_received: 'email_gift',
    milestone: 'email_milestone',
  };

  const field = emailFieldMap[notificationType];
  if (field && settings[field] === false) return null;

  return profile.email;
}
