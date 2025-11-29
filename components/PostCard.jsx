'use client';
import { useState } from 'react';

const reactions = ['❤️', '😂', '😮', '😢', '😡', '👍'];

export default function PostCard({ post }) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <img src={post.userId?.profilePic || 'https://i.pravatar.cc/150'} alt="" className="w-12 h-12 rounded-full object-cover" />
          <div>
            <h4 className="font-bold">{post.userId?.username || 'مستخدم'}</h4>
            <span className="text-sm text-gray-500">منذ ساعتين</span>
          </div>
        </div>
      </div>

      <p className="px-4 pb-3">{post.content}</p>

      {post.images?.[0] && (
        <img src={post.images[0]} alt="" className="w-full" />
      )}

      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div 
          className="flex justify-center gap-2 relative"
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          <button className="px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">إعجاب</button>
          <button className="px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">تعليق</button>
          <button className="px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">مشاركة</button>

          {showReactions && (
            <div className="absolute bottom-12 flex gap-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg">
              {reactions.map(r => (
                <span key={r} className="text-3xl cursor-pointer hover:scale-150 transition">{r}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
