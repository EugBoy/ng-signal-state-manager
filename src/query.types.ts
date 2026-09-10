import { Signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Возможные статусы жизненного цикла асинхронного запроса в кэше.
 *
 * - `idle`: Запрос ещё не выполнялся или был сброшен.
 * - `loading`: Запрос выполняется (первичная загрузка или фоновое обновление).
 * - `success`: Запрос успешно завершён, данные валидны и сохранены.
 * - `error`: Запрос завершился с ошибкой, сохранён объект ошибки.
 */
export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Тип значения или функции обновления для оптимистичной модификации кэша.
 *
 * @template T Тип кэшируемых данных.
 */
export type QueryDataUpdater<T> = (T | null) | ((previous: T | null) => T | null);

/**
 * Сигнатура функции-загрузчика (fetcher), возвращающей Observable с данными.
 *
 * @template T Тип возвращаемых данных.
 * @template Args Кортеж типов аргументов запроса.
 */
export type QueryFetcher<T, Args extends readonly unknown[]> = (...args: Args) => Observable<T>;

/**
 * Конфигурационные параметры для выполнения и кэширования запроса.
 *
 * @template T Тип кэшируемых данных.
 */
export interface QueryOptions<T = unknown> {
  /**
   * Время актуальности данных в миллисекундах (Stale Time).
   * В течение этого периода последующие вызовы query с теми же аргументами
   * возвращают кэшированные данные без повторного сетевого запроса.
   *
   * - По умолчанию: `60_000` мс (1 минута).
   * - `0`: данные считаются устаревшими сразу после получения (каждый вызов инициирует рефетч).
   * - `Infinity`: данные никогда не устаревают автоматически.
   */
  readonly ttl?: number;

  /**
   * Время хранения неактивной записи в памяти в миллисекундах (Garbage Collection Time).
   * Таймер запускается, когда число активных подписчиков становится равным 0.
   * Если до истечения таймера подписчик появляется снова, таймер отменяется.
   *
   * - По умолчанию: `300_000` мс (5 минут).
   */
  readonly gcTime?: number;

  /**
   * Принудительное выполнение сетевого запроса независимо от наличия данных в кэше и их свежести.
   *
   * - По умолчанию: `false`.
   */
  readonly forceFetch?: boolean;

  /**
   * Начальное значение для сигнала данных до завершения первого запроса.
   *
   * - По умолчанию: `null`.
   */
  readonly initialData?: T | null;

  /**
   * Коллбэк, вызываемый при успешном получении ответа от сервера.
   *
   * @param data Полученные данные.
   */
  readonly onSuccess?: (data: T) => void;

  /**
   * Коллбэк, вызываемый при возникновении ошибки во время выполнения запроса.
   *
   * @param error Объект ошибки.
   */
  readonly onError?: (error: unknown) => void;
}

/**
 * Публичный интерфейс результата запроса, предоставляемый UI-компонентам и сервисам.
 * Все состояния экспортируются в виде сигналов Angular (`Signal<T>`).
 *
 * @template T Тип кэшируемых данных.
 */
export interface QueryResult<T> {
  /**
   * Сигнал только для чтения, содержащий текущие кэшированные данные или `null`.
   */
  readonly data: Signal<T | null>;

  /**
   * Сигнал только для чтения с текущим статусом запроса (`idle` | `loading` | `success` | `error`).
   */
  readonly status: Signal<QueryStatus>;

  /**
   * Сигнал только для чтения с объектом ошибки (или `null`, если ошибки нет).
   */
  readonly error: Signal<unknown | null>;

  /**
   * Вычисляемый сигнал: `true`, если в данный момент выполняется сетевой запрос (`status === 'loading'`).
   */
  readonly isLoading: Signal<boolean>;

  /**
   * Вычисляемый сигнал: `true`, если запрос успешно выполнен (`status === 'success'`).
   */
  readonly isSuccess: Signal<boolean>;

  /**
   * Вычисляемый сигнал: `true`, если запрос завершился ошибкой (`status === 'error'`).
   */
  readonly isError: Signal<boolean>;

  /**
   * Метод для принудительного перезапуска сетевого запроса.
   * Возвращает разделяемый `Observable<T>`, на который можно подписаться при необходимости.
   *
   * @returns Поток `Observable<T>` с ответом сервера.
   */
  readonly refetch: () => Observable<T>;

  /**
   * Метод оптимистичного обновления данных в кэше без отправки сетевого запроса.
   * Устанавливает статус `success` и обновляет временную метку `lastUpdated`.
   *
   * @param updater Новое значение данных либо чистая функция `(previous: T | null) => T`.
   */
  readonly setData: (updater: QueryDataUpdater<T>) => void;

  /**
   * Функция получения временной метки (Unix timestamp в мс) последнего успешного обновления данных.
   *
   * @returns Метка времени в миллисекундах.
   */
  readonly lastUpdated: () => number;
}

/**
 * Внутренняя структура хранения записи в реестре кэша.
 *
 * @template T Тип кэшируемых данных.
 */
export interface QueryRecord<T = unknown> {
  /**
   * Реактивный сигнал для хранения данных.
   */
  readonly data: WritableSignal<T | null>;

  /**
   * Реактивный сигнал для хранения текущего статуса.
   */
  readonly status: WritableSignal<QueryStatus>;

  /**
   * Реактивный сигнал для хранения ошибки.
   */
  readonly error: WritableSignal<unknown | null>;

  /**
   * Реактивный сигнал для хранения Unix-timestamp последнего обновления.
   */
  readonly lastUpdated: WritableSignal<number>;

  /**
   * Ссылка на текущий активный (in-flight) `Observable` для дедупликации параллельных запросов.
   * Равен `null`, когда активного сетевого запроса нет.
   */
  inFlight$: Observable<T> | null;

  /**
   * Идентификатор активного таймера Garbage Collection для отложенного удаления из памяти.
   */
  gcTimer: ReturnType<typeof setTimeout> | null;

  /**
   * Текущие эффективные опции запроса.
   */
  options: QueryOptions<T>;

  /**
   * Счётчик активных подписчиков (компонентов/сервисов), использующих данную запись.
   */
  subscribersCount: number;
}

/**
 * Снимок состояния записи кэша для мониторинга, отладки и инспекции в UI.
 *
 * @template T Тип данных.
 */
export interface CacheSnapshotEntry<T = unknown> {
  /** Уникальный ключ записи в кэше */
  readonly key: string;
  /** Текущий статус */
  readonly status: QueryStatus;
  /** Значение данных */
  readonly data: T | null;
  /** Ошибка */
  readonly error: unknown | null;
  /** Метка времени последнего обновления */
  readonly lastUpdated: number;
  /** Признак наличия активного сетевого запроса */
  readonly hasInFlight: boolean;
  /** Количество активных подписчиков */
  readonly subscribersCount: number;
  /** Заданный TTL в миллисекундах */
  readonly ttl: number;
  /** Заданный GC Time в миллисекундах */
  readonly gcTime: number;
}
