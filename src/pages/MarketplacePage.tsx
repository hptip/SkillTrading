import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { skillsApi } from '../lib/api';
import { Skill } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Search, Coins, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const CATEGORIES = ['Programming', 'Language', 'Music', 'Design', 'Math', 'Science', 'Sports', 'Cooking', 'Business', 'Art', 'Other'];

export const MarketplacePage = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 12 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (sortBy) params.sortBy = sortBy;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;

      const res = await skillsApi.getAll(params);
      setSkills(res.data.skills);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [page, category, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSkills();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Marketplace khóa học</h1>
        <p className="text-gray-500 mt-1">Khám phá khóa học và lịch học cố định theo tuần</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="w-full sm:w-44">
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }} className="w-full sm:w-44">
            <option value="">Sort: Latest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="popular">Most Popular</option>
          </Select>
          <Button type="submit" icon={<Filter className="w-4 h-4" />}>
            Search
          </Button>
        </form>

        <div className="flex gap-3 mt-3">
          <input
            type="number"
            placeholder="Min SKC"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <input
            type="number"
            placeholder="Max SKC"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{total} skills found</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No skills found</p>
          <p className="text-sm">Try different search terms or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {skills.map(skill => (
            <Card
              key={skill.id}
              hover
              onClick={() => navigate(`/skills/${skill.id}`)}
            >
              <CardBody className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" size="sm">{skill.category}</Badge>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                    <Coins className="w-4 h-4" />
                    {skill.price}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 text-sm leading-snug">
                  {skill.title}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                  {skill.description}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <Avatar src={skill.teacher?.avatar} name={skill.teacher?.fullName} size="xs" />
                    <span className="text-xs text-gray-600 font-medium truncate max-w-[80px]">
                      {skill.teacher?.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={skill.avgRating} />
                    <span className="text-xs text-gray-400">
                      ({skill.totalReviews})
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Prev
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            icon={<ChevronRight className="w-4 h-4" />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
