export default function DisclaimerContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Disclaimer</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 16, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">General</h2>
          <p>
            Feedim is a content and video platform where users can write posts and share videos.
            All posts and content published on the platform are the responsibility of the respective users.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">User Content</h2>
          <p>Regarding content created by users, Feedim:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Does not guarantee the accuracy, timeliness, or completeness of content.</li>
            <li>Views expressed in content belong solely to the content owners.</li>
            <li>Cannot be held liable for direct or indirect damages arising from content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Platform Rights</h2>
          <p>Feedim reserves the following rights:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Removing content that violates community guidelines</li>
            <li>Suspending or terminating accounts that violate rules</li>
            <li>Changing platform features and terms</li>
            <li>Updating Coin system rules</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Service Provision</h2>
          <p>The Feedim service is provided &quot;as is&quot;:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>No guarantee of uninterrupted or error-free operation is provided.</li>
            <li>The service may be temporarily interrupted due to technical issues or maintenance.</li>
            <li>No full protection guarantee against data loss is provided.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Changes</h2>
          <p>
            Feedim reserves the right to update this disclaimer at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Contact</h2>
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
