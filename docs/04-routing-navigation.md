# Routing & Navigation

## Table of Contents

1. [Introduction](#introduction)
2. [File-Based Routing System](#file-based-routing-system)
3. [Route Grouping with (auth)](#route-grouping-with-auth)
4. [Layout Nesting and Structure](#layout-nesting-and-structure)
5. [Middleware and Authentication Flow](#middleware-and-authentication-flow)
6. [Dashboard Navigation System](#dashboard-navigation-system)
7. [Dynamic Routes Implementation](#dynamic-routes-implementation)
8. [Loading and Error State Management](#loading-and-error-state-management)
9. [Adding New Routes](#adding-new-routes)

## Introduction

The FriendFinder application implements a robust routing and navigation system using Next.js App Router. This documentation provides a comprehensive overview of the routing architecture, navigation patterns, and implementation details.

The routing system is designed to provide seamless navigation between different sections of the application while maintaining proper authentication, authorization, and user experience patterns. The implementation leverages Next.js 15's advanced App Router features including nested layouts, route groups, and middleware integration.

## File-Based Routing System

FriendFinder uses Next.js App Router's file-based routing system where the file structure directly maps to the application's URL structure. The routing architecture is organized in the `src/app` directory:

```
src/app/
├── (auth)/                    # Route group for authentication pages
│   ├── login/                 # /login route
│   ├── register/              # /register route
│   └── layout.tsx             # Auth-specific layout
├── dashboard/                 # /dashboard route
│   ├── messages/              # /dashboard/messages
│   ├── friends/               # /dashboard/friends
│   ├── calls/                 # /dashboard/calls
│   ├── discover/              # /dashboard/discover
│   ├── random-chat/           # /dashboard/random-chat
│   └── layout.tsx             # Dashboard layout with navigation
├── api/                       # API routes
├── globals.css                # Global styles
├── layout.tsx                 # Root layout
└── page.tsx                   # Home page (/)
```

### Route Segments

- **Static Segments**: Fixed path segments like `/dashboard/messages`
- **Dynamic Segments**: Variable segments using `[param]` syntax
- **Route Groups**: Organizational folders using `(name)` syntax
- **Parallel Routes**: Multiple pages rendered simultaneously using `@folder`

## Route Grouping with (auth)

The authentication routes are organized using route groups to share layouts and logic without affecting the URL structure:

```typescript
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">FriendFinder</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Benefits of Route Grouping

- **Shared Layouts**: Common UI elements for related pages
- **Middleware Organization**: Group-specific middleware logic
- **Code Organization**: Logical separation without URL impact
- **Layout Nesting**: Hierarchical layout composition

## Layout Nesting and Structure

The application uses a nested layout system that provides consistent UI elements while allowing page-specific content:

### Root Layout

```typescript
// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
```

### Dashboard Layout

```typescript
// src/app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

## Middleware and Authentication Flow

The routing system integrates with NextAuth.js middleware to protect authenticated routes:

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic
    const pathname = req.nextUrl.pathname;

    // Redirect authenticated users away from auth pages
    if (pathname.startsWith("/(auth)") && req.nextauth.token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to auth pages without token
        if (pathname.startsWith("/(auth)")) {
          return true;
        }

        // Require token for dashboard routes
        if (pathname.startsWith("/dashboard")) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

## Dashboard Navigation System

The dashboard implements a comprehensive navigation system with active state management and responsive design:

### Navigation Component

```typescript
// src/components/navigation/Sidebar.tsx
const navigationItems = [
  { href: "/dashboard/messages", label: "Messages", icon: MessageCircle },
  { href: "/dashboard/friends", label: "Friends", icon: Users },
  { href: "/dashboard/calls", label: "Calls", icon: Phone },
  { href: "/dashboard/discover", label: "Discover", icon: MapPin },
  { href: "/dashboard/random-chat", label: "Random Chat", icon: Shuffle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <nav className="mt-8">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-6 py-3 text-sm font-medium",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Mobile Navigation

```typescript
// Mobile-responsive navigation with drawer
export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <nav className="mt-6">
          {navigationItems.map((item) => (
            <MobileNavItem key={item.href} {...item} />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

## Dynamic Routes Implementation

The application uses dynamic routes for user-specific content and parameterized pages:

### User Profile Routes

```
src/app/dashboard/friends/[userId]/
├── page.tsx              # /dashboard/friends/[userId]
├── messages/
│   └── page.tsx          # /dashboard/friends/[userId]/messages
└── loading.tsx           # Loading UI
```

### Implementation Example

```typescript
// src/app/dashboard/friends/[userId]/page.tsx
interface UserProfilePageProps {
  params: {
    userId: string;
  };
  searchParams: {
    tab?: string;
  };
}

export default async function UserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const user = await getUserById(params.userId);
  const activeTab = searchParams.tab || "profile";

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <UserHeader user={user} />
      <UserTabs activeTab={activeTab} userId={params.userId} />
    </div>
  );
}
```

## Loading and Error State Management

The routing system implements comprehensive loading and error states:

### Loading States

```typescript
// src/app/dashboard/messages/loading.tsx
export default function MessagesLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
```

### Error Boundaries

```typescript
// src/app/dashboard/error.tsx
"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Something went wrong!
        </h2>
        <p className="mt-2 text-gray-600">
          We encountered an error while loading this page.
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}
```

## Adding New Routes

To add new routes to the FriendFinder application:

### 1. Create Route Directory

```bash
mkdir src/app/dashboard/new-feature
```

### 2. Add Page Component

```typescript
// src/app/dashboard/new-feature/page.tsx
export default function NewFeaturePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Feature</h1>
      </div>
      {/* Page content */}
    </div>
  );
}
```

### 3. Update Navigation

```typescript
// Add to navigationItems array
{
  href: '/dashboard/new-feature',
  label: 'New Feature',
  icon: Star
}
```

### 4. Add Loading and Error States

```typescript
// src/app/dashboard/new-feature/loading.tsx
export default function NewFeatureLoading() {
  return <LoadingSkeleton />;
}

// src/app/dashboard/new-feature/error.tsx
export default function NewFeatureError({ error, reset }) {
  return <ErrorComponent error={error} reset={reset} />;
}
```

### 5. Configure Metadata

```typescript
// src/app/dashboard/new-feature/page.tsx
export const metadata: Metadata = {
  title: "New Feature - FriendFinder",
  description: "Description of the new feature",
};
```

---

_This routing and navigation system provides a solid foundation for the FriendFinder application, ensuring proper organization, performance, and user experience across all routes._
