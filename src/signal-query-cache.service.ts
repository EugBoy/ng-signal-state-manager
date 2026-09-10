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
 * Центральный синглтон-сервис управления кэшем запросов и состоянием на базе Angular Signals.
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
   * Внутренний реестр записей кэша. Ключ — композитная строка `namespace::serializedArgs`.
   */
  private readonly cache = new Map<string, QueryRecord<any>>();

  /**
   * Общее количество обращений компонентов к кэшу (вызовов query).
   */
  readonly totalQueriesCount = signal<number>(0);

  /**
   * Число запросов, обслуженных из тёплого кэша (Cache Hit) без обращения к сети.
   */
  readonly cacheHitsCount = signal<number>(0);

  /**
   * Число запросов, объединённых с активным in-flight потоком (In-Flight Deduplication Hit).
   */
  readonly inFlightDeduplicationsCount = signal<number>(0);

  /**
   * Суммарное количество предотвращённых сетевых запросов (сэкономленных вызовов API).
   */
  readonly savedRequestsCount = computed<number>(() => {
    return this.cacheHitsCount() + this.inFlightDeduplicationsCount();
  });

  /**
   * Запрашивает данные с автоматическим кэшированием, дедупликацией и управлением актуальностью.
   *
   * Если данные свежие (прошло меньше `ttl` мс с момента `lastUpdated`), сетевой запрос не выполняется,
   * а возвращаются текущие сигналы. Если данные устарели или запрос выполняется впервые,
   * запускается сетевой запрос через предоставленный `fetcher`.
   *
   * @template T Тип возвращаемых данных.
   * @template Args Кортеж типов аргументов запроса.
   * @param namespace Уникальное имя операции (например, `'users.getById'`).
   * @param fetcher Функция, возвращающая `Observable<T>` с HTTP-запросом.
   * @param args Аргументы, передаваемые в `fetcher`.
   * @param options Параметры TTL, GC, принудительного обновления и коллбэков.
   * @returns Объект `QueryResult<T>` с сигналами только для чтения и методами управления.
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
      // Обновляем опции свежими значениями при повторном вызове
      record.options = { ...record.options, ...options };
      // Отменяем таймер сборщика мусора, если запись снова запрашивается
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
        // Запрос уже выполняется другим компонентом -> подключаемся к нему (In-Flight Deduplication)
        this.inFlightDeduplicationsCount.update((c: number) => c + 1);
      } else {
        // Запускаем реальный сетевой запрос
        this.triggerFetch(record, () => fetcher(...args));
      }
    } else {
      // Данные свежие, отдаются из оперативной памяти без сетевого запроса (Cache Hit)
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
   * Инициирует сетевой запрос, связывает поток с реактивными сигналами и объединяет параллельные вызовы.
   *
   * Использует оператор `shareReplay({ bufferSize: 1, refCount: false })`, благодаря чему
   * все параллельные подписчики подключаются к единому потоку без дублирования HTTP-запроса.
   *
   * @template T Тип возвращаемых данных.
   * @param record Внутренняя запись кэша.
   * @param callFactory Функция-фабрика, создающая `Observable<T>`.
   * @returns Разделяемый `Observable<T>`.
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

    // Активируем холодный Observable автоматической подпиской
    stream$.subscribe({
      error: () => {
        // Ошибка уже зафиксирована в сигнале и передана в onError коллбэк
      },
    });

    return stream$;
  }

  /**
   * Инвалидирует записи кэша, сбрасывая метку свежести (`lastUpdated = 0`).
   * При следующем запросе с этими параметрами будет гарантированно выполнен рефетч.
   *
   * @param namespaceOrPrefix Точный ключ или префикс пространства имён (например, `'users'` или `'users.byId'`).
   * Если не передан, инвалидируются абсолютно все записи в кэше.
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
   * Полностью удаляет записи из памяти, останавливая связанные таймеры GC.
   *
   * @param namespaceOrPrefix Точный ключ или префикс пространства имён.
   * Если не передан, полностью очищает весь кэш.
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
   * Регистрирует активного подписчика (компонента/сервиса) на запись кэша.
   * Отменяет запланированный таймер сборщика мусора (GC), если он был активен.
   *
   * @param key Полный ключ кэша.
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
   * Снимает регистрацию подписчика. Когда счётчик активных подписчиков падает до нуля,
   * запускает таймер сборщика мусора (`gcTime`), по истечении которого запись удаляется из памяти.
   *
   * @param key Полный ключ кэша.
   * @param customGcTime Пользовательское время GC в миллисекундах (переопределяет `options.gcTime`).
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
   * Проверяет, содержится ли запись в кэше.
   *
   * @param key Полный ключ кэша.
   * @returns `true`, если ключ присутствует в памяти.
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Возвращает текущее количество записей в реестре кэша.
   *
   * @returns Число записей.
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Возвращает внутреннюю запись кэша по ключу (для тестов и глубокой инспекции).
   *
   * @template T Тип данных.
   * @param key Полный ключ кэша.
   * @returns Запись `QueryRecord<T>` или `undefined`.
   */
  getRecord<T = unknown>(key: string): QueryRecord<T> | undefined {
    return this.cache.get(key) as QueryRecord<T> | undefined;
  }

  /**
   * Возвращает полный снимок текущего состояния всех записей кэша
   * для мониторинга, отладки и визуализации в дашборде.
   *
   * @returns Массив записей `CacheSnapshotEntry`.
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
   * Сбрасывает счётчики аналитики кэша (обращения, хиты, дедупликации).
   */
  resetMetrics(): void {
    this.totalQueriesCount.set(0);
    this.cacheHitsCount.set(0);
    this.inFlightDeduplicationsCount.set(0);
  }
}
