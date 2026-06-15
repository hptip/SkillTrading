import { useState, useEffect } from 'react';
import { skillsApi, uploadsApi } from '../lib/api';
import { AvailabilitySlot, Skill } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Plus, Edit, Trash2, Coins, BookOpen, AlertCircle, Image as ImageIcon, Clock3 } from 'lucide-react';

const CATEGORIES = ['Programming', 'Language', 'Music', 'Design', 'Math', 'Science', 'Sports', 'Cooking', 'Business', 'Art', 'Other'];
const WEEK_DAYS = [
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '7', label: 'Chủ nhật' },
];
const SLOT_TIMES = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '19:00', '20:00'];

const defaultForm = {
  title: '',
  description: '',
  category: 'Programming',
  price: 50,
  coverImage: '',
  galleryImages: [] as string[],
  availabilitySlots: [] as AvailabilitySlot[],
  isPublished: false,
};

export const MySkillsPage = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [deleteModal, setDeleteModal] = useState<Skill | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await skillsApi.getMy();
      setSkills(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSkills(); }, []);

  const openCreate = () => {
    setEditingSkill(null);
    setForm({ ...defaultForm });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({
      title: skill.title,
      description: skill.description,
      category: skill.category,
      price: skill.price,
      coverImage: skill.coverImage || '',
      galleryImages: skill.galleryImages || [],
      availabilitySlots: skill.availabilitySlots || [],
      isPublished: Boolean(skill.isPublished),
    });
    setError('');
    setModalOpen(true);
  };

  const toggleSlot = (day: string, start: string) => {
    const end = `${String(Number(start.split(':')[0]) + 1).padStart(2, '0')}:${start.split(':')[1]}`;
    const label = `${WEEK_DAYS.find(w => w.value === day)?.label || 'Ngày'} — ${start}–${end}`;
    const existing = form.availabilitySlots.find((slot) => slot.day === day && slot.start === start);

    if (existing) {
      setForm((prev) => ({
        ...prev,
        availabilitySlots: prev.availabilitySlots.filter((slot) => !(slot.day === day && slot.start === start)),
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      availabilitySlots: [...prev.availabilitySlots, { day, start, end, label }],
    }));
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadsApi.uploadImages([file]);
      const [url] = res.data.urls || [];
      if (!url) throw new Error('Không nhận được URL ảnh');
      setForm((prev) => ({ ...prev, coverImage: url }));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể tải ảnh lên.';
      setError(message);
    }
  };

  const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const res = await uploadsApi.uploadImages(files);
      const urls = res.data.urls || [];
      setForm((prev) => ({ ...prev, galleryImages: [...prev.galleryImages, ...urls] }));
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Không thể tải ảnh lên.';
      setError(message);
    }
  };

  const handleSubmit = async () => {
    setError('');

    const title = form.title.trim();
    const description = form.description.trim();
    const category = form.category.trim();
    const price = Number(form.price);

    if (!title || !description || !category || !Number.isFinite(price)) {
      setError('Vui lòng điền đầy đủ thông tin khóa học.');
      return;
    }
    if (price < 30 || price > 300) {
      setError('Giá mỗi giờ phải từ 30 đến 300 SKC.');
      return;
    }
    if (form.availabilitySlots.length === 0) {
      setError('Vui lòng chọn ít nhất 1 khung giờ cố định cho khóa học.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        category,
        price,
        availabilitySlots: form.availabilitySlots,
        coverImage: form.coverImage || undefined,
        galleryImages: form.galleryImages,
        isPublished: form.isPublished,
      };
      if (editingSkill) {
        await skillsApi.update(editingSkill.id, payload);
      } else {
        await skillsApi.create(payload);
      }
      setModalOpen(false);
      await fetchSkills();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      const message = apiError?.response?.data?.message || apiError?.message || 'Không thể lưu khóa học. Vui lòng thử lại.';

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (skill: Skill) => {
    try {
      await skillsApi.delete(skill.id);
      setDeleteModal(null);
      fetchSkills();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cannot delete skill');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Khóa học của tôi</h1>
          <p className="text-gray-500 mt-1">Quản lý khóa học, ảnh giới thiệu và lịch học cố định</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Add Skill
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Phê duyệt khóa học:</strong> Khóa học mới cần admin duyệt trước khi hiển thị công khai. Bạn có thể sửa và gửi lại nếu bị từ chối.
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">No skills yet</p>
          <p className="text-sm text-gray-500 mb-4">Share your knowledge and earn SKC</p>
          <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
            Create Your First Skill
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map(skill => (
            <Card key={skill.id}>
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-3">
                  {statusBadge(skill.status)}
                  <div className="flex items-center gap-1 text-amber-600 font-semibold text-sm">
                    <Coins className="w-3.5 h-3.5" />
                    {skill.price}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{skill.title}</h3>
                <Badge variant="secondary" size="sm">{skill.category}</Badge>

                {skill.rejectReason && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                    <strong>Rejected:</strong> {skill.rejectReason}
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span>{(skill._count as { bookings: number } | undefined)?.bookings || 0} bookings</span>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(skill)}
                    icon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModal(skill)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSkill ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Tên khóa học"
            placeholder="Ví dụ: React.js cho người mới"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Mô tả khóa học"
            placeholder="Mô tả nội dung, lợi ích và mục tiêu học tập..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
          <Select
            label="Danh mục"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Giá mỗi giờ (SKC)
            </label>
            <input
              type="number"
              min={30}
              max={300}
              value={form.price}
              onChange={e => setForm({ ...form, price: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-400 mt-1">Phạm vi: 30 – 300 SKC</p>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-center gap-2 text-sm text-violet-700 mb-2"><Clock3 className="w-4 h-4" /> Khung giờ cố định theo tuần</div>
            <p className="text-xs text-violet-600 mb-3">Chọn các mốc 1 giờ cố định, hệ thống sẽ tự tạo lịch học cho từng tuần theo múi giờ Việt Nam.</p>
            <div className="space-y-3">{WEEK_DAYS.map(day => (
              <div key={day.value} className="rounded-xl border border-violet-100 bg-white p-3">
                <div className="text-sm font-semibold text-gray-800 mb-2">{day.label}</div>
                <div className="flex flex-wrap gap-2">{SLOT_TIMES.map(time => {
                  const end = `${String(Number(time.split(':')[0]) + 1).padStart(2, '0')}:${time.split(':')[1]}`;
                  const checked = form.availabilitySlots.some((slot) => slot.day === day.value && slot.start === time);
                  return (
                    <label key={`${day.value}-${time}`} className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs cursor-pointer ${checked ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200 hover:border-violet-200'}`}>
                      <input type="checkbox" className="mr-2 accent-violet-600" checked={checked} onChange={() => toggleSlot(day.value, time)} />
                      {time}–{end}
                    </label>
                  );
                })}</div>
              </div>
            ))}</div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><ImageIcon className="w-4 h-4" /> Ảnh giới thiệu khóa học</div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Ảnh bìa</label>
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-violet-700" />
              {form.coverImage && <img src={form.coverImage} alt="Cover preview" className="mt-3 h-28 w-full rounded-xl object-cover border border-gray-200" />}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Thư viện ảnh minh họa</label>
              <input type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-3 file:py-2 file:text-violet-700" />
              {form.galleryImages.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3">{form.galleryImages.map((img, index) => <div key={index} className="relative"><img src={img} alt="Gallery preview" className="h-20 w-full rounded-xl object-cover border border-gray-200" /><button type="button" onClick={() => setForm((prev) => ({ ...prev, galleryImages: prev.galleryImages.filter((_, i) => i !== index) }))} className="absolute top-1 right-1 rounded-full bg-red-500/90 text-white px-2 py-1 text-[10px]">Xóa</button></div>)}</div>}
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))} className="accent-violet-600" />
            Công khai khóa học ngay sau khi lưu
          </label>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting} className="flex-1">
              {editingSkill ? 'Cập nhật khóa học' : 'Gửi phê duyệt'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Xóa khóa học"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Are you sure you want to delete <strong>"{deleteModal?.title}"</strong>?</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setDeleteModal(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal)} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
