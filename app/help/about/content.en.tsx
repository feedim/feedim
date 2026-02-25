import Link from "next/link";

export default function AboutContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">About Us</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim is a content and video platform where users can share posts and videos, and earn Coins from content read by premium readers.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Our Mission</h2>
        <p>To encourage quality content creation and reward users for their efforts. To deliver the highest quality content to readers.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How It Works</h2>
        <p>Discover and share content. When premium readers read posts, users earn Coins. Coins can be converted to cash.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Get in Touch</h2>
        <p>Have questions or feedback?{" "}
          <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Visit our contact page</Link>{" "}
          to get in touch with us.
        </p>
      </div>
    </>
  );
}
