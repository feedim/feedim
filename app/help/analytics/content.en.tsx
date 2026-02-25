import Link from "next/link";

export default function ContentEn() {
  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Analytics Panel</h1>
      <div className="space-y-6 text-sm text-text-secondary leading-relaxed">
        <p>
          The Feedim Analytics Panel is a comprehensive statistics tool available to <strong>Premium members</strong>.
          You can track the performance of your content in detail, analyze reader behavior,
          and gain data-driven insights for making strategic decisions.
        </p>

        {/* ── Premium Requirement ── */}
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide mb-2">Premium Membership Required</p>
          <p>
            The Analytics Panel is only accessible to users with Premium membership.
            When you open the analytics page with a free account, a &ldquo;Premium Membership Required&rdquo; warning is displayed
            and statistics cannot be accessed. For detailed information about Premium membership, visit the{" "}
            <Link href="/settings/premium" className="text-accent-main hover:opacity-80 font-semibold">Premium page</Link>.
          </p>
        </div>

        {/* ── Period Selection ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Period Selection</h2>
        <p>
          You can review your statistics across different time periods using the period selector at the top
          of the analytics panel. Your selected period affects all metrics, charts, and comparisons.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>7 days</strong> &mdash; Last one week&apos;s data</li>
          <li><strong>30 days</strong> &mdash; Last one month&apos;s data (default)</li>
          <li><strong>90 days</strong> &mdash; Last three months&apos; data</li>
        </ul>
        <p>
          For each period selection, data is compared with the previous equivalent period
          and change percentages are calculated.
        </p>

        {/* ── Overview Metrics ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Overview Metrics</h2>
        <p>
          The summary cards at the top of the panel present your key performance indicators
          for the selected period at a glance. Each metric is compared with the previous period and the increase or decrease percentage is shown.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Tracked Metrics</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Views</strong> &mdash; Total read/view count of your content</li>
            <li><strong>Likes</strong> &mdash; Total number of likes on your content</li>
            <li><strong>Comments</strong> &mdash; Total number of comments on your content</li>
            <li><strong>Saves</strong> &mdash; How many times your content has been saved</li>
            <li><strong>Shares</strong> &mdash; How many times your content has been shared</li>
            <li><strong>New Followers</strong> &mdash; Number of new followers gained in the selected period</li>
          </ul>
        </div>

        {/* ── Earnings Card ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Earnings Card</h2>
        <p>
          The earnings card shows your token revenue from content in detail.
          This card is only available to users with a <strong>Professional account</strong> type;
          standard Premium accounts see the earnings card as blurred and locked.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Earnings Metrics</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Token Balance</strong> &mdash; Your current token balance</li>
            <li><strong>Period Earnings</strong> &mdash; Token amount earned in the selected period</li>
            <li><strong>Total Earnings</strong> &mdash; Your account&apos;s total earnings</li>
            <li><strong>Qualified Reads</strong> &mdash; Number of reads that converted to earnings</li>
          </ul>
        </div>

        {/* ── Average Metrics ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Average Metrics</h2>
        <p>
          The quick stats strip offers compact indicators showing the average performance of your content.
          These indicators are horizontally scrollable and summarize your overall status at a glance.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Views per post</strong> &mdash; Average view count across all your posts</li>
          <li><strong>Likes per post</strong> &mdash; Average like count across all your posts</li>
          <li><strong>Comments per post</strong> &mdash; Average comment count across all your posts</li>
          <li><strong>Average reading time</strong> &mdash; Average time readers spend on your content (minutes)</li>
          <li><strong>Post count</strong> &mdash; Your total number of published posts</li>
          <li><strong>Follower count</strong> &mdash; Your total follower count</li>
        </ul>

        {/* ── Engagement Rate ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Engagement Rate</h2>
        <p>
          The engagement rate shows how many of the users who viewed your content took an action
          such as liking, commenting, saving, or sharing. This rate is calculated as a percentage and
          helps you evaluate the quality of your content.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <p>
            <strong className="text-text-primary">Calculation:</strong> Engagement Rate = (Likes + Comments + Saves + Shares) / Total Views x 100.
            The higher the rate, the more effective and engaging your content is.
          </p>
        </div>

        {/* ── Daily Chart ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Daily Chart</h2>
        <p>
          You can view daily changes in the selected period as a bar chart.
          Use the tabs on the chart to switch between four different metrics:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Views</strong> &mdash; Daily view trend</li>
          <li><strong>Likes</strong> &mdash; Daily like trend</li>
          <li><strong>Comments</strong> &mdash; Daily comment trend</li>
          <li><strong>Followers</strong> &mdash; Daily new follower trend</li>
        </ul>
        <p>
          When you hover over each bar in the chart, the detailed count and date of that day is displayed.
          Below the chart, the total count and daily average for the period are also shown.
        </p>

        {/* ── Peak Hours Heatmap ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Peak Hours Heatmap</h2>
        <p>
          The heatmap visually presents how much your content is read across the 24 hours of the day.
          Each hour slot is colored from light to dark based on reading intensity.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">How to Read the Heatmap?</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Darker hours indicate the times when your content is read the most</li>
            <li>Light or empty hours represent low activity periods</li>
            <li>The peak hour is automatically shown in the top right corner</li>
            <li>Use this information to publish your content at the optimal time</li>
          </ul>
        </div>

        {/* ── Weekly Day Distribution ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Weekly Day Distribution</h2>
        <p>
          A horizontal bar chart showing which days of the week your content receives more views.
          View counts for each day from Monday to Sunday are presented comparatively.
          The best performing day is indicated in the top right corner.
        </p>
        <p>
          The weekly distribution helps you optimize your publishing strategy. By publishing new content
          on the busiest days, you can reach more readers.
        </p>

        {/* ── Top Posts ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Top Posts Ranking</h2>
        <p>
          Your most viewed posts in the selected period are shown as a ranked list.
          For each post, views, likes, comments, and save counts are presented in detail.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>The first 5 posts are shown by default</li>
          <li>If you have more than 5 posts, you can open the full list with the &ldquo;See all posts&rdquo; button</li>
          <li>A performance bar next to each post is proportioned to the most viewed post</li>
          <li>Post cover image, title, and detailed metrics are presented in a single row</li>
        </ul>

        {/* ── Video Analytics ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Video Analytics</h2>
        <p>
          The video analytics section allows you to track the performance of your video content in detail.
          This section is only visible to users with a <strong>Professional account</strong> type who have
          published at least one video.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4 space-y-3">
          <p className="font-semibold text-text-primary text-xs uppercase tracking-wide">Video Metrics</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Total watch hours</strong> &mdash; Total viewing duration of your videos (in hours)</li>
            <li><strong>Average watch duration</strong> &mdash; Average time viewers spend on your videos</li>
            <li><strong>Average watch percentage</strong> &mdash; Average percentage of videos watched</li>
            <li><strong>Completion rate</strong> &mdash; Percentage of users who watched to the end</li>
            <li><strong>Video count</strong> &mdash; Your total number of published videos</li>
            <li><strong>Total viewers</strong> &mdash; Number of unique users who watched your videos</li>
            <li><strong>Most watched videos</strong> &mdash; Ranked list of your most popular videos</li>
          </ul>
        </div>

        {/* ── Insights ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Automatic Insights</h2>
        <p>
          The analytics panel provides automatic insights and evaluations based on your data.
          These insights are displayed when there is sufficient data (at least 10 views) and may include:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Evaluation of your engagement rate</li>
          <li>Information about the day with the most reads</li>
          <li>Your readers&apos; most active hour</li>
          <li>View changes compared to the previous period</li>
          <li>Average views per post information</li>
        </ul>

        {/* ── Access Analytics Panel ── */}
        <h2 className="text-lg font-bold text-text-primary mt-8 mb-4">Accessing the Analytics Panel</h2>
        <p>
          If you have a Premium membership, you can access the analytics panel directly from the link below.
          The panel can also be accessed from the &ldquo;Analytics&rdquo; tab in the left menu.
        </p>
        <div className="bg-bg-secondary rounded-[15px] p-4">
          <Link href="/analytics" className="text-accent-main hover:opacity-80 font-semibold">
            Go to Analytics Panel &rarr;
          </Link>
        </div>

        <div className="bg-bg-secondary rounded-[15px] p-5 mt-8">
          <p className="text-xs text-text-muted">
            For questions about the analytics panel,{" "}
            <Link href="/help/contact" className="text-accent-main hover:opacity-80 font-semibold">Contact</Link> us
            or reach out at <a href="mailto:support@feedim.com" className="text-accent-main hover:opacity-80 font-semibold">support@feedim.com</a>.
          </p>
        </div>
      </div>
    </>
  );
}
