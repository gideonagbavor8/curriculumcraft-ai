"use client";

import { useState } from "react";
import { MapPin, Save, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTeacherProfile } from "@/lib/teacherProfile";
import LocationCascadeSelect from "@/components/location/LocationCascadeSelect";

export default function SettingsPage() {
  const { profile, setProfile } = useTeacherProfile();
  const [location, setLocation] = useState(() => ({
    region: profile.region ?? "",
    district: profile.district ?? "",
    community: profile.community ?? "",
    schoolName: profile.schoolName ?? "",
  }));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setProfile({
      region: location.region || undefined,
      district: location.district || undefined,
      community: location.community || undefined,
      schoolName: location.schoolName || undefined,
    });
    setSaved(true);
    toast.success("Location profile saved. Lessons will now use your local context.");
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
              Teacher Settings
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin size={22} />
            Your Location Profile
          </h1>
          <p className="text-green-100 text-sm mt-1">
            Optional. Saved on this device only. Used to ground generated lessons
            in your region instead of generic examples like Accra or Kumasi.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 space-y-4">
          <LocationCascadeSelect value={location} onChange={setLocation} />

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-all cursor-pointer"
          >
            {saved ? <><CheckCircle size={16} />Saved</> : <><Save size={16} />Save Location Profile</>}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            You can still pick a different region for a single lesson from the
            Lesson Builder page without changing this saved profile.
          </p>
        </div>
      </div>
    </div>
  );
}
