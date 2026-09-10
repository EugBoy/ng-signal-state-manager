import { Signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Lifecycle statuses of an asynchronous query in the cache.
 *
 * - `idle`: Query has not been executed yet or was reset.
 * - `loading`: Query is currently in-flight (initial fetch or background refetch).
 * - `success`: Query completed successfully, valid data is cached.
 * - `error`: Query failed with an error, error object is stored.
 *
 * ---
 * 🇷🇺 **RU**: Возможные статусы жизненного цикла асинхронного запроса в кэше.
 *
 * - `idle`: Запрос ещё не выполнялся или был сброшен.
 * - `loading`: Запрос выполняется (первичная загрузка или фоновое обновление).
 * - `success`: Запрос успешно завершён, данные валидны и сохранены.
 * - `error`: Запрос завершился с ошибкой, сохранён объект ошибки.
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Value or updater callback type for optimistic cache mutation.
 *
 * ---
 * 🇷🇺 **RU**: Тип значения или функции обновления для оптимистичной модификации кэша.
 *
 * @template T Cached data type / Тип кэшируемых данных.
 */
export type QueryDataUpdater<T> = (T | null) | ((previous: T | null) => T | null);

/**
 * Signature of the fetcher function returning an Observable with data.
 *
 * ---
 * 🇷🇺 **RU**: Сигнатура функции-загрузчика (fetcher), возвращающей Observable с данными.
 *
 * @template T Return data type / Тип возвращаемых данных.
 * @template Args Tuple of argument types / Кортеж типов аргументов запроса.
 */
export type QueryFetcher<T, Args extends readonly unknown[]> = (...args: Args) => Observable<T>;

/**
 * Configuration options for executing and caching a query.
 *
 * ---
 * 🇷🇺 **RU**: Конфигурационные параметры для выполнения и кэширования запроса.
 *
 * @template T Cached data type / Тип кэшируемых данных.
 */
export interface QueryOptions<T = unknown> {
  /**
   * Data freshness duration in milliseconds (Stale Time / TTL).
   * During this window, subsequent calls return cached data without a network request.
   *
   * - Default: `60_000` ms (1 minute).
   * - `0`: data is considered stale immediately (every call triggers a refetch).
   * - `Infinity`: data never stales automatically.
   *
   * ---
   * 🇷🇺 **RU**: Время актуальности данных в миллисекундах (Stale Time).
   * В течение этого периода вызовы возвращают кэшированные данные без повторного обращения к сети.
   */
  readonly ttl?: number;

  /**
   * Inactive cache retention time in milliseconds (Garbage Collection Time).
   * Countdown starts when active subscribers reach 0. If a subscriber attaches before expiration, timer cancels.
   *
   * - Default: `300_000` ms (5 minutes).
   *
   * ---
   * 🇷🇺 **RU**: Время хранения неактивной записи в памяти в миллисекундах (Garbage Collection Time).
   * Таймер запускается, когда число активных подписчиков становится равным 0.
   */
  readonly gcTime?: number;

  /**
   * Force network request execution regardless of cache presence or freshness.
   *
   * - Default: `false`.
   *
   * ---
   * 🇷🇺 **RU**: Принудительное выполнение сетевого запроса независимо от наличия данных в кэше и их свежести.
   */
  readonly forceFetch?: boolean;

  /**
   * Initial value for the data signal before the first request completes.
   *
   * - Default: `null`.
   *
   * ---
   * 🇷🇺 **RU**: Начальное значение для сигнала данных до завершения первого запроса.
   */
  readonly initialData?: T | null;

  /**
   * Callback invoked on successful query response.
   *
   * ---
   * 🇷🇺 **RU**: Коллбэк, вызываемый при успешном получении ответа от сервера.
   *
   * @param data Retrieved response data / Полученные данные.
   */
  readonly onSuccess?: (data: T) => void;

  /**
   * Callback invoked when a query encounters an error.
   *
   * ---
   * 🇷🇺 **RU**: Коллбэк, вызываемый при возникновении ошибки во время выполнения запроса.
   *
   * @param error Error object / Объект ошибки.
   */
  readonly onError?: (error: unknown) => void;
}

/**
 * Public query result interface provided to UI components and services.
 * All states are exposed as Angular Signals (`Signal<T>`).
 *
 * ---
 * 🇷🇺 **RU**: Публичный интерфейс результата запроса, предоставляемый UI-компонентам и сервисам.
 * Все состояния экспортируются в виде сигналов Angular (`Signal<T>`).
 *
 * @template T Cached data type / Тип кэшируемых данных.
 */
export interface QueryResult<T> {
  /**
   * Read-only signal containing the cached data or `null`.
   *
   * ---
   * 🇷🇺 **RU**: Сигнал только для чтения с текущими кэшированными данными или `null`.
   */
  readonly data: Signal<T | null>;

  /**
   * Read-only signal with current query status (`idle` | `loading` | `success` | `error`).
   *
   * ---
   * 🇷🇺 **RU**: Сигнал только для чтения с текущим статусом запроса.
   */
  readonly status: Signal<QueryStatus>;

  /**
   * Read-only signal with error object or `null`.
   *
   * ---
   * 🇷🇺 **RU**: Сигнал только для чтения с объектом ошибки (или `null`).
   */
  readonly error: Signal<unknown | null>;

  /**
   * Computed signal: `true` if a network request is currently executing.
   *
   * ---
   * 🇷🇺 **RU**: Вычисляемый сигнал: `true`, если в данный момент выполняется сетевой запрос.
   */
  readonly isLoading: Signal<boolean>;

  /**
   * Computed signal: `true` if query completed successfully.
   *
   * ---
   * 🇷🇺 **RU**: Вычисляемый сигнал: `true`, если запрос успешно выполнен.
   */
  readonly isSuccess: Signal<boolean>;

  /**
   * Computed signal: `true` if query failed with an error.
   *
   * ---
   * 🇷🇺 **RU**: Вычисляемый сигнал: `true`, если запрос завершился ошибкой.
   */
  readonly isError: Signal<boolean>;

  /**
   * Forces a re-execution of the network request.
   * Returns a shared `Observable<T>` that can be subscribed to if needed.
   *
   * ---
   * 🇷🇺 **RU**: Метод для принудительного перезапуска сетевого запроса.
   *
   * @returns Shared `Observable<T>` stream / Поток `Observable<T>` с ответом сервера.
   */
  readonly refetch: () => Observable<T>;

  /**
   * Optimistically updates cached data without an HTTP network request.
   * Sets status to `success` and refreshes `lastUpdated` timestamp.
   *
   * ---
   * 🇷🇺 **RU**: Метод оптимистичного обновления данных в кэше без отправки сетевого запроса.
   *
   * @param updater New value or pure update function `(prev: T | null) => T` / Новое значение или функция обновления.
   */
  readonly setData: (updater: QueryDataUpdater<T>) => void;

  /**
   * Returns timestamp (Unix ms) of the last successful data fetch.
   *
   * ---
   * 🇷🇺 **RU**: Функция получения временной метки (Unix ms) последнего успешного обновления.
   *
   * @returns Timestamp in milliseconds / Метка времени в миллисекундах.
   */
  readonly lastUpdated: () => number;
}

/**
 * Internal cache record storage structure.
 *
 * ---
 * 🇷🇺 **RU**: Внутренняя структура хранения записи в реестре кэша.
 *
 * @template T Cached data type / Тип кэшируемых данных.
 */
export interface QueryRecord<T = unknown> {
  /** Reactive signal for cached data / Сигнал для хранения данных */
  readonly data: WritableSignal<T | null>;

  /** Reactive signal for query status / Сигнал для хранения статуса */
  readonly status: WritableSignal<QueryStatus>;

  /** Reactive signal for error / Сигнал для хранения ошибки */
  readonly error: WritableSignal<unknown | null>;

  /** Reactive signal for last updated timestamp / Сигнал для Unix-timestamp */
  readonly lastUpdated: WritableSignal<number>;

  /**
   * Reference to active in-flight `Observable` for request deduplication.
   *
   * ---
   * 🇷🇺 **RU**: Ссылка на активный `Observable` для дедупликации параллельных вызовов.
   */
  inFlight$: Observable<T> | null;

  /**
   * Active Garbage Collection timer handle.
   *
   * ---
   * 🇷🇺 **RU**: Идентификатор активного таймера сборщика мусора.
   */
  gcTimer: ReturnType<typeof setTimeout> | null;

  /** Effective query options / Эффективные опции запроса */
  options: QueryOptions<T>;

  /** Active subscribers count / Счётчик активных подписчиков */
  subscribersCount: number;
}

/**
 * Cache record snapshot for monitoring, debugging, and dashboard inspection.
 *
 * ---
 * 🇷🇺 **RU**: Снимок состояния записи кэша для мониторинга, отладки и инспекции.
 *
 * @template T Data type / Тип данных.
 */
export interface CacheSnapshotEntry<T = unknown> {
  /** Unique cache entry key / Уникальный ключ записи в кэше */
  readonly key: string;
  /** Current query status / Текущий статус */
  readonly status: QueryStatus;
  /** Cached data payload / Значение данных */
  readonly data: T | null;
  /** Error object / Ошибка */
  readonly error: unknown | null;
  /** Last updated Unix timestamp (ms) / Метка времени последнего обновления */
  readonly lastUpdated: number;
  /** Whether a network request is currently active / Признак активного сетевого запроса */
  readonly hasInFlight: boolean;
  /** Number of active subscribers / Количество активных подписчиков */
  readonly subscribersCount: number;
  /** Configured TTL (ms) / Заданный TTL в миллисекундах */
  readonly ttl: number;
  /** Configured GC Time (ms) / Заданный GC Time в миллисекундах */
  readonly gcTime: number;
}
