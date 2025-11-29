'use client';
import StoryCircle from './StoryCircle';

const stories = [
  { id: 1, name: 'أحمد', image: '/story1.jpg' },
  { id: 2, name: 'سارة', image: '/story2.jpg' },
  { id: 3, name: 'محمد', image: '/story3.jpg' },
];

export default function RightSidebar() {
  return (
    <aside className="w-80 fixed right-0 top-14 bottom-0 overflow-y-auto hidden xl:block pt-4 pr-4">
      <div className="card p-4">
        <h3 className="text-xl font-bold mb-4">القصص</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <StoryCircle addStory />
          {stories.map(story => <StoryCircle key={story.id} {...story} />)}
        </div>
      </div>

      <div className="card p-4 mt-4">
        <h3 className="text-xl font-bold mb-4">جهات الاتصال</h3>
        <div className="space-y-3">
          {['فاطمة', 'علي', 'نور', 'يوسف'].map(name => (
            <div key={name} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full relative">
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              <span>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
