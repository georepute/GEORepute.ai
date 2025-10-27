"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function TestDB() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from("user").select("*");

        if (error) {
          setError(error.message);
        } else {
          setUsers(data || []);
        }
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>

        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-600">Testing connection...</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 font-semibold mb-2">❌ Error:</p>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600 font-semibold mb-4">
              ✅ Connected to Supabase!
            </p>
            {users.length > 0 ? (
              <div>
                <p className="text-gray-700 mb-3">
                  Found {users.length} user(s) in database:
                </p>
                <pre className="bg-white p-4 rounded border border-gray-300 overflow-auto text-sm">
                  {JSON.stringify(users, null, 2)}
                </pre>
              </div>
            ) : (
              <p className="text-gray-600">
                No users found yet (this is normal if you just set up the
                database)
              </p>
            )}
          </div>
        )}

        <div className="mt-8">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login Page
          </a>
        </div>
      </div>
    </div>
  );
}

