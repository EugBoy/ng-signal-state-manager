import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, shareReplay, tap } from 'rxjs';
import { buildCacheKey } from './cache-key.utils';
import {
  CacheSnapshotEntry,
  QueryDataUpdater,
  QueryFetcher,
  QueryOptions,
  QueryRecord,
  QueryResult,
  QueryStatus,
} from './query.types';

/**
 * Central singleton service for query caching and state management powered by Angular Signals.
 *
 * Core capabilities:
 * - End-to-end deduplication of concurrent identical network calls (In-flight deduplication).
 * - Bridge `Observable<T>` into reactive Angular Signals (`Signal<T>`).
 * - Configurable freshness duration (TTL / Stale time) and automatic Garbage Collection.
 * - Optimistic updates via `setData`.
 * - Granular cache invalidation by key or namespace prefix.
 *
 * ---
 * 🇷🇺 **RU**: Центральный синглтон-сервис управления кэшем запросов и состоянием на базе Angular Signals.
 *
 * Основные возможности:
 * - Сквозная дедупликация идентичных одновременных сетевых вызовов (In-flight deduplication).
 * - Преобразование `Observable<T>` в реактивные сигналы Angular (`Signal<T>`).
 * - Конфигурируемое время актуальности (TTL / Stale time) и очистка неиспользуемой памяти (Garbage Collection).
 * - Оптимистичные обновления через `setData`.
 * - Тонкая инвалидация по ключу или префиксу пространства имён.
 */
@Injectable({ providedIn: 'root' })
export class SignalQueryCache {
  /**
   * Internal cache registry. Key is a composite string `namespace::serializedArgs`.
   *
   * ---
   * 🇷🇺 **RU**: Внутренний реестр записей кэша. Ключ — композитная строка `namespace:serializedArgs`.
   */
  private readonly cache = new Map<string, QueryRecord<any>>();

  /**
   * Total number of queries requested by components (calls to `query`).
   *
   * ---
   * 🇷🇺 **RU**: Общее количество обращений компонентов к кэшу (вызовов query).
   */
  readonly totalQueriesCount = signal<number>(0);

  /**
   * Number of queries served directly from warm memory (Cache Hit) without network access.
   *
   * ---
   * 🇷🇺 **RU**: Число запросов, обслуженных из тёплого кэша (Cache Hit) без обращения к сети.
   */
  readonly cacheHitsCount = signal<number>(0);

  /**
   * Number of requests merged with an active in-flight stream (In-Flight Deduplication Hit).
   *
   * ---
   * 🇷🇺 **RU**: Число запросов, объединённых с активным in-flight потоком (In-Flight Deduplication Hit).
   */
  readonly inFlightDeduplicationsCount = signal<number>(0);

  /**
   * Total number of prevented network requests (saved API calls).
   * Computed as `cacheHitsCount + inFlightDeduplicationsCount`.
   *
   * ---
   * 🇷🇺 **RU**: Суммарное количество предотвращённых сетевых запросов (сэкономленных вызовов API).
   */
  readonly savedRequestsCount = computed<number>(() => {
    return this.cacheHitsCount() + this.inFlightDeduplicationsCount();
  });

