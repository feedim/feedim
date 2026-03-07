export default function RefundPolicyContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Refund and Cancellation Policy</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 21, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          At Feedim, we value customer satisfaction. Below you can find the refund and cancellation
          terms applicable to coin purchases and premium membership subscriptions.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Coin Purchases</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Purchased coins are digital products and are non-refundable by default.</li>
            <li>
              <strong>Exception:</strong> If none of the purchased coins have been used (no gifts sent),
              a refund may be requested within 14 days of the purchase date.
            </li>
            <li>Approved refunds are processed through our secure payment infrastructure and returned to the card used for payment.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Premium Membership</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>No refunds are given once premium membership features have been actively used.</li>
            <li>
              <strong>Exception:</strong> If none of the premium features have been used after purchase,
              a refund may be requested within 14 days.
            </li>
            <li>Yearly premium subscriptions are non-refundable after the subscription period begins. No partial refunds are given for unused portions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Boost Campaigns</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Boost campaigns are paid advertising services.</li>
            <li>
              <strong>Campaigns not yet started:</strong> If a campaign is cancelled before its start date,
              a full refund is provided.
            </li>
            <li>
              <strong>Active or completed campaigns:</strong> No refunds are given for campaigns that are
              currently running or have already completed.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Refund Process</h2>
          <p>You can submit a refund request by following these steps:</p>
          <ol className="list-decimal pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Send your refund request to <strong>contact@feedim.com</strong>.</li>
            <li>Explain your reason for the refund and provide your order details.</li>
            <li>Your request will be reviewed within 2 business days.</li>
            <li>Approved refunds are initiated within 1-3 business days.</li>
          </ol>
          <p className="mt-3 text-xs text-text-muted">Refund requests are processed through our secure payment infrastructure.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Money Refund</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Full refunds are given in cases of technical errors or duplicate payments.</li>
            <li>Refunds are processed by our payment infrastructure and reflected on the payment card within approximately 5-10 business days.</li>
            <li>This period may be extended depending on your bank&apos;s processing time.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Right of Cancellation</h2>
          <p>
            Under Turkish Consumer Protection Law No. 6502, the right of withdrawal for digital
            content ends once performance has begun with the consumer&apos;s consent. The exceptions
            stated above are reserved.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Contact</h2>
          <p>
            For all questions regarding refunds and cancellations, you can reach us at{" "}
            <strong>contact@feedim.com</strong>.
          </p>
        </section>
      </div>
    </>
  );
}
