'use client';
import { useState } from 'react';

export default function CreatePostModal({ isOpen, onClose }) {
  const [text, setText] = useState('');
  const [images, setImages] = useState([]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-facebook-darker rounded-2xl w-full max-w-lg mx-4">
        <div className="border-b border-gray-300 p-4 text-center font-bold text-xl">
          إنشاء منشور
          <button onClick={onClose} className="float-left text-3xl">×</button>
        </div>
        <div className="p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ما الذي يدور في بالك؟"
            className="w-full p-3 text-lg outline-none resize-none"
            rows="4"
          />
          <div className="mt-4 flex justify-between items-center">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => setImages([...e.target.files])}
              className="hidden"
              id="media"
            />
            <label htmlFor="media" className="cursor-pointer text-green-500 text-3xl">📷</label>
            <button className="btn-blue px-8">نشر</button>
          </div>
        </div>
      </div>
    </div>
  );
}
