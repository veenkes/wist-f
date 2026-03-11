import { useState, useMemo } from 'react';
import {
  Search, BookOpen, FileText, Video, Presentation, Layers,
  Heart, Bookmark, Eye, Star, Download, ChevronRight,
  Filter, X, Brain, Send, CheckCircle, MessageSquare, StickyNote
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface Material {
  id: string;
  title: string;
  description: string;
  subject: string;
  topic: string;
  gradeLevel: string;
  type: 'pdf' | 'video' | 'presentation' | 'article' | 'worksheet';
  author: string;
  createdAt: string;
  views: number;
  likes: number;
  saves: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  thumbnailColor: string;
  comments: number;
  isLiked?: boolean;
  isSaved?: boolean;
  fileSize?: string;
}

const SUBJECTS = [
  { name: 'Все', icon: '📚' },
  { name: 'Математика', icon: '📐' },
  { name: 'Физика', icon: '⚡' },
  { name: 'Химия', icon: '🧪' },
  { name: 'Английский', icon: '🇬🇧' },
  { name: 'История', icon: '📜' },
  { name: 'Информатика', icon: '💻' },
  { name: 'Биология', icon: '🌿' },
];

const MOCK_MATERIALS: Material[] = [
  { id: '1', title: 'Квадратные уравнения', description: 'Полное руководство по решению квадратных уравнений с примерами', subject: 'Математика', topic: 'Алгебра', gradeLevel: '9 класс', type: 'pdf', author: 'Петрова Е.С.', createdAt: '2026-02-28', views: 342, likes: 87, saves: 45, rating: 4.8, ratingCount: 23, tags: ['уравнения', 'алгебра'], thumbnailColor: 'from-blue-500 to-blue-600', comments: 12, fileSize: '2.4 MB' },
  { id: '2', title: 'Законы Ньютона — Видеолекция', description: 'Анимация всех трёх законов с демонстрациями из реальной жизни', subject: 'Физика', topic: 'Механика', gradeLevel: '10 класс', type: 'video', author: 'Иванов К.Н.', createdAt: '2026-02-27', views: 521, likes: 134, saves: 89, rating: 4.9, ratingCount: 45, tags: ['ньютон', 'силы'], thumbnailColor: 'from-purple-500 to-purple-600', comments: 28, fileSize: '156 MB' },
  { id: '3', title: 'Периодическая таблица', description: 'Интерактивный справочник по элементам и химическим реакциям', subject: 'Химия', topic: 'Неорганика', gradeLevel: '8 класс', type: 'presentation', author: 'Нурова Д.М.', createdAt: '2026-02-26', views: 298, likes: 76, saves: 52, rating: 4.6, ratingCount: 18, tags: ['элементы', 'таблица'], thumbnailColor: 'from-green-500 to-green-600', comments: 8, fileSize: '8.1 MB' },
  { id: '4', title: 'Анализ сонетов Шекспира', description: 'Глубокий разбор тем и литературных приёмов', subject: 'Английский', topic: 'Литература', gradeLevel: '11 класс', type: 'article', author: 'Джонсон М.', createdAt: '2026-02-25', views: 189, likes: 45, saves: 33, rating: 4.5, ratingCount: 12, tags: ['шекспир', 'поэзия'], thumbnailColor: 'from-amber-500 to-amber-600', comments: 15, fileSize: '1.2 MB' },
  { id: '5', title: 'Структура и репликация ДНК', description: 'Рабочий лист по структуре двойной спирали ДНК', subject: 'Биология', topic: 'Генетика', gradeLevel: '10 класс', type: 'worksheet', author: 'Хасанова Л.', createdAt: '2026-02-24', views: 267, likes: 63, saves: 41, rating: 4.7, ratingCount: 20, tags: ['днк', 'генетика'], thumbnailColor: 'from-emerald-400 to-green-600', comments: 6, fileSize: '3.5 MB' },
  { id: '6', title: 'Основы Python', description: 'Пошаговое введение: переменные, циклы, функции', subject: 'Информатика', topic: 'Программирование', gradeLevel: '9 класс', type: 'pdf', author: 'Алиев Р.Б.', createdAt: '2026-02-23', views: 456, likes: 112, saves: 78, rating: 4.9, ratingCount: 35, tags: ['python', 'код'], thumbnailColor: 'from-indigo-500 to-indigo-600', comments: 22, fileSize: '4.8 MB' },
  { id: '7', title: 'Вторая мировая война', description: 'Хронология с картами и анализом ключевых событий', subject: 'История', topic: 'Мировые войны', gradeLevel: '11 класс', type: 'presentation', author: 'Сидорова Н.В.', createdAt: '2026-02-22', views: 178, likes: 41, saves: 29, rating: 4.4, ratingCount: 14, tags: ['вов', 'хронология'], thumbnailColor: 'from-red-500 to-red-600', comments: 9, fileSize: '12.3 MB' },
  { id: '8', title: 'Формулы тригонометрии', description: 'Все формулы, тождества и единичная окружность', subject: 'Математика', topic: 'Тригонометрия', gradeLevel: '10 класс', type: 'worksheet', author: 'Петрова Е.С.', createdAt: '2026-02-21', views: 612, likes: 156, saves: 201, rating: 5.0, ratingCount: 52, tags: ['тригонометрия', 'формулы'], thumbnailColor: 'from-blue-500 to-cyan-500', comments: 4, fileSize: '890 KB' },
];

const MOCK_QUIZ = [
  { q: 'Стандартная форма квадратного уравнения?', options: ['ax² + bx + c = 0', 'ax + b = 0', 'a/x + b = 0', 'ax³ + bx = 0'], correct: 0 },
  { q: 'Сколько решений может иметь квадратное уравнение?', options: ['Только 1', 'Ровно 2', '0, 1 или 2', 'Бесконечно'], correct: 2 },
  { q: 'Для чего используется дискриминант?', options: ['Нахождение наклона', 'Определение природы корней', 'Вычисление площади', 'Ничего из перечисленного'], correct: 1 },
];

const MOCK_COMMENTS = [
  { id: '1', user: 'Али К.', text: 'Очень помогло при подготовке к экзамену!', date: '15 фев' },
  { id: '2', user: 'Сара М.', text: 'Отличные примеры, нужно больше задач.', date: '14 фев' },
];

const typeIcon = (type: string) => {
  switch (type) {
    case 'pdf': return <FileText className="w-4 h-4" />;
    case 'video': return <Video className="w-4 h-4" />;
    case 'presentation': return <Presentation className="w-4 h-4" />;
    case 'article': return <BookOpen className="w-4 h-4" />;
    case 'worksheet': return <Layers className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case 'pdf': return 'PDF';
    case 'video': return 'Видео';
    case 'presentation': return 'Презентация';
    case 'article': return 'Статья';
    case 'worksheet': return 'Рабочий лист';
    default: return type;
  }
};

const StudentLibrary = () => {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('Все');
  const [materials, setMaterials] = useState(MOCK_MATERIALS);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'quiz' | 'comments' | 'notes'>('info');
  const [comment, setComment] = useState('');
  const [note, setNote] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [userRating, setUserRating] = useState(0);

  const filtered = useMemo(() => {
    let result = [...materials];
    if (search) result = result.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.tags.some(t => t.includes(search.toLowerCase())));
    if (selectedSubject !== 'Все') result = result.filter(m => m.subject === selectedSubject);
    return result;
  }, [materials, search, selectedSubject]);

  const toggleLike = (id: string) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, isLiked: !m.isLiked, likes: m.isLiked ? m.likes - 1 : m.likes + 1 } : m));
  };

  const toggleSave = (id: string) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, isSaved: !m.isSaved, saves: m.isSaved ? m.saves - 1 : m.saves + 1 } : m));
  };

  const quizScore = Object.entries(quizAnswers).filter(([i, a]) => MOCK_QUIZ[Number(i)]?.correct === a).length;

  // Material Detail View
  if (selectedMaterial) {
    const m = materials.find(mat => mat.id === selectedMaterial.id) || selectedMaterial;
    return (
      <div className="p-4 space-y-4">
        {/* Back button */}
        <button onClick={() => { setSelectedMaterial(null); setDetailTab('info'); setQuizAnswers({}); setQuizSubmitted(false); setUserRating(0); }}
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: 'hsl(var(--sp-yellow-dark))' }}>
          ← Назад
        </button>

        {/* Hero */}
        <div className={`rounded-2xl h-32 bg-gradient-to-br ${m.thumbnailColor} flex items-center justify-center relative`}>
          <div className="text-white text-center">
            {typeIcon(m.type)}
            <p className="text-xs font-medium mt-1 uppercase">{typeLabel(m.type)}</p>
          </div>
          <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-md bg-black/30 text-white">{m.gradeLevel}</span>
          {m.fileSize && <span className="absolute bottom-3 right-3 text-[10px] text-white/70">{m.fileSize}</span>}
        </div>

        {/* Title & meta */}
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>{m.title}</h2>
          <p className="text-xs mt-1" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{m.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
            <span>{m.author}</span>
            <span>•</span>
            <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{m.views}</span>
            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500" />{m.rating}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-md border" style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text-secondary))' }}>{m.subject}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-md border" style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text-secondary))' }}>{m.topic}</span>
          {m.tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>{t}</span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => toggleLike(m.id)}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                    m.isLiked ? "border-red-300 text-red-500" : "")}
                  style={!m.isLiked ? { borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text))' } : undefined}>
            <Heart className={cn("w-4 h-4", m.isLiked && "fill-current")} /> {m.likes}
          </button>
          <button onClick={() => toggleSave(m.id)}
                  className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-colors")}
                  style={{ 
                    borderColor: m.isSaved ? 'hsl(var(--sp-yellow))' : 'hsl(var(--sp-border))',
                    color: m.isSaved ? 'hsl(var(--sp-yellow-dark))' : 'hsl(var(--sp-text))'
                  }}>
            <Bookmark className={cn("w-4 h-4", m.isSaved && "fill-current")} /> Сохранить
          </button>
          <button className="flex items-center justify-center w-11 rounded-xl border"
                  style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-text))' }}>
            <Download className="w-4 h-4" />
          </button>
        </div>

        {/* Rate */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Оценить:</span>
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} onClick={() => setUserRating(s)}>
              <Star className={cn("w-5 h-5", s <= userRating ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
            </button>
          ))}
          {userRating > 0 && <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{userRating}/5</span>}
        </div>

        {/* Detail Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'hsl(var(--sp-yellow-light))' }}>
          {([
            { id: 'info' as const, label: 'Инфо', icon: BookOpen },
            { id: 'quiz' as const, label: 'Квиз', icon: Brain },
            { id: 'comments' as const, label: `Отзывы`, icon: MessageSquare },
            { id: 'notes' as const, label: 'Заметки', icon: StickyNote },
          ]).map(t => (
            <button key={t.id} onClick={() => setDetailTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium rounded-lg transition-all"
                    style={detailTab === t.id
                      ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' }
                      : { color: 'hsl(var(--sp-text-secondary))' }}>
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {detailTab === 'info' && (
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
            <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>О материале</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{m.description}</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {[
                { label: 'Автор', value: m.author },
                { label: 'Предмет', value: m.subject },
                { label: 'Тема', value: m.topic },
                { label: 'Класс', value: m.gradeLevel },
                { label: 'Тип', value: typeLabel(m.type) },
                { label: 'Размер', value: m.fileSize || '—' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{item.label}</p>
                  <p className="text-xs font-medium" style={{ color: 'hsl(var(--sp-text))' }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === 'quiz' && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Проверь своё понимание материала</p>
            {MOCK_QUIZ.map((q, qi) => (
              <div key={qi} className="rounded-xl border p-3 space-y-2" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
                <p className="text-sm font-medium" style={{ color: 'hsl(var(--sp-text))' }}>{qi + 1}. {q.q}</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => {
                    const selected = quizAnswers[qi] === oi;
                    const isCorrect = quizSubmitted && q.correct === oi;
                    const isWrong = quizSubmitted && selected && q.correct !== oi;
                    return (
                      <button key={oi}
                              onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [qi]: oi }))}
                              disabled={quizSubmitted}
                              className="w-full text-left p-2.5 rounded-lg border text-xs transition-all"
                              style={{
                                borderColor: isCorrect ? '#22c55e' : isWrong ? '#ef4444' : selected ? 'hsl(var(--sp-yellow))' : 'hsl(var(--sp-border))',
                                backgroundColor: isCorrect ? '#dcfce7' : isWrong ? '#fee2e2' : selected ? 'hsl(var(--sp-yellow-light))' : 'transparent',
                                color: 'hsl(var(--sp-text))'
                              }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {!quizSubmitted ? (
              <button onClick={() => setQuizSubmitted(true)}
                      disabled={Object.keys(quizAnswers).length < MOCK_QUIZ.length}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40"
                      style={{ backgroundColor: 'hsl(var(--sp-yellow))' }}>
                <CheckCircle className="w-4 h-4 inline mr-1" /> Отправить
              </button>
            ) : (
              <div className="rounded-xl border p-4 text-center" style={{ borderColor: quizScore === MOCK_QUIZ.length ? '#22c55e' : 'hsl(var(--sp-yellow))', backgroundColor: 'hsl(var(--sp-white))' }}>
                <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{quizScore}/{MOCK_QUIZ.length}</p>
                <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                  {quizScore === MOCK_QUIZ.length ? '🎉 Отлично!' : quizScore >= 2 ? '👍 Хорошо!' : '📚 Повтори материал!'}
                </p>
                <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                        className="mt-2 text-xs font-medium px-4 py-1.5 rounded-lg border"
                        style={{ borderColor: 'hsl(var(--sp-border))', color: 'hsl(var(--sp-yellow-dark))' }}>
                  Повторить
                </button>
              </div>
            )}
          </div>
        )}

        {detailTab === 'comments' && (
          <div className="space-y-3">
            {MOCK_COMMENTS.map(c => (
              <div key={c.id} className="rounded-xl border p-3" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--sp-text))' }}>{c.user}</span>
                  <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{c.date}</span>
                </div>
                <p className="text-xs" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{c.text}</p>
              </div>
            ))}
            <div className="flex gap-2">
              <input placeholder="Написать отзыв..."
                     value={comment} onChange={e => setComment(e.target.value)}
                     className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none"
                     style={{ borderColor: 'hsl(var(--sp-border))', backgroundColor: 'hsl(var(--sp-white))', color: 'hsl(var(--sp-text))' }} />
              <button disabled={!comment.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40"
                      style={{ backgroundColor: 'hsl(var(--sp-yellow))' }}>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {detailTab === 'notes' && (
          <div className="space-y-3">
            <textarea placeholder="Твои заметки, ключевые выводы..."
                      value={note} onChange={e => setNote(e.target.value)} rows={6}
                      className="w-full text-sm px-3 py-2 rounded-xl border outline-none resize-none"
                      style={{ borderColor: 'hsl(var(--sp-border))', backgroundColor: 'hsl(var(--sp-white))', color: 'hsl(var(--sp-text))' }} />
            <div className="flex justify-between items-center">
              <span className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{note.length} символов</span>
              <button disabled={!note.trim()} className="text-xs font-medium px-4 py-2 rounded-xl text-white disabled:opacity-40"
                      style={{ backgroundColor: 'hsl(var(--sp-yellow))' }}>
                <CheckCircle className="w-3 h-3 inline mr-1" /> Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main Library List View
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--sp-text))' }}>Библиотека</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
        <input placeholder="Поиск материалов..."
               value={search} onChange={e => setSearch(e.target.value)}
               className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border outline-none"
               style={{ borderColor: 'hsl(var(--sp-border))', backgroundColor: 'hsl(var(--sp-white))', color: 'hsl(var(--sp-text))' }} />
      </div>

      {/* Subject Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {SUBJECTS.map(s => (
          <button key={s.name}
                  onClick={() => setSelectedSubject(s.name)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                  style={selectedSubject === s.name
                    ? { backgroundColor: 'hsl(var(--sp-yellow))', color: 'white' }
                    : { backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-text-secondary))' }}>
            <span>{s.icon}</span> {s.name}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl p-2.5 text-center border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>{materials.length}</p>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Материалов</p>
        </div>
        <div className="flex-1 rounded-xl p-2.5 text-center border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-yellow-dark))' }}>{materials.filter(m => m.isSaved).length}</p>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Сохранено</p>
        </div>
        <div className="flex-1 rounded-xl p-2.5 text-center border" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
          <p className="text-lg font-bold" style={{ color: 'hsl(var(--sp-text))' }}>8</p>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Предметов</p>
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-xl border p-8 text-center" style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
            <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
            <p className="text-sm" style={{ color: 'hsl(var(--sp-text-secondary))' }}>Ничего не найдено</p>
          </div>
        ) : (
          filtered.map(m => (
            <button key={m.id} onClick={() => setSelectedMaterial(m)}
                    className="w-full rounded-xl border p-3 text-left transition-all active:scale-[0.98]"
                    style={{ backgroundColor: 'hsl(var(--sp-white))', borderColor: 'hsl(var(--sp-border))' }}>
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${m.thumbnailColor} flex items-center justify-center shrink-0`}>
                  <div className="text-white">{typeIcon(m.type)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate" style={{ color: 'hsl(var(--sp-text))' }}>{m.title}</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--sp-text-secondary))' }}>{m.author} • {m.subject}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                      <Eye className="w-3 h-3" />{m.views}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: 'hsl(var(--sp-text-secondary))' }}>
                      <Heart className="w-3 h-3" />{m.likes}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Star className="w-3 h-3 fill-current" />{m.rating}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md ml-auto"
                          style={{ backgroundColor: 'hsl(var(--sp-yellow-light))', color: 'hsl(var(--sp-yellow-dark))' }}>
                      {typeLabel(m.type)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 self-center shrink-0" style={{ color: 'hsl(var(--sp-text-secondary))' }} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentLibrary;
