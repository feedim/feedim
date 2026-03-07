import { createAdminClient } from '@/lib/supabase/admin';
import { logServerError } from '@/lib/runtimeLogger';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Feedim <noreply@feedim.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://feedim.com';
const DEFAULT_LOCALE = 'tr';

/**
 * Load translation strings for email templates (server-side, no React).
 * Returns a translator function: t(key, params?)
 */
async function getEmailTranslations(locale: string) {
  let messages: Record<string, Record<string, string>>;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`../messages/${DEFAULT_LOCALE}.json`)).default;
  }
  return (key: string, params?: Record<string, string | number>) => {
    const [namespace, ...rest] = key.split('.');
    const fieldKey = rest.join('.');
    const ns = messages[namespace] as Record<string, string> | undefined;
    let text = ns?.[fieldKey] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
}

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
      logServerError('[Email] missing API key', undefined, { operation: 'send_email' });
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

    if (!success) {
      const errorBody = await res.text().catch(() => 'unknown');
      logServerError('[Email] Resend API error', { status: res.status, message: errorBody }, { operation: 'send_email' });
    }

    // Log the email — don't let logging failure affect the return value
    try {
      const admin = createAdminClient();
      await admin.from('email_logs').insert({
        user_id: userId || null,
        email_to: to,
        template,
        subject,
        status: success ? 'sent' : 'failed',
        metadata: metadata || {},
      });
    } catch (logErr) {
      logServerError('[Email] Failed to log email', logErr, { operation: 'email_log' });
    }

    return success;
  } catch (err) {
    logServerError('[Email] Unexpected send failure', err, { operation: 'send_email' });
    return false;
  }
}

// ─── Email Templates ───

