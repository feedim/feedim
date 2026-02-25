import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Accessibility</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          Feedim aims to be an accessible platform for everyone. Ensuring that all users can comfortably
          use our platform regardless of physical abilities, device type, or internet connection is among
          our priorities. Accessibility is an ongoing development process for Feedim.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Theme Support</h2>
        <p>
          Feedim offers four different theme options to suit different visual needs:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Light mode:</strong> A theme optimized for bright environments, offering high readability</li>
          <li><strong>Dark mode:</strong> A dark theme that reduces eye strain in low-light environments</li>
          <li><strong>Dim mode:</strong> An intermediate theme between light and dark, providing eye comfort with softer tones</li>
          <li><strong>System mode:</strong> A mode that automatically adapts to your device&apos;s system theme preference</li>
        </ul>
        <p>
          You can change your theme preferences at any time from the settings page.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Responsive Design</h2>
        <p>
          Feedim is designed to work seamlessly across all device types:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Mobile devices:</strong> Fully compatible and touch-optimized interface on phone screens</li>
          <li><strong>Tablet:</strong> Layout optimized for medium-sized screens</li>
          <li><strong>Desktop:</strong> Full-featured and efficient usage experience on wide screens</li>
        </ul>
        <p>
          The platform automatically adapts to screen size and provides a consistent
          experience across all devices.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Keyboard Navigation</h2>
        <p>
          All features of Feedim are accessible via keyboard. You can use all platform functions
          with keyboard shortcuts without using a mouse. To see available keyboard shortcuts,
          press <strong>?</strong> on any page.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            Access the keyboard shortcuts list: Press <strong className="text-text-primary">?</strong> on any page.
            Navigate between page elements with Tab key, make selections with Enter key.
          </p>
        </div>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Text Size</h2>
        <p>
          Feedim fully supports your browser&apos;s zoom feature. You can use your browser&apos;s zoom
          to enlarge or reduce text size (usually Ctrl/Cmd + or -).
          The platform automatically adapts to the zoom level and content readability is preserved.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Image Alternatives</h2>
        <p>
          Feedim offers alternative text (alt text) support for images. Content creators
          can add descriptive alt text to their images. This enables users who use screen readers
          to understand the content of images. The platform encourages adding alt text.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Color Contrast</h2>
        <p>
          The Feedim interface is designed with contrast ratios compliant with <strong>WCAG (Web Content Accessibility Guidelines)</strong> standards.
          The contrast between text and background is maintained at a sufficient level for readability across all theme options.
          This enables users with visual difficulties to read content comfortably.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Screen Reader Compatibility</h2>
        <p>
          Feedim uses <strong>semantic HTML</strong> structure to be compatible with screen reader software.
          Page headings, navigation elements, forms, and buttons are created with semantic markups
          that screen readers can correctly interpret. ARIA labels are used where necessary
          to enhance accessibility.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Accessibility</h2>
        <p>
          The Feedim video player offers accessible controls for all users:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Play/pause, volume, and fullscreen controls</li>
          <li>Keyboard video control support</li>
          <li>Position adjustment with video progress bar</li>
        </ul>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Continuous Improvement</h2>
        <p>
          Accessibility is an ongoing development process for Feedim. We continuously work to make
          our platform more accessible based on feedback from our users. We follow updates in
          accessibility standards and integrate them into our platform.
        </p>

        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Feedback</h2>
        <p>
          Your suggestions, issues encountered, or improvement requests regarding accessibility
          are very valuable to us. You can share your feedback to help us improve the accessibility
          of our platform.
        </p>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions and suggestions about accessibility,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
