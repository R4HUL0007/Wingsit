const ReadmePage = () => (
  <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen flex flex-col items-center pt-10 px-4">
    <h1 className="text-2xl font-bold mb-4">App Features & Rules</h1>
    <div className="max-w-2xl w-full text-left text-white space-y-4">
      <div>
        <h2 className="font-bold text-lg mb-1">Core Features</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Real-time notifications for likes, follows, and messages</li>
          <li>Direct Messaging (DM) — <b>Only followers can DM you</b></li>
          <li>Like, repost, and bookmark posts</li>
          <li>Profile editing with cover and avatar image upload</li>
          <li>Followers and Following lists (clickable, modal view)</li>
          <li>Posts tab (your posts) and Likes tab (posts you liked)</li>
          <li>Bookmarks section for saved posts</li>
          <li>Feedback form for bug reports and suggestions</li>
        </ul>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-1">Rules & Behaviors</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li><b>Only users you follow can send you DMs</b></li>
          <li>You can only delete your own posts and comments</li>
          <li>Reposting (retweet) is limited to one repost per user per post</li>
          <li>Profile and cover images replace the old image (old one is deleted)</li>
          <li>Unread message and notification badges update in real time</li>
          <li>All features are mobile-friendly and responsive</li>
        </ul>
      </div>
      <div>
        <h2 className="font-bold text-lg mb-1">How to Use</h2>
        <ul className="list-disc ml-6 space-y-1">
          <li>Click your avatar to edit your profile or upload images</li>
          <li>Use the sidebar to navigate: Home, Notifications, Messages, Bookmarks, Profile, Feedback, README</li>
          <li>Click the emoji button in the post composer to add emojis</li>
          <li>Click the repost button to share a post to your followers</li>
          <li>Click the bookmark icon to save a post to your Bookmarks</li>
        </ul>
      </div>
      <div className="mt-6 text-slate-400 text-xs">This app is a Twitter-like clone built with real-time features, modern UI, and a focus on user experience.</div>
    </div>
  </div>
);

export default ReadmePage; 