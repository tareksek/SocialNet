const mongoose = require('mongoose');
const User = require('../backend/models/User');
const Post = require('../backend/models/Post');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-social';

const sampleUsers = [
    {
        firstName: 'محمد',
        lastName: 'أحمد',
        email: 'test@example.com',
        password: '123456',
        profilePicture: null,
        bio: 'مطور ويب ومصمم واجهات مستخدم',
        location: 'الرياض',
        gender: 'male'
    },
    {
        firstName: 'سارة',
        lastName: 'محمد',
        email: 'sara@example.com',
        password: '123456',
        profilePicture: null,
        bio: 'مصممة جرافيك ومهتمة بالفن',
        location: 'جدة',
        gender: 'female'
    },
    {
        firstName: 'علي',
        lastName: 'حسن',
        email: 'ali@example.com',
        password: '123456',
        profilePicture: null,
        bio: 'مهندس برمجيات ومطور تطبيقات',
        location: 'الدمام',
        gender: 'male'
    },
    {
        firstName: 'فاطمة',
        lastName: 'أحمد',
        email: 'fatima@example.com',
        password: '123456',
        profilePicture: null,
        bio: 'طالبة هندسة حاسب آلي',
        location: 'الرياض',
        gender: 'female'
    }
];

const samplePosts = [
    {
        content: 'مرحباً بالجميع! هذه هي أول منشوراتي في Nexus. 🎉',
        privacy: 'public'
    },
    {
        content: 'تعلمت تقنية جديدة اليوم في تطوير الويب. React.js رائع حقاً! 🚀',
        privacy: 'public'
    },
    {
        content: 'شارك في مسابقة التصميم السنوية! الجوائز قيمة جداً 🏆',
        privacy: 'public'
    },
    {
        content: 'أتمنى للجميع يوماً سعيداً! ☀️ شاركوني بأجمل لحظة في يومكم.',
        privacy: 'public'
    }
];

async function seedDatabase() {
    try {
        // الاتصال بقاعدة البيانات
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB for seeding');

        // مسح البيانات القديمة
        await User.deleteMany({});
        await Post.deleteMany({});
        console.log('✅ Cleared existing data');

        // إنشاء المستخدمين
        const createdUsers = await User.create(sampleUsers);
        console.log(`✅ Created ${createdUsers.length} users`);

        // إنشاء المنشورات
        const postsWithUsers = samplePosts.map((post, index) => ({
            ...post,
            user: createdUsers[index % createdUsers.length]._id
        }));

        const createdPosts = await Post.create(postsWithUsers);
        console.log(`✅ Created ${createdPosts.length} posts`);

        // إضافة تعليقات وإعجابات عشوائية
        for (const post of createdPosts) {
            // إضافة إعجابات عشوائية
            const randomLikes = createdUsers
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.floor(Math.random() * createdUsers.length));
            
            for (const user of randomLikes) {
                post.likes.push({ user: user._id });
            }

            // إضافة تعليقات عشوائية
            const commentUsers = createdUsers
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.floor(Math.random() * 3));
            
            for (const user of commentUsers) {
                post.comments.push({
                    user: user._id,
                    content: `تعليق رائع من ${user.firstName}! 👏`
                });
            }

            await post.save();
        }

        console.log('✅ Added random likes and comments');

        // إضافة أصدقاء عشوائيين
        for (const user of createdUsers) {
            const otherUsers = createdUsers.filter(u => u._id.toString() !== user._id.toString());
            const randomFriends = otherUsers
                .sort(() => 0.5 - Math.random())
                .slice(0, Math.floor(Math.random() * otherUsers.length));
            
            user.friends = randomFriends.map(friend => friend._id);
            await user.save();
        }

        console.log('✅ Added random friends');

        console.log('\n🎉 Seeding completed successfully!');
        console.log('\n📧 بيانات الاختبار:');
        console.log('البريد الإلكتروني: test@example.com');
        console.log('كلمة المرور: 123456');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
}

// تشغيل seeding إذا تم استدعاء الملف مباشرة
if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;