  /**
   * Queries data with automatic caching, request deduplication, and freshness management.
   *
   * If data is fresh (less than `ttl` ms elapsed since `lastUpdated`), network request is skipped
   * and current signals are returned immediately. If data is stale or queried for the first time,
   * a network call is dispatched via the provided `fetcher`.
   *
   * ---
   * 🇷🇺 **RU**: Запрашивает данные с автоматическим кэшированием, дедупликацией и управлением актуальностью.
   *
   * Если данные свежие (прошло меньше `ttl` мс с момента `lastUpdated`), сетевой запрос не выполняется,
   * а возвращаются текущие сигналы. Если данные устарели или запрос выполняется впервые,
   * запускается сетевой запрос через предоставленный `fetcher`.
   *
   * @template T Return data type / Тип возвращаемых данных.
   * @template Args Tuple of argument types / Кортеж типов аргументов запроса.
   * @param namespace Unique operation name (e.g. `'users.getById'`) / Уникальное имя операции.
   * @param fetcher Function returning `Observable<T>` / Функция, возвращающая `Observable<T>`.
   * @param args Arguments passed to `fetcher` / Аргументы, передаваемые в `fetcher`.
   * @param options TTL, GC, forceFetch, and callback options / Параметры TTL, GC, принудительного обновления и коллбэков.
   * @returns `QueryResult<T>` object / Объект `QueryResult<T>` с сигналами и методами управления.
   */
  query<T, Args extends readonly unknown[]>(
    namespace: string,
    fetcher: QueryFetcher<T, Args>,
    args: Args,
    options: QueryOptions<T> = {}
  ): QueryResult<T> {
    const key = buildCacheKey(namespace, args);
    const effectiveTtl = options.ttl ?? 60_000;

    let record = this.cache.get(key) as QueryRecord<T> | undefined;

    if (!record) {
      record = {
        data: signal<T | null>(options.initialData ?? null),
        status: signal<QueryStatus>('idle'),
        error: signal<unknown | null>(null),
        lastUpdated: signal<number>(0),
        inFlight$: null,
        gcTimer: null,
        options: { ...options },
        subscribersCount: 0,
      };
      this.cache.set(key, record);
    } else {
      // Update options with fresh values on subsequent calls / Обновляем опции свежими значениями
      record.options = { ...record.options, ...options };
      // Cancel GC timer if entry is accessed again / Отменяем таймер GC, если запись снова запрошена
      if (record.gcTimer) {
        clearTimeout(record.gcTimer);
        record.gcTimer = null;
      }
    }

    this.totalQueriesCount.update((c: number) => c + 1);

    const now = Date.now();
    const isStale = now - record.lastUpdated() > effectiveTtl;
    const isIdle = record.status() === 'idle';
    const shouldFetch = Boolean(options.forceFetch || isStale || isIdle);

    if (shouldFetch) {
      if (record.inFlight$) {
        // Request is already in-flight by another caller -> attach to it (In-Flight Deduplication)
        this.inFlightDeduplicationsCount.update((c: number) => c + 1);
      } else {
        // Launch actual network request / Запускаем сетевой запрос
        this.triggerFetch(record, () => fetcher(...args));
      }
    } else {
      // Fresh data served from memory without network roundtrip (Cache Hit)
      this.cacheHitsCount.update((c: number) => c + 1);
    }

    return {
      data: record.data.asReadonly(),
      status: record.status.asReadonly(),
      error: record.error.asReadonly(),
      isLoading: computed(() => record!.status() === 'loading'),
      isSuccess: computed(() => record!.status() === 'success'),
      isError: computed(() => record!.status() === 'error'),
      lastUpdated: () => record!.lastUpdated(),
      refetch: () => this.triggerFetch(record!, () => fetcher(...args)),
      setData: (updater: QueryDataUpdater<T>) => {
        if (typeof updater === 'function') {
          const updateFn = updater as (prev: T | null) => T;
          record!.data.set(updateFn(record!.data()));
        } else {
          record!.data.set(updater);
        }
        record!.lastUpdated.set(Date.now());
        record!.status.set('success');
      },
    };
  }

