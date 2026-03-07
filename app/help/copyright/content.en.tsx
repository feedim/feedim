import NewTabLink from "@/components/NewTabLink";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Copyright Protection</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim offers an advanced copyright protection system to safeguard the work of content creators.
          This system is designed to prevent unauthorized copying of content and encourage original production.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How Does Copyright Protection Work?</h2>
        <p>
          When creating a post or video, you can protect your content by enabling the <strong>&ldquo;Copyright protection&rdquo;</strong> feature in the settings section.
          Once protection is activated, your content is comprehensively scanned across text, images, and video.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your text content is analyzed using text comparison technology</li>
          <li>Your images are protected using image comparison technology</li>
          <li>Your video content is checked through video comparison technology</li>
          <li>The system automatically compares every newly shared piece of content against your protected content</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How Is Copyright Protection Activated?</h2>
        <p>
          Copyright protection is automatically enabled by the system for accounts that produce proper and original content.
          Accounts that meet the following conditions automatically earn copyright protection:
        </p>
        <ul className="list-disc pl-5 space-y-2 mt-3">
          <li>Verify your email address</li>
          <li>Be a content creator on the platform for a certain period</li>
          <li>Publish a sufficient number of posts</li>
          <li>Do not spam and follow community guidelines</li>
          <li>Do not commit copyright infringement or share copied content</li>
          <li>Produce original and quality content</li>
        </ul>
        <p className="mt-3">
          Once the conditions are met, the system will automatically activate your copyright protection in the next evaluation.
          Once activated, it remains active. For support, you can <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">contact us</NewTabLink>.
        </p>
        <p className="mt-3">
          Companies and corporate accounts can request copyright protection directly without waiting through the{" "}
          <NewTabLink href="/settings/copyright" className="text-accent-main hover:opacity-80 font-semibold">application form</NewTabLink>.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Duplicate Content Detection</h2>
        <p>
          Even if copyright protection is not enabled, Feedim performs <strong>text-based duplicate content scanning</strong> on all content.
          When a high level of text similarity is detected, the content is flagged as &ldquo;Duplicate Content&rdquo; and placed under moderation.
          This system is always active and cannot be disabled.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Copyright Violation System</h2>
        <p>
          Copyright or duplicate content complaints are reviewed by our human moderation team.
          When a violation is confirmed and a moderation decision is made, a violation record is added to your account.
          As your violation count increases, your profile score decreases and graduated sanctions are applied to your account.
          Repeated violations may result in your account being permanently suspended.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How to File a Copyright Complaint?</h2>
        <p>
          If you believe your content has been copied without permission, you can file a copyright complaint by selecting the <strong>&ldquo;Report&rdquo;</strong> option
          from the relevant content&apos;s menu. When filing a complaint:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Original content URL</strong> &mdash; Link to your original content (required)</li>
          <li><strong>Copied content URL</strong> &mdash; Link to the content you believe was copied (required)</li>
          <li><strong>Description</strong> &mdash; A description detailing the infringement (optional)</li>
        </ul>
        <p className="mt-3">
          Your complaint will be reviewed by our moderation team. You may need to prove that you are the original content owner.
          Unjustified complaints may negatively affect your account&apos;s trust score.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Notifications</h2>
        <p>
          You will receive an automatic notification when a post similar to your copyright-protected content is detected.
          The notification includes the match percentage and the action taken (moderation or badge).
        </p>

        <p className="text-xs text-text-muted mt-8">
            For questions about copyright protection, reach out at{" "}
            <a href="mailto:copyright@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">copyright@feedim.com</a>.
        </p>
      </div>
    </>
  );
}
