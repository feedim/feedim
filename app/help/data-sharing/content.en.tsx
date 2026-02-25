import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Data Sharing and Third-Party Access</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim places great importance on the privacy and data security of its users.
          On this page, we transparently explain what data is collected, how it is used,
          and with whom it is shared.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">What Data Does Feedim Collect?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profile information:</strong> Username, email address, date of birth, profile photo, and bio</li>
          <li><strong>Content data:</strong> Posts, comments, moments, and shared media files</li>
          <li><strong>Interaction data:</strong> Likes, comments, follow relationships, and reading history</li>
          <li><strong>Device and IP information:</strong> Browser type, operating system, IP address, and access times</li>
          <li><strong>Payment information:</strong> Billing information related to subscriptions and purchases</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Third-Party Sharing</h2>
        <p>
          Feedim does <strong>not sell</strong> user data for advertising purposes and does not share it with
          third-party advertising networks. Data is shared only at the minimum level necessary with service providers
          required for the platform&apos;s operation:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hosting provider:</strong> Server services where the platform is hosted</li>
          <li><strong>Payment processor:</strong> For processing payment transactions</li>
          <li><strong>Email service:</strong> For sending notification and verification emails</li>
        </ul>
        <p>
          Only the minimum level of data necessary for service fulfillment is shared with these providers,
          and all providers are subject to data protection agreements.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Payment Data</h2>
        <p>
          All payment transactions on Feedim are processed through the <strong>PayTR</strong> payment infrastructure.
          Your credit card and bank card information is <strong>not stored</strong> on Feedim servers. Payment information
          is securely processed and stored directly by PayTR. Feedim only retains the transaction result
          (successful/failed) and billing information.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Sharing with Government Authorities</h2>
        <p>
          Feedim may be required to share user data with authorities in cases of legal obligation.
          This sharing is carried out only in the following situations and at the minimum level:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Data requested by court order</li>
          <li>Requests within the scope of prosecution investigations</li>
          <li>Other situations mandated by law</li>
        </ul>
        <p>
          All data sharing is carried out in accordance with <strong>the Personal Data Protection Law No. 6698 (KVKK)</strong> and
          relevant legislation.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Cookies and Tracking</h2>
        <p>
          Feedim uses session and preference cookies for the proper functioning of the platform.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Feedim <strong className="text-text-primary">does not use third-party tracking cookies</strong>. User behavior
            is not tracked by third-party advertising networks or analytics services.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Your Rights and Data Security</h2>
        <p>
          For detailed information about your rights under KVKK, data retention periods, and our data security
          measures, see our{" "}
          <Link href="/help/privacy" className="text-accent-main hover:opacity-80 font-semibold">Privacy Policy</Link> page.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about data sharing,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
