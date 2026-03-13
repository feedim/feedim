import Link from "next/link";

export default function ContactContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Contact</h1>
      <div className="space-y-10">
        <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
          You can reach us through the channels below for your questions, feedback, or support requests. We aim to respond to all requests as quickly as possible.
        </p>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Moderation Appeals and Technical Support</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            After signing in to your account, you can create a support request. If you want to appeal a moderation decision or you are experiencing a technical issue, use the{" "}
            <Link href="/settings/support" className="text-accent-main hover:opacity-80 font-semibold">Create Support Request</Link>{" "}
            page. You can also send your appeal with the decision number via the Contact page or from the content moderation section. Your requests are tracked through your account and you will receive a notification when a reply is sent.
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-text-primary">Email</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">
            If you are not a member yet or you cannot access your account, use the email addresses below.
          </p>
        </section>
        <section className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">For general inquiries and contact:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">For payment issues:</p>
            <a href="mailto:payment@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">payment@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">Help center and frequently asked questions:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-text-secondary">For copyright and content removal requests:</p>
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-text-primary">Response Time</h2>
          <p className="max-w-[720px] text-sm text-text-secondary leading-relaxed">We typically respond to all inquiries within 48 hours on business days.</p>
        </section>
      </div>
    </>
  );
}
