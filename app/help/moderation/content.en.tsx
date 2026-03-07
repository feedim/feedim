import NewTabLink from "@/components/NewTabLink";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Moderation System</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim implements a multi-layered moderation system that combines <strong>AI-powered automatic scanning</strong> and{" "}
          <strong>human moderation</strong> to ensure a safe and high-quality community environment.
          This page explains in detail how our moderation process works.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How Does Moderation Work?</h2>
        <p>
          The Feedim moderation system consists of two core components: artificial intelligence (AI) scanning and human moderation.
          Every piece of content is automatically scanned by AI when published. The AI analyzes content
          for policy violations and flags content for the moderation team to review.
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li><strong>Automatic AI Scanning</strong> — Content is automatically scanned by AI the moment it is published.</li>
          <li><strong>Detection and/or Blocking</strong> — If a policy violation is detected, content is hidden and sent to the moderation team for review.</li>
          <li><strong>Human Review</strong> — Flagged content is reviewed by the moderation team and a final decision is made.</li>
        </ol>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Content Under Moderation</h2>
        <p>
          Flagged or moderated content is hidden from the general feed and cannot be viewed by other users.
          However, <strong>the content author</strong> can continue to see their content under moderation and track its status.
          A notification badge showing the moderation status is displayed on the content.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48-Hour Rule</h2>
        <p>
          All moderated content is reviewed within <strong>a maximum of 48 hours</strong>.
          During this period, the content remains hidden. If the content is approved after review, it is republished;
          if rejected, it is permanently removed. If no review is conducted within 48 hours, the content is automatically republished.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Appeal Process and Decision Number</h2>
        <p>
          If your content is removed as a result of moderation, you will be given a <strong>decision number</strong>.
          You can start the appeal process with this number. Appeals are re-evaluated by the moderation team.
          The appeal result is final.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You can find your decision number in your moderation decision notification</li>
          <li>You can submit your appeal with the decision number through the contact page or the content moderation page</li>
          <li>Appeals are typically resolved within 24-48 hours</li>
          <li>You have only one appeal right per decision</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderation Categories</h2>
        <p>Content in the following categories is moderated or removed on Feedim:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Sexual / Inappropriate Content</strong> — Sexual content, nudity, or adult-oriented materials.</li>
          <li><strong>Hate Speech</strong> — Hate speech and discrimination based on race, religion, gender, ethnicity, or other characteristics.</li>
          <li><strong>Spam / Misleading Content</strong> — Mass posting, clickbait, scam, or posts containing misleading information.</li>
          <li><strong>Copyright Infringement</strong> — Unauthorized use of content belonging to others. For details, see the{" "}
            <NewTabLink href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Copyright Protection</NewTabLink> page.</li>
          <li><strong>Duplicate Content</strong> — Copying or duplicating existing content on the platform.</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Community Reports</h2>
        <p>
          Feedim automatically evaluates reports from users.
          When reports reach a sufficient number, the content is re-scanned by AI and forwarded to the moderation team when necessary.
          This system prevents malicious mass reporting attempts and ensures that real violations are quickly detected.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Profile Moderation</h2>
        <p>
          The moderation system is not limited to content only. User profiles are also within the scope of moderation.
          If profile photos, usernames, bios, and other profile information contain inappropriate content,
          they may be placed under moderation. AI-based profanity and inappropriateness checks are also performed during registration and onboarding.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Inappropriate profile photos are automatically detected and removed</li>
          <li>Usernames and bio texts go through AI scanning</li>
          <li>If profile violations are repeated, the account may be suspended</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Account Freezing and Suspension</h2>
        <p>
          Your account may be frozen or suspended for repeated violations or serious policy violations.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account Freeze</strong> — Your account is temporarily frozen. During this period, you cannot publish new content or comment. Your existing content becomes inaccessible during this period.</li>
          <li><strong>Account Suspension</strong> — Your account is permanently suspended. All your content is hidden and access to your account is blocked. Applied in serious or repeated violations.</li>
        </ul>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Account freeze duration is determined by the severity of the violation</li>
          <li>An appeal process is available for suspended accounts</li>
          <li>Accounts with repeated copyright violations may be permanently suspended</li>
        </ul>

        <p className="text-xs text-text-muted mt-8">
            For questions or appeals about the moderation system,{" "}
            <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</NewTabLink> us
            or reach out at <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>.
        </p>
      </div>
    </>
  );
}
