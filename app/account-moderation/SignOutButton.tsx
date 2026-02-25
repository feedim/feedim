"use client";

export default function SignOutButton() {
  const handleSignOut = async () => {
    const { signOutCleanup } = await import("@/lib/authClient");
    await signOutCleanup();
    window.location.replace("/");
  };

  return (
    <button onClick={handleSignOut} className="t-btn bg-text-primary text-bg-primary flex items-center justify-center w-full">
      Çıkış Yap
    </button>
  );
}
