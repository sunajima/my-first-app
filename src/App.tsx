import { useState, type FormEvent } from 'react';
import { categories, localDate, readEntries, STORAGE_KEY, summarize, validEntry, type Entry } from './data';
const yen = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
const colors = ['#24836b','#e9aa57','#7e99c3','#d77d80','#9c8dbc','#68b4b1','#adad65','#a4acb5'];
export default function App() {
  const [initial] = useState(() => { try { return { entries: readEntries(), failed: false }; } catch { return { entries: [] as Entry[], failed: true }; } });
  const [entries, setEntries] = useState(initial.entries);
  const [error, setError] = useState(initial.failed ? '保存データを読み込めませんでした。元のデータを保護するため登録・削除を停止しています。ブラウザの保存設定や保存データを確認してから再読み込みしてください。' : '');
  const [notice, setNotice] = useState('');
  const [month, setMonth] = useState(localDate().slice(0,7));
  const [type, setType] = useState<Entry['type']>('expense');
  const [date, setDate] = useState(localDate());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories.expense[0]);
  const [memo, setMemo] = useState('');
  const [filter, setFilter] = useState('すべて');
  const monthly = entries.filter(e=>e.date.startsWith(month));
  const totals = summarize(monthly);
  const breakdown = categories.expense.map((name,i)=>({name, color: colors[i], total: monthly.filter(e=>e.type==='expense' && e.category===name).reduce((s,e)=>s+e.amount,0)})).filter(c=>c.total>0);
  let offset = 0;
  const gradient = breakdown.map(c=>{const start=offset;offset+=c.total/totals.expense*100;return `${c.color} ${start}% ${offset}%`;}).join(',');
  const visible = monthly.filter(e=>filter==='すべて' || e.category===filter).sort((a,b)=>b.date.localeCompare(a.date));
  function persist(next: Entry[]) {
    if (initial.failed) return false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setEntries(next); setError(''); return true; }
    catch { setError('保存できませんでした。ブラウザの保存容量や設定を確認してください。変更は反映されていません。'); return false; }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const entry: Entry = { id: crypto.randomUUID(), type, date, amount: Number(amount), category, memo: memo.trim() };
    if (!validEntry(entry)) { setError('日付と、1〜999,999,999円の整数の金額を入力してください。'); return; }
    if (persist([...entries, entry])) { setAmount(''); setMemo(''); setMonth(date.slice(0,7)); setFilter('すべて'); setNotice('記録を保存しました。'); }
  }
  return <div className="app">
    <header className="header"><a className="brand" href="./"><span className="brand-icon">¥</span>こつこつ<span className="brand-sub">家計簿</span></a><span className="local-badge">● このブラウザに保存</span></header>
    <main>
      <div className="page-heading"><div><p className="eyebrow">MY HOUSEHOLD BOOK</p><h1>暮らしのお金を、ひと目で。</h1><p className="subtitle">毎日のこつこつが、これからの安心に。</p></div><label className="month-label">表示する月<input aria-label="表示する月" type="month" value={month} onChange={e=>{if(e.target.value) {setMonth(e.target.value);setFilter('すべて');}}} required /></label></div>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="sr-only" role="status">{notice}</div>
      <section className="summary" aria-label="月ごとの収支合計">
        <div className="balance"><span>今月の収支</span><strong>{yen(totals.balance)}</strong><small>{month.replace('-','年')}月の収入 − 支出</small></div>
        <div><span><b className="arrow income-text">↙</b> 収入合計</span><strong className="income-text">{yen(totals.income)}</strong><small>{monthly.filter(e=>e.type==='income').length}件の記録</small></div>
        <div><span><b className="arrow expense-text">↗</b> 支出合計</span><strong>{yen(totals.expense)}</strong><small>{monthly.filter(e=>e.type==='expense').length}件の記録</small></div>
      </section>
      <div className="workspace">
        <section className="card form-card"><h2><span className="section-icon">＋</span>収入・支出を記録</h2><p className="section-description">今日のお金の動きを残しましょう。</p>
          <form onSubmit={submit}>
            <fieldset className="type-switch"><legend className="sr-only">記録の種類</legend>{(['expense','income'] as const).map(t=><label key={t} className={type===t?'selected':''}><input type="radio" name="type" value={t} checked={type===t} onChange={()=>{setType(t);setCategory(categories[t][0]);}}/>{t==='expense'?'支出':'収入'}</label>)}</fieldset>
            <label>日付<input type="date" value={date} onChange={e=>setDate(e.target.value)} required /></label>
            <label>金額<span className="amount-input"><input aria-label="金額" type="number" placeholder="0" min="1" max="999999999" step="1" value={amount} onChange={e=>setAmount(e.target.value)} required inputMode="numeric"/><span>円</span></span></label>
            <label>カテゴリ<select value={category} onChange={e=>setCategory(e.target.value)}>{categories[type].map(c=><option key={c}>{c}</option>)}</select></label>
            <label>メモ <span className="optional">任意</span><input placeholder="例：スーパーでお買い物" value={memo} onChange={e=>setMemo(e.target.value)} maxLength={100}/></label>
            <button className="primary" type="submit" disabled={initial.failed}>＋ 記録を保存する</button>
            <p className="save-note">データはお使いのブラウザに保存されます。</p>
          </form>
        </section>
        <div className="right-column">
          <section className="card chart-card"><div className="section-heading"><h2>支出の内訳</h2><span className="muted">カテゴリ別</span></div>
            {breakdown.length ? <div className="chart-content"><div className="donut" role="img" aria-label={`支出合計${yen(totals.expense)}。${breakdown.map(c=>`${c.name}${yen(c.total)}`).join('、')}`} style={{background:`conic-gradient(${gradient})`}}><div><span>支出合計</span><strong>{yen(totals.expense)}</strong></div></div><ul className="legend">{breakdown.map(c=><li key={c.name}><span className="category-name"><i style={{background:c.color}}/>{c.name}</span><strong>{yen(c.total)}</strong><span className="percentage">{Math.round(c.total/totals.expense*100)}%</span></li>)}</ul></div> : <div className="empty-chart"><div className="donut empty-donut"><div><span>支出合計</span><strong>¥0</strong></div></div><p>支出を登録すると、ここに内訳が表示されます。</p></div>}
          </section>
          <section className="card history"><div className="section-heading"><h2>今月の記録 <span className="count">{monthly.length}件</span></h2><label className="filter"><span className="sr-only">カテゴリで絞り込み</span><select value={filter} onChange={e=>setFilter(e.target.value)}><option>すべて</option>{Array.from(new Set([...categories.expense,...categories.income])).map(c=><option key={c}>{c}</option>)}</select></label></div>
            {visible.length ? <ul className="entries">{visible.map(e=><li key={e.id}><span className={`entry-icon ${e.type}`}>{e.type==='income'?'↙':'↗'}</span><div className="entry-description"><strong>{e.memo || e.category}</strong><span>{e.date.slice(5).replace('-','/')}<span className="tag">{e.category}</span></span></div><strong className={`entry-amount ${e.type==='income'?'income-text':''}`}>{e.type==='income'?'+':'−'}{yen(e.amount)}</strong><button type="button" className="delete" aria-label={`${e.date} ${e.memo || e.category} ${e.amount}円を削除`} onClick={()=>{if(window.confirm('この記録を削除しますか？')) {if(persist(entries.filter(x=>x.id!==e.id)))setNotice('記録を削除しました。');}}} disabled={initial.failed}>×</button></li>)}</ul> : <div className="empty-history"><span>☷</span><p>{monthly.length?'このカテゴリの記録はありません。':'まだ記録がありません。'}</p><small>収入や支出を登録して、家計簿をはじめましょう。</small></div>}
          </section>
        </div>
      </div>
      <footer>こつこつ家計簿 <span>·</span> あなたの暮らしに、ちょうどいい家計簿。<p>保存はこのブラウザ・端末のみです。ブラウザのデータを消すと記録も削除されます。</p></footer>
    </main>
  </div>;
}
