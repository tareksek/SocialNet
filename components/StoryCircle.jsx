export default function StoryCircle({ name, image, addStory = false }) {
  return (
    <div className="flex-shrink-0 text-center cursor-pointer">
      <div className={`w-28 h-48 rounded-2xl overflow-hidden relative border-4 ${addStory ? 'border-gray-300' : 'border-blue-500'}`}>
        {addStory ? (
          <div className="bg-gray-200 w-full h-full flex items-center justify-center">
            <span className="text-4xl text-gray-600">+</span>
          </div>
        ) : (
          <img src={image || `https://i.pravatar.cc/200?u=${name}`} alt={name} className="w-full h-full object-cover" />
        )}
        {addStory && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold">
            +
          </div>
        )}
      </div>
      <p className="mt-2 text-sm font-medium">{addStory ? 'إضافة إلى القصة' : name}</p>
    </div>
  );
}
