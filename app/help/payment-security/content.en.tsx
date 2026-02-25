export default function PaymentSecurityContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Payment Security</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 21, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          At Feedim, we are committed to maintaining the highest level of payment security. All your
          payment transactions are protected with industry-standard security protocols.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">SSL Encryption</h2>
          <p>
            All data communication on the Feedim platform is protected with 256-bit SSL (Secure Socket
            Layer) encryption. All information you share on our payment pages is transmitted encrypted
            and is inaccessible to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3D Secure Verification</h2>
          <p>
            All your credit card and debit card payments are protected with 3D Secure technology.
            Identity verification is performed by your bank during payment, and only approved
            transactions are processed.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Card Information Security</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Your credit card and debit card information is <strong>not stored</strong> on Feedim servers.</li>
            <li>Your card information is encrypted and transmitted directly to the payment provider (PayTR) only at the time of payment.</li>
            <li>PayTR is a payment infrastructure that holds PCI-DSS Level 1 certification and complies with international security standards.</li>
            <li>Your card information is not retained anywhere after the transaction.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Supported Payment Methods</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Visa</li>
            <li>Mastercard</li>
            <li>American Express</li>
            <li>Troy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Refund Transactions</h2>
          <p>
            Your refund requests related to payments are evaluated under our refund policy.
            Approved refunds are returned to the card used for payment. For detailed information,
            please review our{" "}
            <a href="/help/refund-policy" className="text-accent-main hover:underline">Refund and Cancellation Policy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">Support</h2>
          <p>
            If you experience any issues with payments, you can reach us at{" "}
            <strong>contact@feedim.com</strong>. Your payment issues will be resolved as quickly as possible.
          </p>
        </section>
      </div>
    </>
  );
}
