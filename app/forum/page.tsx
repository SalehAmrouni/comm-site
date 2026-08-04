'use client'

export default function ForumPage() {
  const categories = [
    { name: 'General Discussion', description: 'Talk about Commissioners gameplay and strategies.', threads: 12, posts: 48 },
    { name: 'Modding & Custom Content', description: 'Technical discussion on creating mods and custom assets.', threads: 8, posts: 29 },
    { name: 'Bug Reports & Feedback', description: 'Found a bug? Report it to the developer here.', threads: 5, posts: 14 },
  ]

  return (
    <div className="space-y-6">
      <div className="border-b-4 border-white pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase">COMMISSIONERS FORUM BOARD</h1>
          <p className="text-xs text-neutral-400 uppercase mt-1">Public forum - Account required to create threads</p>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat, index) => (
          <div key={index} className="border-4 border-white bg-black p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black uppercase text-white hover:underline cursor-pointer">
                # {cat.name}
              </h2>
              <p className="text-xs text-neutral-400">{cat.description}</p>
            </div>
            <div className="flex gap-4 text-xs font-bold uppercase border-t-2 md:border-t-0 md:border-l-2 border-white pt-2 md:pt-0 md:pl-4 w-full md:w-auto">
              <div>THREADS: {cat.threads}</div>
              <div>POSTS: {cat.posts}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}