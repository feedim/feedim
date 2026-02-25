export default function TermsContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Terms of Service</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 16, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. General Information</h2>
          <p>
            Feedim is a content and video platform where users can write posts and share videos, and
            readers can discover and read content. These terms set out the rules you must follow when
            using the Feedim platform.
          </p>
          <p className="mt-3">
            By using the platform, you are deemed to have accepted these terms. If you do not accept
            these terms, you should not use the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Account Creation</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>You must be at least 13 years old to create an account.</li>
            <li>You are required to provide accurate and up-to-date information during registration.</li>
            <li>You are responsible for your account security. Do not share your password with others.</li>
            <li>Each user may only create one account.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Content Rules</h2>
          <p>Content published on Feedim must comply with the following rules:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Your content must be original. Copyright infringement is not permitted.</li>
            <li>Content containing hate speech, violence, harassment, or discrimination is prohibited.</li>
            <li>Misleading, spam, or fraudulent content cannot be shared.</li>
            <li>Content promoting illegal activities is prohibited.</li>
            <li>Unauthorized sharing of personal data is prohibited.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Coin and Payment System</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Posts read by premium readers earn users Coins.</li>
            <li>Coin earnings depend on reading time and content quality.</li>
            <li>Coins can be used to make withdrawals.</li>
            <li>Feedim reserves the right to change the rules of the Coin system.</li>
            <li>If fake reading, bot usage, or system abuse is detected, the account may be suspended and earned Coins may be cancelled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Premium Membership</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Premium membership can be purchased on a monthly or annual basis.</li>
            <li>Cancellation takes effect at the end of the current billing period.</li>
            <li>No partial refunds are given for purchased memberships.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Intellectual Property</h2>
          <p>
            Users retain copyright of the content they publish. Feedim holds a limited license to
            display and distribute content on the platform.
          </p>
          <p className="mt-3">
            The Feedim brand, logo, design, and software belong to Feedim and may not be used without permission.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Account Suspension and Termination</h2>
          <p>Feedim may suspend or terminate your account in the following cases:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Violation of terms of service</li>
            <li>Creation of fake or spam content</li>
            <li>Abuse of the Coin system</li>
            <li>Harassment of or harm to other users</li>
            <li>Illegal activity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">8. Limitation of Liability</h2>
          <p>
            Feedim is not responsible for user-generated content published on the platform.
            The platform is provided &quot;as is&quot; and no guarantee of uninterrupted or error-free operation is given.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">9. Changes</h2>
          <p>
            Feedim reserves the right to update these terms of service at any time.
            Significant changes will be communicated via email or through the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">10. Contact</h2>
          <p>
            For your questions, you can reach us at{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}
