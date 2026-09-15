import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

const LEVEL_GRADES = {
  primary: [1, 2, 3, 4, 5],
  secondary: [6, 7, 8, 9],
  highschool: [10, 11, 12]
};

const ROUNDS = [
  { key: 'warmup', label: 'Khởi động' },
  { key: 'obstacle', label: 'Vượt chướng ngại vật' },
  { key: 'acceleration', label: 'Tăng tốc' },
  { key: 'finish', label: 'Về đích' }
];

export default function Admin() {
  const [level, setLevel] = useState('primary');
  const [grade, setGrade] = useState(1);
  const [round, setRound] = useState('warmup');
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm('warmup'));
  const [editingId, setEditingId] = useState(null);

  async function refresh() {
    const res = await fetch(`${API_URL}/api/questions/${level}/${grade}/${round}`);
    const json = await res.json();
    setData(json);
  }

  useEffect(() => {
    refresh();
    setForm(emptyForm(round));
    setEditingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, grade, round]);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = buildPayload(round, form);
    if (editingId) {
      await fetch(`${API_URL}/api/questions/${level}/${grade}/${round}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch(`${API_URL}/api/questions/${level}/${grade}/${round}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    setForm(emptyForm(round));
    setEditingId(null);
    refresh();
  }

  async function handleDelete(id) {
    await fetch(`${API_URL}/api/questions/${level}/${grade}/${round}/${id}`, { method: 'DELETE' });
    refresh();
  }

  function startEdit(q) {
    setEditingId(q.id);
    setForm(round === 'obstacle' ? { ...q } : { ...q, options: (q.options || []).join(', ') });
  }

  const list = round === 'obstacle' ? (data ? [data].filter(Boolean) : []) : data || [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-olympia-navy">Quản trị ngân hàng câu hỏi</h1>
          <Link to="/" className="text-sm text-olympia-blue underline">
            ← Về trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <select
            className="border rounded-lg px-3 py-2"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setGrade(LEVEL_GRADES[e.target.value][0]);
            }}
          >
            {Object.keys(LEVEL_GRADES).map((lv) => (
              <option key={lv} value={lv}>
                {lv}
              </option>
            ))}
          </select>
          <select className="border rounded-lg px-3 py-2" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
            {LEVEL_GRADES[level].map((g) => (
              <option key={g} value={g}>
                Lớp {g}
              </option>
            ))}
          </select>
          <select className="border rounded-lg px-3 py-2" value={round} onChange={(e) => setRound(e.target.value)}>
            {ROUNDS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">{editingId ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'}</h2>
            <QuestionForm round={round} form={form} setForm={setForm} onSubmit={handleSubmit} editingId={editingId} onCancel={() => { setForm(emptyForm(round)); setEditingId(null); }} />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold mb-3">Danh sách hiện có</h2>
            <ul className="space-y-2 max-h-[28rem] overflow-y-auto">
              {list.length === 0 && <p className="text-sm text-slate-400">Chưa có dữ liệu.</p>}
              {round === 'obstacle'
                ? list.map((puzzle) => (
                    <li key={puzzle.id} className="border rounded-lg p-3">
                      <p className="font-medium">{puzzle.secretPhrase}</p>
                      <p className="text-xs text-slate-500">{puzzle.rows.length} hàng ngang</p>
                      <div className="mt-2 flex gap-2">
                        <button className="text-xs text-olympia-blue underline" onClick={() => startEdit(puzzle)}>
                          Sửa
                        </button>
                        <button className="text-xs text-olympia-red underline" onClick={() => handleDelete(puzzle.id)}>
                          Xóa
                        </button>
                      </div>
                    </li>
                  ))
                : list.map((q) => (
                    <li key={q.id} className="border rounded-lg p-3">
                      <p className="font-medium text-sm">{q.text}</p>
                      <p className="text-xs text-slate-500">Đáp án: {q.answer} {q.points ? `• ${q.points}đ` : ''}</p>
                      <div className="mt-2 flex gap-2">
                        <button className="text-xs text-olympia-blue underline" onClick={() => startEdit(q)}>
                          Sửa
                        </button>
                        <button className="text-xs text-olympia-red underline" onClick={() => handleDelete(q.id)}>
                          Xóa
                        </button>
                      </div>
                    </li>
                  ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function emptyForm(round) {
  if (round === 'obstacle') return { secretPhrase: '', imageHint: '', rows: [{ id: '', clue: '', answer: '' }] };
  if (round === 'acceleration') return { text: '', options: '', answer: '', timeLimitSeconds: 20 };
  if (round === 'finish') return { text: '', answer: '', points: 10 };
  return { text: '', answer: '' };
}

function buildPayload(round, form) {
  if (round === 'acceleration') {
    return { ...form, options: form.options.split(',').map((s) => s.trim()).filter(Boolean) };
  }
  if (round === 'finish') {
    return { ...form, points: Number(form.points) };
  }
  return form;
}

function QuestionForm({ round, form, setForm, onSubmit, editingId, onCancel }) {
  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (round === 'obstacle') {
    return (
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Từ khóa bí mật">
          <input className="input" value={form.secretPhrase} onChange={(e) => update('secretPhrase', e.target.value)} required />
        </Field>
        <Field label="Gợi ý hình ảnh">
          <input className="input" value={form.imageHint || ''} onChange={(e) => update('imageHint', e.target.value)} />
        </Field>
        <p className="text-xs text-slate-500">
          Ghi chú: chỉnh sửa chi tiết từng hàng ngang trực tiếp trong tệp questions.json để đầy đủ 5 hàng; biểu mẫu này tạo bản ghi cơ bản.
        </p>
        <FormActions editingId={editingId} onCancel={onCancel} />
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Nội dung câu hỏi">
        <textarea className="input" rows={2} value={form.text} onChange={(e) => update('text', e.target.value)} required />
      </Field>
      {round === 'acceleration' && (
        <Field label="Các phương án (cách nhau bởi dấu phẩy)">
          <input className="input" value={form.options} onChange={(e) => update('options', e.target.value)} placeholder="A, B, C, D" />
        </Field>
      )}
      <Field label="Đáp án đúng">
        <input className="input" value={form.answer} onChange={(e) => update('answer', e.target.value)} required />
      </Field>
      {round === 'acceleration' && (
        <Field label="Thời gian (giây)">
          <input type="number" className="input" value={form.timeLimitSeconds} onChange={(e) => update('timeLimitSeconds', Number(e.target.value))} />
        </Field>
      )}
      {round === 'finish' && (
        <Field label="Gói điểm">
          <select className="input" value={form.points} onChange={(e) => update('points', e.target.value)}>
            <option value={10}>10 điểm</option>
            <option value={20}>20 điểm</option>
            <option value={30}>30 điểm</option>
          </select>
        </Field>
      )}
      <FormActions editingId={editingId} onCancel={onCancel} />
    </form>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function FormActions({ editingId, onCancel }) {
  return (
    <div className="flex gap-2 pt-2">
      <button className="olympia-btn-primary text-sm" type="submit">
        {editingId ? 'Lưu thay đổi' : 'Thêm câu hỏi'}
      </button>
      {editingId && (
        <button type="button" className="olympia-btn-secondary text-sm" onClick={onCancel}>
          Hủy
        </button>
      )}
    </div>
  );
}
