import NewTabLink from "@/components/NewTabLink";

export default function CommunityGuidelinesContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Community Guidelines</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim aims to create a constructive and respectful community where everyone feels safe and
          comfortable. The following rules have been established to ensure the healthy functioning of our
          platform and a positive experience for all users. You must be at least <strong>15 years old</strong> to
          use the platform. All users are required to comply with these rules.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Respectful Communication</h2>
        <p>
          Everyone on Feedim can freely express their opinions, but this freedom of expression must not
          harm the rights of others. The following behaviors are strictly prohibited:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Hate speech:</strong> Expressions of hatred based on race, religion, language, gender, sexual orientation, ethnicity, or disability</li>
          <li><strong>Harassment and bullying:</strong> Systematic harassment, threats, and intimidation directed at individuals or groups</li>
          <li><strong>Discrimination:</strong> Discriminatory expressions and behaviors directed at any group or individual</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Original Content</h2>
        <p>
          Feedim encourages the sharing of original and creative content. The following rules must be
          followed when sharing content:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Sharing content with a copyright badge without permission is prohibited</li>
          <li>When quoting from others&apos; content, the source must be cited</li>
          <li>Presenting others&apos; content as your own (plagiarism) is prohibited</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Spam and Manipulation</h2>
        <p>
          The following behaviors are prohibited to maintain platform integrity:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Repeatedly sharing the same or similar content</li>
          <li>Creating fake likes, comments, or followers</li>
          <li>Using bots or automated tools for engagement manipulation</li>
          <li>Using misleading titles or tags (clickbait)</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Sexual and Violent Content</h2>
        <p>
          The following types of content are strictly prohibited on the Feedim platform:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Images or text containing nudity or sexual content</li>
          <li>Pornographic or obscene content</li>
          <li>Content containing extreme violence, blood, and gore</li>
          <li>Content promoting suicide or self-harm</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Misleading Information</h2>
        <p>
          Deliberately sharing false or misleading information is prohibited. This includes:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Content that constitutes disinformation or propaganda</li>
          <li>Fake news or manipulated information</li>
          <li>Misleading information on health, safety, or public interest topics</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Personal Information Sharing</h2>
        <p>
          Sharing others&apos; personal information without permission is strictly prohibited. This includes:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Unauthorized sharing of personal information such as real name, address, and phone number</li>
          <li>Unauthorized publication of private messages or correspondence</li>
          <li>Sharing private photos without the person&apos;s consent</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Illegal Activities</h2>
        <p>
          Sharing illegal content and promoting illegal activities on the platform is prohibited:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Promoting illegal substance or weapons trade</li>
          <li>Content involving fraud and forgery</li>
          <li>Promoting terrorist organizations</li>
          <li>Encouraging or directing any criminal act</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Account Security</h2>
        <p>
          Gaining or attempting to gain unauthorized access to others&apos; accounts is strictly
          prohibited. This includes:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Attempting to obtain others&apos; account credentials</li>
          <li>Sharing phishing content or links</li>
          <li>Creating fake or impersonation accounts</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Reporting</h2>
        <p>
          If you encounter content or a user that violates community guidelines, you can use the
          reporting mechanism:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Click the <strong>&ldquo;Report&rdquo;</strong> option in the content menu</li>
          <li>Select the reason for reporting (hate speech, spam, sexual content, etc.)</li>
          <li>Optionally add additional explanation</li>
          <li>Your report is first reviewed by Feedim AI, then carefully examined by the human moderation team</li>
        </ul>

        <p className="text-xs text-text-muted mt-6">
          Feedim is a social content platform where users can create posts and share videos. All posts and content published on the platform are the responsibility of the respective users; Feedim only takes necessary measures.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Right to Appeal</h2>
        <p>
          You have the right to appeal moderation decisions made about your content.
          For the appeal process and details, please review the{" "}
          <NewTabLink href="/help/moderation" className="text-accent-main hover:opacity-80 font-semibold">Moderation System</NewTabLink> page.
        </p>

        <p className="text-xs text-text-muted mt-8">
            For questions about community guidelines, you can reach us from our{" "}
            <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</NewTabLink> page
            or at <a href="mailto:help@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">help@feedim.com</a>.
        </p>
      </div>
    </>
  );
}
