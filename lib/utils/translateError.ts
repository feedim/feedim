const ERROR_MAP: Record<string, string> = {
  // Auth errors
  "A user with this email address has already been registered":
    "Bu e-posta adresi zaten kayıtlı",
  "User already registered": "Bu kullanıcı zaten kayıtlı",
  "Invalid login credentials": "Geçersiz giriş bilgileri",
  "Email not confirmed": "E-posta adresi doğrulanmamış",
  "Signup requires a valid password": "Geçerli bir şifre gerekli",
  "Password should be at least 6 characters":
    "Şifre en az 6 karakter olmalı",
  "New password should be different from the old password.":
    "Yeni şifre eski şifreden farklı olmalı",
  "Email rate limit exceeded": "E-posta gönderim limiti aşıldı",
  "For security purposes, you can only request this once every 60 seconds":
    "Güvenlik nedeniyle bu işlemi 60 saniyede bir yapabilirsiniz",
  "Unable to validate email address: invalid format":
    "Geçersiz e-posta formatı",
  "Auth session missing!": "Oturum bulunamadı, lütfen tekrar giriş yapın",
};

export function translateError(message: string): string {
  if (!message) return "Bir hata oluştu";

  // Exact match
  if (ERROR_MAP[message]) return ERROR_MAP[message];

  // Partial match
  for (const [en, tr] of Object.entries(ERROR_MAP)) {
    if (message.toLowerCase().includes(en.toLowerCase())) return tr;
  }

  return message;
}
