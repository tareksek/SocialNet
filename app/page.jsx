// app/page.jsx
'use client';
import { useEffect, useState } from 'react';
import PostCard from '@/components/PostCard';
import CreatePostModal from '@/components/CreatePostModal';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const loadPosts = async () => {
    const res = await fetch('/api/posts');
    const data = await res.json();
    setPosts(data);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  return (
    <>
      <div className="max-w-2xl mx-auto pt-20 pb-10 px-4">
        <div onClick={() => setModalOpen(true)} className="card p-4 mb-6 cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-6 py-4 flex-1">
              <span className="text-gray-500">ما الذي يدور في بالك؟</span>
            </div>
          </div>
        </div>

        {posts.map(post => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>

      <CreatePostModal isOpen={modalOpen} onClose={() => { setModalOpen(false); loadPosts(); }} />
    </>
  );
}
