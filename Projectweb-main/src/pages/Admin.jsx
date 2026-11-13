import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

const PAGE = 50;

// หน้าจัดการระบบ: เข้าได้เฉพาะแอดมิน (คนอื่นถูกพากลับหน้าแรก)
// การป้องกันจริงอยู่ที่ Backend ทุก endpoint /api/admin/* เช็กสิทธิ์จากฐานข้อมูลอีกชั้น
export default function Admin() {
  const { member, token, loading } = useAuth();
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);

  function notify(text, bad = false) {
    setToast({ text, bad });
    setTimeout(() => setToast(null), 3500);
  }

  if (loading) return <p className="muted">กำลังตรวจสอบสิทธิ์…</p>;
  if (!member) return <Navigate to="/login" replace />;
  if ((member.role ?? member.Role) !== 'admin') return <Navigate to="/" replace />;

  const tabs = [
    ['overview', 'ภาพรวม'],
    ['manga', 'จัดการมังงะ'],
    ['members', 'จัดการสมาชิก'],
  ];

  return (
    <>
      <h1>จัดการระบบ</h1>
      <div className="admin-tabs">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview token={token} notify={notify} />}
      {tab === 'manga' && <MangaTab token={token} notify={notify} />}
      {tab === 'members' && <MembersTab token={token} notify={notify} me={member} />}

      {toast && <div className={`admin-toast${toast.bad ? ' bad' : ''}`}>{toast.text}</div>}
    </>
  );
}

