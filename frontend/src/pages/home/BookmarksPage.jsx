import Posts from "../../components/common/Posts";

const BookmarksPage = () => {
  return (
    <div className="flex-[4_4_0] border-r border-gray-700 min-h-screen">
      <div className="px-4 py-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Bookmarks</h1>
        <p className="text-slate-400">Your saved posts</p>
      </div>
      <Posts feedType="bookmarks" />
    </div>
  );
};

export default BookmarksPage; 