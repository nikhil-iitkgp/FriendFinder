import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-white text-2xl font-bold">FF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FriendFinder
          </h1>
          <p className="text-gray-600">Connect with friends around you</p>
        </div>
        {children}
      </div>
    </div>
  );
}