function Overview({ token, notify }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  function load() {
    api('/api/admin/stats', { token })
      .then(setStats)
      .catch((e) => setError(e.message));
  }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sync() {
    setSyncing(true);
    try {
      const r = await api('/api/admin/sync', { method: 'POST', token });
      notify(`ดึงมังงะจาก MangaDex ${r.synced} เรื่อง`);
      load();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      {error && <p className="error">{error}</p>}
      <div className="admin-stats">
        <div><b>{stats ? stats.mangas : '–'}</b><span>มังงะ</span></div>
        <div><b>{stats ? stats.members : '–'}</b><span>สมาชิก</span></div>
        <div><b>{stats ? stats.chapters : '–'}</b><span>ตอน</span></div>
      </div>
      <section className="admin-panel">
        <h2>เครื่องมือ</h2>
        <p className="muted">ดึงมังงะยอดนิยม 100 เรื่องจาก MangaDex เข้าฐานข้อมูล (เรื่องที่เคยลบไปแล้วจะไม่ถูกดึงกลับมา)</p>
        <button type="button" className="primary" onClick={sync} disabled={syncing}>
          {syncing ? 'กำลังดึงข้อมูล…' : 'ดึงมังงะยอดนิยมจาก MangaDex'}
        </button>
      </section>
    </>
  );
}

const EMPTY_FORM = {
  title: '',
  title_th: '',
  cover_url: '',
  original_language: '',
  content_rating: '',
  description: '',
};

function MangaTab({ token, notify }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState({ status: 'loading', items: [], error: '' });

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);

  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let alive = true;
    setList((l) => ({ ...l, status: 'loading' }));
    api(`/api/manga?q=${encodeURIComponent(query)}&limit=${PAGE}&offset=${offset}`)
      .then((d) => alive && setList({ status: 'ok', items: d.items || [], error: '' }))
      .catch((e) => alive && setList({ status: 'error', items: [], error: e.message }));
    return () => {
      alive = false;
    };
  }, [query, offset, reloadKey]);

  const reload = () => setReloadKey((n) => n + 1);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function addManga(e) {
    e.preventDefault();
    setFormError('');
    setAdding(true);
    try {
      const m = await api('/api/admin/manga', { method: 'POST', body: form, token });
      notify(`เพิ่ม "${m.title}" แล้ว`);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function importManga(e) {
    e.preventDefault();
    setImporting(true);
    try {
      const m = await api('/api/admin/manga/import', { method: 'POST', body: { mangadex_id: importText }, token });
      notify(`นำเข้า "${m.title}" แล้ว`);
      setImportText('');
      reload();
    } catch (err) {
      notify(err.message, true);
    } finally {
      setImporting(false);
    }
  }

  async function remove(m) {
    if (!window.confirm(`ลบ "${m.title}" ?\nตอนและบุ๊กมาร์กของเรื่องนี้จะถูกลบด้วย`)) return;
    try {
      await api(`/api/admin/manga/${encodeURIComponent(m.id)}`, { method: 'DELETE', token });
      notify('ลบแล้ว');
      reload();
    } catch (err) {
      notify(err.message, true);
    }
  }

  return (
    <>
      <section className="admin-panel">
        <h2>เพิ่มมังงะ</h2>
        <form className="admin-form" onSubmit={addManga}>
          <label>ชื่อเรื่อง *
            <input value={form.title} onChange={set('title')} maxLength={300} required />
          </label>
          <label>ชื่อภาษาไทย
            <input value={form.title_th} onChange={set('title_th')} maxLength={300} />
          </label>
          <label>ลิงก์รูปปก (https://…)
            <input type="url" value={form.cover_url} onChange={set('cover_url')} />
          </label>
          <label>ภาษาต้นฉบับ (เช่น ja)
            <input value={form.original_language} onChange={set('original_language')} maxLength={10} />
          </label>
          <label>เรตติ้งเนื้อหา
            <select value={form.content_rating} onChange={set('content_rating')}>
              <option value="">— ไม่ระบุ —</option>
              <option value="safe">safe</option>
              <option value="suggestive">suggestive</option>
              <option value="erotica">erotica</option>
              <option value="pornographic">pornographic</option>
            </select>
          </label>
          <label className="full">เรื่องย่อ
            <textarea rows={3} value={form.description} onChange={set('description')} />
          </label>
          {formError && <p className="error full">{formError}</p>}
          <div className="full">
            <button type="submit" className="primary" disabled={adding}>
              {adding ? 'กำลังเพิ่ม…' : 'เพิ่มมังงะ'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-panel">
        <h2>นำเข้าจาก MangaDex</h2>
        <form className="toolbar" onSubmit={importManga}>
          <input
            style={{ flex: 1, minWidth: 240 }}
            placeholder="วาง MangaDex id หรือลิงก์ เช่น https://mangadex.org/title/…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            required
          />
          <button type="submit" className="primary" disabled={importing}>
            {importing ? 'กำลังนำเข้า…' : 'นำเข้า'}
          </button>
        </form>
      </section>

      <section className="admin-panel">
        <h2>รายการมังงะในฐานข้อมูล</h2>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            setOffset(0);
            setQuery(q.trim());
          }}
        >
          <input
            type="search"
            style={{ flex: 1, minWidth: 200 }}
            placeholder="ค้นหาชื่อมังงะ…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="primary">ค้นหา</button>
        </form>

        {list.status === 'loading' && <p className="muted">กำลังโหลด…</p>}
        {list.status === 'error' && <p className="error">โหลดไม่สำเร็จ: {list.error}</p>}
        {list.status === 'ok' && list.items.length === 0 && <p className="muted">ไม่พบมังงะ</p>}
        {list.items.length > 0 && (
          <div className="admin-scroll">
            <table className="admin-table">
              <thead>
                <tr><th>ปก</th><th>ชื่อเรื่อง</th><th>id</th><th /></tr>
              </thead>
              <tbody>
                {list.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {m.cover_url && <img src={m.cover_url} alt="" loading="lazy" referrerPolicy="no-referrer" />}
                    </td>
                    <td>
                      <div>{m.title}</div>
                      {m.title_th && <div className="muted">{m.title_th}</div>}
                    </td>
                    <td className="muted">{m.id.slice(0, 8)}</td>
                    <td><button type="button" className="danger" onClick={() => remove(m)}>ลบ</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="toolbar" style={{ marginTop: 12, alignItems: 'center' }}>
          <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>← ก่อนหน้า</button>
          <span className="muted">หน้า {offset / PAGE + 1}</span>
          <button type="button" disabled={list.items.length < PAGE} onClick={() => setOffset(offset + PAGE)}>ถัดไป →</button>
        </div>
      </section>
    </>
  );
}

function MembersTab({ token, notify, me }) {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState({ status: 'loading', items: [], error: '' });

  useEffect(() => {
    let alive = true;
    setList((l) => ({ ...l, status: 'loading' }));
    api(`/api/admin/members?q=${encodeURIComponent(query)}`, { token })
      .then((d) => alive && setList({ status: 'ok', items: d.items || [], error: '' }))
      .catch((e) => alive && setList({ status: 'error', items: [], error: e.message }));
    return () => {
      alive = false;
    };
  }, [query, reloadKey, token]);

  const reload = () => setReloadKey((n) => n + 1);

  async function changeRole(m, role) {
    try {
      await api(`/api/admin/members/${m.id}/role`, { method: 'PUT', body: { role }, token });
      notify('เปลี่ยนสิทธิ์แล้ว');
    } catch (err) {
      notify(err.message, true);
    }
    reload();
  }

  async function remove(m) {
    if (!window.confirm(`ลบสมาชิก ${m.email} ?\nบุ๊กมาร์กของสมาชิกคนนี้จะถูกลบด้วย`)) return;
    try {
      await api(`/api/admin/members/${m.id}`, { method: 'DELETE', token });
      notify('ลบแล้ว');
      reload();
    } catch (err) {
      notify(err.message, true);
    }
  }

  return (
    <section className="admin-panel">
      <h2>จัดการสมาชิก</h2>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <input
          type="search"
          style={{ flex: 1, minWidth: 200 }}
          placeholder="ค้นหาอีเมลหรือชื่อ…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="primary">ค้นหา</button>
      </form>

      {list.status === 'loading' && <p className="muted">กำลังโหลด…</p>}
      {list.status === 'error' && <p className="error">โหลดไม่สำเร็จ: {list.error}</p>}
      {list.status === 'ok' && list.items.length === 0 && <p className="muted">ไม่พบสมาชิก</p>}
      {list.items.length > 0 && (
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr><th>id</th><th>ชื่อ</th><th>อีเมล</th><th>สิทธิ์</th><th /></tr>
            </thead>
            <tbody>
              {list.items.map((m) => {
                const self = m.id === me.id;
                return (
                  <tr key={m.id}>
                    <td className="muted">{m.id}</td>
                    <td>{m.display_name}{self && <span className="muted"> (คุณ)</span>}</td>
                    <td>{m.email}</td>
                    <td>
                      <select value={m.role} disabled={self} onChange={(e) => changeRole(m, e.target.value)}>
                        <option value="member">สมาชิก</option>
                        <option value="admin">แอดมิน</option>
                      </select>
                    </td>
                    <td>
                      <button type="button" className="danger" disabled={self} onClick={() => remove(m)}>ลบ</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
