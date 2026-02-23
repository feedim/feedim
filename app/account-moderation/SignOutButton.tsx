"use client";

export default function SignOutButton() {
  const handleSignOut = async () => {
    await fetch("/auth/signout", { method: "POST" });
    document.cookie = "fdm-status=; Max-Age=0; Path=/;";
    window.location.href = "/";
  };

  return (
    <button onClick={handleSignOut} className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
      Çıkış Yap
    </button>
  );
}
