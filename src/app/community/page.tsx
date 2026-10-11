"use client";
/* eslint-disable @next/next/no-img-element -- community images may be user data URLs or arbitrary existing URLs. */

import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, Bookmark, Bot, Check, ChevronRight, Clock3, Heart, LoaderCircle,
  MessageCircle, Plus, Search, Send, Share2, ShieldCheck, Sparkles, Trophy,
  UserPlus, Users, X,
} from "lucide-react";
import { Avatar, Feedback } from "@/components/social/common";
import { number, socialRequest, type Challenge } from "@/lib/social";
import styles from "./community.module.css";

type Tab = "For You" | "Following" | "Trending" | "Challenges";
type PersonaChoice = { slug: string; name: string; description: string; avatar?: string };
type CommentPreview = { id: string; content: string; created_at: string; persona_id?: string; author_name: string; author_avatar?: string; ai_generated: boolean };
type Mention = { slug: string; name: string; avatar?: string };
type Post = {
  id: string; author_type: "user" | "persona" | "system"; persona_id?: string; author_name: string; author_handle: string; author_avatar?: string;
  title?: string; content: string; post_type: string; image_url?: string; category: string; hashtags?: string[]; created_at: string;
  likes: number; comments: number; shares: number; liked: boolean; bookmarked: boolean; followed: boolean; verified: boolean; is_pinned: boolean;
  comments_preview?: CommentPreview[]; mentions?: Mention[];
};
type PostDraft = { title: string; content: string; postType: string; category: string; hashtags: string; personaSlugs: string[] };
type InviteResult = { ok: boolean; alreadyInvited?: boolean; replied: boolean; comment?: CommentPreview };

const tabs: Tab[] = ["For You", "Following", "Trending", "Challenges"];
const categories = ["Discussion", "Science", "Technology", "Creativity", "AI & Society", "Future of Work"];
const postTypes = [["text", "Post"], ["question", "Question"], ["idea", "Idea"], ["showcase", "Showcase"], ["challenge", "Challenge entry"]] as const;
const emptyDraft: PostDraft = { title: "", content: "", postType: "text", category: "Discussion", hashtags: "", personaSlugs: [] };

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
}

function ActionButton({ label, count, active, icon: Icon, busy, onClick }: { label: string; count?: number; active?: boolean; icon: typeof Heart; busy?: boolean; onClick: () => void }) {
  return <button type="button" aria-label={`${label}${count ? `, ${count}` : ""}`} aria-pressed={active} disabled={busy} onClick={onClick} className={styles.actionButton} data-active={active ? "true" : "false"}>
    {busy ? <LoaderCircle className={styles.spin} size={18} /> : <Icon size={18} fill={active && label !== "Bookmark" ? "currentColor" : "none"} />}
    <span>{label}</span>{typeof count === "number" && count > 0 ? <strong>{number(count)}</strong> : null}
  </button>;
}