  /**
   * Initiates a network request, updates reactive signals, and deduplicates parallel calls.
   *
   * Uses `shareReplay({ bufferSize: 1, refCount: false })`, ensuring all concurrent subscribers
   * share one single HTTP stream without duplicate network roundtrips.
   *
   * ---
   * 🇷🇺 **RU**: Инициирует сетевой запрос, связывает поток с реактивными сигналами и объединяет параллельные вызовы.
   * Все параллельные подписчики подключаются к единому потоку без дублирования HTTP-запроса.
   *
   * @template T Return data type / Тип возвращаемых данных.
   * @param record Internal cache record / Внутренняя запись кэша.
   * @param callFactory Observable factory function / Функция-фабрика, создающая `Observable<T>`.
   * @returns Shared `Observable<T>` / Разделяемый `Observable<T>`.
   */
  private triggerFetch<T>(
    record: QueryRecord<T>,
    callFactory: () => Observable<T>
  ): Observable<T> {
    if (record.inFlight$) {
      return record.inFlight$;
    }

    record.status.set('loading');
    record.error.set(null);

    const stream$ = callFactory().pipe(
      tap({
        next: (response: T) => {
          record.data.set(response);
          record.status.set('success');
          record.lastUpdated.set(Date.now());
          record.options.onSuccess?.(response);
        },
        error: (err: unknown) => {
          record.error.set(err);
          record.status.set('error');
          record.options.onError?.(err);
        },
      }),
      finalize(() => {
        record.inFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    record.inFlight$ = stream$;

    // Activate cold Observable with automatic subscription
    stream$.subscribe({
      error: () => {
        // Handled in tap and stored in signal
      },
    });

    return stream$;
  }

  /**
   * Invalidates cache entries, resetting freshness (`lastUpdated = 0`).
   * The next query with these parameters is guaranteed to refetch fresh data.
   *
   * ---
   * 🇷🇺 **RU**: Инвалидирует записи кэша, сбрасывая метку свежести (`lastUpdated = 0`).
   * При следующем запросе с этими параметрами будет гарантированно выполнен рефетч.
   *
   * @param namespaceOrPrefix Exact key or namespace prefix (e.g. `'users'` or `'users.byId'`). If omitted, invalidates all entries. / Точный ключ или префикс. Если не передан — весь кэш.
   */
  invalidate(namespaceOrPrefix?: string): void {
    if (!namespaceOrPrefix) {
      for (const record of this.cache.values()) {
        record.lastUpdated.set(0);
      }
      return;
    }

    for (const [key, record] of this.cache.entries()) {
      if (key.startsWith(namespaceOrPrefix)) {
        record.lastUpdated.set(0);
      }
    }
  }

  /**
   * Completely deletes cache entries from memory and clears pending GC timers.
   *
   * ---
   * 🇷🇺 **RU**: Полностью удаляет записи из памяти, останавливая связанные таймеры GC.
   *
   * @param namespaceOrPrefix Exact key or namespace prefix. If omitted, clears the entire cache. / Точный ключ или префикс.
   */
  remove(namespaceOrPrefix?: string): void {
    if (!namespaceOrPrefix) {
      for (const record of this.cache.values()) {
        if (record.gcTimer) {
          clearTimeout(record.gcTimer);
        }
      }
      this.cache.clear();
      return;
    }

    for (const [key, record] of Array.from(this.cache.entries())) {
      if (key.startsWith(namespaceOrPrefix)) {
        if (record.gcTimer) {
          clearTimeout(record.gcTimer);
        }
        this.cache.delete(key);
      }
    }
  }

  /**
   * Registers an active subscriber (component/service) for a cache record.
   * Cancels pending Garbage Collection timer if active.
   *
   * ---
   * 🇷🇺 **RU**: Регистрирует активного подписчика на запись кэша.
   * Отменяет запланированный таймер сборщика мусора (GC), если он был активен.
   *
   * @param key Full cache key / Полный ключ кэша.
   */
  retain(key: string): void {
    const record = this.cache.get(key);
    if (record) {
      record.subscribersCount++;
      if (record.gcTimer) {
        clearTimeout(record.gcTimer);
        record.gcTimer = null;
      }
    }
  }

  /**
   * Unregisters a subscriber. When active subscriber count reaches zero,
   * starts a garbage collection timer (`gcTime`) to prune the record from memory.
   *
   * ---
   * 🇷🇺 **RU**: Снимает регистрацию подписчика. Когда счётчик активных подписчиков падает до нуля,
   * запускает таймер сборщика мусора (`gcTime`), по истечении которого запись удаляется из памяти.
   *
   * @param key Full cache key / Полный ключ кэша.
   * @param customGcTime Custom GC time in ms (overrides `options.gcTime`) / Пользовательское время GC в миллисекундах.
   */
  release(key: string, customGcTime?: number): void {
    const record = this.cache.get(key);
    if (!record) {
      return;
    }

    record.subscribersCount = Math.max(0, record.subscribersCount - 1);

    if (record.subscribersCount === 0) {
      if (record.gcTimer) {
        clearTimeout(record.gcTimer);
      }

      const effectiveGcTime = customGcTime ?? record.options.gcTime ?? 300_000;

      if (effectiveGcTime === 0) {
        this.cache.delete(key);
      } else if (Number.isFinite(effectiveGcTime)) {
        record.gcTimer = setTimeout(() => {
          if (record.subscribersCount === 0) {
            this.cache.delete(key);
          }
        }, effectiveGcTime);
      }
    }
  }

  /**
   * Checks whether an entry exists in the cache.
   *
   * ---
   * 🇷🇺 **RU**: Проверяет, содержится ли запись в кэше.
   *
   * @param key Full cache key / Полный ключ кэша.
   * @returns `true` if key exists in memory / `true`, если ключ присутствует в памяти.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Returns current count of entries in the cache registry.
   *
   * ---
   * 🇷🇺 **RU**: Возвращает текущее количество записей в реестре кэша.
   *
   * @returns Number of cache entries / Число записей.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Returns internal cache record by key (for tests and inspection).
   *
   * ---
   * 🇷🇺 **RU**: Возвращает внутреннюю запись кэша по ключу (для тестов и глубокой инспекции).
   *
   * @template T Data type / Тип данных.
   * @param key Full cache key / Полный ключ кэша.
   * @returns `QueryRecord<T>` or `undefined` / Запись `QueryRecord<T>` или `undefined`.
   */
  getRecord<T = unknown>(key: string): QueryRecord<T> | undefined {
    return this.cache.get(key) as QueryRecord<T> | undefined;
  }

  /**
   * Returns a complete state snapshot of all cache entries
   * for monitoring, telemetry, and UI inspection dashboard.
   *
   * ---
   * 🇷🇺 **RU**: Возвращает полный снимок текущего состояния всех записей кэша
   * для мониторинга, отладки и визуализации в дашборде.
   *
   * @returns Array of `CacheSnapshotEntry` items / Массив записей `CacheSnapshotEntry`.
   */
  getCacheSnapshot(): CacheSnapshotEntry[] {
    const snapshots: CacheSnapshotEntry[] = [];
    for (const [key, record] of this.cache.entries()) {
      snapshots.push({
        key,
        status: record.status(),
        data: record.data(),
        error: record.error(),
        lastUpdated: record.lastUpdated(),
        hasInFlight: record.inFlight$ !== null,
        subscribersCount: record.subscribersCount,
        ttl: record.options.ttl ?? 60_000,
        gcTime: record.options.gcTime ?? 300_000,
      });
    }
    return snapshots;
  }

  /**
   * Resets query analytics metrics (total queries, cache hits, deduplications).
   *
   * ---
   * 🇷🇺 **RU**: Сбрасывает счётчики аналитики кэша (обращения, хиты, дедупликации).
   */
  resetMetrics(): void {
    this.totalQueriesCount.set(0);
    this.cacheHitsCount.set(0);
    this.inFlightDeduplicationsCount.set(0);
  }
}
