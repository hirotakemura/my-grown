import { useState } from 'react';
import { CATEGORIES, STORE_LABEL, type Category, type MealItem, type Product, type Store } from '../types';
import { deleteProduct, productToItem, saveProduct } from '../lib/actions';
import { newId } from '../db';
import { Sheet } from './Sheet';

interface Props {
  product?: Product; // 未指定なら新規追加
  defaultCategory?: Category;
  defaultStore?: Store;
  /** 指定すると「手入力で食事に追加」モード（商品として登録するかは選べる） */
  onAddToMeal?: (item: MealItem) => void;
  onClose: () => void;
}

const STORES: Store[] = ['lawson', 'seven', 'common', 'other'];

function NumInput({ label, value, set }: { label: string; value: string; set: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" inputMode="decimal" type="number" min={0} step="0.1" value={value} onChange={(e) => set(e.target.value)} />
    </label>
  );
}

export function ProductEditor({ product, defaultCategory, defaultStore, onAddToMeal, onClose }: Props) {
  const manual = !!onAddToMeal;
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState<Category>(product?.category ?? defaultCategory ?? (manual ? '外食・定食' : 'その他'));
  const [store, setStore] = useState<Store>(product?.store ?? defaultStore ?? (manual ? 'other' : 'lawson'));
  const [kcal, setKcal] = useState(product ? String(product.kcal) : '');
  const [protein, setProtein] = useState(product ? String(product.protein) : '');
  const [fat, setFat] = useState(product ? String(product.fat) : '');
  const [carbs, setCarbs] = useState(product ? String(product.carbs) : '');
  const [register, setRegister] = useState(false);

  const num = (v: string) => (v === '' ? 0 : Number(v));
  const valid = name.trim() !== '' && kcal !== '' && protein !== '' && [kcal, protein, fat, carbs].every((v) => num(v) >= 0);
  // 入力した P・F・C から計算したカロリー（パッケージの表示と大きくずれていたら入力ミスの可能性）
  const calc = num(protein) * 4 + num(fat) * 9 + num(carbs) * 4;

  const build = (): Product => {
    const values = { kcal: num(kcal), protein: num(protein), fat: num(fat), carbs: num(carbs) };
    const changed = !product || (Object.keys(values) as (keyof typeof values)[]).some((k) => product[k] !== values[k]);
    return {
      id: product?.id ?? newId(),
      name: name.trim(),
      category,
      store,
      ...values,
      // パッケージの数値で上書きしたら「目安」を外す
      estimate: product ? product.estimate && !changed : false,
      favorite: product?.favorite ?? false,
      useCount: product?.useCount ?? 0,
    };
  };

  const save = async () => {
    if (!valid) return;
    const p = build();
    if (manual) {
      if (register) {
        await saveProduct(p);
        onAddToMeal(productToItem(p, 1));
      } else {
        const { productId: _omit, ...item } = productToItem(p, 1);
        onAddToMeal(item);
      }
    } else {
      await saveProduct(p);
    }
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
      title={manual ? '手入力で追加（外食など）' : product ? '商品を編集' : '商品を追加'}
      onClose={onClose}
      short
      footer={
        <div className="row">
          {product && <button className="btn danger" onClick={remove}>削除</button>}
          <button className="btn primary grow" disabled={!valid} onClick={save}>{manual ? '選択に追加' : '保存'}</button>
        </div>
      }
    >
      <label className="field">
        <span>{manual ? '食べたもの' : '商品名'}</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={manual ? '例：会社近くの定食屋 唐揚げ定食' : '例：サラダチキン ハーブ'} />
      </label>
      {(!manual || register) && (
        <div className="grid2">
          <label className="field">
            <span>買える場所</span>
            <select className="input" value={store} onChange={(e) => setStore(e.target.value as Store)}>
              {STORES.map((s) => <option key={s} value={s}>{STORE_LABEL[s]}</option>)}
            </select>
          </label>
          <label className="field">
            <span>カテゴリ</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="grid2">
        <NumInput label="エネルギー（kcal）" value={kcal} set={setKcal} />
        <NumInput label="たんぱく質（g）" value={protein} set={setProtein} />
        <NumInput label="脂質（g）" value={fat} set={setFat} />
        <NumInput label="炭水化物（g）" value={carbs} set={setCarbs} />
      </div>
      {kcal !== '' && calc > 0 && Math.abs(calc - num(kcal)) > Math.max(40, num(kcal) * 0.2) && (
        <p className="muted">P・F・Cから計算すると約{Math.round(calc)}kcalです。数字を確かめてください。</p>
      )}
      {manual && (
        <label className="row" style={{ minHeight: 44, cursor: 'pointer' }}>
          <input type="checkbox" checked={register} onChange={(e) => setRegister(e.target.checked)} style={{ width: 22, height: 22 }} />
          <span>次回も選べるように商品として登録する</span>
        </label>
      )}
      {manual && <p className="muted">外食はお店のサイトの栄養成分表を見るか、近いメニューの数字で大丈夫です。</p>}
      {product?.estimate && (
        <p className="note">今の数値は「目安」です。パッケージの栄養成分表示の数字を入れて保存すると、目安の表示が消えます。</p>
      )}
    </Sheet>
  );
}
