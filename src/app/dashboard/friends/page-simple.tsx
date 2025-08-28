"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FriendsPage() {
  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Friends page is loading...</p>
        </CardContent>
      </Card>
    </div>
  );
}
