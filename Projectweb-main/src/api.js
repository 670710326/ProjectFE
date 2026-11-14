// ถ้าไม่ตั้ง VITE_API_URL จะเรียก /api บนโดเมนเดียวกัน (ใช้ proxy ของ Vite หรือ rewrite ของ Vercel)
const API = import.meta.env.VITE_API_URL || '';

export async function api(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง');
  }

  if (res.status === 204) return null;

  // อ่านเป็นข้อความก่อน เพราะ body อาจว่างหรือไม่ใช่ JSON
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || `เซิร์ฟเวอร์ตอบกลับ ${res.status}`);
  }

  if (data === null) {
    throw new Error('เซิร์ฟเวอร์ไม่ตอบกลับข้อมูล (Backend อาจไม่ทำงาน)');
  }

  return data;
}