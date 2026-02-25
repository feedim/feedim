import Link from "next/link";

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
          for policy violations and flags or directly blocks content when necessary.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1.</span>
            <div>
              <p className="font-semibold text-text-primary">Automatic AI Scanning</p>
              <p className="text-text-muted text-xs mt-0.5">Content is automatically scanned by AI the moment it is published.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2.</span>
            <div>
              <p className="font-semibold text-text-primary">Detection and/or Blocking</p>
              <p className="text-text-muted text-xs mt-0.5">If a policy violation is detected, content is hidden or directly blocked.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3.</span>
            <div>
              <p className="font-semibold text-text-primary">Human Review</p>
              <p className="text-text-muted text-xs mt-0.5">Flagged content is reviewed by the moderation team and a final decision is made.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Content Under Moderation</h2>
        <p>
          Flagged or moderated content is hidden from the general feed and cannot be viewed by other users.
          However, <strong>the content author</strong> can continue to see their content under moderation and track its status.
          A notification badge showing the moderation status is displayed on the content.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">48-Hour Rule</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            All moderated content is reviewed within <strong className="text-text-primary">a maximum of 48 hours</strong>.
            During this period, the content remains hidden. If the content is approved after review, it is republished;
            if rejected, it is permanently removed. If no review is conducted within 48 hours, the content is automatically republished.
          </p>
        </div>

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">NSFW</span>
            <div>
              <p className="font-semibold text-text-primary">Sexual / Inappropriate Content</p>
              <p className="text-text-muted text-xs mt-0.5">Sexual content, nudity, or adult-oriented materials.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">HATE</span>
            <div>
              <p className="font-semibold text-text-primary">Hate Speech</p>
              <p className="text-text-muted text-xs mt-0.5">Hate speech and discrimination based on race, religion, gender, ethnicity, or other characteristics.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">SPAM</span>
            <div>
              <p className="font-semibold text-text-primary">Spam / Misleading Content</p>
              <p className="text-text-muted text-xs mt-0.5">Mass posting, clickbait, scam, or posts containing misleading information.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">COPYRIGHT</span>
            <div>
              <p className="font-semibold text-text-primary">Copyright Infringement</p>
              <p className="text-text-muted text-xs mt-0.5">Unauthorized use of content belonging to others. For details, see the{" "}
                <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Copyright Protection</Link> page.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">DUPLICATE</span>
            <div>
              <p className="font-semibold text-text-primary">Duplicate Content</p>
              <p className="text-text-muted text-xs mt-0.5">Copying or duplicating existing content on the platform.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Community Reports</h2>
        <p>
          Feedim evaluates user reports through a <strong>weighted report system</strong>.
          Not every user&apos;s report carries equal weight; reports from users with higher profile scores and
          greater trustworthiness carry more weight. This system prevents malicious mass reporting attempts
          and ensures that real violations are quickly detected.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3+</span>
            <div>
              <p className="font-semibold text-text-primary">Weighted Reports &rarr; AI Deep Scan</p>
              <p className="text-text-muted text-xs mt-0.5">When content receives 3 or more weighted reports, it is deeply re-scanned by AI.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">10+</span>
            <div>
              <p className="font-semibold text-text-primary">Weighted Reports &rarr; Priority Moderation Queue</p>
              <p className="text-text-muted text-xs mt-0.5">Content receiving 10 or more weighted reports is prioritized and sent to the moderation team.</p>
            </div>
          </div>
        </div>

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
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-warning font-bold text-xs mt-0.5 shrink-0">FREEZE</span>
            <div>
              <p className="font-semibold text-text-primary">Account Freeze</p>
              <p className="text-text-muted text-xs mt-0.5">Your account is temporarily frozen. During this period, you cannot publish new content or comment. Your existing content remains visible.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-error font-bold text-xs mt-0.5 shrink-0">SUSPENSION</span>
            <div>
              <p className="font-semibold text-text-primary">Account Suspension</p>
              <p className="text-text-muted text-xs mt-0.5">Your account is permanently suspended. All your content is hidden and access to your account is blocked. Applied in serious or repeated violations.</p>
            </div>
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-2 mt-4">
          <li>Account freeze duration is determined by the severity of the violation</li>
          <li>An appeal process is available for suspended accounts</li>
          <li>Accounts that reach 10 strikes through the copyright strike system are permanently suspended and deleted</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions or appeals about the moderation system,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