function baseLayout(content: string, locale: string = DEFAULT_LOCALE, footerTexts?: { sentBy: string; notifSettings: string }): string {
  const sentBy = footerTexts?.sentBy || 'This email was sent by Feedim.';
  const notifSettings = footerTexts?.notifSettings || 'Notification settings';
  return `
<!DOCTYPE html>
<html lang="${locale}">
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
      <p>${sentBy}</p>
      <p><a href="${SITE_URL}/settings/notifications" style="color:#999">${notifSettings}</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function welcomeEmail(name: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.welcomeSubject'),
    html: baseLayout(`
      <h1 style="font-size:22px;font-weight:700;margin:0 0 16px;color:#111">${t('emails.welcomeTitle', { name })}</h1>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px">
        ${t('emails.welcomeBody')}
      </p>
      <a href="${SITE_URL}/" style="display:inline-block;background:#111;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        ${t('emails.welcomeButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function newFollowerEmail(followerName: string, followerUsername: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.newFollowerSubject', { name: followerName }),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.newFollowerTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.newFollowerBody', { name: followerName, username: followerUsername })}
      </p>
      <a href="${SITE_URL}/u/${followerUsername}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.newFollowerButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function commentEmail(commenterName: string, postTitle: string, postSlug: string, commentText: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.commentSubject', { name: commenterName }),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.commentTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 8px">
        ${t('emails.commentBody', { name: commenterName, postTitle })}
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;color:#333;font-size:14px;line-height:1.5">
        ${commentText.slice(0, 200)}
      </div>
      <a href="${SITE_URL}/${postSlug}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.commentButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function giftReceivedEmail(senderName: string, giftType: string, coinAmount: number, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.giftSubject', { name: senderName }),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.giftTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.giftBody', { name: senderName, giftType, coinAmount })}
      </p>
      <a href="${SITE_URL}/coins" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.giftButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function withdrawalStatusEmail(status: 'completed' | 'rejected', amount: number, amountTry: number, reason?: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  const isCompleted = status === 'completed';
  return {
    subject: isCompleted ? t('emails.withdrawalApprovedSubject') : t('emails.withdrawalRejectedSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">
        ${isCompleted ? t('emails.withdrawalApprovedTitle') : t('emails.withdrawalRejectedTitle')}
      </h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px">
        ${isCompleted
          ? t('emails.withdrawalApprovedBody', { amount, amountTry: amountTry.toFixed(2) })
          : t('emails.withdrawalRejectedBody', { amount, amountTry: amountTry.toFixed(2) })}
      </p>
      ${reason ? `<p style="color:#999;font-size:13px;margin:0 0 20px">${t('emails.withdrawalReason', { reason })}</p>` : ''}
      <a href="${SITE_URL}/coins" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.withdrawalButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function moderationReviewEmail(postTitle: string, postSlug: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.moderationReviewSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.moderationReviewTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.moderationReviewBody', { postTitle })}
      </p>
      <a href="${SITE_URL}/${postSlug}/moderation" style="display:inline-block;background:#FF3E00;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.moderationReviewButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function moderationApprovedEmail(postTitle: string, postSlug: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.moderationApprovedSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.moderationApprovedTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.moderationApprovedBody', { postTitle })}
      </p>
      <a href="${SITE_URL}/${postSlug}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.moderationApprovedButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function moderationRejectedEmail(postTitle: string, reason: string, decisionCode: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.moderationRejectedSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.moderationRejectedTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px">
        ${t('emails.moderationRejectedBody', { postTitle })}
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;color:#333;font-size:14px;line-height:1.5">
        <strong>${t('emails.moderationRejectedDecision')}</strong> #${decisionCode}<br/>
        <strong>${t('emails.moderationRejectedReason', { reason: reason || t('emails.moderationRejectedReasonDefault') })}</strong>
      </div>
      <p style="color:#777;font-size:13px;margin:0 0 20px">${t('emails.moderationRejectedAppeal')}</p>
      <a href="${SITE_URL}/help" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.moderationRejectedButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function accountModerationEmail(username: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.accountModerationSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.accountModerationTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.accountModerationBody', { username })}
      </p>
      <a href="${SITE_URL}/help" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.accountModerationButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function milestoneEmail(postTitle: string, viewCount: string, postSlug: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.milestoneSubject', { viewCount }),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.milestoneTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.milestoneBody', { postTitle, viewCount })}
      </p>
      <a href="${SITE_URL}/${postSlug}" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.milestoneButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function copyrightVerificationEmail(postTitle: string, matchedTitle: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.copyrightVerificationSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.copyrightVerificationTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px">
        ${t('emails.copyrightVerificationBody', { postTitle })}
      </p>
      <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;color:#333;font-size:14px;line-height:1.5">
        ${t('emails.copyrightVerificationMatch', { matchedTitle })}
      </div>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.copyrightVerificationAction')}
      </p>
      <a href="${SITE_URL}/" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.copyrightVerificationButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function copyrightClaimVerifiedEmail(postTitle: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.copyrightClaimVerifiedSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.copyrightClaimVerifiedTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.copyrightClaimVerifiedBody', { postTitle })}
      </p>
      <a href="${SITE_URL}/" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.copyrightClaimVerifiedButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function copyrightClaimRejectedEmail(postTitle: string, reason: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.copyrightClaimRejectedSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.copyrightClaimRejectedTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 12px">
        ${t('emails.copyrightClaimRejectedBody', { postTitle })}
      </p>
      ${reason ? `<div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin:0 0 20px;color:#333;font-size:14px;line-height:1.5">
        ${t('emails.copyrightClaimRejectedReason', { reason })}
      </div>` : ''}
      <a href="${SITE_URL}/help" style="display:inline-block;background:#111;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">
        ${t('emails.copyrightClaimRejectedButton')}
      </a>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

export async function otpEmail(code: string, locale: string = DEFAULT_LOCALE): Promise<{ subject: string; html: string }> {
  const t = await getEmailTranslations(locale);
  return {
    subject: t('emails.otpSubject'),
    html: baseLayout(`
      <h2 style="font-size:18px;font-weight:700;margin:0 0 12px;color:#111">${t('emails.otpTitle')}</h2>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 20px">
        ${t('emails.otpBody')}
      </p>
      <div style="text-align:center;margin:0 0 20px">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:#111;background:#f5f5f5;border-radius:12px;padding:16px 28px;font-family:monospace">
          ${code}
        </span>
      </div>
      <p style="color:#999;font-size:13px;text-align:center;margin:0">
        ${t('emails.otpExpiry')}
      </p>
    `, locale, { sentBy: t('emails.footerSentBy'), notifSettings: t('emails.footerNotifSettings') }),
  };
}

/**
 * Check if user has email notifications enabled for this type.
 * Returns the user's email and preferred language if enabled, null if disabled.
 */
export async function getEmailIfEnabled(
  userId: string,
  notificationType: string
): Promise<{ email: string; locale: string } | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('profiles')
    .select('email, language')
    .eq('user_id', userId)
    .single();

  if (!profile?.email) return null;

  const { data: settings } = await admin
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (settings) {
    const emailFieldMap: Record<string, string> = {
      follow: 'email_follow',
      comment: 'email_comment',
      reply: 'email_comment',
      like: 'email_like',
      gift_received: 'email_gift',
      milestone: 'email_milestone',
      moderation_review: 'email_moderation',
      moderation_approved: 'email_moderation',
      moderation_rejected: 'email_moderation',
      account_moderation: 'email_moderation',
      copyright_verification_needed: 'email_moderation',
      copyright_claim_submitted: 'email_moderation',
      copyright_verified: 'email_moderation',
      copyright_rejected: 'email_moderation',
      copyright_similar_detected: 'email_moderation',
      copyright_detected: 'email_moderation',
    };

    const field = emailFieldMap[notificationType];
    if (field && settings[field] === false) return null;
  }

  return { email: profile.email, locale: profile.language || DEFAULT_LOCALE };
}
