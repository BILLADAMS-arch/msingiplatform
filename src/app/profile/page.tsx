"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/shell";
import { StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Flame, Star, Layers, Trophy, LogOut } from "lucide-react";

type ProgressResponse = {
  profile: { name: string; xp: number; streak: number; goal: string | null; leaderboardOptOut: boolean } | null;
  achievements: { unlocked: { code: string; label: string; icon: string }[]; all: { code: string; label: string; icon: string }[] };
};

const LEVELS = ["Beginner", "Explorer", "Learner", "Scholar", "Expert", "Master"];
function levelForXP(xp: number) { return LEVELS[Math.min(LEVELS.length - 1, Math.floor(xp / 500))]; }

const GOALS = ["Improve my grades", "Prepare for exams", "Practise every day", "Master difficult topics", "Explore new subjects"];

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saved, setSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/progress/me").then((r) => r.json()).then((d: ProgressResponse) => {
      setData(d);
      setName(d.profile?.name ?? "");
      setGoal(d.profile?.goal ?? "");
      setLeaderboardOptOut(d.profile?.leaderboardOptOut ?? false);
    });
  }, []);

  async function saveProfile() {
    setSavingProfile(true); setSaved(false);
    await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, goal, leaderboardOptOut }),
    });
    setSavingProfile(false); setSaved(true);
  }

  async function changePassword() {
    setPasswordStatus(null);
    if (newPassword.length < 8) { setPasswordStatus("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordStatus("Passwords don't match."); return; }
    setChangingPassword(true);
    const { error } = await createClient().auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    setPasswordStatus(error ? error.message : "Password updated.");
    if (!error) { setNewPassword(""); setConfirmPassword(""); }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <Shell name={data?.profile?.name} xp={data?.profile?.xp} streak={data?.profile?.streak}>
      <div className="fade-in max-w-2xl mx-auto space-y-6">
        <h1 className="disp text-2xl font-bold">My Profile</h1>

        {!data ? <p className="text-sm text-[--ink-soft]">Loading…</p> : (
          <>
            <div className="brick bg-white rounded-2xl p-5 border flex items-center gap-4" style={{ borderColor: "var(--slate)" }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center disp font-bold text-white text-2xl" style={{ background: "var(--green)" }}>
                {data.profile?.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div className="disp font-bold text-lg">{data.profile?.name}</div>
                <div className="text-sm text-[--ink-soft]">{levelForXP(data.profile?.xp ?? 0)}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<Star size={18} />} label="XP" value={data.profile?.xp ?? 0} tone="gold" />
              <StatCard icon={<Flame size={18} />} label="Streak" value={`${data.profile?.streak ?? 1}d`} tone="coral" />
              <StatCard icon={<Trophy size={18} />} label="Achievements" value={data.achievements.unlocked.length} tone="green" />
            </div>

            <div className="brick bg-white rounded-2xl p-5 border" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold mb-3 flex items-center gap-2"><Layers size={16} /> Achievements</h3>
              <div className="flex flex-wrap gap-3">
                {data.achievements.all.map((a) => {
                  const unlocked = data.achievements.unlocked.some((u) => u.code === a.code);
                  return (
                    <div key={a.code} className={`w-16 text-center ${unlocked ? "" : "opacity-30"}`}>
                      <div className="text-2xl">{a.icon}</div>
                      <div className="text-[10px] font-medium mt-1">{a.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="brick bg-white rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold">Edit Profile</h3>
              <div>
                <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[--ink-soft] block mb-1">Goal</label>
                <select value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }}>
                  {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={leaderboardOptOut} onChange={(e) => setLeaderboardOptOut(e.target.checked)} />
                Hide me from leaderboards
              </label>
              <button disabled={savingProfile} onClick={saveProfile} className="tap px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
                {savingProfile ? "Saving…" : "Save changes"}
              </button>
              {saved && <span className="text-xs text-[--green] ml-3">Saved.</span>}
            </div>

            <div className="brick bg-white rounded-2xl p-5 border space-y-3" style={{ borderColor: "var(--slate)" }}>
              <h3 className="disp font-bold">Change Password</h3>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 8 characters)"
                className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
                className="w-full border rounded-xl px-3 py-2 text-sm" style={{ borderColor: "var(--slate)" }} />
              {passwordStatus && <p className="text-sm text-[--ink-soft]">{passwordStatus}</p>}
              <button disabled={changingPassword || !newPassword} onClick={changePassword} className="tap px-5 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50" style={{ background: "var(--ink)" }}>
                {changingPassword ? "Updating…" : "Update Password"}
              </button>
            </div>

            <button onClick={signOut} className="tap flex items-center gap-2 text-sm font-semibold text-[--coral]"><LogOut size={16} /> Sign out</button>
          </>
        )}
      </div>
    </Shell>
  );
}
