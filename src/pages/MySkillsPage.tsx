import { useState, useEffect } from 'react';
import { skillsApi } from '../lib/api';
import { Skill } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Badge, statusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Plus, Edit, Trash2, Coins, BookOpen, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Programming', 'Language', 'Music', 'Design', 'Math', 'Science', 'Sports', 'Cooking', 'Business', 'Art', 'Other'];

const defaultForm = { title: '', description: '', category: 'Programming', price: 50 };

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
    setForm(defaultForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setForm({ title: skill.title, description: skill.description, category: skill.category, price: skill.price });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.title || !form.description || !form.category || !form.price) {
      setError('All fields are required');
      return;
    }
    if (form.price < 30 || form.price > 300) {
      setError('Price must be between 30 and 300 SKC');
      return;
    }
    setSubmitting(true);
    try {
      if (editingSkill) {
        await skillsApi.update(editingSkill.id, form);
      } else {
        await skillsApi.create(form);
      }
      setModalOpen(false);
      fetchSkills();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to save skill');
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
          <h1 className="text-3xl font-bold text-gray-900">My Skills</h1>
          <p className="text-gray-500 mt-1">Manage skills you teach</p>
        </div>
        <Button onClick={openCreate} icon={<Plus className="w-4 h-4" />}>
          Add Skill
        </Button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <strong>Skill Approval:</strong> New skills require admin approval before appearing in the marketplace.
          Rejected skills can be edited and resubmitted.
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
        title={editingSkill ? 'Edit Skill' : 'Create New Skill'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Skill Title"
            placeholder="e.g. React.js for Beginners"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Describe what learners will get from this session..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
          <Select
            label="Category"
            value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Price per hour (SKC)
            </label>
            <input
              type="number"
              min={30}
              max={300}
              value={form.price}
              onChange={e => setForm({ ...form, price: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-400 mt-1">Range: 30 – 300 SKC</p>
          </div>

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
              {editingSkill ? 'Update Skill' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Delete Skill"
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
