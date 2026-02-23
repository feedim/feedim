export default function OnboardingLoading() {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-solid-primary">
      <span className="loader" style={{ width: 22, height: 22 }} />
    </div>
  );
}
