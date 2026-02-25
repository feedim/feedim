import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Access Restrictions</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim implements various access restrictions to provide a safe and high-quality user experience.
          These restrictions are designed to ensure the healthy operation of the platform and the security
          of all users.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Age Restriction</h2>
        <p>
          You must be at least <strong>13 years old</strong> to use the Feedim platform.
          Users under 13 cannot create an account or use the platform. This restriction is applied
          in accordance with child safety laws and international regulations.
          The date of birth provided during registration is verified, and accounts that do not meet the age requirement are automatically blocked.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Geographic Restrictions</h2>
        <p>
          Feedim is a Turkey-based platform. Our services are primarily optimized for users in Turkey.
          Payment systems, legal regulations, and content policies are configured in accordance with Turkish legislation.
          The platform&apos;s language is Turkish and support services are provided in Turkish.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Account Verification</h2>
        <p>
          Some features on the platform are restricted without email verification. After creating your account,
          you need to verify your email address. Unverified accounts may face the following restrictions:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Posting and commenting may be restricted</li>
          <li>Interaction with other users may be limited</li>
          <li>Premium features cannot be accessed</li>
          <li>Notification preferences may be limited</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Private Account Restrictions</h2>
        <p>
          Content of accounts set to private is only visible to approved followers.
          Posts, moments, and profile information of private account holders cannot be viewed by
          non-followers. Follow requests must be manually approved by the account owner.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Blocking</h2>
        <p>
          When you block a user, the blocked user cannot access your content,
          view your profile, or interact with you. Likewise, you cannot access the content
          of the user you blocked. Blocking works bilaterally and applies to both users.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderation Restrictions</h2>
        <p>
          Content in the moderation process is subject to special rules:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Content under moderation:</strong> Only visible to the content owner, not shown to other users</li>
          <li><strong>Removed content:</strong> Completely hidden and cannot be viewed by any user (including the content owner)</li>
          <li><strong>NSFW-flagged content:</strong> Hidden in the feed and search results</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Premium Restrictions</h2>
        <p>
          Some advanced features are only available to Premium members:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Analytics:</strong> Detailed content statistics and performance analyses</li>
          <li><strong>Earning money:</strong> Ability to generate revenue from content</li>
          <li><strong>Ad-free experience:</strong> No ads displayed across the platform</li>
          <li><strong>Priority support:</strong> Your support requests are evaluated with priority</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Account Suspension</h2>
        <p>
          Accounts that violate community guidelines or terms of service may be temporarily or permanently
          suspended. For detailed information about account freezing, suspension, and the appeal process, see the{" "}
          <Link href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderation System</Link> page.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">IP-Based Restrictions</h2>
        <p>
          In case of detected abuse, spam, or security threats, Feedim may apply temporary restrictions
          to specific IP addresses. These restrictions are applied by automated systems and are
          generally automatically removed after a certain period. IP-based restrictions are used
          to protect the overall security of the platform.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about access restrictions,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
