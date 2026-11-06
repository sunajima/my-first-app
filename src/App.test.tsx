import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { localDate, readEntries, STORAGE_KEY, summarize, validEntry } from './data';
beforeEach(()=>{localStorage.clear();});
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('家計簿',()=>{
 it('収入と支出を保存し、再表示・月切替・カテゴリ絞込・削除ができる',async()=>{
  const user=userEvent.setup();
  const view=render(<App/>);
  await user.type(screen.getByLabelText('金額'),'1200');
  await user.type(screen.getByLabelText(/メモ/),'お昼ごはん');
  await user.click(screen.getByRole('button',{name:/記録を保存する/}));
  expect(readEntries()).toHaveLength(1);
  expect(screen.getByRole('img').getAttribute('aria-label')).toContain('食費￥1,200');
  await user.click(screen.getByRole('radio',{name:'収入'}));
  await user.type(screen.getByLabelText('金額'),'200000');
  await user.click(screen.getByRole('button',{name:/記録を保存する/}));
  expect(summarize(readEntries())).toEqual({income:200000,expense:1200,balance:198800});
  view.unmount();render(<App/>);
  expect(screen.getByText('お昼ごはん')).toBeTruthy();
  await user.selectOptions(screen.getByLabelText('カテゴリで絞り込み'),'給与');
  expect(screen.queryByText('お昼ごはん')).toBeNull();
  await user.selectOptions(screen.getByLabelText('カテゴリで絞り込み'),'すべて');
  fireEvent.change(screen.getByLabelText('表示する月'),{target:{value:'2000-01'}});
  expect(screen.queryByText('お昼ごはん')).toBeNull();
  fireEvent.change(screen.getByLabelText('表示する月'),{target:{value:localDate().slice(0,7)}});
  vi.spyOn(window,'confirm').mockReturnValue(false);
  await user.click(screen.getByRole('button',{name:/お昼ごはん.*削除/}));
  expect(readEntries()).toHaveLength(2);
  vi.spyOn(window,'confirm').mockReturnValue(true);
  await user.click(screen.getByRole('button',{name:/お昼ごはん.*削除/}));
  expect(readEntries()).toHaveLength(1);
  expect(screen.queryByText('お昼ごはん')).toBeNull();
 });
 it('破損データを上書きしない',()=>{
  localStorage.setItem(STORAGE_KEY,'broken');render(<App/>);
  expect(screen.getByRole('alert').textContent).toContain('読み込めません');
  expect((screen.getByRole('button',{name:/記録を保存する/}) as HTMLButtonElement).disabled).toBe(true);
  expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
 });
 it('保存失敗を通知し、未保存の記録を表示しない',async()=>{
  const user=userEvent.setup();render(<App/>);
  vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
  await user.type(screen.getByLabelText('金額'),'500');
  await user.click(screen.getByRole('button',{name:/記録を保存する/}));
  expect(screen.getByRole('alert').textContent).toContain('保存できません');
  expect(screen.getByText('まだ記録がありません。')).toBeTruthy();
 });
 it('不正な日付・金額・カテゴリを拒否する',()=>{
  const entry={id:'test',type:'expense',date:'2026-11-06',amount:100,category:'食費',memo:''};
  expect(validEntry(entry)).toBe(true);
  for(const change of [{amount:0},{amount:-1},{amount:1.5},{amount:1000000000},{date:'2026-02-30'},{category:'不明'}])expect(validEntry({...entry,...change})).toBe(false);
 });
});
