import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Token and Balance System</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim&apos;s token system is a virtual currency system that enables content creators to be rewarded
          for their work. This page explains in detail how to earn, purchase, use, and withdraw tokens.
        </p>

        {/* ── What Are Tokens ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">What Are Tokens?</h2>
        <p>
          Tokens are Feedim&apos;s virtual currency. Content creators earn tokens when their posts are read;
          readers purchase tokens to support content creators. The token system is designed to
          encourage quality content production and reward content creators.
        </p>
        {/* ── How to Earn Tokens ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How to Earn Tokens?</h2>
        <p>
          To earn tokens on Feedim, you simply need to create content and have it genuinely read by
          Premium subscribers. The system automatically verifies genuine reads and credits your earnings
          to your account.
        </p>

        {/* ── Purchasing Tokens ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Purchasing Tokens</h2>
        <p>
          Readers can purchase tokens to support content creators and use platform features.
          Token packages are offered in different amounts, and bonus tokens are earned with larger packages.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Packages and Bonuses</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Token packages are available for different budgets</li>
            <li><strong>Bonus tokens</strong> are earned when purchasing larger packages</li>
            <li>You can view package details on the{" "}
              <Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Token Page</Link>
            </li>
          </ul>
        </div>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3 mt-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Payment Security</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>All payments are protected with <strong>SSL encryption</strong></li>
            <li>Secure payments with <strong>3D Secure</strong> verification</li>
            <li>Your card information is not stored on Feedim servers</li>
            <li>For detailed information, see the{" "}
              <Link href="/help/payment-security" className="text-accent-main hover:opacity-80 font-semibold">Payment Security</Link> page
            </li>
          </ul>
        </div>

        {/* ── Token Balance ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Token Balance</h2>
        <p>
          You can easily track your current token balance and earning history.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>You can see your instant token balance from the balance indicator on your profile page</li>
          <li>You can review detailed balance information, earning history, and purchase history on the{" "}
            <Link href="/coins" className="text-accent-main hover:opacity-80 font-semibold">Token Page</Link></li>
        </ul>

        {/* ── Token Withdrawal ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Token Withdrawal (Cash Out)</h2>
        <p>
          You can withdraw your earned tokens as Turkish Lira under certain conditions.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Withdrawal Conditions</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Minimum withdrawal amount: <strong>100 tokens</strong> (10 TL)</li>
            <li>You need to add your <strong>IBAN information</strong> to your account for withdrawal</li>
            <li>Withdrawal requests are processed on <strong>business days</strong></li>
            <li>The withdrawal amount is sent to your specified IBAN via bank transfer</li>
          </ul>
        </div>

        {/* ── Token Usage Areas ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Token Usage Areas</h2>
        <p>
          Tokens can be used for various purposes on the Feedim platform:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Content reading support &mdash; Supporting content creators as a Premium reader</li>
          <li>Cash out &mdash; Withdrawing earned tokens as Turkish Lira</li>
          <li>In-platform features &mdash; Benefiting from additional features offered by Feedim</li>
        </ul>

        {/* ── Abuse ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Abuse and Sanctions</h2>
        <p>
          Feedim has advanced detection mechanisms to ensure fair use of the token system.
          The following behaviors are considered abuse:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Fake reads</strong> &mdash; Attempting to earn tokens without genuine reads</li>
            <li><strong>Bot usage</strong> &mdash; Creating artificial reads with automated tools</li>
            <li><strong>Multi-account abuse</strong> &mdash; Reading your own content with multiple accounts</li>
            <li><strong>Coordinated manipulation</strong> &mdash; Generating fake reads by colluding with other users</li>
          </ul>
        </div>
        <p className="mt-3">
          When abuse is detected, the following sanctions are applied:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Unjustly earned tokens are <strong>cancelled</strong></li>
          <li>Account is temporarily or permanently <strong>suspended</strong></li>
          <li>Pending withdrawal requests are cancelled</li>
          <li>In repeated violations, the account may be permanently closed</li>
        </ul>

        {/* ── Token Page Redirect ── */}
        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8 flex flex-col gap-3">
          <p className="text-sm text-text-primary font-semibold">
            To view your token balance, purchase tokens, or create a withdrawal request:
          </p>
          <Link
            href="/coins"
            className="text-accent-main hover:opacity-80 font-semibold text-sm"
          >
            Go to Token Page &rarr;
          </Link>
        </div>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about the token system,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
