import { DestroyRef, inject } from '@angular/core';
import { buildCacheKey } from './cache-key.utils';
import { QueryFetcher, QueryOptions, QueryResult } from './query.types';
import { SignalQueryCache } from './signal-query-cache.service';

/**
 * Dependency Injection (DI) helper for using `SignalQueryCache` in Angular components, directives, or services.
 *
 * Automatically connects to the current context's `DestroyRef`:
 * 1. Increases active subscriber count (`retain`) upon initialization.
 * 2. Decreases subscriber count (`release`) upon destruction (`onDestroy`),
 *    triggering garbage collection (`gcTime`) to prune unused data from memory.
 *
 * ---
 * 🇷🇺 **RU**: Хелпер для использования `SignalQueryCache` в контексте внедрения зависимостей Angular (DI).
 *
 * Автоматически связывается с `DestroyRef` текущего компонента, директивы или сервиса:
 * 1. Увеличивает счётчик активных подписчиков (`retain`) при создании.
 * 2. При уничтожении контекста (`onDestroy`) уменьшает счётчик (`release`),
 *    запуская сборку мусора (`gcTime`) для удаления неиспользуемых данных из памяти.
 *
 * @template T Cached data type / Тип кэшируемых данных.
 * @template Args Tuple type of query arguments / Кортеж типов аргументов запроса.
 * @param namespace Unique operation name (e.g. `'users.getById'`) / Уникальное имя операции.
 * @param fetcher Function returning `Observable<T>` / Функция, возвращающая `Observable<T>`.
 * @param args Arguments passed to the fetcher function / Аргументы, передаваемые в функцию `fetcher`.
 * @param options Additional query options (TTL, GC, callbacks) / Дополнительные параметры (TTL, GC, коллбэки).
 * @returns `QueryResult<T>` with read-only signals and control methods / Интерфейс `QueryResult<T>` с сигналами и методами управления.
 *
 * @example
 * ```ts
 * @Component({ ... })
 * export class UserBadgeComponent {
 *   private readonly userApi = inject(UserApiService);
 *   protected readonly userQuery = injectQuery(
 *     'users.byId',
 *     (id: string) => this.userApi.getUserById(id),
 *     [this.userId]
 *   );
 * }
 * ```
 */
export function injectQuery<T, Args extends readonly unknown[]>(
  namespace: string,
  fetcher: QueryFetcher<T, Args>,
  args: Args,
  options: QueryOptions<T> = {}
): QueryResult<T> {
  const cache = inject(SignalQueryCache);
  const destroyRef = inject(DestroyRef, { optional: true });
  const key = buildCacheKey(namespace, args);

  const result = cache.query(namespace, fetcher, args, options);

  // Register active subscriber / Регистрируем активного подписчика
  cache.retain(key);

  if (destroyRef) {
    destroyRef.onDestroy(() => {
      // Unregister on unmount / Снимаем регистрацию при размонтировании
      cache.release(key, options.gcTime);
    });
  }

  return result;
}
