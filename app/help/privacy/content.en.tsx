export default function PrivacyContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Privacy Policy</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 16, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Introduction</h2>
          <p>
            At Feedim, we place great importance on protecting your personal data. This privacy
            policy explains what data we collect, how we use it, and what your rights are.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Data Controller</h2>
          <p>
            The data controller under the Turkish Personal Data Protection Law (KVKK No. 6698) is Feedim. Contact:{" "}
            <a href="mailto:contact@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">
              contact@feedim.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Data Collected</h2>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Account Information</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>First name, last name, and email address</li>
            <li>Profile photo and biography (optional)</li>
          </ul>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Usage Data</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>Reading history and preferences</li>
            <li>Shared posts, likes, and comment activities</li>
            <li>Coin transactions and balance information</li>
          </ul>
          <h3 className="text-base font-semibold text-text-primary mt-4 mb-2">Technical Data</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
            <li>IP address, browser, and device information</li>
            <li>Cookies and session data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Purpose of Data Usage</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
            <li>Account creation and management</li>
            <li>Content recommendations and personalization</li>
            <li>Coin earning calculations and payment processing</li>
            <li>Platform security and abuse prevention</li>
            <li>Fulfillment of legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Data Sharing</h2>
          <p>Your personal data will not be shared with third parties except in the following cases:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>With authorized authorities when required by law</li>
            <li>With payment providers for payment processing</li>
            <li>With infrastructure service providers (hosting, email)</li>
          </ul>
          <p className="mt-3">Your data is not sold to third parties for advertising purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Data Security</h2>
          <p>
            Your data is protected with industry-standard security measures. Passwords are stored
            hashed, and communications are encrypted with SSL/TLS.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-text-secondary">
            <li>To learn whether your personal data is being processed</li>
            <li>To learn the purpose of processing and whether it is used in accordance with its purpose</li>
            <li>To know the third parties to whom your data is transferred</li>
            <li>To request correction of incomplete or incorrect data</li>
            <li>To request deletion or destruction of your data</li>
            <li>To object to any unfavorable outcome resulting from automated analysis</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">8. Data Retention</h2>
          <p>
            Your data is retained as long as your account is active. When your account is deleted,
            data is permanently deleted within 30 days, except for data subject to legal retention periods.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">9. Contact</h2>
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
