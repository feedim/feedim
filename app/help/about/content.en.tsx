import NewTabLink from "@/components/NewTabLink";

export default function AboutContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">About Us</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>Feedim is a social content platform where users can share posts and videos, and earn Coins from their original content. Content creators publish their articles and videos, and as premium readers discover and engage with this content, creators automatically earn Coins.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Our Mission</h2>
        <p>To encourage quality and original content creation, fairly reward content creators for their efforts, and deliver valuable, engaging content to readers — creating a meaningful platform experience for everyone.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">How It Works</h2>
        <p>Content creators share posts and videos. As premium readers read and watch this content, creators earn Coins. Additionally, creators earn through ad revenue sharing and can receive gifts from other users. Earned Coins can be converted to cash.</p>
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Get in Touch</h2>
        <p>Have questions or feedback?{" "}
          <NewTabLink href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Visit our contact page</NewTabLink>{" "}
          to get in touch with us.
        </p>
      </div>
    </>
  );
}
