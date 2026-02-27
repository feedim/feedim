import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile Score System</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim aims to build a respectful and safe community. The profile score system is one of the fundamental building blocks of this goal.
          This page explains what the profile score is, why it exists, and how it is affected.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">What is the Profile Score?</h2>
        <p>
          The profile score is a trust score <strong>between 0 and 100</strong>. It is an indicator that shows the health and reliability of your account.
          The higher your score, the greater your trustworthiness on the platform.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success" />
            <span className="text-xs"><strong className="text-text-primary">70-100:</strong> Healthy account</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-accent-main" />
            <span className="text-xs"><strong className="text-text-primary">40-69:</strong> Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error" />
            <span className="text-xs"><strong className="text-text-primary">0-39:</strong> At risk</span>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Why Does It Exist?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>To ensure a safe and respectful community environment</li>
          <li>To prevent spam, bots, and malicious accounts</li>
          <li>To encourage quality content creation</li>
          <li>To provide fair ranking in the explore and recommendation systems</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Who Is It For?</h2>
        <p>
          The profile score is automatically calculated for <strong>all users</strong>. No separate application or activation is required.
          Your score is determined from the moment you create your account and is updated based on your behavior.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">What Affects Your Score?</h2>
        <p>The profile score is determined by many factors. While algorithm details are not shared, the following areas are generally considered:</p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">1</span>
            <div>
              <p className="font-semibold text-text-primary">Profile Completeness</p>
              <p className="text-text-muted text-xs mt-0.5">Having your name, bio, profile photo, and other information filled in completely.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">2</span>
            <div>
              <p className="font-semibold text-text-primary">Content Quality</p>
              <p className="text-text-muted text-xs mt-0.5">The quality, originality, and community guideline compliance of the content you share.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">3</span>
            <div>
              <p className="font-semibold text-text-primary">Community Engagement</p>
              <p className="text-text-muted text-xs mt-0.5">Your interactions with other users, the feedback you give and receive.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">4</span>
            <div>
              <p className="font-semibold text-text-primary">Rule Compliance</p>
              <p className="text-text-muted text-xs mt-0.5">Your degree of compliance with community guidelines and platform policies.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent-main font-bold text-xs mt-0.5 shrink-0">5</span>
            <div>
              <p className="font-semibold text-text-primary">Violation History</p>
              <p className="text-text-muted text-xs mt-0.5">The number of violations and warnings you have received in the past.</p>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How to Improve Your Score?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Complete your profile information fully</li>
          <li>Create quality and original content</li>
          <li>Follow community guidelines</li>
          <li>Be regularly active on the platform</li>
          <li>Be respectful to other users</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">What Lowers Your Score?</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Violating community guidelines</li>
          <li>Sharing spam or repetitive content</li>
          <li>Receiving reports from other users</li>
          <li>Sharing inappropriate, copyright-infringing, or duplicate content</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moderation and Penalty Process</h2>
        <div className="bg-bg-secondary rounded-[15px] p-5">
          <p>
            All penalties on Feedim are given by the <strong>human moderation team</strong>. Artificial intelligence (AI) only detects suspicious content
            and sends it to the moderation queue. No penalty is automatically applied by AI.
            After the moderation team reviews, they add a strike if deemed necessary.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Appeal</h2>
        <p>
          If you believe your profile score is unfairly low or you want to appeal a moderation decision,
          you can apply through the{" "}
          <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> page.
          Appeals are evaluated by the moderation team.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about the profile score system,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
