import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, MapPin, MessageCircle, Heart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">FF</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">
              FriendFinder
            </span>
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Connect with
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}
              Friends{" "}
            </span>
            Around You
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover and connect with people nearby using GPS, WiFi, and
            Bluetooth. Chat, make calls, and build meaningful relationships in
            your area.
          </p>
          <div className="space-x-4">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-3"
              >
                Start Connecting
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Location-Based Discovery
            </h3>
            <p className="text-gray-600">
              Find friends using GPS, WiFi, and Bluetooth proximity detection.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Real-time Messaging
            </h3>
            <p className="text-gray-600">
              Chat instantly with friends and groups with live notifications.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Video & Voice Calls
            </h3>
            <p className="text-gray-600">
              Make high-quality calls with built-in WebRTC technology.
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Smart Matching
            </h3>
            <p className="text-gray-600">
              Connect with people who share your interests and hobbies.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Find Your Community?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of people already connecting through FriendFinder
          </p>
          <Link href="/register">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              Get Started for Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-24">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">FF</span>
            </div>
            <span className="text-gray-600">
              © 2025 FriendFinder. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
