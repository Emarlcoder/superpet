'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  api,
  ApiError,
  media,
  money,
  type Product,
  type Purchase,
  type Store,
} from '../lib/api';

type Taxonomy = {
  id: string;
  kind: 'category' | 'brand';
  name: string;
  slug: string;
  active: boolean;
  version: number;
};
type Session = {
  id: string;
  username: string;
  csrfToken: string;
  operationEpoch: string;
  expiresAt: string;
  lastActivityAt: string;
};
type Run = <T = unknown>(
  path: string,
  body?: unknown,
  method?: string,
) => Promise<T>;
function Form({
  onSubmit,
  children,
}: {
  onSubmit: (data: FormData) => Promise<void>;
  children: ReactNode;
}) {
  const [formError, setFormError] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFormError('');
        const data = new FormData(e.currentTarget);
        void Promise.resolve()
          .then(() => onSubmit(data))
          .catch((error) => setFormError((error as Error).message));
      }}
    >
      {children}
      {formError && (
        <p role="alert" className="error">
          {formError}
        </p>
      )}
    </form>
  );
}
const value = (f: FormData, key: string) => String(f.get(key) ?? '');
const pesos = (minor: string) => {
  const n = BigInt(minor);
  return `${n / 100n}.${(n % 100n).toString().padStart(2, '0')}`;
};
const cents = (amount: string) => {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(amount))
    throw new Error('Ingresá un importe en pesos, con hasta dos decimales.');
  const [whole, decimal = ''] = amount.replace(',', '.').split('.');
  return (BigInt(whole!) * 100n + BigInt(decimal.padEnd(2, '0'))).toString();
};
function PriceField({
  name,
  label,
  minor = '',
  required = true,
}: {
  name: string;
  label: string;
  minor?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        inputMode="decimal"
        defaultValue={minor ? pesos(minor) : ''}
        required={required}
        pattern="[0-9]+([.,][0-9]{1,2})?"
        placeholder="0,00"
      />
    </label>
  );
}
function NewPassword({ name = 'password' }: { name?: string }) {
  const confirmation = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false),
    [password, setPassword] = useState('');
  return (
    <>
      <label>
        Nueva contraseña (8–128 caracteres)
        <input
          name={name}
          type={visible ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            confirmation.current?.setCustomValidity(
              confirmation.current.value === e.target.value
                ? ''
                : 'Las contraseñas no coinciden.',
            );
          }}
          autoComplete="new-password"
          required
          maxLength={256}
        />
      </label>
      <label>
        Repetir contraseña
        <input
          name={name + 'Confirm'}
          ref={confirmation}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          onChange={(e) =>
            e.target.setCustomValidity(
              e.target.value === password
                ? ''
                : 'Las contraseñas no coinciden.',
            )
          }
        />
      </label>
      <button
        type="button"
        className="secondary"
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Ocultar' : 'Mostrar'} contraseña
      </button>
      <small>
        Una frase larga y poco predecible es más fácil de recordar. Podés pegar
        desde tu gestor de contraseñas.
      </small>
    </>
  );
}
function Field({
  name,
  label,
  type = 'text',
  defaultValue = '',
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string | undefined;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={type === 'number' ? '1' : undefined}
      />
    </label>
  );
}
export function Admin() {
  const [session, setSession] = useState<Session | null>(null),
    [checking, setChecking] = useState(true),
    [tab, setTab] = useState('purchases'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const pending = useRef(new Map<string, string>());
  useEffect(() => {
    if (!session) return;
    const poll = setInterval(() => {
      api<Session>('/auth/me')
        .then(setSession)
        .catch((e) => {
          if (e instanceof ApiError && e.status === 401) setSession(null);
        });
    }, 60000);
    return () => {
      clearInterval(poll);
    };
  }, [session]);
  useEffect(() => {
    api<Session>('/auth/me')
      .then(setSession)
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  const run = useCallback<Run>(
    async (path, body, method = 'POST') => {
      setBusy(true);
      setError('');
      setNotice('');
      let serialized = JSON.stringify(body);
      if (body instanceof FormData) {
        const fields = [];
        for (const [name, value] of body.entries())
          fields.push([
            name,
            typeof value === 'string'
              ? value
              : Array.from(
                  new Uint8Array(
                    await crypto.subtle.digest(
                      'SHA-256',
                      await value.arrayBuffer(),
                    ),
                  ),
                )
                  .map((n) => n.toString(16).padStart(2, '0'))
                  .join(''),
          ]);
        serialized = JSON.stringify(fields);
      }
      const signature = path + method + serialized;
      const key = pending.current.get(signature) ?? crypto.randomUUID();
      pending.current.set(signature, key);
      try {
        const result = await api(path, {
          method,
          headers: {
            'X-CSRF-Token': session?.csrfToken ?? '',
            'X-Operation-Epoch': session?.operationEpoch ?? '',
            'Idempotency-Key': key,
          },
          ...(body !== undefined
            ? { body: body instanceof FormData ? body : JSON.stringify(body) }
            : {}),
        });
        pending.current.delete(signature);
        setNotice('Operación guardada.');
        setSession((current) =>
          current
            ? { ...current, lastActivityAt: new Date().toISOString() }
            : null,
        );
        return result as never;
      } catch (e) {
        if (e instanceof ApiError) {
          if (e.status === 401) setSession(null);
          if (
            e.status < 500 &&
            !['RETRY_SAME_ATTEMPT', 'IDEMPOTENCY_IN_PROGRESS'].includes(e.code)
          )
            pending.current.delete(signature);
        }
        setError((e as Error).message);
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [session],
  );
  const safely = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      /* run surfaces errors */
    }
  };
  if (checking)
    return (
      <main className="auth-page">
        <p role="status">Comprobando sesión…</p>
      </main>
    );
  if (!session)
    return (
      <main className="auth-page">
        <Link href="/">SuperPet</Link>
        <h1 className="page-title">Administración</h1>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Form
          onSubmit={async (f) => {
            setBusy(true);
            setError('');
            try {
              const csrf = await api<{ csrfToken: string }>('/auth/csrf', {
                method: 'POST',
              });
              await api('/auth/login', {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrf.csrfToken },
                body: JSON.stringify({
                  username: value(f, 'username'),
                  password: value(f, 'password'),
                }),
              });
              setSession(await api<Session>('/auth/me'));
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Usuario
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          <button disabled={busy}>
            {busy ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </Form>
        <Link href="/admin/recuperar">Olvidé mi contraseña</Link>
      </main>
    );
  return (
    <div className="admin-shell">
      <aside>
        <Link href="/" className="admin-brand">
          SuperPet
        </Link>
        <p>Administración</p>
        <nav aria-label="Administración">
          {[
            ['purchases', 'Compras pendientes'],
            ['catalog', 'Catálogo'],
            ['inventory', 'Inventario'],
            ['store', 'Configuración'],
            ['security', 'Seguridad'],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? 'page' : undefined}
              onClick={() => {
                setTab(key!);
                setError('');
                setNotice('');
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          className="secondary"
          onClick={() =>
            safely(async () => {
              await run('/auth/logout');
              setSession(null);
            })
          }
        >
          Cerrar sesión
        </button>
      </aside>
      <main className="admin-main">
        <div className="admin-top">
          <span>{session.username}</span>
          <span>Gestión de SuperPet</span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <fieldset disabled={busy} className="workspace-fieldset">
          {tab === 'catalog' && <CatalogAdmin run={run} report={setError} />}{' '}
          {tab === 'inventory' && (
            <InventoryAdmin run={run} report={setError} />
          )}{' '}
          {tab === 'purchases' && (
            <PurchasesAdmin run={run} report={setError} />
          )}{' '}
          {tab === 'store' && <SettingsAdmin run={run} report={setError} />}{' '}
          {tab === 'security' && (
            <>
              <h1 className="page-title">Cambiar contraseña</h1>
              <p>
                Usá una frase de 8 a 128 caracteres. Después deberás iniciar
                sesión nuevamente.
              </p>
              <Form
                onSubmit={(f) =>
                  safely(async () => {
                    if (value(f, 'new') !== value(f, 'newConfirm')) {
                      setError('Las contraseñas no coinciden.');
                      return;
                    }
                    await run('/auth/password/change', {
                      currentPassword: value(f, 'current'),
                      newPassword: value(f, 'new'),
                    });
                    setSession(null);
                  })
                }
              >
                <Field
                  name="current"
                  label="Contraseña actual"
                  type="password"
                />
                <NewPassword name="new" />
                <button>Cambiar contraseña</button>
              </Form>
            </>
          )}
        </fieldset>
        {busy && <p role="status">Guardando…</p>}
      </main>
    </div>
  );
}

function CatalogAdmin({
  run,
  report,
}: {
  run: Run;
  report: (s: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]),
    [tax, setTax] = useState<Taxonomy[]>([]),
    [selected, setSelected] = useState<Product | null>(null);
  const load = useCallback(async () => {
    const [p, t] = await Promise.all([
      api<{ items: Product[] }>('/admin/products'),
      api<Taxonomy[]>('/admin/taxonomies'),
    ]);
    setProducts(p.items);
    setTax(t);
    setSelected((current) => p.items.find((p) => p.id === current?.id) ?? null);
  }, []);
  useEffect(() => {
    load().catch((e) => report(e.message));
  }, [load, report]);
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      report((e as Error).message);
    }
  };
  return (
    <>
      <h1 className="page-title">Catálogo</h1>
      <div className="split">
        <div>
          <button className="secondary" onClick={() => setSelected(null)}>
            Nuevo producto
          </button>
          {products.map((p) => (
            <button
              className="list-button"
              key={p.id}
              onClick={() => setSelected(p)}
            >
              <strong>{p.name}</strong>
              <span>
                {p.status === 'published'
                  ? 'Publicado'
                  : p.status === 'draft'
                    ? 'Borrador'
                    : 'Archivado'}{' '}
                · {p.skus.length} presentaciones
              </span>
            </button>
          ))}
        </div>
        <section key={selected?.id ?? 'new'}>
          <h2>{selected ? 'Editar producto' : 'Crear producto'}</h2>
          <Form
            onSubmit={(f) =>
              act(() =>
                run(
                  selected
                    ? '/admin/products/' + selected.id
                    : '/admin/products',
                  {
                    name: value(f, 'name'),
                    description: value(f, 'description'),
                    categoryId: value(f, 'category'),
                    brandId: value(f, 'brand') || null,
                    species: f.getAll('species'),
                    ...(selected ? { expectedVersion: selected.version } : {}),
                  },
                  selected ? 'PATCH' : 'POST',
                ),
              )
            }
          >
            <Field name="name" label="Nombre" defaultValue={selected?.name} />
            <label>
              Descripción
              <textarea
                name="description"
                defaultValue={selected?.description}
              />
            </label>
            <label>
              Categoría
              <select
                name="category"
                defaultValue={selected?.categoryId}
                required
              >
                {tax
                  .filter((t) => t.kind === 'category' && t.active)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Marca
              <select name="brand" defaultValue={selected?.brandId ?? ''}>
                <option value="">Sin marca</option>
                {tax
                  .filter((t) => t.kind === 'brand' && t.active)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="checkboxes">
              <label>
                <input
                  type="checkbox"
                  name="species"
                  value="dog"
                  defaultChecked={!selected || selected.species.includes('dog')}
                />
                Perros
              </label>
              <label>
                <input
                  type="checkbox"
                  name="species"
                  value="cat"
                  defaultChecked={selected?.species.includes('cat')}
                />
                Gatos
              </label>
            </div>
            <button>Guardar producto</button>
          </Form>
          {selected && (
            <>
              <div className="actions">
                <button
                  onClick={() =>
                    act(() =>
                      run('/admin/products/' + selected.id + '/publish', {
                        expectedVersion: selected.version,
                      }),
                    )
                  }
                >
                  Publicar
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    act(() =>
                      run('/admin/products/' + selected.id + '/draft', {
                        expectedVersion: selected.version,
                      }),
                    )
                  }
                >
                  Pasar a borrador
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    act(() =>
                      run('/admin/products/' + selected.id + '/archive', {
                        expectedVersion: selected.version,
                      }),
                    )
                  }
                >
                  Archivar
                </button>
              </div>
              <h3>Presentaciones</h3>
              {selected.skus.map((s) => (
                <Form
                  key={s.id + ':' + s.version}
                  onSubmit={(f) =>
                    act(() =>
                      run(
                        '/admin/skus/' + s.id,
                        {
                          label: value(f, 'label'),
                          priceMinor: cents(value(f, 'price')),
                          active: f.get('active') === 'on',
                          expectedVersion: s.version,
                        },
                        'PATCH',
                      ),
                    )
                  }
                >
                  <Field
                    name="label"
                    label="Presentación"
                    defaultValue={s.label}
                  />
                  <PriceField
                    name="price"
                    label="Precio en pesos uruguayos"
                    minor={s.priceMinor}
                  />
                  <label>
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={s.active}
                    />
                    Activa
                  </label>
                  <button className="secondary">Guardar presentación</button>
                </Form>
              ))}
              <details>
                <summary>Agregar presentación</summary>
                <Form
                  onSubmit={(f) =>
                    act(() =>
                      run('/admin/products/' + selected.id + '/skus', {
                        code: value(f, 'code'),
                        label: value(f, 'label'),
                        saleUnit: value(f, 'unit'),
                        priceMinor: cents(value(f, 'price')),
                        netWeightGrams: value(f, 'weight') || null,
                      }),
                    )
                  }
                >
                  <Field name="code" label="Código SKU" />
                  <Field name="label" label="Presentación" />
                  <label>
                    Unidad de venta
                    <select name="unit">
                      <option value="unit">Unidad / bolsa cerrada</option>
                      <option value="kg">Kilo suelto</option>
                    </select>
                  </label>
                  <PriceField name="price" label="Precio en pesos uruguayos" />
                  <Field
                    name="weight"
                    label="Peso de bolsa en gramos (opcional)"
                    type="number"
                    required={false}
                  />
                  <button>Agregar presentación</button>
                </Form>
              </details>
              <h3>Fotos</h3>
              <div className="photo-grid">
                {selected.images.map((i, index) => (
                  <div key={i.id}>
                    <img src={media(i.variants[0]!.key)} alt={i.alt} />
                    <Form
                      onSubmit={(f) =>
                        act(() =>
                          run(
                            '/admin/products/' +
                              selected.id +
                              '/images/' +
                              i.id,
                            {
                              alt: value(f, 'alt'),
                              expectedVersion: selected.version,
                            },
                            'PATCH',
                          ),
                        )
                      }
                    >
                      <Field
                        name="alt"
                        label="Descripción"
                        defaultValue={i.alt}
                      />
                      <button className="secondary">Guardar descripción</button>
                    </Form>
                    {index > 0 && (
                      <button
                        className="secondary"
                        onClick={() =>
                          act(() =>
                            run(
                              '/admin/products/' +
                                selected.id +
                                '/images/order',
                              {
                                expectedVersion: selected.version,
                                imageIds: [
                                  i.id,
                                  ...selected.images
                                    .filter((photo) => photo.id !== i.id)
                                    .map((photo) => photo.id),
                                ],
                              },
                              'PATCH',
                            ),
                          )
                        }
                      >
                        Usar como principal
                      </button>
                    )}
                    <button
                      className="secondary"
                      onClick={() =>
                        act(() =>
                          run(
                            '/admin/products/' +
                              selected.id +
                              '/images/' +
                              i.id,
                            { expectedVersion: selected.version },
                            'DELETE',
                          ),
                        )
                      }
                    >
                      Quitar foto
                    </button>
                  </div>
                ))}
              </div>
              <Form
                onSubmit={(f) =>
                  act(() => {
                    f.set('expectedVersion', String(selected.version));
                    return run('/admin/products/' + selected.id + '/images', f);
                  })
                }
              >
                <label>
                  Foto (JPEG, PNG o WebP, hasta 4 MiB)
                  <input
                    type="file"
                    name="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <Field name="alt" label="Descripción de la foto" />
                <button>Subir foto</button>
              </Form>
            </>
          )}
        </section>
      </div>
      <details>
        <summary>Marcas y categorías</summary>
        <Form
          onSubmit={(f) =>
            act(() =>
              run('/admin/taxonomies', {
                kind: value(f, 'kind'),
                name: value(f, 'name'),
              }),
            )
          }
        >
          <label>
            Tipo
            <select name="kind">
              <option value="brand">Marca</option>
              <option value="category">Categoría</option>
            </select>
          </label>
          <Field name="name" label="Nombre" />
          <button>Crear</button>
        </Form>
        {tax.map((t) => (
          <p key={t.id}>
            {t.name}{' '}
            <button
              className="secondary"
              onClick={() =>
                act(() =>
                  run(
                    '/admin/taxonomies/' + t.id,
                    {
                      name: t.name,
                      active: !t.active,
                      expectedVersion: t.version,
                    },
                    'PATCH',
                  ),
                )
              }
            >
              {t.active ? 'Desactivar' : 'Activar'}
            </button>
          </p>
        ))}
      </details>
    </>
  );
}

type StockRow = {
  product: string;
  sku: {
    id: string;
    label: string;
    saleUnit: 'kg' | 'unit';
    productId: string;
    netWeightGrams: string | null;
  };
  stock: { skuId: string; quantity: string; version: number; minimum: string };
};
type Bulk = {
  active: boolean;
  id: string;
  sourceSkuId: string;
  targetSkuId: string;
  gramsPerBag: string;
  version: number;
};
function InventoryAdmin({
  run,
  report,
}: {
  run: Run;
  report: (s: string) => void;
}) {
  const [rows, setRows] = useState<StockRow[]>([]),
    [bulk, setBulk] = useState<Bulk[]>([]),
    [selected, setSelected] = useState(''),
    [history, setHistory] = useState<unknown[]>([]);
  const load = useCallback(async () => {
    const [r, b] = await Promise.all([
      api<StockRow[]>('/admin/stock'),
      api<Bulk[]>('/admin/bulk-configs'),
    ]);
    setRows(r);
    setBulk(b);
  }, []);
  useEffect(() => {
    load().catch((e) => report(e.message));
  }, [load, report]);
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      report((e as Error).message);
    }
  };
  const row = rows.find((r) => r.sku.id === selected);
  return (
    <>
      <h1 className="page-title">Inventario</h1>
      <p>
        El alimento suelto se registra en gramos. Las bolsas cerradas, en
        unidades.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Presentación</th>
              <th>Existencias</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku.id}>
                <td>{r.product}</td>
                <td>{r.sku.label}</td>
                <td>
                  {r.stock.quantity} {r.sku.saleUnit === 'kg' ? 'g' : 'un.'}
                  {BigInt(r.stock.quantity) <= BigInt(r.stock.minimum) && (
                    <strong className="stock-alert"> · Reponer</strong>
                  )}
                </td>
                <td>
                  <button
                    className="secondary"
                    onClick={() => {
                      setSelected(r.sku.id);
                      api<unknown[]>('/admin/stock/' + r.sku.id + '/movements')
                        .then(setHistory)
                        .catch((e) => report(e.message));
                    }}
                  >
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {row && (
        <section className="panel">
          <h2>
            {row.product} — {row.sku.label}
          </h2>
          <Form
            onSubmit={(f) =>
              act(() => {
                const mode = value(f, 'mode');
                return mode === 'initial' || mode === 'receipt'
                  ? run('/admin/inventory/receipts', {
                      kind: mode,
                      reason: value(f, 'reason'),
                      lines: [
                        {
                          skuId: row.sku.id,
                          quantity: value(f, 'quantity'),
                          expectedVersion: row.stock.version,
                        },
                      ],
                    })
                  : run('/admin/inventory/adjustments', {
                      skuId: row.sku.id,
                      expectedVersion: row.stock.version,
                      mode,
                      quantity: value(f, 'quantity'),
                      reason: value(f, 'reason'),
                    });
              })
            }
          >
            <label>
              Operación
              <select name="mode">
                <option value="count">Conteo físico</option>
                <option value="delta">Ajuste de diferencia (+ / −)</option>
                <option value="initial">Stock inicial</option>
                {row.sku.saleUnit === 'unit' && (
                  <option value="receipt">Reposición de unidades</option>
                )}
              </select>
            </label>
            <Field
              name="quantity"
              label={
                'Cantidad en ' +
                (row.sku.saleUnit === 'kg' ? 'gramos' : 'unidades')
              }
              type="number"
            />
            <Field name="reason" label="Motivo" />
            <button>Registrar movimiento</button>
          </Form>
          <details>
            <summary>Movimientos recientes</summary>
            <Form
              onSubmit={(f) =>
                act(() =>
                  run(
                    '/admin/stock/' + row.sku.id + '/minimum',
                    {
                      minimum: value(f, 'minimum'),
                      expectedVersion: row.stock.version,
                    },
                    'PATCH',
                  ),
                )
              }
            >
              <Field
                name="minimum"
                label={
                  'Avisar cuando queden esta cantidad de ' +
                  (row.sku.saleUnit === 'kg' ? 'gramos' : 'unidades')
                }
                type="number"
                defaultValue={row.stock.minimum}
              />
              <button>Guardar aviso</button>
            </Form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Operación</th>
                    <th>Diferencia</th>
                    <th>Saldo</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    history as Array<{
                      movement: {
                        id: string;
                        delta: string;
                        balanceAfter: string;
                        createdAt: string;
                      };
                      operation: { kind: string; reason: string };
                    }>
                  ).map((h) => (
                    <tr key={h.movement.id}>
                      <td>
                        {new Date(h.movement.createdAt).toLocaleString('es-UY')}
                      </td>
                      <td>{operationLabel(h.operation.kind)}</td>
                      <td>{h.movement.delta}</td>
                      <td>{h.movement.balanceAfter}</td>
                      <td>{h.operation.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
      <section className="panel">
        <h2>Abrir bolsas para venta suelta</h2>
        <details>
          <summary>Relaciones de fraccionamiento</summary>
          {bulk.map((b) => (
            <p key={b.id}>
              {rows.find((r) => r.sku.id === b.sourceSkuId)?.sku.label} →{' '}
              {rows.find((r) => r.sku.id === b.targetSkuId)?.sku.label} ·{' '}
              {b.gramsPerBag} g{' '}
              <button
                className="secondary"
                onClick={() =>
                  act(() =>
                    run(
                      '/admin/bulk-configs/' + b.id,
                      { active: !b.active, expectedVersion: b.version },
                      'PATCH',
                    ),
                  )
                }
              >
                {b.active ? 'Desactivar' : 'Activar'}
              </button>
            </p>
          ))}
        </details>
        <p>
          Registrá la apertura física: descuenta bolsas y suma gramos al
          alimento vinculado.
        </p>
        <Form
          onSubmit={(f) =>
            act(() => {
              const config = bulk.find((b) => b.id === value(f, 'config'));
              if (!config)
                throw new Error('Seleccioná una relación de fraccionamiento.');
              return run('/admin/bag-openings', {
                configId: config.id,
                expectedConfigVersion: config.version,
                bagCount: Number(value(f, 'count')),
              });
            })
          }
        >
          <label>
            Bolsa y alimento
            <select name="config" required>
              <option value="">Seleccionar</option>
              {bulk
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {rows.find((r) => r.sku.id === b.sourceSkuId)?.product} —{' '}
                    {rows.find((r) => r.sku.id === b.sourceSkuId)?.sku.label} (
                    {b.gramsPerBag} g)
                  </option>
                ))}
            </select>
          </label>
          <Field
            name="count"
            label="Cantidad de bolsas"
            type="number"
            defaultValue="1"
          />
          <button>Registrar apertura</button>
        </Form>
        <details>
          <summary>Vincular una bolsa con alimento suelto</summary>
          <Form
            onSubmit={(f) =>
              act(() => {
                const source = rows.find(
                  (r) => r.sku.id === value(f, 'source'),
                );
                return run('/admin/bulk-configs', {
                  sourceSkuId: value(f, 'source'),
                  targetSkuId: value(f, 'target'),
                  gramsPerBag: source?.sku.netWeightGrams ?? '0',
                });
              })
            }
          >
            <label>
              Bolsa cerrada
              <select name="source">
                {rows
                  .filter(
                    (r) => r.sku.saleUnit === 'unit' && r.sku.netWeightGrams,
                  )
                  .map((r) => (
                    <option key={r.sku.id} value={r.sku.id}>
                      {r.product} — {r.sku.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Alimento suelto del mismo producto
              <select name="target">
                {rows
                  .filter((r) => r.sku.saleUnit === 'kg')
                  .map((r) => (
                    <option key={r.sku.id} value={r.sku.id}>
                      {r.product} — {r.sku.label}
                    </option>
                  ))}
              </select>
            </label>
            <button>Guardar relación</button>
          </Form>
        </details>
      </section>
    </>
  );
}

function PurchasesAdmin({
  run,
  report,
}: {
  run: Run;
  report: (s: string) => void;
}) {
  const [orders, setOrders] = useState<Purchase[]>([]),
    [selected, setSelected] = useState<Purchase | null>(null),
    [status, setStatus] = useState('pending'),
    [products, setProducts] = useState<Product[]>([]),
    [newSale, setNewSale] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const load = useCallback(async () => {
    const data = await api<{ items: Purchase[]; nextOffset: number | null }>(
      '/admin/purchases' + (status ? '?status=' + status : ''),
    );
    setOrders(data.items);
    setNextOffset(data.nextOffset);
  }, [status]);
  useEffect(() => {
    load().catch((e) => report(e.message));
    api<{ items: Product[] }>('/admin/products')
      .then((p) => setProducts(p.items))
      .catch((e) => report(e.message));
  }, [load, report]);
  const show = async (id: string) =>
    setSelected(await api<Purchase>('/admin/purchases/' + id));
  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
      if (selected) await show(selected.id);
    } catch (e) {
      report((e as Error).message);
    }
  };
  return (
    <>
      <div className="section-title">
        <h1 className="page-title">Compras</h1>
        <button
          onClick={() => {
            setNewSale(!newSale);
            setSelected(null);
          }}
        >
          Nueva venta manual
        </button>
      </div>
      <label>
        Mostrar
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">Pendientes</option>
          <option value="completed">Realizadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="">Todas</option>
        </select>
      </label>
      {newSale && (
        <section className="panel">
          <h2>Registrar venta presencial o de WhatsApp</h2>
          <p>Si ya existe una pendiente web, usala para evitar duplicados.</p>
          <OrderLines
            products={products}
            submitLabel="Crear pendiente"
            onSubmit={(items, f) =>
              act(async () => {
                const order = await run<Purchase>('/admin/purchases', {
                  items: items.map(({ skuId, quantity }) => ({
                    skuId,
                    quantity,
                  })),
                  channel: value(f, 'channel'),
                  deliveryMode: value(f, 'deliveryMode'),
                  ...(value(f, 'customerName')
                    ? {
                        customer: {
                          name: value(f, 'customerName'),
                          phone: value(f, 'customerPhone'),
                        },
                      }
                    : {}),
                });
                setNewSale(false);
                await show(order.id);
              })
            }
          >
            <label>
              Canal
              <select name="channel">
                <option value="local">Local</option>
                <option value="whatsapp_manual">WhatsApp manual</option>
              </select>
            </label>
            <Field
              name="customerName"
              label="Nombre del cliente (opcional)"
              required={false}
            />
            <Field
              name="customerPhone"
              label="Teléfono del cliente (+598…)"
              required={false}
            />
            <label>
              Entrega
              <select name="deliveryMode">
                <option value="pickup">Retiro</option>
                <option value="shipping">Envío</option>
              </select>
            </label>
          </OrderLines>
        </section>
      )}
      <div className="orders-list">
        {!orders.length && <p>No hay compras en esta sección.</p>}
        {orders
          .filter((o) => !status || o.status === status)
          .map((o) => (
            <button
              className="list-button"
              key={o.id}
              onClick={() => show(o.id).catch((e) => report(e.message))}
            >
              <strong>
                {o.customerName ?? 'Venta de local'} ·{' '}
                {money(o.effectiveSubtotalMinor)}
              </strong>
              <span>
                {o.reference} · {new Date(o.createdAt).toLocaleString('es-UY')}
              </span>
            </button>
          ))}
      </div>
      {nextOffset !== null && (
        <button
          className="secondary"
          onClick={() =>
            api<{ items: Purchase[]; nextOffset: number | null }>(
              '/admin/purchases?offset=' +
                nextOffset +
                (status ? '&status=' + status : ''),
            )
              .then((data) => {
                setOrders([...orders, ...data.items]);
                setNextOffset(data.nextOffset);
              })
              .catch((e) => report(e.message))
          }
        >
          Cargar más compras
        </button>
      )}
      {selected && (
        <section className="panel" key={selected.id + ':' + selected.version}>
          <h2>Detalle de compra</h2>
          <p>{selected.reference}</p>
          <p>
            {selected.customerName} {selected.customerPhone} ·{' '}
            {selected.deliveryMode === 'pickup'
              ? 'Retiro'
              : 'Envío a coordinar'}{' '}
            ·{' '}
            {
              {
                pending: 'Pendiente',
                completed: 'Realizada',
                cancelled: 'Cancelada',
              }[selected.status]
            }
          </p>
          {selected.effectiveLines
            .filter((l) => l.quantity > 0)
            .map((l) => (
              <p key={l.effectiveLineId}>
                {l.name} — {l.label}: {l.quantity} {l.saleUnit} ×{' '}
                {money(l.unitPriceMinor)} = {money(l.lineTotalMinor)}
              </p>
            ))}
          <p>
            <strong>
              Subtotal vigente: {money(selected.effectiveSubtotalMinor)}
            </strong>
          </p>
          {selected.status === 'pending' ? (
            <>
              <button
                onClick={() =>
                  act(() =>
                    run('/admin/purchases/' + selected.id + '/complete', {
                      expectedVersion: selected.version,
                    }),
                  )
                }
              >
                Marcar realizada y descontar stock
              </button>
              <details>
                <summary>Editar pendiente</summary>
                <OrderLines
                  products={products}
                  initial={selected.lines}
                  submitLabel="Guardar pendiente"
                  onSubmit={(items, f) =>
                    act(() =>
                      run(
                        '/admin/purchases/' + selected.id,
                        {
                          items: items.map(({ skuId, quantity }) => ({
                            skuId,
                            quantity,
                          })),
                          expectedVersion: selected.version,
                          deliveryMode: value(f, 'deliveryMode'),
                          shippingMinor: value(f, 'shipping')
                            ? cents(value(f, 'shipping'))
                            : null,
                          notes: value(f, 'notes'),
                        },
                        'PATCH',
                      ),
                    )
                  }
                >
                  <label>
                    Entrega
                    <select
                      name="deliveryMode"
                      defaultValue={selected.deliveryMode}
                    >
                      <option value="pickup">Retiro</option>
                      <option value="shipping">Envío</option>
                    </select>
                  </label>
                  <PriceField
                    name="shipping"
                    label="Envío acordado en pesos (vacío = pendiente)"
                    minor={selected.shippingMinor ?? ''}
                    required={false}
                  />
                  <Field
                    name="notes"
                    label="Notas"
                    defaultValue={selected.notes}
                    required={false}
                  />
                </OrderLines>
              </details>
              <details>
                <summary>Cancelar pendiente</summary>
                <Form
                  onSubmit={(f) =>
                    act(() =>
                      run('/admin/purchases/' + selected.id + '/cancel', {
                        expectedVersion: selected.version,
                        reason: value(f, 'reason'),
                      }),
                    )
                  }
                >
                  <Field name="reason" label="Motivo" />
                  <button className="secondary">
                    Cancelar sin modificar stock
                  </button>
                </Form>
              </details>
            </>
          ) : selected.status === 'completed' ? (
            <>
              <CorrectionEditor
                selected={selected}
                products={products}
                run={run}
                act={act}
              />
              <details>
                <summary>Registrar devolución física</summary>
                <Form
                  onSubmit={(f) =>
                    act(() => {
                      const returnedQuantity = Number(value(f, 'returned')),
                        restockQuantity = Number(value(f, 'restock'));
                      return run(
                        '/admin/purchases/' + selected.id + '/returns',
                        {
                          expectedVersion: selected.version,
                          reason: value(f, 'reason'),
                          lines: [
                            {
                              effectiveLineId: value(f, 'line'),
                              returnedQuantity,
                              restockQuantity,
                              disposition:
                                restockQuantity === 0
                                  ? 'discard'
                                  : restockQuantity === returnedQuantity
                                    ? 'restock'
                                    : 'mixed',
                            },
                          ],
                        },
                      );
                    })
                  }
                >
                  <label>
                    Producto
                    <select name="line">
                      {selected.effectiveLines
                        .filter((l) => l.quantity > 0)
                        .map((l) => (
                          <option
                            key={l.effectiveLineId}
                            value={l.effectiveLineId}
                          >
                            {l.name} — {l.label} ({l.quantity} {l.saleUnit}{' '}
                            vendidos)
                          </option>
                        ))}
                    </select>
                  </label>
                  <Field
                    name="returned"
                    label="Cantidad devuelta"
                    type="number"
                  />
                  <Field
                    name="restock"
                    label="Cantidad que vuelve realmente al stock"
                    type="number"
                    defaultValue="0"
                  />
                  <Field name="reason" label="Motivo" />
                  <button>Registrar devolución</button>
                </Form>
              </details>
            </>
          ) : null}
          <details>
            <summary>Agregar nota al historial</summary>
            <Form
              onSubmit={(f) =>
                act(() =>
                  run('/admin/purchases/' + selected.id + '/notes', {
                    expectedVersion: selected.version,
                    note: value(f, 'note'),
                  }),
                )
              }
            >
              <Field name="note" label="Nota" />
              <button>Guardar nota</button>
            </Form>
          </details>
          <details>
            <summary>Historial original y cambios</summary>
            <h3>Registro original</h3>
            {selected.lines.map((l) => (
              <p key={l.effectiveLineId}>
                {l.name} — {l.label}: {l.quantity} × {money(l.unitPriceMinor)}
              </p>
            ))}
            <h3>Actividad</h3>
            {selected.events?.map((e) => (
              <p key={e.id}>
                <strong>{operationLabel(e.kind)}</strong> ·{' '}
                {new Date(e.createdAt).toLocaleString('es-UY')} {e.reason}
              </p>
            ))}
            {!!selected.returns?.length && (
              <>
                <h3>Devoluciones registradas</h3>
                {selected.returns.map((r, i) => (
                  <p key={i}>
                    {
                      selected.effectiveLines.find(
                        (l) => l.effectiveLineId === r.effectiveLineId,
                      )?.label
                    }
                    : {r.quantity}
                  </p>
                ))}
              </>
            )}
          </details>
        </section>
      )}
    </>
  );
}

type Desired = { skuId: string; quantity: number; unitPriceMinor: string };
const operationLabel = (kind: string) =>
  ({
    initial: 'Stock inicial',
    receipt: 'Reposición',
    adjustment: 'Ajuste',
    sale: 'Venta',
    bag_opening: 'Apertura de bolsas',
    return: 'Devolución',
    correction: 'Corrección',
    created: 'Compra creada',
    complete: 'Compra realizada',
    cancel: 'Compra cancelada',
    edited: 'Pendiente editada',
    record_correction: 'Corrección de registro',
    note: 'Nota',
  })[kind] ?? kind;
function OrderLines({
  products,
  initial = [],
  children,
  onSubmit,
  submitLabel,
  editPrices = false,
  onEdit,
}: {
  products: Product[];
  initial?: Array<{ skuId: string; quantity: number; unitPriceMinor: string }>;
  children?: ReactNode;
  onSubmit: (items: Desired[], f: FormData) => Promise<void>;
  submitLabel: string;
  editPrices?: boolean;
  onEdit?: () => void;
}) {
  const skus = products.flatMap((p) =>
    p.skus.map((s) => ({ ...s, name: p.name })),
  );
  const [lines, changeLines] = useState<Desired[]>(
    initial.map((l) => ({ ...l })),
  );
  const setLines = (next: Desired[]) => {
    changeLines(next);
    onEdit?.();
  };
  return (
    <Form
      onSubmit={(f) =>
        onSubmit(
          editPrices
            ? lines.map((l) => ({
                ...l,
                unitPriceMinor: cents(value(f, 'price:' + l.skuId)),
              }))
            : lines,
          f,
        )
      }
    >
      <label>
        Agregar presentación
        <select
          defaultValue=""
          onChange={(e) => {
            const s = skus.find((s) => s.id === e.target.value);
            if (s && !lines.some((l) => l.skuId === s.id))
              setLines([
                ...lines,
                { skuId: s.id, quantity: 1, unitPriceMinor: s.priceMinor },
              ]);
            e.target.value = '';
          }}
        >
          <option value="">Seleccionar producto</option>
          {skus.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.label}
            </option>
          ))}
        </select>
      </label>
      {lines.map((l) => (
        <div className="line-editor" key={l.skuId}>
          <strong>
            {skus.find((s) => s.id === l.skuId)?.name} —{' '}
            {skus.find((s) => s.id === l.skuId)?.label}
          </strong>
          <label>
            Cantidad
            <input
              type="number"
              min="1"
              max={
                skus.find((s) => s.id === l.skuId)?.saleUnit === 'kg' ? 5 : 999
              }
              step="1"
              required
              value={l.quantity}
              onChange={(e) =>
                setLines(
                  lines.map((x) =>
                    x === l ? { ...x, quantity: Number(e.target.value) } : x,
                  ),
                )
              }
            />
          </label>
          {editPrices ? (
            <PriceField
              name={'price:' + l.skuId}
              label="Precio en pesos"
              minor={l.unitPriceMinor}
            />
          ) : (
            <span>{money(l.unitPriceMinor)}</span>
          )}
          <button
            type="button"
            className="secondary"
            onClick={() => setLines(lines.filter((x) => x !== l))}
          >
            Quitar
          </button>
        </div>
      ))}
      {children}
      <button>{submitLabel}</button>
    </Form>
  );
}
function CorrectionEditor({
  selected,
  products,
  run,
  act,
}: {
  selected: Purchase;
  products: Product[];
  run: Run;
  act: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  const [preview, setPreview] = useState<{
      after: Purchase['lines'];
      differenceMinor: string;
      subtotalAfterMinor: string;
      stockDeltas: Array<{ skuId: string; delta: string }>;
    } | null>(null),
    [body, setBody] = useState<unknown>(null);
  return (
    <details onChange={() => setPreview(null)}>
      <summary>Corregir un registro equivocado</summary>
      <p>
        Corrige el registro original. Para productos entregados y luego
        devueltos, usá devolución física.
      </p>
      <OrderLines
        editPrices
        onEdit={() => setPreview(null)}
        products={products}
        initial={selected.effectiveLines.filter((l) => l.quantity > 0)}
        submitLabel="Previsualizar corrección"
        onSubmit={(desiredLines, f) =>
          act(async () => {
            const next = {
              expectedVersion: selected.version,
              reason: value(f, 'reason'),
              desiredLines,
            };
            setBody(next);
            setPreview(
              await run(
                '/admin/purchases/' + selected.id + '/corrections/preview',
                next,
              ),
            );
          })
        }
      >
        <Field name="reason" label="Motivo" />
      </OrderLines>
      {preview !== null && (
        <>
          <div className="notice">
            <h3>Así quedará la venta</h3>
            {preview.after.map((l) => (
              <p key={l.skuId}>
                {l.name} — {l.label}: {l.quantity} × {money(l.unitPriceMinor)}
              </p>
            ))}
            <p>
              Nuevo subtotal:{' '}
              <strong>{money(preview.subtotalAfterMinor)}</strong>. Diferencia:{' '}
              {money(preview.differenceMinor)}.
            </p>
            {preview.stockDeltas
              .filter((d) => d.delta !== '0')
              .map((d) => (
                <p key={d.skuId}>
                  Stock de{' '}
                  {
                    products
                      .flatMap((p) => p.skus)
                      .find((s) => s.id === d.skuId)?.label
                  }
                  : {BigInt(d.delta) > 0n ? '+' : ''}
                  {d.delta}{' '}
                  {products.flatMap((p) => p.skus).find((s) => s.id === d.skuId)
                    ?.saleUnit === 'kg'
                    ? 'gramos'
                    : 'unidades'}
                  .
                </p>
              ))}
            <p>La diferencia registrada no procesa cobros ni reembolsos.</p>
          </div>
          <button
            onClick={() =>
              act(() =>
                run('/admin/purchases/' + selected.id + '/corrections', body),
              )
            }
          >
            Confirmar esta corrección
          </button>
        </>
      )}
    </details>
  );
}
function SettingsAdmin({
  run,
  report,
}: {
  run: Run;
  report: (s: string) => void;
}) {
  const [store, setStore] = useState<Store | null>(null);
  useEffect(() => {
    api<Store>('/admin/store')
      .then(setStore)
      .catch((e) => report(e.message));
  }, [report]);
  if (!store) return <p>Cargando configuración…</p>;
  return (
    <>
      <h1 className="page-title">Configuración del local</h1>
      <Form
        onSubmit={async (f) => {
          try {
            await run(
              '/admin/store',
              {
                name: value(f, 'name'),
                whatsappNumber: value(f, 'whatsappNumber'),
                address: value(f, 'address'),
                hours: value(f, 'hours'),
                deliveryAreaText: value(f, 'deliveryAreaText'),
                deliveryConditions: value(f, 'deliveryConditions'),
                expectedVersion: store.version,
              },
              'PATCH',
            );
            setStore(await api<Store>('/admin/store'));
          } catch (e) {
            report((e as Error).message);
          }
        }}
      >
        <Field name="name" label="Nombre del local" defaultValue={store.name} />
        <Field
          name="whatsappNumber"
          label="WhatsApp internacional (+598…)"
          defaultValue={store.whatsappNumber}
          required={false}
        />
        <Field
          name="address"
          label="Dirección"
          defaultValue={store.address}
          required={false}
        />
        <Field
          name="hours"
          label="Horarios"
          defaultValue={store.hours}
          required={false}
        />
        <Field
          name="deliveryAreaText"
          label="Zona de envío"
          defaultValue={store.deliveryAreaText}
        />
        <Field
          name="deliveryConditions"
          label="Condiciones de envío"
          defaultValue={store.deliveryConditions}
          required={false}
        />
        <button>Guardar configuración</button>
      </Form>
    </>
  );
}

export function Recovery({
  reset = false,
  verifyEmail = false,
}: {
  reset?: boolean;
  verifyEmail?: boolean;
}) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const raw = useRef('');
  useEffect(() => {
    if (reset || verifyEmail) {
      if (location.hash) raw.current = location.hash.slice(1);
      history.replaceState(null, '', location.pathname);
    }
  }, [reset, verifyEmail]);
  return (
    <main className="auth-page">
      <Link href="/admin">Volver al acceso</Link>
      <h1 className="page-title">
        {verifyEmail
          ? 'Verificar correo'
          : reset
            ? 'Nueva contraseña'
            : 'Recuperar acceso'}
      </h1>
      <Form
        onSubmit={async (f) => {
          setBusy(true);
          try {
            if (reset && value(f, 'password') !== value(f, 'passwordConfirm'))
              throw new Error('Las contraseñas no coinciden.');
            const csrf = await api<{ csrfToken: string }>('/auth/csrf', {
              method: 'POST',
            });
            const result = await api<{ message?: string }>(
              verifyEmail
                ? '/auth/email/verify'
                : '/auth/password/' + (reset ? 'reset' : 'forgot'),
              {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrf.csrfToken },
                body: JSON.stringify(
                  verifyEmail
                    ? { token: raw.current }
                    : reset
                      ? {
                          token: raw.current,
                          newPassword: value(f, 'password'),
                        }
                      : { username: value(f, 'username') },
                ),
              },
            );
            setMessage(
              result.message ??
                (verifyEmail
                  ? 'Correo verificado. Ya podés usarlo para recuperar tu acceso.'
                  : 'Contraseña actualizada. Volvé a iniciar sesión.'),
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {verifyEmail ? (
          <p>
            Confirmá que esta casilla se use para recuperar el acceso
            administrativo.
          </p>
        ) : reset ? (
          <NewPassword />
        ) : (
          <Field name="username" label="Usuario" />
        )}
        <button disabled={busy}>
          {busy
            ? 'Procesando…'
            : verifyEmail
              ? 'Confirmar correo'
              : reset
                ? 'Guardar contraseña'
                : 'Solicitar enlace'}
        </button>
      </Form>
      <p role="status">{message}</p>
    </main>
  );
}
