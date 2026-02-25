import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Content Types</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          On Feedim, you can express yourself with three different content types: <strong>Post</strong>,{" "}
          <strong>Video</strong>, and <strong>Moment</strong>. Each content type serves different purposes and has
          its own unique features.
        </p>

        {/* ── Post ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Post</h2>
        <p>
          Post is Feedim&apos;s primary text-based content format. With the rich text editor, you can format your
          content and support it with images.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Post Features</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Write content with the rich text editor (bold, italic, headings, lists, etc.)</li>
            <li>Image embedding support within posts</li>
            <li>Cover image upload</li>
            <li>Tag adding (max 5)</li>
            <li>SEO meta fields (meta title and meta description)</li>
          </ul>
        </div>

        {/* ── Video ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video</h2>
        <p>
          With video content, you can create longer and more detailed visual narratives.
          Feedim supports popular video formats and offers automatic thumbnail generation.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Features</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Supported formats: <strong>MP4, WebM, MOV</strong> and more</li>
            <li>Maximum file size: <strong>500 MB</strong></li>
            <li>Maximum video duration: <strong>30 minutes</strong></li>
            <li>Automatic thumbnail generation</li>
            <li>Manual thumbnail upload option</li>
            <li>Video description (maximum <strong>2,000 characters</strong>)</li>
          </ul>
        </div>

        {/* ── Moment ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Moment</h2>
        <p>
          Moment is a format designed for short and impactful video shares. Focused on vertical videos,
          this format is ideal for quick consumption and fast sharing.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Moment Features</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Maximum duration: <strong>60 seconds</strong></li>
            <li>Vertical video-focused format (9:16 ratio recommended)</li>
            <li>Quick sharing &mdash; simple and fast creation flow</li>
            <li>Displayed in carousel (swipeable) view</li>
          </ul>
        </div>

        {/* ── Common Settings ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Common Settings Across All Content Types</h2>
        <p>
          Regardless of which content type you choose, the following settings apply to all content:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Title:</strong> Must be between 3 and 200 characters</li>
          <li><strong>Tags:</strong> You can add up to 5 tags to your content</li>
          <li><strong>Allow comments:</strong> You can set whether comments are allowed on your content</li>
          <li><strong>Kid-friendly mark:</strong> You can indicate that your content is suitable for children</li>
          <li><strong>Copyright protection:</strong> You can protect your content against duplication</li>
        </ul>

        {/* ── Content Creation Steps ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Content Creation Steps</h2>
        <p>
          The content creation process on Feedim consists of 2 simple steps:
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-4">
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-text-primary">Write Content</p>
              <p className="text-text-muted text-xs mt-0.5">
                Write your text, upload your video or moment depending on the content type. You can format
                your content using the rich text editor.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="bg-accent-main text-white font-bold text-xs w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-text-primary">Details</p>
              <p className="text-text-muted text-xs mt-0.5">
                Set the title, tags, cover image, SEO settings, and other preferences. Then
                publish your content.
              </p>
            </div>
          </div>
        </div>

        {/* ── Draft and Auto-Save ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Draft Saving and Auto-Save</h2>
        <p>
          Feedim offers an auto-save feature so you don&apos;t lose your work while creating content.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your content is automatically saved as a draft every <strong>30 seconds</strong></li>
          <li>Even if you close your browser, you can return to your draft later</li>
          <li>You can make as many edits as you want before publishing</li>
        </ul>

        {/* ── Content Editing and Deletion ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Content Editing and Deletion</h2>
        <p>
          You can edit or completely delete your published content later.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Use the <strong>&ldquo;Edit&rdquo;</strong> option from the content menu to update the title, text, tags, and other settings</li>
          <li>Use the <strong>&ldquo;Delete&rdquo;</strong> option from the content menu to permanently remove your content</li>
          <li>Deleted content cannot be recovered &mdash; this action is permanent</li>
        </ul>

        {/* ── Content Rules ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Content Rules</h2>
        <p>
          All content must comply with community guidelines and laws. For detailed rules, see the{" "}
          <Link href="/help/community-guidelines" className="text-accent-main hover:opacity-80 font-semibold">Community Guidelines</Link> and{" "}
          <Link href="/help/copyright" className="text-accent-main hover:opacity-80 font-semibold">Copyright Protection</Link> pages.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about content creation,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
