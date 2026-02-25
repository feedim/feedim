import { Mail } from "lucide-react";

export default function ContactContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Contact</h1>
      <div className="space-y-8">
        <p className="text-sm text-text-secondary leading-relaxed">We would love to hear from you. You can reach us through the following channels for your questions, feedback, or support requests.</p>
        <div className="rounded-radius-md p-8 space-y-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-6 w-6 text-accent-main" />
            <h2 className="text-lg font-bold text-text-primary">Email</h2>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">For general inquiries and contact:</p>
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">contact@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">For technical support and assistance:</p>
            <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">Help center and frequently asked questions:</p>
            <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>
          </div>
          <div>
            <p className="text-sm text-text-secondary mb-2">For partnerships and advertising:</p>
            <a href="mailto:marketing@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">marketing@feedim.com</a>
          </div>
        </div>
        <div className="rounded-radius-md p-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Response Time</h2>
          <p className="text-sm text-text-secondary leading-relaxed">We typically respond to all inquiries within 24 hours on business days.</p>
        </div>
      </div>
    </>
  );
}
