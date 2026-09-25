import { useState } from 'react';
import { CATEGORIES, type Category, type Product } from '../types';
import { deleteProduct, saveProduct } from '../lib/actions';
import { newId } from '../db';
import { Sheet } from './Sheet';

interface Props {
  product?: Product; // 未指定なら新規追加
  defaultCategory?: Category;
  onClose: () => void;
}

export function ProductEditor({ product, defaultCategory, onClose }: Props) {
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<Category>(product?.category ?? defaultCategory ?? 'その他');
  const [kcal, setKcal] = useState(product ? String(product.kcal) : '');
  const [protein, setProtein] = useState(product ? String(product.protein) : '');

  const k = Number(kcal);
  const pr = Number(protein);
  const valid = name.trim() !== '' && kcal !== '' && protein !== '' && k >= 0 && pr >= 0;

  const save = async () => {
    if (!valid) return;
    const changedNumbers = !product || product.kcal !== k || product.protein !== pr;
    await saveProduct({
      id: product?.id ?? newId(),
      name: name.trim(),
      category,
      kcal: k,
      protein: pr,
      // パッケージの数値で上書きしたら「目安」を外す
      estimate: product ? product.estimate && !changedNumbers : false,
      favorite: product?.favorite ?? false,
      useCount: product?.useCount ?? 0,
    });
    onClose();
  };

  const remove = async () => {
    if (product && window.confirm(`「${product.name}」を削除しますか？\n（これまでの食事の記録は残ります）`)) {
      await deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <Sheet
      title={product ? '商品を編集' : '商品を追加'}
      onClose={onClose}
      short
      footer={
        <div className="row">
          {product && <button className="btn danger" onClick={remove}>削除</button>}
          <button className="btn primary grow" disabled={!valid} onClick={save}>保存</button>
        </div>
      }
    >
      <label className="field">
        <span>商品名</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：サラダチキン ハーブ" />
      </label>
      <label className="field">
        <span>カテゴリ</span>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <div className="grid2">
        <label className="field">
          <span>エネルギー（kcal）</span>
          <input className="input" inputMode="decimal" type="number" min={0} value={kcal} onChange={(e) => setKcal(e.target.value)} />
        </label>
        <label className="field">
          <span>たんぱく質（g）</span>
          <input className="input" inputMode="decimal" type="number" min={0} step="0.1" value={protein} onChange={(e) => setProtein(e.target.value)} />
        </label>
      </div>
      {product?.estimate && (
        <p className="note">今の数値は「目安」です。パッケージの栄養成分表示の数字を入れて保存すると、目安の表示が消えます。</p>
      )}
    </Sheet>
  );
}
