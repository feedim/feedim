import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Earning Money</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim offers an earning system that allows quality content creators to be rewarded for their work.
          You earn tokens as your content is read, and you can convert these tokens into real money.
        </p>

        {/* ── Who Can Earn ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Who Can Earn?</h2>
        <p>
          To earn money on Feedim, you need to meet the following conditions:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Professional account type:</strong> Your account must be a professional (writer) account type</li>
            <li><strong>Premium membership:</strong> You must have an active Premium subscription</li>
          </ul>
        </div>
        <p>
          Users who meet these two conditions automatically start earning from their content being read.
        </p>

        {/* ── Earning Sources ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Earning Sources</h2>
        <p>
          The earning system on Feedim is based on <strong>Premium readers</strong> reading your content.
          Only qualified reads made by readers with Premium membership count as earnings.
        </p>

        {/* ── Earning Calculation ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Earning Calculation</h2>
        <p>
          When Premium readers genuinely read your content, <strong>tokens</strong> are added to your account.
          Tokens are Feedim&apos;s earning unit and can be converted to real money.
          Earned tokens are instantly reflected in your account and can be tracked from your analytics panel.
        </p>

        {/* ── Earning Tracking ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Earning Tracking</h2>
        <p>
          You can track your earnings in detail from the <strong>Analytics</strong> panel. In the analytics panel,
          you can access the following data:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Total amount of tokens earned</li>
          <li>Daily, weekly, and monthly earning data</li>
          <li>How much each piece of content has earned</li>
          <li>Qualified read counts and rates</li>
        </ul>

        {/* ── Cash Withdrawal ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Cash Withdrawal</h2>
        <p>
          You can withdraw your earned tokens as Turkish Lira. For detailed information about withdrawal conditions,
          IBAN setup, and processing times, see the{" "}
          <Link href="/help/coins" className="text-accent-main hover:opacity-80 font-semibold">Token and Balance System</Link> page.
        </p>

        {/* ── Tax Information ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Tax Information</h2>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Tax obligations related to earnings obtained through Feedim are entirely the responsibility of the user.
            Users are obligated to declare their income in accordance with the relevant tax legislation.
            Feedim does not make tax deductions or declarations on behalf of users.
          </p>
        </div>

        {/* ── Tips to Increase Earnings ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Tips to Increase Your Earnings</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Create quality content:</strong> Write in-depth and original content</li>
          <li><strong>Publish regularly:</strong> Grow your audience with a consistent publishing schedule</li>
          <li><strong>Engage with your audience:</strong> Reply to comments and stay connected with the community</li>
          <li><strong>Optimize for SEO:</strong> Optimize your titles, meta descriptions, and tags</li>
          <li><strong>Try different content types:</strong> Use post, video, and moment formats</li>
        </ul>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about the earning system,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