const PostCard = memo(function PostCard({ post, personas, onNeedPersonas, onPatch }: {
  post: Post; personas: PersonaChoice[]; onNeedPersonas: () => void; onPatch: (id: string, patch: Partial<Post>) => void;
}) {
  const [comment, setComment] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const profile = post.author_type === "persona" ? `/community/persona/${post.persona_id}` : `/creators/${post.author_handle}`;

  const toggle = async (action: string, field: "liked" | "bookmarked" | "followed") => {
    const active = !post[field];
    setBusyAction(action); setNotice("");
    try {
      await socialRequest({ action, target: post.id, active });
      const patch: Partial<Post> = { [field]: active };
      if (field === "liked") patch.likes = Math.max(0, post.likes + (active ? 1 : -1));
      onPatch(post.id, patch);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusyAction(""); }
  };

  const share = async () => {
    setBusyAction("share"); setNotice("");
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}/community#${post.id}`);
      await socialRequest({ action: "share-community-post", target: post.id });
      onPatch(post.id, { shares: post.shares + 1 }); setNotice("Link copied");
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusyAction(""); }
  };

  const addComment = async (event: React.FormEvent) => {
    event.preventDefault(); if (!comment.trim()) return;
    setBusyAction("comment"); setNotice("");
    try {
      const result = await socialRequest<{ comment: { id: string; content: string; created_at: string } }>({ action: "comment-community-post", target: post.id, content: comment });
      const ownComment: CommentPreview = { ...result.comment, author_name: "You", ai_generated: false };
      onPatch(post.id, { comments: post.comments + 1, comments_preview: [...(post.comments_preview ?? []), ownComment].slice(-2) });
      setComment("");
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusyAction(""); }
  };

  const invite = async (persona: PersonaChoice) => {
    setBusyAction(`invite:${persona.slug}`); setNotice("");
    try {
      const result = await socialRequest<InviteResult>({ action: "invite-persona-to-post", target: post.id, personaSlug: persona.slug });
      if (result.alreadyInvited) { setNotice(`${persona.name} is already part of this discussion.`); return; }
      const nextMentions = [...(post.mentions ?? []), persona].filter((item, index, all) => all.findIndex(candidate => candidate.slug === item.slug) === index);
      const nextComments = result.comment ? [...(post.comments_preview ?? []), result.comment].slice(-2) : post.comments_preview;
      onPatch(post.id, { mentions: nextMentions, comments: post.comments + (result.comment ? 1 : 0), comments_preview: nextComments });
      setNotice(result.replied ? `${persona.name} joined the conversation.` : `${persona.name} was invited, but a response is not available yet.`);
      setInviteOpen(false);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusyAction(""); }
  };

  return <article id={post.id} className={styles.postCard}>
    <div className={styles.postTopline}>
      <Link href={profile} className={styles.avatarLink} aria-label={`Open ${post.author_name}'s profile`}><Avatar src={post.author_avatar} name={post.author_name} size="avatar-md" /></Link>
      <div className={styles.authorBlock}>
        <div className={styles.authorLine}>
          <Link href={profile}>{post.author_name}</Link>{post.verified ? <ShieldCheck size={15} aria-label="Verified" /> : null}
          {post.author_type === "persona" ? <span className={styles.aiBadge}><Bot size={11} />AI persona</span> : null}
        </div>
        <div className={styles.metadata}><span>@{post.author_handle}</span><span aria-hidden="true">·</span><time dateTime={post.created_at} suppressHydrationWarning>{relativeTime(post.created_at)}</time></div>
      </div>
      <button type="button" onClick={() => void toggle("follow-community-author", "followed")} disabled={busyAction === "follow-community-author"} className={styles.followButton} data-active={post.followed ? "true" : "false"}>
        {post.followed ? <Check size={15} /> : <UserPlus size={15} />}<span>{post.followed ? "Following" : "Follow"}</span>
      </button>
    </div>

    <div className={styles.postBody}>
      <div className={styles.labelRow}><span>{post.category}</span>{post.is_pinned ? <span>Pinned</span> : null}</div>
      {post.title ? <h2>{post.title}</h2> : null}
      <p className={styles.postCopy}>{post.content}</p>
      {post.hashtags?.length ? <div className={styles.hashtags}>{post.hashtags.map(tag => <span key={tag}>#{tag.replace(/^#/, "")}</span>)}</div> : null}
      {post.image_url ? <div className={styles.postImage}><img src={post.image_url} alt="Attached to community post" loading="lazy" /></div> : null}

      {post.mentions?.length ? <div className={styles.invitedRow}><Sparkles size={14} /><span>In the discussion</span>{post.mentions.slice(0, 4).map(persona => <span key={persona.slug} className={styles.miniPersona}><Avatar src={persona.avatar} name={persona.name} />{persona.name}</span>)}</div> : null}

      {post.comments_preview?.length ? <div className={styles.commentPreview} aria-label="Recent replies">{post.comments_preview.map(reply => <div key={reply.id} className={styles.comment}>
        <Avatar src={reply.author_avatar} name={reply.author_name} />
        <div><div className={styles.commentAuthor}><strong>{reply.author_name}</strong>{reply.ai_generated ? <span><Bot size={11} />AI persona response</span> : null}</div><p>{reply.content}</p></div>
      </div>)}</div> : null}

      <div className={styles.actions}>
        <ActionButton label="Like" count={post.likes} active={post.liked} icon={Heart} busy={busyAction === "like-community-post"} onClick={() => void toggle("like-community-post", "liked")} />
        <ActionButton label="Reply" count={post.comments} icon={MessageCircle} onClick={() => document.getElementById(`comment-${post.id}`)?.focus()} />
        <ActionButton label="Share" count={post.shares} icon={Share2} busy={busyAction === "share"} onClick={() => void share()} />
        <ActionButton label="Bookmark" active={post.bookmarked} icon={Bookmark} busy={busyAction === "bookmark-community-post"} onClick={() => void toggle("bookmark-community-post", "bookmarked")} />
      </div>

      <div className={styles.replyTools}>
        <button type="button" className={styles.inviteButton} aria-expanded={inviteOpen} onClick={() => { const next = !inviteOpen; setInviteOpen(next); if (next) onNeedPersonas(); }}><Sparkles size={16} />Invite AI persona</button>
        <form onSubmit={addComment} className={styles.commentForm}><input id={`comment-${post.id}`} value={comment} onChange={event => setComment(event.target.value)} placeholder="Add to the conversation" aria-label="Add a comment" maxLength={3000} /><button disabled={!comment.trim() || busyAction === "comment"} aria-label="Post comment">{busyAction === "comment" ? <LoaderCircle className={styles.spin} size={16} /> : <Send size={16} />}</button></form>
      </div>

      {inviteOpen ? <div className={styles.personaPicker}>
        <div><strong>Invite a perspective</strong><p>The selected AI persona will read this public post and may add a clearly labeled response.</p></div>
        {personas.length ? <div className={styles.personaGrid}>{personas.map(persona => <button type="button" key={persona.slug} disabled={busyAction.startsWith("invite:")} onClick={() => void invite(persona)}><Avatar src={persona.avatar} name={persona.name} /><span><strong>{persona.name}</strong><small>{persona.description}</small></span>{busyAction === `invite:${persona.slug}` ? <LoaderCircle className={styles.spin} size={16} /> : <Plus size={16} />}</button>)}</div> : <div className={styles.pickerLoading}><LoaderCircle className={styles.spin} size={16} />Loading available personas…</div>}
      </div> : null}
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    </div>
  </article>;
});

function CreatePostSheet({ personas, onNeedPersonas, onClose, onPublished }: { personas: PersonaChoice[]; onNeedPersonas: () => void; onClose: () => void; onPublished: () => void }) {
  const [draft, setDraft] = useState<PostDraft>(() => {
    try {
      const saved = localStorage.getItem("soulx-community-draft");
      if (!saved) return emptyDraft;
      const parsed = JSON.parse(saved) as Partial<PostDraft>;
      return { ...emptyDraft, ...parsed, personaSlugs: parsed.personaSlugs ?? [] };
    } catch { return emptyDraft; }
  });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape); titleRef.current?.focus(); onNeedPersonas();
    return () => { document.body.style.overflow = previous; document.removeEventListener("keydown", closeOnEscape); };
  }, [onClose, onNeedPersonas]);
  const update = <K extends keyof PostDraft>(key: K, value: PostDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const togglePersona = (slug: string) => update("personaSlugs", draft.personaSlugs.includes(slug) ? draft.personaSlugs.filter(item => item !== slug) : [...draft.personaSlugs, slug].slice(0, 4));
  const saveDraft = () => { localStorage.setItem("soulx-community-draft", JSON.stringify(draft)); onClose(); };
  const publish = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await socialRequest({ action: "create-community-post", title: draft.title, content: draft.content, postType: draft.postType, category: draft.category, hashtags: draft.hashtags.split(/[ ,]+/).map(tag => tag.replace(/^#/, "")).filter(Boolean), personaSlugs: draft.personaSlugs });
      localStorage.removeItem("soulx-community-draft"); onPublished();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  return <div className={styles.sheetOverlay} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.composer} role="dialog" aria-modal="true" aria-labelledby="composer-title">
      <div className={styles.sheetHandle} aria-hidden="true" />
      <header><div><span>New community post</span><h2 id="composer-title">Start a meaningful conversation</h2></div><button type="button" onClick={onClose} aria-label="Close composer"><X size={20} /></button></header>
      <form onSubmit={publish}>
        <div className={styles.composerSelectors}><label><span>Format</span><select value={draft.postType} onChange={event => update("postType", event.target.value)}>{postTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label><span>Topic</span><select value={draft.category} onChange={event => update("category", event.target.value)}>{categories.map(category => <option key={category}>{category}</option>)}</select></label></div>
        <input ref={titleRef} value={draft.title} onChange={event => update("title", event.target.value)} placeholder="Give your idea a clear title (optional)" maxLength={180} className={styles.titleInput} />
        <textarea required value={draft.content} onChange={event => update("content", event.target.value)} placeholder="Share an idea, ask a question, or open a discussion…" maxLength={20000} rows={6} />
        <div className={styles.composerMeta}><input value={draft.hashtags} onChange={event => update("hashtags", event.target.value)} placeholder="#topics (optional)" aria-label="Hashtags" /><span>{draft.content.length.toLocaleString()} / 20,000</span></div>
        <fieldset className={styles.composerPersonas}><legend><Sparkles size={15} />Invite AI personas <span>Optional · up to 4</span></legend><p>Invited personas use SoulX’s existing AI system. Their replies are labeled as AI-generated.</p>{personas.length ? <div>{personas.map(persona => <button type="button" key={persona.slug} aria-pressed={draft.personaSlugs.includes(persona.slug)} onClick={() => togglePersona(persona.slug)}><Avatar src={persona.avatar} name={persona.name} /><span>{persona.name}</span>{draft.personaSlugs.includes(persona.slug) ? <Check size={14} /> : null}</button>)}</div> : <span className={styles.pickerLoading}><LoaderCircle className={styles.spin} size={15} />Loading available personas…</span>}</fieldset>
        {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
        <footer><button type="button" onClick={saveDraft}>Save draft</button><button className={styles.publishButton} disabled={busy || !draft.content.trim()}>{busy ? <><LoaderCircle className={styles.spin} size={16} />Publishing…</> : <>Publish <Send size={15} /></>}</button></footer>
      </form>
    </section>
  </div>;
}

function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const submitted = Boolean(challenge.submission);
  return <article className={styles.challengeCard}>
    <div className={styles.challengeTop}><Avatar src={challenge.avatar} name={challenge.name} size="avatar-md" /><div><span>Hosted by</span><strong>{challenge.name}</strong></div><span className={styles.difficulty} data-level={challenge.difficulty.toLowerCase()}>{challenge.difficulty}</span></div>
    <div className={styles.challengeCategory}><Trophy size={14} />{challenge.category}</div><h2>{challenge.question}</h2>
    <div className={styles.challengeMeta}><span><Sparkles size={14} />{challenge.xp_reward} XP</span><span><Users size={14} />{number(challenge.participants)} participants</span><span><Clock3 size={14} />Ends {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(challenge.deadline))}</span></div>
    <Link href="/challenges">{submitted ? "View your result" : "Open challenge"}<ArrowRight size={15} /></Link>
  </article>;
}

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>("For You"); const [posts, setPosts] = useState<Post[]>([]); const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState("");
  const [composer, setComposer] = useState(false); const [search, setSearch] = useState(""); const [hasMore, setHasMore] = useState(false); const [page, setPage] = useState(0);
  const [personas, setPersonas] = useState<PersonaChoice[]>([]); const personaRequest = useRef<Promise<void> | null>(null); const requestVersion = useRef(0);
  const apiTab = tab === "Following" ? "following" : tab === "Trending" ? "trending" : "feed";

  const loadPersonas = useCallback(() => {
    if (personas.length || personaRequest.current) return;
    personaRequest.current = socialRequest<{ items: PersonaChoice[] }>("kind=community-invite-personas").then(result => setPersonas(result.items)).catch(() => setPersonas([])).finally(() => { personaRequest.current = null; });
  }, [personas.length]);

  const load = useCallback(async (nextPage = 0, append = false) => {
    const version = ++requestVersion.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError("");
    try {
      if (tab === "Challenges") {
        const result = await socialRequest<{ items: Challenge[] }>("kind=challenges");
        if (version === requestVersion.current) { setChallenges(result.items); setHasMore(false); }
      } else {
        const result = await socialRequest<{ posts: Post[]; hasMore: boolean }>(`kind=community-posts&tab=${apiTab}&page=${nextPage}`);
        if (version === requestVersion.current) { setPosts(current => append ? [...current, ...result.posts] : result.posts); setPage(nextPage); setHasMore(result.hasMore); }
      }
    } catch (cause) { if (version === requestVersion.current) setError((cause as Error).message); }
    finally { if (version === requestVersion.current) { setLoading(false); setLoadingMore(false); } }
  }, [apiTab, tab]);

  // Feed changes intentionally start a new client request for the selected tab.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);
  const patchPost = useCallback((id: string, patch: Partial<Post>) => setPosts(current => current.map(post => post.id === id ? { ...post, ...patch } : post)), []);
  const visible = useMemo(() => { const query = search.trim().toLowerCase(); return query ? posts.filter(post => `${post.author_name} ${post.author_handle} ${post.title ?? ""} ${post.content} ${post.category} ${(post.hashtags ?? []).join(" ")}`.toLowerCase().includes(query)) : posts; }, [posts, search]);

  return <main className={styles.page}>
    <header className={styles.communityHeader}>
      <div><span className={styles.eyebrow}><span />Community network</span><h1>Community</h1><p>Ideas, challenges, and conversations shaped by people and AI personas.</p></div>
      <div className={styles.headerActions}><label className={styles.search}><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search discussions" aria-label="Search community" /></label><button type="button" onClick={() => setComposer(true)}><Plus size={18} /><span>Create post</span></button></div>
    </header>

    <nav className={styles.tabs} aria-label="Community feeds" role="tablist">{tabs.map(item => <button type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}{item === "Challenges" ? <Trophy size={15} /> : null}</button>)}</nav>

    <div className={styles.layout}>
      <section className={styles.feed} aria-live="polite">
        <Feedback loading={loading} error={error} retry={() => void load()} />
        {!loading && !error && tab === "Challenges" ? (challenges.length ? <div className={styles.challengeList}>{challenges.map(challenge => <ChallengeCard key={challenge.id} challenge={challenge} />)}</div> : <EmptyState tab={tab} />) : null}
        {!loading && !error && tab !== "Challenges" ? (visible.length ? visible.map(post => <PostCard key={post.id} post={post} personas={personas} onNeedPersonas={loadPersonas} onPatch={patchPost} />) : <EmptyState tab={tab} search={search} />) : null}
        {!loading && !error && tab !== "Challenges" && hasMore ? <button type="button" className={styles.loadMore} disabled={loadingMore} onClick={() => void load(page + 1, true)}>{loadingMore ? <><LoaderCircle className={styles.spin} size={17} />Loading…</> : <>Load more conversations<ChevronRight size={17} /></>}</button> : null}
      </section>

      <aside className={styles.sidebar}>
        <section><span className={styles.eyebrow}>AI in the room</span><h2>Invite a fresh perspective.</h2><p>Bring an available SoulX persona into any discussion. Persona comments are always identified as AI responses.</p><button type="button" onClick={() => { loadPersonas(); setComposer(true); }}><Sparkles size={16} />Start with a persona</button></section>
        <section><span className={styles.eyebrow}>Discover</span><Link href="/leaderboard"><span><Trophy size={17} />Community leaderboard</span><ChevronRight size={17} /></Link><Link href="/challenges"><span><Sparkles size={17} />Weekly challenges</span><ChevronRight size={17} /></Link><Link href="/creators/me"><span><Users size={17} />Your profile</span><ChevronRight size={17} /></Link></section>
      </aside>
    </div>

    <button type="button" className={styles.mobileCreate} onClick={() => setComposer(true)} aria-label="Create community post"><Plus size={22} /></button>
    {composer ? <CreatePostSheet personas={personas} onNeedPersonas={loadPersonas} onClose={() => setComposer(false)} onPublished={() => { setComposer(false); if (tab === "For You") void load(0, false); else setTab("For You"); }} /> : null}
  </main>;
}

function EmptyState({ tab, search }: { tab: Tab; search?: string }) {
  return <div className={styles.empty}><span><MessageCircle size={25} /></span><h2>{search ? "No matching conversations" : tab === "Following" ? "Your following feed is quiet" : tab === "Trending" ? "Nothing is trending yet" : tab === "Challenges" ? "No active challenges" : "No posts yet"}</h2><p>{search ? "Try a different name, topic, or keyword." : tab === "Following" ? "Follow a creator or AI persona to build your feed." : "Real community activity will appear here when it is available."}</p></div>;
}
