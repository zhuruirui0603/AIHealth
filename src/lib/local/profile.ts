/**
 * 用户画像：localStorage 持久化，用户可手动编辑
 *
 * 默认值取自 knowledge-bundle.json（与后端种子数据一致）。
 * 用户设置后存 localStorage，刷新不丢失。
 */

import bundle from "@/data/knowledge-bundle.json";

export interface UserProfileData {
  age: number;
  sex: string;
  height: number;
  weight: number;
  goal: string;
  activityLevel: string;
  workSchedule: string;
  dietPreference: string;
  foodPreferences: string; // 逗号分隔的字符串（如"喜欢吃辣, 不喜欢香菜"）
  allergies: string; // 逗号分隔的字符串（如"无" 或 "花生, 海鲜"）
}

const STORAGE_KEY = "nutrihealth_user_profile";

/** bundle 中的默认画像（用户未设置时使用） */
const p = bundle.profile as any;
export const defaultProfile: UserProfileData = {
  age: p.age,
  sex: p.sex,
  height: p.height,
  weight: p.weight,
  goal: p.goal,
  activityLevel: p.activityLevel ?? p.activity_level,
  workSchedule: p.workSchedule ?? p.work_schedule,
  dietPreference: p.dietPreference ?? p.diet_preference,
  // bundle 中是 JSON 数组字符串，转为逗号分隔方便用户编辑
  foodPreferences: arrayToCsv(p.foodPreferences ?? p.food_preferences),
  allergies: arrayToCsv(p.allergies),
};

/** JSON 数组字符串 → 逗号分隔文本 */
function arrayToCsv(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(", ") : raw;
  } catch {
    return raw;
  }
}

/** 读取用户画像（localStorage 优先，fallback 到默认值） */
export function getProfile(): UserProfileData {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile;
    const saved = JSON.parse(raw);
    return { ...defaultProfile, ...saved };
  } catch {
    return defaultProfile;
  }
}

/** 保存用户画像到 localStorage */
export function setProfile(profile: UserProfileData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** 重置为默认画像 */
export function resetProfile(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
