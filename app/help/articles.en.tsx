import Link from "next/link";
import { Heart, MessageCircle, Bell, Home, Bookmark } from "lucide-react";
import type { HelpArticle, HelpPageLink, HelpSection } from "./articles.types";

const lnk = "text-accent-main hover:opacity-80 font-semibold";
const ico = "inline-block h-4 w-4 text-accent-main align-text-bottom mx-0.5";

const ShareIcon = () => (
  <svg className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export const sections: HelpSection[] = [
  { id: "hesap", label: "Account & Registration" },
  { id: "guvenlik", label: "Privacy & Security" },
  { id: "profil", label: "Profile & Settings" },
  { id: "icerik", label: "Posts, Videos & Content" },
  { id: "moderasyon", label: "Moderation & Content Safety" },
  { id: "telif", label: "Copyright & Duplicate Content" },
  { id: "etkilesim", label: "Engagement & Social" },
  { id: "bildirim", label: "Notifications" },
  { id: "jeton", label: "Tokens & Earnings" },
  { id: "premium", label: "Premium Membership" },
  { id: "kesfet", label: "Explore & Search" },
  { id: "sorun", label: "Troubleshooting" },
];

export const pageLinks: HelpPageLink[] = [
  { title: "Help Center", href: "/help", description: "FAQ and help articles" },
  { title: "About Us", href: "/help/about", description: "About Feedim" },
  { title: "Terms of Service", href: "/help/terms", description: "Platform terms and conditions" },
  { title: "Privacy Policy", href: "/help/privacy", description: "Personal data protection and privacy" },
  { title: "Data Protection", href: "/help/privacy", description: "Personal Data Protection Policy" },
  { title: "Community Guidelines", href: "/help/community-guidelines", description: "Content standards, behavior rules and sanctions" },
  { title: "Contact", href: "/help/contact", description: "Get in touch, get support" },
  { title: "Copyright Protection", href: "/help/copyright", description: "Copyright protection system, duplicate content policy and strike system" },
  { title: "Moderation System", href: "/help/moderation", description: "Content moderation, AI review and appeal processes" },
  { title: "Feedim AI", href: "/help/ai", description: "AI-powered content moderation and recommendations" },
  { title: "Content Types", href: "/help/content-types", description: "Posts, videos, moments and content formats" },
  { title: "Token System", href: "/help/coins", description: "Earning tokens, purchasing and balance management" },
  { title: "Earning Money", href: "/help/earning", description: "Earning model and withdrawals for content creators" },
  { title: "Analytics", href: "/help/analytics", description: "Post statistics, profile analytics and performance" },
  { title: "Data Sharing", href: "/help/data-sharing", description: "Data sharing policy with third parties and authorities" },
  { title: "Access Restrictions", href: "/help/access-restrictions", description: "Age restrictions, region and account limitations" },
  { title: "Accessibility", href: "/help/accessibility", description: "Accessibility features and compliance" },
  { title: "Premium", href: "/premium", description: "Premium membership plans and pricing" },
  { title: "Disclaimer", href: "/help/disclaimer", description: "Legal disclaimer" },
  { title: "Distance Sales Agreement", href: "/help/distance-sales-contract", description: "Token and premium purchase agreement" },
  { title: "Pre-Information Form", href: "/help/pre-information-form", description: "Consumer information before distance sales" },
  { title: "Payment Security", href: "/help/payment-security", description: "SSL, 3D Secure and PCI-DSS payment security" },
  { title: "Refund Policy", href: "/help/refund-policy", description: "Token and premium membership refund conditions" },
];

export const articles: HelpArticle[] = [
  // ─── Account & Registration ─────────────────────────────────
  {
    section: "hesap",
    question: "How do I create an account?",
    searchText: "Click the Create Account button on the home page. Enter your first name, last name, username, email and password. You can also sign up with Google. A verification link will be sent to your email after registration.",
    answer: <>Click the <strong>&lsquo;Create Account&rsquo;</strong> button on the home page. Enter your first name, last name, username, email and password. You can also quickly sign up with your Google account. After registration, a verification link will be sent to your email &mdash; click it to activate your account.</>,
  },
  {
    section: "hesap",
    question: "How do I sign up or sign in with Google?",
    searchText: "Click the Continue with Google button to sign in directly with your Google account. If you don't have an account, one will be created automatically. Your Google profile photo and name are imported.",
    answer: <>Click the <strong>&lsquo;Continue with Google&rsquo;</strong> button to sign in directly with your Google account. If you don&apos;t have a Feedim account yet, one will be created automatically. Your name and profile photo from Google are imported automatically. You don&apos;t need to set a separate password.</>,
  },
  {
    section: "hesap",
    question: "How does email verification work?",
    searchText: "After signing up, a verification link is sent to your email. Click this link to verify your account. Some features may be restricted without verification.",
    answer: <>After signing up, a verification link is sent to your email address. Click this link to verify your account. Unverified accounts may have limited access to creating posts and some interaction features. If you don&apos;t receive the link, check your spam folder. You can reach out to our <Link href="/help/contact" className={lnk}>support team</Link> for help.</>,
  },
  {
    section: "hesap",
    question: "Can I change my email address?",
    searchText: "You can update your email address from Settings Security section. A verification link will be sent to your new address.",
    answer: <>Yes. You can update your email address from <strong>Settings &rarr; Security</strong>. After the change, a verification link will be sent to your new email address. Your old email remains active until the new one is verified.</>,
  },
  {
    section: "hesap",
    question: "Can I sign in from multiple devices?",
    searchText: "Yes, you can sign in to your account from multiple devices at the same time. You can manage sessions from the Security section.",
    answer: "Yes, you can sign in to your account from multiple devices at the same time. A separate session is opened on each device. If you want to end all sessions, you can view and close active sessions from Settings \u2192 Security.",
  },
  {
    section: "hesap",
    question: "Can I use the platform without signing in?",
    searchText: "Yes, you can browse the home page and explore section without signing in. Creating posts, liking, commenting and following require an account.",
    answer: <>Yes, you can browse the home page and <Link href="/explore" className={lnk}>explore</Link> section and read posts without signing in. However, you need to create an account for interactions like creating posts, liking, commenting and following.</>,
  },
  {
    section: "hesap",
    question: "What is the saved accounts feature?",
    searchText: "When you sign in, your account is saved to your device. You can select it with one click on your next visit. The most recently used 1 account is saved.",
    answer: "When you sign in, your account is automatically saved to your device. On your next visit, you can quickly access your account by selecting it with one click. The most recently used 1 account is saved. You can remove any account from the list. Saved account data is stored only on your device.",
  },
  {
    section: "hesap",
    question: "What types of accounts are there?",
    searchText: "Feedim has two types: free Standard account and Premium account. Premium members enjoy additional features.",
    answer: <>Feedim has two account types: <strong>Standard</strong> (free) and <strong>Premium</strong>. With a Standard account, you can create posts, comment and interact. Premium accounts offer additional features: ad-free experience, priority support, special badge and more. Check the <Link href="/premium" className={lnk}>Premium page</Link> for details.</>,
  },

  // ─── Privacy & Security ───────────────────────────────────
  {
    section: "guvenlik",
    question: "I forgot my password, what should I do?",
    searchText: "Click the Forgot Password link on the login page. Enter your email, a password reset link will be sent.",
    answer: <>Click the <strong>&lsquo;Forgot Password&rsquo;</strong> link on the login page. Enter your email address and a password reset link will be sent to you. Click the link to set your new password. If you don&apos;t receive the link, check your spam folder.</>,
  },
  {
    section: "guvenlik",
    question: "How do I change my password?",
    searchText: "You can change it from Settings Security by entering your current password and new password. Password must be at least 6 characters.",
    answer: <>You can change your password from <strong>Settings &rarr; Security</strong> by entering your current password and your new password. Your password must be at least 6 characters long. After the change, your sessions on other devices remain active. We recommend choosing a strong and unique password for security.</>,
  },
  {
    section: "guvenlik",
    question: "What is two-factor authentication (MFA)?",
    searchText: "Two-factor authentication adds an extra security layer to your account. You need to enter a verification code in addition to your password at each login.",
    answer: "Two-factor authentication (MFA) adds an extra security layer to your account. Once activated, you need to enter a verification code in addition to your password at each login. This feature protects your account from unauthorized access. You can activate it from Settings \u2192 Security.",
  },
  {
    section: "guvenlik",
    question: "What is a private account?",
    searchText: "When you switch to a private account, your posts are visible only to your followers. New follow requests require your approval.",
    answer: <>When you switch to a private account, your posts are visible only to your followers. Anyone who wants to follow you must wait for your approval. Your existing followers are not affected. You can make your account private or public again from <strong>Settings &rarr; Privacy</strong>.</>,
  },
  {
    section: "guvenlik",
    question: "How do I block a user?",
    searchText: "Use the Block option from the menu on the user's profile. Blocked users cannot see your content.",
    answer: <>Use the <strong>&lsquo;Block&rsquo;</strong> option from the three-dot menu on the user&apos;s profile. Blocked users cannot see your content, comment on your posts or send you messages. The blocking action is not notified to the other party. You can unblock them at any time.</>,
  },
  {
    section: "guvenlik",
    question: "How do I unblock someone?",
    searchText: "You can unblock users from the blocked users list in Settings Privacy section.",
    answer: "You can see the list of users you&apos;ve blocked from Settings \u2192 Privacy \u2192 Blocked Users. Click the button next to the user you want to unblock. Once unblocked, that user can see your content and interact with you again.",
  },
  {
    section: "guvenlik",
    question: "How do I report content or a user?",
    searchText: "Use the Report option from the content or profile menu. Select the reason and submit. It will be reviewed by our team.",
    answer: <>Use the <strong>&lsquo;Report&rsquo;</strong> option from the three-dot menu on the content or profile. Select the reason (spam, hate speech, harassment, etc.) and submit. Your report will be reviewed by our team as soon as possible and appropriate action will be taken. Your report is kept anonymous.</>,
  },
  {
    section: "guvenlik",
    question: "How do I freeze my account?",
    searchText: "You can freeze your account from Settings Security. Frozen accounts become invisible in search and profiles. Reactivate by signing in again.",
    answer: "You can temporarily freeze your account from Settings \u2192 Security. A frozen account becomes invisible in search results and your profile cannot be accessed. Your content and data are preserved. You can reactivate your account at any time by signing in again.",
  },
  {
    section: "guvenlik",
    question: "How do I permanently delete my account?",
    searchText: "You can permanently delete your account from Settings Security. This action cannot be undone. All your data will be deleted within 30 days.",
    answer: <>You can permanently delete your account from Settings &rarr; Security. <strong>This action cannot be undone.</strong> All your posts, comments, Token balance and personal data will be permanently deleted within 30 days. You need to type &lsquo;DELETE&rsquo; to confirm the deletion. For more information, see our <Link href="/help/privacy" className={lnk}>Privacy Policy</Link> page.</>,
  },
  {
    section: "guvenlik",
    question: "How is my data protected?",
    searchText: "Passwords are stored with secure hashing. SSL/TLS encryption is used. Data is not sold for advertising. KVKK compliant data processing.",
    answer: <>Your passwords are securely hashed and never stored as plain text. All communication is encrypted with SSL/TLS. Your data is not sold to third parties for advertising purposes. Your personal data is protected under data protection regulations. For more details, see our <Link href="/help/privacy" className={lnk}>Privacy Policy</Link> and <Link href="/help/terms" className={lnk}>Terms of Service</Link> pages.</>,
  },

  // ─── Profile & Settings ──────────────────────────────────────
  {
    section: "profil",
    question: "How do I edit my profile?",
    searchText: "Click the Edit Profile button on your profile page. You can update your name, username, bio, profile photo, date of birth and website.",
    answer: <>Click the <strong>&lsquo;Edit Profile&rsquo;</strong> button on your profile page. You can update your first name, last name, username, bio, profile photo, date of birth, gender and website. Changes are reflected immediately after saving.</>,
  },
  {
    section: "profil",
    question: "What is a username and how do I change it?",
    searchText: "Your username is your profile's unique identifier. 3-15 characters, letters, numbers, periods and underscores allowed. Change it from the profile editing screen.",
    answer: "Your username is your profile&apos;s unique identifier and appears in your URL (feedim.com/u/username). You can change it from the profile editing screen. Usernames must be 3-15 characters and can only contain letters, numbers, periods and underscores. The username you choose must be available \u2014 it&apos;s checked in real time.",
  },
  {
    section: "profil",
    question: "How do I change my profile photo?",
    searchText: "Click the camera icon on the profile editing screen, select an image and adjust it with the cropping tool. Maximum 10 MB.",
    answer: "Click the camera icon on the profile editing screen, select an image and adjust it as you like with the cropping tool. Maximum file size is 10 MB. You can remove or replace your photo at any time.",
  },
  {
    section: "profil",
    question: "What is a bio?",
    searchText: "A bio is a short introduction text that appears on your profile. Maximum 150 characters. Briefly introduce yourself.",
    answer: "A bio is a short introduction text that appears on your profile. It can be up to 150 characters. Briefly introduce yourself, mention your interests or expertise. A good bio makes your profile more appealing and helps other users get to know you.",
  },
  {
    section: "profil",
    question: "How do I change theme settings?",
    searchText: "Click the theme button in the left menu to switch between Light, Dark, Dim or System modes.",
    answer: "Click the theme button in the left menu to switch between Light, Dark, Dim or System modes. System mode automatically follows your device&apos;s settings. Your preferred theme is saved to your device and automatically applied on future visits.",
  },
  {
    section: "profil",
    question: "What is the verified account badge?",
    searchText: "The verified account badge (blue tick) is given to accounts whose credibility has been proven on the platform. Profile completion, content quality and community engagement are evaluated.",
    answer: "The verified account badge (blue tick) is given to accounts whose credibility has been proven on the platform. The badge is awarded through automatic evaluation and team approval. Criteria such as profile completion rate, content quality, community engagement and account age are evaluated. Premium members are given priority consideration.",
  },

  // ─── Posts & Content ──────────────────────────────────────
  {
    section: "icerik",
    question: "What is a post?",
    searchText: "A post is content you share on Feedim. It supports text, images and rich text formats. Your posts appear on your profile and in the feed.",
    answer: <>A post is content you create and share on Feedim. It supports text, images, links and rich text formats. Your posts are listed on your profile and appear in your followers&apos; home feed and the <Link href="/explore" className={lnk}>explore</Link> section. You can add tags to each post and receive likes and comments.</>,
  },
  {
    section: "icerik",
    question: "How do I create a post?",
    searchText: "Click the Create button in the left menu. Enter a title, write your content with the rich text editor, add tags and a cover image. You can save as draft or publish.",
    answer: <>Click the <strong>&lsquo;Create&rsquo;</strong> button in the left menu. Enter a title (at least 3 characters) and write your content with the rich text editor. Optionally add a cover image and tags. You can save your post as a draft or publish it directly. Content must be at least 50 characters.</>,
  },
  {
    section: "icerik",
    question: "What are tags and how do I add them?",
    searchText: "Tags define the topic of your post. You can add up to 5 tags. Tags help your post get categorized in the explore section.",
    answer: <>Tags define the topic and category of your post. You can add up to 5 tags when creating a post. Tags help your post appear in the right category in the <Link href="/explore" className={lnk}>explore</Link> section and make it easier for other users to find your content. Popular tags appear in the trending list.</>,
  },
  {
    section: "icerik",
    question: "Can I edit my post?",
    searchText: "Yes, you can edit your published post. Update the title, content and tags from the Edit option in the post menu. Changes are reflected immediately.",
    answer: <>Yes, you can edit your published post at any time. Click <strong>&lsquo;Edit&rsquo;</strong> from the menu in the top right corner of the post. You can update the title, content, cover image and tags. Changes are reflected immediately after saving.</>,
  },
  {
    section: "icerik",
    question: "How do I delete my post?",
    searchText: "You can delete it from the Delete option in the post menu. Deleted posts cannot be recovered. All likes, comments and Token earnings are also deleted.",
    answer: <>You can delete it using the <strong>&lsquo;Delete&rsquo;</strong> option from the post menu. Deletion requires confirmation. Deleted posts cannot be recovered. All <Heart className={ico} /> likes, <MessageCircle className={ico} /> comments and Token earnings associated with the post are permanently removed.</>,
  },
  {
    section: "icerik",
    question: "What is a draft?",
    searchText: "A draft is an unpublished post. You can save it as a draft and edit or publish it later. Access your drafts from the drafts section on your profile.",
    answer: <>A draft is an unpublished post visible only to you. Save it by selecting <strong>&lsquo;Save as draft&rsquo;</strong> when creating a post. You can edit, publish or delete drafts later. Access all your drafts from the drafts section on your profile.</>,
  },
  {
    section: "icerik",
    question: "Is a cover image required?",
    searchText: "No, a cover image is optional. Posts with cover images appear more eye-catching in explore and on the home page.",
    answer: "No, a cover image is optional. However, posts with cover images appear more eye-catching in the explore section and home page, and receive more clicks. We recommend choosing a high-quality, relevant image.",
  },
  {
    section: "icerik",
    question: "How do I use the rich text editor?",
    searchText: "When writing a post, you can use formatting options like bold, italic, headings, lists, links, images and quotes.",
    answer: "When writing a post, you can enrich your content using the editor toolbar. Formatting options include bold, italic, headings (H2, H3), ordered and bulleted lists, link insertion, image upload and quotes. Images can also be added via drag and drop.",
  },
  {
    section: "icerik",
    question: "What are the content rules?",
    searchText: "Content must be original, no copyright infringement. Hate speech, violence, harassment, spam and illegal content are prohibited. Content may be removed for violations.",
    answer: <>Content must be original and must not infringe copyrights. Hate speech, violence, harassment, spam and content promoting illegal activities are prohibited. Unauthorized sharing of personal data is forbidden. Content may be removed and accounts may be suspended for violations. See our <Link href="/help/terms" className={lnk}>Terms of Service</Link> for detailed rules.</>,
  },
  {
    section: "icerik",
    question: "Why was my post removed?",
    searchText: "Your post may have been found to violate community guidelines. It may have been removed due to copyright infringement, spam, hate speech or reports.",
    answer: <>Your post may have been removed because it was found to violate community guidelines. Common reasons include copyright infringement, spam content, hate speech, misleading information or reports from other users. For more details or to appeal, you can write to <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a>.</>,
  },

  // ─── Moderation & Content Safety ────────────────────────
  {
    section: "moderasyon",
    question: "How does the moderation system work?",
    searchText: "Feedim's moderation system works with AI-powered automatic review and human moderator control. Content is scanned by AI before being published.",
    answer: <>Feedim uses a two-layer system: AI-powered automatic moderation and human moderator review. New content is scanned by AI when published. Problematic content is placed under moderation and only visible to the author. See the <Link href="/help/moderation" className={lnk}>Moderation System</Link> page for details.</>,
  },
  {
    section: "moderasyon",
    question: "Why was my content placed under moderation?",
    searchText: "Content is placed under moderation if found to violate community guidelines. It may be hidden for reasons like NSFW, hate speech, copyright infringement, spam.",
    answer: <>Your content may have been placed under moderation because it was found to violate community guidelines. Common reasons: NSFW/sexual content, hate speech, copyright infringement, duplicate content or spam. Moderated content is only visible to you. You can check your moderation status by clicking the &ldquo;Under Review&rdquo; badge on the post.</>,
  },
  {
    section: "moderasyon",
    question: "What does Feedim AI do?",
    searchText: "Feedim AI automatically scans content. It performs NSFW detection, hate speech checking, spam detection and copyright comparison.",
    answer: <>Feedim AI automatically reviews content as soon as it is published. It performs NSFW/sexual content detection, hate speech and profanity checking, spam detection and copyright comparison. Content found to be problematic is placed under moderation. See the <Link href="/help/ai" className={lnk}>Feedim AI</Link> page for details.</>,
  },
  {
    section: "moderasyon",
    question: "What is NSFW content and how am I protected?",
    searchText: "NSFW is sexual or inappropriate content. Feedim AI automatically detects it and places it under moderation. Users are automatically protected from such content.",
    answer: <>NSFW (Not Safe For Work) refers to sexual, violent or inappropriate content. Feedim AI automatically detects such content and places it under moderation. A safe environment is maintained across the platform. See the <Link href="/help/moderation" className={lnk}>Moderation System</Link> page for details.</>,
  },
  {
    section: "moderasyon",
    question: "Can I appeal a moderation decision?",
    searchText: "To appeal a moderation decision, you can write to support@feedim.com. It will be re-evaluated by human moderators.",
    answer: <>Yes. If you believe the moderation decision was unfair, you can appeal by writing to <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a>. Your appeal will be re-evaluated by human moderators. See the <Link href="/help/moderation" className={lnk}>Moderation System</Link> page for details.</>,
  },

  // ─── Copyright & Duplicate Content ─────────────────────────
  {
    section: "telif",
    question: "What is copyright protection?",
    searchText: "Copyright protection is a system designed to prevent your content from being copied. Text, image and video-based comparison is performed.",
    answer: <>Copyright protection is a system designed to prevent unauthorized copying of your content. When you enable it, comprehensive text, image and video-based scanning is performed. When similarity is detected, the content is placed under moderation or a copyright badge is added. See the <Link href="/help/copyright" className={lnk}>Copyright Protection</Link> page for details.</>,
  },
  {
    section: "telif",
    question: "How do I enable copyright protection?",
    searchText: "When creating a post, video or moment, you can enable the copyright protection toggle in the settings to protect your content.",
    answer: <>When creating a post, video or moment, you can protect your content by enabling the <strong>&ldquo;Copyright protection&rdquo;</strong> feature in the settings section. When protection is enabled, your content is scanned on a text, image and video basis.</>,
  },
  {
    section: "telif",
    question: "What is duplicate content?",
    searchText: "Duplicate content is content with 90% or more text similarity to another user's content. It is always actively scanned and placed under moderation.",
    answer: <>Duplicate content is content where 90% or more text similarity is detected with existing content on the platform. This scan is <strong>always active</strong> and cannot be turned off &mdash; it works even if copyright protection is not enabled. Detected duplicate content is placed under moderation.</>,
  },
  {
    section: "telif",
    question: "How does the copyright strike system work?",
    searchText: "A strike is added to the account for each copyright or duplicate violation. After 3 strikes, profile score penalties begin. At 10 strikes, the account is permanently deleted.",
    answer: <>A strike is added to your account for each copyright or duplicate content violation. As your strike count increases, your profile score decreases and graduated sanctions are applied to your account. When a certain strike count is reached, your account may be permanently suspended. See the <Link href="/help/copyright" className={lnk}>Copyright Protection</Link> page for details.</>,
  },
  {
    section: "telif",
    question: "How do I file a copyright complaint?",
    searchText: "If you think your content has been copied, you can file a copyright complaint from the Report menu. Original and copy URL are required.",
    answer: <>If you believe your content has been copied without permission, you can file a copyright complaint from the <strong>&ldquo;Report&rdquo;</strong> option in the content&apos;s menu. The original content URL and the copy content URL are required. You may need to prove that you are the original content owner. False complaints negatively affect your trust score.</>,
  },

  // ─── Engagement & Social ────────────────────────────────────
  {
    section: "etkilesim",
    question: "What is a like?",
    searchText: "A like is the easiest way to show you enjoyed a post. Click the heart icon to like. The post owner gets notified.",
    answer: <>A like is the easiest way to show you enjoyed a post. Click the <Heart className={ico} /> heart icon below the post to like it. Click the same icon again to unlike. The post owner receives a <Bell className={ico} /> notification when you like. The like count is displayed below the post.</>,
  },
  {
    section: "etkilesim",
    question: "What is a comment?",
    searchText: "A comment lets you share your thoughts about a post. Maximum 250 characters. You can reply to comments and mention users with @.",
    answer: <>A comment lets you share your thoughts about a post. Write in the <MessageCircle className={ico} /> comment section below the post. Comments can be up to 250 characters. You can mention other users with @. Comments can be replied to and <Heart className={ico} /> liked. The post owner receives a comment <Bell className={ico} /> notification.</>,
  },
  {
    section: "etkilesim",
    question: "What is following?",
    searchText: "Following a user lets you see their new posts on your home page. Click the Follow button on the profile. Following sends a notification.",
    answer: <>When you follow a user, their new posts appear on your <Home className={ico} /> home page. Click the <strong>&lsquo;Follow&rsquo;</strong> button on the user&apos;s profile page. The other party receives a <Bell className={ico} /> notification when you follow. Following private accounts requires approval. You can unfollow at any time.</>,
  },
  {
    section: "etkilesim",
    question: "What is bookmarking?",
    searchText: "Bookmarking lets you save posts you like. Click the bookmark icon. Access them from the Bookmarks section.",
    answer: <>Bookmarking lets you save posts that interest you. Click the <Bookmark className={ico} /> bookmark icon below the post. Access your saved posts from the <Bookmark className={ico} /> <Link href="/bookmarks" className={lnk}>Bookmarks</Link> section in the left menu. Bookmarking is private &mdash; the post owner cannot see it.</>,
  },
  {
    section: "etkilesim",
    question: "How do I share?",
    searchText: "With the share button below the post, you can copy the link or share via WhatsApp, X, Facebook, LinkedIn, Pinterest and email.",
    answer: <>Click the <ShareIcon /> share button below the post. You can copy the link or share directly via WhatsApp, X (Twitter), Facebook, LinkedIn, Pinterest and email. On mobile, your device&apos;s native sharing menu is also available.</>,
  },
  {
    section: "etkilesim",
    question: "What is a mention (@mention)?",
    searchText: "In a comment or content, you can mention a user by typing @ followed by their username. The mentioned person gets notified. Up to 3 mentions per comment.",
    answer: <>To mention a user in a comment or content, type <strong>@username</strong>. Suggestions appear as you type. The mentioned person receives a notification. Up to 3 mentions per comment are allowed. Mentions turn into profile links.</>,
  },
  {
    section: "etkilesim",
    question: "How do I delete a comment?",
    searchText: "To delete your own comment, hover over it and click the delete button. Post owners can delete all comments on their posts.",
    answer: "To delete your own comment, hover over it (or long-press) and click the delete button. Post owners can delete all comments on their own posts. Deleted comments cannot be recovered. Replies to the comment are also deleted.",
  },
  {
    section: "etkilesim",
    question: "How do I visit the post author's profile?",
    searchText: "Click the username or profile photo on the post to go to the user's profile.",
    answer: <>You can visit the user&apos;s profile by clicking the username or profile photo on the post. You can also use the <strong>&lsquo;User&apos;s profile&rsquo;</strong> option from the post menu. On the profile page, you can see all posts, follower count and bio.</>,
  },

  // ─── Notifications ────────────────────────────────────────────
  {
    section: "bildirim",
    question: "How do notifications work?",
    searchText: "You receive notifications for interactions like likes, comments, replies, mentions, follows and Token earnings. View them in the Notifications section.",
    answer: <>You receive <Bell className={ico} /> notifications for interactions like <Heart className={ico} /> likes, <MessageCircle className={ico} /> comments, replies, mentions, follows and Token earnings. View all your notifications from the <Bell className={ico} /> <Link href="/notifications" className={lnk}>Notifications</Link> section in the left menu. Unread notifications are marked with a blue dot. You can mark all as read.</>,
  },
  {
    section: "bildirim",
    question: "What notification types are there?",
    searchText: "Like, comment, reply, mention, follow, follow request, follow accept, achievement, Token earning, premium expiration and system notifications.",
    answer: <>Feedim has the following notification types: <Heart className={ico} /> Like, <MessageCircle className={ico} /> Comment and Reply, Mention, Follow and Follow Request, Token Earning, Premium Expiration, Achievement and System notifications.</>,
  },
  {
    section: "bildirim",
    question: "How do I manage notification settings?",
    searchText: "You can toggle each notification type on or off from Settings Notifications. A 24-hour pause feature is also available.",
    answer: <>You can toggle each notification type on or off from Settings &rarr; Notifications (<Heart className={ico} /> likes, <MessageCircle className={ico} /> comments, follows, Token earnings, etc.). To temporarily disable all notifications, use the <strong>&lsquo;Pause for 24 hours&rsquo;</strong> feature.</>,
  },
  {
    section: "bildirim",
    question: "Why am I not receiving notifications?",
    searchText: "Check browser notification permissions. Make sure your notification preferences are turned on in settings. A page refresh may fix the issue.",
    answer: "Check your browser notification permissions. Make sure your notification preferences are turned on in Settings \u2192 Notifications. Notification pause may be active \u2014 check it. A page refresh or signing out and back in may fix the issue.",
  },

  // ─── Tokens & Earnings ───────────────────────────────────────
  {
    section: "jeton",
    question: "What are Tokens?",
    searchText: "Tokens are Feedim's virtual currency. Earned through content reading and purchases. Tokens can be converted to TRY.",
    answer: <>Tokens are Feedim&apos;s virtual currency. Users earn or spend Tokens through post reading and purchases. You can convert your accumulated Tokens to TRY. Track your Token balance from your profile and the <Link href="/coins" className={lnk}>Tokens page</Link>.</>,
  },
  {
    section: "jeton",
    question: "How do I earn Tokens?",
    searchText: "When Premium readers read your post, you automatically earn Tokens. Your content needs to be genuinely read.",
    answer: "When readers with a Premium membership genuinely read your post, you automatically earn Tokens. The system automatically verifies qualified reads and reflects the earnings in your account.",
  },
  {
    section: "jeton",
    question: "How do I withdraw Tokens?",
    searchText: "You can create a withdrawal request when you accumulate a minimum of 100 Tokens. Enter your bank details from Settings Earnings and submit your withdrawal request.",
    answer: "You can create a withdrawal request when you accumulate a minimum of 100 Tokens. Enter your bank details (IBAN) from Settings \u2192 Earnings and submit your withdrawal request. Withdrawal requests are processed on business days.",
  },
  {
    section: "jeton",
    question: "How do I purchase Tokens?",
    searchText: "You can purchase by selecting a package from the Tokens page. Packages with bonus Tokens are available. Payment is processed securely.",
    answer: <>You can purchase by selecting your desired package from the <Link href="/coins" className={lnk}>Tokens page</Link>. Various packages are available and some include bonus Tokens.</>,
  },
  {
    section: "jeton",
    question: "Is there a Token earning limit?",
    searchText: "Daily and per-post earning limits are applied for fair use.",
    answer: "Yes, daily and per-post earning limits are applied to ensure fair use. Check the Tokens page for details.",
  },
  {
    section: "jeton",
    question: "Why were my Tokens deducted?",
    searchText: "If fake reading, bot usage or abuse of the system is detected, earned Tokens may be revoked and the account may be suspended.",
    answer: "If fake reading, bot usage, self-reading or any abuse of the Token system is detected, earned Tokens may be revoked and the account may be suspended. Feedim uses automated detection systems to ensure fair use.",
  },

  // ─── Premium Membership ─────────────────────────────────────
  {
    section: "premium",
    question: "What is Premium membership?",
    searchText: "Premium membership offers additional features: ad-free experience, verified badge, priority support, long posts, earning money and more.",
    answer: <>With Premium membership, you enjoy an ad-free experience, get a verified badge, priority support and unlimited character posts among other perks. You also earn Tokens for content creators whose posts you read. See the <Link href="/premium" className={lnk}>Premium page</Link> for details.</>,
  },
  {
    section: "premium",
    question: "What are the Premium plans and pricing?",
    searchText: "Super (39.99 TL/mo), Pro (79.99 TL/mo), Max (129 TL/mo) and Business (249 TL/mo) plans are available. Each plan offers different features.",
    answer: <>Feedim has four Premium plans: <strong>Super</strong> (39.99 TL/mo), <strong>Pro</strong> (79.99 TL/mo), <strong>Max</strong> (129 TL/mo) and <strong>Business</strong> (249 TL/mo). Each plan offers different perks. Pro and above plans include additional features like Token earning, analytics and featured placement. The Business plan is designed for businesses. Visit the <Link href="/premium" className={lnk}>Premium page</Link> to compare plans.</>,
  },
  {
    section: "premium",
    question: "How do I cancel my Premium membership?",
    searchText: "You can cancel from Settings Membership. You can use Premium features until the end of the current period. No partial refunds.",
    answer: "You can cancel from Settings \u2192 Membership. The cancellation takes effect at the end of the current billing period. Your Premium perks continue until the end of the period. No partial refunds are provided. You can resubscribe at any time.",
  },
  {
    section: "premium",
    question: "What happens when Premium expires?",
    searchText: "You'll be notified when your Premium expires. If not renewed, Premium perks end. Your account and content are preserved.",
    answer: "You&apos;ll be notified when your Premium expires. If the membership is not renewed, Premium perks (badge, ad-free experience, priority support, etc.) end. However, your account, posts and Token balance are preserved. You can go Premium again at any time.",
  },
  {
    section: "premium",
    question: "What is the Premium badge?",
    searchText: "Premium members display a special badge on their profiles. This badge increases your credibility. The badge may vary by plan type.",
    answer: "Premium members display a special badge on their profiles. This badge shows other users that you are a trusted account. When Premium ends, the badge is removed. The verified account badge and the Premium badge are different \u2014 both can appear together.",
  },

  // ─── Explore & Search ───────────────────────────────────────
  {
    section: "kesfet",
    question: "What is the Explore page?",
    searchText: "Explore lets you discover posts from different users. Trending tags, popular content and categories are available.",
    answer: <>The <Link href="/explore" className={lnk}>Explore</Link> page lets you discover posts from different users. Posts are listed by trending tags, popular content and categories. You can find quality content from users you don&apos;t follow here.</>,
  },
  {
    section: "kesfet",
    question: "How are trending tags determined?",
    searchText: "Trending tags are the most used and most engaged tags in a given time period. Updated automatically.",
    answer: "Trending tags are the most used and most engaged tags in a given time period. They are updated automatically. Click on a trending tag to see all posts on that topic. You can follow tags to customize your feed based on your interests.",
  },
  {
    section: "kesfet",
    question: "How do I use search?",
    searchText: "Search for users, posts and tags from the search bar on the Explore page. Results appear instantly.",
    answer: "Search for usernames, post titles or tags from the search bar on the Explore page. Results appear instantly as you type. Results are grouped by users and tags.",
  },
  {
    section: "kesfet",
    question: "How does the home feed work?",
    searchText: "The home page shows new posts from users you follow in chronological order. If your follow list is empty, recommended content is shown.",
    answer: <>Your <Home className={ico} /> home page shows new posts from users you follow in chronological order. If you haven&apos;t followed anyone yet, popular and recommended content is shown. Your feed gets richer as you follow more users.</>,
  },

  // ─── Troubleshooting ─────────────────────────────────────────
  {
    section: "sorun",
    question: "I can't sign in, what should I do?",
    searchText: "Check your email and password. Reset with Forgot Password. Verify your email. If the issue persists, write to support@feedim.com.",
    answer: <>First, check your email address and password. If you don&apos;t remember your password, reset it with <strong>&lsquo;Forgot Password&rsquo;</strong>. If you haven&apos;t verified your email, check your spam folder. Try clearing your browser cookies and cache. If the issue persists, write to <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a>.</>,
  },
  {
    section: "sorun",
    question: "I'm not receiving the email verification link",
    searchText: "Check your spam or junk folder. Make sure you entered your email correctly. Wait a few minutes. Gmail, Outlook, Yahoo are supported.",
    answer: "Check your spam or junk email folder. Make sure you entered your email address correctly. Wait a few minutes and try again. Common email providers like Gmail, Outlook, Yahoo and iCloud are supported. If the issue persists, try signing up with a different email address.",
  },
  {
    section: "sorun",
    question: "Why was my account suspended?",
    searchText: "Accounts may be suspended for violating terms of service, spam content, Token abuse or harassment. Appeal at support@feedim.com.",
    answer: <>Accounts may be suspended for violations of the terms of service, producing spam content, abusing the Token system or harassing other users. For more details and to appeal, you can write to <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a>. All rules are explained in detail on our <Link href="/help/terms" className={lnk}>Terms of Service</Link> page.</>,
  },
  {
    section: "sorun",
    question: "Posts aren't loading or I'm getting an error",
    searchText: "Check your internet connection. Refresh the page or clear browser cache. Try a different browser.",
    answer: "Check your internet connection. Refresh the page or clear your browser cache. Try a different browser. If you&apos;re getting errors while creating a post, make sure the content size doesn&apos;t exceed limits (title 3-200 characters, content at least 50 characters). If the issue persists, try signing out and back in.",
  },
  {
    section: "sorun",
    question: "What is Feedim?",
    searchText: "Feedim is a content and video platform where you can discover and share inspiring content. Users share posts and videos, readers discover. Premium readers earn Tokens.",
    answer: <>Feedim is a content and video platform where you can discover and share inspiring content. Users share posts and videos, readers discover quality content. Posts read by Premium readers earn Tokens for creators. Tokens can be converted to TRY. See our <Link href="/help/about" className={lnk}>About Us</Link> page for details.</>,
  },
  {
    section: "sorun",
    question: "I have another issue, how can I reach you?",
    searchText: "support@feedim.com or contact us via the Contact page. We respond within 24 hours on business days.",
    answer: <>For questions you can&apos;t find answers to on this page, you can write to <a href="mailto:support@feedim.com" className={lnk}>support@feedim.com</a> or visit our <Link href="/help/contact" className={lnk}>Contact page</Link>. We respond to all inquiries within 24 hours on business days.</>,
  },
];
