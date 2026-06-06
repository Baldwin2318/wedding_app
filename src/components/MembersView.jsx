import { useState } from 'react'
import ProfileAvatar from './ProfileAvatar'
import VerifiedBadge from './VerifiedBadge'

function BackIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 18 9 12l6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MembersView({ members = [], onBack, onSelectMember }) {
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredMembers = normalizedQuery
    ? members.filter((member) =>
        String(member.author || '')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : members

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      <header className="shrink-0 border-b border-zinc-200 bg-white/95 px-4 pt-3 pb-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[520px] items-center justify-between">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-950 transition active:bg-zinc-100"
            onClick={onBack}
            aria-label="Back"
          >
            <BackIcon />
          </button>

          <h2 className="text-[17px] font-bold text-zinc-950">
            Members
          </h2>

          <div className="h-10 w-10" />
        </div>

        <label className="mx-auto mt-3 flex w-full max-w-[520px] items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-zinc-500">
          <SearchIcon className="h-4 w-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name"
            aria-label="Search members by name"
            className="w-full bg-transparent text-sm font-medium text-zinc-950 outline-none placeholder:text-zinc-500"
          />
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[520px] px-4 py-4">
          {filteredMembers.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white p-3 text-left shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition active:scale-[0.98]"
                  onClick={() => onSelectMember(member)}
                >
                  <div className="relative overflow-hidden rounded-2xl bg-zinc-100">
                    <div className="flex aspect-square items-center justify-center">
                      <ProfileAvatar
                        src={member.profileImage}
                        name={member.author}
                        className="h-24 w-24 shadow-none ring-0"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex min-w-0 items-center gap-1.5 px-1">
                    <span className="truncate text-sm font-bold text-zinc-950">
                      {member.author}
                    </span>
                    {member.verified ? <VerifiedBadge /> : null}
                  </div>

                  <p className="mt-0.5 truncate px-1 text-xs font-medium text-zinc-500">
                    View profile
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center px-8 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
                  <SearchIcon className="h-8 w-8 text-zinc-400" />
                </div>

                <h3 className="text-base font-bold text-zinc-950">
                  {members.length > 0 && normalizedQuery ? 'No matching members' : 'No members yet'}
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {members.length > 0 && normalizedQuery
                    ? 'Try a different name or clear the search.'
                    : 'Members will appear here after they upload photos or when you connect this page to your members data.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default MembersView
