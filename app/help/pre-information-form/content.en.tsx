export default function PreInformationContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3">Pre-Information Form</h1>
      <p className="text-xs text-text-muted mb-10">Last updated: February 21, 2026</p>

      <div className="space-y-8 text-sm text-text-secondary leading-relaxed">
        <p>
          This pre-information form has been prepared in accordance with Article 5 of the Distance
          Contracts Regulation published in the Official Gazette dated 27.11.2014 and numbered 29188,
          for the purpose of informing the consumer before the contract is established.
        </p>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">1. Seller Information</h2>
          <ul className="list-none pl-0 space-y-1 mt-2 text-sm text-text-secondary">
            <li><strong>Title:</strong> Feedim</li>
            <li><strong>Website:</strong> feedim.com</li>
            <li><strong>Email:</strong> contact@feedim.com</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">2. Product/Service Information</h2>
          <p>Digital products and services offered on the Feedim platform:</p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>
              <strong>Coin Packages:</strong> In-platform digital currency. Used to send gifts to content
              creators and to benefit from platform features.
            </li>
            <li>
              <strong>Premium Membership:</strong> Monthly or annual subscription plans. Offers ad-free
              experience, verified badge, advanced analytics, and more features. Super, Pro, Max, and
              Business plans are available.
            </li>
          </ul>
          <p className="mt-3">All prices include VAT (20%). Current prices are displayed on the purchase page.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">3. Payment and Delivery</h2>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li><strong>Supported payment methods:</strong> Visa, Mastercard, American Express, Troy</li>
            <li><strong>Security:</strong> All payments are protected with SSL encryption and 3D Secure verification.</li>
            <li><strong>Payment infrastructure:</strong> PayTR (PCI-DSS compliant)</li>
            <li><strong>Delivery time:</strong> Digital products are activated instantly, within 48 hours at the latest.</li>
            <li><strong>Shipping fee:</strong> No shipping fee as these are digital products.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">4. Right of Withdrawal</h2>
          <p>
            Pursuant to Article 15/g of the Consumer Protection Law No. 6502, the right of withdrawal
            cannot be exercised after the performance of digital content and services has begun with
            the consumer&apos;s consent.
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>If the purchased coins or premium membership have not yet been used, the right of withdrawal can be exercised within 14 days.</li>
            <li>When the right of withdrawal is exercised, the payment is refunded to the same payment method within 14 business days at the latest.</li>
            <li>Withdrawal requests must be submitted in writing to contact@feedim.com.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">5. Complaints and Appeals</h2>
          <p>
            You can submit your complaints regarding products and services through the following channels:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-3 text-sm text-text-secondary">
            <li>Email: contact@feedim.com</li>
            <li>Consumer Arbitration Committees (within the monetary limits determined by the Ministry)</li>
            <li>Consumer Courts</li>
            <li>Provincial and district directorates of the Ministry of Commerce</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">6. Protection of Personal Data</h2>
          <p>
            Your personal data is processed under the Personal Data Protection Law (KVKK No. 6698).
            For detailed information, please review our{" "}
            <a href="/help/privacy" className="text-accent-main hover:underline">Privacy Policy</a> and{" "}
            <a href="/kvkk" className="text-accent-main hover:underline">KVKK Disclosure Text</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-text-primary mb-3">7. Confirmation Statement</h2>
          <p>
            By completing the payment, you declare that you have read, understood, and accepted this
            pre-information form, the distance sales contract, the terms of service, the withdrawal
            conditions, and the privacy policy.
          </p>
        </section>
      </div>
    </>
  );
}
