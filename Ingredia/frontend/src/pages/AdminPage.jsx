import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import EditRecipeModal from '../components/EditRecipeModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getDashboard, getAdminRecipes, approveRecipe, rejectRecipe, deleteAdminRecipe, getUsers, updateUserRole } from '../api/adminApi'

// Tab keys map to translation keys; labels resolved at render-time.
const TABS = [
  { key: 'Dashboard', tKey: 'admin.tabDashboard' },
  { key: 'Analytics', tKey: 'admin.tabAnalytics' },
  { key: 'Recipes',   tKey: 'admin.tabRecipes' },
  { key: 'Users',     tKey: 'admin.tabUsers' },
]

const STATUS_BADGE = {
  published: 'bg-sage/15 text-sage',
  pending:   'bg-gold/15 text-gold',
  rejected:  'bg-red-100 text-red-600',
}

export default function AdminPage() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState('Dashboard')
  const [recipePage, setRecipePage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')

  if (!isAdmin) {
    navigate('/home')
    return null
  }

  return (
    <div className="min-h-screen bg-cream">
      <Navbar variant="home" />
      <div className="container-x py-12">
        <div className="mb-10">
          <div className="section-label mb-2">{t('admin.section')}</div>
          <h1 className="font-display font-bold text-deep" style={{ fontSize: 'clamp(28px, 3.5vw, 42px)' }}>
            {t('admin.title')}
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 border-b border-cream-3 pb-1 overflow-x-auto">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`whitespace-nowrap px-5 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === tb.key ? 'bg-white border border-b-white border-cream-3 -mb-px text-terra' : 'text-muted hover:text-deep'
              }`}
            >
              {t(tb.tKey)}
            </button>
          ))}
        </div>

        {tab === 'Dashboard' && <DashboardTab />}
        {tab === 'Analytics' && <AnalyticsTab />}
        {tab === 'Recipes' && (
          <RecipesTab
            toast={toast}
            qc={qc}
            page={recipePage}
            setPage={setRecipePage}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}
        {tab === 'Users' && <UsersTab toast={toast} qc={qc} />}
      </div>
    </div>
  )
}

function DashboardTab() {
  const { t } = useTranslation()
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
  })

  const statCards = [
    { icon: '📖', label: t('admin.totalRecipes'),    value: stats.total_recipes ?? '—', color: 'text-terra' },
    { icon: '👥', label: t('admin.totalUsers'),      value: stats.total_users ?? '—', color: 'text-deep' },
    { icon: '⭐', label: t('admin.totalReviews'),    value: stats.total_reviews ?? '—', color: 'text-gold' },
    { icon: '⏳', label: t('admin.pendingApproval'), value: stats.pending_recipes ?? '—', color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-cream-3 shadow-card p-6">
            <div className="text-3xl mb-3">{s.icon}</div>
            {isLoading ? (
              <div className="h-7 bg-cream-3 rounded w-1/2 animate-pulse mb-2" />
            ) : (
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.value?.toLocaleString?.() ?? s.value}</div>
            )}
            <div className="text-xs text-muted font-semibold uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {stats.recent_signups?.length > 0 && (
        <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
          <h3 className="font-display text-xl font-bold text-deep mb-5">{t('admin.recentSignups')}</h3>
          <div className="divide-y divide-cream-3">
            {stats.recent_signups.map((u) => (
              <div key={u.id || u.email} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-deep">{u.name}</p>
                  <p className="text-xs text-muted">{u.email}</p>
                </div>
                <div className="text-xs text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function AnalyticsTab() {
  const { t } = useTranslation()
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-cream-3 shadow-card p-7 h-72 animate-pulse" />
        ))}
      </div>
    )
  }

  const topIngredients = Object.entries(stats.top_ingredients || {}).slice(0, 10)
  const maxIng = topIngredients[0]?.[1] || 1
  const maxCuisine = stats.top_cuisines?.[0]?.count || 1
  const searchesPerDay = stats.searches_per_day || []
  const usersPerDay = stats.users_per_day || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
        <h3 className="font-display text-xl font-bold text-deep mb-1">{t('admin.searchesToday')}</h3>
        <div className="font-display text-4xl font-bold text-terra">{(stats.searches_today ?? 0).toLocaleString()}</div>
        <p className="text-xs text-muted mt-1">{t('admin.searchesTodayHelp')}</p>
      </div>

      <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
        <h3 className="font-display text-xl font-bold text-deep mb-5">{t('admin.topCuisines')}</h3>
        {stats.top_cuisines?.length ? (
          <div className="space-y-3">
            {stats.top_cuisines.slice(0, 8).map((c) => (
              <div key={c.cuisine} className="flex items-center gap-3">
                <div className="text-sm font-medium text-deep w-32 capitalize truncate">{c.cuisine}</div>
                <div className="flex-1 bg-cream-3 rounded-full h-2">
                  <div className="bg-terra rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (c.count / maxCuisine) * 100)}%` }} />
                </div>
                <div className="text-xs text-muted w-12 text-right">{c.count}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">{t('admin.noDataYet')}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
        <h3 className="font-display text-xl font-bold text-deep mb-5">{t('admin.topIngredients')}</h3>
        {topIngredients.length ? (
          <div className="space-y-3">
            {topIngredients.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="text-sm font-medium text-deep w-32 capitalize truncate">{name}</div>
                <div className="flex-1 bg-cream-3 rounded-full h-2">
                  <div className="bg-gold rounded-full h-2 transition-all" style={{ width: `${Math.min(100, (count / maxIng) * 100)}%` }} />
                </div>
                <div className="text-xs text-muted w-10 text-right">{count}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-muted">{t('admin.noSearchesYet')}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7">
        <h3 className="font-display text-xl font-bold text-deep mb-5">{t('admin.topRated')}</h3>
        {stats.top_rated_recipes?.length ? (
          <ol className="space-y-2 list-none">
            {stats.top_rated_recipes.slice(0, 8).map((r, i) => (
              <li key={r.slug || i} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-muted w-5 flex-shrink-0">{i + 1}.</span>
                  <span className="text-deep font-medium truncate">{r.title}</span>
                </span>
                <span className="text-gold whitespace-nowrap text-xs">★ {Number(r.avg_rating || 0).toFixed(1)} <span className="text-muted">({r.rating_count || 0})</span></span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-muted">{t('admin.noReviewsYet')}</p>}
      </div>

      <div className="bg-white rounded-2xl border border-cream-3 shadow-card p-7 lg:col-span-2">
        <h3 className="font-display text-xl font-bold text-deep mb-5">{t('admin.activity30d')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MiniBars title={t('admin.searchesPerDay')} series={searchesPerDay} color="bg-terra" />
          <MiniBars title={t('admin.newUsersPerDay')} series={usersPerDay} color="bg-sage" />
        </div>
      </div>
    </div>
  )
}

function MiniBars({ title, series, color }) {
  const max = Math.max(1, ...series.map((d) => d.count || 0))
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">{title}</p>
      <div className="flex items-end gap-1 h-32">
        {series.map((d) => (
          <div key={d.date} className="flex-1 flex flex-col items-center justify-end" title={`${d.date}: ${d.count}`}>
            <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '2px' : '0' }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-2">
        <span>{series[0]?.date?.slice(5) || ''}</span>
        <span>{series[series.length - 1]?.date?.slice(5) || ''}</span>
      </div>
    </div>
  )
}

function RecipesTab({ toast, qc, page, setPage, statusFilter, setStatusFilter }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-recipes', page, statusFilter],
    queryFn: () => getAdminRecipes(page, statusFilter),
    placeholderData: keepPreviousData,
  })

  const recipes = data?.data || []
  const meta = data?.meta || {}

  const approveMut = useMutation({
    mutationFn: approveRecipe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-recipes'] }); toast(t('admin.approved')) },
  })
  const rejectMut = useMutation({
    mutationFn: rejectRecipe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-recipes'] }); toast(t('admin.rejected')) },
  })
  const deleteMut = useMutation({
    mutationFn: deleteAdminRecipe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-recipes'] }); toast(t('admin.deleted')) },
  })

  const filterLabel = (s) => s ? t(`admin.filter${s.charAt(0).toUpperCase()}${s.slice(1)}`) : t('admin.filterAll')

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['', 'pending', 'published', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-[13px] border-[1.5px] transition-all capitalize ${
              statusFilter === s
                ? 'bg-terra border-terra text-white'
                : 'bg-white border-cream-3 text-muted hover:border-terra hover:text-terra'
            }`}
          >
            {filterLabel(s)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-cream-3 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-cream-3 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="py-16 text-center text-muted">{t('admin.noRecipesFound')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-2 border-b border-cream-3">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colRecipe')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">{t('admin.colCuisine')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colStatus')}</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-3">
              {recipes.map((r) => (
                <tr key={r.id || r._id} className="hover:bg-cream-2/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-deep truncate max-w-[240px]">{r.title}</p>
                    <p className="text-xs text-muted">⭐ {Number(r.avg_rating || 0).toFixed(1)} · {r.rating_count || 0} {t('admin.reviewsCountShort')}</p>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell capitalize text-muted">{r.cuisine || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status] || 'bg-cream-3 text-muted'}`}>
                      {filterLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveMut.mutate(r.id || r._id)}
                            className="text-xs px-3 py-1 bg-sage/10 text-sage border border-sage/20 rounded-full hover:bg-sage/20 transition-colors"
                          >
                            {t('admin.approve')}
                          </button>
                          <button
                            onClick={() => rejectMut.mutate(r.id || r._id)}
                            className="text-xs px-3 py-1 bg-red-50 text-red-500 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                          >
                            {t('admin.reject')}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setEditing(r)}
                        className="text-xs px-3 py-1 bg-terra/10 text-terra border border-terra/20 rounded-full hover:bg-terra/20 transition-colors"
                      >
                        {t('admin.edit')}
                      </button>
                      <button
                        onClick={() => window.confirm(t('admin.deleteConfirm')) && deleteMut.mutate(r.id || r._id)}
                        className="text-xs px-3 py-1 bg-cream-2 text-muted border border-cream-3 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        {t('admin.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(meta.total || 0) > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline disabled:opacity-40">
            {t('admin.prev')}
          </button>
          <span className="px-5 py-2.5 text-sm text-muted">{t('admin.page', { n: page })}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={recipes.length < 20} className="btn-outline disabled:opacity-40">
            {t('admin.next')}
          </button>
        </div>
      )}

      {editing && <EditRecipeModal recipe={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function UsersTab({ toast, qc }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => getUsers(page),
    placeholderData: keepPreviousData,
  })

  const users = data?.data || []

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => updateUserRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast(t('admin.roleUpdated')) },
  })

  return (
    <div>
      <div className="bg-white rounded-2xl border border-cream-3 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-cream-3 rounded-xl animate-pulse" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-muted">{t('admin.noUsersFound')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-2 border-b border-cream-3">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colUser')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">{t('admin.colJoined')}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colRole')}</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t('admin.colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-3">
              {users.map((u) => (
                <tr key={u.id || u._id} className="hover:bg-cream-2/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-deep">{u.name}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted hidden sm:table-cell text-xs">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${u.role === 'admin' ? 'bg-gold/15 text-gold' : 'bg-sage/15 text-sage'}`}>
                      {u.role === 'admin' ? t('profile.adminRole') : t('profile.memberRole')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.role === 'admin' ? (
                      <button
                        onClick={() => roleMut.mutate({ id: u.id || u._id, role: 'user' })}
                        className="text-xs px-3 py-1 bg-cream-2 text-muted border border-cream-3 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        {t('admin.removeAdmin')}
                      </button>
                    ) : (
                      <button
                        onClick={() => roleMut.mutate({ id: u.id || u._id, role: 'admin' })}
                        className="text-xs px-3 py-1 bg-gold/10 text-gold border border-gold/20 rounded-full hover:bg-gold/20 transition-colors"
                      >
                        {t('admin.makeAdmin')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(data?.meta?.total || 0) > 20 && (
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-outline disabled:opacity-40">{t('admin.prev')}</button>
          <span className="px-5 py-2.5 text-sm text-muted">{t('admin.page', { n: page })}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={users.length < 20} className="btn-outline disabled:opacity-40">{t('admin.next')}</button>
        </div>
      )}
    </div>
  )
}
